/* ============================================================
   AUDIO.JS — Sintetizador de sonidos con Web Audio API
   Todo es síntesis en tiempo real. Cero assets de audio.
   Patrón: Factory de nodos de audio reutilizables.
   ============================================================ */

// Contexto de audio (lazy-initialized para cumplir con políticas del navegador)
let _ctx = null;

/**
 * Inicializa el AudioContext en respuesta a una interacción del usuario.
 * Los navegadores requieren que el contexto se cree dentro de un evento.
 */
function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Reanudar si estaba suspendido (política de autoplay)
  if (_ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
}

// ── UTILIDADES DE NODOS ──

/**
 * Crea un oscilador con envelope ADSR y lo conecta al destino.
 * @param {AudioContext} ctx
 * @param {Object} opts
 */
function createNote({ ctx, frequency, type = 'sine', startTime, duration,
                       gainPeak = 0.3, attack = 0.01, decay = 0.1,
                       sustain = 0.7, release = 0.2, destination = null }) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  // Envelope ADSR
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
  gain.gain.linearRampToValueAtTime(gainPeak * sustain, startTime + attack + decay);
  gain.gain.setValueAtTime(gainPeak * sustain, startTime + duration - release);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.connect(gain);
  gain.connect(destination || ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Crea un nodo de reverb simple con ConvolverNode sintético.
 * @param {AudioContext} ctx
 * @returns {ConvolverNode}
 */
function createReverb(ctx) {
  const convolver = ctx.createConvolver();
  const length = ctx.sampleRate * 1.5;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }

  convolver.buffer = buffer;
  return convolver;
}

// ── SONIDOS DE LA APP ──

/**
 * Tick del barrido: sonido corto tipo click electrónico.
 * Se llama en cada flash de avatar durante la animación.
 */
export function playScanTick() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;

    createNote({
      ctx,
      frequency: 800 + Math.random() * 400,
      type: 'square',
      startTime: t,
      duration: 0.05,
      gainPeak: 0.08,
      attack: 0.002,
      decay: 0.02,
      sustain: 0.3,
      release: 0.02,
    });
  } catch (e) {
    // Audio no disponible, ignorar silenciosamente
  }
}

/**
 * Fanfarria de revelación del ganador.
 * Secuencia de notas ascendentes + acorde final con reverb.
 * Escala: Sol Mayor (G major) para sensación de victoria.
 */
export function playWinnerFanfare() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Crear reverb para la fanfarria
    const reverb = createReverb(ctx);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.3;
    reverb.connect(reverbGain);
    reverbGain.connect(ctx.destination);

    // Notas de la fanfarria (frecuencias en Hz, escala Sol Mayor)
    // G4=392, B4=494, D5=587, G5=784
    const fanfareNotes = [
      { freq: 392.0, start: 0,    dur: 0.15, gain: 0.3 },   // Sol
      { freq: 493.9, start: 0.12, dur: 0.15, gain: 0.3 },   // Si
      { freq: 587.3, start: 0.24, dur: 0.15, gain: 0.3 },   // Re
      { freq: 783.9, start: 0.36, dur: 0.5,  gain: 0.35 },  // Sol alto
    ];

    // Canal principal (sawtooth para brillantez de trompeta)
    fanfareNotes.forEach(({ freq, start, dur, gain }) => {
      createNote({
        ctx,
        frequency: freq,
        type: 'sawtooth',
        startTime: t + start,
        duration: dur,
        gainPeak: gain,
        attack: 0.02,
        decay: 0.05,
        sustain: 0.7,
        release: 0.1,
        destination: ctx.destination,
      });
    });

    // Canal reverb (mismo pitch, más suave)
    fanfareNotes.forEach(({ freq, start, dur }) => {
      createNote({
        ctx,
        frequency: freq,
        type: 'sine',
        startTime: t + start,
        duration: dur,
        gainPeak: 0.15,
        attack: 0.02,
        decay: 0.05,
        sustain: 0.5,
        release: 0.15,
        destination: reverb,
      });
    });

    // Golpe de caja (snare) sintético en el momento de revelación
    playSnare(ctx, t + 0.36);

    // Sub-bass boom para impacto
    createNote({
      ctx,
      frequency: 60,
      type: 'sine',
      startTime: t + 0.36,
      duration: 0.4,
      gainPeak: 0.4,
      attack: 0.005,
      decay: 0.1,
      sustain: 0.3,
      release: 0.2,
    });

  } catch (e) {
    // Audio no disponible
  }
}

/**
 * Caja/snare sintético usando WhiteNoise + filtro.
 * @param {AudioContext} ctx
 * @param {number} startTime
 */
function playSnare(ctx, startTime) {
  const bufferSize = ctx.sampleRate * 0.2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3500;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(startTime);
  noise.stop(startTime + 0.2);
}

/**
 * Sonido de añadir participante: "pop" positivo.
 */
