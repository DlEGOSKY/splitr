/* ============================================================
   STATE.JS — State Machine central: fuente de verdad de la app
   Patrón: Observer simple. Todos los módulos se suscriben
   a cambios de estado via state.subscribe(listener).
   ============================================================ */

/** @typedef {'idle' | 'spinning' | 'revealing' | 'result'} Phase */
/** @typedef {'normal' | 'elimination' | 'team' | 'order' | 'revenge' | 'duel' | 'split' | 'russian'} GameMode */

/**
 * Estructura de un participante:
 * { id: string, name: string, luck: number (1-5), excluded: boolean }
 */

const INITIAL_STATE = {
  // Participantes activos en la sesión
  participants: [],

  // Modo de juego actual
  mode: 'normal',

  // Cantidad de personas a elegir (modo equipo)
  teamSize: 2,

  // Fase actual del sorteo
  phase: 'idle',

  // ID del ganador actual (o array en modo equipo/orden)
  winnerId: null,

  // Pregunta/tarea personalizada
  question: '¿Quién paga?',

  // Historial de la sesión: { participantId: { chosen: N, escaped: N } }
  sessionStats: {},

  // Historial cronológico: [{ winnerId, winnerName, question, mode, timestamp }]
  sessionHistory: [],

  // Participantes eliminados en modo Eliminación (ids)
  eliminatedIds: [],

  // Orden generado (modo Orden): array de ids
  orderSequence: [],
  orderRevealIndex: 0,

  // Nombre del grupo guardado actualmente cargado
  currentGroupName: null,

  // Modo Venganza: id del último elegido (tiene probabilidad extra)
  revengeTarget: null,

  // Modo Ruleta Rusa: ids de los que siguen en juego (se van eliminando)
  russianSurvivors: [],

  // Modo Duelo: ids de los dos participantes en duelo
  duelIds: [],
};

// Copia profunda del estado inicial para poder resetearlo
let _state = JSON.parse(JSON.stringify(INITIAL_STATE));

// Lista de listeners suscritos a cambios de estado
const _listeners = new Set();

// ── API PÚBLICA DEL STATE MACHINE ──

export const state = {

  /** Devuelve una copia inmutable del estado completo */
  get() {
    return { ..._state };
  },

  /** Devuelve una propiedad específica del estado */
  getKey(key) {
    return _state[key];
  },

  /**
   * Actualiza el estado parcialmente y notifica a listeners.
   * @param {Partial<typeof INITIAL_STATE>} patch - Propiedades a actualizar
   */
  set(patch) {
    const prev = { ..._state };
    _state = { ..._state, ...patch };
    _listeners.forEach(fn => fn(_state, prev));
  },

  /**
   * Suscribe una función a cambios de estado.
   * @param {Function} listener - fn(newState, prevState)
   * @returns {Function} unsubscribe
   */
  subscribe(listener) {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },

  /** Resetea el estado a los valores iniciales (excepto participants) */
  resetRound() {
    const participants = _state.participants;
    const sessionStats = _state.sessionStats;
    const question     = _state.question;
    const mode         = _state.mode;
    const teamSize     = _state.teamSize;
    const currentGroupName = _state.currentGroupName;
    _state = {
      ...JSON.parse(JSON.stringify(INITIAL_STATE)),
      participants,
      sessionStats,
      question,
      mode,
      teamSize,
      currentGroupName,
    };
    _listeners.forEach(fn => fn(_state, null));
  },

  /** Resetea completamente incluidos los participantes y stats */
  resetAll() {
    _state = JSON.parse(JSON.stringify(INITIAL_STATE));
    _listeners.forEach(fn => fn(_state, null));
  },

  // ── HELPERS DE NEGOCIO ──

  /** Retorna participantes activos (no excluidos y no eliminados en modo eliminación) */
  getActiveParticipants() {
    const { participants, eliminatedIds } = _state;
    return participants.filter(p =>
      !p.excluded && !eliminatedIds.includes(p.id)
    );
  },

  /** Verifica si hay suficientes participantes para sortear */
  canSpin() {
    const active = this.getActiveParticipants();

    if (_state.mode === 'order') {
      // En modo Orden: si hay secuencia activa con pasos pendientes, siempre se puede
      if (_state.orderSequence && _state.orderRevealIndex < _state.orderSequence.length) {
        return true;
      }
      // Primera vez: necesita al menos 2 para generar un orden interesante
      return active.length >= 2;
    }

    if (_state.mode === 'elimination') {
      // En eliminación: necesita al menos 2 para sortear (el último se revela aparte)
      return active.length >= 2;
    }

    if (_state.mode === 'team') {
      return active.length >= _state.teamSize;
    }

    if (_state.mode === 'revenge') return active.length >= 2;

    if (_state.mode === 'duel') {
      return (_state.duelIds || []).length === 2;
    }

    if (_state.mode === 'split') return active.length >= 2;

    if (_state.mode === 'russian') {
      const s = _state.russianSurvivors;
      if (s && s.length > 1) return true;
      if (!s || s.length === 0) return active.length >= 2;
      return false;
    }

    return active.length >= 2;
  },

  /** Registra en stats que un participante fue elegido */
  recordChosen(id) {
    const stats = { ..._state.sessionStats };
    if (!stats[id]) stats[id] = { chosen: 0, escaped: 0 };
    stats[id].chosen++;
    this.set({ sessionStats: stats });
  },

  /** Añade una entrada al historial cronológico de sorteos */
  recordHistory(winnerId, winnerName, question, mode) {
    const entry = { winnerId, winnerName, question, mode, timestamp: Date.now() };
    this.set({ sessionHistory: [entry, ..._state.sessionHistory].slice(0, 50) });
  },

  /** Registra en stats que un participante participó pero no fue elegido */
  recordEscaped(ids) {
    const stats = { ..._state.sessionStats };
    ids.forEach(id => {
      if (!stats[id]) stats[id] = { chosen: 0, escaped: 0 };
      stats[id].escaped++;
    });
    this.set({ sessionStats: stats });
  },
};
