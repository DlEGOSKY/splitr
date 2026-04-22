/**
 * Plantillas rápidas — casos de uso predefinidos que pre-llenan
 * pregunta, modo y (opcional) ejemplos de nombres.
 *
 * Filosofía: reducir fricción del primer uso. Los ejemplos son editables;
 * los nombres son "placeholder" para que el usuario los reemplace rápido.
 */
import type { Mode } from '../types'

export interface Template {
  id: string
  /** Texto corto visible en el chip */
  label: string
  /** Hint opcional bajo el label */
  sublabel?: string
  /** Icono SVG path data (viewBox 24x24, stroke currentColor) */
  iconPath: string
  /** Pregunta pre-llenada */
  question: string
  /** Modo a activar */
  mode: Mode
  /** Nombres de ejemplo (opcional, el usuario los edita) */
  exampleNames?: string[]
  /** Color de acento del chip (hue para gradient) */
  hue: number
}

export const TEMPLATES: Template[] = [
  {
    id: 'dinner',
    label: 'Paga la cena',
    sublabel: 'Uno al azar invita',
    iconPath: 'M4 6h16M4 12h16M4 18h10 M18 15l3 3-3 3',
    question: '¿Quién paga la cena?',
    mode: 'normal',
    hue: 20, // naranja cálido
  },
  {
    id: 'dishes',
    label: 'Quién lava',
    sublabel: 'Los platos no se lavan solos',
    iconPath: 'M3 10h18M5 10v8a2 2 0 002 2h10a2 2 0 002-2v-8M12 3v4M9 5l3 2 3-2',
    question: '¿Quién lava los platos?',
    mode: 'normal',
    hue: 200,
  },
  {
    id: 'teams',
    label: 'Equipos',
    sublabel: 'Divide en dos grupos',
    iconPath: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    question: '¿Cómo dividimos los equipos?',
    mode: 'split',
    hue: 280,
  },
  {
    id: 'turn-order',
    label: 'Orden de turnos',
    sublabel: 'Quién va primero',
    iconPath: 'M3 6h18M3 12h18M3 18h18M6 3v18',
    question: '¿Cuál es el orden?',
    mode: 'order',
    hue: 140,
  },
  {
    id: 'duel',
    label: 'Duelo 1vs1',
    sublabel: 'Mano a mano',
    iconPath: 'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M15 5l4-4 2 2-4 4',
    question: '¿Quién gana el duelo?',
    mode: 'duel',
    hue: 0,
  },
  {
    id: 'tournament',
    label: 'Torneo',
    sublabel: 'Bracket hasta el ganador',
    iconPath: 'M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v2a2 2 0 01-2 2h-2M8 22h8M12 17v5M8 2h8v5a4 4 0 11-8 0V2z',
    question: '¿Quién es el campeón?',
    mode: 'tournament',
    hue: 45,
  },
  {
    id: 'bomb',
    label: 'La bomba',
    sublabel: 'Tensión máxima',
    iconPath: 'M11 22a7 7 0 100-14 7 7 0 000 14zM14 8V6a2 2 0 012-2h2M19 3l2 2M21 3l-2 2',
    question: '¿A quién le explota?',
    mode: 'bomb',
    hue: 15,
  },
  {
    id: 'coin',
    label: 'Cara o cruz',
    sublabel: 'Decisión rápida',
    iconPath: 'M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zM12 6v12M8 10h8M8 14h8',
    question: '¿Cara o cruz?',
    mode: 'coin',
    exampleNames: ['Cara', 'Cruz'],
    hue: 50,
  },
]

/**
 * Devuelve la plantilla sugerida según el día/mes (contextual).
 * Ej: viernes/sábado sugiere "Paga la cena", lunes sugiere "Quién lava".
 */
export function suggestTemplateForNow(): Template {
  const day = new Date().getDay() // 0 = domingo
  if (day === 5 || day === 6 || day === 0) {
    return TEMPLATES.find(t => t.id === 'dinner')!
  }
  if (day === 1) {
    return TEMPLATES.find(t => t.id === 'dishes')!
  }
  return TEMPLATES[0]
}
