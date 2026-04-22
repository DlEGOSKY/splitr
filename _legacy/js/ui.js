/* ============================================================
   UI.JS v2 — Orquestador de interfaz con mejoras Visual/UX:
   · Ripple effect en todos los botones
   · Countdown 3-2-1-¡YA! antes del barrido
   · Hold-to-spin: mantener presionado para sortear
   · Hover lift en avatares (CSS), transiciones suaves
   · Grid denso cuando hay muchos participantes
   · Safe-area / mobile refinements (en CSS)
   ============================================================ */

import { state }           from './state.js';
import { getAvatarColors, getAvatarColorsByName, getInitials, addParticipant,
         removeParticipant, toggleExclude, setLuck }  from './participants.js';
import { selectOne, selectMultiple, selectOrder,
         buildAnimationSequence }                    from './selector.js';
import { playWinnerFanfare, playScanTick,
         playBuildUp, playAddParticipant, playError } from './audio.js';
import { saveGroup, loadAllGroups, loadGroup,
         deleteGroup, savePreferences, loadPreferences,
         SKIN_CATALOG, getUnlockedSkins, unlockSkin,
         getActiveSkin, setActiveSkin, purchaseSkin } from './storage.js';
import { Icons, luckIcon }                           from './icons.js';
import { purchase, restorePurchases, isTWA, PRICES } from './billing.js';
import {
  _isSlowDevice, _introBase,
  introNormal, introElimination, introTeam, introOrder, introDuel, introRevenge,
  introNormalMissile, introNormalSniper,
  introElimChairs, introElimSlots,
  introTeamMagnet, introTeamCards,
  introOrderRace, introOrderWheel,
  introRevengeTarget, introRevengeStorm,
  introDuelWestern, introDuelBoxing
} from './intros.js';
import { initPerformance, perf, getParticleCount, setPerformanceLevel, loadPerformancePreference } from './performance.js';
import { initPaywall, openPaywall, closePaywall } from './paywall.js';
import { initRoulette, runRouletteAnimation } from './roulette.js';
import { initRussian, launchRussianRoulette } from './russian.js';
import { initThemes, applyTheme, setupTheme, toggleThemePanel, openThemePanel, closeThemePanel } from './themes.js';
import { initSettings, prefs, loadSettings, openSettingsModal, closeSettingsModal, handleSaveSettings } from './settings.js';
import { initStats, renderStats, showScreen, switchStatsTab, persistStats, loadPersistedStats } from './stats.js';

// Utilidad global — debe estar antes que cualquier función que la use
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/**
 * Aplica la intensidad del glow a toda la app.
 * @param {number} intensity - Valor de 0 a 100
 */
function applyGlowIntensity(intensity) {
  const factor = intensity / 100;
  document.documentElement.style.setProperty('--glow-intensity', factor.toString());
  
  // Aplicar opacidad a elementos con glow
  document.querySelectorAll('.participant-card, .btn, .modal').forEach(el => {
    el.style.setProperty('--glow-opacity', factor.toString());
  });
}

// ══════════════════════════════════════════════════════════
// REFERENCIAS AL DOM — asignadas en initUI()
// ══════════════════════════════════════════════════════════
let participantsGrid, inputParticipant, btnAddParticipant;
let inputQuestion, btnSortear, modeButtons, counterChip;
let resultOverlay, resultAvatarBig, resultName, resultQuestion, resultLabel;
let btnResultClose, btnResultAgain, btnResultNext, btnResultShare, particlesContainer;
let resultProgress, progressDots;
let modalGroups, groupsList, inputGroupName, btnSaveGroup, btnModalClose;
let installBanner, btnInstall, btnInstallDismiss;
let toastEl, statsGrid, countdownOverlay;
let avatarMenu, avatarMenuBackdrop, avatarMenuPauseBtn, avatarMenuDeleteBtn;
let luckStars, luckMenuHint;
let onboardingHint;
let teamSizeDec, teamSizeInc, teamSizeVal;
let modeDescPanels;
let themePanel, themeBackdrop;
let modalSettings, inputDefaultQuestion;
let settingSound, settingVibration, settingParticles, settingFlash, settingRoulette;
let settingGlow, settingGlowVal, settingSpeed, settingSpeedVal;
let historyList, tabStats, tabHistory;
let rouletteOverlay, rouletteCanvas, rouletteLabel;
let russianOverlay, russianTrigger, russianClose, russianPlayer,
    russianOdds, russianResult, russianChambers, russianTurnLabel;
let btnVoice;

// ══════════════════════════════════════════════════════════
// ESTADO INTERNO DE UI
// ══════════════════════════════════════════════════════════
let _deferredInstallPrompt = null;
let _toastTimer            = null;
let _prefs                 = {};

// Estado del hold-to-spin
const HOLD_DURATION = 800; // ms que hay que mantener presionado
let _holdTimer      = null;
let _holdStart      = 0;
let _holdRafId      = null;
let _holdRingCircle = null; // referencia al <circle> SVG del arco

const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// DETECCIÓN DE RENDIMIENTO — reduce efectos en móviles lentos
// ══════════════════════════════════════════════════════════
function detectPerformance() {
  // Detectar dispositivos con poca RAM o CPU lenta
  const lowMemory  = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 2;
  const lowCores   = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSlowDevice = lowMemory || lowCores || prefersReduced;

  if (isSlowDevice) {
    document.documentElement.setAttribute('data-perf', 'low');
    // Desactivar partículas y flash automáticamente en dispositivos lentos
    if (prefersReduced) {
      prefs.particles = false;
      prefs.flash     = false;
    }
  } else {
    document.documentElement.setAttribute('data-perf', 'high');
  }
}

export function initUI() {
  // Inicializar sistema de rendimiento antes que nada
  initPerformance();
  loadPerformancePreference();
  
  participantsGrid  = $('participants-grid');
  inputParticipant  = $('input-participant');
  btnAddParticipant = $('btn-add-participant');
  inputQuestion     = $('input-question');
  btnSortear        = $('btn-sortear');
  modeButtons       = document.querySelectorAll('.mode-btn');
  counterChip       = $('counter-chip');

  resultOverlay      = $('result-overlay');
  resultAvatarBig    = $('result-avatar-big');
  resultName         = $('result-name');
  resultQuestion     = $('result-question');
  resultLabel        = $('result-label');
  btnResultClose     = $('btn-result-close');
  btnResultAgain     = $('btn-result-again');
  btnResultNext      = $('btn-result-next');
  btnResultShare     = $('btn-result-share');
  particlesContainer = $('particles');
  resultProgress     = $('result-progress');
  progressDots       = $('progress-dots');
  countdownOverlay   = $('countdown-overlay');

  teamSizeDec    = $('team-size-dec');
  teamSizeInc    = $('team-size-inc');
  teamSizeVal    = $('team-size-val');
  modeDescPanels = document.querySelectorAll('.mode-desc-panel');
  themePanel     = $('theme-panel');
  themeBackdrop  = $('theme-backdrop');
  modalSettings        = $('modal-settings');
  inputDefaultQuestion = $('input-default-question');
  settingSound         = $('setting-sound');
  settingVibration     = $('setting-vibration');
  settingParticles     = $('setting-particles');
  settingFlash         = $('setting-flash');
  settingRoulette      = $('setting-roulette');
  settingGlow          = $('setting-glow');
  settingGlowVal       = $('setting-glow-val');
  settingSpeed         = $('setting-speed');
  settingSpeedVal      = $('setting-speed-val');

  historyList    = $('history-list');
  tabStats       = $('tab-stats');
  tabHistory     = $('tab-history');
  rouletteOverlay = $('roulette-overlay');
  rouletteCanvas  = $('roulette-canvas');
  rouletteLabel   = $('roulette-label');
  russianOverlay   = $('russian-overlay');
  russianTrigger   = $('russian-trigger');
  russianClose     = $('russian-close');
  russianPlayer    = $('russian-player');
  russianOdds      = $('russian-odds');
  russianResult    = $('russian-result');
  russianChambers  = $('russian-chambers');
  russianTurnLabel = $('russian-turn-label');
  btnVoice        = $('btn-voice');

  // Tutorial de instalación
  // Reset stats
  $('btn-reset-stats')?.addEventListener('click', () => {
    if (!$('btn-reset-stats').dataset.confirming) {
      $('btn-reset-stats').dataset.confirming = '1';
      $('btn-reset-stats').style.color = 'var(--color-impact)';
      showToast('Toca de nuevo para confirmar el reset');
      setTimeout(() => {
        const b = $('btn-reset-stats');
        if (b) { delete b.dataset.confirming; b.style.color = ''; }
      }, 3000);
    } else {
      delete $('btn-reset-stats').dataset.confirming;
      $('btn-reset-stats').style.color = '';
      state.set({ sessionStats: {}, sessionHistory: [] });
      localStorage.removeItem('qp-stats');
      localStorage.removeItem('qp-history');
      renderStats();
      showToast('Estadísticas reseteadas');
    }
  });

  $('btn-help-close')?.addEventListener('click', () => {
    $('modal-help').style.display = 'none';
  });
  $('btn-help')?.addEventListener('click', () => {
    const m = $('modal-help');
    if (m) m.style.display = m.style.display === 'none' ? 'flex' : 'none';
  });

  // Sub-modos del torneo
  const subDescs = {
    bracket: 'Bracket completo tipo copa — ves todos los emparejamientos y sorteás cada duelo.',
    rounds:  'Ronda a ronda — solo ves el duelo actual, avanzas manualmente con animación.',
    auto:    'Automático — la app sortea todo sola y revela al campeón final.',
  };
  document.querySelectorAll('.tournament-sub-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tournament-sub-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _tournamentSubMode = btn.dataset.sub;
      const descEl = document.getElementById('tournament-sub-desc');
      if (descEl) descEl.textContent = subDescs[btn.dataset.sub] ?? '';
    });
  });

  // Tabs del modal de ayuda
  document.querySelectorAll('.help-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.help-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const panel = document.getElementById(`htab-${tab.dataset.htab}`);
      if (panel) panel.style.display = 'flex';
    });
  });

  detectPerformance();

  // ── Splash screen — ocultar tras animación ──
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.addEventListener('animationend', () => splash.classList.add('hidden'), { once: true });
  }

  // Inicializar el tema guardado
  setupTheme();

  // Cargar personalización guardada
  loadSettings();

  modalGroups    = $('modal-groups');
  groupsList     = $('groups-list');
  inputGroupName = $('input-group-name');
  btnSaveGroup   = $('btn-save-group');
  btnModalClose  = $('btn-modal-close');

  installBanner     = $('install-banner');
  btnInstall        = $('btn-install');
  btnInstallDismiss = $('btn-install-dismiss');

  toastEl   = $('toast');
  statsGrid = $('stats-grid');
  avatarMenu          = $('avatar-menu');
  avatarMenuBackdrop  = $('avatar-menu-backdrop');
  avatarMenuPauseBtn  = $('avatar-menu-pause');
  avatarMenuDeleteBtn = $('avatar-menu-delete');
  luckStars           = document.querySelectorAll('.luck-star');
  luckMenuHint        = $('luck-menu-hint');
  onboardingHint      = $('onboarding-hint');

  // Cargar preferencias guardadas
  _prefs = loadPreferences();
  if (inputQuestion && _prefs.lastQuestion) {
    inputQuestion.value = _prefs.lastQuestion;
    state.set({ question: _prefs.lastQuestion });
  }
  if (_prefs.lastMode) {
    state.set({ mode: _prefs.lastMode });
    // Sincronizar el panel de descripción inmediatamente
    updateModeDescription(_prefs.lastMode);
  }

  // Inyectar el SVG de anillo hold-to-spin en el botón sortear
  injectHoldRing();

  // Registrar ripple en todos los botones de la app
  setupRipples();

  // Configurar menú contextual de avatares
  setupAvatarMenu();

  // Suscribirse a cambios de estado
  state.subscribe((newState, prevState) => {
    const pChanged = JSON.stringify(newState.participants)      !== JSON.stringify(prevState?.participants);
    const eChanged = JSON.stringify(newState.eliminatedIds)     !== JSON.stringify(prevState?.eliminatedIds);
    const oChanged = newState.orderRevealIndex                  !== prevState?.orderRevealIndex;
    const tChanged = newState.teamSize                          !== prevState?.teamSize;
    const dChanged = JSON.stringify(newState.duelIds)           !== JSON.stringify(prevState?.duelIds);
    const rChanged = JSON.stringify(newState.russianSurvivors)  !== JSON.stringify(prevState?.russianSurvivors);
    const vChanged = newState.revengeTarget                     !== prevState?.revengeTarget;

    if (!prevState || pChanged || eChanged) {
      renderParticipants();
      updateCounter();
    }
    // Actualizar clases de duelo cuando duelIds cambia (sin re-render completo)
    if (dChanged && newState.mode === 'duel') {
      applyDuelClasses(newState.duelIds || []);
    }
    if (!prevState || pChanged || eChanged || oChanged || tChanged || dChanged || rChanged || vChanged) {
      updateSortButton();
    }
    if (!prevState || newState.mode   !== prevState?.mode)  updateModeButtons();
    if (!prevState || newState.phase  !== prevState?.phase) updatePhaseUI(newState.phase);
  });

  bindEvents();
  renderParticipants();
  updateCounter();
  updateSortButton();
  updateModeButtons();
}

// ══════════════════════════════════════════════════════════
// RIPPLE EFFECT — se añade a todos los .btn del documento
// ══════════════════════════════════════════════════════════

/**
 * Registra el efecto ripple en todos los botones actuales y futuros.
 * Usa delegación de eventos para capturar botones añadidos dinámicamente.
 */
function setupRipples() {
  document.addEventListener('pointerdown', e => {
    const btn = e.target.closest('.btn');
    if (!btn || btn.disabled) return;
    spawnRipple(btn, e);
  });
}

// ══════════════════════════════════════════════════════════
// MENÚ CONTEXTUAL DE AVATARES
// ══════════════════════════════════════════════════════════

// ID del participante actualmente abierto en el menú
let _menuParticipantId = null;

/**
 * Configura el menú contextual global de avatares.
 * Un solo menú flotante que se reposiciona sobre el avatar tocado.
 */
