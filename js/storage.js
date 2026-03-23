/* ============================================================
   STORAGE.JS — Capa de persistencia con LocalStorage
   Responsabilidad única: leer/escribir grupos y preferencias
   ============================================================ */

const KEYS = {
  GROUPS:      'quien-paga:groups',
  LAST_GROUP:  'quien-paga:last-group',
  PREFERENCES: 'quien-paga:prefs',
};

// ── GRUPOS ──

/**
 * Guarda un grupo con su nombre y lista de participantes.
 * @param {string} name - Nombre del grupo (ej: "Amigos del trabajo")
 * @param {Array}  participants - Array de objetos participante
 */
export function saveGroup(name, participants) {
  const groups = loadAllGroups();
  groups[name] = {
    name,
    participants: participants.map(p => ({
      id: p.id,
      name: p.name,
      luck: p.luck,
    })),
    savedAt: Date.now(),
    count: participants.length,
  };
  try {
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));
    localStorage.setItem(KEYS.LAST_GROUP, name);
    return true;
  } catch (e) {
    console.warn('[Storage] No se pudo guardar el grupo:', e);
    return false;
  }
}

/**
 * Carga todos los grupos guardados.
 * @returns {Object} Mapa de grupos { nombre: { name, participants, savedAt, count } }
 */
