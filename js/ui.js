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

// Utilidad global — debe estar antes que cualquier función que la use
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
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

/** Utilidad: crea el overlay base */
function _introBase(dur) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9997;
    background:rgba(4,2,14,0.96);
    pointer-events:none;
    animation:overlayFadeIn 180ms ease both;
  `;
  document.body.appendChild(overlay);

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // Viewport lógico centrado: máx 480×680 para que se vea igual en móvil y PC
  const W = Math.min(screenW, 480);
  const H = Math.min(screenH, 680);
  const offX = Math.floor((screenW - W) / 2);
  const offY = Math.floor((screenH - H) / 2);

  const canvas = document.createElement('canvas');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.cssText = `position:absolute;left:${offX}px;top:${offY}px;width:${W}px;height:${H}px;`;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  overlay.appendChild(canvas);

  const FADE = 250;
  setTimeout(() => {
    overlay.style.transition = `opacity ${FADE}ms ease`;
    overlay.style.opacity = '0';
  }, dur - FADE);
  setTimeout(() => overlay.remove(), dur + 50);

  return { overlay, canvas, ctx, W, H };
}

/** Añade el reveal del ganador debajo del canvas cuando p supera threshold */
function _showWinnerReveal(overlay, winner, winnerColors, triggerP, currentP) {
  if (!winner || currentP < triggerP) return;
  if (!overlay) return;
  // revealContainer es el segundo hijo (canvas es el primero)
  const container = overlay.children[1];
  if (!container || container.querySelector('.intro-winner-reveal')) return;

  const revealEl = document.createElement('div');
  revealEl.className = 'intro-winner-reveal';
  revealEl.style.cssText = `
    display:flex;flex-direction:column;align-items:center;gap:10px;
    animation:slideUpFade 400ms cubic-bezier(0.34,1.56,0.64,1) both;
  `;

  const avatar = document.createElement('div');
  avatar.style.cssText = `
    width:68px;height:68px;border-radius:50%;
    background:${winnerColors?.gradient || '#7B2FBE'};
    display:flex;align-items:center;justify-content:center;
    font-family:var(--font-display);font-size:1.3rem;color:white;
    box-shadow:0 0 0 3px ${winnerColors?.color || '#fff'},
               0 0 24px ${winnerColors?.color || '#fff'};
    animation:winnerSpring 500ms cubic-bezier(0.34,1.56,0.64,1) both;
  `;
  avatar.textContent = getInitials(winner.name);

  const nameEl = document.createElement('div');
  nameEl.style.cssText = `
    font-family:var(--font-display);
    font-size:clamp(1.6rem,7vw,2.6rem);
    letter-spacing:0.08em;
    color:${winnerColors?.color || 'var(--color-accent)'};
    text-shadow:0 0 24px ${winnerColors?.color || 'var(--color-accent)'};
    animation:nameReveal 400ms cubic-bezier(0.34,1.56,0.64,1) 100ms both;
  `;
  nameEl.textContent = winner.name.toUpperCase();

  revealEl.appendChild(avatar);
  revealEl.appendChild(nameEl);
  container.appendChild(revealEl);

  // Solo vibración suave en el reveal intermedio — el sonido y flash van en showResult
  if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([30, 15, 50]);
}

/** Normal — diana con círculos que se expanden y dardo que impacta */
/** ── NORMAL: Diana con dardo que cae y chispas radiales al impactar ── */
/** ── NORMAL: Dardo que vuela y perfora la diana con explosión de chispas ── */
// ── Detector de rendimiento para intros ──
function _isSlowDevice() {
  // Threshold más agresivo: cores<=6 o RAM<=6 = modo performance
  const cores = navigator.hardwareConcurrency || 4;
  const mem   = navigator.deviceMemory || 4;
  return cores <= 6 || mem <= 6;
}

/** ── NORMAL: Diana + dardo con chispas ── */
/** ── NORMAL: Diana — anillos que pulsan → dardo cae → chispas → diana brilla ── */
/* ═══════════════════════════════════════════════════════════
   ANIMACIONES FREE — pulidas y completas
   ═══════════════════════════════════════════════════════════ */

/** NORMAL — Diana con crosshair animado + dardo que cae */
function introNormal(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1500; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const cx=W/2, cy=H*0.44;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const sparks=[]; let impacted=false, t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);

      // Vignette sutil (una sola capa sin gradiente por frame)
      ctx.fillStyle='rgba(0,0,0,0.04)'; ctx.fillRect(0,0,W,H);

      // Diana — anillos con profundidad
      [80,62,44,28,13].forEach((r,i)=>{
        const show=Math.min(Math.max((p-i*0.05)/0.3,0),1);
        const er=1-Math.pow(1-show,3); if(er<=0) return;
        const pulse=1+0.055*Math.sin(t*0.013+i*0.9);
        const isRed=i%2===0;
        // Relleno con sombra interior
        ctx.beginPath(); ctx.arc(cx,cy,r*S*er*pulse,0,Math.PI*2);
        ctx.fillStyle=isRed?`rgba(160,0,25,${0.22*er})`:`rgba(255,255,255,${0.06*er})`; ctx.fill();
        // Borde con glow
        ctx.strokeStyle=isRed?`rgba(230,30,50,${er})`:`rgba(255,255,255,${er*0.28})`; ctx.lineWidth=2*S; ctx.stroke();
        // Línea interna brillante
        ctx.beginPath(); ctx.arc(cx,cy,r*S*er*pulse-3*S,0,Math.PI*2);
        ctx.strokeStyle=isRed?`rgba(255,80,80,${er*0.3})`:`rgba(255,255,255,${er*0.1})`; ctx.lineWidth=0.8*S; ctx.stroke();
      });

      // Crosshair que rota lentamente
      if(p>0.05&&p<0.95){
        const ca=Math.min((p-0.05)*4,1)*Math.min(1,(0.95-p)*10)*0.22;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*0.0014);
        ctx.strokeStyle=`rgba(255,255,255,${ca})`; ctx.lineWidth=1.2*S; ctx.setLineDash([7,5]);
        ctx.beginPath(); ctx.moveTo(-W,0); ctx.lineTo(W,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-H); ctx.lineTo(0,H); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        // Marcas de mira en los extremos
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
          ctx.strokeStyle=`rgba(0,245,255,${ca*1.5})`; ctx.lineWidth=1.5*S;
          ctx.beginPath(); ctx.moveTo(cx+dx*88*S,cy+dy*88*S); ctx.lineTo(cx+dx*96*S,cy+dy*96*S); ctx.stroke();
        });
      }

      // Dardo — con estela de gradiente
      const dartP=Math.min(Math.max((p-0.36)/0.42,0),1);
      if(dartP>0){
        const ep=1-Math.pow(1-dartP,3);
        const dartY=cy-168*S+168*S*ep;
        // Estela
        if(ep<0.97){
          const tl=58*S*(1-ep);
          const trailGrad=ctx.createLinearGradient(cx,dartY-tl,cx,dartY);
          trailGrad.addColorStop(0,'rgba(0,245,255,0)');
          trailGrad.addColorStop(1,`rgba(0,245,255,${dartP*0.35})`);
          ctx.fillStyle=trailGrad; ctx.fillRect(cx-2.5*S,dartY-tl,5*S,tl);
        }
        // Cuerpo del dardo
        ctx.save(); ctx.translate(cx,dartY);
        ctx.fillStyle=accent;
        ctx.beginPath(); ctx.moveTo(0,-24*S); ctx.lineTo(9*S,13*S); ctx.lineTo(-9*S,13*S); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(0,245,255,0.5)'; ctx.lineWidth=1*S; ctx.stroke();
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.moveTo(0,-30*S); ctx.lineTo(5*S,-20*S); ctx.lineTo(-5*S,-20*S); ctx.closePath(); ctx.fill();
        // Aletas
        ctx.fillStyle=accent+'88';
        ctx.beginPath(); ctx.moveTo(-9*S,13*S); ctx.lineTo(-18*S,22*S); ctx.lineTo(-9*S,5*S); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9*S,13*S); ctx.lineTo(18*S,22*S); ctx.lineTo(9*S,5*S); ctx.closePath(); ctx.fill();
        ctx.restore();
        if(dartP>0.92&&!impacted){
          impacted=true;
          const n=slow?8:14;
          for(let i=0;i<n;i++){const a=Math.PI*2/n*i+(Math.random()-0.5)*0.4,spd=(1.5+Math.random()*6)*S;sparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1.2*S,alpha:1,color:i%3===0?'#FFD700':i%3===1?accent:'#FF3344',size:(2+Math.random()*3)*S});}
        }
      }

      // Flash de impacto
      if(p>0.77&&p<0.88){const fp=(p-0.77)/0.11,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(cx,cy,46*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${fb*0.52})`;ctx.fill();}

      // Chispas físicas
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.11*S;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      // Punto pulsante en el centro tras el impacto
      if(impacted){const gp=Math.min((p-0.79)/0.21,1)*0.92,pp=0.65+0.35*Math.sin(t*0.026);ctx.beginPath();ctx.arc(cx,cy,14*S*pp,0,Math.PI*2);ctx.fillStyle=accent;ctx.globalAlpha=gp*pp;ctx.fill();ctx.globalAlpha=1;}

      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ELIMINACIÓN — Bombillas con cables realistas + explosión */
function introElimination(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1700; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const cy_b=H*0.42;
    const bulbs=[W*0.25,W*0.5,W*0.75].map((x,i)=>({x,y:cy_b,offAt:420+i*360,sparked:false}));
    const sparks=[]; let t=0;

    function drawBulb(b,lit,flicker){
      const alpha=flicker?(Math.sin(t*0.32)>0?0.08:1):1;
      ctx.save(); ctx.globalAlpha=alpha;
      const swing=lit?Math.sin(t*0.009+b.x)*2.5:0;

      // Cable con gradiente
      const cableGrad=ctx.createLinearGradient(b.x,0,b.x+swing,b.y-32*S);
      cableGrad.addColorStop(0,'#333'); cableGrad.addColorStop(1,'#555');
      ctx.strokeStyle=cableGrad; ctx.lineWidth=3*S; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(b.x,0); ctx.lineTo(b.x+swing,b.y-32*S); ctx.stroke();

      // Base cerámica
      ctx.fillStyle='#8a8a8a';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(b.x+swing-9*S,b.y+24*S,18*S,10*S,2*S);ctx.fill();}
      else ctx.fillRect(b.x+swing-9*S,b.y+24*S,18*S,10*S);
      ctx.fillStyle='#666';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(b.x+swing-11*S,b.y+34*S,22*S,5*S,1*S);ctx.fill();}
      else ctx.fillRect(b.x+swing-11*S,b.y+34*S,22*S,5*S);

      // Vidrio de la bombilla (forma pera)
      ctx.beginPath(); ctx.arc(b.x+swing,b.y,26*S,0,Math.PI*2);
      if(lit){
        // Gradiente de calor cuando encendida
        const bulbGrad=ctx.createRadialGradient(b.x+swing-6*S,b.y-8*S,2*S,b.x+swing,b.y,26*S);
        bulbGrad.addColorStop(0,'rgba(255,255,200,0.98)');
        bulbGrad.addColorStop(0.4,'rgba(255,210,60,0.95)');
        bulbGrad.addColorStop(1,'rgba(255,150,20,0.85)');
        ctx.fillStyle=bulbGrad;
      } else {
        ctx.fillStyle='rgba(15,15,25,0.95)';
      }
      ctx.fill();
      ctx.strokeStyle=lit?'rgba(255,200,80,0.4)':'rgba(40,40,60,0.4)'; ctx.lineWidth=2*S; ctx.stroke();

      // Filamento interior
      if(lit){
        ctx.strokeStyle='rgba(255,255,150,0.7)'; ctx.lineWidth=1.5*S;
        ctx.beginPath();
        ctx.moveTo(b.x+swing-6*S,b.y+6*S);
        for(let i=0;i<6;i++){ctx.lineTo(b.x+swing-6*S+i*2*S,b.y+(i%2===0?6:0)*S);}
        ctx.stroke();
        // Halos de luz
        [55,43,34].forEach((gr,gi)=>{
          ctx.beginPath(); ctx.arc(b.x+swing,b.y,gr*S,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,200,50,${0.1-gi*0.028})`; ctx.fill();
        });
      } else if(!flicker){
        // X roja pulsante
        const xp=0.65+0.35*Math.sin(t*0.022);
        ctx.strokeStyle=`rgba(255,0,80,${xp})`; ctx.lineWidth=4*S; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(b.x-13*S,b.y-13*S); ctx.lineTo(b.x+13*S,b.y+13*S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x+13*S,b.y-13*S); ctx.lineTo(b.x-13*S,b.y+13*S); ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x,b.y,30*S*xp,0,Math.PI*2);
        ctx.strokeStyle=`rgba(255,0,80,${0.2*xp})`; ctx.lineWidth=2*S; ctx.stroke();
      }
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      // Fondo con gradiente cálido/frío según bombillas restantes
      const lit=bulbs.filter(b=>t<b.offAt).length;
      const warmth=lit/3;
      const bg=ctx.createRadialGradient(W/2,cy_b,20*S,W/2,cy_b,W*0.8);
      bg.addColorStop(0,`rgba(${Math.round(50*warmth)},${Math.round(20*warmth)},0,0.3)`);
      bg.addColorStop(1,'rgba(0,0,0,0.5)');
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      bulbs.forEach(b=>{
        const isLit=t<b.offAt, flicker=!isLit&&t<b.offAt+200;
        if(!isLit&&!b.sparked&&t>b.offAt+70){
          b.sparked=true;
          const n=slow?6:9;
          for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;sparks.push({x:b.x,y:b.y,vx:Math.cos(a)*(1.2+Math.random()*4.5)*S,vy:Math.sin(a)*(1.2+Math.random()*4.5)*S-0.9*S,alpha:1,color:i%3===0?'#FFD700':i%3===1?'#FFA500':'#fff'});}
        }
        drawBulb(b,isLit,flicker);
      });
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,2.5*S*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** EQUIPO — Campo de fuerza que separa partículas en A y B */
function introTeam(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1500; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const primary=getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()||'#7B2FBE';
    const N=slow?6:8;
    const pts=Array.from({length:N},(_,i)=>({a:Math.PI*2/N*i,r:40*S+Math.random()*10*S,spd:0.05+Math.random()*0.025,team:i<N/2?0:1,size:(5+Math.random()*3)*S}));
    const bSparks=[]; let blasted=false, t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      const cx=W/2,cy=H*0.42;
      const sep=Math.min(Math.max((p-0.22)/0.48,0),1);
      const eSep=1-Math.pow(1-sep,3);
      const offset=eSep*90*S;

      // Campo energético simple (sin gradiente por frame)
      if(sep>0.1){
        const ep=(sep-0.1)/0.9;
        ctx.beginPath(); ctx.arc(cx-offset,cy,55*S,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,245,255,${ep*0.08})`; ctx.fill();
        ctx.beginPath(); ctx.arc(cx+offset,cy,55*S,0,Math.PI*2);
        ctx.fillStyle=`rgba(123,47,190,${ep*0.08})`; ctx.fill();
      }

      if(sep>=1&&!blasted){blasted=true;const n=slow?6:12;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*5)*S;bSparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?accent:primary});}}

      pts.forEach(pt=>{
        pt.a+=pt.spd*(0.28+0.72*(1-eSep));
        const teamX=cx+(pt.team===0?-offset:offset);
        const x=teamX+Math.cos(pt.a)*pt.r, y=cy+Math.sin(pt.a)*pt.r*0.62;
        const col=pt.team===0?accent:primary;
        // Halo exterior
        ctx.beginPath(); ctx.arc(x,y,pt.size*2.8,0,Math.PI*2);
        const hGrad=ctx.createRadialGradient(x,y,0,x,y,pt.size*2.8);
        hGrad.addColorStop(0,col+'40'); hGrad.addColorStop(1,'transparent');
        ctx.fillStyle=hGrad; ctx.fill();
        // Punto con highlight
        const pGrad=ctx.createRadialGradient(x-pt.size*0.3,y-pt.size*0.3,0,x,y,pt.size);
        pGrad.addColorStop(0,'#fff'); pGrad.addColorStop(0.3,col); pGrad.addColorStop(1,col+'aa');
        ctx.beginPath(); ctx.arc(x,y,pt.size,0,Math.PI*2);
        ctx.fillStyle=pGrad; ctx.fill();
      });

      // Línea divisoria con gradiente
      if(sep>0.28){
        const lp=Math.min((sep-0.28)/0.32,1);
        const lineGrad=ctx.createLinearGradient(cx,cy-85*S,cx,cy+85*S);
        lineGrad.addColorStop(0,'transparent'); lineGrad.addColorStop(0.3,`rgba(255,255,255,${lp*0.3})`);
        lineGrad.addColorStop(0.7,`rgba(255,255,255,${lp*0.3})`); lineGrad.addColorStop(1,'transparent');
        ctx.strokeStyle=lineGrad; ctx.lineWidth=1.5*S; ctx.setLineDash([8,5]);
        ctx.beginPath(); ctx.moveTo(cx,cy-85*S*lp); ctx.lineTo(cx,cy+85*S*lp); ctx.stroke(); ctx.setLineDash([]);
      }

      // Labels con glow
      if(sep>0.58){
        const lp=Math.min((sep-0.58)/0.32,1), pulse=0.85+0.15*Math.sin(t*0.02);
        ['A','B'].forEach((lbl,i)=>{
          const col=i===0?accent:primary, lx=cx+(i===0?-offset-22*S:offset+22*S);
          ctx.save();
          ctx.font=`bold ${Math.round(34*S*lp*pulse)}px sans-serif`; ctx.textAlign='center';
          ctx.fillStyle=col+'44'; ctx.globalAlpha=lp;
          ctx.fillText(lbl,lx,cy+94*S+2); // sombra
          ctx.fillStyle=col; ctx.fillText(lbl,lx,cy+92*S);
          ctx.restore();
        });
      }

      bSparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.06*S;s.alpha-=0.038;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,3.5*S*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ORDEN — Podio 3D con countdown + confeti */
function introOrder(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const n=slow?14:26;
    const confetti=Array.from({length:n},()=>({x:Math.random()*W,y:-15-Math.random()*80,vx:(Math.random()-0.5)*2.5*S,vy:(0.8+Math.random()*2)*S,rot:Math.random()*Math.PI*2,rotV:(Math.random()-0.5)*0.18,w:(4+Math.random()*7)*S,h:(3+Math.random()*5)*S,color:['#FFD700','#00F5FF','#FF006E','#A855F7','#39FF14','#FF6B00'][Math.floor(Math.random()*6)],delay:Math.random()*0.22}));
    const podium=[
      {label:'2',color:'#C0C0C0',sideColor:'#888',targetH:80*S,x:W/2-62*S,delay:0.33},
      {label:'1',color:'#FFD700',sideColor:'#B8860B',targetH:116*S,x:W/2,delay:0.26},
      {label:'3',color:'#CD7F32',sideColor:'#8B4513',targetH:58*S,x:W/2+62*S,delay:0.40},
    ];
    const baseY=H*0.72, barW=46*S; let t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);

      // Fondo con spotlight desde arriba
      const spot=ctx.createRadialGradient(W/2,0,0,W/2,H*0.5,W*0.6);
      spot.addColorStop(0,'rgba(255,215,0,0.06)'); spot.addColorStop(1,'rgba(0,0,0,0.5)');
      ctx.fillStyle=spot; ctx.fillRect(0,0,W,H);

      // Countdown 3→2→1
      if(p<0.26){
        const cp=p/0.26, digit=cp<0.33?'3':cp<0.66?'2':'1';
        const dp=(cp%0.333)/0.333;
        const sc=dp<0.2?dp*5:dp>0.82?(1-(dp-0.82)*5.5):1;
        const bounce=1+0.18*Math.sin(dp*Math.PI);
        ctx.font=`bold ${Math.round(76*S*sc*bounce)}px sans-serif`; ctx.textAlign='center';
        // Sombra
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.globalAlpha=Math.min(sc*3,1);
        ctx.fillText(digit,W/2+3,H*0.46+3+8*S);
        ctx.fillStyle='#FFD700';
        ctx.fillText(digit,W/2,H*0.46+8*S); ctx.globalAlpha=1;
      }

      // Podio 3D
      podium.forEach(pod=>{
        const bp=Math.max(0,Math.min((p-pod.delay)/0.40,1));
        const ep=1-Math.pow(1-bp,4);
        const h=pod.targetH*ep; if(h<1) return;

        // Cara frontal con gradiente
        const faceGrad=ctx.createLinearGradient(pod.x-barW/2,0,pod.x+barW/2,0);
        faceGrad.addColorStop(0,pod.color+'66'); faceGrad.addColorStop(0.5,pod.color+'99'); faceGrad.addColorStop(1,pod.color+'44');
        ctx.fillStyle=faceGrad; ctx.strokeStyle=pod.color; ctx.lineWidth=2;
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(pod.x-barW/2,baseY-h,barW,h,4); else ctx.rect(pod.x-barW/2,baseY-h,barW,h);
        ctx.fill(); ctx.stroke();

        // Cara lateral derecha (3D)
        ctx.fillStyle=pod.sideColor+'44';
        ctx.beginPath();
        ctx.moveTo(pod.x+barW/2,baseY-h); ctx.lineTo(pod.x+barW/2+10*S,baseY-h-6*S);
        ctx.lineTo(pod.x+barW/2+10*S,baseY-6*S); ctx.lineTo(pod.x+barW/2,baseY);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle=pod.sideColor; ctx.lineWidth=1; ctx.stroke();

        // Techo del podio
        ctx.fillStyle=pod.color+'cc';
        ctx.beginPath();
        ctx.moveTo(pod.x-barW/2,baseY-h); ctx.lineTo(pod.x+barW/2,baseY-h);
        ctx.lineTo(pod.x+barW/2+10*S,baseY-h-6*S); ctx.lineTo(pod.x-barW/2+10*S,baseY-h-6*S);
        ctx.closePath(); ctx.fill(); ctx.strokeStyle=pod.color; ctx.stroke();

        // Número con spring y glow
        if(bp>0.5){
          const np=Math.min((bp-0.5)/0.4,1), spring=1+Math.sin(np*Math.PI)*0.22;
          ctx.font=`bold ${Math.round(32*S*np*spring)}px sans-serif`; ctx.textAlign='center';
          ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.globalAlpha=np;
          ctx.fillText(pod.label,pod.x+1,baseY-h-11*S+1);
          ctx.fillStyle=pod.color; ctx.fillText(pod.label,pod.x,baseY-h-12*S);
          ctx.globalAlpha=1;
        }
      });

      // Línea de base
      ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(W*0.06,baseY); ctx.lineTo(W*0.94,baseY); ctx.stroke();

      // Confeti reciclado
      confetti.forEach(c=>{
        if(p<c.delay+0.40) return;
        c.x+=c.vx; c.y+=c.vy; c.rot+=c.rotV;
        if(c.y>H+12){c.y=-12;c.x=Math.random()*W;}
        ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.rot);
        ctx.fillStyle=c.color; ctx.globalAlpha=0.9;
        ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h); ctx.restore();
      });

      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** DUELO — Dos avatares con energía que chocan */
