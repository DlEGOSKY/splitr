/**
 * Narrador por voz — usa SpeechSynthesis API nativa.
 * Cero dependencias. Silencioso si no hay soporte o si el usuario lo tiene off.
 *
 * Uso:
 *   narrateWinner('Diego', { mode: 'bomb' })
 *   narrateCustom('Y el elegido es...')
 */
import type { Mode } from '../types'
import { getPersonality, type PersonalityId } from './personality'
import { useSplitStore } from '../store/useSplitStore'

const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

let cachedVoices: SpeechSynthesisVoice[] = []
let voicesLoaded = false

/** Carga voces disponibles (algunas plataformas las cargan async) */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSupported) return Promise.resolve([])
  if (voicesLoaded && cachedVoices.length > 0) return Promise.resolve(cachedVoices)

  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      cachedVoices = existing
      voicesLoaded = true
      resolve(existing)
      return
    }
    const handler = () => {
      cachedVoices = window.speechSynthesis.getVoices()
      voicesLoaded = true
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
      resolve(cachedVoices)
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    // Safety timeout — Safari a veces no dispara voiceschanged
    setTimeout(() => {
      if (!voicesLoaded) {
        cachedVoices = window.speechSynthesis.getVoices()
        voicesLoaded = true
        resolve(cachedVoices)
      }
    }, 800)
  })
}

/** Selecciona la mejor voz en español disponible */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  // Prioridad: es-MX > es-ES > es-* > cualquiera en español > default
  const preferenceOrder = [
    (v: SpeechSynthesisVoice) => v.lang === 'es-MX' || v.lang === 'es-US',
    (v: SpeechSynthesisVoice) => v.lang === 'es-ES',
    (v: SpeechSynthesisVoice) => v.lang?.startsWith('es'),
    (v: SpeechSynthesisVoice) => v.default,
  ]

  for (const pref of preferenceOrder) {
    const match = voices.find(pref)
    if (match) return match
  }
  return voices[0]
}

export interface NarrateOptions {
  /** Modo actual — ajusta tono/velocidad para coherencia dramática */
  mode?: Mode
  /** Override de rate (0.1 - 10, default 0.95) */
  rate?: number
  /** Override de pitch (0 - 2, default 1.0) */
  pitch?: number
  /** Volumen 0-1 (default 1) */
  volume?: number
  /** Si true, cancela cualquier narración previa (default true) */
  interrupt?: boolean
}

/** Frases de introducción con pausa dramática integrada */
const INTRO_PHRASES: Record<string, string[]> = {
  default: [
    'Y el elegido es...',
    'El destino ha decidido...',
    'La suerte apunta a...',
  ],
  bomb: [
    'La bomba explota en...',
    'Cae sobre...',
  ],
  russian: [
    'La bala tiene nombre...',
  ],
  revenge: [
    'La venganza cae sobre...',
  ],
  coin: [
    'La moneda eligió a...',
  ],
  dice: [
    'El dado señala a...',
  ],
  duel: [
    'El ganador del duelo es...',
  ],
}

function getIntroForMode(mode?: Mode): string {
  const pool = (mode && INTRO_PHRASES[mode]) || INTRO_PHRASES.default
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Ajustes de tono por modo para variar el drama */
function getModeVoiceParams(mode?: Mode): { rate: number; pitch: number } {
  switch (mode) {
    case 'bomb':
    case 'russian':
      return { rate: 0.82, pitch: 0.75 } // grave, lento, tenso
    case 'coin':
    case 'dice':
      return { rate: 1.0, pitch: 1.1 } // rápido y ligero
    case 'duel':
      return { rate: 0.9, pitch: 0.9 }
    case 'revenge':
      return { rate: 0.85, pitch: 0.7 } // grave y amenazante
    default:
      return { rate: 0.95, pitch: 1.0 }
  }
}

/**
 * Narra el nombre del ganador con una intro dramática.
 * Silencioso si el navegador no soporta SpeechSynthesis.
 */
export async function narrateWinner(name: string, opts: NarrateOptions = {}): Promise<void> {
  if (!isSupported) return
  if (!name) return

  const voices = await loadVoices()
  const voice = pickVoice(voices)
  const { rate: baseRate, pitch: basePitch } = getModeVoiceParams(opts.mode)

  // Personalidad — multiplica rate/pitch base y puede reemplazar frase
  const personalityId = (useSplitStore.getState().prefs.personality ?? 'neutral') as PersonalityId
  const personality = getPersonality(personalityId)

  // Si la personalidad no es neutral y el modo es "normal-ish", usa la frase
  // de la personalidad directamente; si es modo dark (bomb/russian/revenge)
  // mantiene la intro temática pero con el tono de la personalidad
  const isDarkMode = opts.mode === 'bomb' || opts.mode === 'russian' || opts.mode === 'revenge'
  let text: string
  if (personalityId !== 'neutral' && !isDarkMode) {
    text = personality.phrases.announceWinner(name)
  } else if (personalityId !== 'neutral' && isDarkMode) {
    text = `${getIntroForMode(opts.mode)} ${personality.phrases.announceEliminated(name)}`
  } else {
    const intro = getIntroForMode(opts.mode)
    text = `${intro}... ${name}`
  }

  if (opts.interrupt !== false) {
    window.speechSynthesis.cancel()
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = voice?.lang || 'es-ES'
  if (voice) utterance.voice = voice
  utterance.rate = clamp(
    (opts.rate ?? baseRate) * personality.voice.rateMultiplier,
    0.1, 10
  )
  utterance.pitch = clamp(
    (opts.pitch ?? basePitch) * personality.voice.pitchMultiplier,
    0, 2
  )
  utterance.volume = opts.volume ?? 1

  window.speechSynthesis.speak(utterance)
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/** Narra texto libre (para toasts importantes, easter eggs, etc.) */
export async function narrateCustom(text: string, opts: NarrateOptions = {}): Promise<void> {
  if (!isSupported || !text) return
  const voices = await loadVoices()
  const voice = pickVoice(voices)

  if (opts.interrupt !== false) {
    window.speechSynthesis.cancel()
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = voice?.lang || 'es-ES'
  if (voice) utterance.voice = voice
  utterance.rate = opts.rate ?? 0.95
  utterance.pitch = opts.pitch ?? 1
  utterance.volume = opts.volume ?? 1
  window.speechSynthesis.speak(utterance)
}

/** Detiene cualquier narración en curso */
export function stopNarrator(): void {
  if (!isSupported) return
  window.speechSynthesis.cancel()
}

/** Retorna true si el navegador tiene soporte para el narrador */
export function isNarratorAvailable(): boolean {
  return isSupported
}
