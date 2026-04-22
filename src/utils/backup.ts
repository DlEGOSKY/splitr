/**
 * Backup / Restore utilities for Splitr data
 * Exports and imports JSON with participants, groups, prefs, stats
 */

const STORAGE_KEYS = [
  'splitr_participants',
  'splitr_groups',
  'splitr_prefs',
] as const

const APP_VERSION = '3.0.0'

export interface BackupPayload {
  version: string
  exportedAt: string
  data: Record<string, unknown>
}

/**
 * Build a backup object from current localStorage state
 */
export function buildBackup(): BackupPayload {
  const data: Record<string, unknown> = {}
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        data[key] = JSON.parse(raw)
      } catch {
        data[key] = raw
      }
    }
  }
  return {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

/**
 * Trigger a download of the backup as a JSON file
 */
export function exportBackup(): void {
  const payload = buildBackup()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `splitr-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parse and apply a backup JSON payload to localStorage.
 * Returns true on success, false on invalid data.
 */
export function importBackup(json: string): boolean {
  try {
    const payload = JSON.parse(json) as BackupPayload
    if (!payload || typeof payload !== 'object' || !payload.data) return false

    // Apply known keys
    for (const key of STORAGE_KEYS) {
      const value = payload.data[key]
      if (value !== undefined) {
        localStorage.setItem(key, JSON.stringify(value))
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * Read a File (from input) and return its text content
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Wipe all Splitr data from localStorage
 */
export function wipeAllData(): void {
  for (const key of STORAGE_KEYS) {
    localStorage.removeItem(key)
  }
}

/**
 * Convert history entries to CSV format and trigger download.
 * Columns: timestamp, date, winner, question, mode
 */
export interface HistoryRow {
  timestamp: number
  winnerName: string
  question?: string
  mode: string
}

export function exportHistoryCSV(history: HistoryRow[]): void {
  if (!history || history.length === 0) return

  const escape = (s: string) => {
    const v = String(s ?? '')
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`
    }
    return v
  }

  const header = ['timestamp_ms', 'fecha', 'ganador', 'pregunta', 'modo']
  const rows = history.map((e) => [
    String(e.timestamp),
    new Date(e.timestamp).toISOString(),
    escape(e.winnerName),
    escape(e.question ?? ''),
    escape(e.mode),
  ].join(','))

  const csv = [header.join(','), ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `splitr-historial-${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
