import React from 'react'
import type { Mode } from '../types'

interface Props {
  mode: Mode
  onSelect: (mode: Mode) => void
}

const MODES: { id: Mode; label: string; icon: React.ReactElement }[] = [
  { id: 'normal', label: 'Normal', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg> },
  { id: 'elimination', label: 'Eliminación', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> },
  { id: 'team', label: 'Equipo', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> },
  { id: 'order', label: 'Orden', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg> },
  { id: 'revenge', label: 'Venganza', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> },
  { id: 'duel', label: 'Duelo', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5H5l9 9 1.41-1.41L6.92 5zm11.5 11.5L15 14l-1.5 1.5 1.06 1.06L16 15.12l1.44 1.44 1.06-1.06z"/></svg> },
  { id: 'split', label: 'Dividir', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4l2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4h-6zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3L10 4z"/></svg> },
  { id: 'russian', label: 'Ruleta Rusa', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> },
  { id: 'tournament', label: 'Torneo', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></svg> },
  { id: 'coin', label: 'Moneda', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6v12" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/></svg> },
  { id: 'dice', label: 'Dado', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="var(--color-bg, #000)"/><circle cx="15.5" cy="15.5" r="1.5" fill="var(--color-bg, #000)"/></svg> },
  { id: 'bomb', label: 'Bomba', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="11" cy="13" r="8"/><path d="M14.5 4.5L16 3" stroke="currentColor" strokeWidth="2"/></svg> },
  { id: 'voice', label: 'Voz', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1" fill="none" stroke="currentColor" strokeWidth="2"/></svg> },
]

const MODE_DESCRIPTIONS: Record<Mode, { icon: React.ReactElement; text: string }> = {
  normal: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/><path d="M12 1l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 1z"/></svg>, 
    text: 'Elige a una persona al azar. La suerte influye en la probabilidad.' 
  },
  elimination: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>, 
    text: 'El elegido queda fuera. Sortea de nuevo hasta que quede uno.' 
  },
  team: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01.99L12 13l-2.99-4.01C8.54 8.37 7.8 8 7 8H5.46c-.8 0-1.49.59-1.42 1.37L6.5 16H9v6h2v-6h2v6h2z"/></svg>, 
    text: 'Divide al grupo en equipos al azar.' 
  },
  order: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h20v2H2zm1.15-4.05L4 11.47l.85 1.48L3.5 14.4H6v1.6H2l1.15-2.05zM13 13.5h8v1h-8zm0-2h8v1h-8zm-11-1L3.5 9H6V7.4H2l1.15 2.05L2 10.95 3.85 12.5zm11-2.5h8v1h-8zm0-2h8v1h-8zM2 5h20v2H2z"/></svg>, 
    text: 'Genera un orden aleatorio completo. Se revela uno por uno.' 
  },
  revenge: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>, 
    text: 'El último elegido no participa en esta ronda.' 
  },
  duel: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.92 5H5l9 9 1.41-1.41L6.92 5zm11.5 11.5L15 14l-1.5 1.5 1.06 1.06L16 15.12l1.44 1.44 1.06-1.06z"/></svg>, 
    text: 'Toca 2 avatares para enfrentarlos. El azar decide quién paga.' 
  },
  split: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l2.36 2.36C14.13 16.86 14 17.41 14 18c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4c-.59 0-1.14.13-1.64.36L14 12l2.36-2.36C16.86 9.87 17.41 10 18 10c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4c0 .59.13 1.14.36 1.64L12 10 9.64 7.64z"/></svg>, 
    text: 'Divide al grupo en 2 equipos aleatorios al instante.' 
  },
  russian: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, 
    text: 'La ruleta elimina un sector por ronda hasta que quede un condenado.' 
  },
  tournament: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5h5.5l1.5 9 1.5-9H17l-2 11h-4.5L9 7.5 7.5 16H5zm7-13A2 2 0 1 1 10 1a2 2 0 0 1 2 2z"/></svg>, 
    text: 'Bracket completo tipo copa — ves todos los emparejamientos.' 
  },
  coin: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M8 12h8"/></svg>, 
    text: 'Cara o Cruz — la moneda gira y decide entre dos participantes.' 
  },
  dice: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/></svg>, 
    text: 'Lanza un dado — el número determina quién paga según su posición.' 
  },
  bomb: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/><path d="M12 4v8l6-6"/></svg>, 
    text: 'Hot potato — la bomba pasa de mano en mano y explota en el condenado.' 
  },
  voice: { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>, 
    text: 'Di en voz alta el nombre del elegido — el micrófono lo detecta.' 
  },
}

function ModeSelector({ mode, onSelect }: Props) {
  const desc = MODE_DESCRIPTIONS[mode]

  return (
    <div className="control-panel">
      <div className="mode-selector" role="group" aria-label="Modo de juego">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? 'active' : ''}`}
            data-mode={m.id}
            onClick={() => onSelect(m.id)}
            aria-pressed={mode === m.id}
          >
            <span className="mode-btn-icon">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="mode-description">
        <div className="mode-desc-panel active">
          <span className="mode-desc-icon">{desc.icon}</span>
          <span className="mode-desc-text">{desc.text}</span>
        </div>
      </div>
    </div>
  )
}

export default React.memo(ModeSelector)
