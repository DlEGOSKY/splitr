import { useState } from 'react'
import { getAvatarColorsByName, getInitials } from '../utils/avatar'
import { shareResult } from '../utils/shareResult'
import { shareResultImage } from '../utils/resultImage'
import { showToast } from './Toast'
import ReactionBar from './ReactionBar'
import { motion } from 'framer-motion'

interface Props {
  visible: boolean
  winnerName: string
  question: string
  onClose: () => void
  onRepeat?: () => void
  /** Re-ejecuta el mismo sorteo con el mismo ganador (rejugar animación) */
  onReplay?: () => void
  /** For team mode: names of teammates sharing the win */
  teammates?: string[]
}

export default function ResultOverlay({ visible, winnerName, question, onClose, onRepeat, onReplay, teammates }: Props) {
  if (!visible || !winnerName) return null

  const colors = getAvatarColorsByName(winnerName)
  const hasTeam = teammates && teammates.length > 0

  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    shareResult(winnerName, question || '¿Quién paga?')
  }

  const handleShareImage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const result = await shareResultImage({
        winnerName,
        question: question || '¿Quién paga?',
        teammates,
      })
      showToast(
        result === 'shared' ? 'Imagen lista para compartir' : 'Imagen guardada',
        'success'
      )
    } catch (err) {
      console.error('shareResultImage failed', err)
      showToast('No se pudo generar la imagen', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRepeat = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
    if (onRepeat) {
      setTimeout(onRepeat, 300)
    }
  }

  return (
    <div
      id="result-overlay"
      className="visible"
      onClick={onClose}
      role="dialog"
      aria-label="Resultado del sorteo"
      style={{ '--result-rgb': colors.rgb, '--avatar-color': colors.color, '--avatar-glow': `${colors.color}66` } as React.CSSProperties}
    >
      {/* Spotlight radial */}
      <motion.div
        className="winner-spotlight"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Avatar grande */}
      <motion.div
        className="winner-avatar-big"
        style={{ background: colors.gradient }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 18, delay: 0.15 }}
      >
        {getInitials(winnerName)}
      </motion.div>

      {/* Label */}
      <motion.span
        className="result-label"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        {hasTeam ? 'EQUIPO GANADOR' : 'HA SIDO ELEGIDO'}
      </motion.span>

      {/* Nombre con glitch */}
      <motion.h2
        className="result-name"
        data-text={winnerName}
        initial={{ scale: 0.6, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ type: 'spring' as const, stiffness: 250, damping: 20, delay: 0.45 }}
      >
        {winnerName}
      </motion.h2>

      {/* Teammates (solo en modo team) */}
      {hasTeam && (
        <motion.div
          className="result-teammates"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          aria-label="Compañeros de equipo"
        >
          <span className="result-teammates-label">junto a</span>
          <div className="result-teammates-list">
            {teammates!.map((name) => {
              const c = getAvatarColorsByName(name)
              return (
                <div key={name} className="result-teammate-chip" title={name}>
                  <span
                    className="result-teammate-avatar"
                    style={{ background: c.gradient }}
                  >
                    {getInitials(name)}
                  </span>
                  <span className="result-teammate-name">{name}</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Pregunta */}
      {question && (
        <motion.p
          className="result-question"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          "{question}"
        </motion.p>
      )}

      {/* Barra de reactions emocionales */}
      <ReactionBar visible={visible} />

      {/* Botones de acción */}
      <motion.div
        className="result-actions"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.35 }}
      >
        <button className="btn btn-accent" onClick={(e) => { e.stopPropagation(); onClose() }}>
          Cerrar
        </button>
        {onReplay && (
          <button
            className="btn btn-accent"
            onClick={(e) => { e.stopPropagation(); onReplay() }}
            title="Rejugar la animación del sorteo"
            aria-label="Rejugar sorteo"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Rejugar
          </button>
        )}
        <button
          className="btn btn-accent"
          onClick={handleShareImage}
          disabled={isGenerating}
          aria-label="Generar y compartir imagen del resultado"
          title="Generar imagen para compartir en redes"
        >
          {isGenerating ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="spin">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
          Imagen
        </button>
        <button
          className="btn btn-accent"
          onClick={handleShare}
          aria-label="Copiar enlace"
          title="Compartir como enlace"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Link
        </button>
        <button className="btn btn-impact" onClick={handleRepeat}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/></svg>
          Repetir
        </button>
      </motion.div>
    </div>
  )
}