function setupAvatarMenu() {
  if (!avatarMenu) return;

  // Pausar/reanudar
  avatarMenuPauseBtn?.addEventListener('click', () => {
    if (!_menuParticipantId) return;
    toggleExclude(_menuParticipantId);
    const p = state.getKey('participants').find(p => p.id === _menuParticipantId);
    showToast(p?.excluded ? `${p.name} pausado` : `${p.name} reactivado`);
    if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([12, 8, 20]); // tap añadir
    closeAvatarMenu();
  });

  // Eliminar con confirmación visual inline
  avatarMenuDeleteBtn?.addEventListener('click', () => {
    if (!_menuParticipantId) return;
    const p = state.getKey('participants').find(p => p.id === _menuParticipantId);
    const id = _menuParticipantId;
    closeAvatarMenu();

    // Animar salida del avatar y luego eliminar
    const el = participantsGrid?.querySelector(`[data-id="${id}"]`);
    // Confirmación: primer click → botón se pone rojo con "¿Seguro?", segundo click → elimina
    const deleteBtn = avatarMenuDeleteBtn;
    if (deleteBtn && !deleteBtn.dataset.confirming) {
      deleteBtn.dataset.confirming = '1';
      deleteBtn.querySelector('.avatar-menu-label').textContent = '¿Eliminar?';
      deleteBtn.querySelector('.avatar-menu-sub').textContent   = 'Toca de nuevo para confirmar';
      deleteBtn.style.background = 'rgba(255,0,60,0.15)';
      deleteBtn.style.borderColor = 'rgba(255,0,60,0.5)';
      // Auto-cancelar en 3s
      setTimeout(() => {
        if (deleteBtn.dataset.confirming) {
          delete deleteBtn.dataset.confirming;
          deleteBtn.querySelector('.avatar-menu-label').textContent = 'Eliminar';
          deleteBtn.querySelector('.avatar-menu-sub').textContent   = 'Borrarlo del grupo';
          deleteBtn.style.background = '';
          deleteBtn.style.borderColor = '';
        }
      }, 3000);
      return;
    }
    delete deleteBtn?.dataset.confirming;
    if (el) {
      el.style.transition = 'transform 250ms cubic-bezier(0.55,0,1,0.45), opacity 250ms ease';
      el.style.transform  = 'scale(0.3) rotate(10deg)';
      el.style.opacity    = '0';
    }
    setTimeout(() => {
      removeParticipant(id);
      showToast(`${escapeHtml(p?.name ?? '')} eliminado`);
    }, 230);
  });

  // Backdrop cierra el menú al tocar fuera
  avatarMenuBackdrop?.addEventListener('click', closeAvatarMenu);

  // Escape key cierra el menú
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAvatarMenu();
  });
}

/**
 * Abre el menú contextual posicionado encima del avatar tocado.
 * @param {string} participantId
 * @param {HTMLElement} avatarWrapEl - el elemento .avatar-wrap
 */
function openAvatarMenu(participantId, avatarWrapEl) {
  if (!avatarMenu) return;

  _menuParticipantId = participantId;
  const p = state.getKey('participants').find(p => p.id === participantId);
  if (!p) return;

  // Actualizar ícono y texto del botón pausar según estado actual
  if (avatarMenuPauseBtn) {
    const isPaused = p.excluded;
    avatarMenuPauseBtn.classList.toggle('active-pause', isPaused);
    avatarMenuPauseBtn.querySelector('.avatar-menu-icon').innerHTML = isPaused
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
    avatarMenuPauseBtn.querySelector('.avatar-menu-label').textContent = isPaused ? 'Reactivar' : 'Pausar';
    avatarMenuPauseBtn.querySelector('.avatar-menu-sub').textContent   = isPaused
      ? 'Vuelve a participar'
      : 'Salta esta ronda';
  }

  // Inicializar el selector de suerte con el valor actual del participante
  updateLuckUI(participantId, p.luck);

  // Calcular posición: centrado sobre el avatar, encima o debajo según espacio
  const rect        = avatarWrapEl.getBoundingClientRect();
  const menuWidth   = 200;
  const menuHeight  = 200; // más alto por el luck editor
  const arrowHeight = 8;
  const margin      = 8;

  let left = rect.left + rect.width / 2 - menuWidth / 2;
  // Evitar que se salga por los lados
  left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));

  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openBelow  = spaceAbove < menuHeight + arrowHeight + 10;

  avatarMenu.classList.toggle('below', openBelow);

  let top;
  if (openBelow) {
    top = rect.bottom + arrowHeight + 2;
  } else {
    top = rect.top - menuHeight - arrowHeight - 4;
  }

  avatarMenu.style.left    = `${left}px`;
  avatarMenu.style.top     = `${top}px`;
  avatarMenu.style.display = 'block';

  // Mostrar backdrop
  if (avatarMenuBackdrop) avatarMenuBackdrop.style.display = 'block';

  // Vibración suave de apertura
  if ('vibrate' in navigator) navigator.vibrate(8);
}

function closeAvatarMenu() {
  if (avatarMenu)         avatarMenu.style.display = 'none';
  if (avatarMenuBackdrop) avatarMenuBackdrop.style.display = 'none';
  _menuParticipantId = null;
}

/**
 * Crea y anima un elemento ripple en el botón en la posición del toque.
 */
function spawnRipple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x    = e.clientX - rect.left;
  const y    = e.clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.className = 'ripple-wave';
  ripple.style.setProperty('--ripple-size', `${size}px`);
  ripple.style.setProperty('--ripple-x',    `${x}px`);
  ripple.style.setProperty('--ripple-y',    `${y}px`);

  btn.appendChild(ripple);
  // Limpiar después de la animación (550ms según el keyframe)
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

// ══════════════════════════════════════════════════════════
// HOLD-TO-SPIN — el botón sortear requiere mantener presionado
// ══════════════════════════════════════════════════════════

/**
 * Inserta el SVG circular de progreso dentro del botón sortear.
 * El arco se anima via JS modificando stroke-dashoffset.
 */
function injectHoldRing() {
  if (!btnSortear) return;

  // Radio calculado para que quede justo fuera del botón pill
  // El CSS ya lo posiciona con inset: -7px
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'hold-ring');
  svg.setAttribute('viewBox', '0 0 80 80');
  svg.setAttribute('aria-hidden', 'true');

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '40');
  circle.setAttribute('cy', '40');
  circle.setAttribute('r', '36');
  // stroke-dasharray = 2π × 36 ≈ 226
  circle.setAttribute('stroke-dasharray', '226');
  circle.setAttribute('stroke-dashoffset', '226');

  svg.appendChild(circle);
  btnSortear.appendChild(svg);
  _holdRingCircle = circle;
}

/**
 * Inicia el contador de hold: anima el arco y lanza el sorteo al completarse.
 */
function startHold(e) {
  if (state.getKey('phase') !== 'idle' || btnSortear?.disabled) return;

  // Evitar que el click normal del botón también dispare
  e.preventDefault();

  _holdStart = performance.now();

  const ring = btnSortear?.querySelector('.hold-ring');
  if (ring) ring.classList.add('visible');

  // RAF loop para animar el arco suavemente
  function tick(now) {
    const elapsed  = now - _holdStart;
    const progress = Math.min(elapsed / HOLD_DURATION, 1);
    // stroke-dashoffset: 226 = vacío, 0 = lleno
    const offset   = 226 * (1 - progress);

    if (_holdRingCircle) {
      _holdRingCircle.setAttribute('stroke-dashoffset', offset.toFixed(1));
    }

    if (progress < 1) {
      _holdRafId = requestAnimationFrame(tick);
    } else {
      // ¡Llegó al 100%! Disparar el sorteo
      cancelHold(false); // limpia sin cancelar
      handleSortear();
    }
  }

  _holdRafId = requestAnimationFrame(tick);

  // Feedback háptico suave al iniciar
  if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([8, 6, 14]); // tema
}

/**
 * Cancela el hold si el usuario suelta antes de tiempo.
 * @param {boolean} reset - si true, resetea el arco a 0
 */
function cancelHold(reset = true) {
  if (_holdRafId) { cancelAnimationFrame(_holdRafId); _holdRafId = null; }
  if (_holdTimer)  { clearTimeout(_holdTimer);         _holdTimer  = null; }

  const ring = btnSortear?.querySelector('.hold-ring');
  if (ring) ring.classList.remove('visible');

  if (reset && _holdRingCircle) {
    _holdRingCircle.setAttribute('stroke-dashoffset', '226');
  }

  btnSortear?.classList.remove('charged');
}

// ══════════════════════════════════════════════════════════
// COUNTDOWN 3-2-1-¡YA!
// ══════════════════════════════════════════════════════════

/**
 * Countdown rápido: 3-2-1 en 1.5s total.
 * Cada dígito dura 450ms. Sin "¡YA!" separado — el barrido
 * arranca inmediatamente después del "1", que actúa como disparo.
 */
// ══════════════════════════════════════════════════════════
// ANIMACIÓN INTRO POR MODO — cada modo tiene su propia secuencia
// ══════════════════════════════════════════════════════════
function runModeIntro(mode, winnerId, participants) {
  if (['russian', 'tournament', 'split'].includes(mode)) return Promise.resolve();

  const winner      = participants?.find(p => p.id === winnerId);
  const winnerColors = winner ? getAvatarColorsByName(winner.name) : null;

  // Leer skin activa del usuario
  const activeSkin = getActiveSkin(mode);
  const skinId     = activeSkin?.id || null;

  // Mapa de todas las funciones de intro disponibles
  const allIntros = {
    // Normal
    normal_crosshair: () => introNormal(winner, winnerColors),
    normal_missile:   () => introNormalMissile(winner, winnerColors, participants),
    normal_sniper:    () => introNormalSniper(winner, winnerColors, participants),
    // Eliminación
    elim_bulbs:   () => introElimination(winner, winnerColors),
    elim_chairs:  () => introElimChairs(winner, winnerColors),
    elim_slots:   () => introElimSlots(winner, winnerColors),
    // Equipo
    team_orbit:   () => introTeam(winner, winnerColors, participants),
    team_magnet:  () => introTeamMagnet(winner, winnerColors, participants),
    team_cards:   () => introTeamCards(winner, winnerColors, participants),
    // Orden
    order_podium: () => introOrder(winner, winnerColors),
    order_race:   () => introOrderRace(winner, winnerColors),
    order_wheel:  () => introOrderWheel(winner, winnerColors),
    // Duelo
    duel_clash:   () => introDuel(winner, winnerColors, participants),
    duel_western: () => introDuelWestern(winner, winnerColors, participants),
    duel_boxing:  () => introDuelBoxing(winner, winnerColors, participants),
    // Venganza
    revenge_fire:   () => introRevenge(winner, winnerColors),
    revenge_target: () => introRevengeTarget(winner, winnerColors, participants),
    revenge_storm:  () => introRevengeStorm(winner, winnerColors),
  };

  // Fallbacks por modo (la skin free)
  const fallbacks = {
    normal: 'normal_crosshair', elimination: 'elim_bulbs',
    team: 'team_orbit', order: 'order_podium',
    duel: 'duel_clash', revenge: 'revenge_fire',
  };

  const fn = allIntros[skinId] || allIntros[fallbacks[mode]];
  if (!fn) return Promise.resolve();
  return fn();
}

// ══════════════════════════════════════════════════════════
// NOTA: Las funciones de animación intro (_introBase, _isSlowDevice,
// introNormal, introElimination, etc.) han sido movidas a intros.js
// ══════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════
// NOTA: El código de PAYWALL ha sido movido a paywall.js
// ══════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════
// PICKER DE SKINS EN AJUSTES
// ══════════════════════════════════════════════════════════

const MODE_LABELS = {
  normal: 'Normal', elimination: 'Eliminación', team: 'Equipo',
  order: 'Orden', duel: 'Duelo', revenge: 'Venganza',
};

const SKIN_ICONS = {
  // Normal
  normal_crosshair: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
  normal_missile:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2L8 8h2v8l-3 4h10l-3-4V8h2L12 2z"/></svg>`,
  normal_sniper:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="21"/></svg>`,
  // Eliminación
  elim_bulbs:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2-1 3.5-2.5 4.5L15 16H9l-.5-2.5C7 12.5 6 11 6 9a6 6 0 0 1 6-6z"/></svg>`,
  elim_chairs: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="6" width="16" height="4" rx="1"/><path d="M6 10v7M18 10v7M4 14h16"/></svg>`,
  elim_slots:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/><circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="18" cy="12" r="2" fill="currentColor"/></svg>`,
  // Equipo
  team_orbit:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="4 2"/></svg>`,
  team_magnet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 3v7a6 6 0 0 0 12 0V3M6 3H4M18 3h2M6 7H4M18 7h2"/></svg>`,
  team_cards:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="12" height="16" rx="2"/><path d="M7 5V3h12a2 2 0 0 1 2 2v14"/></svg>`,
  // Orden
  order_podium: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 19V9M12 19V5M16 19v-7"/><line x1="4" y1="19" x2="20" y2="19"/></svg>`,
  order_race:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8h16M4 12h12M4 16h8"/><circle cx="20" cy="8" r="2" fill="currentColor"/></svg>`,
  order_wheel:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3"/></svg>`,
  // Duelo
  duel_clash:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>`,
  duel_western: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8l3 3-3 3M20 8l-3 3 3 3M12 5v14"/></svg>`,
  duel_boxing:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="8" width="8" height="10" rx="3"/><path d="M14 11h2a2 2 0 0 1 0 4h-2"/><path d="M8 8V5a2 2 0 0 1 4 0v3"/></svg>`,
  // Venganza
  revenge_fire:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/></svg>`,
  revenge_target: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>`,
  revenge_storm:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25M13 11l-4 6h6l-4 6"/></svg>`,
};

function renderSkinsPicker() {
  const container = document.getElementById('skins-picker-list');
  if (!container) return;

  const unlocked = getUnlockedSkins();
  const modeEntries = Object.entries(SKIN_CATALOG);

  container.innerHTML = modeEntries.map(([mode, skins]) => {
    const activeSkin = getActiveSkin(mode);
    const cardsHTML = skins.map(skin => {
      const isActive   = activeSkin?.id === skin.id;
      const isUnlocked = skin.tier === 'free' || unlocked[skin.id];
      const isLocked   = !isUnlocked;

      const checkHTML  = isActive
        ? '<div class="skin-active-check"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>'
        : '';
      const lockHTML   = isLocked
        ? '<div class="skin-lock-overlay"><button class="skin-unlock-btn" data-skin-id="' + skin.id + '" data-mode="' + mode + '">$' + (skin.price||'0.99') + ' · Desbloquear</button></div>'
        : '';

      return '<div class="skin-card' + (isActive?' active':'') + (isLocked?' locked':'') + '" data-skin-id="' + skin.id + '" data-mode="' + mode + '" role="button">'
        + '<div class="skin-card-icon">' + (SKIN_ICONS[skin.id]||'') + '</div>'
        + '<div class="skin-card-name">' + skin.name + '</div>'
        + '<div class="skin-card-desc">' + skin.desc + '</div>'
        + checkHTML + lockHTML
        + '</div>';
    }).join('');

    return '<div class="skin-mode-block">'
      + '<div class="skin-mode-label">' + (MODE_LABELS[mode]||mode) + '</div>'
      + '<div class="skin-options">' + cardsHTML + '</div>'
      + '</div>';
  }).join('');

  // Selección de skin libre
  container.querySelectorAll('.skin-card:not(.locked)').forEach(card => {
    card.addEventListener('click', () => {
      const skinId = card.dataset.skinId;
      const mode   = card.dataset.mode;
      setActiveSkin(mode, skinId);
      renderSkinsPicker();
      if (prefs.sound) playScanTick();
    });
  });

  // Compra de skin pro — abre el paywall
  container.querySelectorAll('.skin-unlock-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openPaywall(btn.dataset.skinId);
    });
  });
}

