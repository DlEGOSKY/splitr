import { motion } from 'framer-motion'
import { useSplitStore } from '../store/useSplitStore'

interface Props {
  onLoaded: (groupName: string) => void
  /** Máximo de grupos recientes a mostrar (default 3) */
  limit?: number
}

/**
 * Strip de grupos guardados recientes — aparece cuando no hay participantes
 * para permitir recargar un grupo con un solo tap.
 * Se oculta si no hay savedGroups.
 */
export default function RecentGroupsStrip({ onLoaded, limit = 3 }: Props) {
  const savedGroups = useSplitStore((s) => s.savedGroups)
  const loadGroup = useSplitStore((s) => s.loadGroup)

  if (!savedGroups || savedGroups.length === 0) return null

  const recent = [...savedGroups]
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, limit)

  const handleLoad = (name: string) => {
    loadGroup(name)
    onLoaded(name)
  }

  return (
    <div className="recent-groups" aria-label="Grupos recientes">
      <div className="recent-groups-header">
        <span className="recent-groups-label">Tus grupos</span>
        <span className="recent-groups-hint">Recarga con un toque</span>
      </div>
      <div className="recent-groups-list">
        {recent.map((g, i) => (
          <motion.button
            key={g.name}
            type="button"
            className="recent-group-chip"
            onClick={() => handleLoad(g.name)}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i + 0.1, duration: 0.28, ease: 'easeOut' }}
            whileTap={{ scale: 0.96 }}
            aria-label={`Cargar grupo ${g.name} con ${g.members.length} participantes`}
          >
            <span className="recent-group-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </span>
            <span className="recent-group-text">
              <span className="recent-group-name">{g.name}</span>
              <span className="recent-group-count">{g.members.length} personas</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
