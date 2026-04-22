import { useEffect, useState } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import { playWinnerFanfare } from '../utils/audio'

interface Props {
  visible: boolean
  onComplete: (result: 'cara' | 'cruz') => void
}

export default function CoinOverlay({ visible, onComplete }: Props) {
  const [result, setResult] = useState<'cara' | 'cruz' | null>(null)
  const [phase, setPhase] = useState<'flipping' | 'revealed'>('flipping')

  useEffect(() => {
    if (!visible) { setResult(null); setPhase('flipping'); return }

    const r: 'cara' | 'cruz' = Math.random() < 0.5 ? 'cara' : 'cruz'
    setResult(r)

    const prefs = useSplitStore.getState().prefs
    if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([30, 40, 30, 40, 80])

    const revealTimer = setTimeout(() => {
      setPhase('revealed')
      if (prefs.sound) playWinnerFanfare()
    }, 1600)
    const doneTimer = setTimeout(() => onComplete(r), 2800)

    return () => { clearTimeout(revealTimer); clearTimeout(doneTimer) }
  }, [visible, onComplete])

  if (!visible || !result) return null

  return (
    <div className="coin-overlay">
      {/* Coin container with 3D perspective */}
      <div className="coin-scene">
        <div className={`coin ${phase === 'revealed' ? 'landed' : 'spinning'}`}>
          {/* Cara (heads) */}
          <div className="coin-face coin-heads">
            <svg viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="48" fill="url(#goldGrad)" stroke="#B8860B" strokeWidth="2"/>
              <circle cx="50" cy="42" r="14" fill="#B8860B"/>
              <path d="M30 75 Q50 55 70 75" stroke="#B8860B" strokeWidth="8" strokeLinecap="round" fill="none"/>
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE55C"/>
                  <stop offset="50%" stopColor="#FFD700"/>
                  <stop offset="100%" stopColor="#DAA520"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          {/* Cruz (tails) */}
          <div className="coin-face coin-tails">
            <svg viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="48" fill="url(#silverGrad)" stroke="#708090" strokeWidth="2"/>
              <path d="M50 20 V80 M30 50 H70" stroke="#4A5568" strokeWidth="6" strokeLinecap="round"/>
              <defs>
                <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8E8E8"/>
                  <stop offset="50%" stopColor="#C0C0C0"/>
                  <stop offset="100%" stopColor="#A0A0A0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Result label */}
      {phase === 'revealed' && (
        <div className="coin-result">
          <span className="coin-result-label">
            {result === 'cara' ? '¡CARA!' : '¡CRUZ!'}
          </span>
        </div>
      )}

      <style>{`
        .coin-overlay {
          position: fixed; inset: 0; z-index: 9998;
          background: radial-gradient(ellipse at center, rgba(20,15,35,0.95) 0%, rgba(4,2,14,0.98) 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          animation: overlayFadeIn 200ms ease both;
        }
        .coin-scene {
          perspective: 800px;
          width: 150px; height: 150px;
          filter: drop-shadow(0 0 30px ${result === 'cara' ? 'rgba(255,215,0,0.3)' : 'rgba(192,192,192,0.3)'});
        }
        .coin {
          width: 100%; height: 100%;
          position: relative;
          transform-style: preserve-3d;
        }
        .coin.spinning {
          animation: coinSpin 1.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }
        .coin.landed {
          transform: ${result === 'cara' ? 'rotateY(0deg)' : 'rotateY(180deg)'};
        }
        .coin-face {
          position: absolute; inset: 0;
          backface-visibility: hidden;
          border-radius: 50%;
          box-shadow: 
            0 4px 24px rgba(0,0,0,0.5),
            0 0 40px ${result === 'cara' ? 'rgba(255,215,0,0.15)' : 'rgba(192,192,192,0.15)'},
            inset 0 2px 10px rgba(255,255,255,0.3);
        }
        .coin-face svg { width: 100%; height: 100%; }
        .coin-heads { transform: rotateY(0deg); }
        .coin-tails { transform: rotateY(180deg); }
        .coin-result {
          margin-top: 32px;
          animation: resultPop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .coin-result-label {
          font-family: var(--font-display);
          font-size: clamp(2rem, 10vw, 3rem);
          font-weight: 900;
          letter-spacing: 0.12em;
          color: ${result === 'cara' ? '#FFD700' : '#C0C0C0'};
          text-shadow: 
            0 0 20px ${result === 'cara' ? 'rgba(255,215,0,0.7)' : 'rgba(192,192,192,0.7)'},
            0 0 60px ${result === 'cara' ? 'rgba(255,215,0,0.3)' : 'rgba(192,192,192,0.3)'};
        }
        @keyframes coinSpin {
          0% { transform: rotateY(0deg) scale(0.6); }
          20% { transform: rotateY(720deg) scale(1.1); }
          60% { transform: rotateY(1800deg) scale(1); }
          100% { transform: rotateY(${result === 'cara' ? '2160' : '2340'}deg) scale(1); }
        }
        @keyframes resultPop {
          from { opacity: 0; transform: scale(0.5) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
