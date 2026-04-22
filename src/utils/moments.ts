/**
 * Sistema de "moments" — activa efectos visuales contextuales según:
 *  - Fecha del calendario (temporadas: Halloween, Navidad, San Valentín...)
 *  - Eventos del sorteo (easter eggs: 3 seguidos, 13 personas + ruleta rusa...)
 *  - Milestones (100, 500, 1000 sorteos totales)
 *
 * Cada moment puede activar:
 *  - Una clase CSS en <body> (p.ej. `.moment-halloween`)
 *  - Una línea de texto flash para narrator/toast
 *  - Un emoji/símbolo de partículas efímeras
 *
 * Filosofía: la app "sabe" en qué momento del año/partida estás, sin ser invasiva.
 */
import type { HistoryEntry } from '../types'

export type MomentId =
  | 'halloween'
  | 'christmas'
  | 'newyear'
  | 'valentines'
  | 'summer'
  | 'streak-3'
  | 'streak-5'
  | 'milestone-100'
  | 'milestone-500'
  | 'milestone-1000'
  | 'night-owl'

export interface Moment {
  id: MomentId
  /** Clase CSS que se añade a <body> mientras está activo */
  bodyClass: string
  /** Mensaje de celebración opcional para toast/narrator */
  flash?: string
  /** Prioridad — si hay varios activos, el mayor gana */
  priority: number
}

/** Devuelve los moments calendario/temporales actualmente activos */
export function getSeasonalMoments(now: Date = new Date()): Moment[] {
  const month = now.getMonth() // 0-11
  const day = now.getDate()
  const hour = now.getHours()
  const active: Moment[] = []

  // Halloween: 25 oct – 1 nov
  if ((month === 9 && day >= 25) || (month === 10 && day === 1)) {
    active.push({
      id: 'halloween',
      bodyClass: 'moment-halloween',
      flash: 'Noche de brujas',
      priority: 60,
    })
  }

  // Navidad: 20-26 dic
  if (month === 11 && day >= 20 && day <= 26) {
    active.push({
      id: 'christmas',
      bodyClass: 'moment-christmas',
      flash: 'Época navideña',
      priority: 70,
    })
  }

  // Año Nuevo: 30 dic – 2 ene
  if ((month === 11 && day >= 30) || (month === 0 && day <= 2)) {
    active.push({
      id: 'newyear',
      bodyClass: 'moment-newyear',
      flash: 'Año nuevo',
      priority: 80,
    })
  }

  // San Valentín: 13-15 feb
  if (month === 1 && day >= 13 && day <= 15) {
    active.push({
      id: 'valentines',
      bodyClass: 'moment-valentines',
      flash: 'Día del amor',
      priority: 50,
    })
  }

  // Noche de búho (00:00 – 05:00)
  if (hour >= 0 && hour < 5) {
    active.push({
      id: 'night-owl',
      bodyClass: 'moment-night-owl',
      priority: 20,
    })
  }

  return active.sort((a, b) => b.priority - a.priority)
}

/** Evento que puede disparar un easter egg momentáneo post-sorteo */
export function detectPostSorteoMoment(
  sortedDescHistory: HistoryEntry[],
  winnerName: string
): Moment | null {
  if (!sortedDescHistory || sortedDescHistory.length === 0) return null

  // Racha del mismo ganador
  let streak = 1
  for (let i = 0; i < sortedDescHistory.length; i++) {
    if (sortedDescHistory[i].winnerName === winnerName) streak++
    else break
  }

  if (streak >= 5) {
    return {
      id: 'streak-5',
      bodyClass: 'moment-streak-5',
      flash: `${winnerName} lleva ${streak} seguidas. El destino apuntó.`,
      priority: 100,
    }
  }
  if (streak >= 3) {
    return {
      id: 'streak-3',
      bodyClass: 'moment-streak-3',
      flash: `${winnerName}, ${streak} veces seguidas. ¿Coincidencia?`,
      priority: 95,
    }
  }

  // Milestones totales
  const total = sortedDescHistory.length + 1 // +1 incluye el que acaba de ocurrir
  if (total === 100) {
    return {
      id: 'milestone-100',
      bodyClass: 'moment-milestone',
      flash: '¡100 sorteos! Eres oficialmente un pro',
      priority: 90,
    }
  }
  if (total === 500) {
    return {
      id: 'milestone-500',
      bodyClass: 'moment-milestone',
      flash: '500 sorteos. Leyenda en construcción',
      priority: 95,
    }
  }
  if (total === 1000) {
    return {
      id: 'milestone-1000',
      bodyClass: 'moment-milestone',
      flash: '1000 SORTEOS. Eres inmortal',
      priority: 100,
    }
  }

  return null
}

/** Aplica moments al <body> — idempotente, limpia los anteriores */
export function applyBodyMoments(moments: Moment[]): void {
  if (typeof document === 'undefined') return
  const body = document.body
  // Limpiar las existentes (todas las clases `moment-*`)
  const toRemove: string[] = []
  body.classList.forEach((cls) => {
    if (cls.startsWith('moment-')) toRemove.push(cls)
  })
  toRemove.forEach((cls) => body.classList.remove(cls))
  // Añadir las nuevas
  moments.forEach((m) => body.classList.add(m.bodyClass))
}

/** Dispara una clase efímera (moment "flash") por N ms, luego la quita */
export function triggerEphemeralMoment(moment: Moment, durationMs = 3500): void {
  if (typeof document === 'undefined') return
  const body = document.body
  body.classList.add(moment.bodyClass)
  setTimeout(() => body.classList.remove(moment.bodyClass), durationMs)
}
