import { motion } from 'framer-motion'
import { TEMPLATES, suggestTemplateForNow, type Template } from '../utils/templates'

interface Props {
  onApply: (template: Template) => void
}

/**
 * Chips de plantillas rápidas. Aparecen solo cuando no hay participantes
 * para reducir la fricción del primer uso. Al tocar uno, aplica pregunta
 * + modo (y opcionalmente nombres de ejemplo) via onApply.
 */
export default function TemplateChips({ onApply }: Props) {
  const suggested = suggestTemplateForNow()

  return (
    <div className="template-chips" role="group" aria-label="Plantillas rápidas">
      <div className="template-chips-header">
        <span className="template-chips-label">Empieza rápido</span>
        <span className="template-chips-hint">Toca una y ajusta</span>
      </div>
      <div className="template-chips-list">
        {TEMPLATES.map((tpl, i) => {
          const isSuggested = tpl.id === suggested.id
          return (
            <motion.button
              key={tpl.id}
              type="button"
              className={`template-chip${isSuggested ? ' template-chip-suggested' : ''}`}
              onClick={() => onApply(tpl)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.28, ease: 'easeOut' }}
              whileTap={{ scale: 0.96 }}
              style={{ '--chip-hue': tpl.hue } as React.CSSProperties}
              aria-label={`Aplicar plantilla: ${tpl.label}`}
            >
              <span className="template-chip-icon" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={tpl.iconPath} />
                </svg>
              </span>
              <span className="template-chip-text">
                <span className="template-chip-label">{tpl.label}</span>
                {tpl.sublabel && (
                  <span className="template-chip-sublabel">{tpl.sublabel}</span>
                )}
              </span>
              {isSuggested && (
                <span className="template-chip-badge" aria-label="Sugerida">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.39 7.36H22l-6.19 4.5 2.36 7.36L12 16.73l-6.17 4.49 2.36-7.36L2 9.36h7.61L12 2z" />
                  </svg>
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
