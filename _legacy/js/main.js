/* ============================================================
   MAIN.JS — Punto de entrada de la aplicación
   Se ejecuta cuando DOMContentLoaded ya disparó
   (los módulos ES son diferidos por defecto).
   ============================================================ */

import { initUI }          from './ui.js';
import { initAudio }       from './audio.js';

// ── REGISTRO DEL SERVICE WORKER ──
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    console.log('[SW] Registrado:', reg.scope);
  } catch (err) {
    console.warn('[SW] Error al registrar:', err);
  }
}

// ── ACTIVAR AUDIO EN EL PRIMER TOQUE ──
// Los navegadores modernos requieren un gesto del usuario
// para poder crear el AudioContext.
function setupAudioOnFirstTouch() {
  const unlock = () => {
    initAudio();
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown',     unlock);
  };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown',     unlock, { once: true });
}

// ── PUNTO DE ENTRADA ──
// Los módulos ES siempre se ejecutan después de que el DOM
// está completamente parseado, equivalente a DOMContentLoaded.
function main() {
  // 1. Mostrar la pantalla principal
  document.getElementById('screen-home')?.classList.add('active');

  // 2. Inicializar la UI
  initUI();

  // 3. Preparar audio
  setupAudioOnFirstTouch();

  // 4. Registrar Service Worker en segundo plano
  registerSW();

  console.log('[¿Quién Paga?] App lista ✓');
}

main();
