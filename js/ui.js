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
         deleteGroup, savePreferences, loadPreferences } from './storage.js';
import { Icons, luckIcon }                           from './icons.js';

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

  state.set({ phase: 'spinning' });

  try {
    await runCountdown();

    btnSortear?.classList.add('revving');

    // ── Elegir animación: Ruleta o Barrido clásico ──
    if (prefs.roulette && active.length >= 2) {
      await runRouletteAnimation(active, winnerId);
    } else {
      const sequence = buildAnimationSequence(active, winnerId, 3200);
      await runScanAnimation(sequence, active);
    }

    btnSortear?.classList.remove('revving');

    state.set({ phase: 'revealing' });
    setTimeout(() => showResult(winnerId), 280);

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
function spawnParticles(baseColor) {
  if (!particlesContainer) return;
  particlesContainer.innerHTML = '';

  // ── Canvas API en lugar de DOM divs — mucho más rápido en móvil ──
  const W = window.innerWidth;
  const H = window.innerHeight;
  const canvas = document.createElement('canvas');
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
  const COUNT = window.innerWidth < 400 ? 45 : 65; // menos en móviles pequeños

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
      p.alpha = Math.max(0, p.alpha - 0.018);
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

    if (alive > 0 && frame < 140) {
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
    tournament: 'Torneo'
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
    ctx.scale(DPR, DPR);
    const cx = size / 2, cy = size / 2;
    const R  = size / 2 - 6;   // radio de la rueda
    const Ri = R * 0.13;        // radio del centro

    // ── Calcular ángulo destino ──
    // El puntero está en la parte superior (−π/2).
    // Queremos que el CENTRO del sector del ganador apunte ahí.
    const targetAngle = -(Math.PI / 2) - (winnerIdx * sliceAngle) - (sliceAngle / 2);
    const extraSpins  = (5 + Math.random() * 2) * Math.PI * 2;
    const finalAngle  = targetAngle - extraSpins;

    const DURATION = 4800;
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
      const speed    = 1 - progress; // 1=rápido, 0=parado
      const eased    = easeOut(progress);
      const currentAngle = finalAngle * eased;

      drawWheel(currentAngle);

      // ── Tick sonido: detectar cuándo el puntero cruza un separador ──
      const pointed    = ((-Math.PI/2 - currentAngle) % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
      const currentIdx = Math.floor(pointed / sliceAngle) % N;
      if (currentIdx !== lastTickIdx) {
        lastTickIdx = currentIdx;
        if (prefs.vibration && 'vibrate' in navigator) {
          navigator.vibrate(speed > 0.5 ? 5 : speed > 0.2 ? 8 : 15);
        }
        playTick(speed);
      }

      // ── Label dinámico ──
      if (rouletteLabel) rouletteLabel.textContent = participants[currentIdx]?.name ?? '';

      if (progress < 1) {
        _rafId = requestAnimationFrame(tick);
      } else {
        drawWheel(finalAngle);
        if (rouletteLabel) {
          rouletteLabel.textContent = participants[winnerIdx]?.name ?? '';
          rouletteLabel.style.color = winnerColors.light;
          rouletteLabel.style.textShadow = `0 0 20px ${winnerColors.glow}`;
        }
        // Flash dorado de victoria
        if (prefs.flash) triggerImpactFlash();
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([60,30,120,30,200]);
        if (prefs.particles) spawnParticles(winnerColors.light);

        setTimeout(() => {
          rouletteOverlay.style.display = 'none';
          if (rouletteLabel) {
            rouletteLabel.style.color = '';
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

  const nextBtn = document.getElementById('tournament-next-match');
  const roundLbl = document.getElementById('tournament-round-label');

  function updateNextBtn() {
    const next = findNextMatch(rounds);
    if (next) {
      const { r, m } = next;
      const match = rounds[r][m];
      nextBtn.textContent = `Sortear: ${match.p1.name} vs ${match.p2.name}`;
      nextBtn.style.display = '';
      if (roundLbl) roundLbl.textContent = roundName(rounds, r);
    } else {
      nextBtn.style.display = 'none';
    }
  }

  updateNextBtn();

  nextBtn?.addEventListener('click', () => {
    const next = findNextMatch(rounds);
    if (!next) return;
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
    if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([20, 10, 40]);

    renderBracketHTML(rounds);
    updateNextBtn();

    // Comprobar si hay campeón
    const lastRound = rounds[rounds.length - 1];
    if (lastRound[0].winner) {
      setTimeout(() => showChampion(lastRound[0].winner), 600);
    }
  }, { signal: ac.signal });
}

function initRoundsView(rounds, ac, participants) {
  let currentRoundIdx = 0;
  let currentMatchIdx = 0;

  const p1El   = document.getElementById('tournament-p1');
  const p2El   = document.getElementById('tournament-p2');
  const infoEl = document.getElementById('tournament-match-info');
  const spinBtn = document.getElementById('tournament-spin-duel');
  const roundLbl = document.getElementById('tournament-round-label');

  function renderContender(el, player) {
    if (!el || !player) return;
    const c = getAvatarColorsByName(player.name);
    el.innerHTML = `
      <div class="tournament-contender-avatar" style="background:${c.gradient};" id="tc-${el.id}">
        ${escapeHtml(getInitials(player.name))}
      </div>
      <div class="tournament-contender-name">${escapeHtml(player.name)}</div>`;
  }

  function showCurrentMatch() {
    // Resolve byes first
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
    renderContender(p1El, match.p1);
    renderContender(p2El, match.p2);

    const total = rounds[currentRoundIdx].length;
    const done  = rounds[currentRoundIdx].filter(m => m.winner).length;
    if (infoEl)   infoEl.textContent = `${roundName(rounds, currentRoundIdx)} · Duelo ${done + 1} de ${total}`;
    if (roundLbl) roundLbl.textContent = roundName(rounds, currentRoundIdx);
    if (spinBtn)  { spinBtn.textContent = ''; spinBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Sortear duelo'; }

    // Reset visual
    const av1 = p1El?.querySelector('.tournament-contender-avatar');
    const av2 = p2El?.querySelector('.tournament-contender-avatar');
    if (av1) { av1.classList.remove('winner-glow','loser-fade'); }
    if (av2) { av2.classList.remove('winner-glow','loser-fade'); }
  }

  showCurrentMatch();

  spinBtn?.addEventListener('click', () => {
    const match = rounds[currentRoundIdx][currentMatchIdx];
    if (match.winner) return;

    match.winner = sortDuel(match.p1, match.p2);

    // Propagate
    if (currentRoundIdx + 1 < rounds.length) {
      const nextMatchIdx = Math.floor(currentMatchIdx / 2);
      const slot = currentMatchIdx % 2 === 0 ? 'p1' : 'p2';
      rounds[currentRoundIdx + 1][nextMatchIdx][slot] = match.winner;
    }

    // Visual feedback
    const av1 = p1El?.querySelector('.tournament-contender-avatar');
    const av2 = p2El?.querySelector('.tournament-contender-avatar');
    if (av1 && av2) {
      if (match.winner.id === match.p1.id) {
        av1.classList.add('winner-glow'); av2.classList.add('loser-fade');
      } else {
        av2.classList.add('winner-glow'); av1.classList.add('loser-fade');
      }
    }

    if (p1El) { const nameEl = p1El.querySelector('.tournament-contender-name'); if (nameEl) nameEl.style.color = match.winner.id === match.p1.id ? 'var(--color-accent)' : ''; }
    if (p2El) { const nameEl = p2El.querySelector('.tournament-contender-name'); if (nameEl) nameEl.style.color = match.winner.id === match.p2.id ? 'var(--color-accent)' : ''; }

    if (prefs.sound) playWinnerFanfare();
    if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([30, 15, 60]);
    if (prefs.particles) spawnParticles(getAvatarColorsByName(match.winner.name).color);

    // Botón → siguiente
    if (spinBtn) {
      const winName = match.winner.name;
      spinBtn.textContent = `${winName} avanza →`;
      setTimeout(() => {
        const lastRound = rounds[rounds.length-1];
        if (lastRound[0].winner) {
          showChampion(lastRound[0].winner);
        } else {
          showCurrentMatch();
        }
      }, 1400);
    }
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
