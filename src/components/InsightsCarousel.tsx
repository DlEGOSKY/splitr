import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { analyzeHistory } from '../utils/statsInsights'
import type { HistoryEntry } from '../types'

interface Props {
  history: HistoryEntry[]
}

/**
 * Muestra las "insights" generadas automáticamente sobre el historial.
 * Se oculta si no hay datos suficientes para generar alguna.
 */
export default function InsightsCarousel({ history }: Props) {
  const insights = useMemo(() => analyzeHistory(history), [history])

  if (insights.length === 0) return null

  return (
    <div className="insights-carousel" aria-label="Análisis de tu actividad">
      <div className="insights-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2l1.91 5.91L20 9.82l-4.5 4.39L16.73 20 12 17.27 7.27 20l1.23-5.79L4 9.82l6.09-1.91L12 2z" />
        </svg>
        <span>Para ti</span>
      </div>
      <div className="insights-list">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.kind}
            className={`insight-card insight-kind-${insight.kind}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i + 0.1, duration: 0.35, ease: 'easeOut' }}
          >
            {insight.iconPath && (
              <span className="insight-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={insight.iconPath} />
                </svg>
              </span>
            )}
            <div className="insight-text">
              <span className="insight-title">{insight.title}</span>
              <span className="insight-detail">{insight.detail}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