// Renderizar picker cuando se abre el modal de ajustes

function runCountdown() {
  if (!countdownOverlay) return Promise.resolve();

  countdownOverlay.classList.add('visible');
  countdownOverlay.innerHTML = '';

  return new Promise(resolve => {
    const digits = ['3', '2', '1'];
    // Timing más natural: base 500ms, ajustable por speed
    const STEP = Math.round(500 * (100 / prefs.speed));

    digits.forEach((text, i) => {
      setTimeout(() => {
        countdownOverlay.innerHTML = '';
        const el = document.createElement('div');
        el.className = 'countdown-digit';
        el.textContent = text;
        el.style.animationDuration = `${STEP * 0.8}ms`; // Duración más natural
        countdownOverlay.appendChild(el);
        
        // Vibración más sutil y progresiva
        if (prefs.vibration && 'vibrate' in navigator) {
          const intensity = i === 2 ? [30, 15, 30] : [15, 8, 15]; // "1" más fuerte
          navigator.vibrate(intensity);
        }
      }, i * STEP);
    });

    // Timing de cierre más suave
    setTimeout(() => {
      countdownOverlay.classList.remove('visible');
      resolve();
    }, digits.length * STEP + 100); // +50ms más de margen
  });
}

// ══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════════════
function bindEvents() {
  // ── Configuración / Personalización ──
  initPaywall({
    showToast,
    getPrefsSound: () => prefs.sound,
    renderSkinsPicker
  });
  
  initRoulette({
    spawnParticles,
    triggerImpactFlash,
    playWinnerFanfare,
    getPrefs: () => prefs
  });
  
  initRussian({
    spawnParticles,
    playWinnerFanfare,
    showResult,
    showToast,
    getPrefs: () => prefs
  });
  
  initThemes({
    getPrefs: () => prefs
  });
  
  initSettings({
    renderSkinsPicker,
    applyGlowIntensity,
    showToast,
    state: () => state
  });
  
  initStats({
    escapeHtml,
    state: () => state
  });
  $('btn-settings')?.addEventListener('click', openSettingsModal);
  $('btn-settings-cancel')?.addEventListener('click', closeSettingsModal);
  $('btn-settings-save')?.addEventListener('click', handleSaveSettings);
  modalSettings?.addEventListener('click', e => {
    if (e.target === modalSettings) closeSettingsModal();
  });

  // ── Tema de color ──
  $('btn-theme')?.addEventListener('click', toggleThemePanel);
  themeBackdrop?.addEventListener('click', closeThemePanel);
  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
      closeThemePanel();
    });
  });

  btnAddParticipant?.addEventListener('click', handleAddParticipant);
  inputParticipant?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAddParticipant();
  });

  inputQuestion?.addEventListener('input', () => {
    const q = inputQuestion.value.trim() || '¿Quién paga?';
    state.set({ question: q });
    savePreferences({ lastQuestion: inputQuestion.value });
  });

  // ── Hold-to-spin en el botón sortear ──
  btnSortear?.addEventListener('pointerdown', startHold);
  window.addEventListener('pointerup', () => cancelHold(true));
  window.addEventListener('pointerout', e => {
    if (!e.relatedTarget) cancelHold(true);
  });
  btnSortear?.addEventListener('click', () => {
    if (state.getKey('phase') === 'idle' && !_holdRafId) handleSortear();
  });

  // ── Selector de modo ──
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      state.set({ mode, eliminatedIds: [], phase: 'idle', winnerId: null,
                  orderSequence: [], orderRevealIndex: 0,
                  russianSurvivors: [], duelIds: [], revengeTarget: null });

      // Limpiar clases visuales de modos anteriores
      participantsGrid?.querySelectorAll('.duel-selected,.duel-idle,.revenge-target')
        .forEach(el => el.classList.remove('duel-selected','duel-idle','revenge-target'));
      // Mostrar/ocultar banner de duelo
      const duelBanner = document.getElementById('duel-banner');
      if (duelBanner) duelBanner.style.display = mode === 'duel' ? 'flex' : 'none';
      // Resetear descripción del duelo
      const duelDesc = document.getElementById('duel-desc-text');
      if (duelDesc) duelDesc.textContent = 'Toca 2 avatares para enfrentarlos. El azar decide quién paga.';
      updateDuelBanner([]);
      savePreferences({ lastMode: mode });
      btn.style.animation = 'none';
      requestAnimationFrame(() => { btn.style.animation = 'modeActivate 300ms ease'; });
      updateModeDescription(mode);
      updateSortButton();
    });
  });

  // ── Control de tamaño de equipo ──
  teamSizeDec?.addEventListener('click', () => changeTeamSize(-1));
  teamSizeInc?.addEventListener('click', () => changeTeamSize(+1));

  // ── Botones de resultado ──
  btnResultClose?.addEventListener('click', closeResult);
  btnResultAgain?.addEventListener('click', () => {
    const mode = state.getKey('mode');
    const isElimFinal = mode === 'elimination' &&
                        state.getActiveParticipants().length <= 1;
    closeResult();
    if (!isElimFinal) setTimeout(handleSortear, 350);
  });
  btnResultNext?.addEventListener('click', handleResultNext);
  btnResultShare?.addEventListener('click', shareResult);

  // ── Luck stars en el menú de avatar ──
  luckStars?.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!_menuParticipantId) return;
      const luck = parseInt(btn.dataset.luck, 10);
      setLuck(_menuParticipantId, luck);
      updateLuckUI(_menuParticipantId, luck);
    });
  });

  // ── Modal de grupos ──
  $('btn-groups')?.addEventListener('click', openGroupsModal);
  btnModalClose?.addEventListener('click', closeGroupsModal);
  modalGroups?.addEventListener('click', e => {
    if (e.target === modalGroups) closeGroupsModal();
  });
  btnSaveGroup?.addEventListener('click', handleSaveGroup);

  // ── Navegación ──
  $('btn-stats')?.addEventListener('click', () => showScreen('stats'));
  $('btn-back-home')?.addEventListener('click', () => showScreen('home'));

  // ── Tabs Stats / Historial ──
  tabStats?.addEventListener('click',   () => switchStatsTab('stats'));
  tabHistory?.addEventListener('click', () => switchStatsTab('history'));

  // ── Botón de voz ──
  setupVoiceRecognition();

  // ── PWA install ──
  btnInstall?.addEventListener('click', handleInstall);
  btnInstallDismiss?.addEventListener('click', () => installBanner?.classList.remove('visible'));
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredInstallPrompt = e;
    installBanner?.classList.add('visible');
  });
}

// ══════════════════════════════════════════════════════════
// CONTROL DE MODOS
// ══════════════════════════════════════════════════════════

/**
 * Actualiza el panel de descripción que aparece bajo los botones de modo.
 */
function updateModeDescription(mode) {
  modeDescPanels?.forEach(panel => {
    panel.classList.toggle('active', panel.dataset.for === mode);
  });
}

/**
 * Cambia el tamaño del equipo y actualiza el botón sortear.
 */
function changeTeamSize(delta) {
  const current    = state.getKey('teamSize');
  const active     = state.getActiveParticipants().length;
  const maxAllowed = Math.max(2, active - 1); // al menos uno queda fuera
  const next       = Math.max(2, Math.min(maxAllowed, current + delta));

  if (next === current) {
    // Llegó al límite — feedback visual
    teamSizeVal?.classList.add('error');
    setTimeout(() => teamSizeVal?.classList.remove('error'), 400);
    if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([15, 8, 25]); // hold
    return;
  }

  state.set({ teamSize: next });
  if (teamSizeVal) teamSizeVal.textContent = next;

  // Actualizar estado disabled de los botones
  if (teamSizeDec) teamSizeDec.disabled = next <= 2;
  if (teamSizeInc) teamSizeInc.disabled = next >= maxAllowed;
}

/**
 * Sincroniza el control de equipo con el estado actual.
 * Llamar al cargar participantes o al cambiar al modo equipo.
 */
function syncTeamSizeControl() {
  const current    = state.getKey('teamSize');
  const active     = state.getActiveParticipants().length;
  const maxAllowed = Math.max(2, active - 1);
  const clamped    = Math.min(current, maxAllowed);

  if (clamped !== current) state.set({ teamSize: clamped });
  if (teamSizeVal) teamSizeVal.textContent = clamped;
  if (teamSizeDec) teamSizeDec.disabled = clamped <= 2;
  if (teamSizeInc) teamSizeInc.disabled = clamped >= maxAllowed;
}

// ══════════════════════════════════════════════════════════
// RENDERIZADO DE PARTICIPANTES
// ══════════════════════════════════════════════════════════
export function renderParticipants() {
  if (!participantsGrid) return;
  const participants = state.getKey('participants');

  if (participants.length === 0) {
    participantsGrid.className = 'participants-grid';
    participantsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.45" aria-hidden="true">
            <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 7-7"/>
            <circle cx="17" cy="11" r="3"/><path d="M14 20v-1a4 4 0 0 1 8 0v1"/>
          </svg>
        </div>
        <p class="empty-text">Agrega al menos 2 para comenzar</p>
      </div>`;
    return;
  }

  // Limpiar empty-state residual
  participantsGrid.querySelectorAll('.empty-state').forEach(el => el.remove());
  participantsGrid.classList.toggle('dense', participants.length >= 9);
  if (participants.length >= 1) showOnboardingHint();

  const total    = participants.length;
  const prevTotal = parseInt(participantsGrid.dataset.total || '0', 10);
  const totalChanged = prevTotal !== total;
  participantsGrid.dataset.total = total;

  const existing = new Map(
    [...participantsGrid.querySelectorAll('[data-id]')].map(el => [el.dataset.id, el])
  );
  const currentIds = new Set(participants.map(p => p.id));

  // Eliminar avatares que ya no están
  existing.forEach((el, id) => { if (!currentIds.has(id)) el.remove(); });

  participants.forEach((p, i) => {
    if (existing.has(p.id)) {
      // Si cambió el total, recalcular colores para TODOS (degradado se redistribuye)
      updateAvatarElement(existing.get(p.id), p, i, total, totalChanged);
    } else {
      const el = createAvatarElement(p, i, total);
      // Solo animar al nuevo, los demás ya están en su sitio
      el.style.animationDelay = `${Math.min(i * 40, 200)}ms`;
      participantsGrid.appendChild(el);
    }
  });
}

function createAvatarElement(p, index = 0, total = 1) {
  const colors   = getAvatarColors(p.name, index, total);
  const initials = getInitials(p.name);
  const wrap     = document.createElement('div');

  wrap.className  = `avatar-wrap${p.excluded ? ' excluded' : ''}`;
  wrap.dataset.id = p.id;
  wrap.setAttribute('role', 'listitem');
  wrap.setAttribute('aria-label', `${p.name}${p.excluded ? ', pausado' : ''}`);

  wrap.innerHTML = `
    <div class="avatar"
         style="background:${colors.gradient};
                --avatar-color:${colors.color};
                --avatar-glow:${colors.glow};
                --avatar-rgb:${colors.rgb};"
         role="button" tabindex="0" aria-haspopup="true"
         title="Opciones de ${escapeHtml(p.name)}">
      ${escapeHtml(initials)}
      <span class="luck-badge" aria-hidden="true">${getLuckSvg(p.luck)}</span>
    </div>
    <span class="avatar-name">${escapeHtml(p.name)}</span>`;

  const avatarEl = wrap.querySelector('.avatar');

  avatarEl.addEventListener('click', (e) => {
    e.stopPropagation();
    // En modo Duelo: seleccionar participante en lugar de abrir menú
    if (state.getKey('mode') === 'duel') {
      handleDuelSelection(p.id);
      if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate(12);
      return;
    }
    if (_menuParticipantId === p.id) { closeAvatarMenu(); return; }
    openAvatarMenu(p.id, wrap);
    dismissOnboardingHint();
  });

  avatarEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAvatarMenu(p.id, wrap);
    }
  });

  // Tap largo (500ms) → editar nombre inline
  let _holdTimer = null;
  avatarEl.addEventListener('pointerdown', () => {
    _holdTimer = setTimeout(() => {
      if (state.getKey('mode') === 'duel') return; // en duelo el tap largo no edita
      closeAvatarMenu();
      startEditParticipantName(p.id, wrap);
    }, 500);
  });
  avatarEl.addEventListener('pointerup',    () => clearTimeout(_holdTimer));
  avatarEl.addEventListener('pointerleave', () => clearTimeout(_holdTimer));

  return wrap;
}

function updateAvatarElement(el, p, index = 0, total = 1, animate = false) {
  el.classList.toggle('excluded', p.excluded);
  el.setAttribute('aria-label', `${p.name}${p.excluded ? ', pausado' : ''}`);

  const colors   = getAvatarColors(p.name, index, total);
  const avatarEl = el.querySelector('.avatar');
  if (avatarEl) {
    // Transición suave del color cuando el total cambia
    if (animate) {
      avatarEl.style.transition = 'box-shadow 400ms ease, filter 400ms ease';
      // background no es animable directamente — usamos una clase temporal
      avatarEl.classList.add('color-transitioning');
      setTimeout(() => avatarEl.classList.remove('color-transitioning'), 450);
    }
    avatarEl.style.background = colors.gradient;
    avatarEl.style.setProperty('--avatar-color', colors.color);
    avatarEl.style.setProperty('--avatar-glow',  colors.glow);
    avatarEl.style.setProperty('--avatar-rgb',   colors.rgb);
  }

  const badge = el.querySelector('.luck-badge');
  if (badge) badge.innerHTML = getLuckSvg(p.luck);
}

/**
 * Muestra el hint de onboarding la primera vez que el usuario
 * tiene al menos 1 participante. Se auto-oculta tras 5 segundos
 * o al primer tap en un avatar.
 */
function showOnboardingHint() {
  if (!onboardingHint) return;
  // Solo mostrar si nunca se vio (guardado en sessionStorage)
  if (sessionStorage.getItem('qp-hint-seen')) return;
  onboardingHint.style.display = 'flex';
  // Auto-ocultar tras 5s
  setTimeout(dismissOnboardingHint, 5000);
}

function dismissOnboardingHint() {
  if (!onboardingHint) return;
  onboardingHint.style.display = 'none';
  sessionStorage.setItem('qp-hint-seen', '1');
}

function getLuckSvg(luck) {
  return luckIcon(luck, 11);
}

// ══════════════════════════════════════════════════════════
// MECÁNICA DE SORTEO — con countdown previo
// ══════════════════════════════════════════════════════════
async function handleSortear() {
  if (state.getKey('phase') !== 'idle') return;

  if (!state.canSpin()) {
    showToast('Necesitas al menos 2 participantes activos', 'error');
    playError();
    btnSortear?.classList.add('error');
    setTimeout(() => btnSortear?.classList.remove('error'), 600);
    return;
  }

  const active = state.getActiveParticipants();
  const mode   = state.getKey('mode');
  let winnerId;

  // ── MODO DIVIDIR — no necesita animación de sorteo ──
  // ── MODO RULETA RUSA — flujo propio, no necesita barrido ──
  if (mode === 'russian') {
    launchRussianRoulette(active);
    return;
  }

  // ── MODO TORNEO — flujo propio ──
  if (mode === 'tournament') {
    launchTournament(active);
    return;
  }

  // ── MODOS CON OVERLAY PROPIO ──
  if (mode === 'coin')  { launchCoinFlip(active);   return; }
  if (mode === 'dice')  { launchDice(active);        return; }
  if (mode === 'bomb')  { launchBomb(active);        return; }
  if (mode === 'voice') { launchVoiceMode(active);   return; }

  // ── MODO DIVIDIR — resultado inmediato, sin barrido ──
  if (mode === 'split') {
    handleSplitMode(active);
    return;
  }

  // ── Calcular ganador según modo ──
  if (mode === 'order') {
    const existing = state.getKey('orderSequence');
    if (!existing || existing.length === 0) {
      const order = selectOrder(active);
      state.set({ orderSequence: order, orderRevealIndex: 0 });
      winnerId = order[0];
    } else {
      const idx = state.getKey('orderRevealIndex');
      winnerId = existing[idx];
    }
    state.set({ winnerId }); // ← asegurar que siempre está en state
  } else if (mode === 'team') {
    syncTeamSizeControl();
    const teamSize = Math.min(state.getKey('teamSize'), active.length);
    const winners  = selectMultiple(active, teamSize);
    state.set({ winnerId: winners });
    winnerId = winners[0];
  } else if (mode === 'revenge') {
    winnerId = selectOneWithRevenge(active);
    state.set({ winnerId });
  } else if (mode === 'duel') {
    const duelIds = state.getKey('duelIds') || [];
    const duelParticipants = active.filter(p => duelIds.includes(p.id));
    if (duelParticipants.length < 2) {
      showToast('Toca 2 avatares para seleccionarlos');
      state.set({ phase: 'idle' }); return;
    }
    winnerId = selectOne(duelParticipants);
    state.set({ winnerId });
  } else {
    // Normal y Eliminación
    winnerId = selectOne(active);
    state.set({ winnerId });
  }

  // Verificar que tenemos un winnerId válido
  if (!winnerId) {
    state.set({ phase: 'idle' });
    showToast('Error al seleccionar. Intenta de nuevo.', 'error');
    return;
  }

  state.set({ phase: 'spinning' });

  try {
    await runCountdown();

    btnSortear?.classList.add('revving');

    // ── Selección de animación ──
    // Prioridad: 1) Ruleta casino (si el usuario la activó) 2) Intro temática del modo 3) Barrido clásico
    if (prefs.roulette && active.length >= 2) {
      await runRouletteAnimation(active, winnerId);
    } else {
      const hasThematicIntro = ['normal','elimination','team','order','duel','revenge'].includes(mode);
      if (hasThematicIntro) {
        await runModeIntro(mode, winnerId, active);
      } else {
        const sequence = buildAnimationSequence(active, winnerId, 3200);
        await runScanAnimation(sequence, active);
      }
    }

    btnSortear?.classList.remove('revving');

    // Usar siempre el winnerId local — es el mismo que se usó en la animación
    // Para team, state.winnerId es un array; extraemos el primero si es necesario
    const finalWinnerId = Array.isArray(winnerId) ? winnerId[0] : winnerId;

    state.set({ phase: 'revealing' });
    setTimeout(() => showResult(finalWinnerId), 280);

  } catch (err) {
    console.error('[Sortear] Error:', err);
    btnSortear?.classList.remove('revving');
    state.set({ phase: 'idle', winnerId: null });
    showToast('Algo falló. Intenta de nuevo.', 'error');
  }
}

function runScanAnimation(sequence, participants) {
  return new Promise(resolve => {
    participants.forEach(p => {
      participantsGrid?.querySelector(`[data-id="${p.id}"]`)?.classList.add('scanning');
    });

    let lastId = null;
    const total    = sequence.length;
    const slowStart = total - 7; // últimos 7 pasos = cámara lenta

    sequence.forEach(({ id, delay, isFinal }, idx) => {
      setTimeout(() => {
        const intensity = idx / total;

        if (lastId) {
          const prev = participantsGrid?.querySelector(`[data-id="${lastId}"]`);
          prev?.classList.remove('flashing', 'slow-scan');
        }

        if (isFinal) {
          // ── MOMENTO CINEMATOGRÁFICO ──
          participants.forEach(p => {
            participantsGrid?.querySelector(`[data-id="${p.id}"]`)
              ?.classList.remove('scanning', 'flashing', 'slow-scan');
          });
          triggerImpactFlash();
          triggerScreenShake();
          resolve();
          return;
        }

        const el = participantsGrid?.querySelector(`[data-id="${id}"]`);
        if (el) {
          el.classList.add('flashing');
          if (idx >= slowStart) el.classList.add('slow-scan');
        }
        lastId = id;

        if (prefs.sound && idx % 2 === 0) playScanTick();
        if (prefs.sound && idx % 3 === 0) playBuildUp(intensity);
      }, delay);
    });
  });
}

/** Flash blanco de impacto sobre toda la pantalla */
function triggerImpactFlash() {
  if (!prefs.flash) return;
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:white;pointer-events:none;
    animation:impactFlash 480ms ease-out forwards;
  `;
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });
  if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([50, 20, 100]);
}

