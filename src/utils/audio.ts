let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume()
  }
  return _ctx
}

interface NoteOpts {
  ctx: AudioContext
  frequency: number
  type?: OscillatorType
  startTime: number
  duration: number
  gainPeak?: number
  attack?: number
  decay?: number
  sustain?: number
  release?: number
  destination?: AudioNode | null
}

function createNote({
  ctx, frequency, type = 'sine', startTime, duration,
  gainPeak = 0.3, attack = 0.01, decay = 0.1,
  sustain = 0.7, release = 0.2, destination = null
}: NoteOpts) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + attack)
  gain.gain.linearRampToValueAtTime(gainPeak * sustain, startTime + attack + decay)
  gain.gain.setValueAtTime(gainPeak * sustain, startTime + duration - release)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(gain)
  gain.connect(destination || ctx.destination)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

function createReverb(ctx: AudioContext): ConvolverNode {
  const convolver = ctx.createConvolver()
  const length = ctx.sampleRate * 1.5
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
    }
  }

  convolver.buffer = buffer
  return convolver
}

function playSnare(ctx: AudioContext, startTime: number) {
  const bufferSize = ctx.sampleRate * 0.2
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3500
  filter.Q.value = 0.5

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(startTime)
  noise.stop(startTime + 0.2)
}

export function playScanTick() {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime
    createNote({
      ctx, frequency: 800 + Math.random() * 400, type: 'square',
      startTime: t, duration: 0.05, gainPeak: 0.08,
      attack: 0.002, decay: 0.02, sustain: 0.3, release: 0.02,
    })
  } catch { /* Audio no disponible */ }
}

export function playWinnerFanfare() {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime

    const reverb = createReverb(ctx)
    const reverbGain = ctx.createGain()
    reverbGain.gain.value = 0.3
    reverb.connect(reverbGain)
    reverbGain.connect(ctx.destination)

    const fanfareNotes = [
      { freq: 392.0, start: 0,    dur: 0.15, gain: 0.3 },
      { freq: 493.9, start: 0.12, dur: 0.15, gain: 0.3 },
      { freq: 587.3, start: 0.24, dur: 0.15, gain: 0.3 },
      { freq: 783.9, start: 0.36, dur: 0.5,  gain: 0.35 },
    ]

    fanfareNotes.forEach(({ freq, start, dur, gain }) => {
      createNote({
        ctx, frequency: freq, type: 'sawtooth',
        startTime: t + start, duration: dur, gainPeak: gain,
        attack: 0.02, decay: 0.05, sustain: 0.7, release: 0.1,
        destination: ctx.destination,
      })
    })

    fanfareNotes.forEach(({ freq, start, dur }) => {
      createNote({
        ctx, frequency: freq, type: 'sine',
        startTime: t + start, duration: dur, gainPeak: 0.15,
        attack: 0.02, decay: 0.05, sustain: 0.5, release: 0.15,
        destination: reverb,
      })
    })

    playSnare(ctx, t + 0.36)

    createNote({
      ctx, frequency: 60, type: 'sine',
      startTime: t + 0.36, duration: 0.4, gainPeak: 0.4,
      attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.2,
    })
  } catch { /* Audio no disponible */ }
}

export function playAddParticipant() {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime
    createNote({ ctx, frequency: 880, type: 'sine', startTime: t,
      duration: 0.15, gainPeak: 0.2, attack: 0.005, decay: 0.05, sustain: 0.5, release: 0.08 })
    createNote({ ctx, frequency: 1320, type: 'sine', startTime: t + 0.08,
      duration: 0.1, gainPeak: 0.15, attack: 0.005, decay: 0.03, sustain: 0.4, release: 0.06 })
  } catch { /* Audio no disponible */ }
}

export function playError() {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime
    createNote({ ctx, frequency: 180, type: 'square', startTime: t,
      duration: 0.25, gainPeak: 0.2, attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.1 })
  } catch { /* Audio no disponible */ }
}

export function playBuildUp(intensity = 0) {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime
    const freq = 200 + intensity * 300
    createNote({ ctx, frequency: freq, type: 'sawtooth', startTime: t,
      duration: 0.08, gainPeak: 0.04 + intensity * 0.06,
      attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.03 })
  } catch { /* Audio no disponible */ }
}

export function initAudio() {
  try { getCtx() } catch { /* ignore */ }
}

// Suspend AudioContext when tab is hidden to save CPU/battery
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!_ctx) return
    if (document.hidden) {
      _ctx.suspend().catch(() => {})
    } else {
      _ctx.resume().catch(() => {})
    }
  })
}
