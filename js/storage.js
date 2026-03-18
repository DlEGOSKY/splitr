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