/** Temblor horizontal de la pantalla */
function triggerScreenShake() {
  const app = document.getElementById('app');
  if (!app) return;
  app.style.animation = 'none';
  requestAnimationFrame(() => {
    app.style.animation = 'screenShake 400ms cubic-bezier(0.36,0.07,0.19,0.97) both';
    app.addEventListener('animationend', () => {
      app.style.animation = '';
    }, { once: true });
  });
}

// ══════════════════════════════════════════════════════════
// OVERLAY DE RESULTADO
// ══════════════════════════════════════════════════════════
function showResult(winnerId) {
  const s = state.get();
  const { participants, question, mode } = s;
  const winner = participants.find(p => p.id === winnerId);
  if (!winner) { state.set({ phase: 'idle' }); return; }

  const colors = getAvatarColorsByName(winner.name);

  // ── Aplicar color del ganador al overlay (rayos de luz y spotlight) ──
  if (resultOverlay) {
    resultOverlay.style.setProperty('--result-rgb', colors.rgb);
  }

  // ── Estado visual en el grid ──
  participants.forEach(p => {
    const el = participantsGrid?.querySelector(`[data-id="${p.id}"]`);
    if (!el || p.excluded) return;
    el.classList.toggle('winner', p.id === winnerId);
    el.classList.toggle('loser',  p.id !== winnerId);
  });

  // ── Avatar grande ──
  if (resultAvatarBig) {
    resultAvatarBig.style.background = colors.gradient;
    resultAvatarBig.style.setProperty('--avatar-color', colors.color);
    resultAvatarBig.style.setProperty('--avatar-glow',  colors.glow);
    resultAvatarBig.textContent = getInitials(winner.name);
  }

  // ── Nombre animado ──
  if (resultName) {
    resultName.dataset.text = winner.name;
    animateNameLetters(resultName, winner.name);
  }

  if (resultQuestion) resultQuestion.textContent = question;

  // ── Label + botones según modo ──
  const orderSeq = s.orderSequence  || [];
  const orderIdx = s.orderRevealIndex ?? 0;
  const elimIds  = s.eliminatedIds  || [];

  // Total de participantes que entran al modo eliminación (los no excluidos)
  const totalInGame = participants.filter(p => !p.excluded).length;

  switch (mode) {

    case 'revenge': {
      if (resultLabel) resultLabel.textContent = '¡El elegido es!';
      if (btnResultAgain) btnResultAgain.style.display = '';
      if (btnResultNext)  btnResultNext.style.display  = 'none';
      if (resultProgress) resultProgress.style.display = 'none';
      // El elegido se convierte en objetivo de venganza
      state.set({ revengeTarget: winnerId });
      // Marcar al condenado de venganza en el grid
      setTimeout(() => {
        state.getActiveParticipants().forEach(p => {
          participantsGrid?.querySelector(`[data-id="${p.id}"]`)
            ?.classList.toggle('revenge-target', p.id === winnerId);
        });
      }, 1200);
      break;
    }

    case 'duel': {
      if (resultLabel) resultLabel.textContent = '¡El condenado del duelo!';
      if (btnResultAgain) btnResultAgain.style.display = '';
      if (btnResultNext)  btnResultNext.style.display  = 'none';
      if (resultProgress) resultProgress.style.display = 'none';
      break;
    }

    case 'russian': {
      const survivors  = state.getKey('russianSurvivors') || [];
      const activeSurv = survivors.length === 0 ? state.getActiveParticipants().map(p => p.id) : survivors;
      const remaining  = activeSurv.filter(id => id !== winnerId);
      state.set({ russianSurvivors: remaining });

      if (remaining.length === 1) {
        // ¡El último superviviente es el condenado real!
        const loser = state.getActiveParticipants().find(p => p.id === remaining[0]);
        if (resultLabel) resultLabel.textContent = '¡CONDENADO FINAL!';
        if (btnResultAgain) btnResultAgain.style.display = '';
        if (btnResultNext)  btnResultNext.style.display  = 'none';
      } else if (remaining.length === 0) {
        if (resultLabel) resultLabel.textContent = '¡El último en caer!';
        if (btnResultAgain) btnResultAgain.style.display = '';
        if (btnResultNext)  btnResultNext.style.display  = 'none';
      } else {
        if (resultLabel) resultLabel.textContent = `¡Eliminado! Quedan ${remaining.length}`;
        if (btnResultNext) {
          btnResultNext.style.display = '';
          btnResultNext.textContent   = `Siguiente ronda →`;
        }
        if (btnResultAgain) btnResultAgain.style.display = 'none';
      }

      renderProgressDots(activeSurv.length - remaining.length,
                         activeSurv.length, 'done');
      if (resultProgress) resultProgress.style.display = '';
      break;
    }

    case 'normal': {
      if (resultLabel) resultLabel.textContent = '¡El elegido es!';
      if (btnResultAgain) btnResultAgain.style.display = '';
      if (btnResultNext)  btnResultNext.style.display  = 'none';
      if (resultProgress) resultProgress.style.display = 'none';
      break;
    }

    case 'elimination': {
      // elimIds aún no tiene al actual, así que elimIds.length = nº de eliminados previos
      const elimSoFar = elimIds.length;       // cuántos ya estaban eliminados
      const roundNum  = elimSoFar + 1;        // esta es la ronda N
      const remaining = totalInGame - roundNum; // cuántos quedan después de esta

      if (resultLabel) {
        resultLabel.textContent = remaining > 0
          ? `¡Eliminado! Quedan ${remaining}`
          : '¡Último eliminado!';
      }

      const hasMore = remaining > 0;
      if (btnResultNext) {
        btnResultNext.style.display = hasMore ? '' : 'none';
        btnResultNext.textContent   = 'Siguiente ronda →';
      }
      if (btnResultAgain) btnResultAgain.style.display = hasMore ? 'none' : '';

      renderProgressDots(roundNum, totalInGame, 'done');
      if (resultProgress) resultProgress.style.display = '';
      break;
    }

    case 'team': {
      const winnerIds = Array.isArray(s.winnerId) ? s.winnerId : [winnerId];
      const teamSize  = winnerIds.length;
      if (resultLabel) resultLabel.textContent = `¡Equipo de ${teamSize}!`;
      renderTeamMembers(winnerIds, winnerId);
      if (btnResultAgain) btnResultAgain.style.display = '';
      if (btnResultNext)  btnResultNext.style.display  = 'none';
      if (resultProgress) resultProgress.style.display = 'none';
      break;
    }

    case 'order': {
      const pos      = orderIdx + 1;    // posición que se está revelando (1-based)
      const total    = orderSeq.length;
      const isLast   = pos === total;
      const ordinals = ['1º','2º','3º','4º','5º','6º','7º','8º','9º','10º','11º','12º'];
      if (resultLabel) resultLabel.textContent = `${ordinals[orderIdx] ?? pos + 'º'} en el orden`;

      if (btnResultNext) {
        btnResultNext.style.display = isLast ? 'none' : '';
        btnResultNext.textContent   = isLast ? '' : `${ordinals[pos] ?? (pos+1)+'º'} →`;
      }
      if (btnResultAgain) btnResultAgain.style.display = isLast ? '' : 'none';

      renderProgressDots(pos, total, 'order');
      if (resultProgress) resultProgress.style.display = '';
      break;
    }
  }



  // ── Mostrar overlay ──
  resultOverlay?.classList.add('visible');
  state.set({ phase: 'result' });

  // ── Efectos (respeta preferencias del usuario) ──
  if (prefs.sound)     playWinnerFanfare();
  triggerVibration();
  if (prefs.particles) spawnParticles(colors.color);

  // ── Estadísticas ──
  state.recordChosen(winnerId);
  state.recordEscaped(
    state.getActiveParticipants().filter(p => p.id !== winnerId).map(p => p.id)
  );
  state.recordHistory(winnerId, winner.name, question, mode);
  persistStats(); // guardar en localStorage

  // ── Contador de racha ──
  const history = state.getKey('sessionHistory') || [];
  const streak  = history.filter((e, i) => i < 3 && e.winnerId === winnerId).length + 1;
  // streak cuenta cuántas entradas consecutivas tiene este ganador al inicio del historial
  const realStreak = (() => {
    let n = 0;
    for (const e of history) { if (e.winnerId === winnerId) n++; else break; }
    return n + 1; // +1 porque el actual aún no está en el historial
  })();
  if (realStreak >= 2 && resultQuestion) {
    const streakEl = document.getElementById('result-streak');
    if (streakEl) streakEl.remove();
    const s = document.createElement('div');
    s.id = 'result-streak';
    s.style.cssText = `font-size:0.78rem;font-weight:700;letter-spacing:0.12em;
      color:var(--color-accent);text-align:center;margin-top:-8px;
      animation:slideUpFade 400ms ease both;`;
    s.textContent = realStreak === 2 ? '2 veces seguidas' : realStreak === 3 ? '3 en racha' :
                    realStreak === 4 ? '4 — ¡imparable!' : `${realStreak}x RACHA`;
    resultQuestion.insertAdjacentElement('afterend', s);
  }

  // ── Registrar eliminado ──
  if (mode === 'elimination') {
    state.set({ eliminatedIds: [...elimIds, winnerId] });
  }

  // ── Avanzar índice en modo Orden ──
  if (mode === 'order') {
    state.set({ orderRevealIndex: orderIdx + 1 });
  }
}

/**
 * Renderiza los mini-avatares del equipo debajo del nombre principal.
 * El primer ganador ya está en resultAvatarBig; el resto aparece en una fila.
 */
