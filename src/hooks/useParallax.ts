import { useEffect, useRef, useState } from 'react'

/**
 * Lightweight parallax hook that tracks scroll position
 * and returns a transform value for subtle depth effect.
 */
export function useParallax(factor = 0.3) {
  const [offset, setOffset] = useState(0)
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const container = containerRef.current || document.querySelector('#screen-home')
    if (!container) return

    const handleScroll = () => {
      const scrollY = container.scrollTop || 0
      setOffset(scrollY * factor)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [factor])

  return { offset, containerRef }
}
