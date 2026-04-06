import { cn } from '../lib/utils'
import type { ProcessStatus } from '../lib/types'

const bars = [22, 38, 26, 48, 34, 56, 29, 44, 31, 52, 24, 36]

interface WaveformPlaceholderProps {
  status: ProcessStatus
}

export function WaveformPlaceholder({ status }: WaveformPlaceholderProps) {
  const animated = status === 'recording' || status === 'transcribing' || status === 'rewriting'

  return (
    <div className="sub-panel flex h-24 items-end justify-center gap-1.5 px-6 py-4">
      {bars.map((height, index) => (
        <span
          key={`${index}-${height}`}
          className={cn(
            'w-1.5 rounded-full bg-black/45 dark:bg-white/60',
            animated && 'animate-pulsebar',
          )}
          style={{
            height,
            animationDelay: `${index * 90}ms`,
          }}
        />
      ))}
    </div>
  )
}
