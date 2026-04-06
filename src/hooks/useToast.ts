import { useCallback, useMemo, useState } from 'react'

export interface ToastItem {
  id: string
  title: string
  tone?: 'default' | 'success' | 'error'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const pushToast = useCallback((title: string, tone: ToastItem['tone'] = 'default') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, title, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2200)
  }, [])

  return useMemo(
    () => ({
      toasts,
      pushToast,
    }),
    [pushToast, toasts],
  )
}
