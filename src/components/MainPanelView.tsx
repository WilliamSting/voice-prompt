import { useMemo, useRef } from 'react'
import { CopyIcon, HistoryIcon, InsertIcon, LockClosedIcon, LockOpenIcon, SettingsIcon, SparklesIcon, TrashIcon } from './Icons'
import { StatusDot } from './StatusDot'
import { WaveformPlaceholder } from './WaveformPlaceholder'
import { connectionLabel, formatTimestamp, promptFieldMeta, statusLabel, statusTone } from '../lib/utils'
import { templateOptions } from '../data/mock'
import type { PromptFieldName, PromptMode, SessionState, ViewId } from '../lib/types'

interface MainPanelViewProps {
  session: SessionState
  onModeChange: (mode: PromptMode) => void
  onViewChange: (view: ViewId) => void
  onStartRecording: () => void
  onStopRecording: () => void
  onContinueSupplement: () => void
  onClearTranscript: () => void
  onTranscriptChange: (value: string) => void
  onRevisionModeChange: (value: boolean) => void
  onOptimizePrompt: () => void
  onSchemaFieldChange: (fieldName: PromptFieldName, value: string) => void
  onFieldLockToggle: (fieldName: PromptFieldName) => void
  onOptimizeField: (fieldName: PromptFieldName) => void
  onCopy: () => void
  onInsert: () => void
  onResetSchema: () => void
  onSaveVersion: () => void
  onRestoreVersion: (versionId: string) => void
}

