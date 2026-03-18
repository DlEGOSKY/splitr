/* ============================================================
   SELECTOR.JS — Algoritmo de selección ponderada
   Usa crypto.getRandomValues() para distribución criptográfica.
   Sistema de pesos inversos: suerte 1 = peso 5, suerte 5 = peso 1.
   ============================================================ */

import { state } from './state.js';

// ── GENERACIÓN DE NÚMERO ALEATORIO CRIPTOGRÁFICO ──

/**
 * Genera un entero aleatorio en [0, max) usando crypto.getRandomValues().
 * Usa el método de rejection sampling para evitar bias de módulo.
 * @param {number} max - Límite superior exclusivo
 * @returns {number}
 */
function secureRandom(max) {
  if (max <= 0) return 0;

  // Calculamos cuántos bits necesitamos y creamos el buffer correspondiente
  const array = new Uint32Array(1);
  const maxUint32 = 0xFFFFFFFF;

  // Rejection sampling: descartamos valores que causarían bias de módulo
  const limit = maxUint32 - (maxUint32 % max);

  let value;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value > limit);

  return value % max;
}

// ── CONSTRUCCIÓN DEL ARRAY PONDERADO ──

/**
 * Construye un array de IDs donde cada participante aparece
 * tantas veces como su peso (peso = 6 - luck).
 * Suerte 1 → peso 5 (aparece 5 veces) = más probable
 * Suerte 5 → peso 1 (aparece 1 vez)   = menos probable
 *
 * Ejemplo con 3 participantes:
 *   Ana (luck=1) → peso 5 → [ana, ana, ana, ana, ana]
 *   Bob (luck=3) → peso 3 → [bob, bob, bob]
 *   Cam (luck=5) → peso 1 → [cam]
 *   Total pool: 9 entradas. P(Ana) = 5/9 ≈ 55.6%
 *
 * @param {Array} participants - Participantes activos
 * @returns {string[]} Array ponderado de IDs
 */
function buildWeightedPool(participants) {
  const pool = [];
  for (const p of participants) {
    const weight = 6 - p.luck; // inverso: suerte 1 → peso 5
    for (let i = 0; i < weight; i++) {
      pool.push(p.id);
    }
  }
  return pool;
}

// ── SELECCIÓN PRINCIPAL ──

/**
 * Selecciona UN ganador del pool ponderado.
 * @param {Array} participants - Participantes activos (no excluidos)
 * @returns {string} ID del ganador
 */
export function selectOne(participants) {
  if (!participants || participants.length === 0) {
    throw new Error('No hay participantes activos.');
  }
  if (participants.length === 1) {
    return participants[0].id;
  }

  const pool = buildWeightedPool(participants);
  const index = secureRandom(pool.length);
  return pool[index];
}

/**
 * Selecciona N ganadores únicos del pool ponderado.
 * Implementación: selección iterativa sin reemplazo.
 * Cada selección excluye al elegido y reconstruye el pool.
 * @param {Array} participants
 * @param {number} n - Cantidad a seleccionar
 * @returns {string[]} Array de IDs ganadores
 */
export function selectMultiple(participants, n) {
  const count = Math.min(n, participants.length);
  const remaining = [...participants];
  const selected = [];

  for (let i = 0; i < count; i++) {
    const pool = buildWeightedPool(remaining);
    const index = secureRandom(pool.length);
    const winnerId = pool[index];

    selected.push(winnerId);

    // Eliminar al elegido del pool restante
    const winnerIndex = remaining.findIndex(p => p.id === winnerId);
    remaining.splice(winnerIndex, 1);
  }

  return selected;
}

/**
 * Genera un orden completo aleatorio ponderado de todos los participantes.
 * Usado en Modo Orden: el primero en el array es el "último"
 * (el que menos "suerte" tuvo en el sorteo), el último es el "primero".
 * @param {Array} participants
 * @returns {string[]} Array de todos los IDs en orden aleatorio ponderado
 */
export function selectOrder(participants) {
  return selectMultiple(participants, participants.length);
}

// ── GENERADOR DE SECUENCIA DE ANIMACIÓN ──

/**
 * Genera la secuencia de avatares a iluminar durante la animación de barrido.
 * Algoritmo: secuencia aleatoria que acelera y desacelera hasta el ganador.
 * Devuelve un array de { id, delay } con los delays en ms.
 *
 * Fase 1 (0-2s): velocidad creciente (50ms → 150ms entre flashes)
 * Fase 2 (2-4s): desaceleración suave (150ms → 600ms)
 * Fase final: el ganador queda iluminado.
 *
 * @param {Array} participants - Participantes activos
 * @param {string} winnerId - ID del ganador final
 * @param {number} totalDuration - Duración total en ms (default: 3500)
 * @returns {Array<{id: string, delay: number, isFinal: boolean}>}
 */
export function buildAnimationSequence(participants, winnerId, totalDuration = 3500) {
  const ids = participants.map(p => p.id);
  const sequence = [];
  let elapsed = 0;

  // Fase 1: aceleración (primeros 40% del tiempo)
  const accelEnd = totalDuration * 0.4;
  let interval = 180; // ms entre flashes al inicio
  const minInterval = 60;

  while (elapsed < accelEnd) {
    // Elegir avatar random (puede repetirse, excepto el anterior)
    const last = sequence.length > 0 ? sequence[sequence.length - 1].id : null;
    const candidates = ids.filter(id => id !== last);
    const idx = secureRandom(candidates.length);

    sequence.push({ id: candidates[idx], delay: elapsed, isFinal: false });
    elapsed += interval;
    interval = Math.max(minInterval, interval * 0.85); // aceleración
  }

  // Fase 2: desaceleración (40%-90% del tiempo)
  const decelEnd = totalDuration * 0.9;
  interval = minInterval;
  const maxInterval = 550;

  while (elapsed < decelEnd) {
    const last = sequence.length > 0 ? sequence[sequence.length - 1].id : null;
    const candidates = ids.filter(id => id !== last);
    const idx = secureRandom(candidates.length);

    sequence.push({ id: candidates[idx], delay: elapsed, isFinal: false });
    elapsed += interval;
    interval = Math.min(maxInterval, interval * 1.18); // desaceleración
  }

  // Pasos finales: mostrar al ganador (último flash = revelación)
  sequence.push({ id: winnerId, delay: totalDuration, isFinal: true });

  return sequence;
}

// ── AUDITORÍA DE PROBABILIDADES ──

/**
 * Calcula las probabilidades exactas de cada participante.
 * Útil para verificación matemática y modo debug.
 * @param {Array} participants
 * @returns {Array<{id, name, weight, probability}>}
 */
export function calculateProbabilities(participants) {
  const totalWeight = participants.reduce((sum, p) => sum + (6 - p.luck), 0);

  return participants.map(p => {
    const weight = 6 - p.luck;
    return {
      id:          p.id,
      name:        p.name,
      luck:        p.luck,
      weight,
      probability: totalWeight > 0 ? (weight / totalWeight) : 0,
      percentage:  totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) + '%' : '0%',
    };
  });
}
