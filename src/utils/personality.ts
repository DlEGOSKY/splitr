/**
 * Personalidades del sorteo — define el "tono" emocional de la experiencia.
 *
 * Cada personalidad altera:
 *  - Voz del narrador (pitch, rate, plantillas de frases)
 *  - Clase CSS en <body> (tempo de animaciones, saturación, acentos)
 *
 * Intencionalmente NO toca lógica de partículas ni audio WebAudio para
 * mantener bajo el riesgo de regresión. Es capa visual/verbal.
 *
 * Default: 'neutral' — mantiene el comportamiento histórico de Splitr.
 */

export type PersonalityId = 'neutral' | 'epic' | 'playful' | 'tense' | 'elegant'

export interface PersonalityPhrase {
  /** Se reproduce cuando aparece el ganador en modos normales */
  announceWinner: (name: string) => string
  /** Se reproduce en modos "dark" (bomba/ruleta) */
  announceEliminated: (name: string) => string
}

export interface Personality {
  id: PersonalityId
  label: string
  description: string
  /** Multiplicador sobre el pitch/rate base del narrador */
  voice: {
    pitchMultiplier: number
    rateMultiplier: number
  }
  phrases: PersonalityPhrase
  /** Clase añadida a <body> mientras esta personalidad está activa */
  bodyClass: string
  /** Icono representativo (SVG path data para 24x24 stroke) */
  iconPath: string
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'neutral',
    label: 'Neutral',
    description: 'El Splitr de siempre',
    voice: { pitchMultiplier: 1, rateMultiplier: 1 },
    phrases: {
      announceWinner: (n) => `Elegido: ${n}`,
      announceEliminated: (n) => `${n}`,
    },
    bodyClass: 'personality-neutral',
    iconPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  },
  {
    id: 'epic',
    label: 'Épico',
    description: 'Tono dramático y grandilocuente',
    voice: { pitchMultiplier: 0.85, rateMultiplier: 0.85 },
    phrases: {
      announceWinner: (n) => `El destino ha hablado. ${n} ha sido elegido.`,
      announceEliminated: (n) => `${n}. No hay vuelta atrás.`,
    },
    bodyClass: 'personality-epic',
    iconPath: 'M12 2l2.5 7.5H22l-6 4.5 2.5 7.5L12 17l-6.5 4.5L8 14l-6-4.5h7.5L12 2z',
  },
  {
    id: 'playful',
    label: 'Broma',
    description: 'Tono juguetón e irreverente',
    voice: { pitchMultiplier: 1.15, rateMultiplier: 1.1 },
    phrases: {
      announceWinner: (n) => `¡Sorpresa! Le tocó a ${n}.`,
      announceEliminated: (n) => `Ay no. ${n}. Mala pata.`,
    },
    bodyClass: 'personality-playful',
    iconPath: 'M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M12 2a10 10 0 100 20 10 10 0 000-20z',
  },
  {
    id: 'tense',
    label: 'Tenso',
    description: 'Susurros y pausas dramáticas',
    voice: { pitchMultiplier: 0.8, rateMultiplier: 0.75 },
    phrases: {
      announceWinner: (n) => `El elegido... es ${n}.`,
      announceEliminated: (n) => `${n}. Se acabó.`,
    },
    bodyClass: 'personality-tense',
    iconPath: 'M12 2v6M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4',
  },
  {
    id: 'elegant',
    label: 'Elegante',
    description: 'Formal y pausado',
    voice: { pitchMultiplier: 0.95, rateMultiplier: 0.9 },
    phrases: {
      announceWinner: (n) => `Le corresponde a ${n}.`,
      announceEliminated: (n) => `${n}. Le ha tocado.`,
    },
    bodyClass: 'personality-elegant',
    iconPath: 'M6 3h12l-2 9a4 4 0 01-8 0L6 3zM12 16v4M8 20h8',
  },
]

const MAP = new Map(PERSONALITIES.map((p) => [p.id, p]))

/** Devuelve la personalidad por id, con fallback a neutral */
export function getPersonality(id: PersonalityId | string | undefined): Personality {
  if (!id) return MAP.get('neutral')!
  return MAP.get(id as PersonalityId) ?? MAP.get('neutral')!
}

/** Aplica la clase de body de la personalidad actual, limpia las anteriores */
export function applyPersonalityBodyClass(id: PersonalityId): void {
  if (typeof document === 'undefined') return
  const body = document.body
  const toRemove: string[] = []
  body.classList.forEach((cls) => {
    if (cls.startsWith('personality-')) toRemove.push(cls)
  })
  toRemove.forEach((cls) => body.classList.remove(cls))
  body.classList.add(getPersonality(id).bodyClass)
}
