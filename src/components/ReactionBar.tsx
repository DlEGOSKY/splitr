import { useState } from 'react'
import { motion } from 'framer-motion'
import { spawnReaction } from '../utils/particles'
import { hapticTap } from '../utils/haptics'

/**
 * Barra de reactions post-resultado.
 * Cada reaction dispara un burst de partículas con paleta temática
 * y un pulse visual en el botón. Sin persistencia (solo feedback del momento).
 *
 * Filosofía: iconos SVG propios con stroke neón, cero emojis,
 * coherente con la identidad cyberpunk de Splitr.
 */

type ReactionId = 'love' | 'fire' | 'impact' | 'target' | 'star'

interface Reaction {
  id: ReactionId
  label: string
  palette: string[]
  /** SVG children (paths only) — se renderiza dentro de un <svg> 24x24 */
  icon: React.ReactNode
  hue: number
}

const REACTIONS: Reaction[] = [
  {
    id: 'love',
    label: 'Amor',
    palette: ['#ff4d8f', '#ff6fa1', '#ff0066', '#ffb3cc', '#ff80b3'],
    hue: 340,
    icon: (
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    ),
  },
  {
    id: 'fire',
    label: 'Fuego',
    palette: ['#ff6b00', '#ffae00', '#ff3300', '#ffdd33', '#ff8844'],
    hue: 25,
    icon: (
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    ),
  },
  {
    id: 'impact',
    label: 'Impacto',
    palette: ['#ff2e2e', '#ffffff', '#c91f1f', '#ff6b6b', '#ff9999'],
    hue: 0,
    icon: (
      <path d="M12 2L8.5 11H2l5.5 4L5 22l7-5 7 5-2.5-7L22 11h-6.5L12 2z" />
    ),
  },
  {
    id: 'target',
    label: 'En el blanco',
    palette: ['#00ff88', '#00ffd0', '#00cc66', '#44ffaa', '#00ffff'],
    hue: 150,
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    id: 'star',
    label: 'Leyenda',
    palette: ['#ffd700', '#fff08c', '#ffaa00', '#ffff88', '#ffcc33'],
    hue: 50,
    icon: (
      <path d="M12 2l2.39 7.36H22l-6.19 4.5 2.36 7.36L12 16.73l-6.17 4.49 2.36-7.36L2 9.36h7.61L12 2z" />
    ),
  },
]

interface Props {
  /** Se oculta si false. El componente cuida su propio estado de uso */
  visible: boolean
}

export default function ReactionBar({ visible }: Props) {
  const [pulses, setPulses] = useState<Record<ReactionId, number>>({
    love: 0, fire: 0, impact: 0, target: 0, star: 0,
  })
  const [lastId, setLastId] = useState<ReactionId | null>(null)

  if (!visible) return null

  const handleReact = (r: Reaction, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    hapticTap()
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    spawnReaction(cx, cy, r.palette, 20)
    // Pulse visual: incremento para forzar re-key de la animación
    setPulses((p) => ({ ...p, [r.id]: p[r.id] + 1 }))
    setLastId(r.id)
  }

  return (
    <motion.div
      className="reaction-bar"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.4, ease: 'easeOut' }}
      role="group"
      aria-label="Reacciones al resultado"
    >
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`reaction-btn${lastId === r.id ? ' reaction-btn-last' : ''}`}
          onClick={(e) => handleReact(r, e)}
          style={{ '--reaction-hue': r.hue } as React.CSSProperties}
          aria-label={`Reaccionar: ${r.label}`}
          title={r.label}
        >
          <motion.span
            key={pulses[r.id]}
            className="reaction-icon"
            animate={pulses[r.id] > 0 ? { scale: [1, 1.4, 1] } : undefined}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            aria-hidden="true"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {r.icon}
            </svg>
          </motion.span>
        </button>
      ))}
    </motion.div>
  )
}