export function playAddParticipant() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    createNote({ ctx, frequency: 880, type: 'sine', startTime: t,
      duration: 0.15, gainPeak: 0.2, attack: 0.005, decay: 0.05, sustain: 0.5, release: 0.08 });
    createNote({ ctx, frequency: 1320, type: 'sine', startTime: t + 0.08,
      duration: 0.1, gainPeak: 0.15, attack: 0.005, decay: 0.03, sustain: 0.4, release: 0.06 });
  } catch {}
}

/**
 * Sonido de error: "buzz" negativo.
 */
export function playError() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    createNote({ ctx, frequency: 180, type: 'square', startTime: t,
      duration: 0.25, gainPeak: 0.2, attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.1 });
  } catch {}
}

/**
 * Sonido de tensión creciente (durante el barrido).
 * Zumbido que sube de pitch.
 */
export function playBuildUp(intensity = 0) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const freq = 200 + intensity * 300; // 200Hz → 500Hz según intensidad
    createNote({ ctx, frequency: freq, type: 'sawtooth', startTime: t,
      duration: 0.08, gainPeak: 0.04 + intensity * 0.06,
      attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.03 });
  } catch {}
}

/** Inicializa el contexto (llamar en primer tap del usuario) */
export function initAudio() {
  try { getCtx(); } catch {}
}

/* ══════════════════════════════════════════════
   SONIDOS DEL TORNEO
   ══════════════════════════════════════════════ */

/** Drum roll que crece — usado antes de revelar ganador del duelo */
export function playDrumRoll(durationSec = 1.2) {
  try {
    const ctx = getCtx();
    const t   = ctx.currentTime;
    const steps = Math.floor(durationSec * 18);
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const interval = 0.09 - progress * 0.065; // acelera
      const gain     = 0.08 + progress * 0.14;
      playSnare(ctx, t + i * interval, gain);
    }
  } catch { /* silencioso */ }
}

/** Ding de boxeo — al revelar el duelo siguiente */
export function playBoxingBell() {
  try {
    const ctx = getCtx();
    const t   = ctx.currentTime;
    // Tono metálico agudo con larga cola
    [880, 1108, 1320].forEach((freq, i) => {
      createNote({ ctx, frequency: freq, type: 'sine',
        startTime: t + i * 0.04, duration: 1.2,
        gainPeak: 0.18 - i * 0.04, attack: 0.002, decay: 0.05,
        sustain: 0.3, release: 0.9, destination: ctx.destination });
    });
  } catch { /* silencioso */ }
}

/** Fanfarria de campeón — más dramática que la normal */
export function playChampionFanfare() {
  try {
    const ctx = getCtx();
    const t   = ctx.currentTime;
    const reverb = createReverb(ctx);
    const rvg    = ctx.createGain();
    rvg.gain.value = 0.4;
    reverb.connect(rvg); rvg.connect(ctx.destination);

    const notes = [
      { freq: 523.3, start: 0,    dur: 0.12, gain: 0.3 },
      { freq: 659.3, start: 0.10, dur: 0.12, gain: 0.3 },
      { freq: 784.0, start: 0.20, dur: 0.12, gain: 0.3 },
      { freq: 1046.5,start: 0.30, dur: 0.55, gain: 0.38 },
      { freq: 784.0, start: 0.55, dur: 0.12, gain: 0.25 },
      { freq: 1046.5,start: 0.68, dur: 0.8,  gain: 0.42 },
    ];
    notes.forEach(({ freq, start, dur, gain }) => {
      createNote({ ctx, frequency: freq, type: 'sawtooth',
        startTime: t + start, duration: dur, gainPeak: gain,
        attack: 0.02, decay: 0.04, sustain: 0.75, release: 0.12,
        destination: ctx.destination });
      createNote({ ctx, frequency: freq, type: 'sine',
        startTime: t + start, duration: dur, gainPeak: gain * 0.4,
        attack: 0.02, decay: 0.04, sustain: 0.5, release: 0.2,
        destination: reverb });
    });
    playSnare(ctx, t + 0.30);
    playSnare(ctx, t + 0.68);
  } catch { /* silencioso */ }
}

/* ══════════════════════════════════════════════
   SONIDOS DE LA ENCUESTA
   ══════════════════════════════════════════════ */

/** Tick suave al marcar voto */
export function playVoteTick(positive = true) {
  try {
    const ctx = getCtx();
    createNote({ ctx,
      frequency: positive ? 880 : 440,
      type: 'sine', startTime: ctx.currentTime,
      duration: 0.08, gainPeak: 0.12,
      attack: 0.005, decay: 0.03, sustain: 0.4, release: 0.05,
      destination: ctx.destination });
  } catch { /* silencioso */ }
}

/** Reveal de resultados — glissando ascendente */
export function playRevealGliss() {
  try {
    const ctx = getCtx();
    const t   = ctx.currentTime;
    [330, 440, 554, 659, 880].forEach((freq, i) => {
      createNote({ ctx, frequency: freq, type: 'sine',
        startTime: t + i * 0.07, duration: 0.18,
        gainPeak: 0.12 + i * 0.02,
        attack: 0.01, decay: 0.03, sustain: 0.5, release: 0.1,
        destination: ctx.destination });
    });
  } catch { /* silencioso */ }
}
