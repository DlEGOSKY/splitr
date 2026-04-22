import React from 'react'

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

interface P { size?: number; className?: string }

export const Icon = {
  // ── NAVIGATION ──
  groups: ({ size = 18, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  stats: ({ size = 18, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  theme: ({ size = 17, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18" strokeOpacity="0.3"/>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
    </svg>
  ),
  arrowLeft: ({ size = 18, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  close: ({ size = 18, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  add: ({ size = 18, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} strokeWidth={2.5} className={className}>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  trash: ({ size = 14, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  help: ({ size = 17, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/>
    </svg>
  ),
  settings: ({ size = 17, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  reset: ({ size = 15, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/>
    </svg>
  ),

  // ── SORTEO ──
  bolt: ({ size = 18, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="13,2 4.5,13.5 11,13.5 11,22 19.5,10.5 13,10.5"/>
    </svg>
  ),
  trophy: ({ size = 18, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <path d="M6 9H3V5h3M18 9h3V5h-3"/><path d="M6 5h12v6a6 6 0 0 1-12 0V5z"/>
      <path d="M9 17v2M15 17v2M7 19h10"/>
    </svg>
  ),
  shuffle: ({ size = 18, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
      <line x1="4" y1="4" x2="9" y2="9"/>
    </svg>
  ),
  star: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 1l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 1z"/>
    </svg>
  ),
  heart: ({ size = 20, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  check: ({ size = 20, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} strokeWidth={2.5} className={className}>
      <circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>
    </svg>
  ),
  loader: ({ size = 20, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  ),

  // ── MODES ──
  modeNormal: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    </svg>
  ),
  modeElimination: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <path d="M12 4C8.7 4 6 6.7 6 10c0 2.2 1.1 4.1 2.8 5.2V17h6.4v-1.8C16.9 14.1 18 12.2 18 10c0-3.3-2.7-6-6-6z"/>
      <line x1="9.5" y1="17" x2="9.5" y2="20"/><line x1="14.5" y1="17" x2="14.5" y2="20"/>
      <circle cx="9.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="14.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  ),
  modeTeam: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <circle cx="9" cy="7" r="3"/><circle cx="15" cy="7" r="3"/>
      <path d="M3 21v-1a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v1"/>
    </svg>
  ),
  modeOrder: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/>
      <line x1="10" y1="18" x2="20" y2="18"/>
      <text x="3" y="9" fontSize="6" fontFamily="monospace" fill="currentColor" stroke="none">1</text>
      <text x="3" y="15" fontSize="6" fontFamily="monospace" fill="currentColor" stroke="none">2</text>
      <text x="3" y="21" fontSize="6" fontFamily="monospace" fill="currentColor" stroke="none">3</text>
    </svg>
  ),
  modeRevenge: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
    </svg>
  ),
  modeDuel: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <circle cx="7" cy="7" r="4"/><circle cx="17" cy="7" r="4"/>
      <path d="M12 12v4M8 20h8" strokeWidth="2.5"/>
    </svg>
  ),
  modeSplit: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 3"/>
      <circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/>
      <circle cx="7" cy="16" r="3"/><circle cx="17" cy="16" r="3"/>
    </svg>
  ),
  modeRussian: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="var(--color-bg, #000)"/>
      <path d="M12 6v6l4 2" stroke="var(--color-bg, #000)" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  modeTournament: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <path d="M4 4v4h4M4 20v-4h4M20 4v4h-4M20 20v-4h-4"/>
      <line x1="8" y1="6" x2="12" y2="6"/><line x1="8" y1="18" x2="12" y2="18"/>
      <line x1="16" y1="6" x2="12" y2="6"/><line x1="16" y1="18" x2="12" y2="18"/>
      <line x1="12" y1="6" x2="12" y2="18"/>
    </svg>
  ),
  modeCoin: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <circle cx="12" cy="12" r="9"/><path d="M12 6v12"/><path d="M9 9h4.5a2.5 2.5 0 0 1 0 5H9"/>
    </svg>
  ),
  modeDice: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  modeBomb: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="11" cy="13" r="8"/><path d="M14 5l2-3M16.5 6l2-1" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  ),
  modeVoice: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s} className={className}>
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),

  // ── LUCK ──
  luckDown: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  ),
  luckUp: ({ size = 16, className }: P = {}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 1l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 1z"/>
    </svg>
  ),
}

export const MODE_ICONS: Record<string, (p?: P) => React.ReactElement> = {
  normal: Icon.modeNormal,
  elimination: Icon.modeElimination,
  team: Icon.modeTeam,
  order: Icon.modeOrder,
  revenge: Icon.modeRevenge,
  duel: Icon.modeDuel,
  split: Icon.modeSplit,
  russian: Icon.modeRussian,
  tournament: Icon.modeTournament,
  coin: Icon.modeCoin,
  dice: Icon.modeDice,
  bomb: Icon.modeBomb,
  voice: Icon.modeVoice,
}
