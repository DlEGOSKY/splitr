import type { Participant, AnimationStep } from '../types'

// ── GENERACIÓN DE NÚMERO ALEATORIO CRIPTOGRÁFICO ──

function secureRandom(max: number): number {
  if (max <= 0) return 0

  const array = new Uint32Array(1)
  const maxUint32 = 0xFFFFFFFF
  const limit = maxUint32 - (maxUint32 % max)

  let value: number
  do {
    crypto.getRandomValues(array)
    value = array[0]
  } while (value > limit)

  return value % max
}

// ── CONSTRUCCIÓN DEL ARRAY PONDERADO ──

function buildWeightedPool(participants: Participant[]): string[] {
  const pool: string[] = []
  for (const p of participants) {
    const weight = 6 - p.luck // inverso: suerte 1 → peso 5
    for (let i = 0; i < weight; i++) {
      pool.push(p.id)
    }
  }
  return pool
}

// ── SELECCIÓN PRINCIPAL ──

export function selectOne(participants: Participant[]): string {
  if (!participants || participants.length === 0) {
    throw new Error('No hay participantes activos.')
  }
  if (participants.length === 1) {
    return participants[0].id
  }

  const pool = buildWeightedPool(participants)
  const index = secureRandom(pool.length)
  return pool[index]
}

export function selectMultiple(participants: Participant[], n: number): string[] {
  const count = Math.min(n, participants.length)
  const remaining = [...participants]
  const selected: string[] = []

  for (let i = 0; i < count; i++) {
    const pool = buildWeightedPool(remaining)
    const index = secureRandom(pool.length)
    const winnerId = pool[index]

    selected.push(winnerId)

    const winnerIndex = remaining.findIndex(p => p.id === winnerId)
    remaining.splice(winnerIndex, 1)
  }

  return selected
}

export function selectOrder(participants: Participant[]): string[] {
  return selectMultiple(participants, participants.length)
}

// ── VENGANZA: peso extra al target ──

export function selectOneWithRevenge(participants: Participant[], targetId: string | null): string {
  if (!participants || participants.length === 0) throw new Error('No hay participantes activos.')
  if (participants.length === 1) return participants[0].id
  if (!targetId) return selectOne(participants)

  const pool: string[] = []
  for (const p of participants) {
    const weight = p.id === targetId ? 5 : Math.max(1, 6 - p.luck)
    for (let i = 0; i < weight; i++) pool.push(p.id)
  }
  return pool[secureRandom(pool.length)]
}

// ── GENERADOR DE SECUENCIA DE ANIMACIÓN ──

export function buildAnimationSequence(
  participants: Participant[],
  winnerId: string,
  totalDuration = 3500
): AnimationStep[] {
  const ids = participants.map(p => p.id)
  const sequence: AnimationStep[] = []
  let elapsed = 0

  // Fase 1: aceleración (primeros 40% del tiempo)
  const accelEnd = totalDuration * 0.4
  let interval = 180
  const minInterval = 60

  while (elapsed < accelEnd) {
    const last = sequence.length > 0 ? sequence[sequence.length - 1].id : null
    const candidates = ids.filter(id => id !== last)
    const idx = secureRandom(candidates.length)

    sequence.push({ id: candidates[idx], delay: elapsed, isFinal: false })
    elapsed += interval
    interval = Math.max(minInterval, interval * 0.85)
  }

  // Fase 2: desaceleración (40%-90% del tiempo)
  const decelEnd = totalDuration * 0.9
  interval = minInterval
  const maxInterval = 550

  while (elapsed < decelEnd) {
    const last = sequence.length > 0 ? sequence[sequence.length - 1].id : null
    const candidates = ids.filter(id => id !== last)
    const idx = secureRandom(candidates.length)

    sequence.push({ id: candidates[idx], delay: elapsed, isFinal: false })
    elapsed += interval
    interval = Math.min(maxInterval, interval * 1.18)
  }

  // Paso final: revelación del ganador
  sequence.push({ id: winnerId, delay: totalDuration, isFinal: true })

  return sequence
}

// ── AUDITORÍA DE PROBABILIDADES ──

export function calculateProbabilities(participants: Participant[]) {
  const totalWeight = participants.reduce((sum, p) => sum + (6 - p.luck), 0)

  return participants.map(p => {
    const weight = 6 - p.luck
    return {
      id: p.id,
      name: p.name,
      luck: p.luck,
      weight,
      probability: totalWeight > 0 ? weight / totalWeight : 0,
      percentage: totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) + '%' : '0%',
    }
  })
}
