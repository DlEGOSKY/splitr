/* ============================================================
   PARTICIPANTS.JS — CRUD de participantes y generación de avatares
   Estrategia de color: hash del nombre → hsl único y consistente
   ============================================================ */

import { state } from './state.js';

// ── GENERACIÓN DE ID ÚNICO ──

/**
 * Genera un ID único basado en timestamp + random.
 * @returns {string}
 */
function generateId() {
  return `p_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// ── HASH DE COLOR DESDE NOMBRE ──

/**
 * Convierte un string en un número hash djb2.
 * Determinístico: el mismo nombre siempre produce el mismo hash.
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // fuerza 32 bits
  }
  return Math.abs(hash);
}

/**
 * Genera los colores de un avatar usando su POSICIÓN en el grupo.
 *
 * Estrategia: PASO FIJO por participante en la rueda de colores.
 * Cada burbuja nueva avanza 28° en el espectro HSL, creando un
 * flujo continuo tipo arcoíris:
 *   1º → verde fosforescente (140°)
 *   2º → verde-amarillo     (168°)
 *   3º → amarillo-verde     (196°) ← salta por azul, usamos offset
 *   ...
 *
 * Para que el flujo sea siempre cálido y vibrante, usamos un arco
 * que va de verde neón → amarillo → naranja → rojo → magenta → morado,
 * evitando los azules fríos (200°-260°) que rompen la secuencia visual.
 *
 * Mapa de posición a hue (paso de 26° en un arco de 240° desde 100° a 340°):
 *   0 → 100° verde
 *   1 → 126° verde-amarillo
 *   2 → 152° amarillo
 *   3 → 178° naranja
 *   4 → 204° → skip azul → 230° rojo-naranja
 *   ...cicla
 *
 * @param {string} name  - nombre (no afecta el hue)
 * @param {number} index - posición 0-based en el array
 * @param {number} total - total de participantes (no usado, el paso es fijo)
 */
export function getAvatarColors(name, index = 0, total = 1) {
  // Paso fijo: 30° por participante. Empieza en verde fosforescente.
  // Secuencia con 12 participantes max:
  //  0→120° verde  1→150° lima  2→180° cyan-verde  3→210° cyan
  //  4→240° azul   5→270° violeta  6→300° magenta
  //  7→330° rosa   8→360°→0° rojo  9→30° naranja  10→60° amarillo  11→90° lima
  //
  // Para que el flujo sea perceptualmente bonito, usamos una paleta
  // curada de 12 hues que evitan colores "sucios":
  const PALETTE = [
    120, // 0  verde fosforescente
    150, // 1  lima / verde-amarillo
     80, // 2  amarillo-verde
     55, // 3  amarillo
     30, // 4  naranja
      0, // 5  rojo
    330, // 6  rosa-rojo
    300, // 7  magenta
    270, // 8  violeta
    240, // 9  azul
    200, // 10 cyan-azul
    170, // 11 turquesa
  ];

  const hue  = PALETTE[index % PALETTE.length];
  // El gradiente interno usa un hue 25° más cálido para dar profundidad
  const hue2 = (hue + 25) % 360;

  const gradient = `linear-gradient(135deg,
    hsl(${hue}, 90%, 34%) 0%,
    hsl(${hue2}, 95%, 60%) 100%
  )`;

  const color = `hsl(${hue}, 90%, 60%)`;
  const glow  = `hsla(${hue}, 95%, 62%, 0.5)`;
  const rgb   = hslToRgbString(hue, 90, 60);

  return { hue, gradient, color, glow, rgb };
}

/**
 * Versión de fallback que usa el hash del nombre.
 * Se usa cuando no se conoce la posición (ej: overlay de resultado,
 * pantalla de stats). Mantiene consistencia visual por nombre.
 */
export function getAvatarColorsByName(name) {
  const hash  = hashString(name || 'X');
  const hue   = hash % 360;
  const hue2  = (hue + 40) % 360;
  return {
    hue,
    gradient: `linear-gradient(135deg, hsl(${hue},75%,38%) 0%, hsl(${hue2},80%,55%) 100%)`,
    color:    `hsl(${hue},75%,55%)`,
    glow:     `hsla(${hue},80%,55%,0.45)`,
    rgb:      hslToRgbString(hue, 75, 55),
  };
}

/**
 * Convierte HSL a string "r, g, b" para usar en rgba().
 * Implementación matemática directa, sin canvas.
 */
function hslToRgbString(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
}

/**
 * Extrae las iniciales de un nombre (máximo 2 caracteres).
 * "María García" → "MG" | "Pedro" → "PE" | "DJ Shadow" → "DS"
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ── CRUD DE PARTICIPANTES ──

/**
 * Agrega un participante nuevo al estado.
 * Valida: nombre no vacío, no duplicado, máximo 12.
 * @param {string} name
 * @returns {{ success: boolean, error?: string }}
 */
export function addParticipant(name) {
  const trimmed = name.trim();

  if (!trimmed) {
    return { success: false, error: 'El nombre no puede estar vacío.' };
  }

  const current = state.getKey('participants');

  if (current.length >= 12) {
    return { success: false, error: 'Máximo 12 participantes.' };
  }

  const exists = current.some(
    p => p.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (exists) {
    return { success: false, error: `"${trimmed}" ya está en la lista.` };
  }

  const newParticipant = {
    id:       generateId(),
    name:     trimmed,
    luck:     3,          // valor medio de suerte por defecto
    excluded: false,
  };

  state.set({ participants: [...current, newParticipant] });
  return { success: true, participant: newParticipant };
}

/**
 * Elimina un participante permanentemente.
 * @param {string} id
 */
export function removeParticipant(id) {
  const current = state.getKey('participants');
  state.set({
    participants: current.filter(p => p.id !== id)
  });
}

/**
 * Alterna el estado de exclusión temporal de un participante.
 * @param {string} id
 */
export function toggleExclude(id) {
  const current = state.getKey('participants');
  state.set({
    participants: current.map(p =>
      p.id === id ? { ...p, excluded: !p.excluded } : p
    )
  });
}

/**
 * Actualiza el valor de suerte de un participante (1-5).
 * @param {string} id
 * @param {number} luck
 */
export function setLuck(id, luck) {
  const clamped = Math.max(1, Math.min(5, luck));
  const current = state.getKey('participants');
  state.set({
    participants: current.map(p =>
      p.id === id ? { ...p, luck: clamped } : p
    )
  });
}

/**
 * Reemplaza toda la lista de participantes (usado al cargar grupo guardado).
 * @param {Array} participants
 */
export function loadParticipants(participants) {
  // Asegurar que cada participante tenga estructura completa
  const normalized = participants.map(p => ({
    id:       p.id       || generateId(),
    name:     p.name     || 'Sin nombre',
    luck:     p.luck     ?? 3,
    excluded: p.excluded ?? false,
  }));
  state.set({ participants: normalized, eliminatedIds: [], sessionStats: {} });
}

/** Renombra un participante existente por id */
export function renameParticipant(id, newName) {
  const participants = state.getKey('participants').map(p =>
    p.id === id ? { ...p, name: newName.trim().slice(0, 18) } : p
  );
  state.set({ participants });
}
