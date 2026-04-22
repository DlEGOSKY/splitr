import { useState, useEffect, useCallback, useRef } from 'react'
import { getAvatarColors, getInitials } from '../utils/avatar'
import { useSplitStore } from '../store/useSplitStore'

const CHAMBERS = 6

function cryptoShuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function cryptoRandom(max: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % max
}

interface Props {
  visible: boolean
  participants: Array<{ id: string; name: string; active: boolean }>
  onComplete: (winnerId: string) => void
}

type RoundResult = 'waiting' | 'pulling' | 'clic' | 'bang'

export default function RussianRouletteOverlay({ visible, participants, onComplete }: Props) {
  const [order, setOrder] = useState<Array<{ id: string; name: string }>>([])
  const [bulletPos, setBulletPos] = useState(0)
  const [currentTurn, setCurrentTurn] = useState(0)
  const [currentChamber, setCurrentChamber] = useState(0)
  const [roundResult, setRoundResult] = useState<RoundResult>('waiting')
  const [gameOver, setGameOver] = useState(false)
  const initRef = useRef(false)

  // Initialize game when overlay becomes visible
  useEffect(() => {
    if (!visible) {
      initRef.current = false
      return
    }
    if (initRef.current) return
    initRef.current = true

    const active = participants.filter(p => p.active)
    if (active.length < 2) return

    const shuffled = cryptoShuffle(active.map(p => ({ id: p.id, name: p.name })))
    setOrder(shuffled)
    setBulletPos(cryptoRandom(CHAMBERS))
    setCurrentTurn(0)
    setCurrentChamber(0)
    setRoundResult('waiting')
    setGameOver(false)
  }, [visible, participants])

  const pullTrigger = useCallback(() => {
    if (gameOver || roundResult === 'pulling') return

    setRoundResult('pulling')

    const prefs = useSplitStore.getState().prefs
    if (prefs.vibration && 'vibrate' in navigator) {
      navigator.vibrate([30])
    }

    setTimeout(() => {
      if (currentChamber === bulletPos) {
        // BANG!
        setRoundResult('bang')
        setGameOver(true)

        if (prefs.vibration && 'vibrate' in navigator) {
          navigator.vibrate([50, 30, 100, 30, 200])
        }

        const loser = order[currentTurn % order.length]
        setTimeout(() => {
          onComplete(loser.id)
        }, 2000)
      } else {
        // CLIC — safe
        setRoundResult('clic')

        if (prefs.vibration && 'vibrate' in navigator) {
          navigator.vibrate([30, 20, 30])
        }

        setTimeout(() => {
          setCurrentChamber(prev => prev + 1)
          setCurrentTurn(prev => prev + 1)
          setRoundResult('waiting')
        }, 1200)
      }
    }, 600)
  }, [gameOver, roundResult, currentChamber, bulletPos, currentTurn, order, onComplete])

  if (!visible || order.length === 0) return null

  const currentPlayer = order[currentTurn % order.length]
  const colors = getAvatarColors(currentPlayer.name)
  const remaining = CHAMBERS - currentChamber
  const odds = Math.round((1 / remaining) * 100)

  return (
    <div className="russian-overlay">
      <div className="russian-scene">
        {/* Turn label */}
        <div className="russian-turn-label">
          Turno {currentTurn + 1}
        </div>

        {/* Current player */}
        <div className={`russian-player-display ${roundResult === 'pulling' ? 'shaking' : ''}`}>
          <div
            className="russian-player-avatar"
            style={{
              background: colors.gradient,
              '--avatar-color': colors.color,
              '--avatar-glow': `${colors.color}66`,
            } as React.CSSProperties}
          >
            {getInitials(currentPlayer.name)}
          </div>
          <div
            className="russian-player-name"
            style={{
              color: colors.color,
              textShadow: `0 0 14px ${colors.color}88`,
            }}
          >
            {currentPlayer.name}
          </div>
        </div>

        {/* Odds */}
        <div className="russian-odds">
          {odds}% de BANG
        </div>

        {/* Chambers */}
        <div className="russian-chambers">
          {Array.from({ length: CHAMBERS }, (_, i) => {
            const spent = i < currentChamber
            const isBullet = gameOver && i === bulletPos
            return (
              <div
                key={i}
                className={`russian-chamber ${spent ? 'spent' : ''} ${isBullet ? 'bullet' : ''}`}
              >
                {isBullet && <div className="russian-chamber-bullet" />}
              </div>
            )
          })}
        </div>

        {/* Result feedback */}
        {roundResult === 'clic' && (
          <div className="russian-result-text russian-result-clic">
            CLIC
          </div>
        )}
        {roundResult === 'bang' && (
          <div className="russian-result-text russian-result-bang">
            BANG
          </div>
        )}

        {/* Trigger button */}
        {!gameOver && roundResult === 'waiting' && (
          <button
            className="btn btn-impact russian-trigger"
            onClick={pullTrigger}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="var(--color-bg, #000)"/></svg>
            Disparar
          </button>
        )}
      </div>
    </div>
  )
}
