import { useState, useEffect, useCallback } from 'react'

interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'error'
}

let toastId = 0
let addToastFn: ((msg: string, type?: 'info' | 'success' | 'error') => void) | null = null

export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
  addToastFn?.(message, type)
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          role="alert"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