function renderTeamMembers(winnerIds, primaryId) {
  // Reutilizamos resultQuestion para mostrar la lista de miembros extra
  if (!resultQuestion) return;
  if (winnerIds.length <= 1) {
    resultQuestion.textContent = state.getKey('question');
    return;
  }
  const others = winnerIds.filter(id => id !== primaryId);
  const participants = state.getKey('participants');

  const html = others.map(id => {
    const p = participants.find(x => x.id === id);
    if (!p) return '';
    const c = getAvatarColorsByName(p.name);
    return `<span style="
      display:inline-flex;flex-direction:column;align-items:center;gap:3px;margin:0 4px;
    ">
      <span style="
        width:36px;height:36px;border-radius:50%;display:inline-flex;
        align-items:center;justify-content:center;font-family:var(--font-display);
        font-weight:900;font-size:0.8rem;color:white;background:${c.gradient};
        box-shadow:0 0 0 2px ${c.color},0 0 8px ${c.glow};
        animation:resultReveal 400ms cubic-bezier(0.34,1.56,0.64,1) both;
      ">${escapeHtml(getInitials(p.name))}</span>
      <span style="font-size:0.65rem;color:var(--color-text-dim);max-width:48px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
      >${escapeHtml(p.name)}</span>
    </span>`;
  }).join('');

  resultQuestion.innerHTML = `
    <span style="display:block;font-size:0.72rem;color:var(--color-text-dim);margin-bottom:6px;">
      + también en el equipo:
    </span>
    <span style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;">${html}</span>
  `;
}

/**
 * Renderiza los puntos de progreso en el overlay de resultado.
 * @param {number} current - posición actual (1-based)
 * @param {number} total   - total de pasos
 * @param {'done'|'order'} type
 */
function renderProgressDots(current, total, type) {
  if (!progressDots) return;
  // Máximo 12 dots para no desbordar
  const shown = Math.min(total, 12);
  progressDots.innerHTML = Array.from({ length: shown }, (_, i) => {
    const pos = i + 1;
    let cls = 'progress-dot';
    if (type === 'order') {
      if (pos < current)  cls += ' done';
      if (pos === current) cls += ' current';
    } else {
      // elimination: los done son los ya eliminados
      if (pos < current)  cls += ' done';
      if (pos === current) cls += ' current';
    }
    return `<div class="${cls}" title="Paso ${pos}"></div>`;
  }).join('');
}

/**
 * Botón "Siguiente" en modos Eliminación y Orden.
 * En Orden: barrido rápido sin countdown para mantener el ritmo.
 * En Eliminación: countdown completo porque cada ronda es un evento.
 */
function handleResultNext() {
  const mode = state.getKey('mode');

  // Limpiar overlay sin resetear el estado de la secuencia
  resultOverlay?.classList.remove('visible');
  participantsGrid?.querySelectorAll('.winner,.loser').forEach(el =>
    el.classList.remove('winner', 'loser')
  );
  if (particlesContainer) particlesContainer.innerHTML = '';
  state.set({ phase: 'idle', winnerId: null });

  setTimeout(() => {
    if (mode === 'order') {
      const seq = state.getKey('orderSequence');
      const idx = state.getKey('orderRevealIndex');
      if (idx < seq.length) {
        handleRevealNext();
      } else {
        showToast('¡Orden completo!');
        state.set({ orderSequence: [], orderRevealIndex: 0 });
      }
    } else if (mode === 'elimination') {
      const remaining = state.getActiveParticipants().length;
      if (remaining >= 2) {
        handleSortear();
      } else if (remaining === 1) {
        const winner = state.getActiveParticipants()[0];
        if (winner) showFinalWinner(winner.id);
      } else {
        showToast('¡Todos eliminados!');
        state.set({ eliminatedIds: [] });
      }
    } else if (mode === 'russian') {
      const survivors = state.getKey('russianSurvivors') || [];
      if (survivors.length >= 2) {
        handleSortear();
      } else if (survivors.length === 1) {
        // El último superviviente es el condenado real
        const loser = state.getActiveParticipants().find(p => p.id === survivors[0]);
        if (loser) {
          showToast(`¡${loser.name} es el condenado final!`);
          state.set({ russianSurvivors: [] });
        }
      }
    }
  }, 300);
}

/**
 * Revela el siguiente en el orden sin countdown.
 * Animación de barrido corta (1.8s) que termina en el siguiente de la lista.
 */
async function handleRevealNext() {
  if (state.getKey('phase') !== 'idle') return;

  const seq    = state.getKey('orderSequence');
  const idx    = state.getKey('orderRevealIndex');
  if (idx >= seq.length) return;

  const winnerId = seq[idx];
  const active   = state.getActiveParticipants();

  state.set({ phase: 'spinning' });

  try {
    btnSortear?.classList.add('revving');
    // Barrido más corto (1.8s) y sin countdown para fluir entre revelaciones
    const sequence = buildAnimationSequence(active, winnerId, 1800);
    await runScanAnimation(sequence, active);
    btnSortear?.classList.remove('revving');

    state.set({ phase: 'revealing' });
    setTimeout(() => showResult(winnerId), 200);
  } catch (err) {
    console.error('[RevealNext]', err);
    btnSortear?.classList.remove('revving');
    state.set({ phase: 'idle' });
  }
}

/**
 * Revela al último superviviente en modo Eliminación sin animación de barrido.
 */
function showFinalWinner(winnerId) {
  const { participants, question } = state.get();
  const winner = participants.find(p => p.id === winnerId);
  if (!winner) return;

  const colors = getAvatarColorsByName(winner.name);

  participants.forEach(p => {
    const el = participantsGrid?.querySelector(`[data-id="${p.id}"]`);
    if (!el || p.excluded) return;
    el.classList.toggle('winner', p.id === winnerId);
    el.classList.toggle('loser',  p.id !== winnerId);
  });

  if (resultAvatarBig) {
    resultAvatarBig.style.background = colors.gradient;
    resultAvatarBig.style.setProperty('--avatar-color', colors.color);
    resultAvatarBig.style.setProperty('--avatar-glow',  colors.glow);
    resultAvatarBig.textContent = getInitials(winner.name);
  }
  if (resultName)    { resultName.dataset.text = winner.name; animateNameLetters(resultName, winner.name); }
  if (resultLabel)   resultLabel.textContent   = '¡Último superviviente!';
  if (resultQuestion) resultQuestion.textContent = question;

  // Solo mostrar "Otra vez" (reinicia el modo eliminación)
  if (btnResultAgain) {
    btnResultAgain.style.display = '';
    btnResultAgain.textContent = 'Jugar de nuevo';
  }
  if (btnResultNext)  btnResultNext.style.display = 'none';
  if (resultProgress) resultProgress.style.display = 'none';

  resultOverlay?.classList.add('visible');
  state.set({ phase: 'result' });

  playWinnerFanfare();
  triggerVibration();
  spawnParticles(colors.color);
  // closeResult() ya maneja el reset de eliminatedIds
}

/**
 * Anima el nombre del ganador letra por letra con un pequeño stagger.
 * Cada letra cae desde arriba con rotateX.
 */
function animateNameLetters(container, name) {
  container.textContent = '';
  container.style.perspective = '400px';

  // Contenedor flex para las letras
  const inner = document.createElement('span');
  inner.style.cssText = 'display:inline-flex;gap:0.01em;flex-wrap:wrap;justify-content:center;';

  [...name].forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char; // nbsp para espacios
    span.style.cssText = `
      display:inline-block;
      animation: letterDrop 400ms cubic-bezier(0.34,1.56,0.64,1) ${i * 55}ms both;
      transform-origin: top center;
    `;
    inner.appendChild(span);
  });

  container.appendChild(inner);
}

function closeResult() {
  resultOverlay?.classList.remove('visible');
  participantsGrid?.querySelectorAll('.winner,.loser,.duel-selected,.duel-idle').forEach(el =>
    el.classList.remove('winner', 'loser', 'duel-selected', 'duel-idle')
  );
  if (particlesContainer) particlesContainer.innerHTML = '';
  if (resultProgress)     resultProgress.style.display = 'none';

  // Restaurar avatar y actions del overlay (pueden haber sido ocultados por split)
  if (resultAvatarBig) resultAvatarBig.style.display = '';
  if (resultName)      resultName.style.fontSize = '';

  // Restaurar acciones estándar si el modo split las reemplazó
  const actionsEl = document.getElementById('result-actions');
  if (actionsEl && !actionsEl.querySelector('#btn-result-again')) {
    actionsEl.innerHTML = `
      <button class="btn btn-accent" id="btn-result-again">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round"><polyline points="16 3 21 3 21 8"/>
          <line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/>
          <line x1="15" y1="15" x2="21" y2="21"/>
          <line x1="4" y1="4" x2="9" y2="9"/></svg>
        Otra vez
      </button>
      <button class="btn btn-icon" id="btn-result-share" style="width:auto;padding:12px 16px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </button>
      <button class="btn btn-icon" id="btn-result-close" style="width:auto;padding:12px 20px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/></svg>
        Cerrar
      </button>`;
    // Re-bind buttons
    actionsEl.querySelector('#btn-result-again')?.addEventListener('click', () => {
      const m = state.getKey('mode');
      const isElimFinal = m === 'elimination' && state.getActiveParticipants().length <= 1;
      closeResult();
      if (!isElimFinal) setTimeout(handleSortear, 350);
    });
    actionsEl.querySelector('#btn-result-share')?.addEventListener('click', shareResult);
    actionsEl.querySelector('#btn-result-close')?.addEventListener('click', closeResult);
  }

  const mode = state.getKey('mode');
  if (mode === 'order')     state.set({ orderSequence: [], orderRevealIndex: 0 });
  if (mode === 'elimination') state.set({ eliminatedIds: [] });
  if (mode === 'russian')   state.set({ russianSurvivors: [] });
  if (mode === 'duel')      state.set({ duelIds: [] });

  if (btnResultAgain) btnResultAgain.textContent = 'Otra vez';
  state.set({ phase: 'idle', winnerId: null });
}

// ══════════════════════════════════════════════════════════
// PARTÍCULAS DE CELEBRACIÓN
// ══════════════════════════════════════════════════════════
let _particlesActive = false;

function spawnParticles(baseColor) {
  // Evitar múltiples canvas simultáneos — matar el anterior si existe
  document.querySelectorAll('.particles-canvas').forEach(c => c.remove());
  _particlesActive = false;

  const W = window.innerWidth;
  const H = window.innerHeight;
  const canvas = document.createElement('canvas');
  canvas.className = 'particles-canvas';
  canvas.width  = W;
  canvas.height = H;
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const st      = getComputedStyle(document.documentElement);
  const primary = st.getPropertyValue('--color-primary').trim() || '#7B2FBE';
  const accent  = st.getPropertyValue('--color-accent').trim()  || '#00F5FF';
  const impact  = st.getPropertyValue('--color-impact').trim()  || '#FF006E';
  const palette = [baseColor, baseColor, accent, primary, impact, '#FFD700', '#fff'];

  const cx = W / 2;
  const cy = H * 0.42;

  // Generar partículas como objetos (sin DOM)
  const particles = [];
  // Detectar dispositivo lento: pocos cores o poca RAM
  const isSlowDevice = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2;
  const COUNT = isSlowDevice ? 30 : (window.innerWidth < 400 ? 40 : 55);

  for (let i = 0; i < COUNT; i++) {
    const isLong = Math.random() > 0.5;
    const angle  = (Math.PI * 2 * i / COUNT) + (Math.random() - 0.5) * 1.2;
    const speed  = 3.5 + Math.random() * 7;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.65 - 5,
      w: isLong ? 2 + Math.random() * 3 : 3 + Math.random() * 4,
      h: isLong ? 6 + Math.random() * 8 : 3 + Math.random() * 4,
      color: palette[Math.floor(Math.random() * palette.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.4,
      alpha: 1,
      round: !isLong,
      delay: Math.floor(Math.random() * 8), // frames de delay
    });
  }

  // Segunda oleada hacia arriba
  for (let i = 0; i < 25; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 4 + Math.random() * 6;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      w: 3 + Math.random() * 3,
      h: 3 + Math.random() * 3,
      color: palette[Math.floor(Math.random() * palette.length)],
      rot: 0, rotV: (Math.random() - 0.5) * 0.3,
      alpha: 1,
      round: true,
      delay: 7 + Math.floor(Math.random() * 6),
    });
  }

  const GRAVITY = 0.28;
  let frame = 0;
  let rafId;

  function tick() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    let alive = 0;
    for (const p of particles) {
      if (frame < p.delay) { alive++; continue; }

      p.vy   += GRAVITY;
      p.x    += p.vx;
      p.y    += p.vy;
      p.rot  += p.rotV;
      p.alpha = Math.max(0, p.alpha - (isSlowDevice ? 0.03 : 0.02));
      p.vx   *= 0.98; // fricción suave

      if (p.alpha <= 0) continue;
      alive++;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    if (alive > 0 && frame < 100) {
      rafId = requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }

  rafId = requestAnimationFrame(tick);

  // Seguro: limpiar si el usuario navega antes de que terminen
  setTimeout(() => { cancelAnimationFrame(rafId); canvas.remove(); }, 2800);
}

// ══════════════════════════════════════════════════════════
// VIBRACIÓN
// ══════════════════════════════════════════════════════════
function triggerVibration() {
  if (!prefs.vibration || !('vibrate' in navigator)) return;
  navigator.vibrate([80, 40, 80, 40, 300]);
}

// ══════════════════════════════════════════════════════════
// HANDLER AÑADIR PARTICIPANTE
// ══════════════════════════════════════════════════════════
function handleAddParticipant() {
  const name = inputParticipant?.value?.trim() ?? '';
  if (!name) return;
  const result = addParticipant(name);
  if (result.success) {
    if (inputParticipant) inputParticipant.value = '';
    inputParticipant?.focus();
    playAddParticipant();
  } else {
    showToast(result.error, 'error');
    playError();
    inputParticipant?.classList.add('error');
    setTimeout(() => inputParticipant?.classList.remove('error'), 500);
  }
}

// ══════════════════════════════════════════════════════════
// MODAL DE GRUPOS
// ══════════════════════════════════════════════════════════
function openGroupsModal() {
  renderGroupsList();
  modalGroups?.classList.add('open');
}

function closeGroupsModal() {
  modalGroups?.classList.remove('open');
}

