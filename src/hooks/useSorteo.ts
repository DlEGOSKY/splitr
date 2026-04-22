import { useCallback, useRef } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import { selectOne, selectOneWithRevenge, selectMultiple, selectOrder, buildAnimationSequence } from '../utils/selector'
import { playScanTick, playWinnerFanfare } from '../utils/audio'
import { spawnConfetti } from '../utils/particles'
import { hapticRamp, hapticSuccess } from '../utils/haptics'
import { narrateWinner } from '../utils/narrator'
import { detectPostSorteoMoment, triggerEphemeralMoment } from '../utils/moments'
import type { AnimationStep } from '../types'

export interface SorteoResult {
  winnerId: string
  winnerName: string
  sequence: AnimationStep[]
  /** For team mode: names of the other members of the winning team */
  teammates?: string[]
}

export function useSorteo() {
  const timersRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const runSorteo = useCallback((
    onFlash: (id: string) => void,
    onReveal: (result: SorteoResult) => void,
    preSelectedWinner?: string | null
  ) => {
    const { mode, getActiveParticipants, question, setPhase, setWinner, recordChosen, recordHistory, lastWinnerId } = useSplitStore.getState()
    const active = getActiveParticipants()

    if (active.length < 2) return

    // Usar ganador preseleccionado si está disponible, sino seleccionar según modo
    let winnerId: string
    let teammateIds: string[] | undefined

    if (preSelectedWinner && active.find(p => p.id === preSelectedWinner)) {
      winnerId = preSelectedWinner
    } else {
      switch (mode) {
      case 'normal':
      case 'coin':
      case 'dice':
      case 'bomb':
      case 'voice':
      case 'russian':
        winnerId = selectOne(active)
        break

      case 'revenge': {
        winnerId = selectOneWithRevenge(active, lastWinnerId)
        break
      }

      case 'elimination':
        winnerId = selectOne(active)
        break

      case 'team':
      case 'split': {
        // Para equipos: seleccionar la mitad como equipo ganador
        const half = Math.ceil(active.length / 2)
        const team = selectMultiple(active, half)
        winnerId = team[0] // Representante del equipo
        // Capturar el resto del equipo para mostrarlos juntos
        teammateIds = team.slice(1)
        break
      }

      case 'order': {
        const order = selectOrder(active)
        winnerId = order[order.length - 1] // El último en el orden = el elegido
        break
      }

      case 'duel': {
        const { duelIds } = useSplitStore.getState()
        if (duelIds.length === 2) {
          const duelParticipants = active.filter(p => duelIds.includes(p.id))
          winnerId = selectOne(duelParticipants.length >= 2 ? duelParticipants : active)
        } else {
          winnerId = selectOne(active)
        }
        break
      }

      case 'tournament':
      default:
        winnerId = selectOne(active)
        break
      }
    }

    const winner = active.find(p => p.id === winnerId)
    if (!winner) return

    // Construir secuencia de animación
    const speedMult = (useSplitStore.getState().prefs.speed || 100) / 100
    const duration = Math.round(3500 / speedMult)
    const sequence = buildAnimationSequence(active, winnerId, duration)

    // Fase: spinning
    setPhase('spinning')

    // Ejecutar barrido de avatares
    sequence.forEach((step) => {
      const t = window.setTimeout(() => {
        if (step.isFinal) {
          // Reveal
          setPhase('result')
          setWinner(winnerId)
          recordChosen(winnerId)
          recordHistory(winnerId, winner.name, question, mode)
          playWinnerFanfare()

          // Confetti on win
          const prefs2 = useSplitStore.getState().prefs
          if (prefs2.particles) {
            spawnConfetti()
          }

          // Elimination mode: auto-exclude winner for next round
          if (mode === 'elimination') {
            useSplitStore.getState().toggleParticipant(winnerId)
          }

          // Haptic feedback on reveal
          const prefs = useSplitStore.getState().prefs
          if (prefs.vibration) {
            hapticSuccess()
          }

          // Voice narration (SpeechSynthesis) — slight delay so it
          // doesn't collide with fanfare peak
          if (prefs.narrator) {
            setTimeout(() => {
              narrateWinner(winner.name, { mode })
            }, 450)
          }

          // Post-sorteo easter egg: detect streak/milestone and trigger
          // an ephemeral body class + flash message (toast opcional)
          const history = useSplitStore.getState().sessionHistory
          const moment = detectPostSorteoMoment(history, winner.name)
          if (moment) {
            setTimeout(() => {
              triggerEphemeralMoment(moment, moment.id === 'streak-5' ? 3000 : 2000)
              if (moment.flash) {
                // Lazy import Toast to avoid circular deps
                import('../components/Toast').then(({ showToast }) => {
                  showToast(moment.flash!, 'success')
                })
              }
            }, 600)
          }

          const teammates = teammateIds
            ? teammateIds
                .map(id => active.find(p => p.id === id)?.name)
                .filter((n): n is string => Boolean(n))
            : undefined
          onReveal({ winnerId, winnerName: winner.name, sequence, teammates })
        } else {
          playScanTick()
          // Haptic ramp during spin — intensity increases toward end
          const prefs = useSplitStore.getState().prefs
          if (prefs.vibration) {
            const progress = step.delay / duration
            hapticRamp(progress)
          }
          onFlash(step.id)
        }
      }, step.delay)
      timersRef.current.push(t)
    })
  }, [])

  const cancelSorteo = useCallback(() => {
    clearTimers()
    useSplitStore.getState().setPhase('idle')
    useSplitStore.getState().setWinner(null)
  }, [clearTimers])

  return { runSorteo, cancelSorteo }
}
