/* ============================================================
   STATS.JS — Estadísticas y historial
   Renderizado de estadísticas, gráfico donut, historial de sorteos.
   ============================================================ */

import { getAvatarColorsByName } from './participants.js';

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════

const STATS_KEY = 'qp-stats';

// ══════════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════════

let statsGrid = null;
let historyList = null;
let tabStats = null;
let tabHistory = null;

// Callbacks necesarios
let escapeHtmlFn = null;
let stateFn = null;

// ══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════

/**
 * Inicializa el sistema de estadísticas con las referencias DOM y callbacks necesarios.
 * @param {Object} config - Configuración
 * @param {Function} config.escapeHtml - Función para escapar HTML
 * @param {Function} config.state - Función que retorna el estado actual
 */
export function initStats({ escapeHtml, state }) {
  escapeHtmlFn = escapeHtml;
  stateFn = state;

  // Referencias DOM
  statsGrid = document.getElementById('stats-grid');
  historyList = document.getElementById('history-list');
  tabStats = document.getElementById('tab-stats');
  tabHistory = document.getElementById('tab-history');
}

// ══════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ══════════════════════════════════════════════════════════

export function renderStats() {
  if (!statsGrid) return;
  const { participants, sessionStats } = stateFn().get();

  const totalSorteos = participants.reduce((s, p) => s + (sessionStats[p.id]?.chosen ?? 0), 0);

  // Estado vacío
  if (participants.length === 0 || totalSorteos === 0) {
    statsGrid.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--color-text-dim);">
        <div style="font-size:48px;margin-bottom:16px;opacity:0.5;">📊</div>
        <div style="font-size:16px;font-weight:500;">Sin datos aún</div>
        <div style="font-size:13px;opacity:0.7;margin-top:8px;">Haz un sorteo para ver estadísticas</div>
      </div>`;
    return;
  }

  // Ordenar por victorias
  const sorted = participants
    .map(p => ({ ...p, chosen: sessionStats[p.id]?.chosen ?? 0 }))
    .sort((a, b) => b.chosen - a.chosen);

  // Generar lista simple
  const list = sorted.map((p, i) => {
    const colors = getAvatarColorsByName(p.name);
    const chosen = sessionStats[p.id]?.chosen ?? 0;
    const pct = totalSorteos > 0 ? Math.round(chosen / totalSorteos * 100) : 0;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:8px;">
        <div style="width:28px;text-align:center;font-size:${i < 3 ? '20px' : '14px'};color:var(--color-text-dim);">${medal}</div>
        <div style="width:40px;height:40px;border-radius:50%;background:${colors.gradient || colors.color};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;color:#fff;">
          ${escapeHtmlFn(p.name.slice(0, 2).toUpperCase())}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtmlFn(p.name)}</div>
          <div style="font-size:12px;color:var(--color-text-dim);">${chosen} sorteo${chosen !== 1 ? 's' : ''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:600;font-size:16px;color:var(--color-accent);">${pct}%</div>
        </div>
      </div>`;
  }).join('');

  // Resumen simple
  const summary = `
    <div style="text-align:center;padding:20px;margin-bottom:16px;background:rgba(255,255,255,0.02);border-radius:16px;border:1px solid rgba(255,255,255,0.05);">
      <div style="font-size:36px;font-weight:700;color:var(--color-accent);">${totalSorteos}</div>
      <div style="font-size:13px;color:var(--color-text-dim);margin-top:4px;">sorteos totales</div>
    </div>`;

  statsGrid.innerHTML = summary + list;
}

/**
 * Genera un SVG de donut chart animado con los datos de estadísticas.
 * Cada arco representa la proporción de victorias de un participante.
 */