function renderGroupsList() {
  if (!groupsList) return;
  const groups = loadAllGroups();
  const names  = Object.keys(groups);

  if (names.length === 0) {
    groupsList.innerHTML = `
      <p style="text-align:center;padding:16px;font-size:0.85rem;color:var(--color-text-dim);">
        No hay grupos guardados todavía
      </p>`;
    return;
  }

  // Ordenar por fecha (más reciente primero)
  names.sort((a, b) => (groups[b].savedAt ?? 0) - (groups[a].savedAt ?? 0));

  groupsList.innerHTML = names.map((name, idx) => {
    const g    = groups[name];
    const date = new Date(g.savedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    // Usamos índice numérico en data-idx para evitar problemas de escape en atributos
    // Vista previa: avatares del grupo
    const previewAvatars = (g.participants || []).slice(0, 8).map(p => {
      const c = getAvatarColorsByName(p.name);
      return `<div style="width:26px;height:26px;border-radius:50%;background:${c.gradient};
        display:inline-flex;align-items:center;justify-content:center;
        font-family:var(--font-display);font-size:0.62rem;color:white;
        margin-right:-6px;border:2px solid var(--color-bg-card);flex-shrink:0;"
        title="${escapeHtml(p.name)}">${escapeHtml(getInitials(p.name))}</div>`;
    }).join('');
    const extra = (g.participants?.length ?? 0) > 8 ? `<span style="font-size:0.7rem;color:var(--color-text-dim);margin-left:10px;">+${g.participants.length - 8}</span>` : '';

    return `
      <div class="saved-group-item" data-group-idx="${idx}">
        <div style="flex:1;min-width:0;">
          <div class="saved-group-name">${escapeHtml(name)}</div>
          <div class="saved-group-meta">${g.count} personas · ${date}</div>
          <div style="display:flex;align-items:center;margin-top:6px;padding-left:2px;">${previewAvatars}${extra}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;margin-left:8px;">
          <button class="btn btn-accent" style="padding:6px 14px;font-size:0.8rem;" data-action="load" data-idx="${idx}">Cargar</button>
          <button class="btn btn-danger" style="padding:6px 10px;font-size:0.8rem;" data-action="del"  data-idx="${idx}" aria-label="Eliminar grupo"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      </div>`;
  }).join('');

  groupsList.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx   = parseInt(btn.dataset.idx, 10);
      const name  = names[idx];
      if (!name) return;

      if (btn.dataset.action === 'load') {
        const group = loadGroup(name);
        if (!group) return;
        import('./participants.js').then(({ loadParticipants }) => {
          loadParticipants(group.participants);
          state.set({ currentGroupName: name });
          loadPersistedStats(); // fusionar stats históricas
          showToast(`"${escapeHtml(name)}" cargado`);
          closeGroupsModal();
        });
      } else {
        deleteGroup(name);
        showToast(`"${escapeHtml(name)}" eliminado`);
        renderGroupsList();
      }
    });
  });
}

function handleSaveGroup() {
  const name = inputGroupName?.value?.trim() ?? '';
  if (!name) {
    showToast('Escribe un nombre para el grupo', 'error');
    return;
  }
  const participants = state.getKey('participants');
  if (participants.length === 0) {
    showToast('No hay participantes para guardar', 'error');
    return;
  }
  if (saveGroup(name, participants)) {
    if (inputGroupName) inputGroupName.value = '';
    state.set({ currentGroupName: name });
    showToast(`"${name}" guardado`);
    renderGroupsList();
  } else {
    showToast('Error al guardar', 'error');
  }
}

// ══════════════════════════════════════════════════════════
// NOTA: Las estadísticas y navegación han sido movidas a stats.js
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// HELPERS DE UI
// ══════════════════════════════════════════════════════════
function updateCounter() {
  if (!counterChip) return;
  const total  = state.getKey('participants').length;
  const active = state.getActiveParticipants().length;
  counterChip.innerHTML = `<span class="count">${active}</span>/${total} activos`;
}

function updateSortButton() {
  if (!btnSortear) return;
  const can  = state.canSpin();
  const mode = state.getKey('mode');
  const elimIds  = state.getKey('eliminatedIds') || [];
  const orderSeq = state.getKey('orderSequence')  || [];
  const orderIdx = state.getKey('orderRevealIndex') ?? 0;

  btnSortear.disabled      = !can;
  btnSortear.style.opacity = can ? '1' : '0.45';

  // Texto contextual según modo y progreso de secuencia
  let label = 'SORTEAR';
  if (mode === 'elimination' && elimIds.length > 0) {
    label = `RONDA ${elimIds.length + 1}`;
  } else if (mode === 'order' && orderSeq.length > 0 && orderIdx < orderSeq.length) {
    const ords = ['1º','2º','3º','4º','5º','6º','7º','8º','9º','10º','11º','12º'];
    label = `REVELAR ${ords[orderIdx] ?? (orderIdx + 1) + 'º'}`;
  } else if (mode === 'team') {
    label = `ELEGIR ${state.getKey('teamSize') || 2}`;
  } else if (mode === 'revenge') {
    const target = state.getKey('revengeTarget');
    if (target) {
      const name = state.getKey('participants').find(p => p.id === target)?.name ?? '';
      label = name ? `VENGANZA (${name.slice(0,8)})` : 'VENGANZA';
    } else {
      label = 'SORTEAR';
    }
  } else if (mode === 'duel') {
    const duelIds = state.getKey('duelIds') || [];
    label = duelIds.length < 2 ? `ELIGE ${2 - duelIds.length} MÁS` : 'DUELO';
  } else if (mode === 'split') {
    label = 'DIVIDIR';
  } else if (mode === 'russian') {
    const survivors = state.getKey('russianSurvivors') || [];
    if (survivors.length > 0) {
      label = `RONDA — ${survivors.length} quedan`;
    } else {
      label = 'RULETA RUSA';
    }
  }

  // Actualizar el nodo de texto, preservando SVG del bolt y hold-ring
  // El orden de children es: [svg.bolt, text-node, svg.hold-ring]
  let updated = false;
  for (const node of btnSortear.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
      node.textContent = ` ${label} `;
      updated = true;
      break;
    }
  }
  if (!updated) {
    // Insertar texto después del primer SVG (el rayo)
    const firstSvg = btnSortear.querySelector('svg:not(.hold-ring)');
    const textNode = document.createTextNode(` ${label} `);
    if (firstSvg && firstSvg.nextSibling) {
      btnSortear.insertBefore(textNode, firstSvg.nextSibling);
    } else {
      btnSortear.insertBefore(textNode, btnSortear.firstChild);
    }
  }
}

function updateModeButtons() {
  const mode = state.getKey('mode');
  modeButtons?.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
    btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode));
  });
  updateModeDescription(mode);
  if (mode === 'team') syncTeamSizeControl();
}

function updatePhaseUI(phase) {
  const busy = phase === 'spinning' || phase === 'revealing';
  if (btnSortear)        btnSortear.disabled        = busy;
  if (inputParticipant)  inputParticipant.disabled  = busy;
  if (btnAddParticipant) btnAddParticipant.disabled = busy;
}

