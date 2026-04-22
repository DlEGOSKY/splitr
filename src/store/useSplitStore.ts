import { create } from 'zustand'
import type { Mode, Phase, Participant, SessionStats, HistoryEntry, Prefs, SavedGroup } from '../types'

interface SplitState {
  // Core
  mode: Mode
  phase: Phase
  question: string
  participants: Participant[]
  winnerId: string | null
  lastWinnerId: string | null

  // Stats
  sessionStats: SessionStats
  sessionHistory: HistoryEntry[]

  // Groups
  savedGroups: SavedGroup[]

  // Duel
  duelIds: string[]

  // Team
  teamSize: number

  // Prefs
  prefs: Prefs

  // Actions
  setMode: (mode: Mode) => void
  setPhase: (phase: Phase) => void
  setQuestion: (question: string) => void
  setWinner: (id: string | null) => void

  addParticipant: (name: string) => void
  removeParticipant: (id: string) => void
  toggleParticipant: (id: string) => void
  clearParticipants: () => void
  setLuck: (id: string, luck: number) => void
  renameParticipant: (id: string, newName: string) => void
  reorderParticipants: (newOrder: Participant[]) => void

  getActiveParticipants: () => Participant[]

  recordChosen: (id: string) => void
  recordHistory: (winnerId: string, winnerName: string, question: string, mode: Mode) => void
  resetStats: () => void

  setDuelIds: (ids: string[]) => void
  setTeamSize: (size: number) => void

  saveGroup: (name: string) => void
  loadGroup: (name: string) => void
  deleteGroup: (name: string) => void

  updatePrefs: (partial: Partial<Prefs>) => void
}

const generateId = () => crypto.randomUUID()

const DEFAULT_PREFS: Prefs = {
  vibration: true,
  sound: true,
  particles: true,
  flash: true,
  roulette: false,
  narrator: true,
  ritual: false,
  personality: 'neutral',
  glow: 80,
  speed: 100,
  defaultQuestion: '¿Quién paga?',
  theme: 'cyberpunk'
}

export const useSplitStore = create<SplitState>((set, get) => ({
  mode: 'normal',
  phase: 'idle',
  question: '¿Quién paga?',
  participants: loadParticipants(),
  winnerId: null,
  lastWinnerId: null,
  sessionStats: {},
  sessionHistory: [],
  savedGroups: loadGroups(),
  duelIds: [],
  teamSize: 2,
  prefs: loadPrefs(),

  setMode: (mode) => set({ mode }),
  setPhase: (phase) => set({ phase }),
  setQuestion: (question) => set({ question }),
  setWinner: (winnerId) => set((s) => ({ winnerId, lastWinnerId: winnerId || s.lastWinnerId })),

  addParticipant: (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    set((s) => {
      const updated = [
        ...s.participants,
        { id: generateId(), name: trimmed, active: true, luck: 3 }
      ]
      persistParticipants(updated)
      return { participants: updated }
    })
  },

  removeParticipant: (id) =>
    set((s) => {
      const updated = s.participants.filter((p) => p.id !== id)
      persistParticipants(updated)
      return { participants: updated }
    }),

  toggleParticipant: (id) =>
    set((s) => {
      const updated = s.participants.map((p) =>
        p.id === id ? { ...p, active: !p.active } : p
      )
      persistParticipants(updated)
      return { participants: updated }
    }),

  clearParticipants: () => {
    set({ participants: [], sessionStats: {} })
    persistParticipants([])
  },

  setLuck: (id, luck) =>
    set((s) => {
      const updated = s.participants.map((p) =>
        p.id === id ? { ...p, luck: Math.max(1, Math.min(5, luck)) } : p
      )
      persistParticipants(updated)
      return { participants: updated }
    }),

  renameParticipant: (id, newName) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    set((s) => {
      const updated = s.participants.map((p) =>
        p.id === id ? { ...p, name: trimmed } : p
      )
      persistParticipants(updated)
      return { participants: updated }
    })
  },

  reorderParticipants: (newOrder) => {
    persistParticipants(newOrder)
    set({ participants: newOrder })
  },

  getActiveParticipants: () => get().participants.filter((p) => p.active),

  recordChosen: (id) =>
    set((s) => ({
      sessionStats: {
        ...s.sessionStats,
        [id]: { chosen: (s.sessionStats[id]?.chosen ?? 0) + 1 }
      }
    })),

  recordHistory: (winnerId, winnerName, question, mode) =>
    set((s) => ({
      sessionHistory: [
        { winnerId, winnerName, question, mode, timestamp: Date.now() },
        ...s.sessionHistory
      ]
    })),

  resetStats: () => set({ sessionStats: {}, sessionHistory: [] }),

  setDuelIds: (duelIds) => set({ duelIds }),
  setTeamSize: (teamSize) => set({ teamSize }),

  saveGroup: (name) => {
    const members = get().participants.map((p) => ({ name: p.name, luck: p.luck }))
    set((s) => {
      const existing = s.savedGroups.filter((g) => g.name !== name)
      const updated: SavedGroup[] = [...existing, { name, members, savedAt: Date.now(), count: members.length }]
      persistGroups(updated)
      return { savedGroups: updated }
    })
  },

  loadGroup: (name) => {
    const group = get().savedGroups.find((g) => g.name === name)
    if (!group) return
    set({
      participants: group.members.map((m) => ({
        id: generateId(),
        name: m.name,
        active: true,
        luck: m.luck ?? 3
      })),
      sessionStats: {}
    })
  },

  deleteGroup: (name) =>
    set((s) => {
      const updated = s.savedGroups.filter((g) => g.name !== name)
      persistGroups(updated)
      return { savedGroups: updated }
    }),

  updatePrefs: (partial) =>
    set((s) => {
      const updated = { ...s.prefs, ...partial }
      persistPrefs(updated)
      return { prefs: updated }
    })
}))

// Persistence helpers
function loadGroups(): SavedGroup[] {
  try {
    const raw = localStorage.getItem('splitr_groups')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistGroups(groups: SavedGroup[]) {
  localStorage.setItem('splitr_groups', JSON.stringify(groups))
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem('splitr_prefs')
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

function persistPrefs(prefs: Prefs) {
  localStorage.setItem('splitr_prefs', JSON.stringify(prefs))
}

function loadParticipants(): Participant[] {
  try {
    const raw = localStorage.getItem('splitr_participants')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistParticipants(participants: Participant[]) {
  localStorage.setItem('splitr_participants', JSON.stringify(participants))
}
