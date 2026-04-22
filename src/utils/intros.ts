// ══════════════════════════════════════════════════════════
// THIN DISPATCHER — lazy loads the heavy animations chunk
// This file stays in the main bundle (~1KB).
// The actual animation code (~300KB) loads on first use.
// ══════════════════════════════════════════════════════════

import type { Participant } from '../types'

// Cache the dynamic import so it only resolves once
let _animationsModule: typeof import('./intros/animations') | null = null

async function getAnimations() {
  if (!_animationsModule) {
    _animationsModule = await import('./intros/animations')
  }
  return _animationsModule
}

/**
 * Show a mode-specific intro animation before the sorteo.
 * The heavy animation code is lazy-loaded on first call.
 */
export async function showModeIntro(mode: string, participants?: Participant[], winnerId?: string): Promise<void> {
  const mod = await getAnimations()
  return mod.showModeIntro(mode, participants, winnerId)
}

/**
 * Preview any intro animation by skinId.
 * Usage from console: window.previewIntro('normal_crosshair')
 */
export async function previewIntro(skinId: string): Promise<void> {
  const mod = await getAnimations()
  return mod.previewIntro(skinId)
}

/** List all available intro animation IDs */
export async function listIntros(): Promise<string[]> {
  const mod = await getAnimations()
  return mod.listIntros()
}

/**
 * Preview Lottie hybrid animations with fake participants.
 * Usage from console: window.previewLottie('fire')
 */
export async function previewLottie(type: 'fire' | 'storm' | 'crosshair'): Promise<void> {
  const mod = await getAnimations()
  return mod.previewLottie(type)
}

/** Particle burst effect (small, kept lazy) */
export async function showParticleBurst(x: number, y: number, color?: string): Promise<void> {
  const mod = await getAnimations()
  return mod.showParticleBurst(x, y, color)
}

// Interactive animations — lazy proxies
export async function introElimSlotsInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const mod = await getAnimations()
  return mod.introElimSlotsInteractive(participants, winnerId)
}

export async function introElimChairsInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const mod = await getAnimations()
  return mod.introElimChairsInteractive(participants, winnerId)
}

export async function introRussianRouletteInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const mod = await getAnimations()
  return mod.introRussianRouletteInteractive(participants, winnerId)
}

export async function introOrderRaceInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const mod = await getAnimations()
  return mod.introOrderRaceInteractive(participants, winnerId)
}

export async function introOrderPodiumInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const mod = await getAnimations()
  return mod.introOrderPodiumInteractive(participants, winnerId)
}

export async function introElimBulbsInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const mod = await getAnimations()
  return mod.introElimBulbsInteractive(participants, winnerId)
}
