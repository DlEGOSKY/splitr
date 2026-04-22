import { useRef, useState, useCallback } from 'react'

const HOLD_DURATION = 1200 // ms to fill the ring

export function useHoldToSpin(onComplete: () => void) {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const startRef = useRef(0)
  const rafRef = useRef(0)

  const tick = useCallback(() => {
    const elapsed = Date.now() - startRef.current
    const p = Math.min(elapsed / HOLD_DURATION, 1)
    setProgress(p)
    if (p >= 1) {
      setHolding(false)
      setProgress(0)
      onComplete()
    } else {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [onComplete])

  const start = useCallback(() => {
    startRef.current = Date.now()
    setHolding(true)
    setProgress(0)
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const cancel = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setHolding(false)
    setProgress(0)
  }, [])

  return { progress, holding, start, cancel }
}
