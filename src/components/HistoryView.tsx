import { CopyIcon, TrashIcon } from './Icons'
import { formatTimestamp } from '../lib/utils'
import type { PromptRecord } from '../lib/types'

interface HistoryViewProps {
  records: PromptRecord[]
  selectedId: string
  search: string
  filter: 'all' | 'success' | 'error'
  onSelect: (id: string) => void
  onSearchChange: (value: string) => void
  onFilterChange: (value: 'all' | 'success' | 'error') => void
  onCopy: (value: string) => void
  onDelete: (id: string) => void
}

export function HistoryView({
  records,
  selectedId,
  search,
  filter,
  onSelect,
  onSearchChange,
  onFilterChange,
  onCopy,
  onDelete,
}: HistoryViewProps) {
  const selected = records.find((record) => record.id === selectedId) ?? records[0]

  return (
    <div className="glass-panel overflow-hidden">
      <div className="hairline px-5 py-4">
        <p className="text-base font-semibold text-ink-light dark:text-ink-dark">历史记录</p>
        <p className="mt-1 text-sm text-mist-light dark:text-mist-dark">
          搜索、筛选并回看每一次 transcript 和 result。
        </p>
      </div>

      <div className="grid min-h-[720px] grid-cols-[320px_1fr]">
        <aside className="hairline border-r border-stroke-light/70 p-4 dark:border-stroke-dark/70">
          <div className="space-y-3">
            <input
              className="mac-input"
              placeholder="搜索摘要、transcript、result"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <div className="flex gap-2">
              {(['all', 'success', 'error'] as const).map((item) => (
                <button
                  key={item}
                  className={`chip ${filter === item ? 'bg-black text-white dark:bg-white dark:text-black' : ''}`}
                  onClick={() => onFilterChange(item)}
                >
                  {item === 'all' ? '全部' : item === 'success' ? '成功' : '失败'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {records.map((record) => (
              <button
                key={record.id}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                  record.id === selectedId
                    ? 'border-black/10 bg-black/[0.04] dark:border-white/10 dark:bg-white/10'
                    : 'border-stroke-light bg-white/60 hover:bg-white dark:border-stroke-dark dark:bg-white/5 dark:hover:bg-white/10'
                }`}
                onClick={() => onSelect(record.id)}
              >
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist-light dark:text-mist-dark">
                    {{
                      general: '通用',
                      codex: 'Codex',
                      product: '产品',
                      writing: '写作',
                      custom: '自定义',
                    }[record.mode]}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      record.status === 'success' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {record.status === 'success' ? '成功' : '失败'}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-ink-light dark:text-ink-dark">{record.summary}</p>
                <p className="mt-2 text-xs text-mist-light dark:text-mist-dark">
                  {formatTimestamp(record.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="p-5">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-light dark:text-ink-dark">{selected.summary}</p>
                  <p className="mt-1 text-xs text-mist-light dark:text-mist-dark">
                    {formatTimestamp(selected.createdAt)} · {selected.mode} · {selected.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="button-secondary gap-2" onClick={() => onCopy(selected.result)}>
                    <CopyIcon className="h-4 w-4" />
                    复制
                  </button>
                  <button className="button-secondary gap-2" onClick={() => onDelete(selected.id)}>
                    <TrashIcon className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="sub-panel overflow-hidden">
                  <div className="hairline px-4 py-3 text-sm font-semibold text-ink-light dark:text-ink-dark">
                    完整转写
                  </div>
                  <div className="max-h-[540px] overflow-auto px-4 py-4 text-sm leading-6 text-mist-light dark:text-mist-dark">
                    {selected.transcript}
                  </div>
                </div>
                <div className="sub-panel overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                  <div className="hairline px-4 py-3 text-sm font-semibold text-ink-light dark:text-ink-dark">
                    完整结果
                  </div>
                  <div className="max-h-[540px] overflow-auto px-4 py-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-ink-light dark:text-ink-dark">
                      {selected.result}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-mist-light dark:text-mist-dark">
              暂无记录
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
