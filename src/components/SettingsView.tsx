import type { ReactNode } from 'react'
import { templateOptions } from '../data/mock'
import type { SettingsState } from '../lib/types'

interface SettingsViewProps {
  settings: SettingsState
  onChange: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-stroke-light bg-white/60 px-4 py-3 dark:border-stroke-dark dark:bg-white/5">
      <div>
        <p className="text-sm font-medium text-ink-light dark:text-ink-dark">{label}</p>
        <p className="mt-1 text-xs text-mist-light dark:text-mist-dark">{description}</p>
      </div>
      <button
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? 'bg-ink-light dark:bg-white' : 'bg-black/10 dark:bg-white/15'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition dark:bg-black ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="sub-panel p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-ink-light dark:text-ink-dark">{title}</p>
        <p className="mt-1 text-xs text-mist-light dark:text-mist-dark">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function SettingsView({ settings, onChange }: SettingsViewProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="hairline px-5 py-4">
        <p className="text-base font-semibold text-ink-light dark:text-ink-dark">设置</p>
        <p className="mt-1 text-sm text-mist-light dark:text-mist-dark">
          所有项先保存在前端 mock store，后续可直接接 Tauri 持久化。
        </p>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-2">
        <Section title="通用设置" description="快捷键、录音时长与启动行为。">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-sm">
              <span className="text-mist-light dark:text-mist-dark">快捷键</span>
              <input
                className="mac-input"
                value={settings.shortcut}
                onChange={(event) => onChange('shortcut', event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-mist-light dark:text-mist-dark">录音时长</span>
              <select
                className="mac-input"
                value={settings.recordingDuration}
                onChange={(event) => onChange('recordingDuration', Number(event.target.value))}
              >
                <option value={0}>手动停止</option>
                <option value={5}>5 秒</option>
                <option value={8}>8 秒</option>
                <option value={10}>10 秒</option>
              </select>
            </label>
          </div>
          <ToggleRow
            label="开机启动"
            description="为后续 Tauri autostart 能力预留。"
            checked={settings.launchAtLogin}
            onChange={(checked) => onChange('launchAtLogin', checked)}
          />
          <ToggleRow
            label="自动复制"
            description="结果生成后自动复制到剪贴板。"
            checked={settings.autoCopy}
            onChange={(checked) => onChange('autoCopy', checked)}
          />
        </Section>

        <Section title="模型设置" description="Whisper、本地模型与 MiniMax 配置。">
          <label className="space-y-2 text-sm">
            <span className="text-mist-light dark:text-mist-dark">Whisper 路径</span>
            <input
              className="mac-input"
              value={settings.whisperPath}
              onChange={(event) => onChange('whisperPath', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-mist-light dark:text-mist-dark">模型路径</span>
            <input
              className="mac-input"
              value={settings.modelPath}
              onChange={(event) => onChange('modelPath', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-mist-light dark:text-mist-dark">MiniMax base_url</span>
            <input
              className="mac-input"
              value={settings.baseUrl}
              onChange={(event) => onChange('baseUrl', event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-sm">
              <span className="text-mist-light dark:text-mist-dark">API Key</span>
              <input
                className="mac-input"
                value={settings.apiKey}
                onChange={(event) => onChange('apiKey', event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-mist-light dark:text-mist-dark">Model</span>
              <input
                className="mac-input"
                value={settings.model}
                onChange={(event) => onChange('model', event.target.value)}
              />
            </label>
          </div>
        </Section>

        <Section title="Prompt 模板设置" description="内置模板与自定义扩展入口。">
          <div className="grid gap-2">
            {templateOptions.map((template) => (
              <button
                key={template.id}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  settings.selectedTemplate === template.id
                    ? 'border-black/10 bg-black/[0.04] dark:border-white/10 dark:bg-white/10'
                    : 'border-stroke-light bg-white/60 dark:border-stroke-dark dark:bg-white/5'
                }`}
                onClick={() => onChange('selectedTemplate', template.id)}
              >
                <p className="text-sm font-medium text-ink-light dark:text-ink-dark">{template.label}</p>
                <p className="mt-1 text-xs text-mist-light dark:text-mist-dark">{template.description}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="输出设置" description="控制复制、历史与失败降级策略。">
          <ToggleRow
            label="自动保存历史"
            description="每次成功或失败都写入本地 mock history store。"
            checked={settings.autoSaveHistory}
            onChange={(checked) => onChange('autoSaveHistory', checked)}
          />
          <ToggleRow
            label="失败降级"
            description="当整理失败时，回退为只展示 transcript。"
            checked={settings.fallbackOnFailure}
            onChange={(checked) => onChange('fallbackOnFailure', checked)}
          />
          <ToggleRow
            label="再次自动复制"
            description="保留和主流程一致的行为演示。"
            checked={settings.autoCopy}
            onChange={(checked) => onChange('autoCopy', checked)}
          />
        </Section>
      </div>
    </div>
  )
}
