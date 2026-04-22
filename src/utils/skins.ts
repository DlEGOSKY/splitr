import type { Mode } from '../types'

// ══════════════════════════════════════════════════════════
// SKIN TYPES
// ══════════════════════════════════════════════════════════

export interface SkinDef {
  id: string
  name: string
  tier: 'free' | 'pro'
  desc: string
  price?: number
}

// ══════════════════════════════════════════════════════════
// SKIN CATALOG — must match Play Console product IDs
// ══════════════════════════════════════════════════════════

export const SKIN_CATALOG: Record<string, SkinDef[]> = {
  normal: [
    { id: 'normal_crosshair', name: 'Crosshair Pro', tier: 'pro',  desc: 'Diana profesional con partículas avanzadas y efectos', price: 0.99 },
    { id: 'normal_missile',   name: 'Misil',         tier: 'pro',  desc: 'La diana viaja como misil hacia el avatar del ganador', price: 0.99 },
    { id: 'normal_sniper',    name: 'Francotirador', tier: 'pro',  desc: 'Mira telescópica que busca y encuadra al objetivo', price: 0.99 },
  ],
  elimination: [
    { id: 'elim_bulbs',  name: 'Bombillas',    tier: 'free', desc: 'Bombillas que se apagan hasta quedar una encendida' },
    { id: 'elim_chairs', name: 'Sillas',       tier: 'pro',  desc: 'Sillas musicales — una cae por ronda', price: 0.99 },
    { id: 'elim_slots',  name: 'Tragamonedas', tier: 'pro',  desc: 'Los rollos giran y revelan al eliminado', price: 0.99 },
  ],
  team: [
    { id: 'team_orbit',  name: 'Órbita', tier: 'free', desc: 'Partículas orbitando que se separan en equipos' },
    { id: 'team_magnet', name: 'Imán',   tier: 'pro',  desc: 'Los avatares son atraídos magnéticamente a su equipo', price: 0.99 },
    { id: 'team_cards',  name: 'Cartas', tier: 'pro',  desc: 'Cartas repartidas como en un juego de mesa', price: 0.99 },
  ],
  order: [
    { id: 'order_podium', name: 'Podio',   tier: 'free', desc: 'Podio 1-2-3 con confeti' },
    { id: 'order_race',   name: 'Carrera', tier: 'pro',  desc: 'Barras de progreso compiten hasta la meta', price: 0.99 },
    { id: 'order_wheel',  name: 'Ruleta',  tier: 'pro',  desc: 'Ruleta que asigna posiciones secuencialmente', price: 0.99 },
  ],
  duel: [
    { id: 'duel_clash',   name: 'Choque',  tier: 'free', desc: 'Dos avatares colisionan con explosión de chispas' },
    { id: 'duel_western', name: 'Western', tier: 'pro',  desc: 'Duelo al estilo salvaje oeste con cuenta atrás', price: 0.99 },
    { id: 'duel_boxing',  name: 'Boxeo',   tier: 'pro',  desc: 'Ring de boxeo con campana y guantes', price: 0.99 },
  ],
  revenge: [
    { id: 'revenge_fire',   name: 'Fuego',     tier: 'free', desc: 'Anillos de fuego con rayo sobre el objetivo' },
    { id: 'revenge_target', name: 'Diana Roja', tier: 'pro', desc: 'Diana roja persigue al que lleva más rachas', price: 0.99 },
    { id: 'revenge_storm',  name: 'Tormenta',  tier: 'pro',  desc: 'Tormenta con relámpagos sobre el condenado', price: 0.99 },
  ],
}

// ══════════════════════════════════════════════════════════
// PERSISTENCE KEYS
// ══════════════════════════════════════════════════════════

const SKINS_KEY = 'splitr_skins'
const PREFS_KEY = 'splitr_prefs'

// ══════════════════════════════════════════════════════════
// UNLOCK / CHECK
// ══════════════════════════════════════════════════════════

export function getUnlockedSkins(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(SKINS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function unlockSkin(skinId: string): void {
  const unlocked = getUnlockedSkins()
  unlocked[skinId] = true
  localStorage.setItem(SKINS_KEY, JSON.stringify(unlocked))
}

export function selectSkin(mode: Mode | string, skinId: string): void {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    prefs[`skin_${mode}`] = skinId
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    console.log(`🎨 Selected skin: ${skinId} for mode: ${mode}`)
  } catch (error) {
    console.error('Error selecting skin:', error)
  }
}

export function isSkinUnlocked(skinId: string): boolean {
  return !!getUnlockedSkins()[skinId]
}

// ══════════════════════════════════════════════════════════
// ACTIVE SKIN PER MODE
// ══════════════════════════════════════════════════════════

export function getActiveSkin(mode: Mode | string): SkinDef | null {
  const catalog = SKIN_CATALOG[mode]
  if (!catalog || catalog.length === 0) return null

  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    let skinId = prefs[`skin_${mode}`]
    
    // AUTO-SELECT ONLY EPIC SKINS (the ones with interactive animations)
    if (!skinId && catalog.length > 0) {
      const epicSkins = ['elim_slots', 'elim_chairs', 'elim_bulbs', 'order_race', 'order_podium']
      const epicSkin = catalog.find(s => epicSkins.includes(s.id))
      if (epicSkin) {
        skinId = epicSkin.id
        selectSkin(mode, skinId)
        console.log(`🎨 Auto-selected EPIC skin: ${skinId} for ${mode} mode`)
      } else {
        // No epic skin available for this mode, skip animation
        return null
      }
    }
    
    // Sin skin seleccionado = sin intro canvas (flash scan por defecto)
    if (!skinId) return null

    const skin = catalog.find(s => s.id === skinId)
    if (!skin) return null

    // TEMPORARILY UNLOCK ALL SKINS FOR TESTING
    if (skin.tier === 'pro') {
      unlockSkin(skinId)
    }

    return skin
  } catch {
    return null
  }
}

export function setActiveSkin(mode: Mode | string, skinId: string): void {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    prefs[`skin_${mode}`] = skinId
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // silently fail
  }
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

export function getAllSkins(): SkinDef[] {
  return Object.values(SKIN_CATALOG).flat()
}

export function getSkinById(skinId: string): SkinDef | undefined {
  return getAllSkins().find(s => s.id === skinId)
}

export function getProSkins(): SkinDef[] {
  return getAllSkins().filter(s => s.tier === 'pro')
}

export function getSkinsForMode(mode: string): SkinDef[] {
  return SKIN_CATALOG[mode] || []
}