export function showToast(message, type = 'info') {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.style.borderColor = type === 'error' ? 'var(--color-impact)' : 'var(--color-border-bright)';
  
  // Timing más natural: errores duran más, info menos
  const duration = type === 'error' ? 3200 : 2200;
  
  toastEl.classList.add('visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toastEl?.classList.remove('visible'), duration);
}

function handleInstall() {
  if (!_deferredInstallPrompt) return;
  _deferredInstallPrompt.prompt();
  _deferredInstallPrompt.userChoice.then(() => {
    _deferredInstallPrompt = null;
    installBanner?.classList.remove('visible');
  });
}

// ══════════════════════════════════════════════════════════
// NOTA: El sistema de temas ha sido movido a themes.js
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// NOTA: El sistema de configuración/ajustes ha sido movido a settings.js
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// EDITOR DE SUERTE
// ══════════════════════════════════════════════════════════

/**
 * Actualiza la UI del selector de suerte en el menú de avatar.
 * Marca el nivel activo y muestra la probabilidad real.
 */
function updateLuckUI(participantId, luck) {
  // Marcar estrella activa
  luckStars?.forEach(btn => {
    const l = parseInt(btn.dataset.luck, 10);
    btn.classList.toggle('active', l === luck);
    btn.style.color = l === luck ? 'var(--color-accent)' : '';
  });

  // Calcular y mostrar probabilidad real usando el sistema de pesos
  if (luckMenuHint) {
    const participants = state.getKey('participants');
    const active = state.getActiveParticipants();
    if (active.length === 0) { luckMenuHint.textContent = '—'; return; }

    const totalWeight = active.reduce((sum, p) => sum + (6 - p.luck), 0);
    const thisWeight  = 6 - luck;
    const pct         = totalWeight > 0 ? Math.round(thisWeight / totalWeight * 100) : 0;

    const labels = { 1: 'Muy probable', 2: 'Probable', 3: 'Normal', 4: 'Poco probable', 5: 'Muy improbable' };
    luckMenuHint.textContent = `${labels[luck] ?? 'Normal'} · ${pct}%`;
    luckMenuHint.style.color = luck <= 2 ? 'var(--color-impact)' : luck >= 4 ? 'var(--color-accent)' : 'var(--color-text-dim)';
  }
}

// ══════════════════════════════════════════════════════════
// NOTA: La persistencia de estadísticas ha sido movida a stats.js
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// COMPARTIR RESULTADO (Canvas → PNG)
// ══════════════════════════════════════════════════════════

/**
 * Genera una imagen del resultado y la comparte o descarga.
 * Dibuja en Canvas: fondo oscuro, avatar, nombre, pregunta, branding.
 */
/**
 * Genera una tarjeta de resultado de alta calidad y la comparte.
 * Carga las fuentes web explícitamente para que Canvas las pueda usar.
 */
async function shareResult() {
  const { participants, question } = state.get();
  const winnerId = state.getKey('winnerId');
  const id       = Array.isArray(winnerId) ? winnerId[0] : winnerId;
  const winner   = participants.find(p => p.id === id);
  if (!winner) return;

  showToast('Generando imagen...');

  const colors   = getAvatarColorsByName(winner.name);
  const initials = getInitials(winner.name);

  // ── Cargar fuentes en Canvas ──
  // Intentar con FontFace API, con fallback robusto si falla (CORS, offline)
  const BEBAS_URL = 'url(https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.woff2)';
  const JAKARTA_URL = 'url(https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4Ko20yygg_o.woff2)';

  const loadFont = async (name, url, opts = {}) => {
    // Si la fuente ya está cargada en el doc, usarla directamente
    if (document.fonts.check(`12px "${name}"`)) return;
    try {
      const f = new FontFace(name, url, opts);
      await f.load();
      document.fonts.add(f);
    } catch { /* silencioso — el canvas usará la fuente del sistema */ }
  };

  await Promise.allSettled([
    loadFont('Bebas Neue', BEBAS_URL),
    loadFont('Plus Jakarta Sans', JAKARTA_URL, { weight: '600' }),
  ]);

  // Esperar a que el doc confirme que las fuentes están listas
  try { await document.fonts.ready; } catch { /* continúa */ }

  // ── Dimensiones tarjeta tipo Instagram Story ──
  const W = 400, H = 600;
  const DPR = 2;
  const canvas = document.createElement('canvas');
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const hue  = colors.hue;
  const hue2 = (hue + 40) % 360;

  // ══ FONDO ══
  // Base negra profunda
  ctx.fillStyle = '#07070f';
  ctx.fillRect(0, 0, W, H);

  // Gradiente radial del color del ganador (amplio, parte superior)
  const bgGrad = ctx.createRadialGradient(W/2, H * 0.3, 0, W/2, H * 0.3, W * 1.1);
  bgGrad.addColorStop(0,   `hsla(${hue}, 70%, 20%, 0.9)`);
  bgGrad.addColorStop(0.5, `hsla(${hue}, 60%, 12%, 0.6)`);
  bgGrad.addColorStop(1,   'transparent');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Segundo gradiente desde abajo (contraste)
  const bgGrad2 = ctx.createLinearGradient(0, H * 0.6, 0, H);
  bgGrad2.addColorStop(0, 'transparent');
  bgGrad2.addColorStop(1, `hsla(${hue2}, 50%, 8%, 0.8)`);
  ctx.fillStyle = bgGrad2;
  ctx.fillRect(0, 0, W, H);

  // ══ RAYOS DE LUZ DESDE ARRIBA ══
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = -2; i <= 2; i++) {
    const rayX = W/2 + i * 60;
    const rayGrad = ctx.createLinearGradient(rayX, 0, W/2, H * 0.55);
    rayGrad.addColorStop(0, `hsl(${hue}, 90%, 80%)`);
    rayGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.moveTo(rayX - 15, 0);
    ctx.lineTo(rayX + 15, 0);
    ctx.lineTo(W/2 + 30, H * 0.55);
    ctx.lineTo(W/2 - 30, H * 0.55);
    ctx.fillStyle = rayGrad;
    ctx.fill();
  }
  ctx.restore();

  // ══ AVATAR ══
  const cx = W / 2;
  const cy = H * 0.32;
  const r  = 76;

  // Glow exterior triple
  for (let i = 3; i >= 1; i--) {
    ctx.save();
    ctx.shadowColor = colors.color;
    ctx.shadowBlur  = 15 * i;
    ctx.beginPath();
    ctx.arc(cx, cy, r + i * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.15 * i})`;
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Anillo sólido
  ctx.save();
  ctx.shadowColor = colors.color;
  ctx.shadowBlur  = 25;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.strokeStyle = colors.color;
  ctx.lineWidth   = 3;
  ctx.stroke();
  ctx.restore();

  // Relleno gradiente del avatar
  const avatarGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  avatarGrad.addColorStop(0, `hsl(${hue},  90%, 32%)`);
  avatarGrad.addColorStop(1, `hsl(${hue2}, 95%, 56%)`);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = avatarGrad;
  ctx.fill();

  // Brillo interno (highlight en la parte superior del avatar)
  const highlight = ctx.createRadialGradient(cx - r*0.3, cy - r*0.35, 0, cx, cy, r);
  highlight.addColorStop(0,   'rgba(255,255,255,0.35)');
  highlight.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  highlight.addColorStop(1,   'rgba(0,0,0,0.2)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = highlight;
  ctx.fill();

  // Iniciales
  const initFontSize = initials.length > 2 ? r * 0.58 : r * 0.68;
  ctx.fillStyle    = 'white';
  ctx.font         = `${initFontSize}px 'Bebas Neue', Impact, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur   = 6;
  ctx.fillText(initials, cx, cy + initFontSize * 0.05);
  ctx.shadowBlur = 0;

  // ══ LABEL SUPERIOR ══
  ctx.fillStyle    = `hsla(${hue}, 60%, 75%, 0.7)`;
  ctx.font         = '600 11px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '0.18em';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('EL ELEGIDO ES', W/2, H * 0.565);

  // ══ NOMBRE ══
  // Calcular tamaño de fuente que quepa en el ancho disponible
  const maxW   = W * 0.88;
  const name   = winner.name.toUpperCase();
  let fontSize = 68;
  ctx.font = `${fontSize}px 'Bebas Neue', Impact, sans-serif`;
  while (ctx.measureText(name).width > maxW && fontSize > 28) {
    fontSize -= 2;
    ctx.font = `${fontSize}px 'Bebas Neue', Impact, sans-serif`;
  }

  // Sombra/glow del nombre
  ctx.save();
  ctx.shadowColor = colors.color;
  ctx.shadowBlur  = 22;
  ctx.fillStyle   = colors.color;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(name, W/2, H * 0.672);
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = 'white';
  ctx.globalAlpha = 0.15;
  ctx.fillText(name, W/2 + 1, H * 0.672 + 1);
  ctx.restore();

  // ══ SEPARADOR DECORATIVO ══
  const sepY = H * 0.71;
  const sepGrad = ctx.createLinearGradient(W * 0.15, sepY, W * 0.85, sepY);
  sepGrad.addColorStop(0,   'transparent');
  sepGrad.addColorStop(0.3, `hsla(${hue}, 80%, 65%, 0.6)`);
  sepGrad.addColorStop(0.7, `hsla(${hue}, 80%, 65%, 0.6)`);
  sepGrad.addColorStop(1,   'transparent');
  ctx.strokeStyle = sepGrad;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, sepY);
  ctx.lineTo(W * 0.85, sepY);
  ctx.stroke();

  // ══ PREGUNTA ══
  // Multilínea si es larga
  ctx.fillStyle    = 'rgba(255,255,255,0.6)';
  ctx.font         = 'italic 600 14px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  const qMaxW  = W * 0.78;
  const qLines = wrapText(ctx, question, qMaxW);
  qLines.forEach((line, i) => {
    ctx.fillText(line, W/2, H * 0.758 + i * 20);
  });

  // ══ BRANDING INFERIOR ══
  // Línea de puntos decorativa
  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.1,  H * 0.9);
  ctx.lineTo(W * 0.9,  H * 0.9);
  ctx.stroke();
  ctx.restore();

  // Logo "Splitr"
  ctx.fillStyle    = `hsla(${hue}, 70%, 70%, 0.5)`;
  ctx.font         = `bold 18px 'Bebas Neue', sans-serif`;
  ctx.letterSpacing = '0.12em';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SPLITR', W/2, H * 0.955);

  // ══ BORDE DECORATIVO ══
  const border = ctx.createLinearGradient(0, 0, W, H);
  border.addColorStop(0,   `hsla(${hue},  80%, 65%, 0.5)`);
  border.addColorStop(0.5, `hsla(${hue2}, 80%, 65%, 0.2)`);
  border.addColorStop(1,   `hsla(${hue},  80%, 65%, 0.5)`);
  ctx.strokeStyle = border;
  ctx.lineWidth   = 2;
  const br = 20; // border radius
  ctx.beginPath();
  ctx.roundRect(1, 1, W - 2, H - 2, br);
  ctx.stroke();

  // ══ COMPARTIR / DESCARGAR ══
  canvas.toBlob(async blob => {
    if (!blob) { showToast('Error al generar la imagen'); return; }
    const file = new File([blob], 'splitr-resultado.png', { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${winner.name} tiene que pagar`,
          text:  `${question} → ${winner.name} · via Splitr`,
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // usuario canceló
      }
    }
    // Fallback: descargar PNG
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'splitr-resultado.png' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('Imagen descargada');
  }, 'image/png', 0.95);
}

/**
 * Divide un texto en líneas que quepan en maxWidth.
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line    = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ══════════════════════════════════════════════════════════
// NOTA: Las funciones switchStatsTab y renderHistory han sido movidas a stats.js
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// RULETA DE CASINO
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// NOTA: La función runRouletteAnimation ha sido movida a roulette.js
// ══════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════
// SORTEO POR VOZ
// ══════════════════════════════════════════════════════════

let _recognition = null;
let _voiceActive = false;

/**
 * Configura el reconocimiento de voz.
 * Muestra el botón solo si la API está disponible.
 * Escucha "sortear", "sort", "venga", "ya" para disparar.
 */
function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // API no disponible — mantener botón oculto
    return;
  }

  // Mostrar botón de voz
  if (btnVoice) btnVoice.style.display = '';

  _recognition = new SpeechRecognition();
  _recognition.continuous    = true;
  _recognition.interimResults = false;
  _recognition.lang           = 'es-ES';
  _recognition.maxAlternatives = 1;

  const TRIGGERS = ['sortear', 'sort', 'venga', 'ya', 'dale', 'sortea', 'girar', 'ruleta'];

  _recognition.onresult = (event) => {
    const last       = event.results[event.results.length - 1];
    const transcript = last[0].transcript.toLowerCase().trim();
    const triggered  = TRIGGERS.some(t => transcript.includes(t));

    if (triggered && state.getKey('phase') === 'idle' && state.canSpin()) {
      showToast(`Voz: "${transcript}"`);
      handleSortear();
    }
  };

  _recognition.onerror = (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      console.warn('[Voz]', e.error);
      stopVoice();
    }
  };

  _recognition.onend = () => {
    // Reiniciar automáticamente si sigue activo
    if (_voiceActive) {
      try { _recognition.start(); } catch { /* ignora */ }
    }
  };

  // Listener del botón
  btnVoice?.addEventListener('click', toggleVoice);
}

function toggleVoice() {
  if (_voiceActive) {
    stopVoice();
  } else {
    startVoice();
  }
}

function startVoice() {
  if (!_recognition) return;
  try {
    _recognition.start();
    _voiceActive = true;
    btnVoice?.classList.add('voice-listening');
    showToast('Escuchando… di "Sortear"');
  } catch { /* ya está activo */ }
}

function stopVoice() {
  if (!_recognition) return;
  _voiceActive = false;
  try { _recognition.stop(); } catch { /* ignora */ }
  btnVoice?.classList.remove('voice-listening');
}

// ══════════════════════════════════════════════════════════
// MODOS NUEVOS
// ══════════════════════════════════════════════════════════

/**
 * Modo Venganza: el último elegido tiene peso 5 (más probable).
 * Los demás tienen su peso normal.
 */
function selectOneWithRevenge(active) {
  const target = state.getKey('revengeTarget');
  if (!target) return selectOne(active);

  // Construir lista con peso extra para el target
  const pool = [];
  active.forEach(p => {
    const weight = p.id === target ? 5 : Math.max(1, 6 - p.luck);
    for (let i = 0; i < weight; i++) pool.push(p.id);
  });

  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return pool[arr[0] % pool.length];
}

/**
 * Modo Dividir: divide en 2 equipos aleatorios y muestra resultado directo.
 */
function handleSplitMode(active) {
  if (active.length < 2) {
    showToast('Necesitas al menos 2 participantes');
    return;
  }

  // Fisher-Yates shuffle
  const shuffled = [...active];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const half   = Math.ceil(shuffled.length / 2);
  const team1  = shuffled.slice(0, half);
  const team2  = shuffled.slice(half);

  // Mostrar resultado como overlay especial
  showSplitResult(team1, team2);
}

/**
 * Muestra el resultado de la división de equipos.
 */
function showSplitResult(team1, team2) {
  if (!resultOverlay) return;

  // Usar el overlay de resultado con contenido personalizado
  const { question } = state.get();

  resultOverlay.style.setProperty('--result-rgb', '0,245,255');

  if (resultAvatarBig) resultAvatarBig.style.display = 'none';
  if (resultLabel) resultLabel.textContent = '¡Equipos formados!';
  if (resultQuestion) resultQuestion.textContent = question;

  if (resultName) {
    resultName.style.fontSize = '0';
    resultName.dataset.text = '';
  }

  // Renderizar equipos en el área de acciones
  const actionsEl = document.getElementById('result-actions');
  if (actionsEl) {
    const teamHtml = (team, label, color) => `
      <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:12px;
                  padding:12px;border:1px solid ${color};min-width:0;">
        <div style="font-family:var(--font-display);font-size:0.75rem;
                    letter-spacing:0.15em;color:${color};margin-bottom:8px;">${label}</div>
        ${team.map(p => {
          const c = getAvatarColorsByName(p.name);
          return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
            <div style="width:28px;height:28px;border-radius:50%;background:${c.gradient};
                        display:flex;align-items:center;justify-content:center;
                        font-family:var(--font-display);font-size:0.7rem;color:white;
                        flex-shrink:0;">${escapeHtml(getInitials(p.name))}</div>
            <span style="font-size:0.85rem;font-weight:600;">${escapeHtml(p.name)}</span>
          </div>`;
        }).join('')}
      </div>`;

    actionsEl.innerHTML = `
      <div style="display:flex;gap:10px;width:100%;margin-bottom:10px;">
        ${teamHtml(team1, 'EQUIPO A', 'var(--color-accent)')}
        ${teamHtml(team2, 'EQUIPO B', 'var(--color-impact)')}
      </div>
      <button class="btn btn-accent" id="btn-result-again-split" style="width:100%;">
        Mezclar de nuevo
      </button>
      <button class="btn btn-icon" id="btn-result-close-split"
              style="width:auto;padding:12px 20px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/></svg>
        Cerrar
      </button>`;

    document.getElementById('btn-result-again-split')?.addEventListener('click', () => {
      closeResult();
      setTimeout(() => handleSortear(), 300);
    }, { once: true });
    document.getElementById('btn-result-close-split')?.addEventListener('click', () => {
      closeResult();
    }, { once: true });
  }

  resultOverlay.classList.add('visible');
  state.set({ phase: 'result' });
  if (prefs.sound) playWinnerFanfare();
  if (prefs.particles) {
    spawnParticles('var(--color-accent)');
    setTimeout(() => spawnParticles('var(--color-impact)'), 200);
  }
}

/**
 * Editar nombre de participante — tap largo en su avatar.
 * Reemplaza el avatar temporalmente con un input inline.
 */
function startEditParticipantName(id, wrapEl) {
  const p = state.getKey('participants').find(p => p.id === id);
  if (!p) return;

  const nameEl = wrapEl.querySelector('.avatar-name');
  const avatarEl = wrapEl.querySelector('.avatar');
  if (!nameEl || !avatarEl) return;

  if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([8, 6, 14]);

  const input = document.createElement('input');
  input.type        = 'text';
  input.value       = p.name;
  input.maxLength   = 18;
  input.className   = 'avatar-name-edit-input';
  input.style.cssText = `width:100%;text-align:center;font-size:0.72rem;
    background:var(--color-bg-2);border:1px solid var(--color-accent);
    border-radius:6px;padding:3px 4px;color:var(--color-text);
    font-family:var(--font-ui);outline:none;box-shadow:0 0 8px var(--color-accent);`;

  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const newName = input.value.trim();
    import('./participants.js').then(({ renameParticipant }) => {
      if (newName && newName !== p.name) {
        renameParticipant(id, newName);
        showToast('Nombre actualizado');
      }
      // El grid se re-renderiza por el state listener
    }).catch(() => {
      // fallback si no existe renameParticipant: forzar re-render
      const newNameEl = document.createElement('span');
      newNameEl.className = 'avatar-name';
      newNameEl.textContent = newName || p.name;
      input.replaceWith(newNameEl);
    });
  };

  input.addEventListener('blur', commit, { once: true });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = p.name; input.blur(); }
  });
}

/**
 * Activa selección de participantes para Duelo (toca 2 avatares).
 * Los avatares seleccionados se marcan visualmente.
 */
function updateDuelBanner(current) {
  const banner = document.getElementById('duel-banner');
  const text   = document.getElementById('duel-banner-text');
  if (!banner || !text) return;
  if (state.getKey('mode') !== 'duel') { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';
  if (current.length === 0) {
    text.textContent = 'Toca 2 avatares para enfrentarlos';
    banner.classList.remove('duel-banner-ready');
  } else if (current.length === 1) {
    const name = state.getKey('participants').find(p => p.id === current[0])?.name ?? '?';
    text.textContent = `${name} vs... ¿quién?`;
    banner.classList.remove('duel-banner-ready');
  } else {
    const names = current.map(id => state.getKey('participants').find(p => p.id === id)?.name ?? '?');
    text.textContent = `${names[0]} vs ${names[1]} — listo`;
    banner.classList.add('duel-banner-ready');
  }
}

function handleDuelSelection(participantId) {
  const current = [...(state.getKey('duelIds') || [])];
  const idx = current.indexOf(participantId);

  if (idx >= 0) {
    current.splice(idx, 1);
  } else if (current.length < 2) {
    current.push(participantId);
  } else {
    current[0] = current[1];
    current[1] = participantId;
  }

  state.set({ duelIds: current });
  // applyDuelClasses se llama desde el subscriber al detectar dChanged

  const desc = document.getElementById('duel-desc-text');
  if (desc) {
    if (current.length === 0) desc.textContent = 'Toca 2 avatares para enfrentarlos.';
    else if (current.length === 1) {
      const p = state.getKey('participants').find(p => p.id === current[0]);
      desc.textContent = `${p?.name ?? '?'} vs… ¿quién más?`;
    } else {
      const names = current.map(id => state.getKey('participants').find(p => p.id === id)?.name ?? '?');
      desc.textContent = `${names[0]} vs ${names[1]} — ¡Sortear!`;
    }
  }
}

/** Aplica clases duel-selected / duel-idle a todos los avatares del grid */
function applyDuelClasses(duelIds) {
  if (!participantsGrid) return;
  state.getActiveParticipants().forEach(p => {
    const el = participantsGrid.querySelector(`[data-id="${p.id}"]`);
    if (!el) return;
    el.classList.toggle('duel-selected', duelIds.includes(p.id));
    el.classList.toggle('duel-idle', duelIds.length > 0 && !duelIds.includes(p.id));
  });
}

// ══════════════════════════════════════════════════════════
// RULETA RUSA — Mecánica real de turno por turno
// ══════════════════════════════════════════════════════════

/**
 * Lanza la Ruleta Rusa:
 * - Tambor con 6 cámaras, 1 bala en posición aleatoria
 * - Jugadores en orden aleatorio
 * - Cada jugador jala el gatillo — la mayoría sobrevive (CLIC)
 * - Cuando llega la bala → BANG → condenado
 * - La probabilidad sube cada ronda: 1/6, 1/5, 1/4...
 */
// ══════════════════════════════════════════════════════════
// NOTA: La función launchRussianRoulette ha sido movida a russian.js
// ══════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════
// MODO BOMBA (HOT POTATO)
// ══════════════════════════════════════════════════════════
function launchBomb(participants) {
  state.set({phase:'spinning'});
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9998;background:rgba(4,2,14,0.97);display:flex;align-items:center;justify-content:center;animation:overlayFadeIn 250ms ease both;';
  document.body.appendChild(overlay);
  const W=Math.min(window.innerWidth,480), H=Math.min(window.innerHeight,680);
  const DPR=Math.min(window.devicePixelRatio||1,2);
  const canvas=document.createElement('canvas');
  canvas.width=W*DPR; canvas.height=H*DPR;
  canvas.style.cssText='width:'+W+'px;height:'+H+'px;';
  const ctx=canvas.getContext('2d'); ctx.scale(DPR,DPR);
  overlay.appendChild(canvas);

  const S=Math.min(W,H)/480;
  const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
  const orange='#FF6B00';

  // Duración larga + tiempo de mecha aleatorio entre 4s y 7s
  const FUSE_DUR=4000+Math.random()*3000;
  const TOTAL=FUSE_DUR+2000;
  const winner=participants[Math.floor(Math.random()*participants.length)];
  const n=participants.length;
  const sparks=[]; let exploded=false, t=0, rafId;
  let lastVibrate=0;

  function draw(){
    ctx.clearRect(0,0,W,H);
    const p=Math.min(t/FUSE_DUR,1); // 0..1 durante la mecha
    const cx=W/2, cy=H*0.42;

    // ── Holder ──
    const urgency=Math.pow(p,2); // aceleración exponencial del cambio
    const passMs=Math.max(80, 320-urgency*240);
    const holderIdx=Math.floor(t/passMs)%n;
    const holder=participants[holderIdx];
    const hc=getAvatarColorsByName(holder.name);

    if(!exploded){
      // Fondo pulsante rojo al final
      if(p>0.7){
        const hp=(p-0.7)/0.3;
        const pulse=Math.abs(Math.sin(t*0.02*(1+hp*3)));
        ctx.fillStyle=`rgba(80,0,0,${hp*pulse*0.18})`; ctx.fillRect(0,0,W,H);
      }

      // Avatar del holder — tamaño pulsante con urgencia
      const avatarPulse=p>0.6?1+Math.abs(Math.sin(t*0.03*(1+(p-0.6)*4)))*0.08:1;
      const avR=34*S*avatarPulse;
      ctx.beginPath(); ctx.arc(cx,cy-72*S,avR*1.25,0,Math.PI*2);
      ctx.fillStyle=hc.color+'22'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy-72*S,avR,0,Math.PI*2);
      ctx.fillStyle=hc.gradient||hc.color; ctx.fill();
      ctx.font=`bold ${Math.round(14*S)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#fff'; ctx.fillText(getInitials(holder.name),cx,cy-72*S);
      ctx.textBaseline='alphabetic';
      ctx.font=`bold ${Math.round(15*S*avatarPulse)}px sans-serif`; ctx.fillStyle=hc.color;
      ctx.fillText(holder.name.toUpperCase(),cx,cy-26*S);

      // ── Bomba ──
      const bombWobble=p>0.5?Math.sin(t*0.15*(1+(p-0.5)*3))*5*S*(p-0.5)*2:0;
      const bx=cx+bombWobble, by=cy+30*S, br=32*S;

      // Sombra
      ctx.save(); ctx.globalAlpha=0.3;
      ctx.beginPath(); ctx.ellipse(bx,by+br+4*S,br*0.85,br*0.2,0,0,Math.PI*2);
      ctx.fillStyle='#000'; ctx.fill(); ctx.restore();

      // Cuerpo
      ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2);
      ctx.fillStyle='#111'; ctx.fill();
      ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=2*S; ctx.stroke();
      // Highlight
      ctx.beginPath(); ctx.arc(bx-br*0.28,by-br*0.3,br*0.38,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fill();
      // Rayitas de textura
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1*S;
      for(let i=0;i<4;i++){
        const a=i*Math.PI/4;
        ctx.beginPath(); ctx.arc(bx,by,br*0.75,a,a+0.4); ctx.stroke();
      }

      // Mecha (se acorta)
      const fuseMaxLen=45*S, fuseLen=fuseMaxLen*(1-p)+3*S;
      const fuseBaseX=bx+br*0.55, fuseBaseY=by-br*0.6;
      const fuseEndX=fuseBaseX+Math.sin(t*0.08)*4*S;
      const fuseEndY=fuseBaseY-fuseLen;

      ctx.strokeStyle='#7a4a15'; ctx.lineWidth=2.5*S; ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(fuseBaseX,fuseBaseY);
      ctx.quadraticCurveTo(fuseBaseX+12*S+Math.sin(t*0.06)*6*S, fuseBaseY-fuseLen*0.5, fuseEndX,fuseEndY);
      ctx.stroke();

      // Chispa en la punta de la mecha
      if(fuseLen>3*S){
        const sparkCount=Math.ceil(2+p*4);
        for(let i=0;i<sparkCount;i++){
          const a=Math.random()*Math.PI*2, r=(2+Math.random()*6)*S;
          ctx.beginPath(); ctx.arc(fuseEndX+Math.cos(a)*r,fuseEndY+Math.sin(a)*r,(1+Math.random()*2)*S,0,Math.PI*2);
          ctx.fillStyle=i%2===0?'#FFD700':'#FF8800'; ctx.globalAlpha=Math.random()*0.9+0.1; ctx.fill();
        }
        ctx.globalAlpha=1;
        // Nodo principal de la chispa
        ctx.beginPath(); ctx.arc(fuseEndX,fuseEndY,3*S,0,Math.PI*2);
        ctx.fillStyle='#FFF'; ctx.fill();
      }

      // ── Barra de mecha ──
      const barW=200*S, barH=12*S, bx2=cx-barW/2, bY=cy+80*S;
      // Fondo
      ctx.fillStyle='rgba(255,255,255,0.07)';
      ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx2,bY,barW,barH,barH/2); else ctx.rect(bx2,bY,barW,barH);
      ctx.fill();
      // Progreso — color cambia verde→amarillo→rojo pulsante
      const fuseColor=p<0.4?'#39FF14':p<0.68?`rgb(${Math.round(57+p*250)},${Math.round(255-p*220)},20)`:`rgb(255,${Math.round(20*(1-p)*3)},20)`;
      const fuseW=barW*(1-p);
      if(fuseW>0){
        ctx.fillStyle=fuseColor;
        ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx2,bY,fuseW,barH,barH/2); else ctx.rect(bx2,bY,fuseW,barH);
        ctx.fill();
        // Glow del color
        if(p>0.65){
          ctx.shadowColor=fuseColor; ctx.shadowBlur=8;
          ctx.fillStyle=fuseColor;
          ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx2,bY,fuseW,barH,barH/2); else ctx.rect(bx2,bY,fuseW,barH);
          ctx.fill(); ctx.shadowBlur=0;
        }
      }
      ctx.font=`${Math.round(10*S)}px sans-serif`; ctx.textAlign='center';
      ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fillText('MECHA',cx,bY+24*S);

      // Cuenta regresiva textual al final
      if(p>0.75){
        const sec=Math.ceil((1-p)*FUSE_DUR/1000);
        const cp=(p-0.75)/0.25, cpPulse=Math.abs(Math.sin(t*0.04*(1+cp*4)));
        ctx.font=`bold ${Math.round((20+cp*20)*S*cpPulse)}px sans-serif`;
        ctx.textAlign='center'; ctx.fillStyle=impact; ctx.globalAlpha=Math.min(cp*3,1)*cpPulse;
        ctx.fillText(sec>0?sec+'…':'¡BOOM!', cx, cy-110*S);
        ctx.globalAlpha=1;
      }

      // Vibración creciente
      if(p>0.5&&prefs.vibration&&'vibrate'in navigator){
        const vibInt=Math.round(600-p*520);
        if(t-lastVibrate>vibInt){ lastVibrate=t; navigator.vibrate(p>0.82?50:25); }
      }

    } else {
      // ── POST-EXPLOSIÓN ──
      const ep=Math.min((t-FUSE_DUR)/500,1);

      // Flash expansivo
      if(ep<0.4){
        const fb=ep<0.2?ep/0.2:(0.4-ep)/0.2;
        ctx.beginPath(); ctx.arc(cx,cy+30*S,100*S*fb,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,120,0,${fb*0.6})`; ctx.fill();
        ctx.fillStyle=`rgba(255,255,200,${fb*0.35})`; ctx.fillRect(0,0,W,H);
      }

      // Chispas
      sparks.forEach(s=>{
        s.x+=s.vx; s.y+=s.vy; s.vy+=0.14*S; s.vx*=0.97; s.alpha-=0.02;
        if(s.alpha<=0) return;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);
        ctx.fillStyle=s.color; ctx.globalAlpha=s.alpha; ctx.fill();
      });
      ctx.globalAlpha=1;

      // Reveal del condenado
      if(ep>0.3){
        const rp=Math.min((ep-0.3)/0.4,1), pulse=0.85+0.15*Math.sin(t*0.03);
        const wc=getAvatarColorsByName(winner.name);
        const avR=38*S*rp*pulse;

        ctx.beginPath(); ctx.arc(cx,cy-10*S,avR*1.3,0,Math.PI*2);
        ctx.fillStyle=wc.color+'22'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx,cy-10*S,avR,0,Math.PI*2);
        ctx.fillStyle=wc.gradient||wc.color; ctx.globalAlpha=rp; ctx.fill(); ctx.globalAlpha=1;

        ctx.font=`bold ${Math.round(14*S*rp)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='#fff'; ctx.globalAlpha=rp;
        ctx.fillText(getInitials(winner.name),cx,cy-10*S); ctx.textBaseline='alphabetic';

        ctx.font=`bold ${Math.round(42*S*rp*pulse)}px sans-serif`;
        ctx.fillStyle=impact; ctx.fillText('BOOM!',cx,cy-62*S);

        ctx.font=`bold ${Math.round(24*S*rp*pulse)}px sans-serif`;
        ctx.fillStyle=wc.color;
        ctx.fillText(winner.name.toUpperCase(),cx,cy+44*S);
        ctx.globalAlpha=1;
      }
    }

    // Trigger explosión
    if(p>=1&&!exploded){
      exploded=true;
      for(let i=0;i<38;i++){
        const a=Math.random()*Math.PI*2, spd=(4+Math.random()*11)*S;
        sparks.push({x:cx,y:cy+30*S,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-5*S,alpha:1,size:(2+Math.random()*5)*S,color:i%3===0?'#FFD700':i%3===1?orange:impact});
      }
      if(prefs.flash) triggerImpactFlash();
      if(prefs.sound) playWinnerFanfare();
      if(prefs.vibration&&'vibrate'in navigator) navigator.vibrate([150,60,300,60,500]);
    }

    t+=16;
    if(t<TOTAL) rafId=requestAnimationFrame(draw);
    else{
      overlay.style.transition='opacity 220ms ease'; overlay.style.opacity='0';
      setTimeout(()=>{
        overlay.remove();
        state.set({winnerId:winner.id, phase:'revealing'});
        state.recordChosen(winner.id);
        state.recordHistory(winner.id,winner.name,state.getKey('question'),'bomb');
        persistStats();
        if(prefs.particles) spawnParticles(impact);
        showResult(winner.id);
      },280);
    }
  }
  rafId=requestAnimationFrame(draw);
}

// ══════════════════════════════════════════════════════════
// MODO TORNEO
// ══════════════════════════════════════════════════════════
function launchTournament(participants) {
  // Por ahora, el torneo funciona como eliminación sucesiva
  // TODO: Implementar bracket visual completo
  state.set({ mode: 'elimination' });
  showToast('Torneo: eliminación hasta el campeón', 'info');
  handleSortear();
}

// ══════════════════════════════════════════════════════════
// MODO CARA O CRUZ
// ══════════════════════════════════════════════════════════
function launchCoinFlip(participants) {
  state.set({ phase: 'spinning' });
  
  const overlay = document.createElement('div');
  overlay.className = 'coin-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(4,2,14,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:overlayFadeIn 250ms ease both;';
  
  const coinEl = document.createElement('div');
  coinEl.style.cssText = 'width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FFA500);box-shadow:0 0 40px rgba(255,215,0,0.6);display:flex;align-items:center;justify-content:center;font-size:48px;animation:coinFlip 2s ease-out;';
  
  const result = Math.random() < 0.5 ? 'cara' : 'cruz';
  coinEl.textContent = result === 'cara' ? '👤' : '✝️';
  
  const label = document.createElement('div');
  label.style.cssText = 'margin-top:30px;font-size:28px;font-weight:bold;color:#FFD700;text-transform:uppercase;opacity:0;animation:fadeInUp 300ms ease 1.8s forwards;';
  label.textContent = result === 'cara' ? '¡CARA!' : '¡CRUZ!';
  
  overlay.appendChild(coinEl);
  overlay.appendChild(label);
  document.body.appendChild(overlay);
  
  // Agregar animación CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes coinFlip {
      0% { transform: rotateY(0deg) scale(0.5); }
      50% { transform: rotateY(1800deg) scale(1.2); }
      100% { transform: rotateY(3600deg) scale(1); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  
  if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([50, 50, 50, 50, 100]);
  if (prefs.sound) playWinnerFanfare();
  
  setTimeout(() => {
    overlay.style.transition = 'opacity 300ms ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      style.remove();
      state.set({ phase: 'idle' });
      showToast(`Resultado: ${result.toUpperCase()}`, 'info');
    }, 300);
  }, 3000);
}

// ══════════════════════════════════════════════════════════
// MODO DADO
// ══════════════════════════════════════════════════════════
function launchDice(participants) {
  state.set({ phase: 'spinning' });
  
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(4,2,14,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:overlayFadeIn 250ms ease both;';
  
  const diceEl = document.createElement('div');
  diceEl.style.cssText = 'width:100px;height:100px;background:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:56px;box-shadow:0 0 30px rgba(255,255,255,0.3);animation:diceRoll 1.5s ease-out;';
  
  const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const result = Math.floor(Math.random() * 6) + 1;
  diceEl.textContent = faces[result - 1];
  
  const label = document.createElement('div');
  label.style.cssText = 'margin-top:30px;font-size:32px;font-weight:bold;color:#00f5ff;opacity:0;animation:fadeInUp 300ms ease 1.3s forwards;';
  label.textContent = `¡${result}!`;
  
  overlay.appendChild(diceEl);
  overlay.appendChild(label);
  document.body.appendChild(overlay);
  
  // Agregar animación CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes diceRoll {
      0% { transform: rotate(0deg) scale(0.3); }
      25% { transform: rotate(180deg) scale(1.3); }
      50% { transform: rotate(360deg) scale(0.9); }
      75% { transform: rotate(540deg) scale(1.1); }
      100% { transform: rotate(720deg) scale(1); }
    }
  `;
  document.head.appendChild(style);
  
  if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([30, 30, 30, 30, 80]);
  if (prefs.sound) playWinnerFanfare();
  
  // Si hay participantes, asignar el resultado
  if (participants.length > 0) {
    const winnerIndex = (result - 1) % participants.length;
    const winner = participants[winnerIndex];
    
    setTimeout(() => {
      const winnerLabel = document.createElement('div');
      winnerLabel.style.cssText = 'margin-top:20px;font-size:20px;color:#fff;opacity:0;animation:fadeInUp 300ms ease forwards;';
      winnerLabel.textContent = `Posición ${result}: ${winner.name}`;
      overlay.appendChild(winnerLabel);
    }, 1800);
  }
  
  setTimeout(() => {
    overlay.style.transition = 'opacity 300ms ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      style.remove();
      state.set({ phase: 'idle' });
      
      if (participants.length > 0) {
        const winnerIndex = (result - 1) % participants.length;
        const winner = participants[winnerIndex];
        showToast(`Dado: ${result} → ${winner.name}`, 'info');
      } else {
        showToast(`Resultado: ${result}`, 'info');
      }
    }, 300);
  }, 3500);
}

// ══════════════════════════════════════════════════════════
// MODO VOZ
// ══════════════════════════════════════════════════════════
function launchVoiceMode(participants) {
  // El modo voz usa reconocimiento de voz para agregar participantes
  showToast('Modo voz: di los nombres en voz alta', 'info');
  toggleVoice();
}
