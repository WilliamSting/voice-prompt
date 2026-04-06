import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { MainPanelView } from './components/MainPanelView'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'
import { ToastViewport } from './components/ToastViewport'
import { defaultSettings, mockHistory } from './data/mock'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useToast } from './hooks/useToast'
import { useVoicePromptMachine } from './hooks/useVoicePromptMachine'
import { mockBackend, renderSchemaForExport } from './lib/backend'
import { buildSummary, cn } from './lib/utils'
import type { PromptRecord, SettingsState, ViewId } from './lib/types'

function App() {
  const [view, setView] = useState<ViewId>('panel')
  const [historyRecords, setHistoryRecords] = useLocalStorage<PromptRecord[]>('voice-prompt-history', mockHistory)
  const [settings, setSettings] = useLocalStorage<SettingsState>('voice-prompt-settings', defaultSettings)
  const [selectedHistoryId, setSelectedHistoryId] = useState(historyRecords[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all')
  const { toasts, pushToast } = useToast()
  const lastAutoCopiedResult = useRef('')

  const machine = useVoicePromptMachine(settings, (record) => {
    setHistoryRecords((current) => [record, ...current])
    setSelectedHistoryId(record.id)
    pushToast('已保存到历史记录', 'success')
  })

  const filteredHistory = useMemo(() => {
    return historyRecords.filter((record) => {
      const matchesFilter = filter === 'all' ? true : record.status === filter
      const query = search.trim().toLowerCase()
      const haystack = `${record.summary} ${record.transcript} ${record.result}`.toLowerCase()
      return matchesFilter && (!query || haystack.includes(query))
    })
  }, [filter, historyRecords, search])

  const copyValue = useCallback(async (value: string) => {
    await mockBackend.copyToClipboard(value)
    pushToast('已复制到剪贴板', 'success')
  }, [pushToast])

  const handleDeleteHistory = (id: string) => {
    setHistoryRecords((current) => current.filter((record) => record.id !== id))
    const next = filteredHistory.find((record) => record.id !== id)
    setSelectedHistoryId(next?.id ?? '')
    pushToast('历史记录已删除')
  }

  const handleInsert = async () => {
    await mockBackend.insertIntoActiveField(renderSchemaForExport(machine.session.schema))
    pushToast('已插入当前输入框', 'success')
  }

  const handleSettingsChange = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const onQuickInput = useEffectEvent(() => {
    setView('panel')
    void machine.startStreamingRecording()
  })

  const onTranscriptChunk = useEffectEvent((event: { payload: { text: string } }) => {
    if (event.payload?.text) {
      machine.appendRealtimeChunk(event.payload.text)
    }
  })

  useEffect(() => {
    if (
      settings.apiKey === 'sk-cn-demo-placeholder' ||
      settings.baseUrl === 'https://api.minimax.io/v1' ||
      !settings.whisperPath ||
      !settings.modelPath
    ) {
      setSettings((current) => ({
        ...current,
        whisperPath: current.whisperPath || defaultSettings.whisperPath,
        modelPath: current.modelPath || defaultSettings.modelPath,
        baseUrl:
          current.baseUrl === 'https://api.minimax.io/v1' ? defaultSettings.baseUrl : current.baseUrl || defaultSettings.baseUrl,
        apiKey: current.apiKey === 'sk-cn-demo-placeholder' ? defaultSettings.apiKey : current.apiKey || defaultSettings.apiKey,
        model: current.model || defaultSettings.model,
      }))
    }
  }, [setSettings, settings.apiKey, settings.baseUrl, settings.model, settings.modelPath, settings.whisperPath])

  useEffect(() => {
    const unlistenPromise = listen('voice-prompt://quick-input', () => {
      onQuickInput()
    })

    return () => {
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [])

  useEffect(() => {
    const unlistenPromise = listen<{ text: string }>('voice-prompt://transcript-chunk', (event) => {
      onTranscriptChunk(event)
    })

    return () => {
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [])

  useEffect(() => {
    if (
      settings.autoCopy &&
      machine.session.status === 'success' &&
      renderSchemaForExport(machine.session.schema) &&
      renderSchemaForExport(machine.session.schema) !== lastAutoCopiedResult.current
    ) {
      const rendered = renderSchemaForExport(machine.session.schema)
      lastAutoCopiedResult.current = rendered
      void copyValue(rendered)
    }
  }, [copyValue, machine.session.schema, machine.session.status, settings.autoCopy])

  const headerTabs: Array<{ id: ViewId; label: string }> = [
    { id: 'panel', label: '主面板' },
    { id: 'history', label: '历史记录' },
    { id: 'settings', label: '设置' },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_32%),linear-gradient(180deg,#f7f7f8_0%,#eceef1_100%)] px-4 py-6 text-ink-light dark:bg-[linear-gradient(180deg,#111214_0%,#1a1b1f_100%)] dark:text-ink-dark">
      <ToastViewport toasts={toasts} />

      <div className="mx-auto max-w-[1180px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mist-light dark:text-mist-dark">
              菜单栏语音输入增强器
            </p>
            <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em]">语音提示增强器</h1>
          </div>
          <div className="sub-panel flex items-center gap-1 p-1">
            {headerTabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'rounded-2xl px-4 py-2 text-sm font-medium transition',
                  view === tab.id
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-mist-light hover:bg-black/5 hover:text-ink-light dark:text-mist-dark dark:hover:bg-white/10 dark:hover:text-ink-dark',
                )}
                onClick={() => setView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {view === 'panel' ? (
          <MainPanelView
            session={machine.session}
            onModeChange={machine.setMode}
            onViewChange={setView}
            onStartRecording={() => {
              void machine.startStreamingRecording()
            }}
            onStopRecording={() => {
              void machine.stopRecording()
            }}
            onContinueSupplement={() => {
              machine.continueSupplement()
            }}
            onClearTranscript={() => {
              machine.clearTranscript()
            }}
            onTranscriptChange={machine.setTranscript}
            onRevisionModeChange={machine.setRevisionMode}
            onOptimizePrompt={() => {
              machine.optimizeAllFields()
            }}
            onSchemaFieldChange={machine.updateSchemaField}
            onFieldLockToggle={machine.toggleFieldLock}
            onOptimizeField={machine.optimizeField}
            onCopy={() => {
              void copyValue(renderSchemaForExport(machine.session.schema))
            }}
            onInsert={() => {
              void handleInsert()
            }}
            onResetSchema={() => {
              machine.resetSchema()
            }}
            onSaveVersion={() => {
              machine.saveVersionSnapshot()
            }}
            onRestoreVersion={(versionId) => {
              machine.restoreVersion(versionId)
            }}
          />
        ) : null}

        {view === 'history' ? (
          <HistoryView
            records={filteredHistory}
            selectedId={selectedHistoryId}
            search={search}
            filter={filter}
            onSelect={setSelectedHistoryId}
            onSearchChange={setSearch}
            onFilterChange={setFilter}
            onCopy={(value) => {
              void copyValue(value)
            }}
            onDelete={handleDeleteHistory}
          />
        ) : null}

        {view === 'settings' ? <SettingsView settings={settings} onChange={handleSettingsChange} /> : null}

        <div className="mt-4 flex items-center justify-between px-2 text-xs text-mist-light dark:text-mist-dark">
          <p>
            当前状态：<span className="font-medium text-ink-light dark:text-ink-dark">{machine.session.status}</span>
          </p>
          <p>{buildSummary(machine.session.transcript)}</p>
        </div>
      </div>
    </div>
  )
}

export default App
