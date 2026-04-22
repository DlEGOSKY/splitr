/* ============================================================
   THEMES.JS — Sistema de temas de color
   Gestiona la aplicación y persistencia de temas visuales.
   ============================================================ */

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════

const THEMES = [
  'cyberpunk','fire','matrix','ocean','sunset','neonpink','deepspace','toxic',
  'blood','light','arctic','goldrush','vaporwave','jungle','midnight','lava',
  'sakura','slate','candy','storm'
];

const THEME_KEY = 'qp-theme';

const META_COLORS = {
  cyberpunk: '#090912', fire:      '#0a0500',
  matrix:    '#000300', ocean:     '#020810',
  sunset:    '#0d0008', neonpink:  '#0a0008',
  deepspace: '#03020d', toxic:     '#010a00',
  blood:     '#0a0000', light:     '#f0f0f8',
  arctic:    '#f8faff', goldrush:  '#0a0800',
  vaporwave: '#0d0018', jungle:    '#020d00',
  midnight:  '#00020f', lava:      '#0a0300',
  sakura:    '#0d0008', slate:     '#080a0f',
  candy:     '#08001a', storm:     '#03050e',
};

// ══════════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════════

let themePanel = null;
let themeBackdrop = null;
let getPrefsFn = null;

// ══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════

/**
 * Inicializa el sistema de temas con las referencias DOM y callbacks necesarios.
 * @param {Object} config - Configuración
 * @param {Function} config.getPrefs - Función que retorna las preferencias del usuario
 */
export function initThemes({ getPrefs }) {
  getPrefsFn = getPrefs;
  
  // Referencias DOM
  themePanel = document.getElementById('theme-panel');
  themeBackdrop = document.getElementById('theme-backdrop');
  
  // Cargar tema guardado
  setupTheme();
}

// ══════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ══════════════════════════════════════════════════════════

/**
 * Aplica el tema al <html> y lo persiste en localStorage.
 * Actualiza el swatch activo en el panel.
 */
export function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'cyberpunk';
  
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  // Actualizar swatches activos
  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  // Actualizar meta theme-color para PWA
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', META_COLORS[theme] ?? '#090912');

  // Feedback háptico
  const prefs = getPrefsFn?.() || {};
  if (prefs.vibration && 'vibrate' in navigator) {
    navigator.vibrate([8, 6, 14]);
  }
}

/**
 * Carga el tema guardado al iniciar la app.
 */
export function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY) ?? 'cyberpunk';
  applyTheme(saved);
}

export function toggleThemePanel() {
  const isOpen = themePanel?.style.display !== 'none';
  if (isOpen) {
    closeThemePanel();
  } else {
    openThemePanel();
  }
}

export function openThemePanel() {
  if (themePanel) themePanel.style.display = 'block';
  if (themeBackdrop) themeBackdrop.style.display = 'block';
  
  // Reset animación
  const inner = themePanel?.querySelector('.theme-panel-inner');
  if (inner) {
    inner.style.animation = 'none';
    requestAnimationFrame(() => {
      inner.style.animation = '';
    });
  }
}

export function closeThemePanel() {
  if (themePanel) themePanel.style.display = 'none';
  if (themeBackdrop) themeBackdrop.style.display = 'none';
}

// ══════════════════════════════════════════════════════════
// EXPORTS ADICIONALES
// ══════════════════════════════════════════════════════════

export { THEMES };
