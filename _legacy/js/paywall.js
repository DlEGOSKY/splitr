/* ============================================================
   PAYWALL.JS — Modal de compra de Splitr Pro
   Gestiona la UI del paywall y las compras de skins PRO.
   ============================================================ */

import { purchase, restorePurchases } from './billing.js';
import { SKIN_CATALOG, getUnlockedSkins, unlockSkin } from './storage.js';
import { playWinnerFanfare } from './audio.js';

// ══════════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════════

let modalPaywall = null;
let showToastFn = null;
let prefsSoundFn = null;
let renderSkinsPickerFn = null;

// Iconos SVG para cada skin PRO
const SKIN_ICONS = {
  normal_missile: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
  normal_sniper:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',
  elim_chairs:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"/><path d="M3 21h18"/><path d="M9 7h6"/></svg>',
  elim_slots:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="8" y1="4" x2="8" y2="20"/><line x1="16" y1="4" x2="16" y2="20"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>',
  team_magnet:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v6a6 6 0 0 0 12 0V2"/><line x1="6" y1="2" x2="6" y2="6"/><line x1="18" y1="2" x2="18" y2="6"/><path d="M6 6a6 6 0 0 0 12 0"/></svg>',
  team_cards:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="8" height="12" rx="1"/><rect x="14" y="4" width="8" height="12" rx="1"/><path d="M6 10h0M18 10h0"/></svg>',
  order_race:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  order_wheel:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l7 4"/></svg>',
  duel_western:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
  duel_boxing:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16v-4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4"/><rect x="6" y="12" width="4" height="6" rx="1"/><rect x="14" y="12" width="4" height="6" rx="1"/></svg>',
  revenge_target: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  revenge_storm:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>',
};

// ══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════

/**
 * Inicializa el paywall. Debe llamarse después de que el DOM esté listo.
 * @param {Object} callbacks - Funciones de callback necesarias
 * @param {Function} callbacks.showToast - Función para mostrar toast
 * @param {Function} callbacks.getPrefsSound - Función que retorna si el sonido está activo
 * @param {Function} callbacks.renderSkinsPicker - Función para re-renderizar el picker de skins
 */
export function initPaywall({ showToast, getPrefsSound, renderSkinsPicker }) {
  showToastFn = showToast;
  prefsSoundFn = getPrefsSound;
  renderSkinsPickerFn = renderSkinsPicker;

  modalPaywall = document.getElementById('modal-paywall');
  if (!modalPaywall) return;

  document.getElementById('btn-paywall-close')?.addEventListener('click', closePaywall);
  document.getElementById('btn-restore-purchases')?.addEventListener('click', handleRestorePurchases);
  document.getElementById('btn-buy-bundle')?.addEventListener('click', handleBuyBundle);
  modalPaywall.addEventListener('click', e => { if(e.target === modalPaywall) closePaywall(); });
}

// ══════════════════════════════════════════════════════════
// FUNCIONES PÚBLICAS
// ══════════════════════════════════════════════════════════

export function openPaywall(triggerSkinId = null) {
  if (!modalPaywall) return;
  renderPaywallItems(triggerSkinId);
  modalPaywall.style.display = 'flex';
  requestAnimationFrame(() => modalPaywall.classList.add('open'));
}

export function closePaywall() {
  if (!modalPaywall) return;
  modalPaywall.classList.remove('open');
  setTimeout(() => { modalPaywall.style.display = 'none'; }, 300);
}

// ══════════════════════════════════════════════════════════
// RENDERIZADO
// ══════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════
// HANDLERS DE COMPRA
// ══════════════════════════════════════════════════════════

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
      showToastFn?.('¡Splitr Pro desbloqueado!');
      if (prefsSoundFn?.()) playWinnerFanfare();
      renderPaywallItems(null);
      renderSkinsPickerFn?.();
      setTimeout(closePaywall, 1200);
    } else if (result.error && result.error !== 'Cancelado') {
      showToastFn?.('Error: ' + result.error);
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
      showToastFn?.('¡Desbloqueado!');
      renderPaywallItems(skinId);
      renderSkinsPickerFn?.();
    } else if (result.error && result.error !== 'Cancelado') {
      showToastFn?.('Error: ' + result.error);
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
    showToastFn?.(`${unlocked.length} compra${unlocked.length>1?'s':''} restaurada${unlocked.length>1?'s':''}`);
    renderPaywallItems(null);
    renderSkinsPickerFn?.();
  } else {
    showToastFn?.('No se encontraron compras anteriores');
  }
  if (btn) { btn.textContent = 'Restaurar compras anteriores'; btn.disabled = false; }
}

// Exportar iconos para uso en otros módulos
export { SKIN_ICONS };
