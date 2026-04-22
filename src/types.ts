export interface Participant {
  id: string
  name: string
  active: boolean
  luck: number // 1-5, default 3. 1=más probable, 5=menos probable
}

export interface AnimationStep {
  id: string
  delay: number
  isFinal: boolean
}

export type Mode =
  | 'normal'
  | 'elimination'
  | 'team'
  | 'order'
  | 'revenge'
  | 'duel'
  | 'split'
  | 'russian'
  | 'tournament'
  | 'coin'
  | 'dice'
  | 'bomb'
  | 'voice'

export type Phase = 'idle' | 'countdown' | 'spinning' | 'revealing' | 'result'

export type PerfLevel = 'full' | 'medium' | 'reduced'

export interface SessionStats {
  [participantId: string]: {
    chosen: number
  }
}

export interface HistoryEntry {
  winnerId: string
  winnerName: string
  question: string
  mode: Mode
  timestamp: number
}

export interface SavedGroup {
  name: string
  members: SavedMember[]
  savedAt: number
  count: number
}

export interface SavedMember {
  name: string
  luck: number
}

export interface Prefs {
  vibration: boolean
  sound: boolean
  particles: boolean
  flash: boolean
  roulette: boolean
  /** Narrador por voz anuncia al ganador (SpeechSynthesis) */
  narrator: boolean
  /** Ritual de tensión (~800ms) antes del countdown. Opt-in. */
  ritual: boolean
  /** Personalidad del sorteo: afecta narrador y estilo visual */
  personality: 'neutral' | 'epic' | 'playful' | 'tense' | 'elegant'
  glow: number
  speed: number
  defaultQuestion: string
  theme: string
}

export interface SkinInfo {
  id: string
  mode: Mode
  name: string
  description: string
  icon: string
  price: number
  owned: boolean
}
