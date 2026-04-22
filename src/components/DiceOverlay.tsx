import { useEffect, useState } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import { playWinnerFanfare } from '../utils/audio'
import { getAvatarColors, getInitials } from '../utils/avatar'
import type { Participant } from '../types'

interface Props {
  visible: boolean
  participants: Participant[]
  onComplete: (winnerId: string, diceResult: number) => void
}

const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
}

function DiceFace({ value }: { value: number }) {
  const dots = DICE_DOTS[value] || []

  return (
    <svg viewBox="0 0 100 100" className="dice-svg">
      <rect x="2" y="2" width="96" height="96" rx="12" fill="url(#diceGrad)" stroke="#1a1a2e" strokeWidth="2"/>
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="10" fill="#1a1a2e"/>
      ))}
      <defs>
        <linearGradient id="diceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#e0e0e0"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function DiceOverlay({ visible, participants, onComplete }: Props) {
  const [result, setResult] = useState(0)
  const [phase, setPhase] = useState<'rolling' | 'number' | 'winner'>('rolling')

  useEffect(() => {
    if (!visible) { setResult(0); setPhase('rolling'); return }

    const active = participants.filter(p => p.active)
    const r = Math.floor(Math.random() * 6) + 1
    setResult(r)

    const prefs = useSplitStore.getState().prefs
    if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([20, 30, 20, 30, 60])

    const numberTimer = setTimeout(() => {
      setPhase('number')
      if (prefs.sound) playWinnerFanfare()
    }, 1200)
    const winnerTimer = setTimeout(() => setPhase('winner'), 1800)
    const doneTimer = setTimeout(() => {
      if (active.length > 0) {
        const idx = (r - 1) % active.length
        onComplete(active[idx].id, r)
      }
    }, 3200)

    return () => {
      clearTimeout(numberTimer)
      clearTimeout(winnerTimer)
      clearTimeout(doneTimer)
    }
  }, [visible, participants, onComplete])

  if (!visible || result === 0) return null

  const active = participants.filter(p => p.active)
  const winnerIdx = (result - 1) % active.length
  const winner = active[winnerIdx]
  const winnerColors = winner ? getAvatarColors(winner.name) : null

  return (
    <div className="dice-overlay">
      <div className={`dice-container ${phase !== 'rolling' ? 'landed' : 'tumbling'}`}>
        <DiceFace value={result} />
      </div>

      {phase !== 'rolling' && (
        <div className="dice-result-number">
          <span>{result}</span>
        </div>
      )}

      {phase === 'winner' && winner && (
        <div className="dice-winner">
          <div 
            className="dice-winner-avatar"
            style={{ background: winnerColors?.gradient }}
          >
            {getInitials(winner.name)}
          </div>
          <span className="dice-winner-name">{winner.name}</span>
        </div>
      )}

      <style>{`
        .dice-overlay {
          position: fixed; inset: 0; z-index: 9998;
          background: radial-gradient(ellipse at center, rgba(20,15,35,0.95) 0%, rgba(4,2,14,0.98) 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 24px;
          animation: overlayFadeIn 200ms ease both;
        }
        .dice-container {
          width: 110px; height: 110px;
          filter: drop-shadow(0 8px 30px rgba(0,0,0,0.6)) drop-shadow(0 0 20px rgba(255,255,255,0.05));
        }
        .dice-container.tumbling {
          animation: diceTumble 1.1s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }
        .dice-container.landed {
          animation: diceBounce 300ms ease both;
        }
        .dice-svg { width: 100%; height: 100%; }
        .dice-result-number {
          animation: numberPop 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .dice-result-number span {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 12vw, 3.5rem);
          font-weight: 900;
          color: var(--color-accent);
          text-shadow: 0 0 20px rgba(0,245,255,0.7), 0 0 60px rgba(0,245,255,0.3);
        }
        .dice-winner {
          display: flex; flex-direction: column;
          align-items: center; gap: 14px;
          animation: winnerSlide 400ms ease both;
        }
        .dice-winner-avatar {
          width: 68px; height: 68px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1.3rem;
          color: white;
          box-shadow: 0 0 0 3px rgba(0,245,255,0.3), 0 0 24px rgba(0,245,255,0.4);
        }
        .dice-winner-name {
          font-family: var(--font-display);
          font-size: 1.4rem; font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--color-text);
          text-shadow: 0 0 12px rgba(255,255,255,0.1);
        }
        @keyframes diceTumble {
          0% { transform: rotate3d(1,1,0, 0deg) scale(0.4); opacity: 0.5; }
          30% { transform: rotate3d(1,1,0, 360deg) scale(1.15); opacity: 1; }
          60% { transform: rotate3d(1,0,1, 540deg) scale(0.95); }
          100% { transform: rotate3d(0,0,0, 720deg) scale(1); }
        }
        @keyframes diceBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes numberPop {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes winnerSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
