/* ============================================================
   RUSSIAN.JS — Ruleta Rusa
   Mecánica de turno por turno con 6 cámaras y 1 bala.
   ============================================================ */

import { getAvatarColorsByName, getInitials } from './participants.js';
import { state } from './state.js';

// ══════════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════════

// Callbacks necesarios
let spawnParticlesFn = null;
let playWinnerFanfareFn = null;
let showResultFn = null;
let showToastFn = null;
let getPrefsFn = null;

// ══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════

/**
 * Inicializa el módulo de ruleta rusa con los callbacks necesarios.
 * @param {Object} config - Configuración
 * @param {Function} config.spawnParticles - Función para generar partículas
 * @param {Function} config.playWinnerFanfare - Función para reproducir sonido
 * @param {Function} config.showResult - Función para mostrar resultado
 * @param {Function} config.showToast - Función para mostrar toast
 * @param {Function} config.getPrefs - Función que retorna las preferencias del usuario
 */
export function initRussian({ spawnParticles, playWinnerFanfare, showResult, showToast, getPrefs }) {
  spawnParticlesFn = spawnParticles;
  playWinnerFanfareFn = playWinnerFanfare;
  showResultFn = showResult;
  showToastFn = showToast;
  getPrefsFn = getPrefs;
}

// ══════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════

/**
 * Lanza la Ruleta Rusa:
 * - Tambor con 6 cámaras, 1 bala en posición aleatoria
 * - Jugadores en orden aleatorio
 * - Cada jugador jala el gatillo — la mayoría sobrevive (CLIC)
 * - Solo UNO recibe la bala (BANG) y es eliminado
 * - La probabilidad sube cada ronda: 1/6, 1/5, 1/4...
 */
export function launchRussianRoulette(participants) {
  const overlay = document.getElementById('russian-overlay');
  if (!overlay) return;

  const CHAMBERS = 6;

  // Orden aleatorio de jugadores
  const order = [...participants];
  for (let i = order.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  // Bala en posición aleatoria
  const bulletArr = new Uint32Array(1);
  crypto.getRandomValues(bulletArr);
  const bulletPos = bulletArr[0] % CHAMBERS;

  let currentTurn    = 0;
  let currentChamber = 0;
  let gameOver       = false;
  const ac = new AbortController();

  // Elementos del overlay
  const triggerBtn = document.getElementById('russian-trigger');
  const closeBtn   = document.getElementById('russian-close');
  const playerEl   = document.getElementById('russian-player');
  const oddsEl     = document.getElementById('russian-odds');
  const resultEl   = document.getElementById('russian-result');
  const chambersEl = document.getElementById('russian-chambers');
  const turnLbl    = document.getElementById('russian-turn-label');
  const gunSvg     = document.getElementById('russian-gun-svg');

  if (!triggerBtn || !closeBtn) return;

  // Resetear estado visual
  playerEl && (playerEl.textContent = '') && (playerEl.style.color = '') && (playerEl.style.textShadow = '');
  resultEl && (resultEl.style.display = 'none');
  closeBtn.style.display   = 'none';
  triggerBtn.style.display = 'none';
  overlay.style.background = '';
  overlay.style.display    = 'flex';
  state.set({ phase: 'spinning' });

  // Animar tambor al inicio
  if (gunSvg) {
    gunSvg.classList.add('spinning');
    setTimeout(() => gunSvg.classList.remove('spinning'), 700);
  }

  function updateUI() {
    if (gameOver) return;

    const player = order[currentTurn % order.length];
    const colors = getAvatarColorsByName(player.name);
    const remaining = CHAMBERS - currentChamber;
    const odds = Math.round((1 / remaining) * 100);

    // Jugador actual
    if (playerEl) {
      playerEl.textContent = player.name;
      playerEl.style.color = colors.light;
      playerEl.style.textShadow = `0 0 12px ${colors.glow}`;
    }

    // Probabilidades
    if (oddsEl) {
      oddsEl.textContent = `${odds}% de BANG`;
    }

    // Indicador de turno
    if (turnLbl) {
      turnLbl.textContent = `Turno ${currentTurn + 1}`;
    }

    // Cámaras visuales
    if (chambersEl) {
      chambersEl.innerHTML = '';
      for (let i = 0; i < CHAMBERS; i++) {
        const chamber = document.createElement('div');
        chamber.className = 'russian-chamber';
        if (i < currentChamber) chamber.classList.add('used');
        if (i === bulletPos) chamber.classList.add('bullet');
        chambersEl.appendChild(chamber);
      }
    }

    // Mostrar botón de gatillo
    triggerBtn.style.display = 'block';
  }

  function pullTrigger() {
    if (gameOver) return;

    const player = order[currentTurn % order.length];
    const colors = getAvatarColorsByName(player.name);
    const prefs = getPrefsFn?.() || {};

    triggerBtn.style.display = 'none';

    // ¿Es la bala?
    if (currentChamber === bulletPos) {
      // ¡BANG! - El jugador actual es eliminado
      gameOver = true;

      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.textContent   = 'BANG';
      }

      if (prefs.particles) spawnParticlesFn?.('#ff0020');
      if (prefs.sound) playWinnerFanfareFn?.();

      closeBtn.style.display = '';
      overlay.style.background = 'radial-gradient(circle, rgba(255,0,32,0.15) 0%, rgba(4,2,14,0.97) 70%)';

      // Registrar resultado
      state.set({ winnerId: player.id, phase: 'revealing' });
      state.recordChosen(player.id);
      state.recordHistory(player.id, player.name, state.getKey('question'), 'russian');

      try {
        const stats = JSON.parse(localStorage.getItem('qp-stats') || '{}');
        stats.russianVictims = (stats.russianVictims || 0) + 1;
        localStorage.setItem('qp-stats', JSON.stringify(stats));
      } catch (e) {}

      // Mostrar resultado después de un delay
      setTimeout(() => {
        overlay.style.display = 'none';
        showResultFn?.(player.id);
      }, 2000);

    } else {
      // CLIC - Sobrevive, siguiente turno
      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.textContent   = 'CLIC';
        resultEl.style.color   = '#4ade80';
      }

      if (prefs.vibration && 'vibrate' in navigator) {
        navigator.vibrate([30, 20, 30]);
      }

      currentChamber++;
      currentTurn++;

      // Siguiente turno después de un delay
      setTimeout(() => {
        if (resultEl) resultEl.style.display = 'none';
        updateUI();
      }, 1200);
    }
  }

  // Event listeners
  triggerBtn.addEventListener('click', pullTrigger, { signal: ac.signal });
  
  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    state.set({ phase: 'idle' });
  }, { signal: ac.signal });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && gameOver) {
      overlay.style.display = 'none';
      state.set({ phase: 'idle' });
    }
  }, { signal: ac.signal });

  // Cleanup cuando se cierra
  const originalDisplay = overlay.style.display;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        if (overlay.style.display === 'none' && originalDisplay !== 'none') {
          ac.abort();
          observer.disconnect();
        }
      }
    });
  });
  observer.observe(overlay, { attributes: true });

  // Iniciar el juego
  updateUI();
}
