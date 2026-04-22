/* ============================================================
   SETTINGS.JS — Modal de configuración y ajustes
   Gestiona el modal de settings, sync UI, save/load de preferencias.
   ============================================================ */

import { setPerformanceLevel, initPerformance } from './performance.js';

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════

const SETTINGS_KEY = 'qp-settings';

// ══════════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════════

let modalSettings = null;
let inputDefaultQuestion = null;
let settingSound = null;
let settingVibration = null;
let settingParticles = null;
let settingFlash = null;
let settingRoulette = null;
let settingGlow = null;
let settingGlowVal = null;
let settingSpeed = null;
let settingSpeedVal = null;
let settingPerformance = null;

// Callbacks necesarios
let renderSkinsPickerFn = null;
let applyGlowIntensityFn = null;
let showToastFn = null;
let stateFn = null;

// ══════════════════════════════════════════════════════════
// OBJETO DE PREFERENCIAS
// ══════════════════════════════════════════════════════════

/** Objeto vivo de preferencias — consultado por el resto del código */
export const prefs = {
  sound:     true,
  vibration: true,
  particles: true,
  flash:     true,
  roulette:  false,
  glow:      100,
  speed:     100,
  defaultQuestion: '¿Quién paga?',
};

// ══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════

/**
 * Inicializa el sistema de settings con las referencias DOM y callbacks necesarios.
 * @param {Object} config - Configuración
 * @param {Function} config.renderSkinsPicker - Función para renderizar picker de skins
 * @param {Function} config.applyGlowIntensity - Función para aplicar intensidad de glow
 * @param {Function} config.showToast - Función para mostrar toast
 * @param {Function} config.state - Función que retorna el estado actual
 */
export function initSettings({ renderSkinsPicker, applyGlowIntensity, showToast, state }) {
  renderSkinsPickerFn = renderSkinsPicker;
  applyGlowIntensityFn = applyGlowIntensity;
  showToastFn = showToast;
  stateFn = state;

  // Referencias DOM
  modalSettings = document.getElementById('modal-settings');
  inputDefaultQuestion = document.getElementById('input-default-question');
  settingSound = document.getElementById('setting-sound');
  settingVibration = document.getElementById('setting-vibration');
  settingParticles = document.getElementById('setting-particles');
  settingFlash = document.getElementById('setting-flash');
  settingRoulette = document.getElementById('setting-roulette');
  settingGlow = document.getElementById('setting-glow');
  settingGlowVal = document.getElementById('setting-glow-val');
  settingSpeed = document.getElementById('setting-speed');
  settingSpeedVal = document.getElementById('setting-speed-val');
  settingPerformance = document.getElementById('setting-performance');

  // Cargar settings al inicializar
  loadSettings();
}

// ══════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ══════════════════════════════════════════════════════════

export function loadSettings() {
  try {
    const cfg = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    prefs.sound            = cfg.sound     ?? true;
    prefs.vibration        = cfg.vibration ?? true;
    prefs.particles        = cfg.particles ?? true;
    prefs.flash            = cfg.flash     ?? true;
    prefs.roulette         = cfg.roulette  ?? false;
    prefs.glow             = cfg.glow      ?? 100;
    prefs.speed            = cfg.speed     ?? 100;
    prefs.defaultQuestion  = cfg.defaultQuestion || '¿Quién paga?';
  } catch {
    // Si hay error, usar valores por defecto
  }

  // Aplicar glow inicial
  if (applyGlowIntensityFn) {
    applyGlowIntensityFn(prefs.glow);
  }

  // Sincronizar UI
  syncSettingsUI();
}

function syncSettingsUI() {
  if (settingSound)     settingSound.checked     = prefs.sound;
  if (settingVibration) settingVibration.checked = prefs.vibration;
  if (settingParticles) settingParticles.checked = prefs.particles;
  if (settingFlash)     settingFlash.checked     = prefs.flash;
  if (settingRoulette)  settingRoulette.checked  = prefs.roulette;
  if (settingGlow) {
    settingGlow.value = prefs.glow;
    if (settingGlowVal) settingGlowVal.textContent = `${prefs.glow}%`;
  }
  if (settingSpeed) {
    settingSpeed.value = prefs.speed;
    if (settingSpeedVal) settingSpeedVal.textContent = `${(prefs.speed/100).toFixed(1)}×`;
  }
  if (settingPerformance) {
    // Cargar preferencia guardada o 'auto'
    const savedPerf = localStorage.getItem('splitr_perf_level') || 'auto';
    settingPerformance.value = savedPerf;
  }
  if (inputDefaultQuestion) inputDefaultQuestion.value = prefs.defaultQuestion;

  // Listeners para sliders en tiempo real
  if (settingGlow) {
    settingGlow.addEventListener('input', () => {
      const val = parseInt(settingGlow.value);
      if (settingGlowVal) settingGlowVal.textContent = `${val}%`;
      if (applyGlowIntensityFn) applyGlowIntensityFn(val);
    });
  }

  if (settingSpeed) {
    settingSpeed.addEventListener('input', () => {
      const val = parseInt(settingSpeed.value);
      if (settingSpeedVal) settingSpeedVal.textContent = `${(val/100).toFixed(1)}×`;
    });
  }
}

export function openSettingsModal() {
  syncSettingsUI();
  if (renderSkinsPickerFn) renderSkinsPickerFn(); // cargar picker de skins

  // Detectar si está en fullscreen para ajustar el modal
  const isFullscreen = window.innerHeight === screen.height || 
                      document.fullscreenElement || 
                      document.webkitFullscreenElement;

  if (isFullscreen) {
    modalSettings?.classList.add('fullscreen-mode');
  } else {
    modalSettings?.classList.remove('fullscreen-mode');
  }

  modalSettings?.classList.add('open');
}

export function closeSettingsModal() {
  modalSettings?.classList.remove('open');
}

export function handleSaveSettings() {
  prefs.sound    = settingSound?.checked    ?? true;
  prefs.vibration = settingVibration?.checked ?? true;
  prefs.particles = settingParticles?.checked ?? true;
  prefs.flash    = settingFlash?.checked    ?? true;
  prefs.roulette = settingRoulette?.checked ?? false;
  prefs.glow     = parseInt(settingGlow?.value   ?? '100');
  prefs.speed    = parseInt(settingSpeed?.value  ?? '100');
  prefs.defaultQuestion = inputDefaultQuestion?.value.trim() || '¿Quién paga?';

  // Guardar modo de rendimiento
  const perfLevel = settingPerformance?.value || 'auto';
  if (perfLevel === 'auto') {
    localStorage.removeItem('splitr_perf_level');
    // Re-detectar automáticamente
    initPerformance();
  } else {
    setPerformanceLevel(perfLevel);
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...prefs }));
  } catch { /* ignora */ }

  if (applyGlowIntensityFn) {
    applyGlowIntensityFn(prefs.glow);
  }

  // Aplicar pregunta por defecto si el campo está en el valor por defecto
  const state = stateFn?.() || {};
  const inputQuestion = document.getElementById('input-question');
  if (inputQuestion && (!inputQuestion.value.trim() || inputQuestion.value === '¿Quién paga?')) {
    inputQuestion.value = prefs.defaultQuestion;
    if (stateFn) {
      stateFn().set({ question: prefs.defaultQuestion });
    }
  }

  closeSettingsModal();
  if (showToastFn) showToastFn('Ajustes guardados');
}
