/**
 * Stats Insights — analiza sessionHistory y genera frases contextuales
 * tipo "Spotify Wrapped" para mostrar en la pantalla de estadísticas.
 *
 * Filosofía: la app parece "pensar en ti" sin ML. Puro análisis determinista
 * sobre los datos locales del usuario.
 */
import type { HistoryEntry, Mode } from '../types'

export type InsightKind =
  | 'streak'            // Alguien ganando N veces seguidas
  | 'favorite-mode'     // Modo más usado
  | 'peak-day'          // Día de la semana más activo
  | 'peak-hour'         // Hora del día más activa
  | 'busy-week'         // Semana con muchos sorteos
  | 'loyal-loser'       // Alguien que ha "perdido" mucho
  | 'tied-rivals'       // Dos personas que se sortean entre sí seguido
  | 'milestone'         // Llegaste a X sorteos
  | 'fresh-start'       // Empezaste a usar la app hace poco
  | 'comeback'          // Volviste tras inactividad

export interface Insight {
  kind: InsightKind
  title: string
  detail: string
  /** Prioridad para ordenar (mayor = más relevante) */
  weight: number
  /** Icono SVG path opcional */
  iconPath?: string
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const MODE_LABELS: Record<Mode, string> = {
  normal: 'Normal',
  elimination: 'Eliminación',
  team: 'Equipo',
  order: 'Orden',
  revenge: 'Venganza',
  duel: 'Duelo',
  split: 'Dividir',
  russian: 'Ruleta Rusa',
  tournament: 'Torneo',
  coin: 'Cara o Cruz',
  dice: 'Dado',
  bomb: 'Bomba',
  voice: 'Voz',
}

/** Analiza el historial y devuelve insights ordenados por relevancia */
export function analyzeHistory(history: HistoryEntry[]): Insight[] {
  if (!history || history.length === 0) return []
  const insights: Insight[] = []

  const now = Date.now()
  const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp)

  // ── 1. Milestone (cantidad total) ───────────────────────────────────────
  const total = history.length
  const milestones = [10, 25, 50, 100, 250, 500, 1000]
  const reachedMilestone = milestones.reverse().find(m => total >= m)
  if (reachedMilestone) {
    insights.push({
      kind: 'milestone',
      title: `${reachedMilestone}+ sorteos`,
      detail: total >= 1000
        ? 'Eres una leyenda del sorteo'
        : total >= 100
        ? 'Ya eres oficialmente un pro'
        : 'Vas tomando ritmo',
      weight: total >= 100 ? 90 : 60,
      iconPath: 'M12 2l2.39 7.36H22l-6.19 4.5 2.36 7.36L12 16.73l-6.17 4.49 2.36-7.36L2 9.36h7.61L12 2z',
    })
  }

  // ── 2. Racha de ganador consecutivo ─────────────────────────────────────
  const streak = findStreak(sorted)
  if (streak && streak.count >= 3) {
    insights.push({
      kind: 'streak',
      title: `${streak.name} lleva ${streak.count} seguidas`,
      detail: streak.count >= 5 ? '¿Conspiración del destino?' : 'La suerte le tiene cariño',
      weight: 100,
      iconPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    })
  }

  // ── 3. Modo favorito ────────────────────────────────────────────────────
  const modeCount = new Map<Mode, number>()
  history.forEach(h => modeCount.set(h.mode, (modeCount.get(h.mode) || 0) + 1))
  const topMode = [...modeCount.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topMode && topMode[1] >= 3 && total >= 5) {
    const pct = Math.round((topMode[1] / total) * 100)
    insights.push({
      kind: 'favorite-mode',
      title: `Modo favorito: ${MODE_LABELS[topMode[0]]}`,
      detail: `${pct}% de tus sorteos (${topMode[1]} de ${total})`,
      weight: 70,
      iconPath: 'M9 11H5a2 2 0 00-2 2v7a2 2 0 002 2h4a2 2 0 002-2v-7a2 2 0 00-2-2zM19 3h-4a2 2 0 00-2 2v14a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2z',
    })
  }

  // ── 4. Día de la semana más activo ─────────────────────────────────────
  const dayCount = new Array(7).fill(0)
  history.forEach(h => {
    dayCount[new Date(h.timestamp).getDay()]++
  })
  const maxDayIdx = dayCount.indexOf(Math.max(...dayCount))
  const maxDayVal = dayCount[maxDayIdx]
  if (maxDayVal >= 3 && total >= 7) {
    const pct = Math.round((maxDayVal / total) * 100)
    insights.push({
      kind: 'peak-day',
      title: `Sorteas más los ${DAY_NAMES[maxDayIdx]}`,
      detail: `${pct}% de tus sorteos caen en ${DAY_NAMES[maxDayIdx]}`,
      weight: 50,
      iconPath: 'M21 10H3M16 2v4M8 2v4M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z',
    })
  }

