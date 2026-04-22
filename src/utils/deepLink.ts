/**
 * Deep links / URL params for Splitr
 * Supports query params: q (question), mode, names (comma-separated)
 *
 * Examples:
 *   /?q=Quién+paga&mode=normal
 *   /?q=Partido+1&mode=team&names=Ana,Luis,Sara,Bob
 */

import type { Mode } from '../types'

const VALID_MODES: Mode[] = [
  'normal', 'elimination', 'team', 'order', 'revenge', 'duel',
  'coin', 'dice', 'bomb', 'split', 'russian', 'voice', 'tournament',
]

export interface DeepLinkPayload {
  question?: string
  mode?: Mode
  names?: string[]
}

/**
 * Parse current URL for deep link params.
 */
export function parseDeepLink(): DeepLinkPayload | null {
  try {
    const url = new URL(window.location.href)
    const q = url.searchParams.get('q') ?? url.searchParams.get('question')
    const modeRaw = url.searchParams.get('mode')
    const namesRaw = url.searchParams.get('names') ?? url.searchParams.get('participants')

    if (!q && !modeRaw && !namesRaw) return null

    const mode = modeRaw && VALID_MODES.includes(modeRaw as Mode) ? (modeRaw as Mode) : undefined
    const names = namesRaw
      ? namesRaw.split(',').map((n) => n.trim()).filter(Boolean).slice(0, 50)
      : undefined

    return {
      question: q ?? undefined,
      mode,
      names,
    }
  } catch {
    return null
  }
}

/**
 * Clear deep link params from URL without reloading (keeps history clean).
 */
export function clearDeepLink(): void {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('q')
    url.searchParams.delete('question')
    url.searchParams.delete('mode')
    url.searchParams.delete('names')
    url.searchParams.delete('participants')
    window.history.replaceState({}, '', url.toString())
  } catch {
    // ignore
  }
}

/**
 * Build a shareable deep link URL for the given payload.
 */
export function buildDeepLink(payload: DeepLinkPayload): string {
  const url = new URL(window.location.origin + window.location.pathname)
  if (payload.question) url.searchParams.set('q', payload.question)
  if (payload.mode) url.searchParams.set('mode', payload.mode)
  if (payload.names && payload.names.length > 0) {
    url.searchParams.set('names', payload.names.join(','))
  }
  return url.toString()
}

/**
 * Copy text to clipboard. Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // Fallback
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}