export function loadAllGroups() {
  try {
    const raw = localStorage.getItem(KEYS.GROUPS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Carga un grupo específico por nombre.
 * @param {string} name
 * @returns {Object|null}
 */
export function loadGroup(name) {
  const groups = loadAllGroups();
  return groups[name] || null;
}

/**
 * Elimina un grupo guardado.
 * @param {string} name
 */
export function deleteGroup(name) {
  const groups = loadAllGroups();
  delete groups[name];
  try {
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));
    return true;
  } catch {
    return false;
  }
}

/**
 * Devuelve el nombre del último grupo usado.
 * @returns {string|null}
 */
export function getLastGroupName() {
  return localStorage.getItem(KEYS.LAST_GROUP);
}

// ── PREFERENCIAS DE USUARIO ──

/**
 * Guarda preferencias del usuario.
 * @param {Object} prefs
 */
export function savePreferences(prefs) {
  try {
    const current = loadPreferences();
    localStorage.setItem(KEYS.PREFERENCES, JSON.stringify({ ...current, ...prefs }));
  } catch (e) {
    console.warn('[Storage] No se pudieron guardar preferencias:', e);
  }
}

/**
 * Carga preferencias del usuario.
 * @returns {Object}
 */
export function loadPreferences() {
  try {
    const raw = localStorage.getItem(KEYS.PREFERENCES);
    return raw ? JSON.parse(raw) : {
      lastQuestion: '¿Quién paga?',
      lastMode: 'normal',
      vibration: true,
      audio: true,
    };
  } catch {
    return {};
  }
}

// ══════════════════════════════════════════════════════════
// SISTEMA DE SKINS DE ANIMACIÓN
// ══════════════════════════════════════════════════════════

const SKINS_KEY = 'quien-paga:anim-skins';

/**
 * Catálogo completo de skins por modo.
 * tier: 'free' | 'pro'
 * price: precio de referencia (el cobro real va a tu sistema de pagos)
 */
export const SKIN_CATALOG = {
  normal: [
    { id: 'normal_crosshair', name: 'Crosshair',    tier: 'free', desc: 'El crosshair escanea y el dardo cae sobre el elegido' },
    { id: 'normal_missile',   name: 'Misil',         tier: 'pro',  desc: 'La diana viaja como misil hacia el avatar del ganador', price: 0.99 },
    { id: 'normal_sniper',    name: 'Francotirador', tier: 'pro',  desc: 'Mira telescópica que busca y encuadra al objetivo', price: 0.99 },
  ],
  elimination: [
    { id: 'elim_bulbs',   name: 'Bombillas',  tier: 'free', desc: 'Bombillas que se apagan hasta quedar una encendida' },
    { id: 'elim_chairs',  name: 'Sillas',     tier: 'pro',  desc: 'Sillas musicales — una cae por ronda', price: 0.99 },
    { id: 'elim_slots',   name: 'Tragamonedas', tier: 'pro', desc: 'Los rollos giran y revelan al eliminado', price: 0.99 },
  ],
  team: [
    { id: 'team_orbit',   name: 'Órbita',   tier: 'free', desc: 'Partículas orbitando que se separan en equipos' },
    { id: 'team_magnet',  name: 'Imán',     tier: 'pro',  desc: 'Los avatares son atraídos magnéticamente a su equipo', price: 0.99 },
    { id: 'team_cards',   name: 'Cartas',   tier: 'pro',  desc: 'Cartas repartidas como en un juego de mesa', price: 0.99 },
  ],
  order: [
    { id: 'order_podium', name: 'Podio',    tier: 'free', desc: 'Podio 1-2-3 con confeti' },
    { id: 'order_race',   name: 'Carrera',  tier: 'pro',  desc: 'Barras de progreso compiten hasta la meta', price: 0.99 },
    { id: 'order_wheel',  name: 'Ruleta',   tier: 'pro',  desc: 'Ruleta que asigna posiciones secuencialmente', price: 0.99 },
  ],
  duel: [
    { id: 'duel_clash',   name: 'Choque',   tier: 'free', desc: 'Dos avatares colisionan con explosión de chispas' },
    { id: 'duel_western', name: 'Western',  tier: 'pro',  desc: 'Duelo al estilo salvaje oeste con cuenta atrás', price: 0.99 },
    { id: 'duel_boxing',  name: 'Boxeo',    tier: 'pro',  desc: 'Ring de boxeo con campana y guantes', price: 0.99 },
  ],
  revenge: [
    { id: 'revenge_fire',   name: 'Fuego',    tier: 'free', desc: 'Anillos de fuego con rayo sobre el objetivo' },
    { id: 'revenge_target', name: 'Diana Roja', tier: 'pro', desc: 'Diana roja persigue al que lleva más rachas', price: 0.99 },
    { id: 'revenge_storm',  name: 'Tormenta', tier: 'pro',  desc: 'Tormenta con relámpagos sobre el condenado', price: 0.99 },
  ],
};

/** Lee las skins desbloqueadas del usuario */
export function getUnlockedSkins() {
  try {
    return JSON.parse(localStorage.getItem(SKINS_KEY) || '{}');
  } catch { return {}; }
}

/** Guarda skin desbloqueada (llamar después del pago exitoso) */
export function unlockSkin(skinId) {
  const unlocked = getUnlockedSkins();
  unlocked[skinId] = true;
  localStorage.setItem(SKINS_KEY, JSON.stringify(unlocked));
}

/** Lee la skin activa por modo */
export function getActiveSkin(mode) {
  try {
    const prefs = JSON.parse(localStorage.getItem('quien-paga:prefs') || '{}');
    const skinId = prefs[`skin_${mode}`];
    const catalog = SKIN_CATALOG[mode];
    if (!catalog) return null;
    // Verificar que la skin existe y está desbloqueada
    const skin = catalog.find(s => s.id === skinId);
    if (!skin) return catalog[0]; // fallback a free
    if (skin.tier === 'pro') {
      const unlocked = getUnlockedSkins();
      if (!unlocked[skinId]) return catalog[0]; // no desbloqueada → free
    }
    return skin;
  } catch { return SKIN_CATALOG[mode]?.[0] || null; }
}

/** Guarda la skin activa para un modo */
export function setActiveSkin(mode, skinId) {
  try {
    const prefs = JSON.parse(localStorage.getItem('quien-paga:prefs') || '{}');
    prefs[`skin_${mode}`] = skinId;
    localStorage.setItem('quien-paga:prefs', JSON.stringify(prefs));
  } catch {}
}

/**
 * Stub de compra — conectar con tu sistema de pagos real
 * (Google Play Billing, Stripe, etc.)
 * Retorna Promise<boolean> — true si la compra fue exitosa
 */
export async function purchaseSkin(skinId) {
  // TODO: conectar con sistema de pagos real
  // Por ahora simula una compra exitosa para testing
  console.log(`[Purchase] Iniciando compra de skin: ${skinId}`);
  // En producción: return await googlePlayBilling.purchase(skinId);
  return new Promise(resolve => {
    // Simulación: mostrar confirm nativo por ahora
    const skin = Object.values(SKIN_CATALOG).flat().find(s => s.id === skinId);
    const ok = confirm(`Desbloquear "${skin?.name}" por $${skin?.price || 0.99}?\n\n(Modo demo — en producción conectar con sistema de pagos)`);
    if (ok) { unlockSkin(skinId); resolve(true); }
    else resolve(false);
  });
}