  // ── 5. Hora pico ────────────────────────────────────────────────────────
  const hourCount = new Array(24).fill(0)
  history.forEach(h => hourCount[new Date(h.timestamp).getHours()]++)
  const maxHourIdx = hourCount.indexOf(Math.max(...hourCount))
  if (hourCount[maxHourIdx] >= 4 && total >= 8) {
    const timeOfDay = getTimeOfDay(maxHourIdx)
    insights.push({
      kind: 'peak-hour',
      title: `Pico: ${formatHourRange(maxHourIdx)}`,
      detail: `Tu momento ${timeOfDay} favorito`,
      weight: 40,
      iconPath: 'M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zM12 6v6l4 2',
    })
  }

  // ── 6. Ganador recurrente ("loyal loser" si contexto es "quién paga") ──
  const winnerCount = new Map<string, number>()
  history.forEach(h => winnerCount.set(h.winnerName, (winnerCount.get(h.winnerName) || 0) + 1))
  const topWinner = [...winnerCount.entries()]
    .filter(([, c]) => c >= 4)
    .sort((a, b) => b[1] - a[1])[0]
  if (topWinner && total >= 8) {
    insights.push({
      kind: 'loyal-loser',
      title: `${topWinner[0]} sale mucho`,
      detail: `Elegido ${topWinner[1]} veces. ¿Mala suerte o destino?`,
      weight: 65,
      iconPath: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
    })
  }

  // ── 7. Semana ocupada ──────────────────────────────────────────────────
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const thisWeek = history.filter(h => h.timestamp >= weekAgo).length
  if (thisWeek >= 10) {
    insights.push({
      kind: 'busy-week',
      title: `${thisWeek} sorteos esta semana`,
      detail: 'Semana ocupada — Splitr ha estado al mando',
      weight: 75,
      iconPath: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
    })
  }

  // ── 8. Comeback (volviste tras >14 días de pausa) ──────────────────────
  if (sorted.length >= 2) {
    const latest = sorted[0].timestamp
    const previous = sorted[1].timestamp
    const gap = latest - previous
    const twoWeeks = 14 * 24 * 60 * 60 * 1000
    if (gap >= twoWeeks && now - latest < 2 * 24 * 60 * 60 * 1000) {
      const days = Math.round(gap / (24 * 60 * 60 * 1000))
      insights.push({
        kind: 'comeback',
        title: '¡Volviste!',
        detail: `Regresaste tras ${days} días de pausa`,
        weight: 85,
        iconPath: 'M21 12a9 9 0 11-6.219-8.56M3 12l3 3 5-5',
      })
    }
  }

  // ── 9. Fresh start (primera semana usando la app) ──────────────────────
  if (sorted.length >= 3) {
    const firstUsed = sorted[sorted.length - 1].timestamp
    const daysUsing = Math.floor((now - firstUsed) / (24 * 60 * 60 * 1000))
    if (daysUsing <= 7) {
      insights.push({
        kind: 'fresh-start',
        title: `Empezaste hace ${daysUsing === 0 ? 'hoy' : `${daysUsing}d`}`,
        detail: 'Bienvenido al universo Splitr',
        weight: 45,
        iconPath: 'M12 2v6M12 22v-4M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-4M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24',
      })
    }
  }

  // Ordenar por weight descendente, máximo 3 insights visibles
  return insights.sort((a, b) => b.weight - a.weight).slice(0, 3)
}

/** Encuentra la racha máxima consecutiva del historial (ordenado desc por time) */
function findStreak(sortedDesc: HistoryEntry[]): { name: string; count: number } | null {
  if (sortedDesc.length < 2) return null
  let currentName = sortedDesc[0].winnerName
  let currentCount = 1
  let bestName = currentName
  let bestCount = currentCount
  for (let i = 1; i < sortedDesc.length; i++) {
    if (sortedDesc[i].winnerName === currentName) {
      currentCount++
      if (currentCount > bestCount) {
        bestCount = currentCount
        bestName = currentName
      }
    } else {
      currentName = sortedDesc[i].winnerName
      currentCount = 1
    }
  }
  return bestCount >= 2 ? { name: bestName, count: bestCount } : null
}

function formatHourRange(h: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:00 – ${pad((h + 1) % 24)}:00`
}

function getTimeOfDay(h: number): string {
  if (h >= 5 && h < 12) return 'matutino'
  if (h >= 12 && h < 18) return 'vespertino'
  if (h >= 18 && h < 22) return 'nocturno'
  return 'de madrugada'
}
