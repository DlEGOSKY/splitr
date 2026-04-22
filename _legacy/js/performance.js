/* ============================================================
   PERFORMANCE.JS — Detección y optimización de rendimiento
   Aplica degradación visual progresiva según capacidades del device
   ============================================================ */

// ══════════════════════════════════════════════════════════
// DETECCIÓN DE CAPACIDADES
// ══════════════════════════════════════════════════════════

const perf = {
  isSlowDevice: false,
  isMobile: false,
  prefersReducedMotion: false,
  isBackgrounded: false,
  level: 'full', // 'full' | 'medium' | 'reduced'
};

/** Detecta si el dispositivo es modesto */
function detectDeviceCapabilities() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const isTouchOnly = window.matchMedia('(hover: none)').matches;
  const isSmallScreen = window.innerWidth <= 480;
  
  perf.isMobile = isTouchOnly || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  perf.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Dispositivo lento: pocos cores, poca memoria, o móvil pequeño
  perf.isSlowDevice = cores <= 4 || mem <= 4 || (perf.isMobile && isSmallScreen);
  
  // Determinar nivel de rendimiento
  if (perf.prefersReducedMotion) {
    perf.level = 'reduced';
  } else if (perf.isSlowDevice) {
    perf.level = 'medium';
  } else {
    perf.level = 'full';
  }
  
  return perf;
}

/** Aplica clase CSS según nivel de rendimiento */
function applyPerformanceMode() {
  const html = document.documentElement;
  
  html.classList.remove('perf-full', 'perf-medium', 'perf-reduced');
  
  if (perf.level === 'reduced') {
    html.classList.add('perf-reduced');
  } else if (perf.level === 'medium') {
    // Medium usa los valores automáticos de media query
  } else {
    html.classList.add('perf-full');
  }
}

// ══════════════════════════════════════════════════════════
// VISIBILITY API — Pausar efectos cuando la pestaña está oculta
// ══════════════════════════════════════════════════════════

let animationFrameCallbacks = new Set();
let isTabVisible = true;

function handleVisibilityChange() {
  isTabVisible = !document.hidden;
  perf.isBackgrounded = document.hidden;
  
  if (document.hidden) {
    // Pausar animaciones costosas
    document.documentElement.classList.add('tab-hidden');
  } else {
    document.documentElement.classList.remove('tab-hidden');
  }
}

// ══════════════════════════════════════════════════════════
// THROTTLED ANIMATION FRAME — Para efectos no críticos
// ══════════════════════════════════════════════════════════

let lastFrameTime = 0;
const TARGET_FPS = perf.isSlowDevice ? 30 : 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

/** RAF throttleado para efectos secundarios */
export function requestThrottledFrame(callback) {
  return requestAnimationFrame((timestamp) => {
    if (perf.isBackgrounded) return;
    
    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= FRAME_DURATION) {
      lastFrameTime = timestamp;
      callback(timestamp);
    } else {
      requestThrottledFrame(callback);
    }
  });
}

// ══════════════════════════════════════════════════════════
// PARTICLE BUDGET — Limitar partículas según rendimiento
// ══════════════════════════════════════════════════════════

/** Calcula cuántas partículas usar según el nivel de rendimiento */
export function getParticleCount(baseCount) {
  const multiplier = perf.level === 'reduced' ? 0.3 
                   : perf.level === 'medium' ? 0.6 
                   : 1;
  return Math.max(1, Math.floor(baseCount * multiplier));
}

/** Calcula duración de animación según rendimiento */
export function getAnimationDuration(baseDuration) {
  // En modo reducido, animaciones más cortas
  if (perf.prefersReducedMotion) return baseDuration * 0.3;
  if (perf.level === 'reduced') return baseDuration * 0.7;
  return baseDuration;
}

// ══════════════════════════════════════════════════════════
// EXPORTS Y INICIALIZACIÓN
// ══════════════════════════════════════════════════════════

export { perf };

export function initPerformance() {
  detectDeviceCapabilities();
  applyPerformanceMode();
  
  // Escuchar cambios de visibilidad
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Escuchar cambios en preferencias de movimiento
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    perf.prefersReducedMotion = e.matches;
    detectDeviceCapabilities();
    applyPerformanceMode();
  });
  
  // Log para debug
  console.log('[Performance]', perf.level, { 
    cores: navigator.hardwareConcurrency, 
    mem: navigator.deviceMemory,
    mobile: perf.isMobile 
  });
  
  return perf;
}

/** Permite al usuario forzar un modo específico */
export function setPerformanceLevel(level) {
  if (['full', 'medium', 'reduced'].includes(level)) {
    perf.level = level;
    applyPerformanceMode();
    // Guardar preferencia
    try {
      localStorage.setItem('splitr_perf_level', level);
    } catch (e) {}
  }
}

/** Carga preferencia guardada del usuario */
export function loadPerformancePreference() {
  try {
    const saved = localStorage.getItem('splitr_perf_level');
    if (saved && ['full', 'medium', 'reduced'].includes(saved)) {
      perf.level = saved;
      applyPerformanceMode();
    }
  } catch (e) {}
}
