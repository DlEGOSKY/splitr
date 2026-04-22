import { useEffect } from 'react'

export function useRipple() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.btn') as HTMLElement | null
      if (!btn) return

      const rect = btn.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`

      btn.appendChild(ripple)

      ripple.addEventListener('animationend', () => {
        ripple.remove()
      })
    }

    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])
}
