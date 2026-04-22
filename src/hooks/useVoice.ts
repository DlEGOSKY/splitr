import { useRef, useState, useCallback, useEffect } from 'react'
import { showToast } from '../components/Toast'

// ══════════════════════════════════════════════════════════
// VOICE RECOGNITION HOOK
// ══════════════════════════════════════════════════════════

const TRIGGERS = ['sortear', 'sort', 'venga', 'ya', 'dale', 'sortea', 'girar', 'ruleta']

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

type SpeechRecognitionErrorEvent = { error: string }

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export function useVoice(onTrigger: () => void) {
  const [listening, setListening] = useState(false)
  const [available, setAvailable] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setAvailable(!!SpeechRecognition)
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'es-ES'
    rec.maxAlternatives = 1

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1]
      const transcript = last[0].transcript.toLowerCase().trim()
      const triggered = TRIGGERS.some(t => transcript.includes(t))

      if (triggered) {
        showToast(`Voz: "${transcript}"`)
        onTrigger()
      }
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[Voz]', e.error)
        activeRef.current = false
        setListening(false)
      }
    }

    rec.onend = () => {
      if (activeRef.current) {
        try { rec.start() } catch { /* ignore */ }
      }
    }

    recognitionRef.current = rec

    return () => {
      activeRef.current = false
      try { rec.stop() } catch { /* ignore */ }
    }
  }, [onTrigger])

  const toggle = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return

    if (activeRef.current) {
      activeRef.current = false
      setListening(false)
      try { rec.stop() } catch { /* ignore */ }
    } else {
      try {
        rec.start()
        activeRef.current = true
        setListening(true)
        showToast('Escuchando… di "Sortear"')
      } catch { /* already active */ }
    }
  }, [])

  return { listening, available, toggle }
}
