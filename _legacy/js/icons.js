/* ============================================================
   ICONS.JS — Librería de íconos SVG inline propios
   Todos los íconos son SVG puros, sin emojis ni assets externos.
   Estilo: líneas limpias, stroke consistente de 1.5-2px.
   Uso: Icons.nombre() → string SVG listo para innerHTML
   ============================================================ */

const SVG = (paths, w = 24, h = 24, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;

export const Icons = {

  // ── NAVEGACIÓN / ACCIONES ──

  /** Grupos / personas */
  groups: () => SVG(`
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  `),

  /** Estadísticas / barras */
  stats: () => SVG(`
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
    <line x1="2"  y1="20" x2="22" y2="20"/>
  `),

  /** Paleta / tema */
  theme: () => SVG(`
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 3v18M3 12h18" stroke-opacity="0.3"/>
    <path d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4" stroke-opacity="0.15"/>
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
  `),

  /** Flecha atrás */
  arrowLeft: () => SVG(`
    <polyline points="15 18 9 12 15 6"/>
  `),

  /** Cerrar (X) */
  close: () => SVG(`
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6"  y1="6" x2="18" y2="18"/>
  `),

  /** Añadir (+) */
  add: () => SVG(`
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5"  y1="12" x2="19" y2="12"/>
  `),

  // ── MODOS DE JUEGO ──

  /** Normal: diana/objetivo */
  modeNormal: () => SVG(`
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
  `),

  /** Eliminación: calavera estilizada */
  modeElimination: () => SVG(`
    <path d="M12 4C8.7 4 6 6.7 6 10c0 2.2 1.1 4.1 2.8 5.2V17h6.4v-1.8C16.9 14.1 18 12.2 18 10c0-3.3-2.7-6-6-6z"/>
    <line x1="9.5" y1="17" x2="9.5" y2="20"/>
    <line x1="14.5" y1="17" x2="14.5" y2="20"/>
    <line x1="9.5" y1="20" x2="14.5" y2="20"/>
    <circle cx="9.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="14.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>
  `),

  /** Equipo: personas con lazo */
  modeTeam: () => SVG(`
    <circle cx="9" cy="7" r="3"/>
    <circle cx="15" cy="7" r="3"/>
    <path d="M3 21v-1a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v1"/>
  `),

  /** Orden: lista numerada */
  modeOrder: () => SVG(`
    <line x1="10" y1="6"  x2="20" y2="6"/>
    <line x1="10" y1="12" x2="20" y2="12"/>
    <line x1="10" y1="18" x2="20" y2="18"/>
    <text x="3" y="9"  font-size="6" font-family="monospace" fill="currentColor" stroke="none">1</text>
    <text x="3" y="15" font-size="6" font-family="monospace" fill="currentColor" stroke="none">2</text>
    <text x="3" y="21" font-size="6" font-family="monospace" fill="currentColor" stroke="none">3</text>
  `),

  // ── MENÚ DE AVATAR ──

  /** Pausar / silenciar */
  pause: () => SVG(`
    <rect x="6"  y="4" width="4" height="16" rx="1"/>
    <rect x="14" y="4" width="4" height="16" rx="1"/>
  `),

  /** Reanudar / play */
  play: () => SVG(`
    <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/>
  `),

  /** Eliminar / basura */
  trash: () => SVG(`
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  `),

  // ── LUCK BADGES (dentro del avatar) ──

  /** Suerte 1 — calavera */
  luck1: (size = 12) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2C5.2 2 3 4.2 3 7c0 1.6.8 3 2 3.9V12h6v-1.1c1.2-.9 2-2.3 2-3.9 0-2.8-2.2-5-5-5z" opacity="0.9"/>
    <rect x="5.5" y="12" width="1.5" height="2" rx="0.5"/>
    <rect x="9"   y="12" width="1.5" height="2" rx="0.5"/>
    <rect x="5.5" y="14" width="5"   height="0.8" rx="0.4"/>
    <circle cx="6"  cy="8" r="1.3" fill="white"/>
    <circle cx="10" cy="8" r="1.3" fill="white"/>
  </svg>`,

  /** Suerte 2 — cara triste */
  luck2: (size = 12) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor"/>
    <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor"/>
    <path d="M5.5 11C6.5 9.5 9.5 9.5 10.5 11" stroke="currentColor" stroke-width="1.3"/>
  </svg>`,

  /** Suerte 3 — cara neutral */
  luck3: (size = 12) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor"/>
    <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor"/>
    <line x1="5.5" y1="10.5" x2="10.5" y2="10.5" stroke="currentColor" stroke-width="1.3"/>
  </svg>`,

  /** Suerte 4 — cara feliz */
  luck4: (size = 12) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor"/>
    <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor"/>
    <path d="M5.5 9.5C6.5 11.5 9.5 11.5 10.5 9.5" stroke="currentColor" stroke-width="1.3"/>
  </svg>`,

  /** Suerte 5 — estrella / trébol */
  luck5: (size = 12) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1L2 5.4l4.2-.8z" opacity="0.9"/>
  </svg>`,

  // ── ESTADO VACÍO ──

  /** Empty state para participantes */
  emptyPeople: () => SVG(`
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    <line x1="12" y1="2" x2="12" y2="4" stroke-opacity="0.4"/>
    <line x1="12" y1="20" x2="12" y2="22" stroke-opacity="0.4"/>
  `, 24, 24),

  /** Empty state para stats */
  emptyStats: () => SVG(`
    <rect x="3"  y="14" width="4" height="7" rx="1" stroke-opacity="0.4"/>
    <rect x="10" y="9"  width="4" height="12" rx="1" stroke-opacity="0.4"/>
    <rect x="17" y="4"  width="4" height="17" rx="1" stroke-opacity="0.4"/>
    <path d="M3 3l5 5 4-4 5 5 4-4" stroke-dasharray="2 2"/>
  `, 24, 24),

  // ── RESULTADO ──

  /** Rayo / sortear */
  bolt: () => SVG(`
    <polygon points="13,2 4.5,13.5 11,13.5 11,22 19.5,10.5 13,10.5" fill="currentColor" stroke="none"/>
  `),

  /** Trofeo */
  trophy: () => SVG(`
    <path d="M6 9H3V5h3M18 9h3V5h-3"/>
    <path d="M6 5h12v6a6 6 0 0 1-12 0V5z"/>
    <path d="M9 17v2M15 17v2M7 19h10"/>
  `),

  /** Repetir / shuffle */
  shuffle: () => SVG(`
    <polyline points="16 3 21 3 21 8"/>
    <line x1="4" y1="20" x2="21" y2="3"/>
    <polyline points="21 16 21 21 16 21"/>
    <line x1="15" y1="15" x2="21" y2="21"/>
    <line x1="4" y1="4" x2="9" y2="9"/>
  `),

  /** Siguiente / avanzar */
  next: () => SVG(`
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="13 6 19 12 13 18"/>
  `),

  /** Toca / dedo */
  tap: () => SVG(`
    <path d="M9 11V6a2 2 0 0 1 4 0v5"/>
    <path d="M13 11v-1a2 2 0 0 1 4 0v3c0 3-2 5-5 5H9a5 5 0 0 1-5-5v-2a2 2 0 0 1 4 0v1"/>
  `),

  // ── MEDALLAS / RANKING ──

  medal1: () => SVG(`
    <circle cx="12" cy="8" r="6"/>
    <path d="M8.6 14.5L7 22l5-3 5 3-1.6-7.5"/>
    <text x="12" y="11" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor" stroke="none">1</text>
  `),

  medal2: () => SVG(`
    <circle cx="12" cy="8" r="6"/>
    <path d="M8.6 14.5L7 22l5-3 5 3-1.6-7.5"/>
    <text x="12" y="11" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor" stroke="none">2</text>
  `),

  medal3: () => SVG(`
    <circle cx="12" cy="8" r="6"/>
    <path d="M8.6 14.5L7 22l5-3 5 3-1.6-7.5"/>
    <text x="12" y="11" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor" stroke="none">3</text>
  `),
};

/** Devuelve el SVG de suerte según nivel 1-5 */
export function luckIcon(level, size = 12) {
  const map = { 1: Icons.luck1, 2: Icons.luck2, 3: Icons.luck3, 4: Icons.luck4, 5: Icons.luck5 };
  return (map[level] ?? Icons.luck3)(size);
}
