import React, { useState, useRef, useCallback } from 'react'
import { AnimatePresence, Reorder } from 'framer-motion'
import { useSplitStore } from '../store/useSplitStore'
import { getAvatarColors, getInitials } from '../utils/avatar'
import { calculateProbabilities } from '../utils/selector'

interface Props {
  flashingId?: string | null
  winnerId?: string | null
}

function ParticipantGrid({ flashingId, winnerId }: Props) {
  const participants = useSplitStore((s) => s.participants)
  const toggleParticipant = useSplitStore((s) => s.toggleParticipant)
  const removeParticipant = useSplitStore((s) => s.removeParticipant)
  const renameParticipant = useSplitStore((s) => s.renameParticipant)
  const reorderParticipants = useSplitStore((s) => s.reorderParticipants)
  const setLuck = useSplitStore((s) => s.setLuck)
  const phase = useSplitStore((s) => s.phase)
  const mode = useSplitStore((s) => s.mode)
  const duelIds = useSplitStore((s) => s.duelIds)
  const setDuelIds = useSplitStore((s) => s.setDuelIds)
  const [luckPopupId, setLuckPopupId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const longPressTimer = useRef<number | null>(null)

  const startEditing = useCallback((id: string, currentName: string) => {
    setEditingId(id)
    setEditValue(currentName)
  }, [])

  const finishEditing = useCallback(() => {
    if (editingId && editValue.trim()) {
      renameParticipant(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }, [editingId, editValue, renameParticipant])

  const handlePointerDown = useCallback((id: string) => {
    longPressTimer.current = window.setTimeout(() => {
      setLuckPopupId(id)
    }, 500)
  }, [])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  if (participants.length === 0) return null

  const isDense = participants.length >= 9
  const isSpinning = phase === 'spinning' || phase === 'revealing'
  const isDuel = mode === 'duel'
  const gridClass = `participants-grid${isDense ? ' dense' : ''}${isSpinning ? ' shuffling' : ''}`

  const handleAvatarClick = useCallback((id: string) => {
    if (isSpinning || luckPopupId) return
    if (isDuel && phase === 'idle') {
      if (duelIds.includes(id)) {
        setDuelIds(duelIds.filter(d => d !== id))
      } else if (duelIds.length < 2) {
        setDuelIds([...duelIds, id])
      }
      return
    }
    if (phase === 'idle') {
      setLuckPopupId(id)
      return
    }
  }, [isSpinning, luckPopupId, isDuel, phase, duelIds, setDuelIds])

  return (
    <>
      {/* Scanning line effect */}
      {isSpinning && (
        <div className="grid-scan-line" />
      )}
      <Reorder.Group
        axis="x"
        values={participants}
        onReorder={reorderParticipants}
        className={gridClass}
        role="list"
        aria-label="Participantes"
        aria-live="polite"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', justifyContent: 'center' }}
      >
        {/* Skeleton placeholders when empty */}
        {participants.length === 0 && (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={`skeleton-${i}`} className="avatar-wrap skeleton" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="avatar skeleton-avatar" />
                <span className="avatar-name skeleton-text" />
              </div>
            ))}
          </>
        )}
        <AnimatePresence mode="popLayout">
          {participants.map((p, index) => {
            const colors = getAvatarColors(p.name, index, participants.length)

            const classes = ['avatar-wrap']
            if (!p.active) classes.push('excluded')
            if (isSpinning && flashingId === p.id) {
              classes.push('flashing')
            }
            if (winnerId === p.id && phase === 'result') {
              classes.push('winner')
            }
            if (winnerId && winnerId !== p.id && phase === 'result') classes.push('loser')
            if (isDuel && duelIds.includes(p.id)) classes.push('duel-selected')
            if (isDuel && duelIds.length > 0 && !duelIds.includes(p.id)) classes.push('duel-idle')

            return (
              <Reorder.Item
                key={p.id}
                value={p}
                dragListener={phase === 'idle' && !luckPopupId && !editingId}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 25, mass: 0.6 }}
                data-participant-id={p.id}
                className={classes.join(' ')}
                role="listitem"
                onClick={() => handleAvatarClick(p.id)}
                onPointerDown={() => !isSpinning && handlePointerDown(p.id)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
                style={{ animationDelay: `${index * 40}ms` } as React.CSSProperties}
              >
                <div
                  className="avatar"
                  style={{
                    '--avatar-gradient': colors.gradient,
                    '--avatar-color': colors.color,
                    '--avatar-glow': `${colors.color}66`,
                    background: colors.gradient,
                  } as React.CSSProperties}
                >
                  {getInitials(p.name)}
                </div>
                {editingId === p.id ? (
                  <input
                    type="text"
                    className="avatar-name-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishEditing()
                      if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    maxLength={20}
                  />
                ) : (
                  <span
                    className="avatar-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      if (!isSpinning && phase === 'idle') startEditing(p.id, p.name)
                    }}
                  >
                    {p.name}
                  </span>
                )}

                {/* Luck indicator */}
                {p.luck !== 3 && !isSpinning && (
                  <div className={`luck-indicator ${p.luck < 3 ? 'luck-low' : 'luck-high'}`}>
                    {p.luck < 3 ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                )}

                {/* Remove button */}
                {!isSpinning && phase === 'idle' && (
                  <button
                    className="avatar-remove"
                    onClick={(e) => { e.stopPropagation(); removeParticipant(p.id) }}
                    aria-label={`Eliminar ${p.name}`}
                  >
                    ✕
                  </button>
                )}
              </Reorder.Item>
            )
          })}
        </AnimatePresence>
      </Reorder.Group>

      {/* Participant popup */}
      {luckPopupId && (() => {
        const p = participants.find(x => x.id === luckPopupId)
        if (!p) return null
        const probs = calculateProbabilities(participants.filter(pp => pp.active))
        const myProb = probs.find(pr => pr.id === p.id)
        const luckLabels = ['', 'Muy alta', 'Alta', 'Normal', 'Baja', 'Muy baja']
        const luckIcons = [
          null,
          <svg key="1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
          <svg key="2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 1 4 1 4-1 4-1"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
          <svg key="3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
          <svg key="4" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
          <svg key="5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>,
        ]

        return (
          <div className="popup-backdrop" onClick={() => setLuckPopupId(null)}>
            <div className="popup-card" onClick={(e) => e.stopPropagation()}>
              {/* Title */}
              <div className="popup-title">Probabilidad de ser elegido</div>

              {/* Luck buttons */}
              <div className="popup-luck-row">
                {[1, 2, 3, 4, 5].map(l => (
                  <button
                    key={l}
                    className={`popup-luck-btn ${p.luck === l ? 'active' : ''}`}
                    onClick={() => setLuck(p.id, l)}
                  >
                    {luckIcons[l]}
                  </button>
                ))}
              </div>

              {/* Label + percentage */}
              <div className="popup-luck-info">
                {luckLabels[p.luck]} · {myProb?.percentage ?? '—'}
              </div>

              {/* Divider */}
              <div className="popup-divider" />

              {/* Pause */}
              <button
                className="popup-action"
                onClick={() => { toggleParticipant(p.id); setLuckPopupId(null) }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                <div>
                  <strong>{p.active ? 'Pausar' : 'Reactivar'}</strong>
                  <span>{p.active ? 'Salta esta ronda' : 'Vuelve a participar'}</span>
                </div>
              </button>

              {/* Delete */}
              <button
                className="popup-action popup-action-danger"
                onClick={() => { removeParticipant(p.id); setLuckPopupId(null) }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <div>
                  <strong>Eliminar</strong>
                  <span>Borrarlo del grupo</span>
                </div>
              </button>
            </div>
          </div>
        )
      })()}
    </>
  )
}

export default React.memo(ParticipantGrid)