function introDuel(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1500; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const r=30*S, cy=H*0.44; const sparks=[]; let clashed=false, t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      const approach=Math.min(Math.max((p-0.14)/0.5,0),1);
      const ea=1-Math.pow(1-approach,3);
      const maxDist=W*0.37-r;
      const cx1=W/2-maxDist*(1-ea)-r, cx2=W/2+maxDist*(1-ea)+r;

      // Campo energético de fondo
      if(approach>0.3){
        const ep=(approach-0.3)/0.7;
        [cx1,cx2].forEach((x,i)=>{
          const col=i===0?accent:impact;
          const g=ctx.createRadialGradient(x,cy,0,x,cy,r*3);
          g.addColorStop(0,col+'22'); g.addColorStop(1,'transparent');
          ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
        });
      }

      // VS pulsante
      if(p<0.2){
        const vp=p/0.2, pulse=0.88+0.12*Math.sin(t*0.04);
        ctx.font=`bold ${Math.round(52*S*vp*pulse)}px sans-serif`; ctx.textAlign='center';
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.globalAlpha=vp; ctx.fillText('VS',W/2+2,cy+12*S);
        ctx.fillStyle='#fff'; ctx.fillText('VS',W/2,cy+10*S); ctx.globalAlpha=1;
      }

      // Trails de movimiento
      if(approach>0&&approach<1){[0.12,0.07,0.03].forEach((oa,i)=>{const trx=W/2-maxDist*(1-Math.max(ea-oa,0))-r;ctx.beginPath();ctx.arc(trx,cy,r,0,Math.PI*2);ctx.fillStyle=accent;ctx.globalAlpha=0.04+i*0.025;ctx.fill();ctx.beginPath();ctx.arc(W/2+maxDist*(1-Math.max(ea-oa,0))+r,cy,r,0,Math.PI*2);ctx.fillStyle=impact;ctx.globalAlpha=0.04+i*0.025;ctx.fill();ctx.globalAlpha=1;});}

      // Avatares con gradiente
      [cx1,cx2].forEach((x,i)=>{
        const col=i===0?accent:impact;
        const ag=ctx.createRadialGradient(x-r*0.3,cy-r*0.3,0,x,cy,r);
        ag.addColorStop(0,'#fff'); ag.addColorStop(0.25,col); ag.addColorStop(1,col+'88');
        ctx.beginPath(); ctx.arc(x,cy,r,0,Math.PI*2);
        ctx.fillStyle=ag; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1.5*S; ctx.stroke();
      });

      // Campo de energía al acercarse
      if(approach>0.5){const ep=(approach-0.5)/0.5,mid=(cx1+cx2)/2,dist=(cx2-cx1)/2;if(dist>0){ctx.beginPath();ctx.arc(mid,cy,dist,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${ep*0.07})`;ctx.fill();}}

      // Choque
      if(approach>=1&&!clashed){clashed=true;const n=slow?8:16;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*7)*S;sparks.push({x:W/2,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?accent:impact,size:(2+Math.random()*3)*S});}}
      const clashT=DUR*0.64;
      if(t>clashT&&t<clashT+260){const fp=(t-clashT)/260,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(W/2,cy,72*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${fb*0.65})`;ctx.fill();}

      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.vx*=0.97;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;

      // Rebote post-choque
      if(clashed){const rb=Math.min((t-DUR*0.64)/(DUR*0.36),1),eRb=1-Math.pow(1-rb,2);ctx.globalAlpha=(1-rb)*0.55;ctx.beginPath();ctx.arc(W/2-r-eRb*maxDist*0.75,cy,r*(1-rb*0.45),0,Math.PI*2);ctx.fillStyle=accent;ctx.fill();ctx.beginPath();ctx.arc(W/2+r+eRb*maxDist*0.75,cy,r*(1-rb*0.45),0,Math.PI*2);ctx.fillStyle=impact;ctx.fill();ctx.globalAlpha=1;}

      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** VENGANZA — Llamas orbitando + rayo + explosión */
function introRevenge(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1500; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const orange='#FF6B00';
    const maxFlames=slow?11:20;
    const flames=Array.from({length:maxFlames},()=>({a:Math.random()*Math.PI*2,fr:(6+Math.random()*20)*S,life:Math.random(),spawnAt:Math.random()*0.18,size:(4+Math.random()*7)*S}));
    const bSparks=[]; let struck=false, t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      const cx=W/2, cy=H*0.44, r=38*S;

      // Calor de fondo (sin gradiente por frame)
      ctx.fillStyle=`rgba(60,5,0,${p*0.12})`; ctx.fillRect(0,0,W,H);

      // Avatar con gradiente de calor
      const ap=Math.min(p/0.26,1), aEase=1-Math.pow(1-ap,3);
      const avGrad=ctx.createRadialGradient(cx-r*0.25,cy-r*0.25,0,cx,cy,r*aEase);
      avGrad.addColorStop(0,'#ff6688'); avGrad.addColorStop(0.5,'#cc2244'); avGrad.addColorStop(1,'#880022');
      ctx.beginPath(); ctx.arc(cx,cy,r*aEase,0,Math.PI*2);
      ctx.fillStyle=avGrad; ctx.fill();
      ctx.strokeStyle='rgba(255,50,80,0.4)'; ctx.lineWidth=2*S; ctx.stroke();

      // Llamas con gradiente por vida
      if(p>0.08) flames.forEach(f=>{
        if(p<f.spawnAt) return;
        f.life=(f.life+0.042)%1;
        const lp=f.life<0.5?f.life*2:2-f.life*2;
        const wobble=Math.sin(t*0.02+f.a)*3*S;
        const fx=cx+Math.cos(f.a)*(r+f.fr*lp+8*S)+wobble;
        const fy=cy+Math.sin(f.a)*(r+f.fr*lp+8*S)*0.78;
        const fGrad=ctx.createRadialGradient(fx,fy,0,fx,fy,f.size*lp);
        fGrad.addColorStop(0,'rgba(255,230,100,0.9)');
        fGrad.addColorStop(0.5,lp>0.5?'rgba(255,140,0,0.7)':'rgba(255,60,0,0.6)');
        fGrad.addColorStop(1,'transparent');
        ctx.beginPath(); ctx.arc(fx,fy,f.size*lp,0,Math.PI*2);
        ctx.fillStyle=fGrad; ctx.fill();
      });

      // Anillos pulsantes con grosor variable
      if(p>0.05){
        const rp=Math.min(p*4,1);
        for(let ring=1;ring<=3;ring++){
          const pulse=0.82+0.18*Math.sin(t*0.02+ring*1.1);
          const rr=(r+ring*24*S)*rp*pulse;
          ctx.beginPath(); ctx.arc(cx,cy,rr,0,Math.PI*2);
          ctx.strokeStyle=ring===1?impact:orange;
          ctx.lineWidth=(5-ring*0.8)*S;
          ctx.globalAlpha=(1/ring)*rp*0.72; ctx.stroke(); ctx.globalAlpha=1;
          // Halo del anillo
          if(ring===1){ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.strokeStyle=impact;ctx.lineWidth=(8)*S;ctx.globalAlpha=0.08*rp;ctx.stroke();ctx.globalAlpha=1;}
        }
      }

      // Rayo con zigzag y glow
      if(p>0.34){
        const lp=Math.min((p-0.34)/0.38,1), el=1-Math.pow(1-lp,3);
        const boltY=cy-148*S+108*S*el;
        // Glow del rayo
        ctx.save(); ctx.translate(cx,boltY); ctx.globalAlpha=lp*0.4;
        ctx.fillStyle='rgba(255,220,50,0.5)';
        ctx.beginPath(); ctx.moveTo(12*S,-24*S); ctx.lineTo(-8*S,8*S); ctx.lineTo(6*S,8*S);
        ctx.lineTo(-12*S,32*S); ctx.lineTo(8*S,4*S); ctx.lineTo(-4*S,4*S);
        ctx.closePath(); ctx.fill(); ctx.restore();
        // Rayo principal
        ctx.save(); ctx.translate(cx,boltY); ctx.globalAlpha=lp;
        ctx.fillStyle='#FFD700';
        ctx.beginPath(); ctx.moveTo(10*S,-22*S); ctx.lineTo(-6*S,6*S); ctx.lineTo(4*S,6*S);
        ctx.lineTo(-10*S,28*S); ctx.lineTo(6*S,2*S); ctx.lineTo(-4*S,2*S);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }

      // Golpe + chispas + flash
      if(p>0.72&&!struck){struck=true;const n=slow?7:13;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*6)*S;bSparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2*S,alpha:1,color:i%2===0?'#FFD700':orange});}}
      if(p>0.72&&p<0.85){const fp=(p-0.72)/0.13,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(cx,cy,54*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,220,50,${fb*0.55})`;ctx.fill();}

      bSparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.030;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,3*S*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;

      // Pulso expansivo con gradiente
      if(p>0.78){const pp=(p-0.78)/0.22,pulse2=0.62+0.38*Math.sin(t*0.026);ctx.beginPath();ctx.arc(cx,cy,r*(1+pp*1.6),0,Math.PI*2);ctx.strokeStyle=impact;ctx.lineWidth=4*S*(1-pp)*pulse2;ctx.globalAlpha=(1-pp)*pulse2*0.75;ctx.stroke();ctx.globalAlpha=1;}

      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/* ═══════════════════════════════════════════════════════════
   ANIMACIONES PRO — implementadas
   ═══════════════════════════════════════════════════════════ */

/** NORMAL PRO A — Misil: lanzamiento con trail → impacto sobre el elegido */
function introNormalMissile(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const cx=W/2, cy=H*0.44;
    const c=winnerColors||{color:accent,gradient:accent};
    const sparks=[]; let impacted=false, t=0;
    const targetX=cx, targetY=cy;
    const trailPts=[];

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);

      // Fondo con radar grid
      ctx.strokeStyle='rgba(0,245,255,0.04)'; ctx.lineWidth=1;
      for(let i=0;i<8;i++){
        ctx.beginPath(); ctx.arc(cx,cy,(i+1)*48*S,0,Math.PI*2); ctx.stroke();
      }
      ctx.globalAlpha=0.06;
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*W,cy+Math.sin(a)*W); ctx.stroke();
      }
      ctx.globalAlpha=1;
      // Barrido de radar rotando
      const radarAngle=t*0.025;
      const radarGrad=ctx.createConicalGradient?null:null; // fallback
      ctx.save();
      ctx.translate(cx,cy); ctx.rotate(radarAngle);
      const sweep=ctx.createLinearGradient(0,0,W*0.5,0);
      sweep.addColorStop(0,'rgba(0,245,255,0.12)'); sweep.addColorStop(1,'rgba(0,245,255,0)');
      ctx.fillStyle=sweep; ctx.beginPath(); ctx.moveTo(0,0);
      ctx.arc(0,0,W*0.7,-Math.PI*0.1,0.1); ctx.closePath(); ctx.fill();
      ctx.restore();

      // FASE 1 (0→0.4): misil vuela desde esquina en arco
      const launch=Math.min(p/0.4,1), eLaunch=1-Math.pow(1-launch,3);
      const mX=W*0.1+(targetX-W*0.1)*eLaunch;
      const mY=H*0.05+(targetY-H*0.05)*eLaunch - Math.sin(launch*Math.PI)*H*0.18;
      const angle=Math.atan2((targetY-H*0.05+Math.cos(launch*Math.PI)*H*0.18*Math.PI/1), targetX-W*0.1);

      // Trail del misil con gradiente
      trailPts.push({x:mX,y:mY,a:launch});
      if(trailPts.length>14) trailPts.shift();
      trailPts.forEach((pt,i)=>{
        const ta=(i/trailPts.length);
        ctx.beginPath(); ctx.arc(pt.x,pt.y,5*S*ta,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,245,255,${ta*0.25})`; ctx.fill();
      });

      // Misil
      if(p<0.42){
        ctx.save(); ctx.translate(mX,mY); ctx.rotate(angle+Math.PI/2);
        // Cohete principal
        const mGrad=ctx.createLinearGradient(0,-24*S,0,16*S);
        mGrad.addColorStop(0,'#fff'); mGrad.addColorStop(0.3,accent); mGrad.addColorStop(1,accent+'88');
        ctx.fillStyle=mGrad;
        ctx.beginPath(); ctx.moveTo(0,-24*S); ctx.lineTo(9*S,10*S); ctx.lineTo(-9*S,10*S); ctx.closePath(); ctx.fill();
        // Aletas
        ctx.fillStyle=accent+'aa';
        ctx.beginPath(); ctx.moveTo(-9*S,10*S); ctx.lineTo(-18*S,18*S); ctx.lineTo(-9*S,0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9*S,10*S); ctx.lineTo(18*S,18*S); ctx.lineTo(9*S,0); ctx.closePath(); ctx.fill();
        // Llama de propulsión
        const flame=0.6+0.4*Math.sin(t*0.3);
        ctx.fillStyle=`rgba(255,180,0,${flame*0.9})`;
        ctx.beginPath(); ctx.moveTo(-5*S,12*S); ctx.lineTo(5*S,12*S); ctx.lineTo(0,(18+flame*10)*S); ctx.closePath(); ctx.fill();
        ctx.fillStyle=`rgba(255,255,100,${flame*0.7})`;
        ctx.beginPath(); ctx.moveTo(-3*S,12*S); ctx.lineTo(3*S,12*S); ctx.lineTo(0,(14+flame*6)*S); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // FASE 2 (0.38→0.75): impacto — anillos de diana
      if(p>0.38){
        const ip=Math.min((p-0.38)/0.37,1);
        if(ip<0.06&&!impacted){
          impacted=true;
          const n=slow?10:17;
          for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*8)*S;sparks.push({x:targetX,y:targetY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%3===0?'#FFD700':i%3===1?accent:'#FF3344',size:(2+Math.random()*3.5)*S});}
        }
        if(ip<0.3){const fb=(ip<0.15?ip/0.15:(0.3-ip)/0.15);ctx.beginPath();ctx.arc(targetX,targetY,65*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${fb*0.65})`;ctx.fill();}
        // Diana expandiéndose desde el impacto
        [70,52,36,22,10].forEach((r,i)=>{
          const show=Math.min(Math.max((ip-i*0.07)/0.3,0),1);
          const er=1-Math.pow(1-show,3); if(er<=0) return;
          const pulse=1+0.05*Math.sin(t*0.015+i*0.8);
          ctx.beginPath(); ctx.arc(targetX,targetY,r*S*er*pulse,0,Math.PI*2);
          ctx.fillStyle=i%2===0?`rgba(160,0,25,${0.22*er})`:`rgba(255,255,255,${0.06*er})`; ctx.fill();
          ctx.strokeStyle=i%2===0?`rgba(230,30,50,${er})`:`rgba(255,255,255,${er*0.3})`; ctx.lineWidth=2*S; ctx.stroke();
        });
      }

      // FASE 3 (0.72→1): ganador con glow
      if(p>0.72){
        const gp=Math.min((p-0.72)/0.28,1), pulse=0.8+0.2*Math.sin(t*0.025);
        ctx.beginPath(); ctx.arc(targetX,targetY,40*S*gp*pulse,0,Math.PI*2);
        const wGrad=ctx.createRadialGradient(targetX,targetY,0,targetX,targetY,40*S*gp);
        wGrad.addColorStop(0,c.color+'66'); wGrad.addColorStop(1,'transparent');
        ctx.fillStyle=wGrad; ctx.fill();
        ctx.beginPath(); ctx.arc(targetX,targetY,28*S*gp,0,Math.PI*2);
        ctx.fillStyle=c.gradient||c.color; ctx.globalAlpha=gp; ctx.fill(); ctx.globalAlpha=1;
      }

      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.025;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** NORMAL PRO B — Francotirador: mira con viñeta busca y hace lock */
function introNormalSniper(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=2000; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const c=winnerColors||{color:accent};
    const targetX=W/2, targetY=H*0.44;
    const sparks=[]; let locked=false, t=0;

    function drawScope(cx,cy,alpha,lockP){
      ctx.save(); ctx.globalAlpha=alpha;
      const R=58*S;
      // Lente exterior con borde metálico
      const lensGrad=ctx.createRadialGradient(cx,cy,R*0.7,cx,cy,R);
      lensGrad.addColorStop(0,'rgba(0,245,255,0.08)'); lensGrad.addColorStop(1,'rgba(0,245,255,0.3)');
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
      ctx.fillStyle='rgba(0,20,30,0.4)'; ctx.fill();
      ctx.strokeStyle=lensGrad; ctx.lineWidth=4*S; ctx.stroke();
      ctx.strokeStyle='rgba(0,245,255,0.6)'; ctx.lineWidth=2*S; ctx.stroke();

      // Crosshair con cuadrante
      const chCol=lockP>0.5?`rgba(255,50,50,${0.6+0.4*Math.sin(t*0.05)})`:`rgba(0,245,255,0.75)`;
      ctx.strokeStyle=chCol; ctx.lineWidth=1.2*S;
      ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx-R*0.25,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+R*0.25,cy); ctx.lineTo(cx+R,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-R); ctx.lineTo(cx,cy-R*0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy+R*0.25); ctx.lineTo(cx,cy+R); ctx.stroke();
      // Anillos internos
      [0.55,0.35,0.18].forEach((f,i)=>{
        ctx.beginPath(); ctx.arc(cx,cy,R*f,0,Math.PI*2);
        ctx.strokeStyle=`rgba(0,245,255,${0.25-i*0.07})`; ctx.lineWidth=1*S; ctx.stroke();
      });
      // Punto central
      ctx.beginPath(); ctx.arc(cx,cy,2.5*S,0,Math.PI*2);
      ctx.fillStyle=lockP>0.5?'#ff3333':accent; ctx.fill();

      // Marcas de ángulo
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6, mark=i%3===0?10*S:5*S;
        ctx.strokeStyle=`rgba(0,245,255,0.35)`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*(R-mark),cy+Math.sin(a)*(R-mark));
        ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R); ctx.stroke();
      }

      // Esquinas de LOCK
      if(lockP>0){
        const lp=lockP, cs=22*S, lr=R;
        ctx.strokeStyle=`rgba(255,50,50,${lp})`; ctx.lineWidth=3*S;
        [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>{
          ctx.beginPath();
          ctx.moveTo(cx+sx*(lr-cs),cy+sy*lr); ctx.lineTo(cx+sx*lr,cy+sy*lr);
          ctx.lineTo(cx+sx*lr,cy+sy*(lr-cs)); ctx.stroke();
        });
        // Texto HUD
        if(lp>0.5){
          ctx.font=`bold ${Math.round(9*S)}px monospace`; ctx.textAlign='center';
          ctx.fillStyle=`rgba(255,50,50,${lp})`; ctx.fillText('TARGET LOCKED',cx,cy+R+18*S);
          ctx.fillStyle=`rgba(0,245,255,${lp*0.6})`; ctx.fillText(`DST: ${Math.round(138-lp*38)}m`,cx-R*0.6,cy-R-8*S);
          ctx.fillText(`WND: ${Math.round(2.4-lp*2.1)}m/s`,cx+R*0.5,cy-R-8*S);
        }
      }
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);

      // Viñeta de francotirador (borde oscuro)
      const vig=ctx.createRadialGradient(W/2,H/2,W*0.22,W/2,H/2,W*0.75);
      vig.addColorStop(0,'transparent'); vig.addColorStop(1,'rgba(0,0,0,0.82)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

      // Posición de la mira
      const search=Math.min(p/0.6,1), lock=Math.min(Math.max((p-0.6)/0.4,0),1);
      const eSearch=1-Math.pow(1-search,2), eLock=1-Math.pow(1-lock,4);
      let scX,scY;
      if(p<0.6){
        scX=W*0.15+(W*0.55-W*0.15)*eSearch+Math.sin(t*0.014)*22*S*(1-eSearch);
        scY=H*0.25+(H*0.6-H*0.25)*eSearch+Math.cos(t*0.018)*14*S*(1-eSearch);
      } else {
        scX=W*0.7+(targetX-W*0.7)*eLock;
        scY=H*0.6+(targetY-H*0.6)*eLock;
      }

      // Traza de búsqueda
      if(p>0.08&&p<0.9){
        ctx.strokeStyle=`rgba(0,245,255,${0.12*(1-lock)})`; ctx.lineWidth=1*S; ctx.setLineDash([3,4]);
        ctx.beginPath(); ctx.moveTo(W*0.15,H*0.25); ctx.lineTo(scX,scY); ctx.stroke(); ctx.setLineDash([]);
      }

      drawScope(scX,scY,Math.min(p*5,1),lock);

      // Glow rojo en el objetivo cuando hace lock
      if(lock>0.7){
        const gp=(lock-0.7)/0.3, pulse=0.7+0.3*Math.sin(t*0.03);
        ctx.beginPath(); ctx.arc(targetX,targetY,44*S*gp*pulse,0,Math.PI*2);
        const rg=ctx.createRadialGradient(targetX,targetY,0,targetX,targetY,44*S);
        rg.addColorStop(0,'rgba(255,0,0,0.2)'); rg.addColorStop(1,'transparent');
        ctx.fillStyle=rg; ctx.fill();
        ctx.beginPath(); ctx.arc(targetX,targetY,9*S*gp,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,50,50,${gp*0.8})`; ctx.fill();
      }

      // Disparo final
      if(p>0.94&&!locked){
        locked=true;
        for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,spd=(1+Math.random()*5)*S;sparks.push({x:targetX,y:targetY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?accent:'#FF3344',size:(1.5+Math.random()*2.5)*S});}
      }
      if(p>0.94&&p<0.99){const fp=(p-0.94)/0.05,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(targetX,targetY,55*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${(1-fb)*0.7})`;ctx.fill();}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.09*S;s.alpha-=0.038;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ELIMINACIÓN PRO A — Sillas musicales con física */
function introElimChairs(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const gold='#FFD700';
    const sparks=[]; let t=0;
    const chairs=[
      {x:W*0.22,fallAt:320,color:accent,rot:0,rotDir:1,fallen:false,sparked:false},
      {x:W*0.5, fallAt:700,color:gold,   rot:0,rotDir:-1,fallen:false,sparked:false},
      {x:W*0.78,fallAt:1100,color:impact,rot:0,rotDir:1,fallen:false,sparked:false},
    ];
    const baseY=H*0.52;

    function drawChair(x,y,rot,col,fallen){
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
      const cGrad=ctx.createLinearGradient(-20*S,-30*S,20*S,30*S);
      cGrad.addColorStop(0,col+'ee'); cGrad.addColorStop(1,col+'88');
      ctx.strokeStyle=cGrad; ctx.lineWidth=5*S; ctx.lineCap='round'; ctx.lineJoin='round';
      // Asiento
      ctx.beginPath(); ctx.moveTo(-18*S,-2*S); ctx.lineTo(18*S,-2*S); ctx.stroke();
      // Patas
      ctx.beginPath(); ctx.moveTo(-14*S,-2*S); ctx.lineTo(-14*S,26*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14*S,-2*S); ctx.lineTo(14*S,26*S); ctx.stroke();
      // Travesaño
      ctx.lineWidth=3*S;
      ctx.beginPath(); ctx.moveTo(-14*S,14*S); ctx.lineTo(14*S,14*S); ctx.stroke();
      // Respaldo
      ctx.lineWidth=5*S;
      ctx.beginPath(); ctx.moveTo(-14*S,-2*S); ctx.lineTo(-14*S,-28*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14*S,-2*S); ctx.lineTo(14*S,-28*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14*S,-28*S); ctx.lineTo(14*S,-28*S); ctx.stroke();
      // Barras decorativas respaldo
      ctx.lineWidth=2*S; ctx.strokeStyle=col+'44';
      ctx.beginPath(); ctx.moveTo(-5*S,-28*S); ctx.lineTo(-5*S,-2*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5*S,-28*S); ctx.lineTo(5*S,-2*S); ctx.stroke();
      // X si caída
      if(fallen){
        ctx.strokeStyle=impact; ctx.lineWidth=3.5*S;
        ctx.beginPath(); ctx.moveTo(-14*S,-12*S); ctx.lineTo(14*S,12*S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14*S,-12*S); ctx.lineTo(-14*S,12*S); ctx.stroke();
      }
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);

      // Parquet del suelo
      ctx.fillStyle='rgba(80,50,20,0.15)';
      for(let i=0;i<6;i++){
        ctx.fillRect(W*i/6, baseY+22*S, W/6-1, 8*S);
      }
      ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,baseY+22*S); ctx.lineTo(W,baseY+22*S); ctx.stroke();

      // Nota musical animada
      if(p<0.85){
        const np=Math.abs(Math.sin(t*0.06))*0.6+0.2;
        // Nota musical dibujada sin emoji
        ctx.fillStyle=`rgba(255,215,0,${np})`;
        ctx.font=`bold ${Math.round(26*S)}px sans-serif`; ctx.textAlign='center';
        ctx.fillText('do', W/2, H*0.18);
        ctx.fillText('re', W/2-60*S, H*0.22);
        ctx.fillText('mi', W/2+55*S, H*0.2);
      }

      chairs.forEach(ch=>{
        if(!ch.fallen&&t>ch.fallAt){
          ch.fallen=true;
        }
        if(ch.fallen&&Math.abs(ch.rot)<Math.PI/2){
          ch.rot+=0.08*ch.rotDir*(1-Math.abs(ch.rot)/(Math.PI/2)*0.4);
        }
        if(ch.fallen&&!ch.sparked&&Math.abs(ch.rot)>Math.PI/3){
          ch.sparked=true;
          const n=slow?6:8;
          for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;sparks.push({x:ch.x,y:baseY,vx:Math.cos(a)*(1+Math.random()*3.5)*S,vy:Math.sin(a)*(1+Math.random()*3.5)*S-1*S,alpha:1,color:ch.color});}
        }
        // Sombra
        ctx.save(); ctx.globalAlpha=0.2;
        ctx.beginPath(); ctx.ellipse(ch.x,baseY+24*S,22*S*(1-Math.abs(ch.rot)/(Math.PI/2)*0.4),5*S,0,0,Math.PI*2);
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fill(); ctx.restore();

        drawChair(ch.x, baseY, ch.fallen?Math.min(ch.rot,Math.PI/2*ch.rotDir):0, ch.color, ch.fallen&&Math.abs(ch.rot)>Math.PI/2.2);
      });

      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.035;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,2.5*S*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

// ── PRO: Imán, Cartas, Carrera, Ruleta, Western, Boxeo, Diana, Tormenta ──

/** ELIMINACIÓN PRO B — Tragamonedas / Jackpot */
function introElimSlots(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=2400; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const gold='#FFD700', goldDim='#B8860B';
    const symbols=['7','$','BAR','*','7'], symColors=['#FF4444','#44FF88','#FFD700','#4488FF','#FF4444'];
    const mW=200*S, mH=260*S, mX=W/2-mW/2, mY=H/2-mH/2-10*S;
    const reelW=50*S, reelH=160*S, reelY=mY+58*S;
    const reels=[
      {x:mX+18*S+reelW/2,         stopAt:700,  done:false},
      {x:mX+18*S+reelW+6*S+reelW/2, stopAt:1200, done:false},
      {x:mX+18*S+2*(reelW+6*S)+reelW/2, stopAt:1700, done:false},
    ];
    const sparks=[]; let fired=false, t=0;

    function machine(){
      ctx.fillStyle='#140828';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(mX,mY,mW,mH,14*S);ctx.fill();}
      else ctx.fillRect(mX,mY,mW,mH);
      ctx.strokeStyle=gold; ctx.lineWidth=4*S;
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(mX,mY,mW,mH,14*S);ctx.stroke();}
      else ctx.strokeRect(mX,mY,mW,mH);
      // Cartel superior
      ctx.fillStyle='#200a40'; ctx.fillRect(mX+8*S,mY+8*S,mW-16*S,40*S);
      ctx.strokeStyle=goldDim; ctx.lineWidth=1.5*S; ctx.strokeRect(mX+8*S,mY+8*S,mW-16*S,40*S);
      const pulse=0.7+0.3*Math.sin(t*0.04);
      ctx.font=`bold ${Math.round(20*S)}px sans-serif`; ctx.textAlign='center';
      ctx.fillStyle=`rgba(255,215,0,${pulse})`; ctx.fillText('JACKPOT',W/2,mY+36*S);
      // Línea de pago
      ctx.strokeStyle=`rgba(255,215,0,0.65)`; ctx.lineWidth=2*S; ctx.setLineDash([5,4]);
      ctx.beginPath(); ctx.moveTo(mX+10*S,reelY+reelH/2); ctx.lineTo(mX+mW-10*S,reelY+reelH/2); ctx.stroke();
      ctx.setLineDash([]);
      // Palanca
      const lx=mX+mW+2*S, ly0=mY+mH*0.3, lyEnd=mY+mH*0.65;
      const lyKnob=ly0+(lyEnd-ly0)*Math.min(t/500,1);
      ctx.strokeStyle=gold; ctx.lineWidth=5*S; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(lx,ly0); ctx.lineTo(lx,lyKnob); ctx.stroke();
      ctx.beginPath(); ctx.arc(lx,lyKnob,8*S,0,Math.PI*2);
      ctx.fillStyle='#FF3333'; ctx.fill(); ctx.strokeStyle=goldDim; ctx.lineWidth=2*S; ctx.stroke();
      // Bandeja
      ctx.fillStyle='#0a0418'; ctx.fillRect(mX+mW*0.2,mY+mH-26*S,mW*0.6,18*S);
      ctx.strokeStyle=goldDim; ctx.lineWidth=1*S; ctx.strokeRect(mX+mW*0.2,mY+mH-26*S,mW*0.6,18*S);
    }

    function reel(r,idx){
      const stopped=t>r.stopAt, speed=stopped?0:Math.max(0,(r.stopAt-t)/r.stopAt);
      ctx.fillStyle='#080012'; ctx.fillRect(r.x-reelW/2,reelY,reelW,reelH);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x-reelW/2+2,reelY+2,reelW-4,reelH-4); ctx.clip();
      const symH=reelH/3, scroll=(t*speed*0.55)%symH;
      for(let i=-1;i<=3;i++){
        const si=stopped?(i===1?0:(i+symbols.length*5)%symbols.length):(Math.floor(t*speed*0.04+idx*3+i+50))%symbols.length;
        const sy=reelY+i*symH-scroll;
        const onLine=Math.abs(sy+symH/2-(reelY+reelH/2))<symH*0.55;
        ctx.font=`bold ${Math.round(onLine&&stopped?24*S:18*S)}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle=stopped&&onLine?symColors[si]:'rgba(255,255,255,0.5)';
        ctx.globalAlpha=stopped&&onLine?1:0.65;
        ctx.fillText(symbols[si],r.x,sy+symH/2);
        ctx.globalAlpha=1;
      }
      ctx.restore();
      ctx.strokeStyle=stopped?gold:'rgba(255,255,255,0.2)'; ctx.lineWidth=stopped?2.5*S:1.5*S;
      ctx.strokeRect(r.x-reelW/2,reelY,reelW,reelH);
      [1,2].forEach(f=>{ctx.strokeStyle='rgba(255,215,0,0.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(r.x-reelW/2,reelY+reelH*f/3);ctx.lineTo(r.x+reelW/2,reelY+reelH*f/3);ctx.stroke();});
      if(stopped){
        const gp=Math.min((t-r.stopAt)/280,1)*0.7, pp=0.5+0.5*Math.sin(t*0.03+idx);
        ctx.beginPath(); ctx.arc(r.x,reelY+reelH/2,reelW*0.52,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,215,0,${gp*0.22*pp})`; ctx.fill();
        if(!r.done) r.done=true;
      }
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      machine(); reels.forEach((r,i)=>reel(r,i));
      if(t>1700&&!fired){
        fired=true;
        for(let i=0;i<28;i++){const a=Math.random()*Math.PI*2,spd=(3+Math.random()*9)*S;sparks.push({x:W/2,y:mY+mH*0.5,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-5*S,alpha:1,size:(2+Math.random()*4)*S,color:i%3===0?gold:i%3===1?'#FF4444':'#44FF88'});}
      }
      if(t>1700){
        const fp=Math.min((t-1700)/350,1), pp=0.7+0.3*Math.sin(t*0.04);
        ctx.strokeStyle=`rgba(255,215,0,${fp*pp*0.9})`; ctx.lineWidth=7*S;
        if(ctx.roundRect){ctx.beginPath();ctx.roundRect(mX,mY,mW,mH,14*S);ctx.stroke();}
        else ctx.strokeRect(mX,mY,mW,mH);
        ctx.font=`bold ${Math.round(26*S*pp)}px sans-serif`; ctx.textAlign='center';
        ctx.fillStyle=gold; ctx.globalAlpha=fp; ctx.fillText('! 7  7  7 !',W/2,mY-18*S); ctx.globalAlpha=1;
      }
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.13*S;s.alpha-=0.022;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** EQUIPO PRO A — Imán: campo magnético atrae partículas */
function introTeamMagnet(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1600; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const primary=getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()||'#7B2FBE';
    const cx=W/2, cy=H*0.42;
    const N=slow?6:12;
    const pts=Array.from({length:N},(_,i)=>({x:Math.random()*W,y:Math.random()*H*0.8+H*0.05,team:i<N/2?0:1,size:(4+Math.random()*5)*S,trail:[]}));
    let t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      const pull=Math.min(Math.max((p-0.08)/0.72,0),1), ePull=1-Math.pow(1-pull,3);
      const pA={x:cx-76*S,y:cy}, pB={x:cx+76*S,y:cy};

      // Campo magnético — líneas de fuerza con gradiente
      if(pull>0.15){
        const fp=(pull-0.15)/0.85;
        for(let i=0;i<7;i++){
          const yOff=(i-3)*26*S;
          const fieldGrad=ctx.createLinearGradient(pA.x,0,pB.x,0);
          fieldGrad.addColorStop(0,`rgba(0,245,255,${fp*0.12})`);
          fieldGrad.addColorStop(0.5,`rgba(255,255,255,${fp*0.05})`);
          fieldGrad.addColorStop(1,`rgba(123,47,190,${fp*0.12})`);
          ctx.strokeStyle=fieldGrad; ctx.lineWidth=1.2*S;
          ctx.beginPath(); ctx.moveTo(pA.x,pA.y+yOff);
          ctx.bezierCurveTo(pA.x+50*S,pA.y+yOff,pB.x-50*S,pB.y+yOff,pB.x,pB.y+yOff);
          ctx.stroke();
        }
      }

      // Partículas con trail
      pts.forEach(pt=>{
        const pole=pt.team===0?pA:pB;
        const col=pt.team===0?accent:primary;
        pt.trail.push({x:pt.x,y:pt.y});
        if(pt.trail.length>8) pt.trail.shift();
        // Trail
        pt.trail.forEach((tp,ti)=>{
          const ta=(ti/pt.trail.length)*0.2*ePull;
          ctx.beginPath(); ctx.arc(tp.x,tp.y,pt.size*0.6,0,Math.PI*2);
          ctx.fillStyle=col; ctx.globalAlpha=ta; ctx.fill();
        });
        ctx.globalAlpha=1;
        pt.x+=(pole.x-pt.x)*ePull*0.07;
        pt.y+=(pole.y-pt.y)*ePull*0.07;
        // Halo
        const hGrad=ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,pt.size*2.5);
        hGrad.addColorStop(0,col+'50'); hGrad.addColorStop(1,'transparent');
        ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size*2.5,0,Math.PI*2);
        ctx.fillStyle=hGrad; ctx.fill();
        // Punto
        const pGrad=ctx.createRadialGradient(pt.x-pt.size*0.3,pt.y-pt.size*0.3,0,pt.x,pt.y,pt.size);
        pGrad.addColorStop(0,'#fff'); pGrad.addColorStop(0.4,col); pGrad.addColorStop(1,col+'88');
        ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size,0,Math.PI*2);
        ctx.fillStyle=pGrad; ctx.fill();
      });

      // Polos N/S con campo radiante
      if(pull>0.35){
        const lp=Math.min((pull-0.35)/0.3,1);
        [pA,pB].forEach((pole,i)=>{
          const col=i===0?accent:primary;
          const pulse=0.8+0.2*Math.sin(t*0.022+i*Math.PI);
          // Aura exterior
          const aura=ctx.createRadialGradient(pole.x,pole.y,0,pole.x,pole.y,36*S);
          aura.addColorStop(0,col+'44'); aura.addColorStop(1,'transparent');
          ctx.beginPath(); ctx.arc(pole.x,pole.y,36*S*pulse*lp,0,Math.PI*2);
          ctx.fillStyle=aura; ctx.fill();
          // Cuerpo
          const bg=ctx.createRadialGradient(pole.x-5*S,pole.y-5*S,0,pole.x,pole.y,20*S*lp);
          bg.addColorStop(0,'#fff'); bg.addColorStop(0.3,col); bg.addColorStop(1,col+'88');
          ctx.beginPath(); ctx.arc(pole.x,pole.y,20*S*lp,0,Math.PI*2);
          ctx.fillStyle=bg; ctx.fill();
          // Borde
          ctx.strokeStyle=col; ctx.lineWidth=2*S; ctx.stroke();
          // Label N/S
          ctx.font=`bold ${Math.round(15*S*lp)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillStyle='#fff'; ctx.globalAlpha=lp;
          ctx.fillText(i===0?'N':'S',pole.x,pole.y); ctx.textBaseline='alphabetic'; ctx.globalAlpha=1;
        });
      }
      // Labels A/B
      if(pull>0.7){
        const lp=Math.min((pull-0.7)/0.3,1), pulse=0.85+0.15*Math.sin(t*0.02);
        [accent,primary].forEach((col,i)=>{
          const lx=i===0?pA.x:pB.x;
          ctx.font=`bold ${Math.round(32*S*lp*pulse)}px sans-serif`; ctx.textAlign='center';
          ctx.fillStyle=col+'44'; ctx.globalAlpha=lp; ctx.fillText(i===0?'A':'B',lx,cy+58*S+2);
          ctx.fillStyle=col; ctx.fillText(i===0?'A':'B',lx,cy+56*S); ctx.globalAlpha=1;
        });
      }
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** EQUIPO PRO B — Cartas: baraja con física real */
function introTeamCards(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1700; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const primary=getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()||'#7B2FBE';
    const cx=W/2, cy=H*0.44, cW=36*S, cH=50*S;
    const N=10;
    const cards=Array.from({length:N},(_,i)=>({team:i%2,launchAt:180+i*130,x:cx,y:cy,vx:0,vy:0,rot:0,rotV:0,landed:false,launched:false,targetX:i%2===0?cx-85*S-Math.floor(i/2)*5*S:cx+85*S+Math.floor(i/2)*5*S,targetY:cy+(Math.random()-0.5)*18*S,finalRot:(Math.random()-0.5)*0.4}));
    let t=0;

    function drawCard(x,y,rot,col,landed,i){
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
      // Sombra
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(-cW/2+3,cH/2-2,cW,4*S,2); else ctx.rect(-cW/2+3,cH/2-2,cW,4*S);
      ctx.fill();
      // Fondo
      const bg=ctx.createLinearGradient(-cW/2,-cH/2,cW/2,cH/2);
      bg.addColorStop(0,landed?col+'cc':'#1a1030');
      bg.addColorStop(1,landed?col+'88':'#0d0820');
      ctx.fillStyle=bg;
      ctx.strokeStyle=landed?col:'rgba(255,255,255,0.2)'; ctx.lineWidth=1.5*S;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(-cW/2,-cH/2,cW,cH,4*S); else ctx.rect(-cW/2,-cH/2,cW,cH);
      ctx.fill(); ctx.stroke();
      if(landed){
        // Palo de la carta
        const suits=['A','K','Q','J'];
        const suit=suits[i%4];
        ctx.fillStyle='#fff'; ctx.font=`bold ${Math.round(18*S)}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(suit,0,0);
        ctx.font=`bold ${Math.round(9*S)}px sans-serif`;
        ctx.fillText(suit,-cW/2+8*S,-cH/2+10*S);
      }
      // Highlight
      ctx.fillStyle='rgba(255,255,255,0.06)';
      ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(-cW/2,-cH/2,cW*0.5,cH*0.5,4*S); else ctx.rect(-cW/2,-cH/2,cW*0.5,cH*0.5);
      ctx.fill();
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      // Mazo central
      if(p<0.85){
        ctx.save(); ctx.globalAlpha=1-p*1.1;
        for(let i=3;i>=0;i--){
          ctx.fillStyle=i===0?'#2a1a4e':'#1a0e30';
          ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1.5*S;
          ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(cx-cW/2-i,cy-cH/2-i*2,cW,cH,4*S); else ctx.rect(cx-cW/2-i,cy-cH/2-i*2,cW,cH);
          ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
      cards.forEach((card,i)=>{
        if(t<card.launchAt) return;
        if(!card.launched){
          card.launched=true;
          const dir=card.team===0?-1:1;
          const angle=(Math.random()-0.5)*0.4;
          card.vx=dir*(3+Math.random()*3)*S*Math.cos(angle);
          card.vy=(-2.5-Math.random()*1.5)*S;
          card.rotV=dir*(0.06+Math.random()*0.12);
        }
        if(!card.landed){
          card.x+=card.vx; card.y+=card.vy; card.vy+=0.14*S; card.rot+=card.rotV; card.rotV*=0.96;
          if(card.y>=card.targetY&&Math.abs(card.x-card.targetX)<55*S){
            card.landed=true; card.x=card.targetX; card.y=card.targetY; card.rot=card.finalRot; card.vx=0; card.vy=0;
          }
        }
        drawCard(card.x,card.y,card.rot,card.team===0?accent:primary,card.landed,i);
      });
      // Labels
      if(p>0.55){
        const lp=Math.min((p-0.55)/0.3,1);
        ctx.font=`bold ${Math.round(28*S*lp)}px sans-serif`; ctx.textAlign='center';
        ctx.fillStyle=accent; ctx.globalAlpha=lp; ctx.fillText('A',cx-85*S,cy+52*S);
        ctx.fillStyle=primary; ctx.fillText('B',cx+85*S,cy+52*S); ctx.globalAlpha=1;
      }
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ORDEN PRO A — Carrera de caballos estilo retro */
function introOrderRace(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=2000; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const colors=['#FFD700','#C0C0C0','#CD7F32'];
    const labels=['1°','2°','3°'];
    const trackW=W*0.72, startX=W*0.13, endX=startX+trackW, cy=H*0.44;
    const speeds=[1.0, 0.7+Math.random()*0.18, 0.52+Math.random()*0.18];
    let t=0;

    function drawHorse(x,y,col,stride){
      ctx.save(); ctx.translate(x,y);
      // Cuerpo
      const bodyGrad=ctx.createLinearGradient(-16*S,-8*S,16*S,8*S);
      bodyGrad.addColorStop(0,col+'ee'); bodyGrad.addColorStop(1,col+'99');
      ctx.fillStyle=bodyGrad;
      ctx.beginPath(); ctx.ellipse(0,0,16*S,8*S,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=col; ctx.lineWidth=1*S; ctx.stroke();
      // Cabeza
      ctx.fillStyle=col;
      ctx.beginPath(); ctx.ellipse(18*S,-6*S,8*S,5*S,0.3,0,Math.PI*2); ctx.fill();
      // Crin
      ctx.fillStyle='rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.moveTo(10*S,-10*S); ctx.quadraticCurveTo(14*S,-16*S,20*S,-10*S); ctx.closePath(); ctx.fill();
      // Patas animadas
      const s=Math.sin(stride)*10*S;
      ctx.strokeStyle=col; ctx.lineWidth=3*S; ctx.lineCap='round';
      [[-8,-8,-12,8],[-2,-8,-6,8],[4,-8,8,8],[10,-8,14,8]].forEach(([x1,y1,x2,y2],li)=>{
        const phaseOff=(li%2===0?1:-1)*Math.PI/2;
        const leg=Math.sin(stride+phaseOff)*8*S;
        ctx.beginPath(); ctx.moveTo(x1*S,y1*S); ctx.lineTo(x2*S+leg,(y2+4)*S); ctx.stroke();
      });
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);

      // Pista de carreras
      const trackBg=ctx.createLinearGradient(0,cy-25*S,0,cy+25*S);
      trackBg.addColorStop(0,'rgba(40,80,20,0.15)'); trackBg.addColorStop(1,'rgba(20,50,10,0.3)');
      ctx.fillStyle=trackBg; ctx.fillRect(0,cy-25*S,W,50*S);
      // Líneas de carril
      colors.forEach((_,i)=>{
        const yc=cy+(i-1)*30*S;
        ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
        ctx.setLineDash([12,8]);
        ctx.beginPath(); ctx.moveTo(startX,yc+14*S); ctx.lineTo(endX,yc+14*S); ctx.stroke();
        ctx.setLineDash([]);
      });

      // Meta
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=2.5*S; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(endX,cy-55*S); ctx.lineTo(endX,cy+55*S); ctx.stroke();
      // Bandera a cuadros en la meta
      const sq=8*S;
      for(let r=0;r<4;r++) for(let c=0;c<2;c++){
        if((r+c)%2===0){ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fillRect(endX+c*sq,cy-52*S+r*sq,sq,sq);}
      }

      // Caballos
      colors.forEach((col,i)=>{
        const yPos=cy+(i-1)*30*S;
        const progress=Math.min(p*speeds[i],1);
        const ep=1-Math.pow(1-progress,3);
        const hx=startX+trackW*ep;
        const stride=t*0.02*(0.7+i*0.1);

        // Huella del camino
        if(ep>0.05){
          const pathGrad=ctx.createLinearGradient(startX,0,hx,0);
          pathGrad.addColorStop(0,'transparent'); pathGrad.addColorStop(1,col+'22');
          ctx.fillStyle=pathGrad; ctx.fillRect(startX,yPos-14*S,hx-startX,28*S);
        }

        // Número de carril
        ctx.font=`bold ${Math.round(13*S)}px sans-serif`; ctx.textAlign='right';
        ctx.fillStyle=col; ctx.fillText(labels[i],startX-8*S,yPos+5*S);

        drawHorse(hx,yPos,col,stride);

        // Glow al llegar
        if(progress>=1){
          const pulse=0.5+0.5*Math.sin(t*0.04+i);
          const glow=ctx.createRadialGradient(endX,yPos,0,endX,yPos,28*S);
          glow.addColorStop(0,col+'55'); glow.addColorStop(1,'transparent');
          ctx.fillStyle=glow; ctx.fillRect(endX-28*S,yPos-28*S,56*S,56*S);
        }
      });

      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ORDEN PRO B — Ruleta de posiciones con física de inercia */
function introOrderWheel(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=2000; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const gold='#FFD700', goldDim='#B8860B';
    const positions=['1°','2°','3°','4°','5°','1°','2°','3°'];
    const posColors=['#FFD700','#C0C0C0','#CD7F32','#888','#666','#FFD700','#C0C0C0','#CD7F32'];
    const N=positions.length, R=Math.min(W,H)*0.26, cx=W/2, cy=H*0.44;
    let t=0, totalAngle=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      // Velocidad angular con inercia — rápido → frena exponencialmente
      let vel;
      if(p<0.15)      vel=p/0.15*0.35;
      else if(p<0.68) vel=0.35;
      else            vel=0.35*Math.pow(1-(p-0.68)/0.32,2.5);
      totalAngle+=vel;

      const angle=-Math.PI/2+totalAngle, slice=Math.PI*2/N;

      // Aro exterior metálico
      ctx.beginPath(); ctx.arc(cx,cy,R+8*S,0,Math.PI*2);
      const rimGrad=ctx.createRadialGradient(cx-R*0.3,cy-R*0.3,R*0.1,cx,cy,R+8*S);
      rimGrad.addColorStop(0,'#888'); rimGrad.addColorStop(0.5,'#FFD700'); rimGrad.addColorStop(1,'#555');
      ctx.fillStyle=rimGrad; ctx.fill();

      // Sectores
      positions.forEach((pos,i)=>{
        const startA=angle+i*slice, endA=startA+slice;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,startA,endA); ctx.closePath();
        // Gradiente radial por sector
        const midA=startA+slice/2;
        const sg=ctx.createRadialGradient(cx,cy,R*0.2,cx+Math.cos(midA)*R*0.6,cy+Math.sin(midA)*R*0.6,R*0.5);
        sg.addColorStop(0,posColors[i]+'88'); sg.addColorStop(1,posColors[i]+'44');
        ctx.fillStyle=sg; ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1.5*S; ctx.stroke();
        // Texto del sector
        ctx.save(); ctx.translate(cx+Math.cos(midA)*R*0.65,cy+Math.sin(midA)*R*0.65);
        ctx.rotate(midA+Math.PI/2);
        ctx.font=`bold ${Math.round(15*S)}px sans-serif`; ctx.textAlign='center';
        ctx.fillStyle=posColors[i]; ctx.fillText(pos,0,0);
        ctx.restore();
      });

      // Aro interior dorado
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
      ctx.strokeStyle=gold; ctx.lineWidth=3*S; ctx.stroke();

      // Pines entre sectores
      positions.forEach((_,i)=>{
        const a=angle+i*slice;
        ctx.beginPath(); ctx.arc(cx+Math.cos(a)*R,cy+Math.sin(a)*R,4*S,0,Math.PI*2);
        ctx.fillStyle=gold; ctx.fill();
      });

      // Puntero triangular con glow
      const pColor=vel<0.05?'#ff3333':accent;
      ctx.save(); ctx.translate(cx,cy-R-12*S);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-11*S,-20*S); ctx.lineTo(11*S,-20*S); ctx.closePath();
      ctx.fillStyle=pColor; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.5*S; ctx.stroke();
      ctx.restore();

      // Centro con logo
      const cGrad=ctx.createRadialGradient(cx-4*S,cy-4*S,0,cx,cy,14*S);
      cGrad.addColorStop(0,'#888'); cGrad.addColorStop(1,'#333');
      ctx.beginPath(); ctx.arc(cx,cy,14*S,0,Math.PI*2);
      ctx.fillStyle=cGrad; ctx.fill();
      ctx.strokeStyle=gold; ctx.lineWidth=2.5*S; ctx.stroke();

      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** VENGANZA PRO A — Diana roja persigue al objetivo */
function introRevengeTarget(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1700; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const red='#FF1133';
    let dX=W*0.06, dY=H*0.12;
    const targetX=W/2, targetY=H*0.42;
    const sparks=[]; let fired=false, t=0;
    const trail=[];

    function drawTarget(x,y,scale,alpha,lockP){
      ctx.save(); ctx.globalAlpha=alpha;
      // Anillos con gradiente
      [70,52,36,22,9].forEach((r,i)=>{
        const pulse=scale*(1+0.05*Math.sin(t*0.016+i*0.8));
        const rr=r*S*pulse;
        const isRed=i%2===0;
        // Relleno
        ctx.beginPath(); ctx.arc(x,y,rr,0,Math.PI*2);
        ctx.fillStyle=isRed?`rgba(200,0,20,0.25)`:`rgba(255,255,255,0.06)`; ctx.fill();
        // Borde con glow
        ctx.strokeStyle=isRed?`rgba(255,20,50,${0.9-i*0.08})`:`rgba(255,255,255,0.25)`;
        ctx.lineWidth=2.5*S; ctx.stroke();
      });
      // Crosshair
      ctx.strokeStyle=`rgba(255,0,50,${0.6+0.4*Math.sin(t*0.03)})`; ctx.lineWidth=1.2*S;
      [[x-75*S*scale,y,x-10*S*scale,y],[x+10*S*scale,y,x+75*S*scale,y],
       [x,y-75*S*scale,x,y-10*S*scale],[x,y+10*S*scale,x,y+75*S*scale]].forEach(([x1,y1,x2,y2])=>{
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });
      // Esquinas de lock
      if(lockP>0){
        ctx.strokeStyle=`rgba(255,20,50,${lockP})`; ctx.lineWidth=3.5*S;
        const cs=24*S*scale, lr=72*S*scale;
        [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>{
          ctx.beginPath();
          ctx.moveTo(x+sx*(lr-cs),y+sy*lr); ctx.lineTo(x+sx*lr,y+sy*lr);
          ctx.lineTo(x+sx*lr,y+sy*(lr-cs)); ctx.stroke();
        });
      }
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);

      // Fondo de alerta roja al final
      if(p>0.6){
        const ap=(p-0.6)/0.4, pulse=Math.abs(Math.sin(t*0.025));
        ctx.fillStyle=`rgba(80,0,0,${ap*pulse*0.2})`; ctx.fillRect(0,0,W,H);
      }

      // Persecución con ease
      const pursuit=Math.min(p/0.68,1), ePursuit=1-Math.pow(1-pursuit,3);
      dX=W*0.06+(targetX-W*0.06)*ePursuit;
      dY=H*0.12+(targetY-H*0.12)*ePursuit;

      // Trail de la diana
      trail.push({x:dX,y:dY,p:ePursuit});
      if(trail.length>10) trail.shift();
      trail.forEach((pt,i)=>{
        const ta=(i/trail.length)*0.08*ePursuit;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,5*S,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,0,50,${ta})`; ctx.fill();
      });

      const scale=1.4-0.4*ePursuit;
      const lockP=Math.min(Math.max((ePursuit-0.82)/0.18,0),1);
      drawTarget(dX,dY,scale,Math.min(p*5,1),lockP);

      // Impacto final
      if(p>0.7&&!fired){fired=true;for(let i=0;i<20;i++){const a=Math.PI*2/20*i,spd=(2+Math.random()*6)*S;sparks.push({x:targetX,y:targetY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?red:impact,size:(2+Math.random()*3)*S});}}
      if(p>0.7&&p<0.84){const fp=(p-0.7)/0.14,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(targetX,targetY,60*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,0,50,${fb*0.55})`;ctx.fill();}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** VENGANZA PRO B — Tormenta eléctrica dramática */
function introRevengeStorm(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1700; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const cx=W/2, targetY=H*0.54;
    const bolts=Array.from({length:slow?6:8},(_,i)=>({
      x:cx+(Math.random()-0.5)*W*0.38, fireAt:350+i*160,
      fired:false, alpha:0,
      segs:Array.from({length:7},()=>({dx:(Math.random()-0.5)*22*S,dy:16*S+Math.random()*10*S}))
    }));
    const sparks=[]; let t=0;

    function drawCloud(x,y,w,h,alpha){
      ctx.save(); ctx.globalAlpha=alpha;
      const cg=ctx.createRadialGradient(x,y,0,x,y,w);
      cg.addColorStop(0,'rgba(30,30,50,0.9)'); cg.addColorStop(1,'rgba(10,10,25,0)');
      ctx.fillStyle=cg;
      // Forma de nube con múltiples círculos
      const bumps=[[0,0,w],[w*0.4,-h*0.3,w*0.7],[w*-0.35,-h*0.25,w*0.65],[w*0.2,-h*0.45,w*0.5],[w*-0.15,-h*0.5,w*0.4]];
      bumps.forEach(([bx,by,br])=>{ctx.beginPath();ctx.arc(x+bx,y+by,br,0,Math.PI*2);ctx.fill();});
      ctx.restore();
    }

    function drawBolt(bolt,alpha){
      if(alpha<=0) return;
      ctx.save();
      // Glow externo
      ctx.strokeStyle=`rgba(180,220,255,${alpha*0.2})`; ctx.lineWidth=12*S; ctx.lineCap='round';
      let bx=bolt.x, by=H*0.1;
      ctx.beginPath(); ctx.moveTo(bx,by);
      bolt.segs.forEach(seg=>{bx+=seg.dx;by+=seg.dy;ctx.lineTo(bx,by);});
      ctx.stroke();
      // Trazo principal
      ctx.strokeStyle=`rgba(180,230,255,${alpha*0.8})`; ctx.lineWidth=4*S;
      bx=bolt.x; by=H*0.1; ctx.beginPath(); ctx.moveTo(bx,by);
      bolt.segs.forEach(seg=>{bx+=seg.dx;by+=seg.dy;ctx.lineTo(bx,by);});
      ctx.stroke();
      // Core brillante
      ctx.strokeStyle=`rgba(255,255,255,${alpha})`; ctx.lineWidth=1.5*S;
      bx=bolt.x; by=H*0.1; ctx.beginPath(); ctx.moveTo(bx,by);
      bolt.segs.forEach(seg=>{bx+=seg.dx;by+=seg.dy;ctx.lineTo(bx,by);});
      ctx.stroke();
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);

      // Nubes volumétricas
      if(p>0.04){
        const cp=Math.min(p/0.35,1);
        [
          [cx-55*S,H*0.1,60*S,20*S],[cx+45*S,H*0.12,50*S,18*S],
          [cx-15*S,H*0.07,55*S,22*S],[cx+75*S,H*0.14,42*S,16*S],
          [cx-85*S,H*0.13,46*S,17*S]
        ].forEach(([x,y,w,h])=>drawCloud(x,y,w,h,cp*0.9));
      }

      // Zona de impacto pulsante
      if(p>0.28){
        const dp=Math.min((p-0.28)/0.4,1), pulse=0.55+0.45*Math.sin(t*0.025);
        const ig=ctx.createRadialGradient(cx,targetY,0,cx,targetY,55*S);
        ig.addColorStop(0,`rgba(150,0,255,${dp*0.25*pulse})`); ig.addColorStop(1,'transparent');
        ctx.fillStyle=ig; ctx.fillRect(0,0,W,H);
        ctx.beginPath(); ctx.arc(cx,targetY,42*S*dp*pulse,0,Math.PI*2);
        ctx.strokeStyle=`rgba(180,50,255,${dp*0.5})`; ctx.lineWidth=2.5*S; ctx.stroke();
      }

      // Rayos con ciclo de vida
      bolts.forEach(bolt=>{
        if(t>=bolt.fireAt&&!bolt.fired){
          bolt.fired=true; bolt.alpha=1;
          const n=slow?6:9;
          for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,spd=(2+Math.random()*6)*S;sparks.push({x:cx,y:targetY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2*S,alpha:1,color:i%2===0?'#9DE8FF':impact,size:(1.5+Math.random()*3)*S});}
        }
        if(bolt.fired) bolt.alpha=Math.max(0,bolt.alpha-0.048);
        drawBolt(bolt,bolt.alpha);
        // Flash de pantalla al disparar
        if(bolt.fired&&bolt.alpha>0.8){ctx.fillStyle=`rgba(200,220,255,${(bolt.alpha-0.8)*0.4})`;ctx.fillRect(0,0,W,H);}
      });

      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.09*S;s.vx*=0.97;s.alpha-=0.026;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** DUELO PRO A — Western: escenario desierto + pistolas + disparo */
function introDuelWestern(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const gold='#FFD700'; const cy=H*0.46;
    const sparks=[]; let fired=false, t=0;

    function scene(){
      const sky=ctx.createLinearGradient(0,0,0,H*0.55);
      sky.addColorStop(0,'rgba(10,5,20,0)'); sky.addColorStop(1,'rgba(60,20,10,0.22)');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
      const ground=ctx.createLinearGradient(0,H*0.68,0,H);
      ground.addColorStop(0,'rgba(80,55,20,0.22)'); ground.addColorStop(1,'rgba(40,25,5,0.38)');
      ctx.fillStyle=ground; ctx.fillRect(0,H*0.68,W,H*0.32);
      ctx.strokeStyle='rgba(180,120,40,0.18)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,H*0.68); ctx.lineTo(W,H*0.68); ctx.stroke();
      // Cactus
      ctx.fillStyle='rgba(20,35,10,0.45)';
      ctx.fillRect(W*0.08-4*S,H*0.5,8*S,H*0.2); ctx.fillRect(W*0.08-14*S,H*0.54,10*S,5*S); ctx.fillRect(W*0.08+4*S,H*0.57,10*S,5*S);
      ctx.fillRect(W*0.92-4*S,H*0.51,8*S,H*0.19); ctx.fillRect(W*0.92-14*S,H*0.56,10*S,5*S); ctx.fillRect(W*0.92+4*S,H*0.53,10*S,5*S);
    }

    function drawGun(x,y,flipped,col,scale,alpha){
      ctx.save(); ctx.translate(x,y); ctx.scale(flipped?-1:1,1); ctx.scale(scale,scale); ctx.globalAlpha=alpha;
      ctx.strokeStyle=col; ctx.lineWidth=5*S; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-36*S,0); ctx.lineTo(8*S,0); ctx.stroke();
      ctx.lineWidth=7*S; ctx.beginPath(); ctx.moveTo(-4*S,0); ctx.lineTo(-4*S,20*S); ctx.stroke();
      ctx.strokeStyle=col+'aa'; ctx.lineWidth=6*S;
      ctx.beginPath(); ctx.moveTo(-4*S,20*S); ctx.quadraticCurveTo(8*S,24*S,12*S,18*S); ctx.stroke();
      ctx.strokeStyle=col+'88'; ctx.lineWidth=2.5*S;
      ctx.beginPath(); ctx.moveTo(-4*S,8*S); ctx.lineTo(2*S,14*S); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.5*S;
      ctx.beginPath(); ctx.moveTo(-32*S,-2*S); ctx.lineTo(4*S,-2*S); ctx.stroke();
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      scene();
      // Countdown
      if(p<0.42){
        const cp=p/0.42, digit=cp<0.33?'3':cp<0.66?'2':'1';
        const dp=(cp%0.333)/0.333, sc=dp<0.12?dp/0.12:dp>0.82?(1-(dp-0.82)/0.18):1;
        ctx.font=`bold ${Math.round(72*S*sc)}px sans-serif`; ctx.textAlign='center';
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.globalAlpha=sc; ctx.fillText(digit,W/2+3,H*0.38+3);
        ctx.fillStyle=gold; ctx.fillText(digit,W/2,H*0.38); ctx.globalAlpha=1;
      }
      // Pistolas
      if(p>0.32){
        const gp=Math.min((p-0.32)/0.4,1), eGp=1-Math.pow(1-gp,3);
        const gunDist=W*0.33-38*S, shake=p>0.68?Math.sin(t*0.25)*(p-0.68)*10*S:0;
        drawGun(W/2-(gunDist*(0.3+0.7*(1-eGp))+38*S)+shake,cy+8*S,false,accent,gp,gp);
        drawGun(W/2+(gunDist*(0.3+0.7*(1-eGp))+38*S)+shake,cy+8*S,true,impact,gp,gp);
        if(gp>0.7){const lp=(gp-0.7)/0.3;ctx.strokeStyle=`rgba(255,200,50,${lp*0.12})`;ctx.lineWidth=1*S;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(W/2-80*S,cy+8*S);ctx.lineTo(W/2+80*S,cy+8*S);ctx.stroke();ctx.setLineDash([]);}
      }
      // Disparo
      if(p>0.75&&!fired){fired=true;const n=slow?8:14;for(let i=0;i<n;i++){const a=(Math.random()-0.5)*Math.PI*0.7,spd=(3+Math.random()*7)*S;sparks.push({x:i<n/2?W/2-80*S:W/2+80*S,y:cy+8*S,vx:Math.cos(a)*spd*(i<n/2?1:-1),vy:Math.sin(a)*spd-2*S,alpha:1,color:i%3===0?gold:i%3===1?accent:impact,size:(1.5+Math.random()*3)*S});}}
      if(p>0.75&&p<0.88){const fp=(p-0.75)/0.13,fb=fp<0.5?fp*2:2-fp*2;ctx.fillStyle=`rgba(255,200,50,${fb*0.48})`;ctx.fillRect(0,0,W,H);}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.08*S;s.vx*=0.97;s.alpha-=0.026;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      if(p>0.82){const dp2=Math.min((p-0.82)/0.12,1),pulse=0.85+0.15*Math.sin(t*0.05);ctx.font=`bold ${Math.round(36*S*dp2*pulse)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText('DRAW!',W/2+2,H*0.3+2);ctx.fillStyle=gold;ctx.fillText('DRAW!',W/2,H*0.3);}
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** DUELO PRO B — Ring de boxeo con campana, guantes y KO */
function introDuelBoxing(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const cy=H*0.46; const sparks=[]; let hit=false, t=0;

    function ring(alpha){
      ctx.save(); ctx.globalAlpha=alpha;
      const rW=200*S, rY=cy+40*S;
      ctx.fillStyle='rgba(180,140,80,0.15)'; ctx.fillRect(W/2-rW/2,rY,rW,18*S);
      [0,12,24].forEach(yo=>{ctx.strokeStyle=`rgba(255,255,255,${0.32-yo*0.01})`;ctx.lineWidth=(2.5-yo*0.05)*S;ctx.beginPath();ctx.moveTo(W/2-rW/2,rY-yo*S);ctx.lineTo(W/2+rW/2,rY-yo*S);ctx.stroke();});
      [-1,1].forEach(side=>{ctx.strokeStyle='rgba(255,255,255,0.45)';ctx.lineWidth=4*S;ctx.beginPath();ctx.moveTo(W/2+side*rW/2,rY-28*S);ctx.lineTo(W/2+side*rW/2,rY+18*S);ctx.stroke();});
      ctx.restore();
    }

    function glove(x,y,col,flipped){
      ctx.save(); ctx.translate(x,y); ctx.scale(flipped?-1:1,1);
      ctx.fillStyle=col+'99'; ctx.fillRect(-18*S,14*S,36*S,18*S);
      ctx.strokeStyle=col; ctx.lineWidth=1.5*S; ctx.strokeRect(-18*S,14*S,36*S,18*S);
      ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(0,0,22*S,18*S,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1.5*S; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-6*S,-6*S,10*S,7*S,-0.4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(17*S,-9*S,9*S,6*S,-0.5,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      const vg=ctx.createRadialGradient(W/2,cy,60*S,W/2,cy,W*0.8);
      vg.addColorStop(0,'rgba(60,20,10,0.28)'); vg.addColorStop(1,'rgba(0,0,0,0.65)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
      ring(Math.min(p*4,1));
      // Campana
      if(p<0.22){
        const bx=W/2,by=H*0.18,swing=Math.sin(t*0.22)*10*S*Math.max(0,1-t/350);
        ctx.save(); ctx.translate(bx+swing,by);
        ctx.fillStyle='#FFD700'; ctx.strokeStyle='#B8860B'; ctx.lineWidth=2*S;
        ctx.beginPath(); ctx.arc(0,0,12*S,Math.PI,0); ctx.lineTo(12*S,10*S); ctx.arc(0,10*S,12*S,0,Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // ROUND 1
      if(p<0.22){const rp=p/0.22;ctx.font=`bold ${Math.round(36*S*rp)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='#FFD700';ctx.globalAlpha=rp*(1-Math.max(0,(p-0.16)/0.06));ctx.fillText('ROUND 1',W/2,cy-62*S);ctx.globalAlpha=1;}
      // Guantes acercándose
      const approach=Math.min(Math.max((p-0.18)/0.47,0),1), ea=1-Math.pow(1-approach,3);
      const maxDist=W*0.36-28*S, gx1=W/2-maxDist*(1-ea)-28*S, gx2=W/2+maxDist*(1-ea)+28*S;
      const gBounce=approach<1?Math.abs(Math.sin(approach*Math.PI*3))*10*S:0;
      glove(gx1,cy-gBounce,accent,false); glove(gx2,cy-gBounce,impact,true);
      if(approach>=1&&!hit){hit=true;const n=slow?8:14;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*7)*S;sparks.push({x:W/2,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?accent:impact,size:(2+Math.random()*3)*S});}}
      const chashT=DUR*0.65;if(t>chashT&&t<chashT+260){const fp=(t-chashT)/260,fb=fp<0.5?fp*2:2-fp*2;ctx.fillStyle=`rgba(255,255,255,${fb*0.55})`;ctx.fillRect(0,0,W,H);}
      if(p>0.72){const kp=Math.min((p-0.72)/0.14,1),kPulse=0.85+0.15*Math.sin(t*0.04),kSize=52*S*kp*kPulse;ctx.font=`bold ${Math.round(kSize)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText('KO!',W/2+3,cy-48*S+3);ctx.fillStyle='#FFD700';ctx.fillText('KO!',W/2,cy-48*S);ctx.fillStyle=impact;ctx.globalAlpha=kp;ctx.fillText('KO!',W/2,cy-48*S);ctx.globalAlpha=1;}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.vx*=0.97;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

// ══════════════════════════════════════════════════════════
// PAYWALL — Splitr Pro
// ══════════════════════════════════════════════════════════

let modalPaywall = null;

function initPaywall() {
  modalPaywall = document.getElementById('modal-paywall');
  if (!modalPaywall) return;

  document.getElementById('btn-paywall-close')?.addEventListener('click', closePaywall);
  document.getElementById('btn-restore-purchases')?.addEventListener('click', handleRestorePurchases);
  document.getElementById('btn-buy-bundle')?.addEventListener('click', handleBuyBundle);
  modalPaywall.addEventListener('click', e => { if(e.target === modalPaywall) closePaywall(); });
}

function openPaywall(triggerSkinId = null) {
  if (!modalPaywall) return;
  renderPaywallItems(triggerSkinId);
  modalPaywall.style.display = 'flex';
  requestAnimationFrame(() => modalPaywall.classList.add('open'));
}

function closePaywall() {
  if (!modalPaywall) return;
  modalPaywall.classList.remove('open');
  setTimeout(() => { modalPaywall.style.display = 'none'; }, 300);
}

function renderPaywallItems(highlightSkinId) {
  const container = document.getElementById('paywall-items-list');
  if (!container) return;

  const unlocked = getUnlockedSkins();
  const allProSkins = Object.values(SKIN_CATALOG).flat().filter(s => s.tier === 'pro');
  const modeNames = { normal:'Normal', elimination:'Eliminación', team:'Equipo', order:'Orden', duel:'Duelo', revenge:'Venganza' };

  // Check if user has bundle
  const hasBundleAll = allProSkins.every(s => unlocked[s.id]);

  // Update bundle button
  const bundleBtn = document.getElementById('btn-buy-bundle');
  if (bundleBtn) {
    if (hasBundleAll) {
      bundleBtn.textContent = '¡Ya tienes todo!';
      bundleBtn.disabled = true;
    } else {
      bundleBtn.textContent = 'Obtener Todo por $4.99';
      bundleBtn.disabled = false;
    }
  }

  container.innerHTML = allProSkins.map(skin => {
    const isOwned = unlocked[skin.id];
    const isHighlighted = skin.id === highlightSkinId;
    const modeKey = Object.entries(SKIN_CATALOG).find(([,skins]) => skins.some(s=>s.id===skin.id))?.[0];
    const modeLabel = modeNames[modeKey] || modeKey;
    const iconSvg = SKIN_ICONS[skin.id] || '';

    return '<div class="paywall-item' + (isHighlighted?' highlighted':'') + '" data-skin-id="' + skin.id + '">'
      + '<div class="paywall-item-icon">' + iconSvg + '</div>'
      + '<div class="paywall-item-info">'
      + '<div class="paywall-item-name">' + skin.name + '</div>'
      + '<div class="paywall-item-mode">' + modeLabel + ' · ' + skin.desc + '</div>'
      + '</div>'
      + '<div class="paywall-item-action">'
      + (isOwned
          ? '<span class="paywall-item-owned"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Activo</span>'
          : '<button class="paywall-item-price" data-skin-id="' + skin.id + '">$' + (skin.price||'0.99') + '</button>'
        )
      + '</div>'
      + '</div>';
  }).join('');

  // Listeners de compra individual
  container.querySelectorAll('.paywall-item-price').forEach(btn => {
    btn.addEventListener('click', () => handleBuySkin(btn.dataset.skinId));
  });
}

async function handleBuyBundle() {
  const btn = document.getElementById('btn-buy-bundle');
  if (!btn || btn.disabled) return;
  btn.textContent = 'Procesando…'; btn.disabled = true;

  try {
    const result = await purchase('pro_bundle');
    if (result.success) {
      // Desbloquear todas las skins Pro
      const allPro = Object.values(SKIN_CATALOG).flat().filter(s => s.tier === 'pro');
      allPro.forEach(s => unlockSkin(s.id));
      showToast('¡Splitr Pro desbloqueado!');
      if (prefs.sound) playWinnerFanfare();
      renderPaywallItems(null);
      renderSkinsPicker();
      setTimeout(closePaywall, 1200);
    } else if (result.error && result.error !== 'Cancelado') {
      showToast('Error: ' + result.error);
      btn.textContent = 'Obtener Todo por $4.99'; btn.disabled = false;
    } else {
      btn.textContent = 'Obtener Todo por $4.99'; btn.disabled = false;
    }
  } catch {
    btn.textContent = 'Obtener Todo por $4.99'; btn.disabled = false;
  }
}

async function handleBuySkin(skinId) {
  const btn = document.querySelector(`.paywall-item-price[data-skin-id="${skinId}"]`);
  if (!btn) return;
  const origText = btn.textContent;
  btn.textContent = '…'; btn.disabled = true;

  try {
    const result = await purchase(skinId);
    if (result.success) {
      unlockSkin(skinId);
      showToast('¡Desbloqueado!');
      renderPaywallItems(skinId);
      renderSkinsPicker();
    } else if (result.error && result.error !== 'Cancelado') {
      showToast('Error: ' + result.error);
      btn.textContent = origText; btn.disabled = false;
    } else {
      btn.textContent = origText; btn.disabled = false;
    }
  } catch {
    btn.textContent = origText; btn.disabled = false;
  }
}

async function handleRestorePurchases() {
  const btn = document.getElementById('btn-restore-purchases');
  if (btn) { btn.textContent = 'Restaurando…'; btn.disabled = true; }

  const unlocked = await restorePurchases();
  if (unlocked.length > 0) {
    unlocked.forEach(id => unlockSkin(id));
    showToast(`${unlocked.length} compra${unlocked.length>1?'s':''} restaurada${unlocked.length>1?'s':''}`);
    renderPaywallItems(null);
    renderSkinsPicker();
  } else {
    showToast('No se encontraron compras anteriores');
  }
  if (btn) { btn.textContent = 'Restaurar compras anteriores'; btn.disabled = false; }
}


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
    // Velocidad inversa: speed=150 → más rápido, speed=50 → más lento
    const STEP   = Math.round(460 * (100 / prefs.speed));

    digits.forEach((text, i) => {
      setTimeout(() => {
        countdownOverlay.innerHTML = '';
        const el = document.createElement('div');
        el.className    = 'countdown-digit';
        el.textContent  = text;
        countdownOverlay.appendChild(el);
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([20, 10, 20]); // countdown
      }, i * STEP);
    });

    // Cerrar justo cuando termina el "1" (al inicio de su animación de salida)
    setTimeout(() => {
      countdownOverlay.classList.remove('visible');
      countdownOverlay.innerHTML = '';
      resolve();
    }, digits.length * STEP + 50);
  });
}

// ══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════════════
function bindEvents() {
  // ── Configuración / Personalización ──
  initPaywall();
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
// ESTADÍSTICAS
// ══════════════════════════════════════════════════════════
function renderStats() {
  if (!statsGrid) return;
  const { participants, sessionStats } = state.get();

  // ── Estado vacío: sin participantes o sin sorteos ──
  const totalSorteos = participants.reduce((s, p) => s + (sessionStats[p.id]?.chosen ?? 0), 0);

  if (participants.length === 0 || totalSorteos === 0) {
    statsGrid.innerHTML = `
      <div class="stats-empty">
        <div class="stats-empty-visual" aria-hidden="true">
          <div class="stats-empty-bar" style="height:28px;"></div>
          <div class="stats-empty-bar" style="height:48px;"></div>
          <div class="stats-empty-bar" style="height:36px;"></div>
          <div class="stats-empty-bar" style="height:20px;"></div>
          <div class="stats-empty-bar" style="height:42px;"></div>
        </div>
        <p class="stats-empty-text">
          ${participants.length === 0
            ? 'Añade participantes y haz tu primer sorteo'
            : 'Haz al menos un sorteo para ver estadísticas'}
        </p>
        <p class="stats-empty-hint">Las estadísticas duran mientras la sesión esté activa</p>
      </div>`;
    return;
  }

  // ── Ordenar por veces elegido ──
  const sorted = [...participants].sort((a, b) =>
    (sessionStats[b.id]?.chosen ?? 0) - (sessionStats[a.id]?.chosen ?? 0)
  );
  const maxChosen = Math.max(...sorted.map(p => sessionStats[p.id]?.chosen ?? 0), 1);

  // ── PODIO — top 3 ──
  const podiumColors = [
    { label: '1er lugar', rankClass: 'rank-1', delay: 100 },
    { label: '2do lugar', rankClass: 'rank-2', delay: 0   },
    { label: '3er lugar', rankClass: 'rank-3', delay: 200 },
  ];

  // Los 3 primeros (reordenados visualmente: 2º-1º-3º para el podio)
  const top3   = sorted.slice(0, Math.min(3, sorted.length));
  const rest   = sorted.slice(3);

  // Orden visual del podio: [2º, 1º, 3º] (plata-oro-bronce)
  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
      ? [null, top3[0], top3[1]]
      : [null, top3[0], null];

  const podiumHtml = `
    <div class="stats-podium" role="list">
      ${podiumOrder.map((p, vi) => {
        // vi 0=izq(plata), 1=centro(oro), 2=der(bronce)
        const rankIdx = [1, 0, 2][vi]; // índice real en sorted
        const cfg     = podiumColors[rankIdx];
        if (!p) return `<div></div>`; // hueco vacío

        const st     = sessionStats[p.id] ?? { chosen: 0, escaped: 0 };
        const colors = getAvatarColorsByName(p.name);
        return `
          <div class="podium-card ${cfg.rankClass}" role="listitem"
               style="animation-delay:${cfg.delay}ms;">
            <div class="podium-rank">${cfg.label}</div>
            <div class="podium-avatar"
                 style="background:${colors.gradient};
                        --avatar-color:${colors.color};
                        --avatar-glow:${colors.glow};">
              ${escapeHtml(getInitials(p.name))}
            </div>
            <div class="podium-name">${escapeHtml(p.name)}</div>
            <div class="podium-count">${st.chosen}</div>
            <div class="podium-label">${st.chosen === 1 ? 'vez elegido' : 'veces elegido'}</div>
          </div>`;
      }).join('')}
    </div>`;

  // ── FILAS — resto de participantes ──
  const rowsHtml = rest.length > 0 ? `
    <div class="stats-section-title">Todos</div>
    ${rest.map((p, i) => {
      const rank   = i + 4; // comienza en 4º
      const st     = sessionStats[p.id] ?? { chosen: 0, escaped: 0 };
      const total  = st.chosen + st.escaped;
      const pct    = total > 0 ? Math.round(st.chosen / total * 100) : 0;
      const bar    = st.chosen / maxChosen;
      const colors = getAvatarColorsByName(p.name);
      const delay  = i * 50;
      return `
        <div class="stat-row" role="listitem" style="animation-delay:${delay}ms;">
          <div class="stat-rank-num">${rank}º</div>
          <div class="stat-avatar-mini" style="background:${colors.gradient};
               --avatar-color:${colors.color};">${escapeHtml(getInitials(p.name))}</div>
          <div class="stat-info">
            <div class="stat-name">${escapeHtml(p.name)}</div>
            <div style="font-size:0.68rem;color:var(--color-text-dim);margin:3px 0 2px;">
              ${st.chosen}× elegido · ${pct}% de participaciones
            </div>
            <div class="stat-bar-wrap">
              <div class="stat-bar" style="transform:scaleX(${bar.toFixed(3)});
                   transition:transform 700ms cubic-bezier(0.34,1.56,0.64,1) ${delay + 200}ms;"></div>
            </div>
          </div>
          <div class="stat-count">${st.chosen}</div>
        </div>`;
    }).join('')}` : '';

  // ── Si solo hay 1-3 participantes también mostrarlos como filas ──
  const allRowsHtml = sorted.length <= 3 ? `
    <div class="stats-section-title">Detalle</div>
    ${sorted.map((p, i) => {
      const st     = sessionStats[p.id] ?? { chosen: 0, escaped: 0 };
      const total  = st.chosen + st.escaped;
      const pct    = total > 0 ? Math.round(st.chosen / total * 100) : 0;
      const bar    = st.chosen / maxChosen;
      const colors = getAvatarColorsByName(p.name);
      return `
        <div class="stat-row" role="listitem" style="animation-delay:${i * 60}ms;">
          <div class="stat-rank-num">${i + 1}º</div>
          <div class="stat-avatar-mini" style="background:${colors.gradient};">
            ${escapeHtml(getInitials(p.name))}
          </div>
          <div class="stat-info">
            <div class="stat-name">${escapeHtml(p.name)}</div>
            <div style="font-size:0.68rem;color:var(--color-text-dim);margin:3px 0 2px;">
              ${st.chosen}× elegido · ${pct}% · ${st.escaped}× escapó
            </div>
            <div class="stat-bar-wrap">
              <div class="stat-bar" style="transform:scaleX(${bar.toFixed(3)});
                   transition:transform 700ms cubic-bezier(0.34,1.56,0.64,1) ${i * 100 + 200}ms;"></div>
            </div>
          </div>
          <div class="stat-count">${st.chosen}</div>
        </div>`;
    }).join('')}` : '';

  statsGrid.innerHTML = buildDonutChart(sorted, sessionStats, totalSorteos) + podiumHtml + rowsHtml + allRowsHtml;
}

/**
 * Genera un SVG de donut chart animado con los datos de estadísticas.
 * Cada arco representa la proporción de victorias de un participante.
 */
function buildDonutChart(sorted, sessionStats, total) {
  if (sorted.length < 2 || total === 0) return '';

  const PALETTE = [120,150,80,55,30,0,330,300,270,240,200,170];

  // Técnica stroke-dasharray: cada sector es un <circle> con stroke parcial.
  // Circunferencia = 2πR. Cada sector = frac * circunferencia.
  const R   = 38;       // radio del círculo (donut)
  const GAP = 1.8;      // px de separación entre sectores
  const CIRC = 2 * Math.PI * R;
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
        <span class="donut-legend-name">${escapeHtml(p.name)}</span>
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

// ══════════════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════════════
function showScreen(name) {
  ['home', 'stats'].forEach(key => {
    const el = $(`screen-${key}`);
    if (!el) return;
    el.classList.toggle('active', key === name);
    if (key === name && name === 'stats') {
      renderStats();
      switchStatsTab('stats'); // siempre empieza en stats
    }
  });
}

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
  toastEl.classList.add('visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toastEl?.classList.remove('visible'), 2600);
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
// SISTEMA DE TEMAS
// ══════════════════════════════════════════════════════════

const THEMES = ['cyberpunk','fire','matrix','ocean','sunset','neonpink','deepspace','toxic','blood','light','arctic','goldrush','vaporwave','jungle','midnight','lava','sakura','slate','candy','storm'];

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'cyberpunk';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  const metaColors = {
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
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', metaColors[theme] ?? '#090912');

  if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([8,6,14]);
}
const THEME_KEY = 'qp-theme';

/**
 * Aplica el tema al <html> y lo persiste en localStorage.
 * Actualiza el swatch activo en el panel.
 */
/**
 * Carga el tema guardado al iniciar la app.
 */
function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY) ?? 'cyberpunk';
  applyTheme(saved);
}

function toggleThemePanel() {
  const isOpen = themePanel?.style.display !== 'none';
  if (isOpen) {
    closeThemePanel();
  } else {
    openThemePanel();
  }
}

function openThemePanel() {
  if (themePanel)   themePanel.style.display   = 'block';
  if (themeBackdrop) themeBackdrop.style.display = 'block';
  // Reset animación
  const inner = themePanel?.querySelector('.theme-panel-inner');
  if (inner) { inner.style.animation = 'none'; requestAnimationFrame(() => { inner.style.animation = ''; }); }
}

function closeThemePanel() {
  if (themePanel)    themePanel.style.display    = 'none';
  if (themeBackdrop) themeBackdrop.style.display = 'none';
}

// ══════════════════════════════════════════════════════════
// CONFIGURACIÓN / AJUSTES
// ══════════════════════════════════════════════════════════

const SETTINGS_KEY = 'qp-settings';

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

function loadSettings() {
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
  } catch { /* usa defaults */ }

  // Aplicar pregunta por defecto
  if (inputQuestion) {
    inputQuestion.value = prefs.defaultQuestion;
    state.set({ question: prefs.defaultQuestion });
  }

  // Aplicar glow
  applyGlowIntensity(prefs.glow);

  // Sincronizar controles del modal
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
  if (inputDefaultQuestion) inputDefaultQuestion.value = prefs.defaultQuestion;
}

/**
 * Aplica la intensidad del glow a toda la app vía CSS vars.
 * 100% = normal, 0% = sin glow
 */
function applyGlowIntensity(pct) {
  const f = pct / 100;
  document.documentElement.style.setProperty('--glow-multiplier', f);

  if (f === 0) {
    document.documentElement.style.setProperty('--glow-primary', 'none');
    document.documentElement.style.setProperty('--glow-accent',  'none');
    document.documentElement.style.setProperty('--glow-impact',  'none');
  } else {
    // Recalcular con el factor de opacidad
    const p = (0.6 * f).toFixed(2), p2 = (0.3 * f).toFixed(2);
    const a = (0.7 * f).toFixed(2), a2 = (0.3 * f).toFixed(2);
    const i = (0.8 * f).toFixed(2), i2 = (0.4 * f).toFixed(2);
    document.documentElement.style.setProperty('--glow-primary',
      `0 0 20px rgba(123,47,190,${p}), 0 0 40px rgba(123,47,190,${p2})`);
    document.documentElement.style.setProperty('--glow-accent',
      `0 0 15px rgba(0,245,255,${a}), 0 0 30px rgba(0,245,255,${a2})`);
    document.documentElement.style.setProperty('--glow-impact',
      `0 0 20px rgba(255,0,110,${i}), 0 0 40px rgba(255,0,110,${i2})`);
  }
}

function openSettingsModal() {
  syncSettingsUI();
  renderSkinsPicker(); // cargar picker de skins

  // Live update de sliders
  settingGlow?.addEventListener('input', () => {
    const v = parseInt(settingGlow.value);
    if (settingGlowVal) settingGlowVal.textContent = `${v}%`;
    applyGlowIntensity(v); // preview en tiempo real
  });
  settingSpeed?.addEventListener('input', () => {
    const v = parseInt(settingSpeed.value);
    if (settingSpeedVal) settingSpeedVal.textContent = `${(v/100).toFixed(1)}×`;
  });

  modalSettings?.classList.add('open');
}

function closeSettingsModal() {
  modalSettings?.classList.remove('open');
}

function handleSaveSettings() {
  prefs.sound    = settingSound?.checked    ?? true;
  prefs.vibration = settingVibration?.checked ?? true;
  prefs.particles = settingParticles?.checked ?? true;
  prefs.flash    = settingFlash?.checked    ?? true;
  prefs.roulette = settingRoulette?.checked ?? false;
  prefs.glow     = parseInt(settingGlow?.value   ?? '100');
  prefs.speed    = parseInt(settingSpeed?.value  ?? '100');
  prefs.defaultQuestion = inputDefaultQuestion?.value.trim() || '¿Quién paga?';

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...prefs }));
  } catch { /* ignora */ }

  applyGlowIntensity(prefs.glow);

  // Aplicar pregunta por defecto si el campo está en el valor por defecto
  if (inputQuestion && (!inputQuestion.value.trim() || inputQuestion.value === '¿Quién paga?')) {
    inputQuestion.value = prefs.defaultQuestion;
    state.set({ question: prefs.defaultQuestion });
  }

  closeSettingsModal();
  showToast('Ajustes guardados');
}

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
// HISTORIAL PERSISTENTE DE ESTADÍSTICAS
// ══════════════════════════════════════════════════════════

const STATS_KEY = 'qp-stats';

/**
 * Persiste las estadísticas actuales en localStorage.
 * Se llama después de cada sorteo.
 */
function persistStats() {
  try {
    const { participants, sessionStats } = state.get();
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
function loadPersistedStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return;
    const { stats } = JSON.parse(raw);
    const participants = state.getKey('participants');
    const current = { ...state.getKey('sessionStats') };
    let merged = false;
    participants.forEach(p => {
      if (stats[p.name] && !current[p.id]?.chosen) {
        current[p.id] = stats[p.name];
        merged = true;
      }
    });
    if (merged) state.set({ sessionStats: current });
  } catch { /* ignora */ }
}

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
// HISTORIAL DE SORTEOS
// ══════════════════════════════════════════════════════════

function switchStatsTab(tab) {
  const isStats = tab === 'stats';
  tabStats?.classList.toggle('active',   isStats);
  tabHistory?.classList.toggle('active', !isStats);
  if (statsGrid)   statsGrid.style.display   = isStats ? 'flex' : 'none';
  if (historyList) historyList.style.display = isStats ? 'none' : 'flex';
  if (!isStats) renderHistory();
}

function renderHistory() {
  if (!historyList) return;
  const history = state.getKey('sessionHistory') || [];

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="stats-empty">
        <div class="stats-empty-visual" aria-hidden="true">
          <div class="stats-empty-bar" style="height:20px;"></div>
          <div class="stats-empty-bar" style="height:32px;"></div>
          <div class="stats-empty-bar" style="height:24px;"></div>
        </div>
        <p class="stats-empty-text">Aún no hay sorteos en esta sesión</p>
      </div>`;
    return;
  }

  const modeLabels = {
    normal: 'Normal', elimination: 'Elim.', team: 'Equipo', order: 'Orden',
    revenge: 'Venganza', duel: 'Duelo', split: 'Dividir', russian: 'R. Rusa',
    tournament: 'Torneo', coin: 'Cara/Cruz', dice: 'Dado', bomb: 'Bomba', voice: 'Voz'
  };

  historyList.innerHTML = history.map((entry, i) => {
    const colors  = getAvatarColorsByName(entry.winnerName);
    const initials = getInitials(entry.winnerName);
    const time    = new Date(entry.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const delay   = Math.min(i * 40, 300);

    return `
      <div class="history-entry" role="listitem" style="animation-delay:${delay}ms">
        <div class="history-avatar" style="background:${colors.gradient};
             box-shadow:0 0 0 2px ${colors.color}, 0 0 8px ${colors.glow};">
          ${escapeHtml(initials)}
        </div>
        <div class="history-info">
          <div class="history-name">${escapeHtml(entry.winnerName)}</div>
          <div class="history-question">${escapeHtml(entry.question)}</div>
        </div>
        <div class="history-meta">
          <span class="history-time">${time}</span>
          <span class="history-mode-badge">${modeLabels[entry.mode] ?? entry.mode}</span>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// RULETA DE CASINO
// ══════════════════════════════════════════════════════════

/**
 * Animación de ruleta de casino que gira y desacelera hasta el ganador.
 * Dibuja la ruleta en canvas con los avatares de los participantes.
 */
function runRouletteAnimation(participants, winnerId) {
  return new Promise(resolve => {
    if (!rouletteCanvas || !rouletteOverlay) { resolve(); return; }

    const N          = participants.length;
    const sliceAngle = (Math.PI * 2) / N;
    const winnerIdx  = participants.findIndex(p => p.id === winnerId);
    if (winnerIdx === -1) { resolve(); return; }



    // Paleta curada igual que los avatares del grid
    const PALETTE = [120,150,80,55,30,0,330,300,270,240,200,170];
    const sectorColors = participants.map((_, i) => {
      const hue  = PALETTE[i % PALETTE.length];
      const hue2 = (hue + 28) % 360;
      return { hue, hue2,
        light:  `hsl(${hue},  95%, 62%)`,
        mid:    `hsl(${hue},  85%, 42%)`,
        dark:   `hsl(${hue},  80%, 28%)`,
        glow:   `hsla(${hue}, 95%, 65%, 0.9)`,
      };
    });

    // Canvas — más grande y nítido
    const size = Math.min(window.innerWidth * 0.86, window.innerHeight * 0.58, 360);
    const DPR  = window.devicePixelRatio || 2;
    rouletteCanvas.width  = size * DPR;
    rouletteCanvas.height = size * DPR;
    rouletteCanvas.style.width  = `${size}px`;
    rouletteCanvas.style.height = `${size}px`;

    const winnerColors = sectorColors[winnerIdx];
    rouletteOverlay.style.setProperty('--result-rgb',
      `${Math.round(parseInt(winnerColors.hue)/360*255)},200,100`);

    const ctx = rouletteCanvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // reset + scale, evita acumulación
    const cx = size / 2, cy = size / 2;
    const R  = size / 2 - 6;   // radio de la rueda
    const Ri = R * 0.13;        // radio del centro

    // ── Calcular ángulo destino ──
    // El puntero está ARRIBA (-π/2). Para que el CENTRO del sector ganador quede ahí:
    //   targetAngle + winnerIdx*sliceAngle + sliceAngle/2 ≡ -π/2  (mod 2π)
    //   targetAngle = -π/2 - winnerIdx*sliceAngle - sliceAngle/2
    //
    // CRÍTICO: extraSpins debe ser un número ENTERO de vueltas (×2π)
    // Si no es entero, el targetAngle se desplaza y el sector ganador no queda arriba.
    const targetAngle = -(Math.PI / 2) - (winnerIdx * sliceAngle) - (sliceAngle / 2);
    const extraSpins  = (5 + Math.floor(Math.random() * 3)) * Math.PI * 2; // 5, 6 o 7 vueltas ENTERAS
    const finalAngle  = targetAngle - extraSpins;

    const DURATION  = 4800;
    let startTime   = null;
    let lastTickIdx = -1;
    let _rafId      = null;

    // ── Sonido tick con Web Audio ──
    const audioCtx = window.AudioContext
      ? new AudioContext()
      : window.webkitAudioContext
        ? new webkitAudioContext()
        : null;

    function playTick(speed) {
      if (!audioCtx || !prefs.sound) return;
      try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(speed > 0.7 ? 900 : speed > 0.4 ? 700 : 500, audioCtx.currentTime);
        g.gain.setValueAtTime(0.18, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
        o.start(); o.stop(audioCtx.currentTime + 0.06);
      } catch { /* ignora */ }
    }

    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

    function drawWheel(angle) {
      ctx.clearRect(0, 0, size, size);

      // ── Sombra exterior de la rueda ──
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur  = 28;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      // ── Aro exterior dorado ──
      const goldGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      goldGrad.addColorStop(0,    '#FFE566');
      goldGrad.addColorStop(0.25, '#FFC200');
      goldGrad.addColorStop(0.5,  '#FFE566');
      goldGrad.addColorStop(0.75, '#CC9A00');
      goldGrad.addColorStop(1,    '#FFE566');
      ctx.beginPath();
      ctx.arc(cx, cy, R + 5, 0, Math.PI * 2);
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth   = 10;
      ctx.shadowColor = 'rgba(255,200,0,0.6)';
      ctx.shadowBlur  = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── Diamantes decorativos en el aro dorado ──
      for (let i = 0; i < N; i++) {
        const a  = angle + i * sliceAngle + sliceAngle / 2;
        const dr = R + 5;
        const dx = cx + Math.cos(a) * dr;
        const dy = cy + Math.sin(a) * dr;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(a + Math.PI / 4);
        ctx.fillStyle = '#FFE566';
        ctx.shadowColor = 'rgba(255,220,0,0.8)';
        ctx.shadowBlur  = 6;
        const ds = Math.max(3, 6 - N * 0.3);
        ctx.fillRect(-ds/2, -ds/2, ds, ds);
        ctx.restore();
      }
      ctx.shadowBlur = 0;

      // ── Sectores ──
      participants.forEach((p, i) => {
        const startA = angle + i * sliceAngle;
        const endA   = startA + sliceAngle;
        const sc     = sectorColors[i];

        // Fondo del sector con gradiente radial vibrante
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startA, endA);
        ctx.closePath();

        const grad = ctx.createRadialGradient(cx, cy, Ri * 1.5, cx, cy, R);
        grad.addColorStop(0,    sc.mid);
        grad.addColorStop(0.55, sc.mid);
        grad.addColorStop(0.78, sc.light);
        grad.addColorStop(1,    sc.dark);
        ctx.fillStyle = grad;
        ctx.fill();

        // Separadores dorados entre sectores
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const sepX = cx + Math.cos(startA) * R;
        const sepY = cy + Math.sin(startA) * R;
        ctx.lineTo(sepX, sepY);
        ctx.strokeStyle = 'rgba(255,215,0,0.85)';
        ctx.lineWidth   = 2.5;
        ctx.shadowColor = 'rgba(255,200,0,0.6)';
        ctx.shadowBlur  = 5;
        ctx.stroke();
        ctx.restore();

        // Brillo en el borde exterior del sector
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R - 1, startA, endA);
        ctx.strokeStyle = `hsla(${sc.hue}, 90%, 85%, 0.4)`;
        ctx.lineWidth   = 3;
        ctx.stroke();
        ctx.restore();

        // Iniciales — grandes, centradas, legibles
        const midA    = startA + sliceAngle / 2;
        const textR   = R * (N <= 4 ? 0.62 : N <= 6 ? 0.64 : 0.66);
        const tx      = cx + Math.cos(midA) * textR;
        const ty      = cy + Math.sin(midA) * textR;
        const fsize   = Math.max(11, Math.min(22, R * 0.28 - N * 0.8));

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(midA + Math.PI / 2);

        // Sombra fuerte para legibilidad
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = 'white';
        ctx.font        = `900 ${fsize}px 'Bebas Neue', Impact, sans-serif`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getInitials(p.name), 0, 0);

        // Nombre corto debajo de las iniciales (solo si hay espacio suficiente)
        if (N <= 6 && fsize >= 16) {
          ctx.shadowBlur = 4;
          ctx.font       = `600 ${fsize * 0.48}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle  = 'rgba(255,255,255,0.8)';
          const shortName = p.name.length > 7 ? p.name.slice(0, 6) + '.' : p.name;
          ctx.fillText(shortName, 0, fsize * 0.88);
        }
        ctx.restore();
      });

      // ── Centro (hub) ──
      // Sombra
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, Ri + 3, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
      ctx.restore();

      // Aro dorado del hub
      ctx.beginPath();
      ctx.arc(cx, cy, Ri + 3, 0, Math.PI * 2);
      const hubGold = ctx.createLinearGradient(cx - Ri, cy - Ri, cx + Ri, cy + Ri);
      hubGold.addColorStop(0, '#FFE566');
      hubGold.addColorStop(1, '#CC9A00');
      ctx.strokeStyle = hubGold;
      ctx.lineWidth   = 3;
      ctx.shadowColor = 'rgba(255,210,0,0.7)';
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Relleno hub con gradiente brillante
      ctx.beginPath();
      ctx.arc(cx, cy, Ri, 0, Math.PI * 2);
      const hubGrad = ctx.createRadialGradient(cx - Ri*0.3, cy - Ri*0.3, 0, cx, cy, Ri);
      hubGrad.addColorStop(0, '#ffffff');
      hubGrad.addColorStop(0.4, '#e8e8e8');
      hubGrad.addColorStop(1,   '#aaaaaa');
      ctx.fillStyle = hubGrad;
      ctx.fill();

      // Punto central
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#888';
      ctx.fill();
    }

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed  = timestamp - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const speed    = 1 - progress;
      const eased    = easeOut(progress);
      const currentAngle = finalAngle * eased;

      drawWheel(currentAngle);

      if (progress < 1) {
        // ── Sector apuntado durante el giro ──
        const rawIdx     = Math.floor((-(Math.PI / 2) - currentAngle) / sliceAngle);
        const currentIdx = ((rawIdx % N) + N) % N;
        if (currentIdx !== lastTickIdx) {
          lastTickIdx = currentIdx;
          if (prefs.vibration && 'vibrate' in navigator)
            navigator.vibrate(speed > 0.5 ? 5 : speed > 0.2 ? 8 : 15);
          playTick(speed);
        }
        if (rouletteLabel) rouletteLabel.textContent = participants[currentIdx]?.name ?? '';

        _rafId = requestAnimationFrame(tick);
      } else {
        // ── Frame final — winnerIdx exacto, siempre correcto ──
        drawWheel(finalAngle);
        if (rouletteLabel) {
          rouletteLabel.textContent    = participants[winnerIdx].name;
          rouletteLabel.style.color     = winnerColors.light;
          rouletteLabel.style.textShadow = `0 0 20px ${winnerColors.glow}`;
        }

        if (prefs.flash) triggerImpactFlash();
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([60,30,120,30,200]);
        if (prefs.particles) spawnParticles(winnerColors.light);

        setTimeout(() => {
          rouletteOverlay.style.display = 'none';
          if (rouletteLabel) {
            rouletteLabel.style.color      = '';
            rouletteLabel.style.textShadow = '';
          }
          resolve();
        }, 1100);
      }
    }

    rouletteOverlay.style.display = 'flex';
    if (rouletteLabel) rouletteLabel.textContent = '';
    _rafId = requestAnimationFrame(tick);
  });
}

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
// RULETA RUSA — turno por turno, 6 cámaras, 1 bala
// ══════════════════════════════════════════════════════════
function launchRussianRoulette(participants) {
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

  function renderChambers() {
    if (!chambersEl) return;
    chambersEl.innerHTML = Array.from({ length: CHAMBERS }, (_, i) => {
      const cls = i < currentChamber ? 'fired' : i === currentChamber && !gameOver ? 'active' : '';
      return `<div class="russian-chamber-dot ${cls}"></div>`;
    }).join('');
  }

  function showTurn() {
    if (gameOver) return;
    const player    = order[currentTurn % order.length];
    const remaining = CHAMBERS - currentChamber;
    const pct       = Math.round(100 / remaining);

    if (turnLbl)  turnLbl.textContent  = 'Le toca a…';
    if (playerEl) playerEl.textContent = player.name.toUpperCase();
    if (oddsEl)   oddsEl.textContent   = `Probabilidad de caer: ${pct}% (1 de ${remaining})`;
    if (resultEl) { resultEl.style.display = 'none'; resultEl.className = 'russian-result'; resultEl.textContent = ''; }
    triggerBtn.style.display = '';
    closeBtn.style.display   = 'none';

    renderChambers();
    if (prefs.sound) playBuildUp(currentChamber / CHAMBERS);
    if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([10, 50, 10]);
  }

  function pullTrigger() {
    if (gameOver) return;
    triggerBtn.style.display = 'none';

    // Animar tambor
    if (gunSvg) {
      gunSvg.classList.add('spinning');
      setTimeout(() => gunSvg.classList.remove('spinning'), 400);
    }

    setTimeout(() => {
      const isBullet = currentChamber === bulletPos;

      // Mostrar flash del cañón siempre (CLIC o BANG)
      const muzzle = document.getElementById('russian-muzzle-flash');
      if (muzzle) {
        muzzle.style.display = 'block';
        muzzle.style.animation = 'none';
        requestAnimationFrame(() => {
          muzzle.style.animation = 'muzzleFlash 200ms ease-out forwards';
        });
        setTimeout(() => { muzzle.style.display = 'none'; }, 250);
      }
      // Retroceso del revólver
      if (gunSvg) {
        gunSvg.classList.remove('spinning');
        gunSvg.classList.add('firing');
        setTimeout(() => gunSvg.classList.remove('firing'), 450);
      }

      if (isBullet) {
        gameOver = true;
        const player = order[currentTurn % order.length];

        if (prefs.flash) triggerImpactFlash();
        triggerScreenShake();
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([60,30,120,50,200,50,400]);

        overlay.style.background = 'rgba(140,0,0,0.98)';
        setTimeout(() => { overlay.style.background = ''; }, 900);

        if (turnLbl)  turnLbl.textContent               = '¡CONDENADO!';
        if (playerEl) {
          playerEl.textContent  = player.name.toUpperCase();
          playerEl.style.color  = 'var(--color-impact)';
          playerEl.style.textShadow = '0 0 30px var(--color-impact)';
        }
        if (oddsEl)   oddsEl.textContent = '';

        const dots = chambersEl?.querySelectorAll('.russian-chamber-dot');
        if (dots?.[currentChamber]) {
          dots[currentChamber].classList.remove('active');
          dots[currentChamber].classList.add('bullet');
        }

        if (resultEl) {
          resultEl.style.display = '';
          resultEl.className     = 'russian-result bang';
          resultEl.textContent   = 'BANG';
        }

        if (prefs.particles) spawnParticles('#ff0020');
        if (prefs.sound) playWinnerFanfare();

        closeBtn.style.display = '';

        state.recordChosen(player.id);
        state.recordHistory(player.id, player.name, state.getKey('question'), 'russian');
        persistStats();

      } else {
        // CLIC — sobrevive
        if (resultEl) {
          resultEl.style.display = '';
          resultEl.className     = 'russian-result click';
          resultEl.textContent   = 'CLIC';
        }

        const dots = chambersEl?.querySelectorAll('.russian-chamber-dot');
        if (dots?.[currentChamber]) {
          dots[currentChamber].classList.remove('active');
          dots[currentChamber].classList.add('fired');
        }

        if (prefs.sound) playScanTick();
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate(15);

        currentChamber++;
        currentTurn++;

        if (currentChamber >= CHAMBERS) {
          gameOver = true;
          if (turnLbl)  turnLbl.textContent = 'Nadie cayó esta vez...';
          closeBtn.style.display = '';
        } else {
          setTimeout(showTurn, 1300);
        }
      }
    }, 480);
  }

  function closeRussian() {
    ac.abort();
    overlay.style.display = 'none';
    if (playerEl) { playerEl.style.color = ''; playerEl.style.textShadow = ''; }
    state.set({ phase: 'idle', winnerId: null });
    updateSortButton();
  }

  triggerBtn.addEventListener('click', pullTrigger,  { signal: ac.signal });
  closeBtn.addEventListener(  'click', closeRussian, { signal: ac.signal });

  setTimeout(showTurn, 800);
}

// ══════════════════════════════════════════════════════════
// TORNEO — 3 sub-modos: Bracket, Rondas, Auto
// ══════════════════════════════════════════════════════════

let _tournamentSubMode = 'bracket'; // 'bracket' | 'rounds' | 'auto'

/** Genera un bracket de eliminación directa.
 *  Rellena con "bye" si el número de participantes no es potencia de 2. */
function buildBracket(participants) {
  // Mezclar aleatoriamente
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Redondear al siguiente potencia de 2
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(shuffled.length, 2))));
  const padded = [...shuffled];
  while (padded.length < size) padded.push(null); // null = bye

  // Generar rondas
  const rounds = [];
  let current = padded.map(p => p ? { id: p.id, name: p.name } : null);

  while (current.length > 1) {
    const matches = [];
    for (let i = 0; i < current.length; i += 2) {
      matches.push({ p1: current[i], p2: current[i+1], winner: null });
    }
    rounds.push(matches);
    // Next round slots (TBD)
    current = matches.map(() => null);
  }

  return rounds;
}

/** Sortea un duelo y devuelve el ganador */
function sortDuel(p1, p2) {
  if (!p1) return p2;
  if (!p2) return p1;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % 2 === 0 ? p1 : p2;
}

/** Encuentra el siguiente match pendiente en el bracket */
function findNextMatch(rounds) {
  for (let r = 0; r < rounds.length; r++) {
    for (let m = 0; m < rounds[r].length; m++) {
      const match = rounds[r][m];
      if (match.winner === null && match.p1 !== null && match.p2 !== null) {
        return { r, m };
      }
      // Auto-resolve byes
      if (match.winner === null && (match.p1 === null || match.p2 === null)) {
        match.winner = match.p1 ?? match.p2;
        if (r + 1 < rounds.length) {
          const nextMatchIdx = Math.floor(m / 2);
          const slot = m % 2 === 0 ? 'p1' : 'p2';
          rounds[r + 1][nextMatchIdx][slot] = match.winner;
        }
      }
    }
  }
  return null;
}

/** Nombre de ronda */
function roundName(rounds, r) {
  const total = rounds.length;
  if (r === total - 1) return 'FINAL';
  if (r === total - 2) return 'SEMIFINAL';
  if (r === total - 3) return 'CUARTOS';
  return `RONDA ${r + 1}`;
}

/** Lanza el overlay de torneo */
function launchTournament(participants) {
  const overlay = document.getElementById('tournament-overlay');
  if (!overlay) return;

  const subMode = _tournamentSubMode;
  state.set({ phase: 'spinning' });

  // Construir bracket
  const rounds = buildBracket(participants);

  // Reset overlay
  overlay.style.display = 'flex';
  document.getElementById('tournament-champion').style.display = 'none';

  // Mostrar sub-vista
  ['bracket','rounds','auto'].forEach(v => {
    const el = document.getElementById(`tournament-${v}-view`);
    if (el) el.style.display = v === subMode ? 'flex' : 'none';
  });

  // Título y exit
  const titleEl = document.getElementById('tournament-title');
  if (titleEl) titleEl.textContent = subMode === 'bracket' ? 'BRACKET' : subMode === 'rounds' ? 'TORNEO' : 'TORNEO AUTO';

  const exitBtn = document.getElementById('tournament-exit');
  const ac = new AbortController();
  exitBtn?.addEventListener('click', () => {
    ac.abort();
    overlay.style.display = 'none';
    state.set({ phase: 'idle', winnerId: null });
    updateSortButton();
  }, { signal: ac.signal });

  // Cerrar campeón
  document.getElementById('tournament-close-champion')?.addEventListener('click', () => {
    ac.abort();
    overlay.style.display = 'none';
    state.set({ phase: 'idle', winnerId: null });
    updateSortButton();
  }, { signal: ac.signal });

  if (subMode === 'bracket')  initBracketView(rounds, ac);
  if (subMode === 'rounds')   initRoundsView(rounds, ac, participants);
  if (subMode === 'auto')     initAutoView(rounds, ac);
}

/** Renderiza el bracket visual */
function renderBracketHTML(rounds) {
  const bracketEl = document.getElementById('tournament-bracket');
  if (!bracketEl) return;

  bracketEl.innerHTML = rounds.map((matches, r) => `
    <div class="bracket-round">
      <div class="bracket-round-title">${roundName(rounds, r)}</div>
      ${matches.map(match => `
        <div class="bracket-match ${match.winner ? 'done' : (match.p1 && match.p2 ? 'active' : '')}">
          ${[match.p1, match.p2].map(p => {
            if (!p) return `<div class="bracket-slot"><span class="bracket-slot-tbd">BYE</span></div>`;
            const c = getAvatarColorsByName(p.name);
            const isWinner = match.winner?.id === p.id;
            const isLoser  = match.winner && match.winner.id !== p.id;
            return `<div class="bracket-slot ${isWinner ? 'winner' : isLoser ? 'loser' : ''}">
              <div class="bracket-slot-avatar" style="background:${c.gradient};">${escapeHtml(getInitials(p.name))}</div>
              <span class="bracket-slot-name">${escapeHtml(p.name)}</span>
              ${isWinner ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-left:auto;flex-shrink:0;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>' : ''}
            </div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
  `).join('');
}

function initBracketView(rounds, ac) {
  renderBracketHTML(rounds);

  const nextBtn  = document.getElementById('tournament-next-match');
  const roundLbl = document.getElementById('tournament-round-label');
  let _animating = false;

  function updateNextBtn() {
    const next = findNextMatch(rounds);
    if (next) {
      const { r, m } = next;
      const match = rounds[r][m];
      if (nextBtn) {
        nextBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> ${match.p1.name} vs ${match.p2.name}`;
        nextBtn.style.display = '';
      }
      if (roundLbl) roundLbl.textContent = roundName(rounds, r);
    } else {
      if (nextBtn) nextBtn.style.display = 'none';
    }
  }

  updateNextBtn();

  nextBtn?.addEventListener('click', () => {
    if (_animating) return;
    const next = findNextMatch(rounds);
    if (!next) return;
    _animating = true;

    const { r, m } = next;
    const match = rounds[r][m];
    match.winner = sortDuel(match.p1, match.p2);

    // Propagar al siguiente round
    if (r + 1 < rounds.length) {
      const nextMatchIdx = Math.floor(m / 2);
      const slot = m % 2 === 0 ? 'p1' : 'p2';
      rounds[r + 1][nextMatchIdx][slot] = match.winner;
    }

    if (prefs.sound) playWinnerFanfare();
    if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([20, 10, 60]);

    // ── Animación: marcar ganador/perdedor ANTES de rerenderizar ──
    // Encontrar los slots actuales en el DOM
    const bracketEl = document.getElementById('tournament-bracket');
    const allMatches = bracketEl?.querySelectorAll('.bracket-match');
    let matchElIdx = 0;
    for (let ri = 0; ri < r; ri++) matchElIdx += rounds[ri].length;
    matchElIdx += m;

    const matchEl = allMatches?.[matchElIdx];
    if (matchEl) {
      const slots = matchEl.querySelectorAll('.bracket-slot');
      // Identificar cuál es ganador y cuál perdedor por posición
      const winnerIsP1 = match.winner.id === match.p1.id;
      const winnerSlot = slots[winnerIsP1 ? 0 : 1];
      const loserSlot  = slots[winnerIsP1 ? 1 : 0];

      // Flash del ganador
      if (winnerSlot) {
        winnerSlot.style.transition = 'background 300ms ease, color 300ms ease';
        winnerSlot.style.background = 'rgba(0,245,255,0.15)';
        winnerSlot.style.color      = 'var(--color-accent)';
      }
      if (loserSlot) {
        loserSlot.style.transition = 'opacity 300ms ease';
        loserSlot.style.opacity    = '0.35';
      }

      // Tras 600ms: si hay siguiente ronda, animar la burbuja viajando
      setTimeout(() => {
        if (r + 1 < rounds.length) {
          // Obtener posición destino (slot en siguiente ronda)
          const nextMatchGlobalIdx = matchElIdx - m + Math.floor(m / 2) + rounds[r].length;
          const destMatchEl = allMatches?.[nextMatchGlobalIdx];

          if (winnerSlot && destMatchEl) {
            const srcRect  = winnerSlot.getBoundingClientRect();
            const destRect = destMatchEl.getBoundingClientRect();

            // Crear burbuja flotante
            const bubble = document.createElement('div');
            const c = getAvatarColorsByName(match.winner.name);
            bubble.style.cssText = `
              position:fixed;
              left:${srcRect.left + srcRect.width/2 - 14}px;
              top:${srcRect.top + srcRect.height/2 - 14}px;
              width:28px;height:28px;border-radius:50%;
              background:${c.gradient};
              display:flex;align-items:center;justify-content:center;
              font-family:var(--font-display);font-size:0.6rem;color:white;
              z-index:9999;pointer-events:none;
              box-shadow:0 0 12px ${c.color};
              transition:left 500ms cubic-bezier(0.34,1.2,0.64,1),
                         top  500ms cubic-bezier(0.34,1.2,0.64,1),
                         transform 500ms cubic-bezier(0.34,1.2,0.64,1);
            `;
            bubble.textContent = getInitials(match.winner.name);
            document.body.appendChild(bubble);

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                bubble.style.left = `${destRect.left + destRect.width/2 - 14}px`;
                bubble.style.top  = `${destRect.top  + destRect.height/2 - 14}px`;
                bubble.style.transform = 'scale(1.3)';
              });
            });

            setTimeout(() => {
              bubble.remove();
              renderBracketHTML(rounds);
              updateNextBtn();
              _animating = false;
              const lastRound = rounds[rounds.length - 1];
              if (lastRound[0].winner) setTimeout(() => showChampion(lastRound[0].winner), 400);
            }, 600);
          } else {
            setTimeout(() => {
              renderBracketHTML(rounds);
              updateNextBtn();
              _animating = false;
            }, 400);
          }
        } else {
          renderBracketHTML(rounds);
          updateNextBtn();
          _animating = false;
          const lastRound = rounds[rounds.length - 1];
          if (lastRound[0].winner) setTimeout(() => showChampion(lastRound[0].winner), 400);
        }
      }, 650);
    } else {
      renderBracketHTML(rounds);
      updateNextBtn();
      _animating = false;
    }
  }, { signal: ac.signal });
}

function initRoundsView(rounds, ac, participants) {
  let currentRoundIdx = 0;
  let currentMatchIdx = 0;
  let _spinning = false;

  const p1El    = document.getElementById('tournament-p1');
  const p2El    = document.getElementById('tournament-p2');
  const infoEl  = document.getElementById('tournament-match-info');
  const spinBtn = document.getElementById('tournament-spin-duel');
  const roundLbl = document.getElementById('tournament-round-label');
  const arenaEl = document.getElementById('tournament-vs-arena');

  function renderContender(el, player, delay = 0) {
    if (!el || !player) return;
    const c = getAvatarColorsByName(player.name);
    el.innerHTML = `
      <div class="tournament-contender-avatar" style="background:${c.gradient};animation-delay:${delay}ms;">
        ${escapeHtml(getInitials(player.name))}
      </div>
      <div class="tournament-contender-name" style="animation-delay:${delay + 80}ms;">${escapeHtml(player.name)}</div>`;
  }

  function showCurrentMatch(animated = false) {
    findNextMatch(rounds);

    let found = false;
    for (let r = 0; r < rounds.length; r++) {
      for (let m = 0; m < rounds[r].length; m++) {
        if (rounds[r][m].winner === null && rounds[r][m].p1 && rounds[r][m].p2) {
          currentRoundIdx = r;
          currentMatchIdx = m;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      const champion = rounds[rounds.length-1][0].winner;
      if (champion) showChampion(champion);
      return;
    }

    const match = rounds[currentRoundIdx][currentMatchIdx];
    const total = rounds[currentRoundIdx].length;
    const done  = rounds[currentRoundIdx].filter(mm => mm.winner).length;

    if (animated) {
      // Entrada dramática — avatares entran desde los lados
      if (p1El) p1El.style.animation = 'none';
      if (p2El) p2El.style.animation = 'none';
      if (arenaEl) arenaEl.style.opacity = '0';

      setTimeout(() => {
        renderContender(p1El, match.p1, 0);
        renderContender(p2El, match.p2, 100);
        if (arenaEl) {
          arenaEl.style.transition = 'opacity 300ms ease';
          arenaEl.style.opacity = '1';
        }
      }, 200);
    } else {
      renderContender(p1El, match.p1, 0);
      renderContender(p2El, match.p2, 100);
    }

    if (infoEl)   infoEl.textContent = `${roundName(rounds, currentRoundIdx)} · Duelo ${done + 1} de ${total}`;
    if (roundLbl) roundLbl.textContent = roundName(rounds, currentRoundIdx);
    if (spinBtn) {
      spinBtn.style.display = '';
      spinBtn.disabled = false;
      spinBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> SORTEAR DUELO';
    }

    // Reset visual
    setTimeout(() => {
      [p1El, p2El].forEach(el => {
        const av = el?.querySelector('.tournament-contender-avatar');
        const nm = el?.querySelector('.tournament-contender-name');
        if (av) { av.classList.remove('winner-glow','loser-fade'); av.style.transform = ''; }
        if (nm) nm.style.color = '';
      });
    }, 50);
  }

  showCurrentMatch(false);

  spinBtn?.addEventListener('click', () => {
    if (_spinning) return;
    const match = rounds[currentRoundIdx][currentMatchIdx];
    if (match.winner) return;
    _spinning = true;
    spinBtn.disabled = true;

    // ── Countdown dramático 3-2-1 sobre la arena ──
    const vsBadge = document.querySelector('.tournament-vs-badge');

    let count = 3;
    if (vsBadge) {
      vsBadge.style.transition = 'none';
      vsBadge.style.fontSize   = '3rem';
    }

    const countInterval = setInterval(() => {
      if (vsBadge) {
        vsBadge.textContent = String(count);
        vsBadge.style.animation = 'none';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            vsBadge.style.animation = 'winnerSpring 300ms cubic-bezier(0.34,1.56,0.64,1) both';
          });
        });
        if (prefs.sound) playScanTick();
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate(20);
      }
      count--;
      if (count < 0) {
        clearInterval(countInterval);

        // ── REVELAR ──
        match.winner = sortDuel(match.p1, match.p2);

        if (currentRoundIdx + 1 < rounds.length) {
          const nextMatchIdx = Math.floor(currentMatchIdx / 2);
          const slot = currentMatchIdx % 2 === 0 ? 'p1' : 'p2';
          rounds[currentRoundIdx + 1][nextMatchIdx][slot] = match.winner;
        }

        // Restaurar VS
        if (vsBadge) {
          vsBadge.textContent = 'VS';
          vsBadge.style.fontSize = '';
          vsBadge.style.animation = '';
        }

        // Animar ganador/perdedor
        const av1 = p1El?.querySelector('.tournament-contender-avatar');
        const av2 = p2El?.querySelector('.tournament-contender-avatar');
        const nm1 = p1El?.querySelector('.tournament-contender-name');
        const nm2 = p2El?.querySelector('.tournament-contender-name');

        const winP1 = match.winner.id === match.p1.id;
        if (av1 && av2) {
          (winP1 ? av1 : av2).classList.add('winner-glow');
          (winP1 ? av2 : av1).classList.add('loser-fade');
        }
        if (nm1) nm1.style.color = winP1 ? 'var(--color-accent)' : 'var(--color-text-dim)';
        if (nm2) nm2.style.color = !winP1 ? 'var(--color-accent)' : 'var(--color-text-dim)';

        if (prefs.flash) triggerImpactFlash();
        if (prefs.sound) playWinnerFanfare();
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([40, 20, 80]);
        if (prefs.particles) spawnParticles(getAvatarColorsByName(match.winner.name).color);

        // Mostrar nombre del ganador en el botón
        if (spinBtn) {
          spinBtn.style.display = '';
          spinBtn.disabled = false;
          spinBtn.innerHTML = `${escapeHtml(match.winner.name)} avanza →`;
        }

        setTimeout(() => {
          _spinning = false;
          const lastRound = rounds[rounds.length-1];
          if (lastRound[0].winner) {
            showChampion(lastRound[0].winner);
          } else {
            showCurrentMatch(true); // entrada animada para el siguiente duelo
          }
        }, 1600);
      }
    }, 700);
  }, { signal: ac.signal });
}

function initAutoView(rounds, ac) {
  const progressEl = document.getElementById('tournament-auto-progress');
  const startBtn   = document.getElementById('tournament-auto-start');
  const roundLbl   = document.getElementById('tournament-round-label');

  if (progressEl) progressEl.innerHTML = '';

  startBtn?.addEventListener('click', async () => {
    startBtn.style.display = 'none';

    for (let r = 0; r < rounds.length; r++) {
      if (roundLbl) roundLbl.textContent = roundName(rounds, r);

      for (let m = 0; m < rounds[r].length; m++) {
        findNextMatch(rounds); // resolve byes
        const match = rounds[r][m];
        if (match.winner) continue;

        await new Promise(res => setTimeout(res, 350));
        match.winner = sortDuel(match.p1, match.p2);

        if (r + 1 < rounds.length) {
          const nextMatchIdx = Math.floor(m / 2);
          const slot = m % 2 === 0 ? 'p1' : 'p2';
          rounds[r + 1][nextMatchIdx][slot] = match.winner;
        }

        if (prefs.sound) playScanTick();
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate(10);

        // Añadir resultado a la lista
        if (progressEl && match.p1 && match.p2) {
          const item = document.createElement('div');
          item.className = 'auto-result-item';
          const c = getAvatarColorsByName(match.winner.name);
          item.style.animationDelay = '0ms';
          item.innerHTML = `
            <span class="auto-result-round">${roundName(rounds, r)}</span>
            <div class="bracket-slot-avatar" style="background:${c.gradient};width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:0.55rem;color:white;flex-shrink:0;">${escapeHtml(getInitials(match.winner.name))}</div>
            <span class="auto-result-winner">${escapeHtml(match.winner.name)}</span>
            <span style="color:var(--color-text-dim);font-size:0.7rem;margin-left:auto;">vs</span>
            <span class="auto-result-loser">${escapeHtml(match.winner.id === match.p1.id ? match.p2.name : match.p1.name)}</span>`;
          progressEl.appendChild(item);
          progressEl.scrollTop = progressEl.scrollHeight;
        }
      }
    }

    // Campeón
    const champion = rounds[rounds.length-1][0].winner;
    if (champion) {
      if (prefs.particles) spawnParticles('#FFD700');
      if (prefs.sound) playWinnerFanfare();
      await new Promise(res => setTimeout(res, 800));
      showChampion(champion);
    }
  }, { signal: ac.signal, once: true });
}

function showChampion(player) {
  const championEl = document.getElementById('tournament-champion');
  if (!championEl) return;

  // Ocultar vistas
  ['bracket','rounds','auto'].forEach(v => {
    const el = document.getElementById(`tournament-${v}-view`);
    if (el) el.style.display = 'none';
  });

  const c = getAvatarColorsByName(player.name);
  const avatarEl = document.getElementById('tournament-champion-avatar');
  const nameEl   = document.getElementById('tournament-champion-name');
  const labelEl  = document.getElementById('tournament-champion-label');
  // Texto neutro basado en la pregunta — no celebra el perder
  const q = (state.getKey('question') || '').trim().toLowerCase();
  const label = q.includes('pag') || q.includes('cuenta') ? 'EL ELEGIDO' :
                q.includes('hace') || q.includes('task') || q.includes('tarea') ? 'EL CONDENADO' :
                q.includes('jueg') || q.includes('gana') ? 'EL GANADOR' : 'EL ELEGIDO DEL TORNEO';
  if (labelEl) labelEl.textContent = label;

  if (avatarEl) {
    avatarEl.style.background = c.gradient;
    avatarEl.textContent      = getInitials(player.name);
  }
  if (nameEl) nameEl.textContent = player.name.toUpperCase();

  championEl.style.display = 'flex';

  if (prefs.particles) {
    spawnParticles('#FFD700');
    setTimeout(() => spawnParticles(c.color), 300);
  }
  if (prefs.flash) triggerImpactFlash();
  if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([80,40,160,40,320]);

  // Registrar en stats
  state.recordChosen(player.id);
  state.recordHistory(player.id, player.name, state.getKey('question'), 'tournament');
  persistStats();
}

// ══════════════════════════════════════════════════════════
// MODO CARA O CRUZ
// ══════════════════════════════════════════════════════════
function launchCoinFlip(participants) {
  let p1, p2;
  if(participants.length >= 2){
    const a=Math.floor(Math.random()*participants.length);
    let b; do{ b=Math.floor(Math.random()*participants.length); }while(b===a);
    p1=participants[a]; p2=participants[b];
    if(participants.length>2) showToast(p1.name+' vs '+p2.name);
  } else { showToast('Necesitas al menos 2 participantes'); return; }

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

  const S=Math.min(W,H)/480, cx=W/2, cy=H*0.42;
  const gold='#FFD700', goldDim='#B8860B';
  const c1=getAvatarColorsByName(p1.name), c2=getAvatarColorsByName(p2.name);
  const winnerIdx=Math.random()<0.5?0:1;
  const winner=winnerIdx===0?p1:p2;
  const wc=winnerIdx===0?c1:c2;

  const SPIN_DUR=2800;
  let t=0, rafId, totalFlips=0;
  const trailPoints=[];
  const sparksPop=[];

  // La moneda se dibuja como una ELIPSE aplanada cuando está de perfil
  // pero el truco es: en lugar de scale(), dibujamos una elipse con radiusX variable
  function drawCoin(centerX, centerY, R, flipAngle, col, alpha) {
    ctx.save(); ctx.globalAlpha=alpha;

    // scaleX va de -1 a 1 según el ángulo → rx = R*|cos(angle)|
    const cosA = Math.cos(flipAngle);
    const rx = Math.max(R*0.04, R*Math.abs(cosA)); // mínimo 4% para no desaparecer
    const ry = R;
    const showFace = cosA >= 0; // frente = cara, dorso = cruz
    const faceCol = showFace ? c1 : c2;

    // Sombra dinámica en el suelo
    const shadowRx = rx*0.7, shadowRy = R*0.12;
    ctx.beginPath(); ctx.ellipse(centerX, centerY+R+5*S, shadowRx, shadowRy, 0, 0, Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fill();

    // Canto de la moneda (visible cuando está de perfil)
    if(Math.abs(cosA) < 0.25) {
      ctx.beginPath(); ctx.ellipse(centerX, centerY, R*0.06+2*S, ry, 0, 0, Math.PI*2);
      ctx.fillStyle=goldDim; ctx.fill();
    }

    // Cara principal — elipse correcta
    ctx.beginPath(); ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI*2);
    ctx.fillStyle=faceCol.gradient||faceCol.color; ctx.fill();

    // Borde dorado grueso
    ctx.strokeStyle=gold; ctx.lineWidth=5*S; ctx.stroke();

    // Borde interior dorado fino
    ctx.beginPath(); ctx.ellipse(centerX, centerY, Math.max(rx-9*S, 1), ry-9*S, 0, 0, Math.PI*2);
    ctx.strokeStyle='rgba(255,215,0,0.45)'; ctx.lineWidth=1.5*S; ctx.stroke();

    // Highlight superior (solo cuando hay superficie suficiente)
    if(rx > R*0.3) {
      const hlRx=rx*0.55, hlRy=ry*0.45;
      const hlX=centerX-rx*0.18, hlY=centerY-ry*0.22;
      ctx.beginPath(); ctx.ellipse(hlX, hlY, hlRx, hlRy, 0, 0, Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.13)'; ctx.fill();
    }

    // Texto en la moneda (solo cuando es visible)
    if(rx > R*0.25) {
      const textAlpha=Math.min((rx/R-0.25)/0.35, 1);
      ctx.globalAlpha=alpha*textAlpha;
      ctx.fillStyle='rgba(255,255,255,0.92)';
      ctx.font=`bold ${Math.round(10*S)}px sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(showFace?'CARA':'CRUZ', centerX, centerY-ry*0.38);
      ctx.font=`bold ${Math.round(20*S)}px sans-serif`;
      ctx.fillText(getInitials(showFace?p1.name:p2.name), centerX, centerY+ry*0.15);
    }

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    const p=Math.min(t/SPIN_DUR,1);

    // Velocidad angular: sube en 0→0.12, pico 0.12→0.72, frena 0.72→1
    let angVel;
    if(p<0.12)      angVel = (p/0.12)*0.28;
    else if(p<0.72) angVel = 0.28;
    else            angVel = 0.28*Math.pow(1-(p-0.72)/0.28, 2);

    totalFlips += angVel;

    // Cara actual durante el giro
    const flipsInt = Math.floor(totalFlips/Math.PI);
    const showFaceNow = flipsInt%2===0;

    // Lanzamiento parabólico en la primera fase
    const arcOffset = p<0.14 ? -Math.sin(p/0.14*Math.PI)*48*S : 0;
    const coinY = cy + arcOffset;

    // ── Participantes a los lados ──
    const sideAlpha = p<0.88 ? Math.min(p*5,1) : Math.max(0,(1-p)/0.12);
    if(sideAlpha>0.01) {
      [[cx-105*S, p1, c1, 'CARA'],[cx+105*S, p2, c2, 'CRUZ']].forEach(([px,pp,pc,label])=>{
        ctx.save(); ctx.globalAlpha=sideAlpha;
        ctx.beginPath(); ctx.arc(px, cy, 26*S, 0, Math.PI*2);
        ctx.fillStyle=pc.color+'22'; ctx.fill();
        ctx.beginPath(); ctx.arc(px, cy, 20*S, 0, Math.PI*2);
        ctx.fillStyle=pc.gradient||pc.color; ctx.fill();
        ctx.font=`bold ${Math.round(10*S)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='#fff'; ctx.fillText(getInitials(pp.name), px, cy);
        ctx.font=`${Math.round(10*S)}px sans-serif`; ctx.textBaseline='alphabetic'; ctx.fillStyle=pc.color;
        ctx.fillText(pp.name.length>7?pp.name.slice(0,6)+'…':pp.name, px, cy+32*S);
        ctx.font=`bold ${Math.round(9*S)}px sans-serif`; ctx.fillStyle='rgba(255,255,255,0.4)';
        ctx.fillText(label, px, cy+44*S);
        ctx.restore();
      });
    }

    // Partículas de lanzamiento
    if(p>0.1&&p<0.16&&sparksPop.length===0) {
      for(let i=0;i<10;i++){
        const a=Math.random()*Math.PI*2, spd=(1+Math.random()*3)*S;
        sparksPop.push({x:cx,y:cy+68*S,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2*S,alpha:0.7,color:gold});
      }
    }
    sparksPop.forEach(s=>{
      s.x+=s.vx; s.y+=s.vy; s.vy+=0.1*S; s.alpha-=0.04;
      if(s.alpha<=0) return;
      ctx.beginPath(); ctx.arc(s.x,s.y,2*S*s.alpha,0,Math.PI*2);
      ctx.fillStyle=s.color; ctx.globalAlpha=s.alpha; ctx.fill();
    });
    ctx.globalAlpha=1;

    // Estela de movimiento (trail)
    if(p>0.05&&p<0.75) {
      trailPoints.push({x:cx, y:coinY, a:Math.abs(Math.cos(totalFlips)), t:Date.now()});
      if(trailPoints.length>6) trailPoints.shift();
      trailPoints.forEach((pt,i)=>{
        const ta=(i/trailPoints.length)*0.12;
        ctx.beginPath(); ctx.ellipse(pt.x, pt.y, 68*S*pt.a*0.4, 68*S*0.4, 0, 0, Math.PI*2);
        ctx.fillStyle=`rgba(255,215,0,${ta})`; ctx.fill();
      });
    }

    // La moneda — en la fase final se fija en la cara ganadora
    const finalAngle = winnerIdx===0 ? 0 : Math.PI; // 0=cara frente, PI=cruz frente
    const drawAngle  = p>0.9 ? finalAngle : totalFlips;
    const R=70*S;
    drawCoin(cx, coinY, R, drawAngle, null, 1);

    // ── REVEAL FINAL ──
    if(p>0.88) {
      const rp=Math.min((p-0.88)/0.12,1), pulse=0.82+0.18*Math.sin(t*0.035);
      ctx.font=`bold ${Math.round(32*S*rp*pulse)}px sans-serif`;
      ctx.textAlign='center'; ctx.fillStyle=wc.color; ctx.globalAlpha=rp;
      ctx.fillText(winner.name.toUpperCase(), cx, cy+R+50*S);
      ctx.font=`${Math.round(12*S)}px sans-serif`;
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.globalAlpha=rp;
      ctx.fillText(winnerIdx===0?'CARA':'CRUZ', cx, cy+R+66*S);
      ctx.globalAlpha=1;
    }

    t+=16;
    if(t<SPIN_DUR+700){ rafId=requestAnimationFrame(draw); }
    else{
      overlay.style.transition='opacity 220ms ease'; overlay.style.opacity='0';
      setTimeout(()=>{
        overlay.remove();
        state.set({winnerId:winner.id,phase:'revealing'});
        state.recordChosen(winner.id);
        state.recordHistory(winner.id,winner.name,state.getKey('question'),'coin');
        persistStats();
        if(prefs.particles) spawnParticles(wc.color);
        showResult(winner.id);
      },280);
    }
  }
  if(prefs.sound) playWinnerFanfare();
  rafId=requestAnimationFrame(draw);
}
// ══════════════════════════════════════════════════════════
// MODO DADO
// ══════════════════════════════════════════════════════════
function launchDice(participants) {
  state.set({phase:'spinning'});
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9998;background:rgba(4,2,14,0.97);display:flex;align-items:center;justify-content:center;animation:overlayFadeIn 250ms ease both;';
  document.body.appendChild(overlay);
  const W=Math.min(window.innerWidth,480),H=Math.min(window.innerHeight,680);
  const DPR=Math.min(window.devicePixelRatio||1,2);
  const canvas=document.createElement('canvas');
  canvas.width=W*DPR; canvas.height=H*DPR;
  canvas.style.cssText='width:'+W+'px;height:'+H+'px;';
  const ctx=canvas.getContext('2d'); ctx.scale(DPR,DPR);
  overlay.appendChild(canvas);

  const S=Math.min(W,H)/480, cx=W/2, cy=H*0.38;
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
  const primary=getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()||'#7B2FBE';

  const n=participants.length;
  const finalNum=Math.floor(Math.random()*n)+1;
  const winner=participants[finalNum-1];
  const ROLL_DUR=2400;
  let t=0, rafId;

  // Patrones de puntos
  const dotPatterns={
    1:[[0,0]],
    2:[[-1,-1],[1,1]],
    3:[[-1,-1],[0,0],[1,1]],
    4:[[-1,-1],[1,-1],[-1,1],[1,1]],
    5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],
    6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]],
  };

  // Tabla de participantes (lateral)
  function drawParticipantTable(alpha) {
    if(alpha<=0) return;
    const tW=120*S, tH=Math.min(n,6)*26*S+16*S;
    const tX=cx+80*S, tY=cy-tH/2;
    ctx.save(); ctx.globalAlpha=alpha;
    // Fondo tabla
    ctx.fillStyle='rgba(20,10,40,0.9)';
    if(ctx.roundRect) { ctx.beginPath(); ctx.roundRect(tX,tY,tW,tH,8*S); ctx.fill(); }
    else ctx.fillRect(tX,tY,tW,tH);
    ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1*S;
    if(ctx.roundRect) { ctx.beginPath(); ctx.roundRect(tX,tY,tW,tH,8*S); ctx.stroke(); }
    else ctx.strokeRect(tX,tY,tW,tH);
    // Filas
    participants.slice(0,6).forEach((p,i)=>{
      const rowY=tY+8*S+i*26*S;
      const pc=getAvatarColorsByName(p.name);
      // Número
      ctx.font=`bold ${Math.round(11*S)}px sans-serif`; ctx.textAlign='left';
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillText((i+1)+'.',tX+8*S,rowY+14*S);
      // Avatar mini
      ctx.beginPath(); ctx.arc(tX+30*S,rowY+10*S,8*S,0,Math.PI*2);
      ctx.fillStyle=pc.gradient||pc.color; ctx.fill();
      ctx.font=`bold ${Math.round(7*S)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#fff'; ctx.fillText(getInitials(p.name),tX+30*S,rowY+10*S);
      // Nombre
      ctx.font=`${Math.round(10*S)}px sans-serif`; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      ctx.fillStyle=pc.color;
      const pName=p.name.length>8?p.name.slice(0,7)+'…':p.name;
      ctx.fillText(pName,tX+42*S,rowY+15*S);
    });
    ctx.restore();
  }

  // Copa/taza del dado (cubilete)
  function drawCup(x, y, open, alpha) {
    if(alpha<=0) return;
    ctx.save(); ctx.globalAlpha=alpha;
    const cW=56*S, cH=70*S;
    // Sombra
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x,y+cH/2+4*S,cW*0.55,8*S,0,0,Math.PI*2); ctx.fill();
    // Cuerpo del cubilete (trapezoide)
    ctx.fillStyle='#1a0a30';
    ctx.beginPath();
    ctx.moveTo(x-cW/2*0.7, y-cH/2); // top-left (más estrecho)
    ctx.lineTo(x+cW/2*0.7, y-cH/2); // top-right
    ctx.lineTo(x+cW/2, y+cH/2);     // bottom-right
    ctx.lineTo(x-cW/2, y+cH/2);     // bottom-left
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle=accent; ctx.lineWidth=3*S; ctx.stroke();
    // Highlight lateral
    ctx.fillStyle='rgba(0,245,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(x-cW/2*0.7, y-cH/2);
    ctx.lineTo(x-cW/2*0.5, y-cH/2);
    ctx.lineTo(x-cW/2*0.7, y+cH/2);
    ctx.lineTo(x-cW/2, y+cH/2);
    ctx.closePath(); ctx.fill();
    // Borde superior
    ctx.fillStyle='#2a1a4e';
    ctx.fillRect(x-cW/2*0.75, y-cH/2-6*S, cW*0.75, 6*S);
    ctx.strokeStyle=accent; ctx.lineWidth=2*S; ctx.strokeRect(x-cW/2*0.75,y-cH/2-6*S,cW*0.75,6*S);
    // Líneas decorativas
    ctx.strokeStyle='rgba(0,245,255,0.2)'; ctx.lineWidth=1*S;
    [-1,0,1].forEach(row=>{
      const ry=y+row*18*S;
      const wFrac=0.7+0.3*(row+1)/2;
      ctx.beginPath(); ctx.moveTo(x-cW/2*wFrac*0.85,ry); ctx.lineTo(x+cW/2*wFrac*0.85,ry); ctx.stroke();
    });
    ctx.restore();
  }

  function drawDie(num, x, y, size, alpha, wobble) {
    const capped=Math.min(Math.max(num,1),6);
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.translate(x+wobble, y);

    // Sombra larga
    ctx.save();
    ctx.scale(1, 0.35); ctx.translate(0, size*0.7);
    ctx.beginPath(); ctx.arc(0,0,size*0.85,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fill(); ctx.restore();

    // Cara inferior (3D)
    ctx.fillStyle='#0d0025';
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(-size/2+3*S,size/2-3*S,size,size*0.18,4*S);ctx.fill();}

    // Cara lateral derecha (3D)
    ctx.fillStyle='#150835';
    ctx.beginPath();
    ctx.moveTo(size/2, -size/2);
    ctx.lineTo(size/2+8*S, -size/2-6*S);
    ctx.lineTo(size/2+8*S, size/2-6*S);
    ctx.lineTo(size/2, size/2);
    ctx.closePath(); ctx.fill();

    // Cara principal
    const grad=ctx.createLinearGradient(-size/2,-size/2,size/2,size/2);
    grad.addColorStop(0,'#1a0840');
    grad.addColorStop(0.5,'#12052e');
    grad.addColorStop(1,'#0a0020');
    ctx.fillStyle=grad;
    ctx.strokeStyle=accent; ctx.lineWidth=3*S;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(-size/2,-size/2,size,size,size*0.15);
    else ctx.rect(-size/2,-size/2,size,size);
    ctx.fill(); ctx.stroke();

    // Highlight superior-izquierdo
    ctx.fillStyle='rgba(0,245,255,0.07)';
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(-size/2,-size/2,size*0.55,size*0.5,size*0.15);
    else ctx.rect(-size/2,-size/2,size*0.55,size*0.5);
    ctx.fill();

    // Brillo borde interno
    ctx.strokeStyle='rgba(0,245,255,0.15)'; ctx.lineWidth=1.5*S;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(-size/2+4*S,-size/2+4*S,size-8*S,size-8*S,size*0.12);
    else ctx.rect(-size/2+4*S,-size/2+4*S,size-8*S,size-8*S);
    ctx.stroke();

    // Puntos
    const dotR=size*0.1, sp=size*0.29;
    (dotPatterns[capped]||dotPatterns[1]).forEach(([dx,dy])=>{
      // Huella del punto (3D)
      ctx.beginPath(); ctx.arc(dx*sp+1.5*S, dy*sp+1.5*S, dotR, 0, Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fill();
      // Punto principal
      const dGrad=ctx.createRadialGradient(dx*sp-dotR*0.3,dy*sp-dotR*0.3,0,dx*sp,dy*sp,dotR);
      dGrad.addColorStop(0,'#ffffff');
      dGrad.addColorStop(0.4,accent);
      dGrad.addColorStop(1,primary);
      ctx.beginPath(); ctx.arc(dx*sp,dy*sp,dotR,0,Math.PI*2);
      ctx.fillStyle=dGrad; ctx.fill();
    });

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    const p=Math.min(t/ROLL_DUR,1);
    const eased=1-Math.pow(1-p,3);

    // Fondo sutil con vignette
    const vg=ctx.createRadialGradient(cx,cy,60*S,cx,cy,W*0.8);
    vg.addColorStop(0,'rgba(0,245,255,0.03)');
    vg.addColorStop(1,'rgba(0,0,0,0.5)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);

    // Tabla de participantes (derecha)
    drawParticipantTable(Math.min(p*4,1)*0.8);

    // Número visible: cambia rápido → frena
    const displayNum=p<0.82?(Math.floor(t*0.22)%Math.min(n,6))+1:finalNum;

    // Fase 1 (0→0.35): cubilete agitándose
    if(p<0.38) {
      const cupAlpha=Math.min(p*5,1)*(p>0.3?(0.38-p)/0.08:1);
      const shake=p<0.3?Math.sin(t*0.25)*(8+p*15)*S:Math.sin(t*0.4)*8*S*(1-(p-0.3)/0.08);
      drawCup(cx, cy+10*S, false, cupAlpha);
      if(p>0.05) {
        // Dados asomándose debajo del cubilete cuando se levanta
        ctx.save(); ctx.globalAlpha=Math.min((p-0.05)/0.08,1)*0.4;
        drawDie(displayNum, cx+shake*0.3, cy+22*S, 28*S, 1, 0);
        ctx.restore();
      }
    }

    // Fase 2 (0.3→0.85): dado rodando
    if(p>0.28) {
      const dp=Math.min((p-0.28)/0.12,1);
      const diceSize=(62+10*Math.abs(Math.sin(t*(0.2*(1-eased)))))*S;
      const bounce=p<0.82?Math.abs(Math.sin(t*(0.16*(1-eased))))*14*S*(1-(p-0.28)/0.54):0;
      const wobble=p<0.82?Math.sin(t*0.18)*(3*(1-eased))*S:0;

      drawDie(displayNum, cx, cy-bounce, diceSize, dp, wobble);

      // Sombra dinámica que crece/disminuye con el bounce
      const shadowAlpha=0.15*(1-bounce/(14*S));
      ctx.save(); ctx.globalAlpha=shadowAlpha*dp;
      ctx.beginPath(); ctx.ellipse(cx+wobble,cy+diceSize/2+4*S,diceSize*0.55*(1+bounce*0.02),diceSize*0.12,0,0,Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fill(); ctx.restore();
    }

    // Número grande debajo
    if(p>0.5){
      const np=Math.min((p-0.5)/0.28,1);
      ctx.font=`bold ${Math.round(48*S*np)}px sans-serif`;
      ctx.textAlign='center';
      // Sombra del número
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillText(displayNum.toString(),cx+2,cy+54*S+2);
      ctx.fillStyle=accent; ctx.globalAlpha=np*0.9;
      ctx.fillText(displayNum.toString(),cx,cy+54*S); ctx.globalAlpha=1;
    }

    // Flash al parar
    if(p>0.84&&p<0.9){
      const fp=(p-0.84)/0.06,fb=fp<0.5?fp*2:2-fp*2;
      ctx.fillStyle=`rgba(0,245,255,${fb*0.14})`; ctx.fillRect(0,0,W,H);
    }

    // Reveal del ganador
    if(p>0.88){
      const rp=Math.min((p-0.88)/0.12,1);
      const wc=getAvatarColorsByName(winner.name);
      const pulse=0.85+0.15*Math.sin(t*0.03);

      // Resaltar fila del ganador en la tabla
      const rowIdx=finalNum-1;
      if(rowIdx<6){
        const tX=cx+80*S, tY=cy-Math.min(n,6)*26*S/2-8*S+8*S+rowIdx*26*S;
        ctx.save(); ctx.globalAlpha=rp*0.35;
        ctx.fillStyle=wc.color;
        if(ctx.roundRect){ctx.beginPath();ctx.roundRect(tX+2*S,tY,118*S,26*S,4*S);ctx.fill();}
        else ctx.fillRect(tX+2*S,tY,118*S,26*S);
        ctx.restore();
      }

      // Avatar ganador grande
      const avR=32*S*rp;
      ctx.beginPath(); ctx.arc(cx,cy+82*S,avR*1.4,0,Math.PI*2);
      ctx.fillStyle=wc.color+'22'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy+82*S,avR,0,Math.PI*2);
      ctx.fillStyle=wc.gradient||wc.color; ctx.globalAlpha=rp; ctx.fill(); ctx.globalAlpha=1;

      ctx.font=`bold ${Math.round(13*S*rp)}px sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#fff'; ctx.globalAlpha=rp;
      ctx.fillText(getInitials(winner.name),cx,cy+82*S); ctx.textBaseline='alphabetic';

      ctx.font=`bold ${Math.round(26*S*rp*pulse)}px sans-serif`;
      ctx.fillStyle=wc.color;
      ctx.fillText(winner.name.toUpperCase(),cx,cy+124*S);
      ctx.globalAlpha=1;
    }

    t+=16;
    if(t<ROLL_DUR+900) rafId=requestAnimationFrame(draw);
    else{
      overlay.style.transition='opacity 220ms ease'; overlay.style.opacity='0';
      setTimeout(()=>{
        overlay.remove();
        state.set({winnerId:winner.id,phase:'revealing'});
        state.recordChosen(winner.id);
        state.recordHistory(winner.id,winner.name,state.getKey('question'),'dice');
        persistStats();
        if(prefs.particles) spawnParticles(getAvatarColorsByName(winner.name).color);
        showResult(winner.id);
      },280);
    }
  }
  if(prefs.vibration&&'vibrate'in navigator) navigator.vibrate([20,10,40,10,20]);
  rafId=requestAnimationFrame(draw);
}
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