function buildDonutChart(sorted, sessionStats, total) {
  if (sorted.length < 2 || total === 0) return '';

  const PALETTE = [120,150,80,55,30,0,330,300,270,240,200,170];
  const R = 37; // radio del arco
  const CIRC = 2 * Math.PI * R; // circunferencia
  const GAP = 2; // espacio entre arcos
  const CX = 52, CY = 52, SIZE = 104;

  const withChosen = sorted.filter(p => (sessionStats[p.id]?.chosen ?? 0) > 0);
  let cumOffset = 0; // en px sobre la circunferencia

  const circles = withChosen.map((p, i) => {
    const chosen = sessionStats[p.id]?.chosen ?? 0;
    const frac   = chosen / total;
    const hue    = PALETTE[i % PALETTE.length];
    const arc    = frac * CIRC - GAP;
    if (arc <= 0) return '';

    // stroke-dashoffset: empieza en -π/2 (arriba) → offset = CIRC*0.25 - cumOffset
    const offset = CIRC * 0.25 - cumOffset;
    const delay  = i * 90;

    // La circunferencia total de la animación: el arco crece de 0 a arc
    const circle = `
      <circle cx="${CX}" cy="${CY}" r="${R}"
        fill="none"
        stroke="hsl(${hue},92%,56%)"
        stroke-width="14"
        stroke-dasharray="${arc} ${CIRC - arc}"
        stroke-dashoffset="${offset}"
        stroke-linecap="butt"
        style="
          filter: drop-shadow(0 0 4px hsla(${hue},95%,65%,0.8));
          animation: donutArcGrow 650ms cubic-bezier(0.34,1.3,0.64,1) ${delay}ms both;
          --arc-full: ${arc};
        "
      />`;
    cumOffset += frac * CIRC;
    return circle;
  }).join('');

  // Fondo del donut (anillo gris)
  const bg = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
    stroke="rgba(255,255,255,0.06)" stroke-width="14"/>`;

  // Círculo interior para el "agujero"
  const hole = `<circle cx="${CX}" cy="${CY}" r="${R - 7}"
    fill="var(--color-bg-card)" stroke="none"/>`;

  // Texto central
  const centerText = `
    <text x="${CX}" y="${CY - 5}" text-anchor="middle"
          font-family="'Bebas Neue',sans-serif" font-size="17"
          fill="var(--color-accent)">
      ${total}
    </text>
    <text x="${CX}" y="${CY + 8}" text-anchor="middle"
          font-family="'Plus Jakarta Sans',sans-serif" font-size="5.5"
          font-weight="700" fill="var(--color-text-dim)" letter-spacing="0.8">
      SORTEOS
    </text>`;

  // Leyenda
  const legendItems = withChosen.slice(0, 8).map((p, i) => {
    const chosen = sessionStats[p.id]?.chosen ?? 0;
    const pct    = Math.round(chosen / total * 100);
    const hue    = PALETTE[i % PALETTE.length];
    return `
      <div class="donut-legend-item" style="animation-delay:${i * 60 + 200}ms">
        <span class="donut-legend-dot"
              style="background:hsl(${hue},92%,56%);
                     box-shadow:0 0 7px hsla(${hue},95%,65%,0.8);"></span>
        <span class="donut-legend-name">${escapeHtmlFn(p.name)}</span>
        <span class="donut-legend-pct">${pct}%</span>
      </div>`;
  }).join('');

  return `
    <div class="donut-chart-wrap">
      <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"
           class="donut-svg" role="img" aria-label="Gráfico de participación">
        ${bg}${circles}${hole}${centerText}
      </svg>
      <div class="donut-legend">${legendItems}</div>
    </div>`;
}

export function showScreen(name) {
  ['home', 'stats'].forEach(key => {
    const el = document.getElementById(`screen-${key}`);
    if (!el) return;
    el.classList.toggle('active', key === name);
    if (key === name && name === 'stats') {
      renderStats();
      switchStatsTab('stats'); // siempre empieza en stats
    }
  });
}

// ══════════════════════════════════════════════════════════
// HISTORIAL DE SORTEOS
// ══════════════════════════════════════════════════════════

export function switchStatsTab(tab) {
  const isStats = tab === 'stats';
  tabStats?.classList.toggle('active',   isStats);
  tabHistory?.classList.toggle('active', !isStats);

  // Usar los IDs correctos del HTML
  if (statsGrid)   statsGrid.style.display   = isStats ? 'flex' : 'none';
  if (historyList) historyList.style.display = isStats ? 'none' : 'flex';

  if (!isStats) renderHistory();
}

function renderHistory() {
  if (!historyList) return;
  const history = stateFn().getKey('sessionHistory') || [];

  if (history.length === 0) {
    historyList.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--color-text-dim);">
        <div style="font-size:48px;margin-bottom:16px;opacity:0.5;">📝</div>
        <div style="font-size:16px;font-weight:500;">Sin historial</div>
        <div style="font-size:13px;opacity:0.7;margin-top:8px;">Los sorteos aparecerán aquí</div>
      </div>`;
    return;
  }

  const modeLabels = {
    normal: '🎲', elimination: '❌', team: '👥',
    order: '📋', duel: '⚔️', revenge: '🎯',
    russian: '🔫', bomb: '💣', dice: '🎲', coin: '🪙'
  };

  historyList.innerHTML = history.slice(0, 30).map((entry) => {
    const colors = getAvatarColorsByName(entry.winnerName);
    const time = new Date(entry.timestamp).toLocaleTimeString('es', { 
      hour: '2-digit', minute: '2-digit' 
    });

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,0.02);border-radius:10px;margin-bottom:6px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${colors.gradient || colors.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;">
          ${escapeHtmlFn(entry.winnerName.slice(0, 2).toUpperCase())}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;font-size:14px;">${escapeHtmlFn(entry.winnerName)}</div>
          <div style="font-size:11px;color:var(--color-text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtmlFn(entry.question)}</div>
        </div>
        <div style="text-align:right;font-size:11px;color:var(--color-text-dim);">
          <div>${modeLabels[entry.mode] || '🎲'}</div>
          <div>${time}</div>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// PERSISTENCIA DE ESTADÍSTICAS
// ══════════════════════════════════════════════════════════

/**
 * Persiste las estadísticas actuales en localStorage.
 * Se llama después de cada sorteo.
 */
export function persistStats() {
  try {
    const { participants, sessionStats } = stateFn().get();
    // Guardar mapa nombre→stats (no IDs, que cambian entre sesiones)
    const toSave = {};
    participants.forEach(p => {
      if (sessionStats[p.id]) {
        toSave[p.name] = sessionStats[p.id];
      }
    });
    localStorage.setItem(STATS_KEY, JSON.stringify({ stats: toSave, savedAt: Date.now() }));
  } catch { /* ignora */ }
}

/**
 * Carga estadísticas previas y las fusiona con los participantes actuales.
 * Se llama al cargar un grupo o añadir participantes.
 */
export function loadPersistedStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return;
    const { stats } = JSON.parse(raw);
    const participants = stateFn().getKey('participants');
    const current = { ...stateFn().getKey('sessionStats') };
    let merged = false;
    participants.forEach(p => {
      if (stats[p.name] && !current[p.id]?.chosen) {
        current[p.id] = stats[p.name];
        merged = true;
      }
    });
    if (merged) stateFn().set({ sessionStats: current });
  } catch { /* ignora */ }
}
