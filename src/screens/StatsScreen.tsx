import { useState } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import { getAvatarColors, getInitials } from '../utils/avatar'
import { exportHistoryCSV } from '../utils/backup'
import { showToast } from '../components/Toast'
import InsightsCarousel from '../components/InsightsCarousel'

interface Props {
  active: boolean
  onNavigate: (screen: 'home' | 'stats') => void
}

const MODE_LABELS: Record<string, string> = {
  normal: 'Normal', elimination: 'Eliminación', team: 'Equipo', order: 'Orden',
  revenge: 'Venganza', duel: 'Duelo', coin: 'Moneda', dice: 'Dado',
  bomb: 'Bomba', split: 'Dividir', russian: 'Ruleta Rusa', voice: 'Voz',
  tournament: 'Torneo',
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'Justo ahora'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

export default function StatsScreen({ active, onNavigate }: Props) {
  const participants = useSplitStore((s) => s.participants)
  const sessionStats = useSplitStore((s) => s.sessionStats)
  const sessionHistory = useSplitStore((s) => s.sessionHistory)
  const resetStats = useSplitStore((s) => s.resetStats)
  const [tab, setTab] = useState<'stats' | 'history'>('stats')

  const totalSorteos = participants.reduce(
    (sum, p) => sum + (sessionStats[p.id]?.chosen ?? 0), 0
  )

  const sorted = [...participants]
    .map((p) => ({ ...p, chosen: sessionStats[p.id]?.chosen ?? 0 }))
    .sort((a, b) => b.chosen - a.chosen)

  // ── Métricas adicionales ──
  const totalHistory = sessionHistory.length
  const topWinner = sorted[0]?.chosen > 0 ? sorted[0] : null
  const lastEntry = sessionHistory[0]

  // Breakdown por modo
  const modeBreakdown = sessionHistory.reduce<Record<string, number>>((acc, e) => {
    acc[e.mode] = (acc[e.mode] ?? 0) + 1
    return acc
  }, {})
  const topModes = Object.entries(modeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const topMode = topModes[0]?.[0] ?? null

  // Actividad últimos 7 días
  const DAY_MS = 86_400_000
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()
  const activity7d = Array.from({ length: 7 }, (_, i) => {
    const dayStart = todayTs - (6 - i) * DAY_MS
    const dayEnd = dayStart + DAY_MS
    const count = sessionHistory.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd).length
    return { dayStart, count }
  })
  const maxDay = Math.max(1, ...activity7d.map(d => d.count))
  const DAY_LABELS = ['L','M','M','J','V','S','D']
  const todayDow = (new Date().getDay() + 6) % 7 // Lunes = 0

  return (
    <section
      className={`screen ${active ? 'active' : ''}`}
      id="screen-stats"
      role="main"
      aria-label="Estadísticas de sesión"
    >
      <header className="app-header">
        <button className="btn btn-icon" onClick={() => onNavigate('home')} aria-label="Volver al inicio">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="screen-title">Stats <span>de Sesión</span></h2>
        <div className="stats-header-actions">
          <div className="stats-tabs">
            <button
              className={`stats-tab ${tab === 'stats' ? 'active' : ''}`}
              onClick={() => setTab('stats')}
            >Stats</button>
            <button
              className={`stats-tab ${tab === 'history' ? 'active' : ''}`}
              onClick={() => setTab('history')}
            >Historial</button>
          </div>
          <button
            onClick={resetStats}
            aria-label="Resetear estadísticas"
            title="Resetear"
            className="btn btn-icon stats-reset-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/></svg>
          </button>
        </div>
      </header>

      {/* Panel Stats */}
      {tab === 'stats' && totalHistory === 0 && (
        <div className="stats-empty-rich">
          <div className="stats-empty-icon-wrap">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <h3 className="stats-empty-rich-title">Aún no hay datos</h3>
          <p className="stats-empty-rich-sub">
            Cada sorteo alimenta tus estadísticas.
            <br/>Aquí verás rankings, modos favoritos, actividad semanal y más.
          </p>

          {/* Preview skeleton de lo que verá */}
          <div className="stats-preview">
            <div className="stats-preview-cards">
              {['Total', 'Líder', 'Modo', 'Hoy'].map((l, i) => (
                <div key={i} className="stats-preview-card">
                  <div className="stats-preview-bar" style={{ animationDelay: `${i * 100}ms` }} />
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <div className="stats-preview-chart">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className="stats-preview-col"
                  style={{
                    height: `${20 + (i * 7) % 60}%`,
                    animationDelay: `${i * 80}ms`
                  }}
                />
              ))}
            </div>
          </div>

          <button className="btn btn-primary stats-empty-cta" onClick={() => onNavigate('home')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="13,2 4.5,13.5 11,13.5 11,22 19.5,10.5 13,10.5"/></svg>
            Hacer primer sorteo
          </button>
        </div>
      )}

      {tab === 'stats' && totalHistory > 0 && (
        <div className="stats-grid" role="list" aria-label="Estadísticas por participante">
          {/* Summary cards */}
          <div className="stats-summary">
            <div className="stats-card">
              <span className="stats-card-value">{totalHistory}</span>
              <span className="stats-card-label">Sorteos totales</span>
            </div>
            <div className="stats-card">
              <span className="stats-card-value">
                {topWinner ? getInitials(topWinner.name) : '—'}
              </span>
              <span className="stats-card-label">
                {topWinner ? `${topWinner.name} lidera` : 'Sin líder aún'}
              </span>
            </div>
            <div className="stats-card">
              <span className="stats-card-value">
                {topMode ? MODE_LABELS[topMode]?.slice(0, 3) : '—'}
              </span>
              <span className="stats-card-label">
                {topMode ? `Modo favorito` : 'Sin modo usado'}
              </span>
            </div>
            <div className="stats-card">
              <span className="stats-card-value">
                {lastEntry ? timeAgo(lastEntry.timestamp) : '—'}
              </span>
              <span className="stats-card-label">Último sorteo</span>
            </div>
          </div>

          {/* Insights automáticos (racha, modo favorito, hora pico, etc.) */}
          <InsightsCarousel history={sessionHistory} />

          {/* Activity timeline (últimos 7 días) */}
          {totalHistory > 0 && (
            <div className="stats-activity">
              <div className="stats-section-title">
                <span>Actividad · últimos 7 días</span>
              </div>
              <div className="activity-bars">
                {activity7d.map((d, i) => {
                  const height = (d.count / maxDay) * 100
                  const isToday = i === 6
                  return (
                    <div key={i} className={`activity-col ${isToday ? 'today' : ''}`}>
                      <div className="activity-bar-wrap">
                        {d.count > 0 && (
                          <div
                            className="activity-bar"
                            style={{ height: `${Math.max(height, 6)}%`, animationDelay: `${i * 60}ms` }}
                          >
                            <span className="activity-bar-count">{d.count}</span>
                          </div>
                        )}
                      </div>
                      <span className="activity-day">{DAY_LABELS[(todayDow - 6 + i + 7) % 7]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mode breakdown */}
          {topModes.length > 0 && (
            <div className="stats-modes">
              <div className="stats-section-title">
                <span>Por modo</span>
              </div>
              <div className="mode-chips">
                {topModes.map(([mode, count]) => {
                  const pct = Math.round((count / totalHistory) * 100)
                  return (
                    <div key={mode} className="mode-chip" style={{ '--mode-pct': `${pct}%` } as React.CSSProperties}>
                      <div className="mode-chip-fill" style={{ width: `${pct}%` }} />
                      <span className="mode-chip-label">{MODE_LABELS[mode] || mode}</span>
                      <span className="mode-chip-value">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ranking title */}
          {totalSorteos > 0 && (
            <div className="stats-section-title">
              <span>Ranking</span>
            </div>
          )}

          {/* Donut Chart */}
          {totalSorteos > 0 && sorted.length > 0 && (
            <div className="stats-donut-container">
              <svg viewBox="0 0 100 100" className="stats-donut">
                {(() => {
                  let offset = 0
                  const radius = 35
                  const circumference = 2 * Math.PI * radius
                  return sorted.slice(0, 6).map((p, i) => {
                    const pct = p.chosen / totalSorteos
                    const strokeDash = pct * circumference
                    const colors = getAvatarColors(p.name)
                    const segment = (
                      <circle
                        key={p.id}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={colors.color}
                        strokeWidth="12"
                        strokeDasharray={`${strokeDash} ${circumference}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        className="donut-segment"
                        style={{ animationDelay: `${i * 100}ms` }}
                      />
                    )
                    offset += strokeDash
                    return segment
                  })
                })()}
              </svg>
              <div className="stats-donut-center">
                <span className="donut-total">{totalSorteos}</span>
                <span className="donut-label">sorteos</span>
              </div>
            </div>
          )}
          {sorted.map((p, i) => {
              const colors = getAvatarColors(p.name)
              const pct = totalSorteos > 0 ? Math.round(p.chosen / totalSorteos * 100) : 0
              const medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null

              return (
                <div key={p.id} className="stats-row" role="listitem" style={{ animationDelay: `${i * 50}ms` }}>
                  {medal ? <span className={`stats-medal stats-medal-${medal}`}>{i + 1}</span>
                         : <span className="stats-rank">{i + 1}</span>}
                  <div
                    className="avatar stats-avatar"
                    style={{
                      background: colors.gradient,
                      '--avatar-color': colors.color,
                      '--avatar-glow': `${colors.color}44`,
                      boxShadow: `0 0 12px ${colors.color}33`,
                    } as React.CSSProperties}
                  >
                    {getInitials(p.name)}
                  </div>
                  <div className="stats-info">
                    <span className="stats-name" style={{ color: colors.color }}>{p.name}</span>
                    <span className="stats-meta">{p.chosen}× elegido · {pct}%</span>
                  </div>
                  <div className="stats-bar-track">
                    <div
                      className="stats-bar-fill"
                      style={{ width: `${Math.max(pct, 4)}%`, background: colors.gradient, animationDelay: `${i * 50 + 150}ms` }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Panel Historial */}
      {tab === 'history' && (
        <div className="history-list" role="list" aria-label="Historial de sorteos">
          {sessionHistory.length === 0 ? (
            <div className="stats-empty">
              <svg className="stats-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="1.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <p className="stats-empty-text">Sin historial aún</p>
              <p className="stats-empty-hint">Cada sorteo se registra aquí</p>
            </div>
          ) : (
            <>
              <div className="history-toolbar">
                <span className="history-count">{sessionHistory.length} sorteos registrados</span>
                <button
                  className="history-export-btn"
                  onClick={() => {
                    try {
                      exportHistoryCSV(sessionHistory)
                      showToast('Historial exportado a CSV', 'success')
                    } catch {
                      showToast('Error al exportar', 'error')
                    }
                  }}
                  title="Descargar historial como CSV"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  CSV
                </button>
              </div>
              {sessionHistory.map((entry, i) => {
              const colors = getAvatarColors(entry.winnerName)
              return (
                <div key={i} className="history-entry" style={{ animationDelay: `${i * 50}ms` }}>
                  <div
                    className="history-avatar"
                    style={{ background: colors.gradient }}
                  >
                    {getInitials(entry.winnerName)}
                  </div>
                  <div className="history-info">
                    <span className="history-name">{entry.winnerName}</span>
                    {entry.question && (
                      <span className="history-question">"{entry.question}"</span>
                    )}
                  </div>
                  <div className="history-meta">
                    <span className="history-time">{timeAgo(entry.timestamp)}</span>
                    <span className="history-mode-badge">{MODE_LABELS[entry.mode] || entry.mode}</span>
                  </div>
                </div>
              )
            })}
            </>
          )}
        </div>
      )}
    </section>
  )
}
