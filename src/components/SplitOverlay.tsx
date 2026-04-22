import { useEffect, useState, useCallback } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import { playWinnerFanfare } from '../utils/audio'
import { getAvatarColorsByName, getInitials } from '../utils/avatar'
import { spawnConfetti } from '../utils/particles'
import type { Participant } from '../types'

interface Props {
  visible: boolean
  participants: Participant[]
  question: string
  onClose: () => void
  onRemix: () => void
}

function shuffleSecure<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default function SplitOverlay({ visible, participants, question, onClose, onRemix }: Props) {
  const [team1, setTeam1] = useState<Participant[]>([])
  const [team2, setTeam2] = useState<Participant[]>([])

  const doSplit = useCallback(() => {
    const active = participants.filter(p => p.active)
    if (active.length < 2) return
    const shuffled = shuffleSecure(active)
    const half = Math.ceil(shuffled.length / 2)
    setTeam1(shuffled.slice(0, half))
    setTeam2(shuffled.slice(half))
  }, [participants])

  useEffect(() => {
    if (!visible) { setTeam1([]); setTeam2([]); return }
    doSplit()
    const prefs = useSplitStore.getState().prefs
    if (prefs.sound) playWinnerFanfare()
    if (prefs.particles) {
      spawnConfetti()
      setTimeout(() => spawnConfetti(), 200)
    }
  }, [visible, doSplit])

  if (!visible || team1.length === 0) return null

  const renderTeam = (team: Participant[], label: string, accentColor: string, delay: number) => (
    <div 
      className="split-team-card"
      style={{
        '--team-accent': accentColor,
        animationDelay: `${delay}ms`,
      } as React.CSSProperties}
    >
      <div className="split-team-header">
        <span className="split-team-label">{label}</span>
        <span className="split-team-count">{team.length}</span>
      </div>
      <div className="split-team-members">
        {team.map((p, i) => {
          const c = getAvatarColorsByName(p.name)
          return (
            <div 
              key={p.id} 
              className="split-member"
              style={{ animationDelay: `${delay + 100 + i * 60}ms` }}
            >
              <div 
                className="split-member-avatar"
                style={{ background: c.gradient }}
              >
                {getInitials(p.name)}
              </div>
              <span className="split-member-name">{p.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="split-overlay" onClick={onClose} role="dialog" aria-label="Equipos formados">
      {/* Background glow */}
      <div className="split-glow split-glow-a" />
      <div className="split-glow split-glow-b" />

      <div className="split-header">
        <span className="split-title">¡EQUIPOS!</span>
        {question && <p className="split-question">"{question}"</p>}
      </div>

      <div className="split-teams" onClick={e => e.stopPropagation()}>
        {renderTeam(team1, 'EQUIPO A', 'var(--color-accent)', 0)}
        <div className="split-vs">VS</div>
        {renderTeam(team2, 'EQUIPO B', 'var(--color-impact)', 150)}
      </div>

      <div className="split-actions" onClick={e => e.stopPropagation()}>
        <button className="btn btn-accent" onClick={onClose}>Cerrar</button>
        <button className="btn btn-impact" onClick={() => { onClose(); setTimeout(onRemix, 300) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/></svg>
          Mezclar
        </button>
      </div>

      <style>{`
        .split-overlay {
          position: fixed; inset: 0; z-index: 9998;
          background: rgba(4,2,14,0.97);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 20px; gap: 20px;
          animation: overlayFadeIn 200ms ease both;
        }
        .split-glow {
          position: absolute; width: 200px; height: 200px;
          border-radius: 50%; filter: blur(80px); opacity: 0.3;
          pointer-events: none;
        }
        .split-glow-a { background: var(--color-accent); top: 10%; left: 10%; }
        .split-glow-b { background: var(--color-impact); bottom: 10%; right: 10%; }
        .split-header { text-align: center; z-index: 1; }
        .split-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 10vw, 2.5rem); letter-spacing: 0.15em;
          font-weight: 900;
          color: var(--color-text);
          text-shadow: 0 0 20px rgba(255,255,255,0.3), 0 0 60px rgba(255,255,255,0.1);
          animation: splitTitlePop 500ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .split-question {
          margin-top: 8px; font-size: 0.88rem;
          color: var(--color-text-dim); font-style: italic;
          opacity: 0.8;
        }
        .split-teams {
          display: flex; gap: 12px; width: 100%;
          max-width: 420px; align-items: stretch; z-index: 1;
        }
        .split-vs {
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 1.1rem;
          font-weight: 900; letter-spacing: 0.08em;
          color: var(--color-text-dim); flex-shrink: 0;
          text-shadow: 0 0 10px rgba(255,255,255,0.15);
        }
        .split-team-card {
          flex: 1;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid var(--team-accent);
          border-radius: 16px; padding: 14px;
          animation: teamSlideIn 400ms ease both;
          box-shadow: 0 0 20px color-mix(in srgb, var(--team-accent) 15%, transparent);
        }
        .split-team-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px; padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .split-team-label {
          font-family: var(--font-display); font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.12em; color: var(--team-accent);
        }
        .split-team-count {
          font-size: 0.7rem; font-weight: 600;
          color: var(--color-text-dim);
          background: rgba(255,255,255,0.06); padding: 2px 10px;
          border-radius: 10px;
        }
        .split-team-members { display: flex; flex-direction: column; gap: 8px; }
        .split-member {
          display: flex; align-items: center; gap: 10px;
          animation: memberFadeIn 300ms ease both;
        }
        .split-member-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 0.72rem;
          font-weight: 700;
          color: white; flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.08);
        }
        .split-member-name { font-size: 0.9rem; font-weight: 600; }
        .split-actions {
          display: flex; gap: 10px; z-index: 1;
          animation: actionsSlideUp 400ms ease 300ms both;
        }
        @keyframes splitTitlePop {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes teamSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes memberFadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes actionsSlideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
