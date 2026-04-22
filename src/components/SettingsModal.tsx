import React, { useRef, useState } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import SwipeableModal from './SwipeableModal'
import { exportBackup, importBackup, readFileAsText, wipeAllData } from '../utils/backup'
import { showToast } from './Toast'
import PersonalitySelector from './PersonalitySelector'

interface Props {
  visible: boolean
  onClose: () => void
}

const APP_VERSION = '3.0.0'

export default function SettingsModal({ visible, onClose }: Props) {
  const prefs = useSplitStore((s) => s.prefs)
  const updatePrefs = useSplitStore((s) => s.updatePrefs)
  const resetStats = useSplitStore((s) => s.resetStats)
  const clearParticipants = useSplitStore((s) => s.clearParticipants)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmAction, setConfirmAction] = useState<null | 'stats' | 'participants' | 'all'>(null)

  const handleGlowChange = (glow: number) => {
    updatePrefs({ glow })
    const intensity = glow / 100
    document.documentElement.style.setProperty('--glow-intensity', intensity.toString())
  }

  const handleExport = () => {
    try {
      exportBackup()
      showToast('Backup descargado', 'success')
    } catch {
      showToast('Error al exportar', 'error')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await readFileAsText(file)
      const ok = importBackup(text)
      if (ok) {
        showToast('Backup restaurado. Recargando...', 'success')
        setTimeout(() => window.location.reload(), 800)
      } else {
        showToast('Archivo inválido', 'error')
      }
    } catch {
      showToast('No se pudo leer el archivo', 'error')
    } finally {
      e.target.value = ''
    }
  }

  const handleConfirm = () => {
    if (confirmAction === 'stats') {
      resetStats()
      showToast('Estadísticas borradas', 'success')
    } else if (confirmAction === 'participants') {
      clearParticipants()
      showToast('Participantes eliminados', 'success')
    } else if (confirmAction === 'all') {
      wipeAllData()
      showToast('Todo borrado. Recargando...', 'success')
      setTimeout(() => window.location.reload(), 800)
    }
    setConfirmAction(null)
  }

  const Toggle = ({ checked, onChange, icon, label, description }: {
    checked: boolean
    onChange: (v: boolean) => void
    icon: React.ReactNode
    label: string
    description?: string
  }) => (
    <div className="settings-toggle-row">
      <div className="settings-toggle-info">
        <span className="settings-toggle-icon">{icon}</span>
        <div className="settings-toggle-text">
          <span>{label}</span>
          {description && <small>{description}</small>}
        </div>
      </div>
      <label className="settings-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-track" />
      </label>
    </div>
  )

  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="settings-section">
      <div className="settings-section-header">
        <span className="settings-section-icon">{icon}</span>
        <span className="settings-section-title">{title}</span>
      </div>
      <div className="settings-section-body">{children}</div>
    </div>
  )

  return (
    <SwipeableModal visible={visible} onClose={onClose}>
      <h2 className="modal-title">Ajustes</h2>

      {/* ───────── GENERAL ───────── */}
      <Section
        title="General"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
      >
        <div className="settings-field">
          <label className="settings-field-label">Pregunta por defecto</label>
          <input
            type="text"
            className="input-text"
            value={prefs.defaultQuestion}
            onChange={(e) => updatePrefs({ defaultQuestion: e.target.value })}
            maxLength={60}
            placeholder="¿Quién paga?"
          />
          <p className="settings-hint">Se precarga al abrir la app</p>
        </div>
      </Section>

      {/* ───────── AUDIO Y HÁPTICA ───────── */}
      <Section
        title="Audio y háptica"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>}
      >
        <Toggle checked={prefs.sound} onChange={(v) => updatePrefs({ sound: v })}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
          label="Efectos de sonido"
          description="Ticks, fanfare y notificaciones"
        />
        <Toggle checked={prefs.vibration} onChange={(v) => updatePrefs({ vibration: v })}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="4" height="12" rx="1"/><rect x="18" y="6" width="4" height="12" rx="1"/><rect x="8" y="4" width="8" height="16" rx="2"/></svg>}
          label="Vibración háptica"
          description="Feedback en cada acción clave"
        />
        <Toggle checked={prefs.narrator} onChange={(v) => updatePrefs({ narrator: v })}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
          label="Narrador por voz"
          description="Anuncia el ganador en voz alta"
        />
      </Section>

      {/* ───────── VISUAL ───────── */}
      <Section
        title="Visual"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
      >
        <Toggle checked={prefs.particles} onChange={(v) => updatePrefs({ particles: v })}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/></svg>}
          label="Partículas de celebración"
          description="Confetti al revelar ganador"
        />
        <Toggle checked={prefs.flash} onChange={(v) => updatePrefs({ flash: v })}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
          label="Flash de impacto"
          description="Destello en resultados"
        />
        <Toggle checked={prefs.roulette} onChange={(v) => updatePrefs({ roulette: v })}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l7 4"/></svg>}
          label="Animación tipo ruleta"
          description="Modo circular en lugar de grid"
        />
        <Toggle checked={prefs.ritual} onChange={(v) => updatePrefs({ ritual: v })}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>}
          label="Ritual previo"
          description="Momento de tensión antes del countdown"
        />

        <div className="settings-slider-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
            </span>
            <div className="settings-toggle-text">
              <span>Brillo del glow</span>
            </div>
          </div>
          <span className="settings-slider-value">{prefs.glow}%</span>
          <input type="range" min="0" max="100" value={prefs.glow}
            onChange={(e) => handleGlowChange(Number(e.target.value))} className="settings-range" />
        </div>

        <div className="settings-slider-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </span>
            <div className="settings-toggle-text">
              <span>Velocidad del sorteo</span>
            </div>
          </div>
          <span className="settings-slider-value">{prefs.speed}%</span>
          <input type="range" min="50" max="200" value={prefs.speed}
            onChange={(e) => updatePrefs({ speed: Number(e.target.value) })} className="settings-range" />
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Personalidad del sorteo</label>
          <PersonalitySelector />
          <p className="settings-hint">Afecta el tono del narrador y detalles visuales</p>
        </div>
      </Section>

      {/* ───────── DATOS ───────── */}
      <Section
        title="Datos"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>}
      >
        <div className="settings-data-actions">
          <button className="settings-action-btn" onClick={handleExport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <div>
              <span>Exportar backup</span>
              <small>JSON con participantes, grupos y prefs</small>
            </div>
          </button>
          <button className="settings-action-btn" onClick={handleImportClick}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div>
              <span>Importar backup</span>
              <small>Restaurar desde archivo JSON</small>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>

        <div className="settings-divider" />

        <button className="settings-action-btn settings-action-danger" onClick={() => setConfirmAction('stats')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/></svg>
          <div>
            <span>Resetear estadísticas</span>
            <small>Borra sorteos e historial</small>
          </div>
        </button>
        <button className="settings-action-btn settings-action-danger" onClick={() => setConfirmAction('participants')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          <div>
            <span>Borrar participantes</span>
            <small>Lista actual (grupos guardados intactos)</small>
          </div>
        </button>
        <button className="settings-action-btn settings-action-danger" onClick={() => setConfirmAction('all')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <div>
            <span>Borrar todo</span>
            <small>Vuelve al estado inicial</small>
          </div>
        </button>
      </Section>

      {/* ───────── SOBRE ───────── */}
      <Section
        title="Sobre Splitr"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
      >
        <div className="settings-about">
          <div className="settings-about-row">
            <span className="settings-about-label">Versión</span>
            <span className="settings-about-value">{APP_VERSION}</span>
          </div>
          <div className="settings-about-row">
            <span className="settings-about-label">Modo</span>
            <span className="settings-about-value">PWA · Offline-first</span>
          </div>
          <p className="settings-about-credit">
            Hecho con <span className="settings-heart">♥</span> por un dev indie
          </p>
        </div>
      </Section>

      <button className="btn btn-accent modal-close-btn" onClick={onClose}>
        Cerrar
      </button>

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="settings-confirm-backdrop" onClick={() => setConfirmAction(null)}>
          <div className="settings-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3>¿Seguro?</h3>
            <p>
              {confirmAction === 'stats' && 'Se borrarán todas las estadísticas e historial de sorteos.'}
              {confirmAction === 'participants' && 'Se eliminarán los participantes actuales.'}
              {confirmAction === 'all' && 'Se borrarán participantes, grupos, preferencias y estadísticas. La app se reiniciará.'}
            </p>
            <div className="settings-confirm-actions">
              <button className="btn" onClick={() => setConfirmAction(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </SwipeableModal>
  )
}