export function MainPanelView({
  session,
  onModeChange,
  onViewChange,
  onStartRecording,
  onStopRecording,
  onContinueSupplement,
  onClearTranscript,
  onTranscriptChange,
  onRevisionModeChange,
  onOptimizePrompt,
  onSchemaFieldChange,
  onFieldLockToggle,
  onOptimizeField,
  onCopy,
  onInsert,
  onResetSchema,
  onSaveVersion,
  onRestoreVersion,
}: MainPanelViewProps) {
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null)

  const isRecording = session.status === 'recording'
  const isProcessing = session.status === 'transcribing' || session.status === 'rewriting'
  const statusBadge = useMemo(
    () =>
      ({
        idle: '待开始',
        recording: '录音中',
        transcribing: '转写中',
        rewriting: '优化中',
        success: '可继续编辑',
        error: '失败',
      })[session.status],
    [session.status],
  )

  return (
    <div className="glass-panel overflow-hidden">
      <div className="hairline flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-semibold text-white dark:bg-white dark:text-black">
            VP
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-light dark:text-ink-dark">语音提示增强器</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-mist-light dark:text-mist-dark">
              <StatusDot status={session.connection} />
              <span>{connectionLabel(session.connection)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-full border border-stroke-light bg-white/70 px-3 py-2 text-xs font-medium text-ink-light outline-none dark:border-stroke-dark dark:bg-white/5 dark:text-ink-dark"
            value={session.mode}
            onChange={(event) => onModeChange(event.target.value as PromptMode)}
          >
            {templateOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="button-ghost" onClick={() => onViewChange('history')} aria-label="历史记录">
            <HistoryIcon className="h-4 w-4" />
          </button>
          <button className="button-ghost" onClick={() => onViewChange('settings')} aria-label="设置">
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.45fr)]">
          <section className="sub-panel min-w-0 overflow-hidden">
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button className="button-primary" onClick={onStartRecording} disabled={isRecording || isProcessing}>
                  开始录音
                </button>
                <button className="button-secondary" onClick={onStopRecording} disabled={!isRecording}>
                  停止录音
                </button>
                <button className="button-secondary" onClick={onContinueSupplement} disabled={isRecording || isProcessing}>
                  继续补充
                </button>
                <button className="button-ghost" onClick={onClearTranscript}>
                  <TrashIcon className="mr-1 h-4 w-4" />
                  清空
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-stroke-light bg-white/70 px-4 py-3 dark:border-stroke-dark dark:bg-white/5">
                <div>
                  <p className={`text-sm font-medium ${statusTone(session.status)}`}>{statusBadge}</p>
                  <p className="mt-1 text-xs text-mist-light dark:text-mist-dark">{statusLabel(session.status)}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-mist-light dark:text-mist-dark">
                  <input
                    type="checkbox"
                    checked={session.revisionMode}
                    onChange={(event) => onRevisionModeChange(event.target.checked)}
                  />
                  本次补充用于修订当前 Prompt
                </label>
              </div>

              {session.lastVoiceCommand ? (
                <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
                  <p className="text-sm font-medium text-success">语音修订已应用</p>
                  <p className="mt-1 text-xs leading-5 text-success/90">{session.lastVoiceCommand}</p>
                </div>
              ) : null}

              <WaveformPlaceholder status={session.status} />

              <textarea
                ref={transcriptRef}
                className="min-h-[420px] w-full rounded-[24px] border border-stroke-light bg-white/85 p-4 text-sm leading-6 text-ink-light outline-none transition focus:border-black/15 focus:ring-2 focus:ring-black/5 dark:border-stroke-dark dark:bg-white/5 dark:text-ink-dark dark:focus:border-white/15 dark:focus:ring-white/10"
                value={session.transcript}
                onChange={(event) => onTranscriptChange(event.target.value)}
                placeholder="录音后，转写草稿会逐步出现在这里。你也可以直接手动编辑。"
              />
            </div>
          </section>

          <section className="sub-panel min-w-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
            <div className="hairline px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-ink-light dark:text-ink-dark">Prompt 结构编辑器</p>
                  <p className="mt-1 text-sm text-mist-light dark:text-mist-dark">
                    每个字段都可以单独编辑、单独优化、单独锁定。
                  </p>
                </div>
                <button className="button-primary" onClick={onOptimizePrompt} disabled={isRecording || isProcessing}>
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  优化 Prompt
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="sub-panel space-y-3 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-light dark:text-ink-dark">版本流</p>
                    <p className="mt-1 text-xs text-mist-light dark:text-mist-dark">
                      每次优化、重置或语音修订都会生成一个可回退快照。
                    </p>
                  </div>
                  <button className="chip" onClick={onSaveVersion}>
                    保存版本
                  </button>
                </div>
                <div className="grid gap-2">
                  {session.versions.length ? (
                    session.versions.map((version) => (
                      <button
                        key={version.id}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          session.selectedVersionId === version.id
                            ? 'border-black/10 bg-black/[0.04] dark:border-white/10 dark:bg-white/10'
                            : 'border-stroke-light bg-white/60 hover:bg-white dark:border-stroke-dark dark:bg-white/5 dark:hover:bg-white/10'
                        }`}
                        onClick={() => onRestoreVersion(version.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-ink-light dark:text-ink-dark">{version.label}</p>
                          <span className="text-[11px] text-mist-light dark:text-mist-dark">
                            {formatTimestamp(version.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-mist-light dark:text-mist-dark">{version.summary}</p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-stroke-light px-3 py-4 text-xs text-mist-light dark:border-stroke-dark dark:text-mist-dark">
                      还没有版本快照。先优化一次，或者手动保存一个版本。
                    </div>
                  )}
                </div>
              </div>

              {promptFieldMeta.map((field) => {
                const locked = session.fieldLocks[field.key]
                return (
                  <article key={field.key} className="sub-panel space-y-3 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink-light dark:text-ink-dark">{field.label}</p>
                        <p className="mt-1 text-xs text-mist-light dark:text-mist-dark">
                          {locked ? '此字段已锁定，批量优化时不会改动。' : '此字段会参与结构化优化。'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="chip"
                          onClick={() => onOptimizeField(field.key)}
                          disabled={isRecording || isProcessing || locked}
                        >
                          优化此字段
                        </button>
                        <button className="chip" onClick={() => onFieldLockToggle(field.key)}>
                          {locked ? <LockClosedIcon className="h-4 w-4" /> : <LockOpenIcon className="h-4 w-4" />}
                          {locked ? '已锁定' : '锁定'}
                        </button>
                      </div>
                    </div>

                    <textarea
                      className="min-h-[112px] w-full rounded-[20px] border border-stroke-light bg-white/90 p-4 text-sm leading-6 text-ink-light outline-none transition focus:border-black/15 focus:ring-2 focus:ring-black/5 dark:border-stroke-dark dark:bg-white/5 dark:text-ink-dark dark:focus:border-white/15 dark:focus:ring-white/10"
                      value={session.schema[field.key]}
                      onChange={(event) => onSchemaFieldChange(field.key, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  </article>
                )
              })}

              <div className="flex flex-wrap items-center gap-2">
                <button className="button-secondary" onClick={onCopy}>
                  <CopyIcon className="mr-2 h-4 w-4" />
                  复制结果
                </button>
                <button className="button-secondary" onClick={onInsert}>
                  <InsertIcon className="mr-2 h-4 w-4" />
                  插入当前输入框
                </button>
                <button className="button-ghost" onClick={onResetSchema}>
                  重置结构
                </button>
                <button className="button-ghost" onClick={onSaveVersion}>
                  保存版本
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-3">
          {session.errorMessage ? (
            <div className="sub-panel border-danger/20 bg-danger/5 px-4 py-3">
              <p className="text-sm font-medium text-danger">处理失败</p>
              <p className="mt-1 text-xs leading-5 text-danger/80">{session.errorMessage}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
