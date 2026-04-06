import { cn } from '../lib/utils'
import type { ToastItem } from '../hooks/useToast'

interface ToastViewportProps {
  toasts: ToastItem[]
}

export function ToastViewport({ toasts }: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-72 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'glass-panel pointer-events-auto animate-slideUp px-4 py-3 text-sm',
            toast.tone === 'success' && 'ring-1 ring-success/20',
            toast.tone === 'error' && 'ring-1 ring-danger/20',
          )}
        >
          {toast.title}
        </div>
      ))}
    </div>
  )
}
