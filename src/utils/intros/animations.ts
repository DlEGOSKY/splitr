import { getPerformanceLevel } from '../performance'
import { getActiveSkin } from '../skins'
import type { Participant } from '../../types'

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

/** Safely apply alpha to any color format (hex, hsl, rgb, named) */
function _alpha(color: string, alpha: number): string {
  // Already rgba/hsla → just replace alpha
  if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, `${alpha})`)
  if (color.startsWith('hsla')) return color.replace(/[\d.]+\)$/, `${alpha})`)
  // rgb → rgba
  if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`)
  // hsl → hsla
  if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `,${alpha})`)
  // 3/4 digit hex → expand
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const r = parseInt(color[1]+color[1], 16)
    const g = parseInt(color[2]+color[2], 16)
    const b = parseInt(color[3]+color[3], 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  // 6/8 digit hex
  if (/^#[0-9a-f]{6,8}$/i.test(color)) {
    const r = parseInt(color.slice(1,3), 16)
    const g = parseInt(color.slice(3,5), 16)
    const b = parseInt(color.slice(5,7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  // Fallback: wrap in color-mix or just return with opacity
  return color
}

function _isSlowDevice(): boolean {
  if (getPerformanceLevel() === 'reduced') return true
  const cores = navigator.hardwareConcurrency || 4
  return cores <= 6
}

interface IntroBase {
  overlay: HTMLDivElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  W: number
  H: number
}

function _introBase(dur: number): IntroBase {
  const overlay = document.createElement('div')
  overlay.style.cssText = `position:fixed;inset:0;z-index:9997;background:rgba(4,2,14,0.96);pointer-events:none;animation:overlayFadeIn 180ms ease both;`
  document.body.appendChild(overlay)

  const screenW = window.innerWidth
  const screenH = window.innerHeight
  const W = Math.min(screenW, 480)
  const H = Math.min(screenH, 680)
  const offX = Math.floor((screenW - W) / 2)
  const offY = Math.floor((screenH - H) / 2)

  const canvas = document.createElement('canvas')
  const DPR = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * DPR
  canvas.height = H * DPR
  canvas.style.cssText = `position:absolute;left:${offX}px;top:${offY}px;width:${W}px;height:${H}px;`
  const ctx = canvas.getContext('2d')!
  ctx.scale(DPR, DPR)
  overlay.appendChild(canvas)

  const FADE = 250
  setTimeout(() => { overlay.style.transition = `opacity ${FADE}ms ease`; overlay.style.opacity = '0' }, dur - FADE)
  setTimeout(() => overlay.remove(), dur + 50)

  return { overlay, canvas, ctx, W, H }
}

function _css(prop: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback
}

interface Spark { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number }

function _drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[], gravity: number) {
  sparks.forEach(s => {
    s.x += s.vx; s.y += s.vy; s.vy += gravity; s.alpha -= 0.028
    if (s.alpha <= 0) return
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.alpha, 0, Math.PI * 2)
    ctx.fillStyle = s.color; ctx.globalAlpha = s.alpha; ctx.fill()
  })
  ctx.globalAlpha = 1
}

function _burst(sparks: Spark[], x: number, y: number, n: number, S: number, colors: string[]) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 / n * i + (Math.random() - 0.5) * 0.4
    const spd = (2 + Math.random() * 6) * S
    sparks.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, alpha: 1, color: colors[i % colors.length], size: (2 + Math.random() * 3) * S })
  }
}

// ══════════════════════════════════════════════════════════
// DISPATCHER
// ══════════════════════════════════════════════════════════

// Mapa de todas las animaciones
const INTRO_MAP: Record<string, () => Promise<void>> = {
  normal_crosshair: () => introNormal(),
  normal_missile: () => introNormalMissile(),
  normal_sniper: () => introNormalSniper(),
  elim_bulbs: () => introElimination(),
  elim_chairs: () => introElimChairs(),
  elim_slots: () => introElimSlots(),
  team_orbit: () => introTeam(),
  team_magnet: () => introTeamMagnet(),
  team_cards: () => introTeamCards(),
  order_podium: () => introOrder(),
  order_race: () => introOrderRace(),
  order_wheel: () => introOrderWheel(),
  duel_clash: () => introDuel(),
  duel_western: () => introDuelWestern(),
  duel_boxing: () => introDuelBoxing(),
  revenge_fire: () => introRevenge(),
  revenge_target: () => introRevengeTarget(),
  revenge_storm: () => introRevengeStorm(),
}

export function showModeIntro(mode: string, participants?: Participant[], winnerId?: string): Promise<void> {
  if (getPerformanceLevel() === 'reduced') return Promise.resolve()

  // Russian mode always uses canvas animation (no skin required)
  if (mode === 'russian' && participants && winnerId) {
    return introRussianRouletteInteractive(participants, winnerId)
  }

  // Solo mostrar intro canvas si el usuario tiene un skin comprada
  const skin = getActiveSkin(mode)
  if (!skin) return Promise.resolve() // Sin skin = flash scan por defecto

  if (participants && winnerId) {
    // Elimination
    if (skin.id === 'elim_slots') return introElimSlotsInteractive(participants, winnerId)
    if (skin.id === 'elim_chairs') return introElimChairsInteractive(participants, winnerId)
    if (skin.id === 'elim_bulbs') return introElimBulbsInteractive(participants, winnerId)
    // Normal
    if (skin.id === 'normal_crosshair') return introNormalCrosshairInteractive(participants, winnerId)
    if (skin.id === 'normal_missile') return introNormalMissileInteractive(participants, winnerId)
    if (skin.id === 'normal_sniper') return introNormalSniperInteractive(participants, winnerId)
    // Order
    if (skin.id === 'order_podium') return introOrderPodiumInteractive(participants, winnerId)
    if (skin.id === 'order_race') return introOrderRaceInteractive(participants, winnerId)
    if (skin.id === 'order_wheel') return introOrderWheelInteractive(participants, winnerId)
    // Duel
    if (skin.id === 'duel_clash') return introDuelClashInteractive(participants, winnerId)
    if (skin.id === 'duel_western') return introDuelWesternInteractive(participants, winnerId)
    if (skin.id === 'duel_boxing') return introDuelBoxingInteractive(participants, winnerId)
    // Team
    if (skin.id === 'team_orbit') return introTeamSplitInteractive(participants, winnerId)
    if (skin.id === 'team_magnet') return introTeamMagnetInteractive(participants, winnerId)
    if (skin.id === 'team_cards') return introTeamColorsInteractive(participants, winnerId)
    // Revenge
    if (skin.id === 'revenge_fire') return introRevengeFireInteractive(participants, winnerId)
    if (skin.id === 'revenge_target') return introRevengeTargetInteractive(participants, winnerId)
    if (skin.id === 'revenge_storm') return introRevengeStormInteractive(participants, winnerId)
  }

  return Promise.resolve()
}

/**
 * Preview any intro animation by skinId
 * Usage from console: window.previewIntro('normal_crosshair')
 * Available: normal_crosshair, normal_missile, normal_sniper,
 *            elim_bulbs, elim_chairs, elim_slots,
 *            team_orbit, team_magnet, team_cards,
 *            order_podium, order_race, order_wheel,
 *            duel_clash, duel_western, duel_boxing,
 *            revenge_fire, revenge_target, revenge_storm
 */
export function previewIntro(skinId: string): Promise<void> {
  const fn = INTRO_MAP[skinId]
  if (!fn) {
    console.error(`Unknown skinId: ${skinId}`)
    console.log('Available:', Object.keys(INTRO_MAP).join(', '))
    return Promise.resolve()
  }
  return fn()
}

// Lista de todas las animaciones disponibles
export function listIntros(): string[] {
  return Object.keys(INTRO_MAP)
}

/**
 * Preview Lottie hybrid animations with fake participants
 * Usage from console: window.previewLottie('fire') | 'storm' | 'crosshair'
 */
export function previewLottie(type: 'fire' | 'storm' | 'crosshair'): Promise<void> {
  const fakeParticipants: Participant[] = [
    { id: '1', name: 'Diego', luck: 0, active: true },
    { id: '2', name: 'Ana', luck: 0, active: true },
    { id: '3', name: 'Carlos', luck: 0, active: true },
    { id: '4', name: 'María', luck: 0, active: true },
    { id: '5', name: 'Pedro', luck: 0, active: true },
  ]
  const winnerId = '1'
  if (type === 'fire') return introRevengeFireInteractive(fakeParticipants, winnerId)
  if (type === 'storm') return introRevengeStormInteractive(fakeParticipants, winnerId)
  if (type === 'crosshair') return introNormalCrosshairInteractive(fakeParticipants, winnerId)
  console.error('Available: fire, storm, crosshair')
  return Promise.resolve()
}

// ══════════════════════════════════════════════════════════
// PREMIUM INTROS (solo con skin comprado)
// ══════════════════════════════════════════════════════════

function introNormal(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2000; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.44
    const accent = _css('--color-accent', '#00F5FF')
    
    // Advanced particle system
    interface AdvancedParticle extends Spark {
      trail: {x: number, y: number, alpha: number}[]
      type: 'spark' | 'ember' | 'glow'
      gravity: number
      drag: number
    }
    
    const particles: AdvancedParticle[] = []
    let impacted = false, t = 0
    
    // Smooth easing functions
    const easeInOutQuart = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
    const easeOutElastic = (t: number) => {
      const c4 = (2 * Math.PI) / 3
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
    }

    function addAdvancedBurst(x: number, y: number, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.6
        const speed = (3 + Math.random() * 8) * S
        const type = Math.random() < 0.6 ? 'spark' : Math.random() < 0.8 ? 'ember' : 'glow'
        
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: ['#FFD700', accent, '#FF6B35', '#FF3344'][Math.floor(Math.random() * 4)],
          size: type === 'glow' ? (8 + Math.random() * 12) * S : (2 + Math.random() * 4) * S,
          trail: [],
          type,
          gravity: type === 'glow' ? 0.02 * S : 0.15 * S,
          drag: type === 'ember' ? 0.98 : 0.995
        })
      }
    }

    function drawAdvancedParticles() {
      particles.forEach(p => {
        p.vx *= p.drag; p.vy *= p.drag; p.vy += p.gravity
        p.x += p.vx; p.y += p.vy
        p.alpha -= p.type === 'glow' ? 0.015 : 0.025
        p.trail.push({x: p.x, y: p.y, alpha: p.alpha})
        if (p.trail.length > 8) p.trail.shift()
        if (p.alpha <= 0) return
        if (p.type !== 'glow') {
          p.trail.forEach((point, i) => {
            const trailAlpha = (i / p.trail.length) * point.alpha * 0.6
            ctx.beginPath()
            ctx.arc(point.x, point.y, p.size * 0.5 * (i / p.trail.length), 0, Math.PI * 2)
            ctx.fillStyle = _alpha(p.color, trailAlpha)
            ctx.fill()
          })
        }
        if (p.type === 'glow') {
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          glowGrad.addColorStop(0, _alpha(p.color, p.alpha))
          glowGrad.addColorStop(0.4, _alpha(p.color, p.alpha * 0.6))
          glowGrad.addColorStop(1, _alpha(p.color, 0))
          ctx.fillStyle = glowGrad
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.shadowColor = p.color; ctx.shadowBlur = 8 * S
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = _alpha(p.color, p.alpha); ctx.fill()
          ctx.shadowBlur = 0
        }
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].alpha <= 0) particles.splice(i, 1)
      }
    }

    function draw() {
      // Subtle motion blur
      ctx.fillStyle = 'rgba(4,2,14,0.08)'
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      // Enhanced crosshair rings with smooth animation
      const rings = [90, 70, 50, 32, 16]
      rings.forEach((r: number, i: number) => {
        const show = Math.min(Math.max((p - i * 0.04) / 0.25, 0), 1)
        const er = easeOutElastic(show)
        if (er <= 0) return
        
        const pulse = 1 + 0.08 * Math.sin(t * 0.01 + i * 1.2)
        const isRed = i % 2 === 0
        const outerR = r * S * er * pulse
        
        // Outer glow
        const glowGrad = ctx.createRadialGradient(cx, cy, outerR * 0.8, cx, cy, outerR * 1.3)
        const glowColor = isRed ? 'rgba(230,30,50,' : 'rgba(0,245,255,'
        glowGrad.addColorStop(0, glowColor + (er * 0.1) + ')')
        glowGrad.addColorStop(1, glowColor + '0)')
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(cx, cy, outerR * 1.3, 0, Math.PI * 2)
        ctx.fill()
        
        // Main ring
        ctx.beginPath()
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
        ctx.fillStyle = isRed ? `rgba(160,0,25,${0.15 * er})` : `rgba(255,255,255,${0.04 * er})`
        ctx.fill()
        ctx.strokeStyle = isRed ? `rgba(230,30,50,${er * 0.9})` : `rgba(0,245,255,${er * 0.8})`
        ctx.lineWidth = 2.5 * S
        ctx.stroke()
      })
      
      // Enhanced crosshair lines with rotation
      if (p > 0.05 && p < 0.95) {
        const ca = Math.min((p - 0.05) * 3, 1) * Math.min(1, (0.95 - p) * 8) * 0.4
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(t * 0.002)
        
        // Glowing crosshair
        ctx.shadowColor = accent
        ctx.shadowBlur = 15 * S
        ctx.strokeStyle = `rgba(0,245,255,${ca})`
        ctx.lineWidth = 2 * S
        ctx.setLineDash([12 * S, 8 * S])
        ctx.beginPath()
        ctx.moveTo(-W * 0.6, 0)
        ctx.lineTo(W * 0.6, 0)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, -H * 0.6)
        ctx.lineTo(0, H * 0.6)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.shadowBlur = 0
        ctx.restore()
      }
      
      // Enhanced dart with smooth trajectory
      const dartStart = 0.3
      const dartP = Math.min(Math.max((p - dartStart) / 0.5, 0), 1)
      if (dartP > 0) {
        const ep = easeInOutQuart(dartP)
        const dartY = cy - 200 * S + 200 * S * ep
        
        // Enhanced trail with gradient
        if (ep < 0.95) {
          const trailLength = 80 * S * (1 - ep)
          const trailGrad = ctx.createLinearGradient(cx, dartY - trailLength, cx, dartY)
          trailGrad.addColorStop(0, 'rgba(0,245,255,0)')
          trailGrad.addColorStop(0.3, `rgba(0,245,255,${dartP * 0.2})`)
          trailGrad.addColorStop(1, `rgba(0,245,255,${dartP * 0.7})`)
          ctx.fillStyle = trailGrad
          ctx.fillRect(cx - 3 * S, dartY - trailLength, 6 * S, trailLength)
        }
        
        // Enhanced dart with glow
        ctx.save()
        ctx.translate(cx, dartY)
        ctx.shadowColor = accent
        ctx.shadowBlur = 12 * S
        
        // Dart body
        ctx.fillStyle = accent
        ctx.beginPath()
        ctx.moveTo(0, -28 * S)
        ctx.lineTo(12 * S, 16 * S)
        ctx.lineTo(-12 * S, 16 * S)
        ctx.closePath()
        ctx.fill()
        
        // Dart tip
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.moveTo(0, -35 * S)
        ctx.lineTo(6 * S, -24 * S)
        ctx.lineTo(-6 * S, -24 * S)
        ctx.closePath()
        ctx.fill()
        
        ctx.shadowBlur = 0
        ctx.restore()
        
        // Impact burst
        if (dartP > 0.9 && !impacted) {
          impacted = true
          addAdvancedBurst(cx, cy, slow ? 12 : 20)
        }
      }
      
      // Enhanced impact flash
      if (p > 0.8 && p < 0.92) {
        const fp = (p - 0.8) / 0.12
        const fb = fp < 0.5 ? fp * 2 : 2 - fp * 2
        const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80 * S * fb)
        flashGrad.addColorStop(0, `rgba(255,255,255,${fb * 0.8})`)
        flashGrad.addColorStop(0.6, `rgba(0,245,255,${fb * 0.4})`)
        flashGrad.addColorStop(1, 'rgba(0,245,255,0)')
        ctx.fillStyle = flashGrad
        ctx.beginPath()
        ctx.arc(cx, cy, 80 * S * fb, 0, Math.PI * 2)
        ctx.fill()
      }
      
      drawAdvancedParticles()
      
      // Smooth fadeout at the end
      if (p > 0.88) {
        ctx.fillStyle = `rgba(4,2,14,${Math.min((p - 0.88) / 0.12, 1) * 0.9})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw) // Extended for smooth finish
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200) // Wait a bit longer for complete fade
  })
}

function introElimination(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2100; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cy_b = H * 0.42
    
    interface ElectricalParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'spark' | 'arc' | 'smoke' | 'glass'
      life: number; maxLife: number
      trail?: {x: number, y: number, alpha: number}[]
    }
    
    interface Bulb {
      x: number; y: number; offAt: number; sparked: boolean
      swing: number; swingVel: number
      flickerIntensity: number; lastFlicker: number
      glassShards: ElectricalParticle[]
    }
    
    const bulbs: Bulb[] = [W * 0.25, W * 0.5, W * 0.75].map((x, i) => ({
      x, y: cy_b, offAt: 500 + i * 450, sparked: false,
      swing: 0, swingVel: 0,
      flickerIntensity: 0, lastFlicker: 0,
      glassShards: []
    }))
    
    const particles: ElectricalParticle[] = []
    let t = 0
    
    function addElectricalEffects(x: number, y: number, type: 'burnout' | 'shatter') {
      const count = type === 'burnout' ? (slow ? 8 : 15) : (slow ? 12 : 20)
      
      for (let i = 0; i < count; i++) {
        if (type === 'burnout') {
          // Electrical arcs and sparks
          const angle = Math.random() * Math.PI * 2
          const speed = (2 + Math.random() * 8) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (1 + Math.random() * 3) * S,
            color: ['#00BFFF', '#FFD700', '#fff', '#87CEEB'][Math.floor(Math.random() * 4)],
            type: Math.random() < 0.6 ? 'spark' : 'arc',
            life: 40 + Math.random() * 30,
            maxLife: 70,
            trail: []
          })
        } else {
          // Glass shards
          const angle = Math.random() * Math.PI * 2
          const speed = (1 + Math.random() * 6) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2 * S,
            alpha: 0.9,
            size: (2 + Math.random() * 4) * S,
            color: Math.random() < 0.7 ? '#E6E6FA' : '#F0F8FF',
            type: 'glass',
            life: 80 + Math.random() * 40,
            maxLife: 120
          })
        }
      }
      
      // Add smoke
      for (let i = 0; i < (slow ? 3 : 6); i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 2 * S,
          vy: -(1 + Math.random() * 3) * S,
          alpha: 0.7,
          size: (8 + Math.random() * 12) * S,
          color: '#555',
          type: 'smoke',
          life: 100 + Math.random() * 50,
          maxLife: 150
        })
      }
    }

    function updateParticles() {
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        
        if (p.type === 'spark' || p.type === 'arc') {
          p.vy += 0.15 * S // Gravity
          p.vx *= 0.98
          p.vy *= 0.98
        } else if (p.type === 'glass') {
          p.vy += 0.2 * S // Gravity
          p.vx *= 0.99
        } else if (p.type === 'smoke') {
          p.vx *= 0.95
          p.vy *= 0.95
          p.vy -= 0.05 * S // Smoke rises
        }
        
        // Update trail for sparks and arcs
        if (p.trail) {
          p.trail.push({x: p.x, y: p.y, alpha: p.alpha})
          if (p.trail.length > 8) p.trail.shift()
        }
        
        p.life--
        p.alpha = p.life / p.maxLife
        
        if (p.life <= 0) return
        
        ctx.save()
        ctx.globalAlpha = p.alpha
        
        if (p.trail && p.trail.length > 1) {
          p.trail.forEach((point, i) => {
            const trailAlpha = (i / p.trail!.length) * point.alpha * 0.6
            ctx.beginPath()
            ctx.arc(point.x, point.y, p.size * 0.4, 0, Math.PI * 2)
            ctx.fillStyle = _alpha(p.color, trailAlpha)
            ctx.fill()
          })
        }
        
        if (p.type === 'smoke') {
          const smokeGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          smokeGrad.addColorStop(0, `rgba(85,85,85,${p.alpha * 0.6})`)
          smokeGrad.addColorStop(1, 'rgba(85,85,85,0)')
          ctx.fillStyle = smokeGrad
        } else if (p.type === 'arc') {
          ctx.shadowColor = p.color; ctx.shadowBlur = 8 * S; ctx.fillStyle = p.color
        } else {
          ctx.shadowColor = p.color; ctx.shadowBlur = 4 * S; ctx.fillStyle = p.color
        }
        
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0; ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function drawBulb(bulb: Bulb, lit: boolean, dying: boolean) {
      const currentTime = t
      
      // Physics-based swinging
      if (lit || dying) {
        const swingForce = lit ? 0.001 : 0.003 // Dying bulbs swing more
        bulb.swingVel += Math.sin(currentTime * 0.01 + bulb.x * 0.001) * swingForce
        bulb.swingVel *= 0.995 // Damping
        bulb.swing += bulb.swingVel
        bulb.swing = Math.max(-8, Math.min(8, bulb.swing)) // Limit swing
      }
      
      // Enhanced flickering for dying bulbs
      if (dying) {
        if (currentTime - bulb.lastFlicker > 50 + Math.random() * 100) {
          bulb.flickerIntensity = Math.random()
          bulb.lastFlicker = currentTime
        }
      }
      
      const swingX = bulb.x + bulb.swing * S
      const alpha = dying ? (bulb.flickerIntensity > 0.3 ? 0.1 + Math.random() * 0.3 : 1) : 1
      
      ctx.save()
      ctx.globalAlpha = alpha
      
      // Enhanced wire with tension
      const wireGrad = ctx.createLinearGradient(bulb.x, 0, swingX, bulb.y - 32 * S)
      wireGrad.addColorStop(0, '#666')
      wireGrad.addColorStop(1, '#333')
      ctx.strokeStyle = wireGrad
      ctx.lineWidth = 2.5 * S
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(bulb.x, 0)
      
      // Curved wire for more realistic physics
      const midX = (bulb.x + swingX) / 2
      const midY = (bulb.y - 32 * S) / 2 - Math.abs(bulb.swing) * 0.5 * S
      ctx.quadraticCurveTo(midX, midY, swingX, bulb.y - 32 * S)
      ctx.stroke()
      
      // Bulb socket
      ctx.fillStyle = '#2A2A2A'
      ctx.fillRect(swingX - 8 * S, bulb.y - 38 * S, 16 * S, 12 * S)
      
      // Main bulb
      ctx.beginPath()
      ctx.arc(swingX, bulb.y, 28 * S, 0, Math.PI * 2)
      
      if (lit) {
        // Lit bulb with enhanced gradient
        const bulbGrad = ctx.createRadialGradient(
          swingX - 8 * S, bulb.y - 10 * S, 3 * S,
          swingX, bulb.y, 28 * S
        )
        bulbGrad.addColorStop(0, 'rgba(255,255,240,1)')
        bulbGrad.addColorStop(0.3, 'rgba(255,235,120,0.98)')
        bulbGrad.addColorStop(0.7, 'rgba(255,200,80,0.95)')
        bulbGrad.addColorStop(1, 'rgba(255,160,40,0.9)')
        ctx.fillStyle = bulbGrad
        
        // Filament
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,180,60,0.8)'
        ctx.lineWidth = 1.5 * S
        ctx.beginPath()
        ctx.moveTo(swingX - 6 * S, bulb.y - 8 * S)
        ctx.lineTo(swingX + 6 * S, bulb.y + 8 * S)
        ctx.moveTo(swingX + 6 * S, bulb.y - 8 * S)
        ctx.lineTo(swingX - 6 * S, bulb.y + 8 * S)
        ctx.stroke()
        
      } else {
        // Dead bulb
        const deadGrad = ctx.createRadialGradient(
          swingX - 5 * S, bulb.y - 5 * S, 2 * S,
          swingX, bulb.y, 28 * S
        )
        deadGrad.addColorStop(0, 'rgba(40,40,50,0.95)')
        deadGrad.addColorStop(1, 'rgba(15,15,25,0.98)')
        ctx.fillStyle = deadGrad
        ctx.fill()
        
        // Broken filament
        ctx.strokeStyle = 'rgba(80,60,40,0.6)'
        ctx.lineWidth = 1 * S
        ctx.beginPath()
        ctx.moveTo(swingX - 6 * S, bulb.y - 8 * S)
        ctx.lineTo(swingX - 1 * S, bulb.y - 2 * S)
        ctx.moveTo(swingX + 2 * S, bulb.y + 1 * S)
        ctx.lineTo(swingX + 6 * S, bulb.y + 8 * S)
        ctx.stroke()
      }
      
      // Glow effect for lit bulbs
      if (lit) {
        const glowSizes = [65, 50, 38]
        const glowAlphas = [0.08, 0.12, 0.18]
        
        glowSizes.forEach((size, i) => {
          const glowGrad = ctx.createRadialGradient(swingX, bulb.y, 0, swingX, bulb.y, size * S)
          glowGrad.addColorStop(0, `rgba(255,220,100,${glowAlphas[i]})`)
          glowGrad.addColorStop(1, 'rgba(255,220,100,0)')
          ctx.fillStyle = glowGrad
          ctx.beginPath()
          ctx.arc(swingX, bulb.y, size * S, 0, Math.PI * 2)
          ctx.fill()
        })
      }
      
      ctx.restore()
    }

    function draw() {
      // Dark background
      ctx.fillStyle = 'rgba(8,8,12,0.1)'
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      bulbs.forEach(bulb => {
        const isLit = t < bulb.offAt
        const isDying = !isLit && t < bulb.offAt + 300
        
        // Trigger effects when bulb dies
        if (!isLit && !bulb.sparked && t > bulb.offAt + 150) {
          bulb.sparked = true
          addElectricalEffects(bulb.x + bulb.swing * S, bulb.y, 'burnout')
          
          // Add glass shatter effect
          setTimeout(() => {
            addElectricalEffects(bulb.x + bulb.swing * S, bulb.y, 'shatter')
          }, 100)
        }
        
        drawBulb(bulb, isLit, isDying)
      })
      
      updateParticles()
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(8,8,12,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

function introTeam(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2000; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const primary = _css('--color-primary', '#7B2FBE')
    const cx = W / 2, cy = H * 0.42
    
    interface TeamParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'member' | 'spark' | 'laser' | 'barrier'
      life: number; maxLife: number
      team: number; originalX: number; originalY: number
      trail?: {x: number, y: number, alpha: number}[]
    }
    
    const particles: TeamParticle[] = []
    const N = slow ? 8 : 12
    
    // Create team members in a circle
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 / N) * i
      const radius = 50 * S + Math.random() * 20 * S
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius * 0.7
      
      particles.push({
        x, y, vx: 0, vy: 0,
        alpha: 1,
        size: (6 + Math.random() * 4) * S,
        color: i < N / 2 ? accent : primary,
        type: 'member',
        life: 1000,
        maxLife: 1000,
        team: i < N / 2 ? 0 : 1,
        originalX: x,
        originalY: y,
        trail: []
      })
    }
    
    let laserActive = false, splitTriggered = false, t = 0
    
    // Smooth easing
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const easeOutBack = (t: number) => {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    }

    function addSplitEffects(x: number, y: number, type: 'laser' | 'barrier' | 'sparks') {
      const count = type === 'laser' ? (slow ? 8 : 15) : 
                   type === 'barrier' ? (slow ? 6 : 10) : 
                   (slow ? 10 : 18)
      
      for (let i = 0; i < count; i++) {
        if (type === 'laser') {
          // Laser particles along the division line
          particles.push({
            x, y: Math.random() * H,
            vx: (Math.random() - 0.5) * 2 * S,
            vy: (Math.random() - 0.5) * 2 * S,
            alpha: 1,
            size: (1 + Math.random() * 3) * S,
            color: '#FF0000',
            type: 'laser',
            life: 40 + Math.random() * 30,
            maxLife: 70,
            team: -1,
            originalX: x,
            originalY: y
          })
        } else if (type === 'barrier') {
          // Energy barrier effects
          particles.push({
            x, y: y + (Math.random() - 0.5) * 100 * S,
            vx: 0,
            vy: (Math.random() - 0.5) * 1 * S,
            alpha: 0.8,
            size: (3 + Math.random() * 5) * S,
            color: '#FFFFFF',
            type: 'barrier',
            life: 60 + Math.random() * 40,
            maxLife: 100,
            team: -1,
            originalX: x,
            originalY: y
          })
        } else {
          // Split sparks
          const angle = Math.random() * Math.PI * 2
          const speed = (2 + Math.random() * 6) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (2 + Math.random() * 4) * S,
            color: Math.random() < 0.5 ? accent : primary,
            type: 'spark',
            life: 50 + Math.random() * 30,
            maxLife: 80,
            team: -1,
            originalX: x,
            originalY: y
          })
        }
      }
    }

    function updateParticles() {
      const p = Math.min(t / DUR, 1)
      const splitPhase = Math.min(Math.max((p - 0.3) / 0.4, 0), 1)
      const splitEase = easeInOutCubic(splitPhase)
      
      particles.forEach(particle => {
        if (particle.type === 'member') {
          // Team separation physics
          if (splitPhase > 0) {
            const targetOffset = splitEase * 120 * S
            const targetX = cx + (particle.team === 0 ? -targetOffset : targetOffset)
            const targetY = particle.originalY
            
            // Smooth movement to team side
            const dx = targetX - particle.x
            const dy = targetY - particle.y
            particle.vx += dx * 0.02
            particle.vy += dy * 0.02
            
            // Apply velocity with damping
            particle.x += particle.vx
            particle.y += particle.vy
            particle.vx *= 0.95
            particle.vy *= 0.95
            
            // Update trail
            if (particle.trail) {
              particle.trail.push({x: particle.x, y: particle.y, alpha: particle.alpha})
              if (particle.trail.length > 10) particle.trail.shift()
            }
          }
          
        } else if (particle.type === 'spark') {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vy += 0.1 * S // Light gravity
          particle.vx *= 0.98
          particle.vy *= 0.98
          
        } else if (particle.type === 'laser') {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vx *= 0.99
          particle.vy *= 0.99
          
        } else if (particle.type === 'barrier') {
          particle.y += particle.vy
          particle.vy *= 0.99
        }
        
        particle.life--
        particle.alpha = particle.life / particle.maxLife
        
        if (particle.life <= 0 && particle.type !== 'member') return
        
        ctx.save()
        ctx.globalAlpha = particle.alpha
        
        if (particle.trail && particle.trail.length > 1) {
          particle.trail.forEach((point, i) => {
            const trailAlpha = (i / particle.trail!.length) * point.alpha * 0.5
            ctx.beginPath()
            ctx.arc(point.x, point.y, particle.size * 0.4, 0, Math.PI * 2)
            ctx.fillStyle = _alpha(particle.color, trailAlpha)
            ctx.fill()
          })
        }
        
        if (particle.type === 'member') {
          const memberGrad = ctx.createRadialGradient(
            particle.x - particle.size * 0.3, particle.y - particle.size * 0.3, 0,
            particle.x, particle.y, particle.size
          )
          memberGrad.addColorStop(0, '#fff')
          memberGrad.addColorStop(0.3, particle.color)
          memberGrad.addColorStop(0.8, _alpha(particle.color, 0.8))
          memberGrad.addColorStop(1, _alpha(particle.color, 0.4))
          ctx.fillStyle = memberGrad
          if (splitPhase > 0.2) { ctx.shadowColor = particle.color; ctx.shadowBlur = 8 * S * splitPhase }
        } else if (particle.type === 'laser') {
          ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 6 * S; ctx.fillStyle = '#FF0000'
        } else if (particle.type === 'barrier') {
          ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 4 * S; ctx.fillStyle = '#FFFFFF'
        } else {
          ctx.shadowColor = particle.color; ctx.shadowBlur = 4 * S; ctx.fillStyle = particle.color
        }
        
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill(); ctx.shadowBlur = 0; ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0 && particles[i].type !== 'member') particles.splice(i, 1)
      }
    }

    function drawDivisionLaser() {
      const p = Math.min(t / DUR, 1)
      const laserPhase = Math.min(Math.max((p - 0.25) / 0.3, 0), 1)
      
      if (laserPhase > 0) {
        if (!laserActive) {
          laserActive = true
          // Add laser particles
          for (let i = 0; i < 20; i++) {
            addSplitEffects(cx, Math.random() * H, 'laser')
          }
        }
        
        const laserAlpha = laserPhase * 0.8
        const laserWidth = 4 * S * laserPhase
        const pulse = 1 + Math.sin(t * 0.1) * 0.3
        
        // Main laser beam
        ctx.save()
        ctx.shadowColor = '#FF0000'
        ctx.shadowBlur = 12 * S * pulse
        ctx.strokeStyle = `rgba(255,0,0,${laserAlpha})`
        ctx.lineWidth = laserWidth * pulse
        ctx.beginPath()
        ctx.moveTo(cx, 0)
        ctx.lineTo(cx, H)
        ctx.stroke()
        
        // Inner core
        ctx.strokeStyle = `rgba(255,255,255,${laserAlpha * 0.8})`
        ctx.lineWidth = laserWidth * 0.3
        ctx.beginPath()
        ctx.moveTo(cx, 0)
        ctx.lineTo(cx, H)
        ctx.stroke()
        
        ctx.restore()
        
        // Add barrier effects periodically
        if (Math.random() < 0.1) {
          addSplitEffects(cx, cy + (Math.random() - 0.5) * H * 0.6, 'barrier')
        }
      }
    }

    function drawTeamLabels() {
      const p = Math.min(t / DUR, 1)
      const labelPhase = Math.min(Math.max((p - 0.7) / 0.3, 1), 1)
      
      if (labelPhase > 0) {
        const splitEase = Math.min(Math.max((p - 0.3) / 0.4, 0), 1)
        const offset = easeInOutCubic(splitEase) * 120 * S
        const labelAlpha = easeOutBack(labelPhase)
        const pulse = 1 + Math.sin(t * 0.05) * 0.1
        
        ctx.save()
        ctx.globalAlpha = labelAlpha
        
        // Team A
        ctx.shadowColor = accent
        ctx.shadowBlur = 10 * S * pulse
        ctx.fillStyle = accent
        ctx.font = `bold ${Math.round(42 * S * pulse)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('A', cx - offset, cy + 100 * S)
        
        // Team B
        ctx.shadowColor = primary
        ctx.shadowBlur = 10 * S * pulse
        ctx.fillStyle = primary
        ctx.fillText('B', cx + offset, cy + 100 * S)
        
        ctx.restore()
      }
    }

    function draw() {
      // Dark background with subtle gradient
      const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7)
      bgGrad.addColorStop(0, 'rgba(10,10,20,0.95)')
      bgGrad.addColorStop(1, 'rgba(5,5,10,0.98)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      // Trigger split effects
      if (p > 0.4 && !splitTriggered) {
        splitTriggered = true
        addSplitEffects(cx, cy, 'sparks')
      }
      
      drawDivisionLaser()
      updateParticles()
      drawTeamLabels()
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(10,10,20,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

function introOrder(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2500; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, baseY = H * 0.72, barW = 50 * S
    
    interface CelebrationParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'confetti' | 'firework' | 'star' | 'ribbon' | 'medal'
      life: number; maxLife: number
      rotation: number; rotationSpeed: number
      shape: 'rect' | 'circle' | 'star' | 'medal'
    }
    
    const particles: CelebrationParticle[] = []
    const podium = [
      { label: '2°', color: '#C0C0C0', metallic: '#E8E8E8', targetH: 85 * S, x: cx - 70 * S, delay: 0.35, risen: false },
      { label: '1°', color: '#FFD700', metallic: '#FFF700', targetH: 120 * S, x: cx, delay: 0.28, risen: false },
      { label: '3°', color: '#CD7F32', metallic: '#E6A85C', targetH: 65 * S, x: cx + 70 * S, delay: 0.42, risen: false }
    ]
    
    let fireworksLaunched = false, t = 0
    
    // Smooth easing
    const easeOutBounce = (t: number) => {
      const n1 = 7.5625
      const d1 = 2.75
      if (t < 1 / d1) return n1 * t * t
      else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
      else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
      else return n1 * (t -= 2.625 / d1) * t + 0.984375
    }

    function addCelebrationEffects(x: number, y: number, type: 'confetti' | 'fireworks' | 'podium_rise' | 'medal_shower') {
      const count = type === 'confetti' ? (slow ? 15 : 30) : 
                   type === 'fireworks' ? (slow ? 8 : 15) : 
                   type === 'podium_rise' ? (slow ? 10 : 20) : 
                   (slow ? 5 : 10)
      
      for (let i = 0; i < count; i++) {
        if (type === 'confetti') {
          const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
          particles.push({
            x: x + (Math.random() - 0.5) * 100 * S,
            y: y - Math.random() * 50 * S,
            vx: (Math.random() - 0.5) * 8 * S,
            vy: -(2 + Math.random() * 6) * S,
            alpha: 1,
            size: (4 + Math.random() * 8) * S,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: 'confetti',
            life: 120 + Math.random() * 80,
            maxLife: 200,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            shape: Math.random() < 0.5 ? 'rect' : 'circle'
          })
        } else if (type === 'fireworks') {
          const angle = Math.random() * Math.PI * 2
          const speed = (3 + Math.random() * 10) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (2 + Math.random() * 4) * S,
            color: '#FFD700',
            type: 'firework',
            life: 60 + Math.random() * 40,
            maxLife: 100,
            rotation: 0,
            rotationSpeed: 0,
            shape: 'star'
          })
        } else if (type === 'podium_rise') {
          particles.push({
            x: x + (Math.random() - 0.5) * 60 * S,
            y: y + Math.random() * 20 * S,
            vx: (Math.random() - 0.5) * 3 * S,
            vy: -(1 + Math.random() * 3) * S,
            alpha: 0.8,
            size: (2 + Math.random() * 4) * S,
            color: '#FFD700',
            type: 'star',
            life: 80 + Math.random() * 40,
            maxLife: 120,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            shape: 'star'
          })
        } else {
          // Medal shower
          particles.push({
            x: x + (Math.random() - 0.5) * 40 * S,
            y: y - Math.random() * 30 * S,
            vx: (Math.random() - 0.5) * 4 * S,
            vy: -(1 + Math.random() * 4) * S,
            alpha: 1,
            size: (6 + Math.random() * 8) * S,
            color: '#FFD700',
            type: 'medal',
            life: 100 + Math.random() * 60,
            maxLife: 160,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            shape: 'medal'
          })
        }
      }
    }

    function updateParticles() {
      particles.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.rotation += particle.rotationSpeed
        
        if (particle.type === 'confetti') {
          particle.vy += 0.15 * S // Gravity
          particle.vx *= 0.99
          particle.vy *= 0.99
        } else if (particle.type === 'firework') {
          particle.vx *= 0.96
          particle.vy *= 0.96
        } else if (particle.type === 'star') {
          particle.vy += 0.1 * S // Light gravity
          particle.vx *= 0.98
        } else if (particle.type === 'medal') {
          particle.vy += 0.2 * S // Heavy gravity
          particle.vx *= 0.97
        }
        
        particle.life--
        particle.alpha = particle.life / particle.maxLife
        
        if (particle.life <= 0) return
        
        ctx.save()
        ctx.globalAlpha = particle.alpha
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.rotation)
        
        if (particle.shape === 'rect') {
          ctx.fillStyle = particle.color
          ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size * 1.5)
        } else if (particle.shape === 'circle') {
          ctx.fillStyle = particle.color
          ctx.beginPath(); ctx.arc(0, 0, particle.size/2, 0, Math.PI * 2); ctx.fill()
        } else if (particle.shape === 'star') {
          ctx.fillStyle = particle.color; ctx.shadowColor = particle.color; ctx.shadowBlur = 4 * S
          drawStar(0, 0, particle.size/2, 5)
        } else if (particle.shape === 'medal') {
          ctx.fillStyle = particle.color; ctx.shadowColor = particle.color; ctx.shadowBlur = 6 * S
          ctx.beginPath(); ctx.arc(0, 0, particle.size/2, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#FF6B6B'; ctx.fillRect(-particle.size/4, -particle.size, particle.size/2, particle.size/2)
        }
        
        ctx.shadowBlur = 0; ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function drawStar(x: number, y: number, radius: number, points: number) {
      const angle = Math.PI / points
      ctx.beginPath()
      for (let i = 0; i < 2 * points; i++) {
        const r = i % 2 === 0 ? radius : radius * 0.5
        const a = i * angle
        const px = x + Math.cos(a) * r
        const py = y + Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    }

    function drawCountdown() {
      const p = Math.min(t / DUR, 1)
      if (p < 0.28) {
        const cp = p / 0.28
        const digit = cp < 0.33 ? '3' : cp < 0.66 ? '2' : '1'
        const dp = (cp % 0.333) / 0.333
        const scale = dp < 0.2 ? dp * 5 : dp > 0.8 ? (1 - (dp - 0.8) * 5) : 1
        const bounce = 1 + 0.25 * Math.sin(dp * Math.PI)
        const pulse = 1 + Math.sin(t * 0.2) * 0.1
        
        ctx.save()
        ctx.shadowColor = '#FFD700'
        ctx.shadowBlur = 20 * S * pulse
        ctx.fillStyle = '#FFD700'
        ctx.font = `bold ${Math.round(80 * S * scale * bounce)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.globalAlpha = Math.min(scale * 3, 1)
        ctx.fillText(digit, cx, H * 0.45)
        ctx.restore()
      }
    }

    function drawOlympicPodium() {
      const p = Math.min(t / DUR, 1)
      
      podium.forEach((pod, idx) => {
        const buildPhase = Math.max(0, Math.min((p - pod.delay) / 0.4, 1))
        const buildEase = easeOutBounce(buildPhase)
        const currentHeight = pod.targetH * buildEase
        
        if (currentHeight < 1) return
        
        // Trigger rise effects
        if (buildPhase > 0.1 && !pod.risen) {
          pod.risen = true
          addCelebrationEffects(pod.x, baseY, 'podium_rise')
        }
        
        // Podium base with 3D effect
        const podiumGrad = ctx.createLinearGradient(
          pod.x - barW/2, baseY - currentHeight,
          pod.x + barW/2, baseY
        )
        podiumGrad.addColorStop(0, pod.metallic)
        podiumGrad.addColorStop(0.3, pod.color)
        podiumGrad.addColorStop(0.7, _alpha(pod.color, 0.8))
        podiumGrad.addColorStop(1, _alpha(pod.color, 0.53))
        
        ctx.save()
        
        // Podium glow
        if (idx === 1) { // Gold podium gets extra glow
          ctx.shadowColor = '#FFD700'
          ctx.shadowBlur = 15 * S
        }
        
        ctx.fillStyle = podiumGrad
        ctx.fillRect(pod.x - barW/2, baseY - currentHeight, barW, currentHeight)
        
        // Podium border
        ctx.strokeStyle = pod.color
        ctx.lineWidth = 3 * S
        ctx.strokeRect(pod.x - barW/2, baseY - currentHeight, barW, currentHeight)
        
        // Top highlight
        ctx.fillStyle = pod.metallic + 'AA'
        ctx.fillRect(pod.x - barW/2, baseY - currentHeight, barW, 4 * S)
        
        ctx.restore()
        
        // Position label
        if (buildPhase > 0.6) {
          const labelPhase = Math.min((buildPhase - 0.6) / 0.4, 1)
          const labelPulse = 1 + Math.sin(t * 0.1 + idx) * 0.15
          
          ctx.save()
          ctx.shadowColor = pod.color
          ctx.shadowBlur = 10 * S * labelPulse
          ctx.fillStyle = pod.color
          ctx.font = `bold ${Math.round(36 * S * labelPhase * labelPulse)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.globalAlpha = labelPhase
          ctx.fillText(pod.label, pod.x, baseY - currentHeight - 25 * S)
          ctx.restore()
        }
      })
    }

    function drawCelebrationEffects() {
      const p = Math.min(t / DUR, 1)
      
      // Launch fireworks when podiums are built
      if (p > 0.7 && !fireworksLaunched) {
        fireworksLaunched = true
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            addCelebrationEffects(
              cx + (Math.random() - 0.5) * W * 0.6,
              H * 0.3 + Math.random() * H * 0.2,
              'fireworks'
            )
          }, i * 200)
        }
      }
      
      // Continuous confetti after podiums rise
      if (p > 0.5 && Math.random() < 0.08) {
        addCelebrationEffects(
          Math.random() * W,
          -20 * S,
          'confetti'
        )
      }
      
      // Medal shower for winner
      if (p > 0.8 && Math.random() < 0.05) {
        addCelebrationEffects(cx, H * 0.2, 'medal_shower')
      }
    }

    function draw() {
      // Olympic ceremony background
      const bgGrad = ctx.createRadialGradient(cx, H/2, 0, cx, H/2, Math.max(W, H))
      bgGrad.addColorStop(0, 'rgba(25,35,50,0.95)')
      bgGrad.addColorStop(0.7, 'rgba(15,20,30,0.98)')
      bgGrad.addColorStop(1, 'rgba(10,10,20,1)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      drawCountdown()
      drawOlympicPodium()
      drawCelebrationEffects()
      updateParticles()
      
      // Victory message
      if (p > 0.85) {
        const victoryPhase = Math.min((p - 0.85) / 0.15, 1)
        const victoryPulse = 1 + Math.sin(t * 0.12) * 0.2
        
        ctx.save()
        ctx.globalAlpha = victoryPhase
        ctx.shadowColor = '#FFD700'
        ctx.shadowBlur = 20 * S * victoryPulse
        ctx.fillStyle = '#FFD700'
        ctx.font = `bold ${Math.round(28 * S * victoryPulse)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🏆 CHAMPIONS! 🏆', cx, H * 0.15)
        ctx.restore()
      }
      
      // Smooth fadeout
      if (p > 0.9) {
        ctx.fillStyle = `rgba(25,35,50,${Math.min((p - 0.9) / 0.1, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

function introDuel(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2600; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const cx = W / 2, cy = H * 0.44
    
    interface DuelParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'dust' | 'tumbleweed' | 'spark' | 'muzzle' | 'smoke'
      life: number; maxLife: number
      rotation: number; rotationSpeed: number
    }
    
    interface Duelist {
      x: number; y: number; color: string
      startX: number; targetX: number
      hat: boolean; gunDrawn: boolean
      walkPhase: number; stance: 'walking' | 'ready' | 'draw' | 'fired'
    }
    
    const particles: DuelParticle[] = []
    const duelists: Duelist[] = [
      { x: W * 0.1, y: cy, color: accent, startX: W * 0.1, targetX: cx - 80 * S, hat: true, gunDrawn: false, walkPhase: 0, stance: 'walking' },
      { x: W * 0.9, y: cy, color: impact, startX: W * 0.9, targetX: cx + 80 * S, hat: true, gunDrawn: false, walkPhase: 0, stance: 'walking' }
    ]
    
    let gunsDrawn = false, duelFired = false, t = 0
    
    // Smooth easing
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const easeOutBack = (t: number) => {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    }

    function addWesternEffects(x: number, y: number, type: 'dust_walk' | 'dust_cloud' | 'muzzle_flash' | 'gun_smoke' | 'tumbleweed') {
      const count = type === 'dust_walk' ? (slow ? 2 : 4) : 
                   type === 'dust_cloud' ? (slow ? 8 : 15) : 
                   type === 'muzzle_flash' ? (slow ? 6 : 12) : 
                   type === 'gun_smoke' ? (slow ? 4 : 8) : 
                   1 // tumbleweed
      
      for (let i = 0; i < count; i++) {
        if (type === 'dust_walk') {
          particles.push({
            x: x + (Math.random() - 0.5) * 15 * S,
            y: y + Math.random() * 10 * S,
            vx: (Math.random() - 0.5) * 2 * S,
            vy: -(Math.random() * 2) * S,
            alpha: 0.6,
            size: (2 + Math.random() * 4) * S,
            color: '#D2B48C',
            type: 'dust',
            life: 40 + Math.random() * 30,
            maxLife: 70,
            rotation: 0,
            rotationSpeed: 0
          })
        } else if (type === 'dust_cloud') {
          particles.push({
            x: x + (Math.random() - 0.5) * 40 * S,
            y: y + (Math.random() - 0.5) * 20 * S,
            vx: (Math.random() - 0.5) * 4 * S,
            vy: -(1 + Math.random() * 3) * S,
            alpha: 0.7,
            size: (6 + Math.random() * 12) * S,
            color: '#DEB887',
            type: 'dust',
            life: 80 + Math.random() * 60,
            maxLife: 140,
            rotation: 0,
            rotationSpeed: 0
          })
        } else if (type === 'muzzle_flash') {
          const angle = Math.random() * Math.PI * 2
          const speed = (4 + Math.random() * 8) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (2 + Math.random() * 4) * S,
            color: '#FFD700',
            type: 'muzzle',
            life: 20 + Math.random() * 15,
            maxLife: 35,
            rotation: 0,
            rotationSpeed: 0
          })
        } else if (type === 'gun_smoke') {
          particles.push({
            x: x + (Math.random() - 0.5) * 10 * S,
            y: y - Math.random() * 15 * S,
            vx: (Math.random() - 0.5) * 3 * S,
            vy: -(2 + Math.random() * 4) * S,
            alpha: 0.8,
            size: (8 + Math.random() * 15) * S,
            color: '#708090',
            type: 'smoke',
            life: 100 + Math.random() * 80,
            maxLife: 180,
            rotation: 0,
            rotationSpeed: 0
          })
        } else {
          // Tumbleweed
          particles.push({
            x: -50 * S,
            y: cy + 20 * S + Math.random() * 30 * S,
            vx: (2 + Math.random() * 4) * S,
            vy: 0,
            alpha: 0.8,
            size: (15 + Math.random() * 20) * S,
            color: '#8B4513',
            type: 'tumbleweed',
            life: 300 + Math.random() * 200,
            maxLife: 500,
            rotation: 0,
            rotationSpeed: 0.05 + Math.random() * 0.1
          })
        }
      }
    }

    function updateParticles() {
      particles.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.rotation += particle.rotationSpeed
        
        if (particle.type === 'dust') {
          particle.vy += 0.1 * S // Light gravity
          particle.vx *= 0.98
          particle.size *= 1.01 // Expand slightly
        } else if (particle.type === 'muzzle') {
          particle.vx *= 0.95
          particle.vy *= 0.95
        } else if (particle.type === 'smoke') {
          particle.vy *= 0.98 // Slow rise
          particle.vx *= 0.99
          particle.size *= 1.02 // Expand
        } else if (particle.type === 'tumbleweed') {
          // Bounce occasionally
          if (particle.y > cy + 40 * S && particle.vy >= 0) {
            particle.vy = -(1 + Math.random() * 3) * S
          } else {
            particle.vy += 0.15 * S // Gravity
          }
          particle.vx *= 0.995
        }
        
        particle.life--
        particle.alpha = particle.life / particle.maxLife
        
        if (particle.life <= 0 || particle.x > W + 100 * S) return
        
        ctx.save()
        ctx.globalAlpha = particle.alpha
        
        if (particle.type === 'dust') {
          const dustGrad = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          )
          dustGrad.addColorStop(0, _alpha(particle.color, 0.67))
          dustGrad.addColorStop(1, _alpha(particle.color, 0))
          ctx.fillStyle = dustGrad
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
        } else if (particle.type === 'muzzle') {
          ctx.shadowColor = particle.color
          ctx.shadowBlur = 8 * S
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
        } else if (particle.type === 'smoke') {
          const smokeGrad = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          )
          smokeGrad.addColorStop(0, `rgba(112,128,144,${particle.alpha})`)
          smokeGrad.addColorStop(1, 'rgba(112,128,144,0)')
          ctx.fillStyle = smokeGrad
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
        } else if (particle.type === 'tumbleweed') {
          ctx.translate(particle.x, particle.y)
          ctx.rotate(particle.rotation)
          ctx.fillStyle = particle.color
          
          // Draw tumbleweed as spiky circle
          const spikes = 8
          ctx.beginPath()
          for (let i = 0; i < spikes * 2; i++) {
            const angle = (i / (spikes * 2)) * Math.PI * 2
            const radius = i % 2 === 0 ? particle.size : particle.size * 0.6
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
        }
        
        ctx.shadowBlur = 0
        ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        const pp = particles[i]
        if (pp.life <= 0 || pp.x > W + 100 * S) particles.splice(i, 1)
      }
    }

    function drawDuelists() {
      const p = Math.min(t / DUR, 1)
      const walkPhase = Math.min(Math.max((p - 0.1) / 0.4, 0), 1)
      const readyPhase = Math.min(Math.max((p - 0.6) / 0.2, 0), 1)
      const drawPhase = Math.min(Math.max((p - 0.8) / 0.1, 0), 1)
      
      duelists.forEach((duelist, idx) => {
        // Update position during walk
        if (walkPhase > 0 && duelist.stance === 'walking') {
          const walkEase = easeInOutCubic(walkPhase)
          duelist.x = duelist.startX + (duelist.targetX - duelist.startX) * walkEase
          duelist.walkPhase += 0.3
          
          // Add dust while walking
          if (Math.random() < 0.3) {
            addWesternEffects(duelist.x, duelist.y + 25 * S, 'dust_walk')
          }
          
          if (walkPhase >= 1) {
            duelist.stance = 'ready'
          }
        }
        
        // Update stance
        if (readyPhase > 0 && duelist.stance === 'ready') {
          if (readyPhase >= 1) {
            duelist.stance = 'draw'
          }
        }
        
        if (drawPhase > 0 && duelist.stance === 'draw') {
          if (!duelist.gunDrawn) {
            duelist.gunDrawn = true
            if (!gunsDrawn) {
              gunsDrawn = true
              // Add dramatic dust cloud
              addWesternEffects(cx, cy, 'dust_cloud')
            }
          }
          
          if (drawPhase >= 1 && !duelFired) {
            duelFired = true
            duelist.stance = 'fired'
            // Muzzle flash and smoke
            addWesternEffects(duelist.x + (idx === 0 ? 20 : -20) * S, duelist.y - 10 * S, 'muzzle_flash')
            addWesternEffects(duelist.x + (idx === 0 ? 20 : -20) * S, duelist.y - 10 * S, 'gun_smoke')
          }
        }
        
        // Draw duelist
        const duelistSize = 35 * S
        
        ctx.save()
        
        // Duelist body
        const bodyGrad = ctx.createRadialGradient(
          duelist.x - duelistSize * 0.2, duelist.y - duelistSize * 0.2, 0,
          duelist.x, duelist.y, duelistSize
        )
        bodyGrad.addColorStop(0, '#FFF')
        bodyGrad.addColorStop(0.3, duelist.color)
        bodyGrad.addColorStop(0.8, _alpha(duelist.color, 0.8))
        bodyGrad.addColorStop(1, _alpha(duelist.color, 0.4))
        
        // Glow during ready phase
        if (duelist.stance === 'ready' || duelist.stance === 'draw') {
          ctx.shadowColor = duelist.color
          ctx.shadowBlur = 12 * S
        }
        
        ctx.fillStyle = bodyGrad
        ctx.beginPath()
        ctx.arc(duelist.x, duelist.y, duelistSize, 0, Math.PI * 2)
        ctx.fill()
        
        // Hat
        if (duelist.hat) {
          ctx.fillStyle = '#8B4513'
          ctx.fillRect(duelist.x - 20 * S, duelist.y - 45 * S, 40 * S, 8 * S)
          ctx.fillRect(duelist.x - 12 * S, duelist.y - 50 * S, 24 * S, 15 * S)
        }
        
        // Gun (if drawn)
        if (duelist.gunDrawn) {
          const gunX = duelist.x + (idx === 0 ? 25 : -25) * S
          const gunY = duelist.y - 5 * S
          
          ctx.fillStyle = '#444'
          ctx.fillRect(gunX - 8 * S, gunY - 3 * S, 16 * S, 6 * S)
          ctx.fillRect(gunX + (idx === 0 ? 8 : -16) * S, gunY - 2 * S, 8 * S, 4 * S)
        }
        
        ctx.restore()
      })
    }

    function drawWesternUI() {
      const p = Math.min(t / DUR, 1)
      
      // "VS" text with western style
      if (p < 0.3) {
        const vsPhase = Math.min(p / 0.3, 1)
        const pulse = 1 + Math.sin(t * 0.1) * 0.1
        
        ctx.save()
        ctx.shadowColor = '#8B4513'
        ctx.shadowBlur = 10 * S * pulse
        ctx.fillStyle = '#D2691E'
        ctx.font = `bold ${Math.round(60 * S * vsPhase * pulse)}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.globalAlpha = vsPhase
        ctx.fillText('VS', cx, cy - 80 * S)
        ctx.restore()
      }
      
      // Countdown during ready phase
      const readyPhase = Math.min(Math.max((p - 0.6) / 0.2, 0), 1)
      if (readyPhase > 0 && readyPhase < 1) {
        const countdown = Math.ceil((1 - readyPhase) * 3)
        const countPulse = 1 + Math.sin(readyPhase * Math.PI * 10) * 0.3
        
        ctx.save()
        ctx.shadowColor = '#FF0000'
        ctx.shadowBlur = 15 * S
        ctx.fillStyle = '#FF4500'
        ctx.font = `bold ${Math.round(80 * S * countPulse)}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(countdown.toString(), cx, cy - 120 * S)
        ctx.restore()
      }
      
      // "DRAW!" text
      const drawPhase = Math.min(Math.max((p - 0.8) / 0.1, 0), 1)
      if (drawPhase > 0) {
        const drawEase = easeOutBack(drawPhase)
        
        ctx.save()
        ctx.shadowColor = '#FFD700'
        ctx.shadowBlur = 20 * S
        ctx.fillStyle = '#FFD700'
        ctx.font = `bold ${Math.round(70 * S * drawEase)}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.globalAlpha = drawPhase
        ctx.fillText('DRAW!', cx, cy - 120 * S)
        ctx.restore()
      }
    }

    function draw() {
      // Western desert background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
      bgGrad.addColorStop(0, 'rgba(255,218,185,0.3)')
      bgGrad.addColorStop(0.7, 'rgba(210,180,140,0.5)')
      bgGrad.addColorStop(1, 'rgba(160,82,45,0.7)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      // Add tumbleweeds occasionally
      if (p > 0.2 && Math.random() < 0.005) {
        addWesternEffects(0, 0, 'tumbleweed')
      }
      
      drawDuelists()
      drawWesternUI()
      updateParticles()
      
      // Final showdown flash
      if (duelFired && p > 0.9 && p < 0.95) {
        const flashIntensity = Math.sin((p - 0.9) * Math.PI * 20) * 0.3
        ctx.fillStyle = `rgba(255,255,255,${Math.abs(flashIntensity)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      // Smooth fadeout
      if (p > 0.92) {
        ctx.fillStyle = `rgba(210,180,140,${Math.min((p - 0.92) / 0.08, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

function introRevenge(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2200; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const impact = _css('--color-impact', '#FF006E')
    const cx = W / 2, cy = H * 0.44
    
    interface FireParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'flame' | 'ember' | 'smoke' | 'lava' | 'lightning'
      life: number; maxLife: number
      heat: number; flickerPhase: number
    }
    
    const particles: FireParticle[] = []
    let lightningStruck = false, moltenActive = false, t = 0
    
    // Smooth easing
    const easeInOutQuart = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
    const easeOutElastic = (t: number) => {
      const c4 = (2 * Math.PI) / 3
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
    }

    function addFireEffects(x: number, y: number, type: 'ignition' | 'inferno' | 'lightning' | 'molten') {
      const count = type === 'ignition' ? (slow ? 8 : 15) : 
                   type === 'inferno' ? (slow ? 12 : 25) : 
                   type === 'lightning' ? (slow ? 15 : 30) : 
                   (slow ? 6 : 12)
      
      for (let i = 0; i < count; i++) {
        if (type === 'ignition') {
          // Initial fire sparks
          const angle = Math.random() * Math.PI * 2
          const speed = (2 + Math.random() * 8) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - Math.random() * 4 * S,
            alpha: 1,
            size: (3 + Math.random() * 6) * S,
            color: '#FF4500',
            type: 'ember',
            life: 60 + Math.random() * 40,
            maxLife: 100,
            heat: 1,
            flickerPhase: Math.random() * Math.PI * 2
          })
        } else if (type === 'inferno') {
          // Intense flames
          const angle = Math.random() * Math.PI * 2
          const speed = (1 + Math.random() * 6) * S
          particles.push({
            x: x + (Math.random() - 0.5) * 60 * S,
            y: y + (Math.random() - 0.5) * 60 * S,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (2 + Math.random() * 4) * S,
            alpha: 0.9,
            size: (8 + Math.random() * 15) * S,
            color: Math.random() < 0.3 ? '#FFFF00' : Math.random() < 0.6 ? '#FF6500' : '#FF0000',
            type: 'flame',
            life: 80 + Math.random() * 60,
            maxLife: 140,
            heat: 0.8 + Math.random() * 0.2,
            flickerPhase: Math.random() * Math.PI * 2
          })
        } else if (type === 'lightning') {
          // Lightning sparks
          const angle = Math.random() * Math.PI * 2
          const speed = (5 + Math.random() * 15) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (2 + Math.random() * 4) * S,
            color: '#FFFFFF',
            type: 'lightning',
            life: 30 + Math.random() * 20,
            maxLife: 50,
            heat: 2,
            flickerPhase: 0
          })
        } else {
          // Molten lava drops
          const angle = Math.random() * Math.PI * 2
          const speed = (1 + Math.random() * 4) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (4 + Math.random() * 8) * S,
            color: '#FF2200',
            type: 'lava',
            life: 120 + Math.random() * 80,
            maxLife: 200,
            heat: 1.5,
            flickerPhase: Math.random() * Math.PI * 2
          })
        }
      }
    }

    function addSmokeEffects(x: number, y: number) {
      const count = slow ? 4 : 8
      
      for (let i = 0; i < count; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 40 * S,
          y: y + (Math.random() - 0.5) * 20 * S,
          vx: (Math.random() - 0.5) * 2 * S,
          vy: -(2 + Math.random() * 4) * S,
          alpha: 0.6,
          size: (10 + Math.random() * 20) * S,
          color: '#333333',
          type: 'smoke',
          life: 100 + Math.random() * 60,
          maxLife: 160,
          heat: 0,
          flickerPhase: 0
        })
      }
    }

    function updateParticles() {
      particles.forEach(particle => {
        // Update physics
        particle.x += particle.vx
        particle.y += particle.vy
        particle.flickerPhase += 0.2
        
        if (particle.type === 'flame') {
          particle.vy -= 0.1 * S // Flames rise
          particle.vx *= 0.98
          particle.vy *= 0.99
          
          // Flicker effect
          particle.alpha = 0.7 + 0.3 * Math.sin(particle.flickerPhase)
          
        } else if (particle.type === 'ember') {
          particle.vy += 0.15 * S // Gravity
          particle.vx *= 0.98
          
          // Cooling effect
          particle.heat *= 0.995
          if (particle.heat < 0.3) {
            particle.color = '#AA2200'
          }
          
        } else if (particle.type === 'smoke') {
          particle.vy *= 0.95 // Slow rise
          particle.vx *= 0.99
          particle.size *= 1.01 // Expand
          
        } else if (particle.type === 'lava') {
          particle.vy += 0.2 * S // Heavy gravity
          particle.vx *= 0.99
          
          // Molten glow flicker
          particle.alpha = 0.8 + 0.2 * Math.sin(particle.flickerPhase * 2)
          
        } else if (particle.type === 'lightning') {
          particle.vx *= 0.95
          particle.vy *= 0.95
          
          // Lightning flicker
          particle.alpha = Math.random() < 0.7 ? 1 : 0.3
        }
        
        particle.life--
        if (particle.type !== 'lightning') {
          particle.alpha *= particle.life / particle.maxLife
        }
        
        if (particle.life <= 0) return
        
        ctx.save()
        ctx.globalAlpha = particle.alpha
        
        if (particle.type === 'flame') {
          const flameGrad = ctx.createRadialGradient(
            particle.x, particle.y - particle.size * 0.3, 0,
            particle.x, particle.y, particle.size
          )
          flameGrad.addColorStop(0, '#FFFF99')
          flameGrad.addColorStop(0.3, particle.color)
          flameGrad.addColorStop(0.7, '#FF2200')
          flameGrad.addColorStop(1, 'rgba(255,0,0,0)')
          ctx.fillStyle = flameGrad
          
          // Flame shape (teardrop)
          ctx.beginPath()
          ctx.ellipse(particle.x, particle.y, particle.size * 0.6, particle.size, 0, 0, Math.PI * 2)
          ctx.fill()
          
        } else if (particle.type === 'ember') {
          // Glowing ember
          ctx.shadowColor = particle.color
          ctx.shadowBlur = 8 * S * particle.heat
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          
        } else if (particle.type === 'smoke') {
          // Smoke cloud
          const smokeGrad = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          )
          smokeGrad.addColorStop(0, `rgba(50,50,50,${particle.alpha})`)
          smokeGrad.addColorStop(1, 'rgba(50,50,50,0)')
          ctx.fillStyle = smokeGrad
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          
        } else if (particle.type === 'lava') {
          // Molten lava
          const lavaGrad = ctx.createRadialGradient(
            particle.x - particle.size * 0.3, particle.y - particle.size * 0.3, 0,
            particle.x, particle.y, particle.size
          )
          lavaGrad.addColorStop(0, '#FFFF00')
          lavaGrad.addColorStop(0.4, '#FF6600')
          lavaGrad.addColorStop(0.8, particle.color)
          lavaGrad.addColorStop(1, '#880000')
          ctx.fillStyle = lavaGrad
          
          ctx.shadowColor = '#FF6600'
          ctx.shadowBlur = 12 * S
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          
        } else if (particle.type === 'lightning') {
          // Lightning spark
          ctx.shadowColor = '#FFFFFF'
          ctx.shadowBlur = 10 * S
          ctx.fillStyle = '#FFFFFF'
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
        }
        
        ctx.shadowBlur = 0
        ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function drawRevengeTarget() {
      const p = Math.min(t / DUR, 1)
      const targetPhase = Math.min(p / 0.3, 1)
      const targetEase = easeInOutQuart(targetPhase)
      
      // Target with molten core
      const targetRadius = 45 * S * targetEase
      const moltenIntensity = Math.sin(t * 0.1) * 0.3 + 0.7
      
      // Molten core
      const coreGrad = ctx.createRadialGradient(
        cx - targetRadius * 0.2, cy - targetRadius * 0.2, 0,
        cx, cy, targetRadius
      )
      coreGrad.addColorStop(0, `rgba(255,255,150,${moltenIntensity})`)
      coreGrad.addColorStop(0.3, `rgba(255,100,0,${moltenIntensity})`)
      coreGrad.addColorStop(0.7, impact)
      coreGrad.addColorStop(1, '#660000')
      
      ctx.save()
      ctx.shadowColor = '#FF6600'
      ctx.shadowBlur = 15 * S * moltenIntensity
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(cx, cy, targetRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      
      // Heat rings
      if (targetPhase > 0.5) {
        for (let ring = 1; ring <= 4; ring++) {
          const ringPhase = Math.min(Math.max((targetPhase - 0.5) / 0.5, 0), 1)
          const pulse = 1 + Math.sin(t * 0.08 + ring * 0.8) * 0.2
          const ringRadius = (targetRadius + ring * 20 * S) * ringPhase * pulse
          const ringAlpha = (1 / ring) * ringPhase * 0.6
          
          ctx.strokeStyle = ring % 2 === 0 ? '#FF6600' : impact
          ctx.lineWidth = (6 - ring) * S
          ctx.globalAlpha = ringAlpha
          ctx.beginPath()
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    }

    function drawLightningStrike() {
      const p = Math.min(t / DUR, 1)
      const lightningPhase = Math.min(Math.max((p - 0.4) / 0.3, 0), 1)
      
      if (lightningPhase > 0) {
        const strikeY = cy - 150 * S + (150 * S * easeOutElastic(lightningPhase))
        const lightningAlpha = lightningPhase * (Math.random() < 0.8 ? 1 : 0.3)
        
        ctx.save()
        ctx.globalAlpha = lightningAlpha
        ctx.shadowColor = '#FFFFFF'
        ctx.shadowBlur = 20 * S
        
        // Main lightning bolt
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 6 * S
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(cx, 0)
        
        // Jagged lightning path
        const segments = 8
        for (let i = 1; i <= segments; i++) {
          const segmentY = (strikeY / segments) * i
          const jag = (Math.random() - 0.5) * 30 * S
          ctx.lineTo(cx + jag, segmentY)
        }
        ctx.stroke()
        
        // Lightning branches
        for (let i = 0; i < 3; i++) {
          const branchY = strikeY * (0.3 + i * 0.2)
          const branchLength = 20 * S + Math.random() * 30 * S
          const branchAngle = (Math.random() - 0.5) * Math.PI * 0.5
          
          ctx.lineWidth = 3 * S
          ctx.beginPath()
          ctx.moveTo(cx, branchY)
          ctx.lineTo(
            cx + Math.cos(branchAngle) * branchLength,
            branchY + Math.sin(branchAngle) * branchLength
          )
          ctx.stroke()
        }
        
        ctx.restore()
        
        // Trigger lightning effects
        if (lightningPhase > 0.8 && !lightningStruck) {
          lightningStruck = true
          addFireEffects(cx, cy, 'lightning')
        }
      }
    }

    function draw() {
      // Fiery background
      const p = Math.min(t / DUR, 1)
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H))
      bgGrad.addColorStop(0, `rgba(80,20,0,${p * 0.3})`)
      bgGrad.addColorStop(0.5, `rgba(40,10,0,${p * 0.2})`)
      bgGrad.addColorStop(1, `rgba(20,5,0,${p * 0.1})`)
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
      
      drawRevengeTarget()
      
      // Trigger fire effects
      if (p > 0.15 && !moltenActive) {
        moltenActive = true
        addFireEffects(cx, cy, 'ignition')
      }
      
      if (p > 0.3) {
        // Continuous inferno
        if (Math.random() < 0.1) {
          addFireEffects(cx, cy, 'inferno')
        }
        if (Math.random() < 0.05) {
          addSmokeEffects(cx, cy)
        }
      }
      
      if (p > 0.6) {
        // Molten lava effects
        if (Math.random() < 0.08) {
          addFireEffects(cx, cy, 'molten')
        }
      }
      
      drawLightningStrike()
      updateParticles()
      
      // Screen flash on lightning strike
      if (lightningStruck && p > 0.7 && p < 0.8) {
        const flashIntensity = Math.sin((p - 0.7) * Math.PI * 10) * 0.4
        ctx.fillStyle = `rgba(255,255,255,${Math.abs(flashIntensity)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(80,20,0,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

// ══════════════════════════════════════════════════════════
// PRO INTROS
// ══════════════════════════════════════════════════════════

function introNormalMissile(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2200; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const cx = W / 2, cy = H * 0.44
    
    interface MissileParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'smoke' | 'flame' | 'spark' | 'debris'
      life: number; maxLife: number
    }
    
    const particles: MissileParticle[] = []
    const smokeTrail: {x: number, y: number, alpha: number, size: number}[] = []
    let impacted = false, t = 0
    
    // Smooth easing
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    function addMissileParticles(x: number, y: number, type: 'exhaust' | 'explosion') {
      const count = type === 'exhaust' ? (slow ? 2 : 4) : (slow ? 15 : 25)
      
      for (let i = 0; i < count; i++) {
        if (type === 'exhaust') {
          // Exhaust flames and smoke
          const angle = Math.PI + (Math.random() - 0.5) * 0.8
          const speed = (1 + Math.random() * 3) * S
          particles.push({
            x, y: y + 15 * S,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 0.8,
            size: (3 + Math.random() * 6) * S,
            color: Math.random() < 0.6 ? '#FF6B00' : '#FFD700',
            type: Math.random() < 0.7 ? 'flame' : 'smoke',
            life: 30 + Math.random() * 20,
            maxLife: 50
          })
        } else {
          // Explosion debris and sparks
          const angle = Math.random() * Math.PI * 2
          const speed = (4 + Math.random() * 12) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (2 + Math.random() * 8) * S,
            color: ['#FFD700', '#FF6B00', '#FF3344', accent, '#fff'][Math.floor(Math.random() * 5)],
            type: Math.random() < 0.4 ? 'spark' : 'debris',
            life: 60 + Math.random() * 40,
            maxLife: 100
          })
        }
      }
    }

    function updateParticles() {
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        
        if (p.type === 'smoke') {
          p.vx *= 0.98
          p.vy *= 0.98
          p.vy -= 0.05 * S
        } else if (p.type === 'flame') {
          p.vx *= 0.95
          p.vy += 0.1 * S
        } else {
          p.vy += 0.15 * S
          p.vx *= 0.99
        }
        
        p.life--
        p.alpha = p.life / p.maxLife
        if (p.life <= 0) return
        
        ctx.save()
        ctx.globalAlpha = p.alpha
        
        if (p.type === 'smoke') {
          const smokeGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          smokeGrad.addColorStop(0, `rgba(100,100,100,${p.alpha * 0.6})`)
          smokeGrad.addColorStop(1, 'rgba(100,100,100,0)')
          ctx.fillStyle = smokeGrad
        } else if (p.type === 'flame') {
          const flameGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          flameGrad.addColorStop(0, p.color)
          flameGrad.addColorStop(0.7, _alpha(p.color, 0.4))
          flameGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = flameGrad
        } else {
          ctx.shadowColor = p.color
          ctx.shadowBlur = 6 * S
          ctx.fillStyle = p.color
        }
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function draw() {
      // Motion blur background
      ctx.fillStyle = 'rgba(4,2,14,0.1)'
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      // Target rings (subtle)
      if (p < 0.8) {
        const ringAlpha = (1 - p) * 0.15
        for (let i = 1; i <= 5; i++) {
          ctx.beginPath()
          ctx.arc(cx, cy, i * 35 * S, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0,245,255,${ringAlpha / i})`
          ctx.lineWidth = 1 * S
          ctx.stroke()
        }
      }
      
      // Missile trajectory (parabolic)
      const launchPhase = Math.min(p / 0.6, 1)
      if (launchPhase > 0) {
        const eased = easeInOutCubic(launchPhase)
        
        // Start from bottom-left, arc to center
        const startX = W * 0.05
        const startY = H * 0.9
        const peakY = H * 0.2
        
        // Parabolic trajectory
        const mX = startX + (cx - startX) * eased
        const arcHeight = Math.sin(eased * Math.PI) * (startY - peakY)
        const mY = startY - (startY - cy) * eased - arcHeight
        
        // Missile angle based on velocity
        const prevX = startX + (cx - startX) * Math.max(0, eased - 0.02)
        const prevY = startY - (startY - cy) * Math.max(0, eased - 0.02) - Math.sin(Math.max(0, eased - 0.02) * Math.PI) * (startY - peakY)
        const angle = Math.atan2(mY - prevY, mX - prevX)
        
        // Add smoke trail
        if (launchPhase > 0.1) {
          smokeTrail.push({x: mX, y: mY, alpha: 1, size: (8 + Math.random() * 4) * S})
          if (smokeTrail.length > 25) smokeTrail.shift()
          
          // Draw smoke trail
          smokeTrail.forEach(smoke => {
            smoke.alpha *= 0.96
            smoke.size *= 1.02
            if (smoke.alpha > 0.05) {
              const smokeGrad = ctx.createRadialGradient(smoke.x, smoke.y, 0, smoke.x, smoke.y, smoke.size)
              smokeGrad.addColorStop(0, `rgba(150,150,150,${smoke.alpha * 0.4})`)
              smokeGrad.addColorStop(1, 'rgba(150,150,150,0)')
              ctx.fillStyle = smokeGrad
              ctx.beginPath()
              ctx.arc(smoke.x, smoke.y, smoke.size, 0, Math.PI * 2)
              ctx.fill()
            }
          })
        }
        
        // Draw missile
        if (launchPhase < 0.95) {
          ctx.save()
          ctx.translate(mX, mY)
          ctx.rotate(angle)
          
          // Missile body with glow
          ctx.shadowColor = accent
          ctx.shadowBlur = 8 * S
          ctx.fillStyle = accent
          ctx.fillRect(-20 * S, -4 * S, 40 * S, 8 * S)
          
          // Missile tip
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.moveTo(20 * S, 0)
          ctx.lineTo(30 * S, -3 * S)
          ctx.lineTo(30 * S, 3 * S)
          ctx.closePath()
          ctx.fill()
          
          // Fins
          ctx.fillStyle = accent
          ctx.fillRect(-25 * S, -8 * S, 8 * S, 16 * S)
          
          ctx.shadowBlur = 0
          ctx.restore()
          
          // Add exhaust particles
          if (Math.random() < 0.7) {
            addMissileParticles(mX, mY, 'exhaust')
          }
        }
        
        // Impact explosion
        if (launchPhase > 0.9 && !impacted) {
          impacted = true
          addMissileParticles(cx, cy, 'explosion')
        }
      }
      
      // Explosion shockwave
      if (p > 0.54 && p < 0.7) {
        const shockP = (p - 0.54) / 0.16
        const shockRadius = easeOutQuint(shockP) * 120 * S
        const shockAlpha = (1 - shockP) * 0.8
        
        // Multiple shockwave rings
        for (let i = 0; i < 3; i++) {
          const ringDelay = i * 0.1
          const ringP = Math.max(0, shockP - ringDelay)
          if (ringP > 0) {
            const ringRadius = easeOutQuint(ringP) * (120 + i * 20) * S
            const ringAlpha = (1 - ringP) * shockAlpha * (1 - i * 0.3)
            
            ctx.beginPath()
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`
            ctx.lineWidth = (4 - i) * S
            ctx.stroke()
          }
        }
        
        // Flash
        const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, shockRadius * 0.6)
        flashGrad.addColorStop(0, `rgba(255,255,255,${shockAlpha * 0.6})`)
        flashGrad.addColorStop(0.4, `rgba(255,200,100,${shockAlpha * 0.3})`)
        flashGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = flashGrad
        ctx.beginPath()
        ctx.arc(cx, cy, shockRadius * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
      
      updateParticles()
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(4,2,14,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

function introNormalSniper(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2400
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const targetX = W / 2, targetY = H * 0.44
    
    interface SniperParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'muzzle' | 'brass' | 'impact' | 'laser'
      life: number; maxLife: number
      trail?: {x: number, y: number, alpha: number}[]
    }
    
    const particles: SniperParticle[] = []
    let locked = false, fired = false, t = 0
    
    // Smooth easing
    const easeInOutQuart = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
    const easeOutBack = (t: number) => {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    }

    function addSniperParticles(x: number, y: number, type: 'muzzle' | 'impact') {
      const count = type === 'muzzle' ? 8 : 15
      
      for (let i = 0; i < count; i++) {
        if (type === 'muzzle') {
          // Muzzle flash and smoke
          const angle = Math.PI + (Math.random() - 0.5) * 1.2
          const speed = (2 + Math.random() * 6) * S
          particles.push({
            x: x - 100 * S, y: y - 20 * S, // Muzzle position
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (4 + Math.random() * 8) * S,
            color: Math.random() < 0.5 ? '#FFD700' : '#FF6B00',
            type: 'muzzle',
            life: 40 + Math.random() * 20,
            maxLife: 60
          })
        } else {
          // Impact sparks and debris
          const angle = Math.random() * Math.PI * 2
          const speed = (3 + Math.random() * 10) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (1 + Math.random() * 4) * S,
            color: ['#FFD700', '#FF3344', '#fff', accent][Math.floor(Math.random() * 4)],
            type: 'impact',
            life: 50 + Math.random() * 30,
            maxLife: 80,
            trail: []
          })
        }
      }
    }

    function updateParticles() {
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        
        if (p.type === 'muzzle') {
          p.vx *= 0.96
          p.vy *= 0.96
          p.vy -= 0.03 * S
        } else {
          p.vy += 0.12 * S
          p.vx *= 0.98
        }
        
        if (p.trail) {
          p.trail.push({x: p.x, y: p.y, alpha: p.alpha})
          if (p.trail.length > 6) p.trail.shift()
        }
        
        p.life--
        p.alpha = p.life / p.maxLife
        if (p.life <= 0) return
        
        ctx.save()
        ctx.globalAlpha = p.alpha
        
        if (p.trail && p.trail.length > 1) {
          p.trail.forEach((point, i) => {
            const trailAlpha = (i / p.trail!.length) * point.alpha * 0.5
            ctx.beginPath()
            ctx.arc(point.x, point.y, p.size * 0.3, 0, Math.PI * 2)
            ctx.fillStyle = _alpha(p.color, trailAlpha)
            ctx.fill()
          })
        }
        
        if (p.type === 'muzzle') {
          const muzzleGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          muzzleGrad.addColorStop(0, p.color)
          muzzleGrad.addColorStop(0.6, _alpha(p.color, 0.4))
          muzzleGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = muzzleGrad
        } else {
          ctx.shadowColor = p.color
          ctx.shadowBlur = 4 * S
          ctx.fillStyle = p.color
        }
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function draw() {
      // Dark background with subtle vignette
      const vignetteGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7)
      vignetteGrad.addColorStop(0, 'rgba(4,2,14,0.95)')
      vignetteGrad.addColorStop(1, 'rgba(2,1,8,0.98)')
      ctx.fillStyle = vignetteGrad
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      // Scope zoom animation
      const scopeR = Math.min(W, H) * 0.35
      const zoomPhase = Math.min(p / 0.5, 1)
      const zoomEase = easeInOutQuart(zoomPhase)
      const currentR = scopeR * (1 - zoomEase * 0.3)
      
      // Scope interior
      ctx.save()
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, currentR, 0, Math.PI * 2)
      ctx.clip()
      
      // Zoomed view
      const zoomScale = 1 + zoomEase * 2.2
      ctx.save()
      ctx.translate(W / 2, H / 2)
      ctx.scale(zoomScale, zoomScale)
      ctx.translate(-W / 2, -H / 2)
      
      // Enhanced grid overlay
      const gridSpacing = 35 * S / zoomScale
      const gridAlpha = zoomEase * 0.25
      ctx.strokeStyle = `rgba(0,245,255,${gridAlpha})`
      ctx.lineWidth = 0.8
      
      // Vertical lines
      for (let x = targetX % gridSpacing; x < W; x += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      
      // Horizontal lines
      for (let y = targetY % gridSpacing; y < H; y += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
      
      // Range finder circles
      if (zoomPhase > 0.3) {
        const rangeAlpha = (zoomPhase - 0.3) * 0.4
        ctx.strokeStyle = `rgba(0,245,255,${rangeAlpha})`
        ctx.lineWidth = 1
        for (let i = 1; i <= 4; i++) {
          ctx.beginPath()
          ctx.arc(targetX, targetY, i * 25 * S, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      
      // Laser crosshair acquisition
      if (p > 0.3) {
        const crossPhase = Math.min((p - 0.3) / 0.4, 1)
        const crossEase = easeOutBack(crossPhase)
        const crossAlpha = crossPhase * 0.9
        const crossLength = 60 * S * crossEase
        
        // Animated laser lines
        ctx.shadowColor = '#FF0050'
        ctx.shadowBlur = 8 * S
        ctx.strokeStyle = `rgba(255,0,80,${crossAlpha})`
        ctx.lineWidth = 2.5
        
        // Horizontal crosshair
        ctx.beginPath()
        ctx.moveTo(targetX - crossLength, targetY)
        ctx.lineTo(targetX + crossLength, targetY)
        ctx.stroke()
        
        // Vertical crosshair
        ctx.beginPath()
        ctx.moveTo(targetX, targetY - crossLength)
        ctx.lineTo(targetX, targetY + crossLength)
        ctx.stroke()
        
        ctx.shadowBlur = 0
        
        // Target lock indicators
        if (crossPhase > 0.6) {
          const lockPhase = (crossPhase - 0.6) / 0.4
          if (!locked && lockPhase > 0.5) locked = true
          
          const lockAlpha = lockPhase * 0.9
          const lockPulse = 1 + Math.sin(t * 0.1) * 0.1
          
          // Lock-on circles
          ctx.strokeStyle = `rgba(255,0,80,${lockAlpha})`
          ctx.lineWidth = 3 * lockPulse
          
          ctx.beginPath()
          ctx.arc(targetX, targetY, 30 * S, 0, Math.PI * 2)
          ctx.stroke()
          
          ctx.beginPath()
          ctx.arc(targetX, targetY, 18 * S, 0, Math.PI * 2)
          ctx.stroke()
          
          // Corner brackets
          const bracketSize = 12 * S
          ctx.lineWidth = 2.5
          
          // Top-left
          ctx.beginPath()
          ctx.moveTo(targetX - 35 * S, targetY - 35 * S + bracketSize)
          ctx.lineTo(targetX - 35 * S, targetY - 35 * S)
          ctx.lineTo(targetX - 35 * S + bracketSize, targetY - 35 * S)
          ctx.stroke()
          
          // Top-right
          ctx.beginPath()
          ctx.moveTo(targetX + 35 * S - bracketSize, targetY - 35 * S)
          ctx.lineTo(targetX + 35 * S, targetY - 35 * S)
          ctx.lineTo(targetX + 35 * S, targetY - 35 * S + bracketSize)
          ctx.stroke()
          
          // Bottom-left
          ctx.beginPath()
          ctx.moveTo(targetX - 35 * S, targetY + 35 * S - bracketSize)
          ctx.lineTo(targetX - 35 * S, targetY + 35 * S)
          ctx.lineTo(targetX - 35 * S + bracketSize, targetY + 35 * S)
          ctx.stroke()
          
          // Bottom-right
          ctx.beginPath()
          ctx.moveTo(targetX + 35 * S - bracketSize, targetY + 35 * S)
          ctx.lineTo(targetX + 35 * S, targetY + 35 * S)
          ctx.lineTo(targetX + 35 * S, targetY + 35 * S - bracketSize)
          ctx.stroke()
        }
      }
      
      ctx.restore()
      ctx.restore()
      
      // Scope ring (outer black, inner accent)
      ctx.strokeStyle = 'rgba(0,0,0,0.9)'
      ctx.lineWidth = 12 * S
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, currentR, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.strokeStyle = accent
      ctx.lineWidth = 2.5 * S
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, currentR, 0, Math.PI * 2)
      ctx.stroke()
      
      // Shot sequence
      if (p > 0.75) {
        const shotPhase = (p - 0.75) / 0.25
        
        if (!fired && shotPhase > 0.1) {
          fired = true
          addSniperParticles(targetX, targetY, 'muzzle')
          addSniperParticles(targetX, targetY, 'impact')
        }
        
        // Muzzle flash
        if (shotPhase < 0.2) {
          const flashAlpha = (0.2 - shotPhase) / 0.2
          ctx.save()
          ctx.globalAlpha = flashAlpha
          
          const flashGrad = ctx.createRadialGradient(targetX - 100 * S, targetY - 20 * S, 0, targetX - 100 * S, targetY - 20 * S, 40 * S)
          flashGrad.addColorStop(0, '#fff')
          flashGrad.addColorStop(0.3, '#FFD700')
          flashGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = flashGrad
          ctx.beginPath()
          ctx.arc(targetX - 100 * S, targetY - 20 * S, 40 * S, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.restore()
        }
        
        // Screen flash
        if (shotPhase < 0.15) {
          const screenFlash = (0.15 - shotPhase) / 0.15
          ctx.fillStyle = `rgba(255,255,255,${screenFlash * 0.4})`
          ctx.fillRect(0, 0, W, H)
        }
      }
      
      updateParticles()
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(4,2,14,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

function introElimChairs(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2200; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const impact = _css('--color-impact', '#FF006E')
    const accent = _css('--color-accent', '#00F5FF')
    const gold = '#FFD700'
    
    interface WoodParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'splinter' | 'dust' | 'chunk'
      life: number; maxLife: number
      rotation: number; rotSpeed: number
    }
    
    interface Chair {
      x: number; fallAt: number; color: string
      rot: number; rotSpeed: number; fallen: boolean; sparked: boolean
      y: number; vy: number; bounces: number
      wobble: number; wobbleSpeed: number
    }
    
    const particles: WoodParticle[] = []
    const baseY = H * 0.52
    const chairs: Chair[] = [
      { x: W * 0.22, fallAt: 400, color: accent, rot: 0, rotSpeed: 0, fallen: false, sparked: false, y: baseY, vy: 0, bounces: 0, wobble: 0, wobbleSpeed: 0.02 },
      { x: W * 0.5, fallAt: 800, color: gold, rot: 0, rotSpeed: 0, fallen: false, sparked: false, y: baseY, vy: 0, bounces: 0, wobble: 0, wobbleSpeed: 0.025 },
      { x: W * 0.78, fallAt: 1200, color: impact, rot: 0, rotSpeed: 0, fallen: false, sparked: false, y: baseY, vy: 0, bounces: 0, wobble: 0, wobbleSpeed: 0.018 },
    ]
    let t = 0
    
    // Physics constants
    const GRAVITY = 0.4 * S
    const BOUNCE_DAMPING = 0.3
    const ROTATION_DAMPING = 0.98
    
    function addWoodEffects(x: number, y: number, color: string) {
      const count = slow ? 12 : 20
      
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = (2 + Math.random() * 8) * S
        const particleType = Math.random() < 0.4 ? 'splinter' : Math.random() < 0.7 ? 'dust' : 'chunk'
        
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 3 * S,
          alpha: 1,
          size: particleType === 'chunk' ? (4 + Math.random() * 6) * S : 
                particleType === 'splinter' ? (2 + Math.random() * 4) * S : 
                (1 + Math.random() * 2) * S,
          color: particleType === 'dust' ? '#8B4513' : color,
          type: particleType,
          life: particleType === 'dust' ? 60 + Math.random() * 40 : 80 + Math.random() * 60,
          maxLife: particleType === 'dust' ? 100 : 140,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2
        })
      }
    }

    function updateParticles() {
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rotation += p.rotSpeed
        if (p.type === 'dust') { p.vx *= 0.95; p.vy *= 0.95; p.vy -= 0.02 * S }
        else { p.vy += GRAVITY * 0.5; p.vx *= 0.98; p.rotSpeed *= 0.99 }
        p.life--; p.alpha = p.life / p.maxLife
        if (p.life <= 0) return
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rotation)
        if (p.type === 'dust') {
          const dustGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size)
          dustGrad.addColorStop(0, `rgba(139,69,19,${p.alpha * 0.8})`); dustGrad.addColorStop(1, 'rgba(139,69,19,0)')
          ctx.fillStyle = dustGrad; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill()
        } else if (p.type === 'splinter') {
          ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.3; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0); ctx.stroke()
        } else {
          ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size)
        }
        ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function drawChair(chair: Chair) {
      const { x, y, rot, color, fallen } = chair
      
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      
      // Chair shadow
      if (!fallen) {
        ctx.save()
        ctx.translate(0, 35 * S)
        ctx.scale(1, 0.3)
        ctx.globalAlpha = 0.2
        ctx.fillStyle = '#000'
        ctx.fillRect(-20 * S, -15 * S, 40 * S, 30 * S)
        ctx.restore()
      }
      
      // Enhanced chair with wood texture
      const woodGrad = ctx.createLinearGradient(-18 * S, -28 * S, 18 * S, 26 * S)
      woodGrad.addColorStop(0, color)
      woodGrad.addColorStop(0.3, _alpha(color, 0.8))
      woodGrad.addColorStop(0.7, _alpha(color, 0.67))
      woodGrad.addColorStop(1, _alpha(color, 0.53))
      
      ctx.strokeStyle = woodGrad
      ctx.lineWidth = 6 * S
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      // Seat
      ctx.beginPath()
      ctx.moveTo(-18 * S, -2 * S)
      ctx.lineTo(18 * S, -2 * S)
      ctx.stroke()
      
      // Front legs
      ctx.beginPath()
      ctx.moveTo(-14 * S, -2 * S)
      ctx.lineTo(-14 * S, 26 * S)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(14 * S, -2 * S)
      ctx.lineTo(14 * S, 26 * S)
      ctx.stroke()
      
      // Back legs (backrest)
      ctx.beginPath()
      ctx.moveTo(-14 * S, -2 * S)
      ctx.lineTo(-14 * S, -28 * S)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(14 * S, -2 * S)
      ctx.lineTo(14 * S, -28 * S)
      ctx.stroke()
      
      // Backrest top
      ctx.beginPath()
      ctx.moveTo(-14 * S, -28 * S)
      ctx.lineTo(14 * S, -28 * S)
      ctx.stroke()
      
      // Wood grain details
      if (!fallen) {
        ctx.strokeStyle = _alpha(color, 0.4)
        ctx.lineWidth = 1 * S
        
        // Seat grain
        for (let i = -12; i <= 12; i += 4) {
          ctx.beginPath()
          ctx.moveTo(i * S, -4 * S)
          ctx.lineTo(i * S, 0)
          ctx.stroke()
        }
        
        // Backrest grain
        for (let i = -12; i <= 12; i += 4) {
          ctx.beginPath()
          ctx.moveTo(i * S, -26 * S)
          ctx.lineTo(i * S, -4 * S)
          ctx.stroke()
        }
      }
      
      // Damage marks when fallen
      if (fallen && chair.bounces > 0) {
        ctx.strokeStyle = impact
        ctx.lineWidth = 2.5 * S
        ctx.globalAlpha = 0.8
        
        // Crack marks
        ctx.beginPath()
        ctx.moveTo(-10 * S, -15 * S)
        ctx.lineTo(8 * S, 10 * S)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.moveTo(12 * S, -20 * S)
        ctx.lineTo(-6 * S, 15 * S)
        ctx.stroke()
      }
      
      ctx.restore()
    }

    function draw() {
      // Subtle background
      ctx.fillStyle = 'rgba(20,15,10,0.05)'
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      chairs.forEach(chair => {
        // Pre-fall wobble
        if (!chair.fallen && t > chair.fallAt - 200) {
          const wobbleIntensity = Math.min((t - (chair.fallAt - 200)) / 200, 1)
          chair.wobble += chair.wobbleSpeed
          chair.rot = Math.sin(chair.wobble) * wobbleIntensity * 0.1
        }
        
        // Trigger fall
        if (!chair.fallen && t > chair.fallAt) {
          chair.fallen = true
          chair.rotSpeed = (Math.random() - 0.5) * 0.15
          chair.vy = -2 * S // Initial upward velocity from impact
        }
        
        // Physics simulation
        if (chair.fallen) {
          // Rotation
          chair.rotSpeed *= ROTATION_DAMPING
          chair.rot += chair.rotSpeed
          
          // Vertical movement
          chair.vy += GRAVITY
          chair.y += chair.vy
          
          // Ground collision
          if (chair.y >= baseY && chair.vy > 0) {
            chair.y = baseY
            chair.vy *= -BOUNCE_DAMPING
            chair.bounces++
            
            // Impact effects
            if (!chair.sparked && chair.bounces === 1) {
              chair.sparked = true
              addWoodEffects(chair.x, chair.y, chair.color)
            }
            
            // Stop bouncing after a few bounces
            if (Math.abs(chair.vy) < 0.5 * S) {
              chair.vy = 0
            }
          }
        }
        
        drawChair(chair)
      })
      
      updateParticles()
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(20,15,10,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

function introElimSlots(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2800; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const gold = '#FFD700'
    const symbols = ['7', '$', 'BAR', '★', '💎'], symColors = ['#FF4444', '#44FF88', '#FFD700', '#4488FF', '#FF44FF']
    const mW = 220 * S, mH = 280 * S, mX = W / 2 - mW / 2, mY = H / 2 - mH / 2 - 10 * S
    const reelW = 55 * S, reelH = 170 * S, reelY = mY + 68 * S
    
    interface CasinoParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'coin' | 'sparkle' | 'neon' | 'confetti'
      life: number; maxLife: number
      rotation: number; rotSpeed: number
      bounce?: number
    }
    
    interface Reel {
      x: number; stopAt: number; stopped: boolean
      finalSymbol: number; spinSpeed: number
      neonPulse: number; glowIntensity: number
    }
    
    const particles: CasinoParticle[] = []
    const reels: Reel[] = [
      { x: mX + 25 * S + reelW / 2, stopAt: 800, stopped: false, finalSymbol: 0, spinSpeed: 1, neonPulse: 0, glowIntensity: 0 },
      { x: mX + 25 * S + reelW + 8 * S + reelW / 2, stopAt: 1400, stopped: false, finalSymbol: 0, spinSpeed: 1.2, neonPulse: 0, glowIntensity: 0 },
      { x: mX + 25 * S + 2 * (reelW + 8 * S) + reelW / 2, stopAt: 2000, stopped: false, finalSymbol: 0, spinSpeed: 0.8, neonPulse: 0, glowIntensity: 0 }
    ]
    
    let jackpotTriggered = false, allStopped = false, t = 0
    
    // Smooth easing
    function addCasinoEffects(x: number, y: number, type: 'coins' | 'jackpot' | 'sparkles') {
      const count = type === 'coins' ? (slow ? 15 : 25) : 
                   type === 'jackpot' ? (slow ? 20 : 35) : 
                   (slow ? 8 : 12)
      
      for (let i = 0; i < count; i++) {
        if (type === 'coins') {
          const angle = Math.random() * Math.PI * 2
          const speed = (3 + Math.random() * 8) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - Math.random() * 4 * S,
            alpha: 1,
            size: (6 + Math.random() * 8) * S,
            color: gold,
            type: 'coin',
            life: 120 + Math.random() * 60,
            maxLife: 180,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.3,
            bounce: 0
          })
        } else if (type === 'jackpot') {
          const angle = Math.random() * Math.PI * 2
          const speed = (2 + Math.random() * 12) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - Math.random() * 6 * S,
            alpha: 1,
            size: (3 + Math.random() * 6) * S,
            color: ['#FFD700', '#FF4444', '#44FF88', '#4488FF', '#FF44FF'][Math.floor(Math.random() * 5)],
            type: 'confetti',
            life: 100 + Math.random() * 80,
            maxLife: 180,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.4
          })
        } else {
          // Sparkles
          const angle = Math.random() * Math.PI * 2
          const speed = (1 + Math.random() * 4) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (2 + Math.random() * 4) * S,
            color: '#fff',
            type: 'sparkle',
            life: 40 + Math.random() * 30,
            maxLife: 70,
            rotation: 0,
            rotSpeed: 0
          })
        }
      }
    }

    function updateParticles() {
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotSpeed
        
        if (p.type === 'coin') {
          p.vy += 0.25 * S // Gravity
          p.vx *= 0.99
          
          // Bounce off ground
          if (p.y > H - 50 * S && p.vy > 0) {
            p.vy *= -0.6
            p.bounce = (p.bounce || 0) + 1
            if (p.bounce > 3) p.vy = 0
          }
        } else if (p.type === 'confetti') {
          p.vy += 0.15 * S // Light gravity
          p.vx *= 0.98
        } else if (p.type === 'sparkle') {
          p.vx *= 0.95
          p.vy *= 0.95
        }
        
        p.life--
        p.alpha = p.life / p.maxLife
        if (p.life <= 0) return
        
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        
        if (p.type === 'coin') {
          const coinGrad = ctx.createRadialGradient(-p.size * 0.3, -p.size * 0.3, 0, 0, 0, p.size)
          coinGrad.addColorStop(0, '#FFFF99'); coinGrad.addColorStop(0.4, gold)
          coinGrad.addColorStop(0.8, '#CC9900'); coinGrad.addColorStop(1, '#996600')
          ctx.fillStyle = coinGrad; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = '#CC9900'; ctx.lineWidth = 1 * S
          ctx.beginPath(); ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2); ctx.stroke()
          ctx.fillStyle = '#996600'; ctx.font = `bold ${p.size * 0.6}px serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 0)
        } else if (p.type === 'confetti') {
          ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size)
        } else if (p.type === 'sparkle') {
          ctx.shadowColor = '#fff'; ctx.shadowBlur = 8 * S; ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.3, -p.size * 0.3)
          ctx.lineTo(p.size, 0); ctx.lineTo(p.size * 0.3, p.size * 0.3)
          ctx.lineTo(0, p.size); ctx.lineTo(-p.size * 0.3, p.size * 0.3)
          ctx.lineTo(-p.size, 0); ctx.lineTo(-p.size * 0.3, -p.size * 0.3)
          ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
        }
        
        ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function drawSlotMachine() {
      // Machine shadow
      ctx.save()
      ctx.translate(5 * S, 5 * S)
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#000'
      ctx.fillRect(mX, mY, mW, mH)
      ctx.restore()
      
      // Machine body with gradient
      const machineGrad = ctx.createLinearGradient(mX, mY, mX + mW, mY + mH)
      machineGrad.addColorStop(0, '#2A1B3D')
      machineGrad.addColorStop(0.5, '#140828')
      machineGrad.addColorStop(1, '#0A0415')
      ctx.fillStyle = machineGrad
      ctx.fillRect(mX, mY, mW, mH)
      
      // Neon border
      const neonPulse = 0.6 + 0.4 * Math.sin(t * 0.05)
      ctx.shadowColor = gold
      ctx.shadowBlur = 8 * S * neonPulse
      ctx.strokeStyle = gold
      ctx.lineWidth = 4 * S
      ctx.strokeRect(mX, mY, mW, mH)
      ctx.shadowBlur = 0
      
      // Side lights
      for (let i = 0; i < 6; i++) {
        const lightY = mY + 40 * S + i * 35 * S
        const lightPulse = Math.sin(t * 0.08 + i * 0.5) > 0 ? 1 : 0.3
        
        // Left lights
        ctx.fillStyle = `rgba(255, 0, 100, ${lightPulse})`
        ctx.beginPath()
        ctx.arc(mX - 8 * S, lightY, 4 * S, 0, Math.PI * 2)
        ctx.fill()
        
        // Right lights
        ctx.fillStyle = `rgba(0, 255, 150, ${lightPulse})`
        ctx.beginPath()
        ctx.arc(mX + mW + 8 * S, lightY, 4 * S, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // JACKPOT text with effects
      const jackpotPulse = allStopped ? 
        0.8 + 0.2 * Math.sin(t * 0.15) : 
        0.5 + 0.3 * Math.sin(t * 0.06)
      
      ctx.save()
      ctx.shadowColor = gold
      ctx.shadowBlur = allStopped ? 15 * S : 8 * S
      ctx.font = `bold ${Math.round(allStopped ? 28 * S : 22 * S)}px serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = `rgba(255,215,0,${jackpotPulse})`
      ctx.fillText('★ JACKPOT ★', W / 2, mY + 40 * S)
      ctx.restore()
    }

    function drawReels() {
      reels.forEach((reel, idx) => {
        const { x, stopAt, stopped } = reel
        const isSpinning = !stopped && t < stopAt
        const speed = isSpinning ? Math.max(0.1, (stopAt - t) / stopAt) * reel.spinSpeed : 0
        
        // Reel background
        const reelGrad = ctx.createLinearGradient(x - reelW/2, reelY, x + reelW/2, reelY + reelH)
        reelGrad.addColorStop(0, '#1A1A2E')
        reelGrad.addColorStop(1, '#0F0F23')
        ctx.fillStyle = reelGrad
        ctx.fillRect(x - reelW / 2, reelY, reelW, reelH)
        
        // Clip for symbols
        ctx.save()
        ctx.beginPath()
        ctx.rect(x - reelW / 2 + 3, reelY + 3, reelW - 6, reelH - 6)
        ctx.clip()
        
        const symH = reelH / 3
        const scroll = isSpinning ? (t * speed * 0.8) % symH : 0
        
        // Draw symbols
        for (let i = -1; i <= 3; i++) {
          const symbolIndex = stopped ? 
            (i === 1 ? reel.finalSymbol : (reel.finalSymbol + i + symbols.length) % symbols.length) : 
            (Math.floor(t * speed * 0.06 + idx * 2 + i + 100)) % symbols.length
          
          const sy = reelY + i * symH - scroll
          const isWinningLine = Math.abs(sy + symH / 2 - (reelY + reelH / 2)) < symH * 0.6
          const isCenter = i === 1
          
          // Symbol glow for winning line
          if (stopped && isWinningLine) {
            reel.glowIntensity = Math.min(reel.glowIntensity + 0.05, 1)
            ctx.save()
            ctx.shadowColor = symColors[symbolIndex]
            ctx.shadowBlur = 12 * S * reel.glowIntensity
            ctx.fillStyle = symColors[symbolIndex]
          } else {
            ctx.fillStyle = isSpinning ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)'
          }
          
          const fontSize = (stopped && isCenter) ? 32 * S : 
                          (stopped && isWinningLine) ? 28 * S : 20 * S
          
          ctx.font = `bold ${Math.round(fontSize)}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(symbols[symbolIndex], x, sy + symH / 2)
          
          if (stopped && isWinningLine) {
            ctx.restore()
          }
        }
        
        ctx.restore()
        
        // Reel border
        const borderColor = stopped ? gold : 'rgba(255,255,255,0.3)'
        const borderWidth = stopped ? 3 * S : 2 * S
        ctx.strokeStyle = borderColor
        ctx.lineWidth = borderWidth
        ctx.strokeRect(x - reelW / 2, reelY, reelW, reelH)
        
        // Stop reel
        if (!stopped && t > stopAt) {
          reel.stopped = true
          addCasinoEffects(x, reelY + reelH/2, 'sparkles')
        }
      })
    }

    function draw() {
      // Dark casino background
      const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.8)
      bgGrad.addColorStop(0, 'rgba(20,10,30,0.95)')
      bgGrad.addColorStop(1, 'rgba(5,2,10,0.98)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      drawSlotMachine()
      drawReels()
      
      // Check if all reels stopped
      if (!allStopped && reels.every(r => r.stopped)) {
        allStopped = true
        // Trigger jackpot effects
        setTimeout(() => {
          if (!jackpotTriggered) {
            jackpotTriggered = true
            addCasinoEffects(W/2, mY + mH/2, 'coins')
            addCasinoEffects(W/2, mY + mH/2, 'jackpot')
          }
        }, 300)
      }
      
      updateParticles()
      
      // Screen flash for jackpot
      if (jackpotTriggered && t > 2200) {
        const flashPhase = (t - 2200) / 400
        if (flashPhase < 1) {
          const flashIntensity = Math.sin(flashPhase * Math.PI * 4) * 0.3
          ctx.fillStyle = `rgba(255,215,0,${flashIntensity})`
          ctx.fillRect(0, 0, W, H)
        }
      }
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(20,10,30,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

function introTeamMagnet(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2100; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const primary = _css('--color-primary', '#7B2FBE')
    const cx = W / 2, cy = H * 0.42
    
    interface MagneticParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'metal' | 'spark' | 'field'
      life: number; maxLife: number
      team: number; magnetized: boolean
      trail?: {x: number, y: number, alpha: number}[]
    }
    
    interface Magnet {
      x: number; y: number; team: number; color: string
      power: number; fieldRadius: number
      pulsePhase: number; sparkTimer: number
    }
    
    const particles: MagneticParticle[] = []
    const N = slow ? 8 : 16
    
    // Create initial metal particles
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * W * 0.8 + W * 0.1,
        y: Math.random() * H * 0.6 + H * 0.2,
        vx: 0, vy: 0,
        alpha: 1,
        size: (6 + Math.random() * 8) * S,
        color: i < N / 2 ? accent : primary,
        type: 'metal',
        life: 1000,
        maxLife: 1000,
        team: i < N / 2 ? 0 : 1,
        magnetized: false,
        trail: []
      })
    }
    
    const magnets: Magnet[] = [
      { x: cx - 90 * S, y: cy, team: 0, color: accent, power: 0, fieldRadius: 0, pulsePhase: 0, sparkTimer: 0 },
      { x: cx + 90 * S, y: cy, team: 1, color: primary, power: 0, fieldRadius: 0, pulsePhase: Math.PI, sparkTimer: 0 }
    ]
    
    let t = 0
    
    // Smooth easing
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const easeOutElastic = (t: number) => {
      const c4 = (2 * Math.PI) / 3
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
    }

    function addMagneticEffects(x: number, y: number, color: string, type: 'sparks' | 'field') {
      const count = type === 'sparks' ? (slow ? 6 : 10) : (slow ? 4 : 8)
      
      for (let i = 0; i < count; i++) {
        if (type === 'sparks') {
          const angle = Math.random() * Math.PI * 2
          const speed = (1 + Math.random() * 4) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (2 + Math.random() * 3) * S,
            color: color,
            type: 'spark',
            life: 30 + Math.random() * 20,
            maxLife: 50,
            team: -1,
            magnetized: false
          })
        } else {
          // Field lines
          const angle = (i / count) * Math.PI * 2
          const radius = 60 * S + Math.random() * 40 * S
          particles.push({
            x: x + Math.cos(angle) * radius,
            y: y + Math.sin(angle) * radius,
            vx: 0, vy: 0,
            alpha: 0.6,
            size: (1 + Math.random() * 2) * S,
            color: color,
            type: 'field',
            life: 60 + Math.random() * 40,
            maxLife: 100,
            team: -1,
            magnetized: false
          })
        }
      }
    }

    function updateParticles() {
      const p = Math.min(t / DUR, 1)
      const magnetPhase = Math.min(Math.max((p - 0.2) / 0.6, 0), 1)
      const magnetEase = easeInOutCubic(magnetPhase)
      
      particles.forEach(particle => {
        if (particle.type === 'metal') {
          // Apply magnetic forces
          magnets.forEach(magnet => {
            if (magnet.team === particle.team && magnetPhase > 0) {
              const dx = magnet.x - particle.x
              const dy = magnet.y - particle.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              
              if (dist > 5) {
                const force = (magnet.power * magnetEase) / (dist * dist) * 800 * S
                particle.vx += (dx / dist) * force
                particle.vy += (dy / dist) * force
                
                // Mark as magnetized when close
                if (dist < 50 * S && !particle.magnetized) {
                  particle.magnetized = true
                  addMagneticEffects(particle.x, particle.y, particle.color, 'sparks')
                }
              }
            }
          })
          
          // Apply velocity
          particle.x += particle.vx
          particle.y += particle.vy
          
          // Damping
          particle.vx *= 0.95
          particle.vy *= 0.95
          
          // Update trail
          if (particle.trail) {
            particle.trail.push({x: particle.x, y: particle.y, alpha: particle.alpha})
            if (particle.trail.length > 12) particle.trail.shift()
          }
          
        } else if (particle.type === 'spark') {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vx *= 0.98
          particle.vy *= 0.98
          
        } else if (particle.type === 'field') {
          // Field particles slowly fade and drift
          particle.vx += (Math.random() - 0.5) * 0.1 * S
          particle.vy += (Math.random() - 0.5) * 0.1 * S
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vx *= 0.99
          particle.vy *= 0.99
        }
        
        particle.life--
        particle.alpha = particle.life / particle.maxLife
        
        if (particle.life <= 0) return
        
        ctx.save()
        ctx.globalAlpha = particle.alpha
        
        if (particle.trail && particle.trail.length > 1) {
          particle.trail.forEach((point, i) => {
            const trailAlpha = (i / particle.trail!.length) * point.alpha * 0.4
            ctx.beginPath()
            ctx.arc(point.x, point.y, particle.size * 0.3, 0, Math.PI * 2)
            ctx.fillStyle = _alpha(particle.color, trailAlpha)
            ctx.fill()
          })
        }
        
        if (particle.type === 'metal') {
          const metalGrad = ctx.createRadialGradient(
            particle.x - particle.size * 0.3, particle.y - particle.size * 0.3, 0,
            particle.x, particle.y, particle.size
          )
          metalGrad.addColorStop(0, '#fff')
          metalGrad.addColorStop(0.3, particle.color)
          metalGrad.addColorStop(0.8, _alpha(particle.color, 0.8))
          metalGrad.addColorStop(1, _alpha(particle.color, 0.4))
          ctx.fillStyle = metalGrad
          if (particle.magnetized) { ctx.shadowColor = particle.color; ctx.shadowBlur = 8 * S }
        } else if (particle.type === 'spark') {
          ctx.shadowColor = particle.color; ctx.shadowBlur = 6 * S; ctx.fillStyle = particle.color
        } else {
          ctx.fillStyle = _alpha(particle.color, 0.53)
        }
        
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill(); ctx.shadowBlur = 0; ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function drawMagnets() {
      const p = Math.min(t / DUR, 1)
      const appearPhase = Math.min(p / 0.3, 1)
      const powerPhase = Math.min(Math.max((p - 0.2) / 0.5, 0), 1)
      
      magnets.forEach((magnet, i) => {
        magnet.power = powerPhase
        magnet.fieldRadius = 120 * S * powerPhase
        magnet.pulsePhase += 0.08
        magnet.sparkTimer += 16
        
        const magnetSize = 28 * S * easeOutElastic(appearPhase)
        const pulse = 1 + Math.sin(magnet.pulsePhase) * 0.1
        
        // Magnetic field visualization
        if (powerPhase > 0.1) {
          const fieldAlpha = powerPhase * 0.2
          
          // Field lines (curved)
          ctx.strokeStyle = magnet.color + Math.floor(fieldAlpha * 255).toString(16).padStart(2, '0')
          ctx.lineWidth = 2 * S
          
          for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2
            const startR = 35 * S
            const endR = magnet.fieldRadius
            
            ctx.beginPath()
            ctx.moveTo(
              magnet.x + Math.cos(angle) * startR,
              magnet.y + Math.sin(angle) * startR
            )
            
            // Curved field line
            const midR = (startR + endR) / 2
            const curve = Math.sin(angle * 2) * 20 * S
            ctx.quadraticCurveTo(
              magnet.x + Math.cos(angle) * midR + curve,
              magnet.y + Math.sin(angle) * midR,
              magnet.x + Math.cos(angle) * endR,
              magnet.y + Math.sin(angle) * endR
            )
            ctx.stroke()
          }
          
          // Add field particles periodically
          if (magnet.sparkTimer > 200) {
            magnet.sparkTimer = 0
            addMagneticEffects(magnet.x, magnet.y, magnet.color, 'field')
          }
        }
        
        // Magnet body
        const magnetGrad = ctx.createLinearGradient(
          magnet.x - magnetSize, magnet.y - magnetSize,
          magnet.x + magnetSize, magnet.y + magnetSize
        )
        magnetGrad.addColorStop(0, '#E8E8E8')
        magnetGrad.addColorStop(0.3, magnet.color)
        magnetGrad.addColorStop(0.7, _alpha(magnet.color, 0.8))
        magnetGrad.addColorStop(1, '#666')
        
        ctx.save()
        ctx.shadowColor = magnet.color
        ctx.shadowBlur = 12 * S * pulse * powerPhase
        ctx.fillStyle = magnetGrad
        
        // Horseshoe magnet shape
        ctx.beginPath()
        ctx.arc(magnet.x, magnet.y, magnetSize, 0, Math.PI * 2)
        ctx.fill()
        
        // Magnet poles
        ctx.fillStyle = i === 0 ? '#FF4444' : '#4444FF'
        ctx.beginPath()
        ctx.arc(magnet.x - magnetSize * 0.6, magnet.y, magnetSize * 0.3, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(magnet.x + magnetSize * 0.6, magnet.y, magnetSize * 0.3, 0, Math.PI * 2)
        ctx.fill()
        
        // Pole labels
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.round(12 * S)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(i === 0 ? 'N' : 'S', magnet.x - magnetSize * 0.6, magnet.y)
        ctx.fillText(i === 0 ? 'S' : 'N', magnet.x + magnetSize * 0.6, magnet.y)
        
        ctx.restore()
      })
    }

    function draw() {
      // Dark background with subtle gradient
      const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7)
      bgGrad.addColorStop(0, 'rgba(15,15,25,0.95)')
      bgGrad.addColorStop(1, 'rgba(5,5,15,0.98)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      drawMagnets()
      updateParticles()
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(15,15,25,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

function introTeamCards(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2300; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const primary = _css('--color-primary', '#7B2FBE')
    const cx = W / 2, cy = H * 0.42
    
    interface PaintParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'splash' | 'drip' | 'spray' | 'member'
      life: number; maxLife: number
      team: number; splashed: boolean
      originalColor?: string
    }
    
    const particles: PaintParticle[] = []
    const N = slow ? 8 : 12
    
    // Create team members (initially gray)
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 / N) * i
      const radius = 60 * S + Math.random() * 20 * S
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius * 0.8
      
      particles.push({
        x, y, vx: 0, vy: 0,
        alpha: 1,
        size: (8 + Math.random() * 4) * S,
        color: '#888888', // Start gray
        originalColor: i < N / 2 ? accent : primary,
        type: 'member',
        life: 1000,
        maxLife: 1000,
        team: i < N / 2 ? 0 : 1,
        splashed: false
      })
    }
    
    let paintLaunched = false, t = 0
    
    // Smooth easing
    const easeOutBounce = (t: number) => {
      const n1 = 7.5625
      const d1 = 2.75
      if (t < 1 / d1) return n1 * t * t
      else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
      else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
      else return n1 * (t -= 2.625 / d1) * t + 0.984375
    }

    function addPaintEffects(x: number, y: number, color: string, type: 'splash' | 'spray') {
      const count = type === 'splash' ? (slow ? 15 : 25) : (slow ? 8 : 15)
      
      for (let i = 0; i < count; i++) {
        if (type === 'splash') {
          // Paint splash explosion
          const angle = Math.random() * Math.PI * 2
          const speed = (4 + Math.random() * 12) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - Math.random() * 3 * S,
            alpha: 1,
            size: (3 + Math.random() * 8) * S,
            color: color,
            type: 'splash',
            life: 80 + Math.random() * 60,
            maxLife: 140,
            team: -1,
            splashed: false
          })
        } else {
          // Paint spray mist
          const angle = Math.random() * Math.PI * 2
          const speed = (1 + Math.random() * 6) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 0.7,
            size: (1 + Math.random() * 3) * S,
            color: color,
            type: 'spray',
            life: 60 + Math.random() * 40,
            maxLife: 100,
            team: -1,
            splashed: false
          })
        }
      }
    }

    function addPaintDrips(x: number, y: number, color: string) {
      const count = slow ? 3 : 6
      
      for (let i = 0; i < count; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 20 * S,
          y: y + 10 * S,
          vx: (Math.random() - 0.5) * 1 * S,
          vy: (1 + Math.random() * 3) * S,
          alpha: 0.8,
          size: (2 + Math.random() * 4) * S,
          color: color,
          type: 'drip',
          life: 100 + Math.random() * 50,
          maxLife: 150,
          team: -1,
          splashed: false
        })
      }
    }

    function updateParticles() {
      const p = Math.min(t / DUR, 1)
      const paintPhase = Math.min(Math.max((p - 0.2) / 0.4, 0), 1)
      
      particles.forEach(particle => {
        if (particle.type === 'member') {
          // Check for paint collision and color change
          if (!particle.splashed && paintPhase > 0.3) {
            const shouldSplash = Math.random() < 0.02 // Gradual splashing
            if (shouldSplash) {
              particle.splashed = true
              particle.color = particle.originalColor!
              addPaintEffects(particle.x, particle.y, particle.color, 'splash')
              addPaintEffects(particle.x, particle.y, particle.color, 'spray')
              addPaintDrips(particle.x, particle.y, particle.color)
            }
          }
          
        } else if (particle.type === 'splash') {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vy += 0.2 * S // Gravity
          particle.vx *= 0.98
          
          // Bounce off ground
          if (particle.y > H - 30 * S && particle.vy > 0) {
            particle.vy *= -0.4
            particle.vx *= 0.8
          }
          
        } else if (particle.type === 'drip') {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vy += 0.1 * S // Light gravity
          particle.vx *= 0.99
          
        } else if (particle.type === 'spray') {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vx *= 0.95
          particle.vy *= 0.95
        }
        
        particle.life--
        particle.alpha = particle.life / particle.maxLife
        
        if (particle.life <= 0 && particle.type !== 'member') return
        
        ctx.save()
        ctx.globalAlpha = particle.alpha
        
        if (particle.type === 'member') {
          const memberGrad = ctx.createRadialGradient(
            particle.x - particle.size * 0.3, particle.y - particle.size * 0.3, 0,
            particle.x, particle.y, particle.size
          )
          if (particle.splashed) {
            memberGrad.addColorStop(0, '#fff'); memberGrad.addColorStop(0.3, particle.color)
            memberGrad.addColorStop(0.8, _alpha(particle.color, 0.8))
            memberGrad.addColorStop(1, _alpha(particle.color, 0.4))
            ctx.shadowColor = particle.color; ctx.shadowBlur = 10 * S
          } else {
            memberGrad.addColorStop(0, '#BBB'); memberGrad.addColorStop(0.5, '#888'); memberGrad.addColorStop(1, '#555')
          }
          ctx.fillStyle = memberGrad
        } else if (particle.type === 'splash') {
          const splashGrad = ctx.createRadialGradient(
            particle.x - particle.size * 0.2, particle.y - particle.size * 0.2, 0,
            particle.x, particle.y, particle.size
          )
          splashGrad.addColorStop(0, particle.color)
          splashGrad.addColorStop(0.7, _alpha(particle.color, 0.8))
          splashGrad.addColorStop(1, _alpha(particle.color, 0.4))
          ctx.fillStyle = splashGrad
        } else if (particle.type === 'drip') {
          ctx.fillStyle = particle.color
          ctx.fillRect(particle.x - particle.size/4, particle.y - particle.size, particle.size/2, particle.size * 2)
        } else {
          ctx.fillStyle = _alpha(particle.color, 0.53)
        }
        
        if (particle.type !== 'drip') {
          ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill()
        }
        ctx.shadowBlur = 0; ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0 && particles[i].type !== 'member') particles.splice(i, 1)
      }
    }

    function drawPaintGuns() {
      const p = Math.min(t / DUR, 1)
      const gunPhase = Math.min(Math.max((p - 0.1) / 0.3, 0), 1)
      
      if (gunPhase > 0) {
        const gunSize = 25 * S * easeOutBounce(gunPhase)
        const leftGunX = cx - 150 * S
        const rightGunX = cx + 150 * S
        const gunY = cy - 80 * S
        
        // Left paint gun (Team A color)
        ctx.save()
        ctx.fillStyle = accent
        ctx.shadowColor = accent
        ctx.shadowBlur = 8 * S
        ctx.fillRect(leftGunX - gunSize/2, gunY - gunSize/2, gunSize, gunSize * 1.5)
        
        // Gun nozzle
        ctx.fillStyle = '#666'
        ctx.fillRect(leftGunX - 3 * S, gunY - gunSize/2 - 10 * S, 6 * S, 10 * S)
        
        // Right paint gun (Team B color)
        ctx.fillStyle = primary
        ctx.shadowColor = primary
        ctx.shadowBlur = 8 * S
        ctx.fillRect(rightGunX - gunSize/2, gunY - gunSize/2, gunSize, gunSize * 1.5)
        
        // Gun nozzle
        ctx.fillStyle = '#666'
        ctx.fillRect(rightGunX - 3 * S, gunY - gunSize/2 - 10 * S, 6 * S, 10 * S)
        
        ctx.restore()
        
        // Trigger paint launch
        if (gunPhase > 0.7 && !paintLaunched) {
          paintLaunched = true
          // Launch paint from both guns
          for (let i = 0; i < 10; i++) {
            addPaintEffects(leftGunX, gunY - gunSize/2, accent, 'splash')
            addPaintEffects(rightGunX, gunY - gunSize/2, primary, 'splash')
          }
        }
      }
    }

    function drawTeamLabels() {
      const p = Math.min(t / DUR, 1)
      const labelPhase = Math.min(Math.max((p - 0.8) / 0.2, 0), 1)
      
      if (labelPhase > 0) {
        const labelAlpha = labelPhase
        const pulse = 1 + Math.sin(t * 0.08) * 0.1
        
        ctx.save()
        ctx.globalAlpha = labelAlpha
        
        // Count splashed members per team
        const teamACounts = particles.filter(p => p.type === 'member' && p.team === 0 && p.splashed).length
        const teamBCounts = particles.filter(p => p.type === 'member' && p.team === 1 && p.splashed).length
        
        // Team A label
        ctx.shadowColor = accent
        ctx.shadowBlur = 12 * S * pulse
        ctx.fillStyle = accent
        ctx.font = `bold ${Math.round(36 * S * pulse)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`A (${teamACounts})`, cx - 100 * S, cy + 120 * S)
        
        // Team B label
        ctx.shadowColor = primary
        ctx.shadowBlur = 12 * S * pulse
        ctx.fillStyle = primary
        ctx.fillText(`B (${teamBCounts})`, cx + 100 * S, cy + 120 * S)
        
        ctx.restore()
      }
    }

    function draw() {
      // Canvas background
      ctx.fillStyle = 'rgba(240,240,240,0.1)'
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      drawPaintGuns()
      updateParticles()
      drawTeamLabels()
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(240,240,240,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

function introOrderRace(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2400; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32']
    const labels = ['1°', '2°', '3°']
    const trackW = W * 0.7, startX = W * 0.15, endX = startX + trackW, cy = H * 0.44
    
    interface RaceParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'smoke' | 'spark' | 'dust' | 'speed'
      life: number; maxLife: number
      lane: number
    }
    
    interface Racer {
      position: number; speed: number; baseSpeed: number
      progress: number; x: number; y: number
      color: string; label: string
      smokeTimer: number; sparkTimer: number
      finished: boolean; finishTime: number
      boostPhase: number
    }
    
    const particles: RaceParticle[] = []
    const racers: Racer[] = [
      { position: 0, speed: 1.0, baseSpeed: 1.0, progress: 0, x: startX, y: cy - 35 * S, color: colors[0], label: labels[0], smokeTimer: 0, sparkTimer: 0, finished: false, finishTime: 0, boostPhase: 0 },
      { position: 1, speed: 0.75 + Math.random() * 0.2, baseSpeed: 0.75 + Math.random() * 0.2, progress: 0, x: startX, y: cy, color: colors[1], label: labels[1], smokeTimer: 0, sparkTimer: 0, finished: false, finishTime: 0, boostPhase: 0 },
      { position: 2, speed: 0.55 + Math.random() * 0.25, baseSpeed: 0.55 + Math.random() * 0.25, progress: 0, x: startX, y: cy + 35 * S, color: colors[2], label: labels[2], smokeTimer: 0, sparkTimer: 0, finished: false, finishTime: 0, boostPhase: 0 }
    ]
    
    let raceStarted = false, checkeredFlag = false, t = 0
    
    // Smooth easing
    function addRaceEffects(x: number, y: number, color: string, type: 'smoke' | 'sparks' | 'dust' | 'speed') {
      const count = type === 'smoke' ? (slow ? 3 : 6) : 
                   type === 'sparks' ? (slow ? 4 : 8) : 
                   type === 'dust' ? (slow ? 2 : 4) : 
                   (slow ? 5 : 10)
      
      for (let i = 0; i < count; i++) {
        if (type === 'smoke') {
          particles.push({
            x: x - Math.random() * 20 * S,
            y: y + (Math.random() - 0.5) * 8 * S,
            vx: -(2 + Math.random() * 4) * S,
            vy: (Math.random() - 0.5) * 2 * S,
            alpha: 0.7,
            size: (8 + Math.random() * 12) * S,
            color: '#666666',
            type: 'smoke',
            life: 60 + Math.random() * 40,
            maxLife: 100,
            lane: -1
          })
        } else if (type === 'sparks') {
          const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.5
          const speed = (3 + Math.random() * 8) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (1 + Math.random() * 3) * S,
            color: '#FFA500',
            type: 'spark',
            life: 30 + Math.random() * 20,
            maxLife: 50,
            lane: -1
          })
        } else if (type === 'dust') {
          particles.push({
            x: x - Math.random() * 15 * S,
            y: y + Math.random() * 10 * S,
            vx: -(1 + Math.random() * 3) * S,
            vy: -(Math.random() * 2) * S,
            alpha: 0.5,
            size: (3 + Math.random() * 6) * S,
            color: '#8B4513',
            type: 'dust',
            life: 40 + Math.random() * 30,
            maxLife: 70,
            lane: -1
          })
        } else {
          // Speed lines
          particles.push({
            x: x + Math.random() * 30 * S,
            y: y + (Math.random() - 0.5) * 15 * S,
            vx: -(8 + Math.random() * 12) * S,
            vy: 0,
            alpha: 0.8,
            size: (1 + Math.random() * 2) * S,
            color: color,
            type: 'speed',
            life: 20 + Math.random() * 15,
            maxLife: 35,
            lane: -1
          })
        }
      }
    }

    function updateParticles() {
      particles.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy
        
        if (particle.type === 'smoke') {
          particle.vx *= 0.98
          particle.vy *= 0.98
          particle.size *= 1.02 // Expand
        } else if (particle.type === 'spark') {
          particle.vy += 0.2 * S // Gravity
          particle.vx *= 0.99
        } else if (particle.type === 'dust') {
          particle.vy += 0.1 * S // Light gravity
          particle.vx *= 0.97
        } else if (particle.type === 'speed') {
          particle.vx *= 0.95
        }
        
        particle.life--
        particle.alpha = particle.life / particle.maxLife
        
        if (particle.life <= 0) return
        
        ctx.save()
        ctx.globalAlpha = particle.alpha
        
        if (particle.type === 'smoke') {
          const smokeGrad = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size)
          smokeGrad.addColorStop(0, `rgba(100,100,100,${particle.alpha})`); smokeGrad.addColorStop(1, 'rgba(100,100,100,0)')
          ctx.fillStyle = smokeGrad; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill()
        } else if (particle.type === 'spark') {
          ctx.shadowColor = particle.color; ctx.shadowBlur = 4 * S; ctx.fillStyle = particle.color
          ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill()
        } else if (particle.type === 'dust') {
          ctx.fillStyle = particle.color; ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill()
        } else if (particle.type === 'speed') {
          ctx.strokeStyle = particle.color; ctx.lineWidth = particle.size; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(particle.x, particle.y); ctx.lineTo(particle.x + 15 * S, particle.y); ctx.stroke()
        }
        
        ctx.shadowBlur = 0; ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function drawRaceTrack() {
      // Track background
      const trackGrad = ctx.createLinearGradient(0, cy - 60 * S, 0, cy + 60 * S)
      trackGrad.addColorStop(0, 'rgba(40,40,40,0.3)')
      trackGrad.addColorStop(0.5, 'rgba(60,60,60,0.5)')
      trackGrad.addColorStop(1, 'rgba(40,40,40,0.3)')
      ctx.fillStyle = trackGrad
      ctx.fillRect(startX - 20 * S, cy - 60 * S, trackW + 40 * S, 120 * S)
      
      // Lane dividers
      for (let i = 0; i < 2; i++) {
        const laneY = cy - 17.5 * S + i * 35 * S
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = 2 * S
        ctx.setLineDash([10 * S, 5 * S])
        ctx.beginPath()
        ctx.moveTo(startX, laneY)
        ctx.lineTo(endX, laneY)
        ctx.stroke()
        ctx.setLineDash([])
      }
      
      // Start line
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 3 * S
      ctx.beginPath()
      ctx.moveTo(startX, cy - 55 * S)
      ctx.lineTo(startX, cy + 55 * S)
      ctx.stroke()
      
      // Finish line (checkered pattern)
      if (checkeredFlag) {
        const checkSize = 8 * S
        for (let y = 0; y < 14; y++) {
          for (let x = 0; x < 3; x++) {
            const isBlack = (x + y) % 2 === 0
            ctx.fillStyle = isBlack ? '#000' : '#FFF'
            ctx.fillRect(
              endX - checkSize * 1.5 + x * checkSize,
              cy - 55 * S + y * checkSize,
              checkSize,
              checkSize
            )
          }
        }
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 3 * S
        ctx.beginPath()
        ctx.moveTo(endX, cy - 55 * S)
        ctx.lineTo(endX, cy + 55 * S)
        ctx.stroke()
      }
    }

    function drawRaceCars() {
      racers.forEach(racer => {
        // Update racer progress
        if (raceStarted && !racer.finished) {
          // Random speed variations and boosts
          if (Math.random() < 0.02) {
            racer.boostPhase = 30 // Boost for 30 frames
          }
          
          if (racer.boostPhase > 0) {
            racer.speed = racer.baseSpeed * 1.5
            racer.boostPhase--
          } else {
            racer.speed = racer.baseSpeed + (Math.random() - 0.5) * 0.1
          }
          
          racer.progress += racer.speed * 0.008
          racer.x = startX + trackW * Math.min(racer.progress, 1)
          
          // Check finish
          if (racer.progress >= 1 && !racer.finished) {
            racer.finished = true
            racer.finishTime = t
            checkeredFlag = true
          }
          
          // Add effects based on speed
          racer.smokeTimer += 16
          racer.sparkTimer += 16
          
          if (racer.smokeTimer > 100) {
            racer.smokeTimer = 0
            addRaceEffects(racer.x, racer.y, racer.color, 'smoke')
          }
          
          if (racer.boostPhase > 0) {
            if (racer.sparkTimer > 50) {
              racer.sparkTimer = 0
              addRaceEffects(racer.x, racer.y, racer.color, 'sparks')
            }
            // Speed lines during boost
            if (Math.random() < 0.3) {
              addRaceEffects(racer.x, racer.y, racer.color, 'speed')
            }
          }
          
          if (Math.random() < 0.1) {
            addRaceEffects(racer.x, racer.y, racer.color, 'dust')
          }
        }
        
        // Draw car
        const carWidth = 25 * S
        const carHeight = 12 * S
        
        ctx.save()
        
        // Car body gradient
        const carGrad = ctx.createLinearGradient(
          racer.x - carWidth/2, racer.y - carHeight/2,
          racer.x + carWidth/2, racer.y + carHeight/2
        )
        carGrad.addColorStop(0, racer.color)
        carGrad.addColorStop(0.5, _alpha(racer.color, 0.8))
        carGrad.addColorStop(1, _alpha(racer.color, 0.53))
        
        // Car glow during boost
        if (racer.boostPhase > 0) {
          ctx.shadowColor = racer.color
          ctx.shadowBlur = 12 * S
        }
        
        // Car body
        ctx.fillStyle = carGrad
        ctx.fillRect(racer.x - carWidth/2, racer.y - carHeight/2, carWidth, carHeight)
        
        // Car details
        ctx.fillStyle = '#333'
        // Wheels
        ctx.fillRect(racer.x - carWidth/2 + 3 * S, racer.y - carHeight/2 - 2 * S, 4 * S, 4 * S)
        ctx.fillRect(racer.x + carWidth/2 - 7 * S, racer.y - carHeight/2 - 2 * S, 4 * S, 4 * S)
        ctx.fillRect(racer.x - carWidth/2 + 3 * S, racer.y + carHeight/2 - 2 * S, 4 * S, 4 * S)
        ctx.fillRect(racer.x + carWidth/2 - 7 * S, racer.y + carHeight/2 - 2 * S, 4 * S, 4 * S)
        
        // Windshield
        ctx.fillStyle = 'rgba(200,200,255,0.6)'
        ctx.fillRect(racer.x + carWidth/2 - 8 * S, racer.y - carHeight/2 + 2 * S, 6 * S, carHeight - 4 * S)
        
        ctx.restore()
        
        // Position label
        ctx.fillStyle = racer.color
        ctx.font = `bold ${Math.round(14 * S)}px sans-serif`
        ctx.textAlign = 'right'
        ctx.fillText(racer.label, startX - 10 * S, racer.y + 5 * S)
      })
    }

    function draw() {
      // Racing background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H)
      bgGrad.addColorStop(0, 'rgba(20,30,40,0.95)')
      bgGrad.addColorStop(1, 'rgba(10,15,20,0.98)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
      
      const p = Math.min(t / DUR, 1)
      
      // Start race after brief delay
      if (p > 0.1 && !raceStarted) {
        raceStarted = true
      }
      
      drawRaceTrack()
      drawRaceCars()
      updateParticles()
      
      // Winner announcement
      const finishedRacers = racers.filter(r => r.finished).sort((a, b) => a.finishTime - b.finishTime)
      if (finishedRacers.length > 0 && p > 0.7) {
        const winner = finishedRacers[0]
        const announcePhase = Math.min((p - 0.7) / 0.3, 1)
        const pulse = 1 + Math.sin(t * 0.1) * 0.1
        
        ctx.save()
        ctx.globalAlpha = announcePhase
        ctx.shadowColor = winner.color
        ctx.shadowBlur = 15 * S * pulse
        ctx.fillStyle = winner.color
        ctx.font = `bold ${Math.round(32 * S * pulse)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${winner.label} WINS!`, W/2, cy - 80 * S)
        ctx.restore()
      }
      
      // Smooth fadeout
      if (p > 0.88) {
        ctx.fillStyle = `rgba(20,30,40,${Math.min((p - 0.88) / 0.12, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

function introOrderWheel(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 2000
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const gold = '#FFD700', accent = _css('--color-accent', '#00F5FF')
    const positions = ['1\u00b0', '2\u00b0', '3\u00b0', '4\u00b0', '5\u00b0', '1\u00b0', '2\u00b0', '3\u00b0']
    const posColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#666', '#FFD700', '#C0C0C0', '#CD7F32']
    const N = positions.length, R = Math.min(W, H) * 0.26, cx = W / 2, cy = H * 0.44
    let t = 0, totalAngle = 0

    function draw() {
      ctx.clearRect(0, 0, W, H); const p = Math.min(t / DUR, 1)
      let vel: number
      if (p < 0.15) vel = p / 0.15 * 0.35; else if (p < 0.68) vel = 0.35; else vel = 0.35 * Math.pow(1 - (p - 0.68) / 0.32, 2.5)
      totalAngle += vel; const angle = -Math.PI / 2 + totalAngle, slice = Math.PI * 2 / N
      ctx.beginPath(); ctx.arc(cx, cy, R + 8 * S, 0, Math.PI * 2)
      ctx.strokeStyle = gold; ctx.lineWidth = 3 * S; ctx.stroke()
      positions.forEach((pos, i) => {
        const startA = angle + i * slice, endA = startA + slice, midA = startA + slice / 2
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, startA, endA); ctx.closePath()
        ctx.fillStyle = posColors[i] + '66'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5 * S; ctx.stroke()
        ctx.save(); ctx.translate(cx + Math.cos(midA) * R * 0.65, cy + Math.sin(midA) * R * 0.65); ctx.rotate(midA + Math.PI / 2)
        ctx.font = `bold ${Math.round(15 * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = posColors[i]; ctx.fillText(pos, 0, 0); ctx.restore()
      })
      // Pointer
      const pColor = vel < 0.05 ? '#ff3333' : accent
      ctx.save(); ctx.translate(cx, cy - R - 12 * S)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11 * S, -20 * S); ctx.lineTo(11 * S, -20 * S); ctx.closePath(); ctx.fillStyle = pColor; ctx.fill(); ctx.restore()
      // Center
      ctx.beginPath(); ctx.arc(cx, cy, 14 * S, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill(); ctx.strokeStyle = gold; ctx.lineWidth = 2.5 * S; ctx.stroke()
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR)
  })
}

function introDuelWestern(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 1800; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const gold = '#FFD700', cy = H * 0.46; const sparks: Spark[] = []; let fired = false, t = 0

    function draw() {
      ctx.clearRect(0, 0, W, H); const p = Math.min(t / DUR, 1)
      // Ground
      const ground = ctx.createLinearGradient(0, H * 0.68, 0, H); ground.addColorStop(0, 'rgba(80,55,20,0.22)'); ground.addColorStop(1, 'rgba(40,25,5,0.38)')
      ctx.fillStyle = ground; ctx.fillRect(0, H * 0.68, W, H * 0.32)
      // Countdown
      if (p < 0.42) {
        const cp = p / 0.42, digit = cp < 0.33 ? '3' : cp < 0.66 ? '2' : '1', dp = (cp % 0.333) / 0.333, sc = dp < 0.12 ? dp / 0.12 : dp > 0.82 ? (1 - (dp - 0.82) / 0.18) : 1
        ctx.font = `bold ${Math.round(72 * S * sc)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = gold; ctx.globalAlpha = sc; ctx.fillText(digit, W / 2, H * 0.38); ctx.globalAlpha = 1
      }
      // Guns approach
      if (p > 0.32) {
        const gp = Math.min((p - 0.32) / 0.4, 1), eGp = 1 - Math.pow(1 - gp, 3)
        const gunDist = W * 0.33 - 38 * S
        // Gun shapes (simplified)
        ;[{ x: W / 2 - gunDist * (0.3 + 0.7 * (1 - eGp)) - 38 * S, col: accent }, { x: W / 2 + gunDist * (0.3 + 0.7 * (1 - eGp)) + 38 * S, col: impact }].forEach(g => {
          ctx.beginPath(); ctx.arc(g.x, cy + 8 * S, 16 * S * gp, 0, Math.PI * 2); ctx.fillStyle = g.col; ctx.globalAlpha = gp; ctx.fill(); ctx.globalAlpha = 1
        })
      }
      if (p > 0.75 && !fired) { fired = true; _burst(sparks, W / 2, cy, slow ? 8 : 14, S, [gold, accent, impact]) }
      if (p > 0.75 && p < 0.88) { const fp = (p - 0.75) / 0.13, fb = fp < 0.5 ? fp * 2 : 2 - fp * 2; ctx.fillStyle = `rgba(255,200,50,${fb * 0.48})`; ctx.fillRect(0, 0, W, H) }
      _drawSparks(ctx, sparks, 0.08 * S)
      if (p > 0.82) {
        const dp2 = Math.min((p - 0.82) / 0.12, 1), pulse = 0.85 + 0.15 * Math.sin(t * 0.05)
        ctx.font = `bold ${Math.round(36 * S * dp2 * pulse)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = gold; ctx.fillText('DRAW!', W / 2, H * 0.3)
      }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR)
  })
}

function introDuelBoxing(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 1800; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const cy = H * 0.46; const sparks: Spark[] = []; let hit = false, t = 0

    function draw() {
      ctx.clearRect(0, 0, W, H); const p = Math.min(t / DUR, 1)
      const vg = ctx.createRadialGradient(W / 2, cy, 60 * S, W / 2, cy, W * 0.8)
      vg.addColorStop(0, 'rgba(60,20,10,0.28)'); vg.addColorStop(1, 'rgba(0,0,0,0.65)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
      // ROUND 1
      if (p < 0.22) { const rp = p / 0.22; ctx.font = `bold ${Math.round(36 * S * rp)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#FFD700'; ctx.globalAlpha = rp; ctx.fillText('ROUND 1', W / 2, cy - 62 * S); ctx.globalAlpha = 1 }
      // Gloves approach
      const approach = Math.min(Math.max((p - 0.18) / 0.47, 0), 1), ea = 1 - Math.pow(1 - approach, 3)
      const maxDist = W * 0.36 - 28 * S, gx1 = W / 2 - maxDist * (1 - ea) - 28 * S, gx2 = W / 2 + maxDist * (1 - ea) + 28 * S
      const gBounce = approach < 1 ? Math.abs(Math.sin(approach * Math.PI * 3)) * 10 * S : 0
      ;[{ x: gx1, col: accent }, { x: gx2, col: impact }].forEach(g => {
        ctx.beginPath(); ctx.ellipse(g.x, cy - gBounce, 22 * S, 18 * S, 0, 0, Math.PI * 2); ctx.fillStyle = g.col; ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(g.x - 6 * S, cy - gBounce - 6 * S, 10 * S, 7 * S, -0.4, 0, Math.PI * 2); ctx.fill()
      })
      if (approach >= 1 && !hit) { hit = true; _burst(sparks, W / 2, cy, slow ? 8 : 14, S, [accent, impact]) }
      const clashT = DUR * 0.65; if (t > clashT && t < clashT + 260) { const fp = (t - clashT) / 260, fb = fp < 0.5 ? fp * 2 : 2 - fp * 2; ctx.fillStyle = `rgba(255,255,255,${fb * 0.55})`; ctx.fillRect(0, 0, W, H) }
      if (p > 0.72) {
        const kp = Math.min((p - 0.72) / 0.14, 1), kPulse = 0.85 + 0.15 * Math.sin(t * 0.04), kSize = 52 * S * kp * kPulse
        ctx.font = `bold ${Math.round(kSize)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#FFD700'; ctx.fillText('KO!', W / 2, cy - 48 * S)
      }
      _drawSparks(ctx, sparks, 0.1 * S)
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR)
  })
}

function introRevengeTarget(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 1700
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const impact = _css('--color-impact', '#FF006E')
    const red = '#FF1133'; let dX = W * 0.06, dY = H * 0.12
    const targetX = W / 2, targetY = H * 0.42; const sparks: Spark[] = []; let fired = false, t = 0

    function drawTarget(x: number, y: number, scale: number, alpha: number, lockP: number) {
      ctx.save(); ctx.globalAlpha = alpha
      ;[70, 52, 36, 22, 9].forEach((r, i) => {
        const pulse = scale * (1 + 0.05 * Math.sin(t * 0.016 + i * 0.8)), rr = r * S * pulse, isRed = i % 2 === 0
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2)
        ctx.fillStyle = isRed ? 'rgba(200,0,20,0.25)' : 'rgba(255,255,255,0.06)'; ctx.fill()
        ctx.strokeStyle = isRed ? `rgba(255,20,50,${0.9 - i * 0.08})` : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2.5 * S; ctx.stroke()
      })
      if (lockP > 0) {
        ctx.strokeStyle = `rgba(255,20,50,${lockP})`; ctx.lineWidth = 3.5 * S
        const cs = 24 * S * scale, lr = 72 * S * scale
        ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.moveTo(x + sx * (lr - cs), y + sy * lr); ctx.lineTo(x + sx * lr, y + sy * lr); ctx.lineTo(x + sx * lr, y + sy * (lr - cs)); ctx.stroke() })
      }
      ctx.restore()
    }

    function draw() {
      ctx.clearRect(0, 0, W, H); const p = Math.min(t / DUR, 1)
      const pursuit = Math.min(p / 0.68, 1), ePursuit = 1 - Math.pow(1 - pursuit, 3)
      dX = W * 0.06 + (targetX - W * 0.06) * ePursuit; dY = H * 0.12 + (targetY - H * 0.12) * ePursuit
      const scale = 1.4 - 0.4 * ePursuit, lockP = Math.min(Math.max((ePursuit - 0.82) / 0.18, 0), 1)
      drawTarget(dX, dY, scale, Math.min(p * 5, 1), lockP)
      if (p > 0.7 && !fired) { fired = true; _burst(sparks, targetX, targetY, 20, S, [red, impact]) }
      if (p > 0.7 && p < 0.84) { const fp = (p - 0.7) / 0.14, fb = fp < 0.5 ? fp * 2 : 2 - fp * 2; ctx.beginPath(); ctx.arc(targetX, targetY, 60 * S * fb, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,0,50,${fb * 0.55})`; ctx.fill() }
      _drawSparks(ctx, sparks, 0.1 * S)
      // Smooth fade out
      if (p > 0.88) { ctx.fillStyle = `rgba(0,0,0,${Math.min((p - 0.88) / 0.12, 1) * 0.9})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 300) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introRevengeStorm(): Promise<void> {
  return new Promise(resolve => {
    const DUR = 1700; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const impact = _css('--color-impact', '#FF006E')
    const cx = W / 2, targetY = H * 0.54
    const bolts = Array.from({ length: slow ? 6 : 8 }, (_, i) => ({ x: cx + (Math.random() - 0.5) * W * 0.38, fireAt: 350 + i * 160, fired: false, alpha: 0, segs: Array.from({ length: 7 }, () => ({ dx: (Math.random() - 0.5) * 22 * S, dy: 16 * S + Math.random() * 10 * S })) }))
    const sparks: Spark[] = []; let t = 0

    function drawBolt(bolt: typeof bolts[0], alpha: number) {
      if (alpha <= 0) return; ctx.save()
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 1.5 * S
      let bx = bolt.x, by = H * 0.1; ctx.beginPath(); ctx.moveTo(bx, by); bolt.segs.forEach(seg => { bx += seg.dx; by += seg.dy; ctx.lineTo(bx, by) }); ctx.stroke()
      ctx.strokeStyle = `rgba(180,230,255,${alpha * 0.8})`; ctx.lineWidth = 4 * S
      bx = bolt.x; by = H * 0.1; ctx.beginPath(); ctx.moveTo(bx, by); bolt.segs.forEach(seg => { bx += seg.dx; by += seg.dy; ctx.lineTo(bx, by) }); ctx.stroke()
      ctx.restore()
    }

    function draw() {
      ctx.clearRect(0, 0, W, H); const p = Math.min(t / DUR, 1)
      // Clouds
      if (p > 0.04) {
        const cp = Math.min(p / 0.35, 1)
        ;[[cx - 55 * S, H * 0.1, 60 * S], [cx + 45 * S, H * 0.12, 50 * S], [cx - 15 * S, H * 0.07, 55 * S]].forEach(([x, y, w]) => {
          const cg = ctx.createRadialGradient(x, y, 0, x, y, w); cg.addColorStop(0, 'rgba(30,30,50,0.9)'); cg.addColorStop(1, 'rgba(10,10,25,0)')
          ctx.globalAlpha = cp * 0.9; ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, y, w, 0, Math.PI * 2); ctx.fill()
        }); ctx.globalAlpha = 1
      }
      // Impact indicator
      if (p > 0.28) { const dp = Math.min((p - 0.28) / 0.4, 1); ctx.beginPath(); ctx.arc(cx, targetY, 42 * S * dp, 0, Math.PI * 2); ctx.strokeStyle = `rgba(180,50,255,${dp * 0.5})`; ctx.lineWidth = 2.5 * S; ctx.stroke() }
      // Bolts
      bolts.forEach(bolt => {
        if (t >= bolt.fireAt && !bolt.fired) { bolt.fired = true; bolt.alpha = 1; _burst(sparks, cx, targetY, slow ? 6 : 9, S, ['#9DE8FF', impact]) }
        if (bolt.fired) bolt.alpha = Math.max(0, bolt.alpha - 0.048)
        drawBolt(bolt, bolt.alpha)
        if (bolt.fired && bolt.alpha > 0.8) { ctx.fillStyle = `rgba(200,220,255,${(bolt.alpha - 0.8) * 0.4})`; ctx.fillRect(0, 0, W, H) }
      })
      _drawSparks(ctx, sparks, 0.09 * S)
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR)
  })
}

// ══════════════════════════════════════════════════════════
// PARTICLE BURST (re-exported for compatibility)
// ══════════════════════════════════════════════════════════

export function showParticleBurst(x: number, y: number, color = '#00f5ff') {
  if (getPerformanceLevel() === 'reduced') return
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9998;`
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div')
    const angle = (i / 8) * Math.PI * 2
    const distance = 60 + Math.random() * 40
    const endX = Math.cos(angle) * distance
    const endY = Math.sin(angle) * distance
    particle.style.cssText = `position:absolute;width:4px;height:4px;background:${color};border-radius:50%;box-shadow:0 0 6px ${color};animation:particleBurst 600ms ease-out forwards;transform:translate(${endX}px,${endY}px) scale(0);`
    container.appendChild(particle)
  }
  document.body.appendChild(container)
  setTimeout(() => container.remove(), 600)
}

// ══════════════════════════════════════════════════════════
// INTERACTIVE ANIMATIONS (with real participants)
// ══════════════════════════════════════════════════════════

export function introElimSlotsInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 4500; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const gold = '#FFD700'
    const cherry = '#FF3366'
    const cx = W / 2, cy = H * 0.45

    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const names = participants.map(p => p.name)

    // Build reel strips: repeated names so spinning looks seamless
    function buildStrip(finalName: string): string[] {
      const strip: string[] = []
      for (let r = 0; r < 6; r++) {
        const shuffled = [...names].sort(() => Math.random() - 0.5)
        strip.push(...shuffled)
      }
      // Guarantee finalName is at a known position we can stop on
      strip.push(finalName)
      return strip
    }

    const CELL_H = 42 * S
    const REEL_W = Math.min(110 * S, W * 0.28)
    const REEL_H = CELL_H * 3            // show 3 rows
    const GAP = 8 * S
    const machineW = REEL_W * 3 + GAP * 2
    const machineX = cx - machineW / 2
    const machineY = cy - REEL_H / 2

    // Each reel: all 3 land on winnerName (jackpot effect)
    interface Reel {
      strip: string[]; y: number; vy: number
      targetY: number; phase: 'spin' | 'brake' | 'done'
      brakeStart: number; brakeDuration: number; brakeFromY: number
    }

    const reels: Reel[] = [0, 1, 2].map(i => {
      const strip = buildStrip(winnerName)
      const targetIdx = strip.length - 1           // last element = winnerName
      return {
        strip,
        y: 0,
        vy: (18 + i * 3) * S,                      // staggered speeds
        targetY: targetIdx * CELL_H - CELL_H,       // center winnerName in middle row
        phase: 'spin' as const,
        brakeStart: 0,
        brakeDuration: 0.12 + i * 0.04,
        brakeFromY: 0
      }
    })

    const stopTimes = [0.35, 0.50, 0.68]
    let allDone = false, revealStarted = false, t = 0

    // Particles
    interface Spark { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
    const sparks: Spark[] = []

    function burst(bx: number, by: number, color: string, count: number) {
      for (let i = 0; i < (slow ? Math.ceil(count / 2) : count); i++) {
        const a = Math.random() * Math.PI * 2
        const sp = (3 + Math.random() * 9) * S
        sparks.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.5 * S, life: 65 + Math.random() * 55, maxLife: 120, color, size: (4 + Math.random() * 6) * S })
      }
    }

    const easeOutBack = (x: number) => {
      const c1 = 1.70158; const c3 = c1 + 1
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
    }

    function updateReels(p: number) {
      reels.forEach((reel, i) => {
        if (reel.phase === 'spin') {
          reel.y += reel.vy
          if (p >= stopTimes[i]) {
            reel.phase = 'brake'
            reel.brakeFromY = reel.y
            // Ensure targetY is ahead of current position
            while (reel.targetY < reel.y + CELL_H * 3) reel.targetY += reel.strip.length * CELL_H
          }
        } else if (reel.phase === 'brake') {
          const brakeP = Math.min((p - stopTimes[i]) / reel.brakeDuration, 1)
          const eased = easeOutBack(brakeP)
          reel.y = reel.brakeFromY + (reel.targetY - reel.brakeFromY) * eased
          if (brakeP >= 1) {
            reel.phase = 'done'
            reel.y = reel.targetY
            // Burst on stop
            const rx = machineX + i * (REEL_W + GAP) + REEL_W / 2
            burst(rx, cy, gold, 28)
          }
        }
      })
      if (!allDone && reels.every(r => r.phase === 'done')) {
        allDone = true
        burst(cx, cy, cherry, 55)
        burst(cx, cy, gold, 45)
      }
    }

    function drawMachine() {
      // Machine body
      const bodyPad = 16 * S
      ctx.fillStyle = 'rgba(15,10,30,0.95)'
      ctx.beginPath()
      const bx = machineX - bodyPad, by = machineY - bodyPad * 2.5
      const bw = machineW + bodyPad * 2, bh = REEL_H + bodyPad * 4
      ctx.roundRect(bx, by, bw, bh, 12 * S)
      ctx.fill()

      // Border glow — stronger
      ctx.strokeStyle = gold
      ctx.lineWidth = 3.5 * S
      ctx.shadowColor = gold
      ctx.shadowBlur = 20 * S
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, bh, 12 * S)
      ctx.stroke()
      // Double glow pass
      ctx.shadowBlur = 40 * S; ctx.globalAlpha = 0.3
      ctx.stroke()
      ctx.globalAlpha = 1; ctx.shadowBlur = 0

      // Draw reels
      reels.forEach((reel, i) => {
        const rx = machineX + i * (REEL_W + GAP)

        // Reel background
        ctx.fillStyle = 'rgba(0,0,0,0.8)'
        ctx.fillRect(rx, machineY, REEL_W, REEL_H)

        // Clip reel content
        ctx.save()
        ctx.beginPath()
        ctx.rect(rx, machineY, REEL_W, REEL_H)
        ctx.clip()

        // Draw names
        const startIdx = Math.floor(reel.y / CELL_H) - 1
        const endIdx = startIdx + 5
        for (let j = startIdx; j <= endIdx; j++) {
          const si = ((j % reel.strip.length) + reel.strip.length) % reel.strip.length
          const name = reel.strip[si]
          const ny = machineY + (j * CELL_H - reel.y) + CELL_H / 2

          // Distance from center row
          const centerY = machineY + REEL_H / 2
          const dist = Math.abs(ny - centerY)
          const fade = Math.max(0, 1 - dist / (REEL_H * 0.6))

          ctx.fillStyle = `rgba(255,255,255,${0.25 + fade * 0.75})`
          const fontSize = Math.round((12 + fade * 5) * S)
          ctx.font = `${fade > 0.7 ? '700' : '400'} ${fontSize}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(name, rx + REEL_W / 2, ny)
        }

        ctx.restore()

        // Reel border
        ctx.strokeStyle = 'rgba(255,215,0,0.4)'
        ctx.lineWidth = 2 * S
        ctx.strokeRect(rx, machineY, REEL_W, REEL_H)
      })

      // Center line indicator (the "payline")
      const lineY = machineY + REEL_H / 2
      ctx.strokeStyle = cherry
      ctx.lineWidth = 2.5 * S
      ctx.shadowColor = cherry
      ctx.shadowBlur = 14 * S
      ctx.beginPath()
      ctx.moveTo(machineX - 8 * S, lineY - CELL_H / 2)
      ctx.lineTo(machineX + machineW + 8 * S, lineY - CELL_H / 2)
      ctx.moveTo(machineX - 8 * S, lineY + CELL_H / 2)
      ctx.lineTo(machineX + machineW + 8 * S, lineY + CELL_H / 2)
      ctx.stroke()
      ctx.shadowBlur = 0

      // Small arrows on payline
      ctx.fillStyle = cherry
      ctx.beginPath()
      ctx.moveTo(machineX - 12 * S, lineY)
      ctx.lineTo(machineX - 4 * S, lineY - 6 * S)
      ctx.lineTo(machineX - 4 * S, lineY + 6 * S)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(machineX + machineW + 12 * S, lineY)
      ctx.lineTo(machineX + machineW + 4 * S, lineY - 6 * S)
      ctx.lineTo(machineX + machineW + 4 * S, lineY + 6 * S)
      ctx.fill()
    }

    function drawSparks() {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx; s.y += s.vy
        s.vy += 0.12 * S; s.vx *= 0.98
        s.life--
        if (s.life <= 0) { sparks.splice(i, 1); continue }
        const a = s.life / s.maxLife
        ctx.save()
        ctx.globalAlpha = a
        ctx.shadowColor = s.color
        ctx.shadowBlur = 14 * S * a
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * a, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    function drawReveal(p: number) {
      if (!allDone) return
      if (!revealStarted && p > 0.78) revealStarted = true
      if (!revealStarted) return

      const rp = Math.min((p - 0.78) / 0.18, 1)
      ctx.save()
      ctx.globalAlpha = rp
      ctx.shadowColor = gold
      ctx.shadowBlur = 30 * S * (1 + Math.sin(t * 0.12) * 0.3)
      ctx.fillStyle = gold
      ctx.font = `900 ${Math.round(28 * S)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(winnerName, cx, machineY - 34 * S)
      // Double glow
      ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4
      ctx.fillText(winnerName, cx, machineY - 34 * S)
      ctx.restore()
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Background — richer
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H))
      bg.addColorStop(0, '#1a054a')
      bg.addColorStop(0.5, '#0c021a')
      bg.addColorStop(1, '#05000a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Ambient moving dots — with glow
      if (!slow) {
        for (let i = 0; i < 35; i++) {
          const dx = (Math.sin(t * 0.002 + i * 1.3) * 0.5 + 0.5) * W
          const dy = (Math.cos(t * 0.003 + i * 0.9) * 0.5 + 0.5) * H
          const da = 0.04 + Math.sin(t * 0.01 + i) * 0.03
          ctx.save(); ctx.shadowColor = gold; ctx.shadowBlur = 4 * S
          ctx.fillStyle = `rgba(255,215,0,${da})`
          ctx.beginPath()
          ctx.arc(dx, dy, 2.5 * S, 0, Math.PI * 2)
          ctx.fill(); ctx.restore()
        }
      }

      updateReels(p)
      drawMachine()
      drawSparks()
      drawReveal(p)

      // Fade out
      if (p > 0.92) {
        ctx.fillStyle = `rgba(5,0,10,${(p - 0.92) / 0.08})`
        ctx.fillRect(0, 0, W, H)
      }

      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }

    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

export function introElimChairsInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 4500; _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const cx = W / 2, cy = H * 0.46

    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const n = participants.length
    const numChairs = n - 1
    const chairR = 75 * S          // chairs orbit radius
    const walkR = chairR + 38 * S  // walkers orbit radius

    // Color palette
    const hues = participants.map((_, i) => (i * 360 / n + 200) % 360)

    interface Chair { angle: number; taken: boolean; seatColor: string }
    interface Person {
      name: string; isWinner: boolean; angle: number; radius: number
      hue: number; targetAngle: number; seated: boolean; seatProgress: number
    }

    const chairs: Chair[] = Array.from({ length: numChairs }, (_, i) => ({
      angle: (i / numChairs) * Math.PI * 2,
      taken: false,
      seatColor: `hsl(${30 + i * 15}, 50%, 35%)`
    }))

    const people: Person[] = participants.map((p, i) => ({
      name: p.name, isWinner: p.id === winnerId,
      angle: (i / n) * Math.PI * 2, radius: walkR,
      hue: hues[i], targetAngle: 0, seated: false, seatProgress: 0
    }))

    let phase: 'walk' | 'stop' | 'sit' | 'reveal' = 'walk'
    let musicBeat = 0, t = 0

    // Small sparks
    interface Spark { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
    const sparks: Spark[] = []

    const ease = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2

    function update() {
      const p = Math.min(t / DUR, 1)

      if (phase === 'walk') {
        musicBeat = Math.sin(t * 0.15) * 0.5 + 0.5
        people.forEach(per => { per.angle += 0.025 + Math.sin(t * 0.004 + per.hue) * 0.008 })
        if (p > 0.42) phase = 'stop'
      }

      if (phase === 'stop') {
        // Assign nearest chairs to non-winners
        const nonWinners = people.filter(pp => !pp.isWinner)
        const available = chairs.filter(c => !c.taken)
        if (available.length > 0) {
          nonWinners.forEach(pp => {
            if (pp.seated) return
            let best = -1, bestDist = Infinity
            chairs.forEach((c, ci) => {
              if (c.taken) return
              const d = Math.abs(Math.atan2(Math.sin(c.angle - pp.angle), Math.cos(c.angle - pp.angle)))
              if (d < bestDist) { bestDist = d; best = ci }
            })
            if (best >= 0) {
              chairs[best].taken = true
              pp.targetAngle = chairs[best].angle
              pp.seated = true
            }
          })
        }
        phase = 'sit'
      }

      if (phase === 'sit') {
        people.forEach(pp => {
          if (pp.seated) {
            pp.seatProgress = Math.min(pp.seatProgress + 0.025, 1)
            const e = ease(pp.seatProgress)
            // Lerp angle
            const diff = Math.atan2(Math.sin(pp.targetAngle - pp.angle), Math.cos(pp.targetAngle - pp.angle))
            pp.angle += diff * 0.15
            // Lerp radius to chair radius
            pp.radius = walkR + (chairR - walkR) * e
          } else if (pp.isWinner) {
            // Winner panics — moves fast
            pp.angle += 0.06
          }
        })
        const allSeated = people.filter(pp => pp.seated).every(pp => pp.seatProgress > 0.85)
        if (allSeated && p > 0.68) phase = 'reveal'
      }
    }

    function drawFloor() {
      // Orbit paths — glowing
      ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 6 * S
      ctx.strokeStyle = _alpha(accent, 0.08)
      ctx.lineWidth = 2 * S
      ctx.beginPath(); ctx.arc(cx, cy, chairR, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx, cy, walkR, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
    }

    function drawChairs() {
      chairs.forEach(c => {
        const x = cx + Math.cos(c.angle) * chairR
        const y = cy + Math.sin(c.angle) * chairR
        const sz = 15 * S

        // Chair shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.beginPath()
        ctx.ellipse(x, y + sz * 0.6, sz * 0.9, sz * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()

        // Chair seat — with glow when taken
        ctx.save()
        if (c.taken) { ctx.shadowColor = '#C49A2A'; ctx.shadowBlur = 8 * S }
        ctx.fillStyle = c.taken ? '#8B6914' : '#C49A2A'
        ctx.beginPath()
        ctx.roundRect(x - sz, y - sz, sz * 2, sz * 2, 4 * S)
        ctx.fill()
        ctx.strokeStyle = c.taken ? '#6B4F10' : '#A07A20'
        ctx.lineWidth = 1.5 * S; ctx.stroke()
        ctx.restore()

        // Chair back indicator
        const backAngle = c.angle + Math.PI
        ctx.fillStyle = c.taken ? '#6B4F10' : '#8B6914'
        ctx.beginPath()
        ctx.arc(x + Math.cos(backAngle) * sz * 0.7, y + Math.sin(backAngle) * sz * 0.7, sz * 0.5, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    function drawPeople() {
      people.forEach(pp => {
        const x = cx + Math.cos(pp.angle) * pp.radius
        const y = cy + Math.sin(pp.angle) * pp.radius
        const sz = 12 * S
        const bob = phase === 'walk' ? Math.sin(t * 0.2 + pp.hue) * 2 * S : 0

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath()
        ctx.ellipse(x, y + sz + 3 * S, sz * 0.8, sz * 0.25, 0, 0, Math.PI * 2)
        ctx.fill()

        // Body
        const col = pp.isWinner ? '#FF6B6B' : `hsl(${pp.hue}, 70%, 60%)`
        ctx.save()
        ctx.shadowColor = col
        ctx.shadowBlur = (pp.isWinner && phase === 'reveal') ? 22 * S : 6 * S
        const grad = ctx.createRadialGradient(x, y + bob - sz * 0.3, 0, x, y + bob, sz)
        grad.addColorStop(0, '#FFF')
        grad.addColorStop(0.35, col)
        grad.addColorStop(1, _alpha(col, 0.4))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y + bob, sz, 0, Math.PI * 2)
        ctx.fill()
        if (pp.isWinner && phase === 'reveal') {
          ctx.shadowBlur = 40 * S; ctx.globalAlpha = 0.3; ctx.fill()
        }
        ctx.restore()

        // Name — bigger
        ctx.save()
        ctx.shadowColor = (pp.isWinner && phase === 'reveal') ? '#FF6B6B' : 'transparent'
        ctx.shadowBlur = (pp.isWinner && phase === 'reveal') ? 8 * S : 0
        ctx.fillStyle = pp.isWinner && phase === 'reveal' ? '#FF6B6B' : 'rgba(255,255,255,0.85)'
        ctx.font = `${pp.isWinner ? '800' : '600'} ${Math.round(11 * S)}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(pp.name, x, y + bob - sz - 7 * S)
        ctx.restore()
      })
    }

    function drawMusicVisualizer() {
      if (phase !== 'walk') return
      const pulse = musicBeat
      // Pulsing rings — with glow
      ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 6 * S
      ctx.strokeStyle = _alpha(accent, 0.12 + pulse * 0.18)
      ctx.lineWidth = 2 * S
      for (let r = 0; r < 3; r++) {
        const rad = chairR * (0.3 + r * 0.15) + pulse * 10 * S
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.restore()
      // Note symbol — glowing
      ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 12 * S
      ctx.fillStyle = _alpha(accent, 0.5 + pulse * 0.4)
      ctx.font = `${Math.round(24 * S)}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('♪', cx, cy); ctx.restore()
    }

    function drawStopFlash() {
      const p = Math.min(t / DUR, 1)
      if (p < 0.42 || p > 0.52) return
      const flash = 1 - (p - 0.42) / 0.1
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,60,60,${flash * 0.15})`
        ctx.fillRect(0, 0, W, H)
      }
    }

    function drawReveal() {
      if (phase !== 'reveal') return
      const p = Math.min(t / DUR, 1)
      const rp = Math.min((p - 0.68) / 0.25, 1)

      // Spotlight on winner
      const wp = people.find(pp => pp.isWinner)!
      const wx = cx + Math.cos(wp.angle) * wp.radius
      const wy = cy + Math.sin(wp.angle) * wp.radius

      const spotGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, 60 * S)
      spotGrad.addColorStop(0, `rgba(255,107,107,${rp * 0.2})`)
      spotGrad.addColorStop(1, 'rgba(255,107,107,0)')
      ctx.fillStyle = spotGrad
      ctx.fillRect(0, 0, W, H)

      // Winner name — bigger with double glow
      ctx.save()
      ctx.globalAlpha = rp
      ctx.shadowColor = '#FF6B6B'
      ctx.shadowBlur = 28 * S
      ctx.fillStyle = '#FF6B6B'
      ctx.font = `900 ${Math.round(26 * S)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(winnerName, cx, H * 0.08)
      ctx.shadowBlur = 48 * S; ctx.globalAlpha = rp * 0.4
      ctx.fillText(winnerName, cx, H * 0.08)
      ctx.restore()
    }

    function drawSparks() {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx; s.y += s.vy; s.vy += 0.1 * S; s.life--
        if (s.life <= 0) { sparks.splice(i, 1); continue }
        const a = s.life / s.maxLife
        ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 8 * S * a
        ctx.globalAlpha = a; ctx.fillStyle = s.color
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * a, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Background — richer
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H))
      bg.addColorStop(0, '#1e1438'); bg.addColorStop(0.5, '#0d0820')
      bg.addColorStop(1, '#05030c')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      update()
      drawFloor()
      drawMusicVisualizer()
      drawChairs()
      drawPeople()
      drawStopFlash()
      drawReveal()
      drawSparks()

      // Fade out
      if (p > 0.92) {
        ctx.fillStyle = `rgba(5,3,12,${(p - 0.92) / 0.08})`
        ctx.fillRect(0, 0, W, H)
      }

      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }

    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

export function introRussianRouletteInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 5000; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const danger = '#FF4444'
    const steel = '#8899AA'
    const cx = W / 2, cy = H * 0.46

    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const n = participants.length

    // Players around circle
    const tableR = 95 * S
    // Winner is always last
    const sorted = [...participants].sort((a, b) => {
      if (a.id === winnerId) return 1; if (b.id === winnerId) return -1; return 0
    })

    interface Seat {
      name: string; isWinner: boolean; angle: number
      hue: number; pulse: number; eliminated: boolean
    }
    const seats: Seat[] = sorted.map((p, i) => ({
      name: p.name, isWinner: p.id === winnerId,
      angle: (i / n) * Math.PI * 2 - Math.PI / 2,
      hue: p.id === winnerId ? 0 : 180 + i * 40,
      pulse: Math.random() * Math.PI * 2, eliminated: false
    }))

    // Gun spins and lands on players sequentially
    // Spins: (n-1) "click" spins + 1 final "bang" spin → always winner last
    let gunAngle = -Math.PI / 2    // current visual angle
    let gunTargetAngle = seats[0].angle
    let currentTarget = 0
    let phase: 'spin' | 'pause' | 'bang' | 'result' = 'spin'
    let spinStartT = 0, pauseStartT = 0
    const spinDuration = 400        // ms per spin
    const pauseDuration = 300        // ms pause on each player
    let bangFired = false, flashAlpha = 0, t = 0

    // Particles
    interface Spark { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
    const sparks: Spark[] = []

    function burst(bx: number, by: number, col: string, count: number) {
      for (let i = 0; i < (slow ? Math.ceil(count / 2) : count); i++) {
        const a = Math.random() * Math.PI * 2
        const sp = (3 + Math.random() * 8) * S
        sparks.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 40 + Math.random() * 50, maxLife: 90, color: col, size: (1.5 + Math.random() * 3) * S })
      }
    }

    function update() {
      const elapsed = t - spinStartT

      if (phase === 'spin') {
        // Animate gun from current angle to target with easeOut
        const prog = Math.min(elapsed / spinDuration, 1)
        const eased = 1 - Math.pow(1 - prog, 3)
        // We need to spin forward — add extra full rotations for drama
        const extraSpin = currentTarget === 0 ? Math.PI * 4 : Math.PI * 2
        gunAngle = gunTargetAngle - extraSpin * (1 - eased) + gunTargetAngle * 0

        // Actually compute properly: start → target with extra spins
        const startA = currentTarget === 0 ? -Math.PI / 2 : seats[currentTarget - 1].angle
        const endA = seats[currentTarget].angle + (currentTarget === n - 1 ? Math.PI * 4 : Math.PI * 2)
        gunAngle = startA + (endA - startA) * eased

        if (prog >= 1) {
          gunAngle = seats[currentTarget].angle
          phase = 'pause'
          pauseStartT = t
        }
      }

      if (phase === 'pause') {
        const pauseElapsed = t - pauseStartT
        if (pauseElapsed > pauseDuration) {
          if (seats[currentTarget].isWinner) {
            // This is the winner → BANG
            phase = 'bang'
            bangFired = true
            flashAlpha = 0.7
            const seat = seats[currentTarget]
            const sx = cx + Math.cos(seat.angle) * tableR
            const sy = cy + Math.sin(seat.angle) * tableR
            burst(sx, sy, danger, 35)
            burst(cx, cy, '#FFD700', 20)
            seat.eliminated = true
          } else {
            // Click — move to next
            currentTarget++
            if (currentTarget < n) {
              gunTargetAngle = seats[currentTarget].angle
              phase = 'spin'
              spinStartT = t
            }
          }
        }
      }

      if (phase === 'bang' && !seats[currentTarget]) {
        phase = 'result'
      }

      // Flash decay
      if (flashAlpha > 0) flashAlpha *= 0.93

      // Pulse
      seats.forEach(s => { s.pulse += 0.1 })
    }

    function drawTable() {
      // Dark table surface
      const tGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, tableR + 40 * S)
      tGrad.addColorStop(0, 'rgba(40,25,20,0.9)')
      tGrad.addColorStop(0.8, 'rgba(30,18,14,0.95)')
      tGrad.addColorStop(1, 'rgba(20,10,8,0)')
      ctx.fillStyle = tGrad
      ctx.beginPath()
      ctx.arc(cx, cy, tableR + 40 * S, 0, Math.PI * 2)
      ctx.fill()

      // Table edge ring
      ctx.strokeStyle = 'rgba(80,50,30,0.4)'
      ctx.lineWidth = 3 * S
      ctx.beginPath()
      ctx.arc(cx, cy, tableR + 20 * S, 0, Math.PI * 2)
      ctx.stroke()
    }

    function drawSeats() {
      seats.forEach((s, i) => {
        const x = cx + Math.cos(s.angle) * tableR
        const y = cy + Math.sin(s.angle) * tableR
        const sz = 14 * S
        const col = s.isWinner ? danger : `hsl(${s.hue}, 65%, 55%)`

        // Glow for current target
        if (i === currentTarget && (phase === 'pause' || phase === 'spin')) {
          const gl = ctx.createRadialGradient(x, y, 0, x, y, sz * 2.5)
          gl.addColorStop(0, _alpha(col, 0.25))
          gl.addColorStop(1, _alpha(col, 0))
          ctx.fillStyle = gl
          ctx.fillRect(x - sz * 3, y - sz * 3, sz * 6, sz * 6)
        }

        // Person circle
        ctx.save()
        if (s.eliminated) {
          ctx.globalAlpha = 0.25
        }
        const pulseSz = s.eliminated ? sz * 0.8 : sz * (1 + Math.sin(s.pulse) * 0.05)
        const grad = ctx.createRadialGradient(x - pulseSz * 0.2, y - pulseSz * 0.2, 0, x, y, pulseSz)
        grad.addColorStop(0, '#FFF')
        grad.addColorStop(0.4, col)
        grad.addColorStop(1, _alpha(col, 0.4))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, pulseSz, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Name
        const nameY = y + sz + 12 * S
        ctx.fillStyle = s.eliminated ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)'
        ctx.font = `${s.isWinner ? '700' : '500'} ${Math.round(10 * S)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(s.name, x, nameY)
      })
    }

    function drawGun() {
      // Revolver in center pointing at gunAngle
      const gunLen = 30 * S
      const tipX = cx + Math.cos(gunAngle) * gunLen
      const tipY = cy + Math.sin(gunAngle) * gunLen
      const gripX = cx - Math.cos(gunAngle) * gunLen * 0.5
      const gripY = cy - Math.sin(gunAngle) * gunLen * 0.5

      // Shadow
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 8 * S
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(gripX + 2 * S, gripY + 2 * S)
      ctx.lineTo(tipX + 2 * S, tipY + 2 * S)
      ctx.stroke()
      ctx.restore()

      // Barrel
      const barrelGrad = ctx.createLinearGradient(gripX, gripY, tipX, tipY)
      barrelGrad.addColorStop(0, '#555')
      barrelGrad.addColorStop(0.3, '#888')
      barrelGrad.addColorStop(0.7, '#666')
      barrelGrad.addColorStop(1, '#444')
      ctx.strokeStyle = barrelGrad
      ctx.lineWidth = 6 * S
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(gripX, gripY)
      ctx.lineTo(tipX, tipY)
      ctx.stroke()

      // Cylinder (circle in center)
      ctx.fillStyle = '#555'
      ctx.beginPath()
      ctx.arc(cx, cy, 8 * S, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#444'
      ctx.lineWidth = 1.5 * S
      ctx.stroke()

      // Chamber holes
      for (let i = 0; i < 6; i++) {
        const ca = (i / 6) * Math.PI * 2
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.arc(cx + Math.cos(ca) * 4.5 * S, cy + Math.sin(ca) * 4.5 * S, 1.8 * S, 0, Math.PI * 2)
        ctx.fill()
      }

      // Grip
      ctx.fillStyle = '#6B4226'
      ctx.beginPath()
      ctx.arc(gripX, gripY, 5 * S, 0, Math.PI * 2)
      ctx.fill()

      // Muzzle flash on bang
      if (bangFired && flashAlpha > 0.1) {
        ctx.save()
        ctx.globalAlpha = flashAlpha
        ctx.shadowColor = '#FFFF00'
        ctx.shadowBlur = 25 * S
        ctx.fillStyle = '#FFFF00'
        ctx.beginPath()
        ctx.arc(tipX, tipY, 10 * S, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FF6600'
        ctx.beginPath()
        ctx.arc(tipX, tipY, 16 * S, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.restore()
      }

      // Directional indicator dot at tip
      ctx.fillStyle = bangFired ? danger : steel
      ctx.beginPath()
      ctx.arc(tipX, tipY, 2.5 * S, 0, Math.PI * 2)
      ctx.fill()
    }

    function drawSparks() {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx; s.y += s.vy; s.vy += 0.1 * S; s.vx *= 0.97; s.life--
        if (s.life <= 0) { sparks.splice(i, 1); continue }
        const a = s.life / s.maxLife
        ctx.save()
        ctx.globalAlpha = a
        ctx.shadowColor = s.color
        ctx.shadowBlur = 4 * S
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * a, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.restore()
      }
    }

    function drawReveal() {
      if (!bangFired) return
      const p = Math.min(t / DUR, 1)
      if (p < 0.82) return
      const rp = Math.min((p - 0.82) / 0.15, 1)

      ctx.save()
      ctx.globalAlpha = rp
      ctx.shadowColor = danger
      ctx.shadowBlur = 18 * S
      ctx.fillStyle = danger
      ctx.font = `700 ${Math.round(22 * S)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(winnerName, cx, H * 0.08)
      ctx.shadowBlur = 0
      ctx.restore()
    }

    function draw() {
      const p = Math.min(t / DUR, 1)

      // Background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H))
      bg.addColorStop(0, 'rgba(45,15,15,1)')
      bg.addColorStop(0.6, 'rgba(25,8,8,1)')
      bg.addColorStop(1, 'rgba(10,3,3,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      update()
      drawTable()
      drawSeats()
      drawGun()
      drawSparks()
      drawReveal()

      // Flash overlay
      if (flashAlpha > 0.01) {
        ctx.fillStyle = `rgba(255,200,100,${flashAlpha * 0.5})`
        ctx.fillRect(0, 0, W, H)
      }

      // Fade out
      if (p > 0.93) {
        ctx.fillStyle = `rgba(10,3,3,${(p - 0.93) / 0.07})`
        ctx.fillRect(0, 0, W, H)
      }

      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }

    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

export function introOrderRaceInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 4500; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const accent = _css('--color-accent', '#00F5FF')
    const gold = '#FFD700'
    const cx = W / 2, cy = H * 0.44
    
    // Get winner name
    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    
    // Setup race
    const trackWidth = W * 0.8
    const startX = W * 0.1
    const finishX = startX + trackWidth
    const laneHeight = 35 * S
    const totalTrackHeight = participants.length * laneHeight
    const trackStartY = cy - totalTrackHeight / 2
    
    interface RaceCar {
      name: string; isWinner: boolean
      lane: number; x: number; y: number
      speed: number; baseSpeed: number
      position: number; finished: boolean
      color: string; boostPhase: number
    }
    
    const cars: RaceCar[] = []
    
    // Create cars for each participant
    participants.forEach((participant, idx) => {
      const isWinner = participant.id === winnerId
      // Winner gets slower speed to arrive last
      const baseSpeed = isWinner ? 0.3 : (0.8 + Math.random() * 0.4)
      
      cars.push({
        name: participant.name,
        isWinner: isWinner,
        lane: idx,
        x: startX,
        y: trackStartY + idx * laneHeight + laneHeight/2,
        speed: baseSpeed,
        baseSpeed: baseSpeed,
        position: 0,
        finished: false,
        color: isWinner ? '#FF6B6B' : `hsl(${idx * 360 / participants.length}, 70%, 60%)`,
        boostPhase: 0
      })
    })
    
    let raceStarted = false, raceFinished = false, t = 0
    const finishedOrder: RaceCar[] = []
    
    interface RaceParticle {
      x: number; y: number; vx: number; vy: number
      alpha: number; size: number; color: string
      type: 'exhaust' | 'dust' | 'spark' | 'confetti'
      life: number; maxLife: number
    }
    
    const particles: RaceParticle[] = []

    function addRaceEffects(x: number, y: number, type: 'car_exhaust' | 'tire_dust' | 'finish_sparks') {
      const count = type === 'car_exhaust' ? (slow ? 2 : 4) : 
                   type === 'tire_dust' ? (slow ? 3 : 6) : 
                   (slow ? 8 : 15)
      
      for (let i = 0; i < count; i++) {
        if (type === 'car_exhaust') {
          particles.push({
            x: x - 15 * S + Math.random() * 5 * S,
            y: y + (Math.random() - 0.5) * 8 * S,
            vx: -(2 + Math.random() * 3) * S,
            vy: (Math.random() - 0.5) * 2 * S,
            alpha: 0.7,
            size: (3 + Math.random() * 5) * S,
            color: '#666',
            type: 'exhaust',
            life: 40 + Math.random() * 30,
            maxLife: 70
          })
        } else if (type === 'tire_dust') {
          particles.push({
            x: x + (Math.random() - 0.5) * 10 * S,
            y: y + 8 * S + Math.random() * 5 * S,
            vx: (Math.random() - 0.5) * 4 * S,
            vy: -(Math.random() * 3) * S,
            alpha: 0.6,
            size: (2 + Math.random() * 4) * S,
            color: '#D2B48C',
            type: 'dust',
            life: 50 + Math.random() * 40,
            maxLife: 90
          })
        } else {
          const angle = Math.random() * Math.PI * 2
          const speed = (3 + Math.random() * 8) * S
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: (2 + Math.random() * 4) * S,
            color: gold,
            type: 'spark',
            life: 60 + Math.random() * 40,
            maxLife: 100
          })
        }
      }
    }

    function updateParticles() {
      particles.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy
        
        if (particle.type === 'exhaust') {
          particle.vx *= 0.98
          particle.vy *= 0.98
        } else if (particle.type === 'dust') {
          particle.vy += 0.1 * S // Light gravity
          particle.vx *= 0.97
        } else if (particle.type === 'spark') {
          particle.vx *= 0.95
          particle.vy *= 0.95
        }
        
        particle.life--
        particle.alpha = particle.life / particle.maxLife
        if (particle.life <= 0) return
        
        // Draw particle
        ctx.save()
        ctx.globalAlpha = particle.alpha
        
        if (particle.type === 'exhaust') {
          const exhaustGrad = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size/2)
          exhaustGrad.addColorStop(0, `rgba(102,102,102,${particle.alpha})`)
          exhaustGrad.addColorStop(1, 'rgba(102,102,102,0)')
          ctx.fillStyle = exhaustGrad
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size/2, 0, Math.PI * 2)
          ctx.fill()
        } else if (particle.type === 'dust') {
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size/2, 0, Math.PI * 2)
          ctx.fill()
        } else if (particle.type === 'spark') {
          ctx.shadowColor = particle.color
          ctx.shadowBlur = 4 * S
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size/2, 0, Math.PI * 2)
          ctx.fill()
        }
        
        ctx.shadowBlur = 0
        ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
    }

    function updateRaceLogic() {
      const p = Math.min(t / DUR, 1)
      
      // Start race at 20%
      if (p > 0.2 && !raceStarted) {
        raceStarted = true
      }
      
      if (raceStarted && !raceFinished) {
        cars.forEach(car => {
          if (!car.finished) {
            // Add some speed variation and boosts
            const speedVariation = 0.9 + Math.random() * 0.2
            const currentSpeed = car.baseSpeed * speedVariation
            
            // Random boost for non-winners
            if (!car.isWinner && Math.random() < 0.02) {
              car.boostPhase = 30
            }
            
            if (car.boostPhase > 0) {
              car.speed = car.baseSpeed * 1.5
              car.boostPhase--
            } else {
              car.speed = currentSpeed
            }
            
            car.x += car.speed * S
            
            // Add exhaust particles
            if (Math.random() < 0.3) {
              addRaceEffects(car.x, car.y, 'car_exhaust')
            }
            
            // Add dust particles occasionally
            if (Math.random() < 0.1) {
              addRaceEffects(car.x, car.y, 'tire_dust')
            }
            
            // Check if finished
            if (car.x >= finishX) {
              car.finished = true
              car.position = finishedOrder.length + 1
              finishedOrder.push(car)
              
              // Add finish effects
              addRaceEffects(finishX, car.y, 'finish_sparks')
              
              // Check if race is complete
              if (finishedOrder.length === cars.length) {
                raceFinished = true
              }
            }
          }
        })
      }
    }

    function drawTrack() {
      // Track background
      ctx.fillStyle = 'rgba(50,50,50,0.8)'
      ctx.fillRect(startX, trackStartY, trackWidth, totalTrackHeight)
      
      // Lane dividers
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 1 * S
      for (let i = 1; i < participants.length; i++) {
        const y = trackStartY + i * laneHeight
        ctx.beginPath()
        ctx.setLineDash([10 * S, 5 * S])
        ctx.moveTo(startX, y)
        ctx.lineTo(startX + trackWidth, y)
        ctx.stroke()
      }
      ctx.setLineDash([])
      
      // Start line
      ctx.strokeStyle = '#00FF00'
      ctx.lineWidth = 3 * S
      ctx.beginPath()
      ctx.moveTo(startX, trackStartY)
      ctx.lineTo(startX, trackStartY + totalTrackHeight)
      ctx.stroke()
      
      // Finish line (checkered)
      const checkSize = 8 * S
      for (let y = trackStartY; y < trackStartY + totalTrackHeight; y += checkSize) {
        for (let x = finishX - checkSize; x < finishX + checkSize; x += checkSize) {
          const isBlack = (Math.floor((x - finishX + checkSize) / checkSize) + Math.floor((y - trackStartY) / checkSize)) % 2 === 0
          ctx.fillStyle = isBlack ? '#000' : '#FFF'
          ctx.fillRect(x, y, checkSize, Math.min(checkSize, trackStartY + totalTrackHeight - y))
        }
      }
    }

    function drawCars() {
      cars.forEach(car => {
        const carWidth = 30 * S
        const carHeight = 16 * S
        
        ctx.save()
        
        // Car body
        const carGrad = ctx.createLinearGradient(car.x - carWidth/2, 0, car.x + carWidth/2, 0)
        carGrad.addColorStop(0, _alpha(car.color, 0.4))
        carGrad.addColorStop(0.5, car.color)
        carGrad.addColorStop(1, _alpha(car.color, 0.4))
        
        // Boost glow effect
        if (car.boostPhase > 0) {
          ctx.shadowColor = car.color
          ctx.shadowBlur = 15 * S
        }
        
        ctx.fillStyle = carGrad
        ctx.fillRect(car.x - carWidth/2, car.y - carHeight/2, carWidth, carHeight)
        
        // Car details
        ctx.fillStyle = '#333'
        // Windshield
        ctx.fillRect(car.x + carWidth/4, car.y - carHeight/3, carWidth/4, carHeight/1.5)
        
        // Wheels
        ctx.fillStyle = '#222'
        ctx.beginPath()
        ctx.arc(car.x - carWidth/3, car.y + carHeight/2, 4 * S, 0, Math.PI * 2)
        ctx.arc(car.x + carWidth/3, car.y + carHeight/2, 4 * S, 0, Math.PI * 2)
        ctx.fill()
        
        // Car name
        ctx.fillStyle = '#FFF'
        ctx.font = `bold ${Math.round(9 * S)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(car.name, car.x, car.y)
        
        // Position indicator if finished
        if (car.finished) {
          ctx.fillStyle = car.position <= 3 ? gold : accent
          ctx.font = `bold ${Math.round(12 * S)}px sans-serif`
          ctx.fillText(`${car.position}°`, car.x, car.y - carHeight - 8 * S)
        }
        
        ctx.restore()
      })
    }

    function drawRaceUI() {
      const p = Math.min(t / DUR, 1)
      
      // Race countdown
      if (p < 0.2) {
        const countdownPhase = p / 0.2
        const countdownNumber = countdownPhase < 0.33 ? '3' : countdownPhase < 0.66 ? '2' : '1'
        const pulse = 1 + Math.sin(countdownPhase * Math.PI * 10) * 0.3
        
        ctx.save()
        ctx.shadowColor = '#00FF00'
        ctx.shadowBlur = 20 * S
        ctx.fillStyle = '#00FF00'
        ctx.font = `bold ${Math.round(60 * S * pulse)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(countdownNumber, cx, cy - 80 * S)
        ctx.restore()
      } else if (p >= 0.2 && p < 0.3) {
        const goPhase = (p - 0.2) / 0.1
        const goPulse = 1 + Math.sin(goPhase * Math.PI * 6) * 0.4
        
        ctx.save()
        ctx.shadowColor = gold
        ctx.shadowBlur = 25 * S
        ctx.fillStyle = gold
        ctx.font = `bold ${Math.round(48 * S * goPulse)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.globalAlpha = 1 - goPhase
        ctx.fillText('🏁 GO! 🏁', cx, cy - 80 * S)
        ctx.restore()
      }
      
      // Race finished - show winner (last place)
      if (raceFinished && p > 0.8) {
        const resultPhase = Math.min((p - 0.8) / 0.2, 1)
        const resultPulse = 1 + Math.sin(t * 0.12) * 0.3
        
        ctx.save()
        ctx.shadowColor = '#FF6B6B'
        ctx.shadowBlur = 20 * S * resultPulse
        ctx.fillStyle = '#FF6B6B'
        ctx.font = `bold ${Math.round(32 * S * resultPhase * resultPulse)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.globalAlpha = resultPhase
        ctx.fillText(winnerName, cx, cy + totalTrackHeight/2 + 60 * S)
        ctx.restore()
      }
    }

    function draw() {
      // Race background
      const bgGrad = ctx.createLinearGradient(0, 0, W, 0)
      bgGrad.addColorStop(0, 'rgba(20,40,60,0.95)')
      bgGrad.addColorStop(0.5, 'rgba(30,50,70,0.98)')
      bgGrad.addColorStop(1, 'rgba(40,60,80,1)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)
      
      updateRaceLogic()
      drawTrack()
      drawCars()
      drawRaceUI()
      updateParticles()
      
      // Smooth fadeout
      const p = Math.min(t / DUR, 1)
      if (p > 0.9) {
        ctx.fillStyle = `rgba(20,40,60,${Math.min((p - 0.9) / 0.1, 1)})`
        ctx.fillRect(0, 0, W, H)
      }
      
      t += 16
      if (t < DUR + 500) requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 200)
  })
}

export function introOrderPodiumInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 4500; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const gold = '#FFD700'; const silver = '#C0C0C0'; const bronze = '#CD7F32'
    const cx = W / 2

    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'

    // Podium layout: 2nd | 1st | 3rd, with extras to the sides
    // Winner always goes to last revealed position for drama
    const n = participants.length
    const baseY = H * 0.78
    const sw = Math.min(60 * S, (W * 0.8) / Math.max(n, 3))

    // Build reveal order: extras first (4th, 5th...), then 3rd, 2nd, 1st
    // Winner goes to position n (last place) — always revealed last
    const order = [...participants].sort((a, b) => {
      if (a.id === winnerId) return 1
      if (b.id === winnerId) return -1
      return Math.random() - 0.5
    })

    const colors = [gold, silver, bronze]
    const heights = [110 * S, 80 * S, 60 * S]
    // Positions: 1st=center, 2nd=left of center, 3rd=right of center, rest spread
    function getX(rank: number): number {
      if (rank === 0) return cx                      // 1st
      if (rank === 1) return cx - sw * 1.15          // 2nd
      if (rank === 2) return cx + sw * 1.15          // 3rd
      const extraIdx = rank - 3
      const extraCount = n - 3
      const startX = cx - (extraCount - 1) * sw * 0.6
      return startX + extraIdx * sw * 1.2
    }

    interface Spot {
      name: string; rank: number; x: number
      targetH: number; h: number; color: string; label: string
      isWinner: boolean; revealed: boolean; revealT: number
      personY: number // current Y of person avatar walking in from below
    }

    // Reveal order: extras (highest rank#) → 3rd → 2nd → 1st
    const revealOrder = [...Array(n)].map((_, i) => i).sort((a, b) => b - a)

    const spots: Spot[] = order.map((p, rank) => ({
      name: p.name, rank, x: getX(rank),
      targetH: rank < 3 ? heights[rank] : 25 * S,
      h: 0, color: rank < 3 ? colors[rank] : '#555',
      label: `${rank + 1}°`, isWinner: p.id === winnerId,
      revealed: false, revealT: 0,
      personY: H + 30 * S // starts below screen
    }))

    let t = 0, nextReveal = 0

    // Particles
    interface Part { x: number; y: number; vx: number; vy: number; life: number; mLife: number; color: string; sz: number; rot: number; rv: number }
    const parts: Part[] = []

    function confetti(px: number, py: number, col: string, count: number) {
      for (let i = 0; i < (slow ? Math.ceil(count / 2) : count); i++) {
        const a = Math.random() * Math.PI * 2
        const sp = (3 + Math.random() * 7) * S
        parts.push({
          x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3 * S,
          life: 70 + Math.random() * 70, mLife: 140,
          color: Math.random() < 0.3 ? '#FFF' : col,
          sz: (2.5 + Math.random() * 5) * S, rot: Math.random() * 6.28, rv: (Math.random() - 0.5) * 0.2
        })
      }
    }

    function easeOutBack(x: number): number {
      const c1 = 1.70158; const c3 = c1 + 1
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
    }

    function update() {
      const p = Math.min(t / DUR, 1)

      // Reveal spots one by one
      if (p > 0.12 && nextReveal < n) {
        const interval = 0.55 / n
        const rTime = 0.12 + nextReveal * interval
        if (p > rTime) {
          const revIdx = revealOrder[nextReveal]
          const sp = spots[revIdx]
          sp.revealed = true
          sp.revealT = t
          nextReveal++
        }
      }

      // Animate revealed spots
      spots.forEach(sp => {
        if (!sp.revealed) return
        const elapsed = t - sp.revealT
        // Podium rises 400ms
        const riseP = Math.min(elapsed / 400, 1)
        sp.h = sp.targetH * easeOutBack(riseP)

        // Person walks up from below to top of podium — 500ms, starting at 200ms
        const walkP = Math.min(Math.max((elapsed - 200) / 500, 0), 1)
        const easedWalk = 1 - Math.pow(1 - walkP, 3)
        sp.personY = H + 30 * S + (baseY - sp.h - 20 * S - H - 30 * S) * easedWalk

        // Trigger confetti when person arrives
        if (walkP >= 0.99 && walkP - (16 / 500) < 0.99) {
          if (sp.rank === 0) confetti(sp.x, sp.personY, gold, 30)
          else if (sp.rank === 1) confetti(sp.x, sp.personY, silver, 18)
          else if (sp.rank === 2) confetti(sp.x, sp.personY, bronze, 12)
        }
      })
    }

    function drawPodiums() {
      // Draw from back to front (extras first, then 3rd, 2nd, 1st)
      const drawOrder = [...spots].sort((a, b) => b.rank - a.rank)

      drawOrder.forEach(sp => {
        if (sp.h < 1) return

        // Block
        const fGrad = ctx.createLinearGradient(sp.x - sw / 2, 0, sp.x + sw / 2, 0)
        fGrad.addColorStop(0, _alpha(sp.color, 0.3))
        fGrad.addColorStop(0.5, _alpha(sp.color, 0.55))
        fGrad.addColorStop(1, _alpha(sp.color, 0.2))
        ctx.fillStyle = fGrad
        ctx.fillRect(sp.x - sw / 2, baseY - sp.h, sw, sp.h + 2)

        // Top edge highlight
        ctx.strokeStyle = _alpha(sp.color, 0.7)
        ctx.lineWidth = 1.5 * S
        ctx.beginPath()
        ctx.moveTo(sp.x - sw / 2, baseY - sp.h)
        ctx.lineTo(sp.x + sw / 2, baseY - sp.h)
        ctx.stroke()

        // Rank label on podium face
        ctx.fillStyle = _alpha(sp.color, 0.85)
        ctx.font = `700 ${Math.round(18 * S)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(sp.label, sp.x, baseY - sp.h / 2 + 6 * S)
      })
    }

    function drawPeople() {
      spots.forEach(sp => {
        if (!sp.revealed) return
        const px = sp.x
        const py = sp.personY
        if (py > H + 20 * S) return

        const sz = 12 * S
        const col = sp.isWinner ? '#FF6B6B' : sp.color

        // Avatar circle
        ctx.save()
        if (sp.rank === 0) {
          ctx.shadowColor = col; ctx.shadowBlur = 10 * S
        }
        const g = ctx.createRadialGradient(px - sz * 0.2, py - sz * 0.2, 0, px, py, sz)
        g.addColorStop(0, '#FFF')
        g.addColorStop(0.5, col)
        g.addColorStop(1, _alpha(col, 0.5))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(px, py, sz, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.restore()

        // Name above
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = `${sp.isWinner ? '700' : '500'} ${Math.round(10 * S)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(sp.name, px, py - sz - 6 * S)
      })
    }

    function drawParts() {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.12 * S; p.vx *= 0.99; p.rot += p.rv; p.life--
        if (p.life <= 0) { parts.splice(i, 1); continue }
        const a = p.life / p.mLife
        ctx.save()
        ctx.globalAlpha = a
        ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz)
        ctx.restore()
      }
    }

    function drawReveal() {
      const p = Math.min(t / DUR, 1)
      if (p < 0.82) return
      const rp = Math.min((p - 0.82) / 0.15, 1)
      const winSpot = spots.find(s => s.isWinner)
      if (!winSpot) return
      const posLabel = `${winSpot.rank + 1}°`

      ctx.save()
      ctx.globalAlpha = rp
      ctx.shadowColor = '#FF6B6B'
      ctx.shadowBlur = 16 * S
      ctx.fillStyle = '#FF6B6B'
      ctx.font = `700 ${Math.round(20 * S)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${winnerName} — ${posLabel}`, cx, H * 0.08)
      ctx.shadowBlur = 0
      ctx.restore()
    }

    function draw() {
      const p = Math.min(t / DUR, 1)
      // Background
      const bg = ctx.createRadialGradient(cx, H * 0.5, 0, cx, H * 0.5, Math.max(W, H))
      bg.addColorStop(0, 'rgba(20,30,60,1)')
      bg.addColorStop(0.6, 'rgba(12,18,40,1)')
      bg.addColorStop(1, 'rgba(5,8,18,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Floor line
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1 * S
      ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(W, baseY); ctx.stroke()

      update()
      drawPodiums()
      drawPeople()
      drawParts()
      drawReveal()

      // Fade out
      if (p > 0.93) {
        ctx.fillStyle = `rgba(5,8,18,${(p - 0.93) / 0.07})`
        ctx.fillRect(0, 0, W, H)
      }

      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }

    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

export function introElimBulbsInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 4500; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const danger = '#FF4444'
    const electric = '#FFD700'
    const cx = W / 2, cy = H * 0.42

    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'

    // Layout: horizontal row of hanging bulbs
    const n = participants.length
    const spacing = Math.min(80 * S, (W * 0.85) / n)
    const rowX = cx - (n - 1) * spacing / 2

    // Sort: winner last
    const sorted = [...participants].sort((a, b) => {
      if (a.id === winnerId) return 1
      if (b.id === winnerId) return -1
      return 0
    })

    interface Bulb {
      name: string; isWinner: boolean; x: number; y: number
      alive: boolean; dying: boolean; deathProgress: number
      brightness: number; hue: number; sway: number
    }

    const bulbs: Bulb[] = sorted.map((p, i) => ({
      name: p.name, isWinner: p.id === winnerId,
      x: rowX + i * spacing, y: cy,
      alive: true, dying: false, deathProgress: 0,
      brightness: 0.8 + Math.random() * 0.2,
      hue: p.id === winnerId ? 0 : 180 + i * 30,
      sway: Math.random() * Math.PI * 2
    }))

    let nextKill = 0, t = 0, flashAlpha = 0

    // Particles
    interface Shard { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; rot: number; rv: number }
    const shards: Shard[] = []

    function explode(bx: number, by: number, col: string, big: boolean) {
      const count = big ? (slow ? 20 : 40) : (slow ? 8 : 16)
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = (big ? 4 : 2) + Math.random() * (big ? 12 : 6)
        shards.push({
          x: bx, y: by,
          vx: Math.cos(a) * sp * S, vy: Math.sin(a) * sp * S - (big ? 3 : 1) * S,
          life: 50 + Math.random() * 60, maxLife: 110,
          color: Math.random() < 0.4 ? '#FFF' : col,
          size: (1.5 + Math.random() * (big ? 4 : 2.5)) * S,
          rot: Math.random() * Math.PI * 2, rv: (Math.random() - 0.5) * 0.3
        })
      }
    }

    function update() {
      const p = Math.min(t / DUR, 1)

      // Flicker all alive bulbs
      bulbs.forEach(b => {
        if (!b.alive) return
        b.sway += 0.04
        b.brightness = 0.6 + 0.4 * Math.sin(t * 0.08 + b.sway)
        // Intensify flicker before death
        if (p > 0.18 && !b.dying) {
          b.brightness += Math.sin(t * 0.4 + b.hue) * 0.2
        }
      })

      // Kill bulbs sequentially, winner last
      if (p > 0.22) {
        const killInterval = 0.45 / n
        const killTime = 0.22 + nextKill * killInterval
        if (p > killTime && nextKill < n) {
          const b = bulbs[nextKill]
          if (b.alive) {
            b.dying = true
            const col = b.isWinner ? danger : `hsl(${b.hue}, 70%, 60%)`
            explode(b.x, b.y, col, b.isWinner)
            if (b.isWinner) flashAlpha = 0.5
          }
          nextKill++
        }
      }

      // Advance dying bulbs
      bulbs.forEach(b => {
        if (b.dying) {
          b.deathProgress += 0.06
          b.brightness = Math.max(0, 1 - b.deathProgress)
          if (b.deathProgress >= 1) { b.alive = false; b.dying = false }
        }
      })

      // Flash decay
      if (flashAlpha > 0) flashAlpha *= 0.92
    }

    function drawWires() {
      // Horizontal cable across top
      const wireY = cy - 55 * S
      ctx.strokeStyle = 'rgba(120,100,80,0.6)'
      ctx.lineWidth = 2 * S
      ctx.beginPath()
      ctx.moveTo(0, wireY)
      ctx.lineTo(W, wireY)
      ctx.stroke()

      // Vertical wires to each bulb
      bulbs.forEach(b => {
        if (!b.alive && !b.dying) return
        const swayX = Math.sin(b.sway) * 3 * S
        ctx.strokeStyle = 'rgba(120,100,80,0.5)'
        ctx.lineWidth = 1.5 * S
        ctx.beginPath()
        ctx.moveTo(b.x, wireY)
        ctx.quadraticCurveTo(b.x + swayX, wireY + (b.y - wireY) * 0.5, b.x + swayX * 0.5, b.y - 20 * S)
        ctx.stroke()
      })
    }

    function drawBulbs() {
      bulbs.forEach(b => {
        if (!b.alive && !b.dying) return
        const sz = 18 * S
        const swayX = Math.sin(b.sway) * 3 * S
        const bx = b.x + swayX * 0.5
        const by = b.y

        // Glow halo
        if (b.brightness > 0.1) {
          const col = b.isWinner ? danger : `hsl(${b.hue}, 70%, 60%)`
          const glow = ctx.createRadialGradient(bx, by, 0, bx, by, sz * 2.5)
          glow.addColorStop(0, _alpha(col, b.brightness * 0.35))
          glow.addColorStop(1, _alpha(col, 0))
          ctx.fillStyle = glow
          ctx.fillRect(bx - sz * 3, by - sz * 3, sz * 6, sz * 6)
        }

        // Screw base
        ctx.fillStyle = '#888'
        ctx.beginPath()
        ctx.roundRect(bx - sz * 0.35, by - sz - 4 * S, sz * 0.7, 8 * S, 2 * S)
        ctx.fill()

        // Glass bulb
        const col = b.isWinner ? danger : `hsl(${b.hue}, 70%, 60%)`
        const glass = ctx.createRadialGradient(bx - sz * 0.2, by - sz * 0.2, 0, bx, by, sz)
        glass.addColorStop(0, `rgba(255,255,255,${b.brightness * 0.9})`)
        glass.addColorStop(0.3, _alpha(col, b.brightness * 0.8))
        glass.addColorStop(0.7, _alpha(col, b.brightness * 0.3))
        glass.addColorStop(1, _alpha(col, 0.05))

        ctx.save()
        if (b.brightness > 0.3) {
          ctx.shadowColor = col
          ctx.shadowBlur = 12 * S * b.brightness
        }
        ctx.fillStyle = glass
        ctx.beginPath()
        ctx.arc(bx, by, sz, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.restore()

        // Filament
        if (b.brightness > 0.2 && !b.dying) {
          ctx.strokeStyle = `rgba(255,220,100,${b.brightness})`
          ctx.lineWidth = 1.2 * S
          ctx.beginPath()
          ctx.moveTo(bx - 4 * S, by + 2 * S)
          ctx.lineTo(bx - 2 * S, by - 4 * S)
          ctx.lineTo(bx + 2 * S, by + 2 * S)
          ctx.lineTo(bx + 4 * S, by - 4 * S)
          ctx.stroke()
        }

        // Name below
        ctx.fillStyle = b.alive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)'
        ctx.font = `${b.isWinner ? '700' : '500'} ${Math.round(10 * S)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(b.name, bx, by + sz + 14 * S)
      })
    }

    function drawElectricArcs() {
      // Random arcs between alive bulbs for atmosphere
      if (slow) return
      const alive = bulbs.filter(b => b.alive && !b.dying)
      if (alive.length < 2) return
      const p = Math.min(t / DUR, 1)
      if (p < 0.15 || Math.random() > 0.12) return

      const a = alive[Math.floor(Math.random() * alive.length)]
      const b2 = alive[Math.floor(Math.random() * alive.length)]
      if (a === b2) return

      ctx.strokeStyle = _alpha(electric, 0.15 + Math.random() * 0.15)
      ctx.lineWidth = 1 * S
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      // Jagged line
      const steps = 4
      for (let s = 1; s <= steps; s++) {
        const frac = s / steps
        const mx = a.x + (b2.x - a.x) * frac + (Math.random() - 0.5) * 20 * S
        const my = a.y + (b2.y - a.y) * frac + (Math.random() - 0.5) * 15 * S
        ctx.lineTo(mx, my)
      }
      ctx.stroke()
    }

    function drawShards() {
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i]
        s.x += s.vx; s.y += s.vy; s.vy += 0.15 * S; s.vx *= 0.98; s.rot += s.rv; s.life--
        if (s.life <= 0) { shards.splice(i, 1); continue }
        const a = s.life / s.maxLife
        ctx.save()
        ctx.globalAlpha = a
        ctx.translate(s.x, s.y)
        ctx.rotate(s.rot)
        ctx.fillStyle = s.color
        ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size)
        ctx.restore()
      }
    }

    function drawReveal() {
      const p = Math.min(t / DUR, 1)
      if (p < 0.78) return
      const rp = Math.min((p - 0.78) / 0.18, 1)

      ctx.save()
      ctx.globalAlpha = rp
      ctx.shadowColor = danger
      ctx.shadowBlur = 20 * S * (1 + Math.sin(t * 0.12) * 0.3)
      ctx.fillStyle = danger
      ctx.font = `700 ${Math.round(22 * S)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(winnerName, cx, H * 0.85)
      ctx.shadowBlur = 0
      ctx.restore()
    }

    function draw() {
      const p = Math.min(t / DUR, 1)

      // Background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H))
      bg.addColorStop(0, 'rgba(15,15,35,1)')
      bg.addColorStop(0.6, 'rgba(8,8,18,1)')
      bg.addColorStop(1, 'rgba(3,3,8,1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      update()
      drawWires()
      drawElectricArcs()
      drawBulbs()
      drawShards()
      drawReveal()

      // Flash overlay
      if (flashAlpha > 0.01) {
        ctx.fillStyle = `rgba(255,255,200,${flashAlpha})`
        ctx.fillRect(0, 0, W, H)
      }

      // Fade out
      if (p > 0.92) {
        ctx.fillStyle = `rgba(3,3,8,${(p - 0.92) / 0.08})`
        ctx.fillRect(0, 0, W, H)
      }

      t += 16
      if (t < DUR + 300) requestAnimationFrame(draw)
    }

    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

// ══════════════════════════════════════════════════════════
// INTERACTIVE STUBS → FULL IMPLEMENTATIONS
// ══════════════════════════════════════════════════════════

function introNormalCrosshairInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3400; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.42
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const names = participants.map(p => p.name)

    interface XSpark { x: number; y: number; vx: number; vy: number; life: number; mL: number; color: string; sz: number }
    const sparks: XSpark[] = []
    let t = 0, locked = false, flashA = 0
    let targetIdx = 0, switchTimer = 0, scanAngle = 0

    function draw() {
      // Full clear + dark gradient background
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
      bg.addColorStop(0, '#0a0520'); bg.addColorStop(0.5, '#060316'); bg.addColorStop(1, '#020108')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Scanning phase — cycle names faster
      if (p < 0.60) {
        switchTimer += 16; scanAngle += 0.04
        if (switchTimer > 90) { targetIdx = (targetIdx + 1) % names.length; switchTimer = 0 }
      } else if (!locked) {
        locked = true; targetIdx = participants.findIndex(pp => pp.id === winnerId)
        if (targetIdx < 0) targetIdx = 0; flashA = 1
        const cnt = slow ? 20 : 45
        for (let i = 0; i < cnt; i++) {
          const a = Math.PI * 2 / cnt * i; const spd = (4 + Math.random() * 10) * S
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 50 + Math.random() * 40, mL: 90, color: i % 3 === 0 ? '#FFFFFF' : i % 2 === 0 ? accent : impact, sz: (4 + Math.random() * 6) * S })
        }
      }

      // Rotating scan lines (before lock)
      if (!locked && p > 0.05) {
        const sA = Math.min((p - 0.05) / 0.15, 1) * 0.4
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(scanAngle)
        ctx.strokeStyle = _alpha(accent, sA); ctx.lineWidth = 1 * S
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2)
          ctx.beginPath(); ctx.moveTo(30 * S, 0); ctx.lineTo(120 * S, 0); ctx.stroke()
        }
        ctx.restore()
      }

      // Crosshair rings — bigger, with glow
      const rings = [90, 68, 48, 30]
      rings.forEach((r, i) => {
        const show = Math.min(Math.max((p - i * 0.04) / 0.15, 0), 1)
        if (show <= 0) return
        const pulse = locked ? 1 : 1 + 0.1 * Math.sin(t * 0.015 + i * 1.5)
        const rColor = i % 2 === 0 ? impact : accent
        ctx.save()
        ctx.shadowColor = rColor; ctx.shadowBlur = (locked ? 20 : 10) * S
        ctx.strokeStyle = _alpha(rColor, show * (locked ? 0.9 : 0.7))
        ctx.lineWidth = (2.5 + (3 - i) * 0.8) * S
        ctx.beginPath(); ctx.arc(cx, cy, r * S * show * pulse, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()
      })

      // Fixed cross lines
      if (p > 0.08) {
        const lA = Math.min((p - 0.08) / 0.15, 1) * 0.8
        ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 8 * S
        ctx.strokeStyle = _alpha(accent, lA); ctx.lineWidth = 1.5 * S
        ctx.beginPath(); ctx.moveTo(cx - 110 * S, cy); ctx.lineTo(cx - 30 * S, cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + 30 * S, cy); ctx.lineTo(cx + 110 * S, cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx, cy - 110 * S); ctx.lineTo(cx, cy - 30 * S); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx, cy + 30 * S); ctx.lineTo(cx, cy + 110 * S); ctx.stroke()
        ctx.restore()
      }

      // Center dot
      ctx.save(); ctx.shadowColor = impact; ctx.shadowBlur = 12 * S
      ctx.fillStyle = impact; ctx.beginPath(); ctx.arc(cx, cy, 3 * S, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      // Cycling name — LARGE, centered below crosshair
      ctx.save()
      const nameSize = locked ? 28 : 22
      ctx.font = `800 ${Math.round(nameSize * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.shadowColor = locked ? accent : impact; ctx.shadowBlur = locked ? 24 * S : 8 * S
      ctx.fillStyle = locked ? accent : '#FFFFFF'
      // Glitch effect while scanning
      if (!locked && Math.random() > 0.75) {
        ctx.globalAlpha = 0.4; ctx.fillStyle = impact
        ctx.fillText(names[targetIdx], cx + (Math.random() - 0.5) * 8 * S, cy + 70 * S + (Math.random() - 0.5) * 4 * S)
        ctx.globalAlpha = 1; ctx.fillStyle = '#FFFFFF'
      }
      ctx.fillText(names[targetIdx], cx, cy + 70 * S)
      ctx.restore()

      // Sparks with GLOW
      sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.12 * S; s.vx *= 0.99; s.life-- })
      sparks.forEach(s => {
        if (s.life <= 0) return; const a = s.life / s.mL
        ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 10 * S * a
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * a, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(s.color, a * 0.9); ctx.fill(); ctx.restore()
      })
      for (let i = sparks.length - 1; i >= 0; i--) { if (sparks[i].life <= 0) sparks.splice(i, 1) }

      // White flash on lock
      if (flashA > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H); flashA *= 0.85
      }

      // Winner name reveal — big at top
      if (p > 0.78) {
        const rp = Math.min((p - 0.78) / 0.15, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(30 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = accent; ctx.shadowBlur = 30 * S
        ctx.fillStyle = accent; ctx.fillText(winnerName, cx, H * 0.12)
        // Double glow pass
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.restore()
      }

      // Fade out
      if (p > 0.92) { ctx.fillStyle = `rgba(2,1,8,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introNormalMissileInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3400; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.42
    const accent = _css('--color-accent', '#00F5FF')
    const gold = '#FFD700'
    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'

    interface MSpark { x: number; y: number; vx: number; vy: number; life: number; mL: number; color: string; sz: number }
    const sparks: MSpark[] = []
    let t = 0, exploded = false, flashA = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.8)
      bg.addColorStop(0, '#0a0520'); bg.addColorStop(1, '#020108')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)
      const launchP = Math.min(p / 0.55, 1)

      const startX = W * 0.08, startY = H * 0.85, peakY = H * 0.08
      const eased = launchP < 0.5 ? 2 * launchP * launchP : 1 - Math.pow(-2 * launchP + 2, 2) / 2
      const mX = startX + (cx - startX) * eased
      const mY = startY - (startY - cy) * eased - Math.sin(eased * Math.PI) * (startY - peakY)

      // Exhaust trail — bigger, glowing
      if (launchP > 0 && launchP < 1) {
        const cnt = slow ? 2 : 5
        for (let i = 0; i < cnt; i++) {
          sparks.push({ x: mX + (Math.random() - 0.5) * 8 * S, y: mY + 10 * S, vx: (Math.random() - 0.5) * 2.5 * S, vy: (2 + Math.random() * 4) * S, life: 30 + Math.random() * 20, mL: 50, color: ['#FF6600', '#FFAA00', '#FF4400', '#FFD700'][i % 4], sz: (5 + Math.random() * 8) * S })
        }
      }

      // Draw missile — bigger with glow
      if (launchP > 0 && !exploded) {
        const prevX = startX + (cx - startX) * Math.max(0, eased - 0.03)
        const prevY = startY - (startY - cy) * Math.max(0, eased - 0.03) - Math.sin(Math.max(0, eased - 0.03) * Math.PI) * (startY - peakY)
        const angle = Math.atan2(mY - prevY, mX - prevX)
        ctx.save(); ctx.translate(mX, mY); ctx.rotate(angle)
        ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 15 * S
        ctx.fillStyle = '#DDDDDD'; ctx.fillRect(-16 * S, -5 * S, 32 * S, 10 * S)
        ctx.fillStyle = '#FF3300'; ctx.beginPath(); ctx.moveTo(16 * S, 0); ctx.lineTo(9 * S, -7 * S); ctx.lineTo(9 * S, 7 * S); ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#FF6600'; ctx.fillRect(-16 * S, -3 * S, 6 * S, 6 * S)
        ctx.restore()
      }

      // Explosion — massive burst
      if (p > 0.55 && !exploded) {
        exploded = true; flashA = 1
        const cnt = slow ? 30 : 65
        for (let i = 0; i < cnt; i++) {
          const a = Math.PI * 2 / cnt * i; const spd = (5 + Math.random() * 14) * S
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2 * S, life: 55 + Math.random() * 45, mL: 100, color: [gold, '#FF6600', accent, '#FF3300', '#FFFFFF'][i % 5], sz: (6 + Math.random() * 10) * S })
        }
      }

      // Explosion glow at center
      if (exploded && p < 0.85) {
        const glowA = Math.max(0, 1 - (p - 0.55) / 0.3)
        const expGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80 * S)
        expGlow.addColorStop(0, _alpha('#FF8800', glowA * 0.5))
        expGlow.addColorStop(0.5, _alpha('#FF4400', glowA * 0.2))
        expGlow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = expGlow; ctx.fillRect(0, 0, W, H)
      }

      // Target name — pulsing before explosion
      if (p > 0.15 && p < 0.58) {
        ctx.save()
        ctx.font = `700 ${Math.round(20 * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowColor = accent; ctx.shadowBlur = 8 * S
        ctx.fillStyle = _alpha('#FFFFFF', 0.5 + 0.5 * Math.sin(t * 0.08))
        ctx.fillText(winnerName, cx, cy + 60 * S); ctx.restore()
      }

      // Sparks with glow
      sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.10 * S; s.vx *= 0.99; s.life-- })
      sparks.forEach(s => {
        if (s.life <= 0) return; const a = s.life / s.mL
        ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 12 * S * a
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * a, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(s.color, a * 0.9); ctx.fill(); ctx.restore()
      })
      for (let i = sparks.length - 1; i >= 0; i--) { if (sparks[i].life <= 0) sparks.splice(i, 1) }

      if (flashA > 0.01) { ctx.fillStyle = `rgba(255,180,80,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H); flashA *= 0.84 }

      // Winner reveal
      if (p > 0.76) {
        const rp = Math.min((p - 0.76) / 0.16, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(30 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = gold; ctx.shadowBlur = 30 * S
        ctx.fillStyle = gold; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(2,1,8,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introNormalSniperInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3400; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.42
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const names = participants.map(p => p.name)

    interface SSpark { x: number; y: number; vx: number; vy: number; life: number; mL: number; color: string; sz: number }
    const sparks: SSpark[] = []
    let t = 0, fired = false, flashA = 0
    let scopeX = W * 0.2, scopeY = cy, targetIdx = 0, switchTimer = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
      bg.addColorStop(0, '#060318'); bg.addColorStop(1, '#010108')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Scope movement — scanning
      if (p < 0.58) {
        switchTimer += 16
        if (switchTimer > 120) { targetIdx = (targetIdx + 1) % names.length; switchTimer = 0 }
        const tx = cx + Math.sin(t * 0.004) * 90 * S
        const ty = cy + Math.cos(t * 0.005) * 50 * S
        scopeX += (tx - scopeX) * 0.05; scopeY += (ty - scopeY) * 0.05
      } else {
        scopeX += (cx - scopeX) * 0.12; scopeY += (cy - scopeY) * 0.12
        targetIdx = participants.findIndex(pp => pp.id === winnerId)
        if (targetIdx < 0) targetIdx = 0
      }

      // Scope vignette — dark outside, bright inside
      const scopeR = 55 * S
      const vig = ctx.createRadialGradient(scopeX, scopeY, scopeR * 0.8, scopeX, scopeY, scopeR * 2)
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(0.5, 'rgba(0,0,0,0.3)'); vig.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H)

      // Scope circles — with glow
      ctx.save()
      ctx.shadowColor = accent; ctx.shadowBlur = 12 * S
      ctx.strokeStyle = _alpha(accent, 0.8); ctx.lineWidth = 2.5 * S
      ctx.beginPath(); ctx.arc(scopeX, scopeY, scopeR, 0, Math.PI * 2); ctx.stroke()
      ctx.shadowBlur = 6 * S
      ctx.strokeStyle = _alpha(accent, 0.5); ctx.lineWidth = 1.5 * S
      ctx.beginPath(); ctx.arc(scopeX, scopeY, 38 * S, 0, Math.PI * 2); ctx.stroke()

      // Crosshairs — gap at center
      const cLen = 70 * S; const gap = 12 * S
      ctx.strokeStyle = _alpha(impact, 0.6); ctx.lineWidth = 1.5 * S; ctx.shadowColor = impact; ctx.shadowBlur = 6 * S
      ctx.beginPath(); ctx.moveTo(scopeX - cLen, scopeY); ctx.lineTo(scopeX - gap, scopeY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(scopeX + gap, scopeY); ctx.lineTo(scopeX + cLen, scopeY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(scopeX, scopeY - cLen); ctx.lineTo(scopeX, scopeY - gap); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(scopeX, scopeY + gap); ctx.lineTo(scopeX, scopeY + cLen); ctx.stroke()

      // Dot center
      ctx.shadowColor = impact; ctx.shadowBlur = 10 * S
      ctx.fillStyle = impact; ctx.beginPath(); ctx.arc(scopeX, scopeY, 3.5 * S, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      // Name under scope — bigger, with glitch
      ctx.save()
      const nameSize = fired ? 26 : 20
      ctx.font = `800 ${Math.round(nameSize * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.shadowColor = fired ? accent : impact; ctx.shadowBlur = fired ? 20 * S : 6 * S
      ctx.fillStyle = fired ? accent : '#FFFFFF'
      if (!fired && Math.random() > 0.8) {
        ctx.globalAlpha = 0.3; ctx.fillStyle = impact
        ctx.fillText(names[targetIdx], scopeX + (Math.random() - 0.5) * 6 * S, scopeY + 72 * S)
        ctx.globalAlpha = 1; ctx.fillStyle = '#FFFFFF'
      }
      ctx.fillText(names[targetIdx], scopeX, scopeY + 72 * S)
      ctx.restore()

      // Fire shot — bigger burst
      if (p > 0.68 && !fired) {
        fired = true; flashA = 1
        const cnt = slow ? 20 : 45
        for (let i = 0; i < cnt; i++) {
          const a = Math.PI * 2 / cnt * i; const spd = (3 + Math.random() * 9) * S
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 40 + Math.random() * 35, mL: 75, color: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? accent : impact, sz: (4 + Math.random() * 6) * S })
        }
      }

      // Sparks with glow
      sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.1 * S; s.vx *= 0.99; s.life-- })
      sparks.forEach(s => {
        if (s.life <= 0) return; const a = s.life / s.mL
        ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 10 * S * a
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * a, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(s.color, a * 0.9); ctx.fill(); ctx.restore()
      })
      for (let i = sparks.length - 1; i >= 0; i--) { if (sparks[i].life <= 0) sparks.splice(i, 1) }

      if (flashA > 0.01) { ctx.fillStyle = `rgba(255,255,255,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H); flashA *= 0.85 }

      // Winner reveal
      if (p > 0.80) {
        const rp = Math.min((p - 0.80) / 0.14, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(30 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = accent; ctx.shadowBlur = 30 * S
        ctx.fillStyle = accent; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(1,1,8,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introOrderWheelInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 4200; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.46
    const gold = '#FFD700'
    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const n = participants.length
    const colors = ['#FF006E', '#00F5FF', '#FFD700', '#39FF14', '#FF6B35', '#8B5CF6', '#F472B6', '#06B6D4']

    let t = 0, angle = 0, spinSpeed = 0.35, flashA = 0, stopped = false
    const wheelR = 110 * S

    interface WSpark { x: number; y: number; vx: number; vy: number; life: number; mL: number; color: string; sz: number }
    const sparks: WSpark[] = []

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.8)
      bg.addColorStop(0, '#0c0620'); bg.addColorStop(1, '#020108')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Spin deceleration
      if (p < 0.3) spinSpeed = 0.35
      else if (p < 0.75) spinSpeed = 0.35 * (1 - (p - 0.3) / 0.45) + 0.005
      else if (!stopped) {
        spinSpeed *= 0.92
        if (spinSpeed < 0.002) { stopped = true; flashA = 0.8 }
      }
      angle += spinSpeed

      // Wheel glow behind
      const wheelGlow = ctx.createRadialGradient(cx, cy, wheelR * 0.5, cx, cy, wheelR * 1.3)
      wheelGlow.addColorStop(0, 'rgba(100,50,200,0.08)'); wheelGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = wheelGlow; ctx.fillRect(0, 0, W, H)

      // Wheel
      ctx.save(); ctx.translate(cx, cy)
      for (let i = 0; i < n; i++) {
        const sliceAngle = Math.PI * 2 / n
        const startA = angle + i * sliceAngle
        ctx.beginPath(); ctx.moveTo(0, 0)
        ctx.arc(0, 0, wheelR, startA, startA + sliceAngle)
        ctx.closePath()
        ctx.fillStyle = _alpha(colors[i % colors.length], 0.85); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5 * S; ctx.stroke()

        // Name on slice
        ctx.save(); ctx.rotate(startA + sliceAngle / 2)
        ctx.fillStyle = '#FFFFFF'; ctx.font = `700 ${Math.round(Math.min(12, 110 / n) * S)}px sans-serif`
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3 * S
        ctx.fillText(participants[i].name.slice(0, 8), wheelR * 0.22, 0)
        ctx.shadowBlur = 0; ctx.restore()
      }
      ctx.restore()

      // Wheel border — glowing gold
      ctx.save(); ctx.shadowColor = gold; ctx.shadowBlur = 14 * S
      ctx.strokeStyle = gold; ctx.lineWidth = 3.5 * S
      ctx.beginPath(); ctx.arc(cx, cy, wheelR + 3 * S, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()

      // Pointer — bigger, with glow
      ctx.save(); ctx.shadowColor = gold; ctx.shadowBlur = 10 * S
      ctx.fillStyle = gold; ctx.beginPath()
      ctx.moveTo(cx + wheelR + 12 * S, cy)
      ctx.lineTo(cx + wheelR + 26 * S, cy - 10 * S)
      ctx.lineTo(cx + wheelR + 26 * S, cy + 10 * S)
      ctx.closePath(); ctx.fill(); ctx.restore()

      // Sparks with glow
      sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.12 * S; s.life-- })
      sparks.forEach(s => {
        if (s.life <= 0) return; const a = s.life / s.mL
        ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 10 * S * a
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * a, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(s.color, a * 0.9); ctx.fill(); ctx.restore()
      })
      for (let i = sparks.length - 1; i >= 0; i--) { if (sparks[i].life <= 0) sparks.splice(i, 1) }

      if (stopped && sparks.length === 0 && flashA > 0.5) {
        const cnt = slow ? 20 : 40
        for (let i = 0; i < cnt; i++) {
          const a = Math.PI * 2 / cnt * i; const spd = (4 + Math.random() * 8) * S
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 45 + Math.random() * 35, mL: 80, color: colors[i % colors.length], sz: (4 + Math.random() * 6) * S })
        }
      }

      if (flashA > 0.01) { ctx.fillStyle = `rgba(255,215,0,${flashA * 0.5})`; ctx.fillRect(0, 0, W, H); flashA *= 0.9 }

      // Winner reveal
      if (p > 0.80) {
        const rp = Math.min((p - 0.80) / 0.14, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(30 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = gold; ctx.shadowBlur = 30 * S
        ctx.fillStyle = gold; ctx.fillText(winnerName, cx, H * 0.10)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(winnerName, cx, H * 0.10)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(2,1,8,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introTeamSplitInteractive(participants: Participant[], _winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3800; _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.44
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const half = Math.ceil(participants.length / 2)
    const teamA = participants.slice(0, half)
    const teamB = participants.slice(half)

    interface TDot { x: number; y: number; tx: number; ty: number; name: string; color: string; r: number }
    const dots: TDot[] = []
    participants.forEach((p, i) => {
      const isA = i < half
      const row = isA ? i : i - half
      const total = isA ? half : participants.length - half
      const ySpread = Math.min(total, 8) * 28 * S
      const yStart = cy - ySpread / 2
      dots.push({ x: cx + (Math.random() - 0.5) * 30 * S, y: cy + (Math.random() - 0.5) * 40 * S, tx: isA ? cx - 85 * S : cx + 85 * S, ty: yStart + (row / Math.max(total - 1, 1)) * ySpread, name: p.name, color: isA ? accent : impact, r: (9 + Math.random() * 4) * S })
    })

    let t = 0, flashA = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
      bg.addColorStop(0, '#08041a'); bg.addColorStop(1, '#020108')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)
      const splitP = Math.min(Math.max((p - 0.22) / 0.4, 0), 1)
      const ease = splitP < 0.5 ? 2 * splitP * splitP : 1 - Math.pow(-2 * splitP + 2, 2) / 2

      if (splitP > 0 && splitP < 0.05) flashA = 0.5

      // Laser line — glowing
      if (p > 0.18) {
        const lA = Math.min((p - 0.18) / 0.08, 1)
        ctx.save(); ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 12 * S
        ctx.strokeStyle = _alpha('#FFFFFF', lA * 0.7); ctx.lineWidth = 2.5 * S
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke()
        ctx.shadowBlur = 0; ctx.restore()
      }

      // Move and draw dots — with glow
      dots.forEach(d => {
        d.x += (d.tx - d.x) * 0.04 * ease
        d.y += (d.ty - d.y) * 0.02 * ease
        ctx.save(); ctx.shadowColor = d.color; ctx.shadowBlur = 10 * S * (0.5 + ease * 0.5)
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(d.color, 0.7 + 0.3 * ease); ctx.fill()
        ctx.restore()

        if (ease > 0.4) {
          ctx.save()
          ctx.font = `700 ${Math.round(10 * S)}px sans-serif`; ctx.textAlign = 'center'
          ctx.shadowColor = d.color; ctx.shadowBlur = 4 * S
          ctx.fillStyle = '#FFFFFF'; ctx.fillText(d.name.slice(0, 7), d.x, d.y + d.r + 14 * S)
          ctx.restore()
        }
      })

      // Team labels — bigger with double glow
      if (p > 0.68) {
        const lp = Math.min((p - 0.68) / 0.15, 1)
        ctx.save(); ctx.globalAlpha = lp
        ctx.font = `900 ${Math.round(24 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = accent; ctx.shadowBlur = 25 * S
        ctx.fillStyle = accent; ctx.fillText(`Equipo A (${teamA.length})`, cx - 85 * S, H * 0.10)
        ctx.shadowBlur = 45 * S; ctx.globalAlpha = lp * 0.4; ctx.fillText(`Equipo A (${teamA.length})`, cx - 85 * S, H * 0.10)
        ctx.globalAlpha = lp; ctx.shadowColor = impact; ctx.shadowBlur = 25 * S
        ctx.fillStyle = impact; ctx.fillText(`Equipo B (${teamB.length})`, cx + 85 * S, H * 0.10)
        ctx.shadowBlur = 45 * S; ctx.globalAlpha = lp * 0.4; ctx.fillText(`Equipo B (${teamB.length})`, cx + 85 * S, H * 0.10)
        ctx.restore()
      }

      if (flashA > 0.01) { ctx.fillStyle = `rgba(255,255,255,${flashA * 0.6})`; ctx.fillRect(0, 0, W, H); flashA *= 0.88 }
      if (p > 0.92) { ctx.fillStyle = `rgba(2,1,8,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introTeamMagnetInteractive(participants: Participant[], _winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3800; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.44
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const half = Math.ceil(participants.length / 2)

    interface MDot { x: number; y: number; name: string; team: number; color: string; r: number }
    const dots: MDot[] = participants.map((p, i) => ({
      x: cx + (Math.random() - 0.5) * 200 * S, y: cy + (Math.random() - 0.5) * 150 * S,
      name: p.name, team: i < half ? 0 : 1, color: i < half ? accent : impact, r: (9 + Math.random() * 4) * S
    }))
    const magnetL = { x: cx - 120 * S, y: cy }
    const magnetR = { x: cx + 120 * S, y: cy }

    let t = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
      bg.addColorStop(0, '#08041a'); bg.addColorStop(1, '#020108')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)
      const pullP = Math.min(Math.max((p - 0.12) / 0.55, 0), 1)

      // Magnetic field lines
      if (pullP > 0.1 && !slow) {
        [{ m: magnetL, c: accent }, { m: magnetR, c: impact }].forEach(({ m, c }) => {
          for (let ring = 1; ring <= 3; ring++) {
            const rr = ring * 35 * S * pullP
            const a = pullP * 0.2 / ring
            ctx.strokeStyle = _alpha(c, a); ctx.lineWidth = 1 * S
            ctx.setLineDash([4 * S, 6 * S])
            ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, Math.PI * 2); ctx.stroke()
          }
          ctx.setLineDash([])
        })
      }

      // Draw magnets — bigger with strong glow
      const magnetPulse = 1 + 0.12 * Math.sin(t * 0.06);
      [{ m: magnetL, c: accent }, { m: magnetR, c: impact }].forEach(({ m, c }) => {
        const mR = 22 * S * Math.min(p / 0.12, 1) * magnetPulse
        ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 20 * S * pullP
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(m.x, m.y, mR, 0, Math.PI * 2); ctx.fill()
        // Extra glow pass
        ctx.shadowBlur = 40 * S * pullP; ctx.globalAlpha = 0.3
        ctx.fill(); ctx.restore()
      })

      // Attract dots to magnets — with glow
      dots.forEach(d => {
        const target = d.team === 0 ? magnetL : magnetR
        const dx = target.x - d.x, dy = target.y - d.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 25 * S) {
          const force = pullP * 0.06
          d.x += dx * force; d.y += dy * force
        }
        ctx.save(); ctx.shadowColor = d.color; ctx.shadowBlur = 8 * S * (0.5 + pullP * 0.5)
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(d.color, 0.7 + 0.3 * pullP); ctx.fill()
        ctx.restore()

        if (pullP > 0.5) {
          ctx.save()
          ctx.font = `700 ${Math.round(10 * S)}px sans-serif`; ctx.textAlign = 'center'
          ctx.shadowColor = d.color; ctx.shadowBlur = 4 * S
          ctx.fillStyle = '#FFFFFF'; ctx.fillText(d.name.slice(0, 7), d.x, d.y + d.r + 13 * S)
          ctx.restore()
        }
      })

      // Labels — bigger with double glow
      if (p > 0.72) {
        const lp = Math.min((p - 0.72) / 0.15, 1)
        ctx.save(); ctx.globalAlpha = lp
        ctx.font = `900 ${Math.round(22 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = accent; ctx.shadowBlur = 25 * S
        ctx.fillStyle = accent; ctx.fillText('Equipo A', magnetL.x, H * 0.10)
        ctx.shadowBlur = 45 * S; ctx.globalAlpha = lp * 0.4; ctx.fillText('Equipo A', magnetL.x, H * 0.10)
        ctx.globalAlpha = lp; ctx.shadowColor = impact; ctx.shadowBlur = 25 * S
        ctx.fillStyle = impact; ctx.fillText('Equipo B', magnetR.x, H * 0.10)
        ctx.shadowBlur = 45 * S; ctx.globalAlpha = lp * 0.4; ctx.fillText('Equipo B', magnetR.x, H * 0.10)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(2,1,8,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introTeamColorsInteractive(participants: Participant[], _winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3800; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.44
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const half = Math.ceil(participants.length / 2)

    interface CDot { x: number; y: number; name: string; colored: boolean; color: string; r: number; splashT: number }
    const dots: CDot[] = participants.map((p, i) => ({
      x: cx + (Math.random() - 0.5) * 200 * S, y: cy + (Math.random() - 0.5) * 120 * S,
      name: p.name, colored: false, color: i < half ? accent : impact, r: (10 + Math.random() * 4) * S, splashT: 0.25 + Math.random() * 0.35
    }))

    interface CSplash { x: number; y: number; vx: number; vy: number; life: number; mL: number; color: string; sz: number }
    const splashes: CSplash[] = []
    let t = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
      bg.addColorStop(0, '#08041a'); bg.addColorStop(1, '#020108')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      dots.forEach(d => {
        if (!d.colored && p > d.splashT) {
          d.colored = true
          const cnt = slow ? 8 : 16
          for (let i = 0; i < cnt; i++) {
            const a = Math.PI * 2 / cnt * i; const spd = (3 + Math.random() * 6) * S
            splashes.push({ x: d.x, y: d.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 35 + Math.random() * 20, mL: 55, color: d.color, sz: (4 + Math.random() * 5) * S })
          }
        }

        // Dot — with glow when colored
        ctx.save()
        if (d.colored) { ctx.shadowColor = d.color; ctx.shadowBlur = 12 * S }
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = d.colored ? d.color : '#555555'; ctx.fill()
        ctx.restore()

        if (d.colored || p > 0.55) {
          ctx.save()
          ctx.font = `700 ${Math.round(10 * S)}px sans-serif`; ctx.textAlign = 'center'
          ctx.shadowColor = d.colored ? d.color : 'transparent'; ctx.shadowBlur = 4 * S
          ctx.fillStyle = '#FFFFFF'; ctx.fillText(d.name.slice(0, 7), d.x, d.y + d.r + 14 * S)
          ctx.restore()
        }
      })

      // Splashes with glow
      splashes.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.1 * S; s.life-- })
      splashes.forEach(s => {
        if (s.life <= 0) return; const a = s.life / s.mL
        ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 8 * S * a
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * a, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(s.color, a * 0.9); ctx.fill(); ctx.restore()
      })
      for (let i = splashes.length - 1; i >= 0; i--) { if (splashes[i].life <= 0) splashes.splice(i, 1) }

      // Labels — bigger with double glow
      if (p > 0.68) {
        const lp = Math.min((p - 0.68) / 0.15, 1)
        ctx.save(); ctx.globalAlpha = lp
        ctx.font = `900 ${Math.round(24 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = accent; ctx.shadowBlur = 25 * S
        ctx.fillStyle = accent; ctx.fillText('Equipo A', cx - 80 * S, H * 0.09)
        ctx.shadowBlur = 45 * S; ctx.globalAlpha = lp * 0.4; ctx.fillText('Equipo A', cx - 80 * S, H * 0.09)
        ctx.globalAlpha = lp; ctx.shadowColor = impact; ctx.shadowBlur = 25 * S
        ctx.fillStyle = impact; ctx.fillText('Equipo B', cx + 80 * S, H * 0.09)
        ctx.shadowBlur = 45 * S; ctx.globalAlpha = lp * 0.4; ctx.fillText('Equipo B', cx + 80 * S, H * 0.09)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(2,1,8,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introDuelClashInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3400; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2; const cy = H * 0.44

    const p1 = participants[0]; const p2 = participants.length > 1 ? participants[1] : participants[0]
    const winIdx = p1.id === winnerId ? 0 : 1
    const names = [p1.name, p2.name]
    const colors = ['#00F5FF', '#FF006E']

    let t = 0; let impactDone = false; let flashA = 0

    interface Spark { x: number; y: number; vx: number; vy: number; life: number; mL: number; color: string; sz: number }
    const sparks: Spark[] = []

    function burst(bx: number, by: number, count: number) {
      for (let i = 0; i < (slow ? Math.ceil(count / 2) : count); i++) {
        const a = Math.random() * Math.PI * 2; const sp = (5 + Math.random() * 12) * S
        sparks.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 50 + Math.random() * 45, mL: 95, color: ['#FFD700', '#FFF', '#FF6B6B', '#00F5FF', '#FF006E'][Math.floor(Math.random() * 5)], sz: (4 + Math.random() * 7) * S })
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
      bg.addColorStop(0, '#0a0a1c'); bg.addColorStop(1, '#020210')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Impact shockwave glow
      if (impactDone && p < 0.80) {
        const shockP = Math.min((p - 0.55) / 0.25, 1)
        const shockGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, shockP * 120 * S)
        shockGlow.addColorStop(0, _alpha('#FFD700', (1 - shockP) * 0.3))
        shockGlow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = shockGlow; ctx.fillRect(0, 0, W, H)
      }

      // Two fighters running toward center
      const runP = Math.min(p / 0.55, 1)
      const eased = 1 - Math.pow(1 - runP, 3)
      const x1 = W * 0.08 + (cx - 30 * S - W * 0.08) * eased
      const realX2 = W * 0.92 + (cx + 30 * S - W * 0.92) * eased

      // Impact
      if (p > 0.55 && !impactDone) {
        impactDone = true; flashA = 0.7
        burst(cx, cy, 55)
      }

      // Post-impact: loser slides back
      let finalX1 = x1; let finalX2 = realX2; let loserAlpha = 1
      if (p > 0.55) {
        const postP = Math.min((p - 0.55) / 0.25, 1)
        if (winIdx === 0) { finalX2 = realX2 + postP * 70 * S; loserAlpha = 1 - postP * 0.5 }
        else { finalX1 = x1 - postP * 70 * S; loserAlpha = 1 - postP * 0.5 }
      }

      // Draw fighters — bigger, with stronger glow
      for (let fi = 0; fi < 2; fi++) {
        const fx = fi === 0 ? finalX1 : finalX2
        const col = colors[fi]; const isWin = fi === winIdx
        const alpha = (fi !== winIdx && p > 0.55) ? loserAlpha : 1
        const sz = 26 * S

        ctx.save(); ctx.globalAlpha = alpha
        if (isWin && p > 0.6) { ctx.shadowColor = col; ctx.shadowBlur = 20 * S }
        const g = ctx.createRadialGradient(fx - sz * 0.2, cy - sz * 0.2, 0, fx, cy, sz)
        g.addColorStop(0, '#FFF'); g.addColorStop(0.35, col); g.addColorStop(1, _alpha(col, 0.3))
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, cy, sz, 0, Math.PI * 2); ctx.fill()
        if (isWin && p > 0.6) { ctx.shadowBlur = 40 * S; ctx.globalAlpha = alpha * 0.3; ctx.fill() }
        ctx.shadowBlur = 0

        // Name — bigger
        ctx.globalAlpha = alpha
        ctx.shadowColor = isWin ? col : 'transparent'; ctx.shadowBlur = isWin ? 10 * S : 0
        ctx.fillStyle = isWin ? col : 'rgba(255,255,255,0.7)'
        ctx.font = `${isWin ? '800' : '600'} ${Math.round(14 * S)}px sans-serif`
        ctx.textAlign = 'center'; ctx.fillText(names[fi], fx, cy - sz - 10 * S)
        ctx.restore()
      }

      // Sparks with strong glow
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx; s.y += s.vy; s.vy += 0.1 * S; s.vx *= 0.97; s.life--
        if (s.life <= 0) { sparks.splice(i, 1); continue }
        const a = s.life / s.mL
        ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 12 * S * a
        ctx.fillStyle = _alpha(s.color, a * 0.9)
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * a, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }

      // Flash
      if (flashA > 0.01) { ctx.fillStyle = `rgba(255,255,255,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H); flashA *= 0.88 }

      // Winner reveal — double glow
      if (p > 0.78) {
        const rp = Math.min((p - 0.78) / 0.15, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(28 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = colors[winIdx]; ctx.shadowBlur = 30 * S
        ctx.fillStyle = colors[winIdx]; ctx.fillText(names[winIdx], cx, H * 0.10)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(names[winIdx], cx, H * 0.10)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(2,2,10,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introDuelWesternInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3800; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2; const cy = H * 0.50

    const p1 = participants[0]; const p2 = participants.length > 1 ? participants[1] : participants[0]
    const winIdx = p1.id === winnerId ? 0 : 1
    const names = [p1.name, p2.name]
    const cols = ['#00F5FF', '#FF006E']

    let t = 0; let fired = false; let flashA = 0

    interface Dust { x: number; y: number; vx: number; vy: number; life: number; mL: number; sz: number; color: string }
    const dust: Dust[] = []

    function puff(px: number, py: number, col: string, n: number) {
      for (let i = 0; i < (slow ? Math.ceil(n / 2) : n); i++) {
        const a = Math.random() * Math.PI * 2; const sp = (3 + Math.random() * 7) * S
        dust.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 55 + Math.random() * 55, mL: 110, sz: (3 + Math.random() * 6) * S, color: col })
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Desert bg — richer gradient with heat haze
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#1a0e05'); bg.addColorStop(0.35, '#3c2814')
      bg.addColorStop(0.65, '#50371e'); bg.addColorStop(1, '#2a1a0a')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Sunset glow at horizon
      const sunGlow = ctx.createRadialGradient(cx, cy + 30 * S, 0, cx, cy + 30 * S, W * 0.5)
      sunGlow.addColorStop(0, 'rgba(255,120,30,0.12)'); sunGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = sunGlow; ctx.fillRect(0, 0, W, H)

      // Ground line — glowing
      ctx.save(); ctx.shadowColor = 'rgba(180,120,60,0.4)'; ctx.shadowBlur = 6 * S
      ctx.strokeStyle = 'rgba(140,90,50,0.5)'; ctx.lineWidth = 1.5 * S
      ctx.beginPath(); ctx.moveTo(0, cy + 30 * S); ctx.lineTo(W, cy + 30 * S); ctx.stroke()
      ctx.restore()

      // Walk phase
      const walkP = Math.min(p / 0.45, 1)
      const walkE = 1 - Math.pow(1 - walkP, 3)
      const x1 = W * 0.05 + (cx - 70 * S - W * 0.05) * walkE
      const x2 = W * 0.95 + (cx + 70 * S - W * 0.95) * walkE

      // Walking dust
      if (walkP < 1 && Math.random() < 0.25) {
        puff(x1, cy + 25 * S, '#D2B48C', 3)
        puff(x2, cy + 25 * S, '#D2B48C', 3)
      }

      const drawP = Math.min(Math.max((p - 0.65) / 0.1, 0), 1)

      // Fire moment — bigger burst
      if (p > 0.75 && !fired) {
        fired = true; flashA = 0.6
        puff(winIdx === 0 ? x1 + 22 * S : x2 - 22 * S, cy - 5 * S, '#FFD700', 30)
        puff(cx, cy, '#FF6B6B', 20)
      }

      // Loser falls
      let loserTilt = 0; let loserSlide = 0
      if (p > 0.75) {
        const fallP = Math.min((p - 0.75) / 0.2, 1)
        loserTilt = fallP * 0.45; loserSlide = fallP * 18 * S
      }

      for (let fi = 0; fi < 2; fi++) {
        const isWin = fi === winIdx; const fx = fi === 0 ? x1 : x2
        const col = cols[fi]; const sz = 24 * S

        ctx.save()
        if (!isWin && p > 0.75) {
          ctx.globalAlpha = 1 - Math.min((p - 0.75) / 0.3, 0.45)
          ctx.translate(fx + (fi === 0 ? -loserSlide : loserSlide), cy + loserSlide * 0.5)
          ctx.rotate(fi === 0 ? -loserTilt : loserTilt)
          ctx.translate(-(fx + (fi === 0 ? -loserSlide : loserSlide)), -(cy + loserSlide * 0.5))
        }

        // Body — with glow
        if (isWin && drawP > 0.5) { ctx.shadowColor = col; ctx.shadowBlur = 18 * S }
        const g = ctx.createRadialGradient(fx - sz * 0.15, cy - sz * 0.15, 0, fx, cy, sz)
        g.addColorStop(0, '#FFF'); g.addColorStop(0.35, col); g.addColorStop(1, _alpha(col, 0.3))
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, cy, sz, 0, Math.PI * 2); ctx.fill()
        if (isWin && drawP > 0.5) { ctx.shadowBlur = 35 * S; ctx.globalAlpha = 0.3; ctx.fill() }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1

        // Hat — bigger
        ctx.fillStyle = '#6B4226'
        ctx.fillRect(fx - 16 * S, cy - sz - 7 * S, 32 * S, 6 * S)
        ctx.fillRect(fx - 10 * S, cy - sz - 16 * S, 20 * S, 11 * S)

        // Gun arm
        if (drawP > 0) {
          const gunExt = drawP * 20 * S; const gunDir = fi === 0 ? 1 : -1
          ctx.strokeStyle = '#555'; ctx.lineWidth = 3.5 * S; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(fx + gunDir * sz * 0.7, cy)
          ctx.lineTo(fx + gunDir * (sz * 0.7 + gunExt), cy - 5 * S); ctx.stroke()
          if (drawP > 0.5) {
            ctx.fillStyle = '#333'; ctx.fillRect(fx + gunDir * (sz * 0.7 + gunExt) - 3.5 * S, cy - 9 * S, 7 * S, 7 * S)
            // Muzzle flash
            if (fired && isWin) {
              ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12 * S
              ctx.fillStyle = '#FFD700'; ctx.beginPath()
              ctx.arc(fx + gunDir * (sz * 0.7 + gunExt), cy - 6 * S, 4 * S * Math.max(0, 1 - (p - 0.75) / 0.1), 0, Math.PI * 2); ctx.fill()
              ctx.restore()
            }
          }
        }

        // Name — bigger with glow
        ctx.shadowColor = isWin ? col : 'transparent'; ctx.shadowBlur = isWin ? 8 * S : 0
        ctx.fillStyle = isWin ? col : 'rgba(255,255,255,0.7)'
        ctx.font = `${isWin ? '800' : '600'} ${Math.round(13 * S)}px sans-serif`
        ctx.textAlign = 'center'; ctx.fillText(names[fi], fx, cy - sz - 20 * S)
        ctx.restore()
      }

      // Dust particles — with glow
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i]; d.x += d.vx; d.y += d.vy; d.vy += 0.08 * S; d.vx *= 0.98; d.life--
        if (d.life <= 0) { dust.splice(i, 1); continue }
        const a = d.life / d.mL
        ctx.save(); ctx.shadowColor = d.color; ctx.shadowBlur = 6 * S * a
        ctx.fillStyle = _alpha(d.color, a * 0.8)
        ctx.beginPath(); ctx.arc(d.x, d.y, d.sz * a, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }

      // Flash
      if (flashA > 0.01) { ctx.fillStyle = `rgba(255,240,180,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H); flashA *= 0.88 }

      // Winner reveal — double glow
      if (p > 0.80) {
        const rp = Math.min((p - 0.80) / 0.14, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(28 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = cols[winIdx]; ctx.shadowBlur = 30 * S
        ctx.fillStyle = cols[winIdx]; ctx.fillText(names[winIdx], cx, H * 0.08)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(names[winIdx], cx, H * 0.08)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(20,12,5,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introDuelBoxingInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 4000; _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2; const cy = H * 0.46

    const p1 = participants[0]; const p2 = participants.length > 1 ? participants[1] : participants[0]
    const winIdx = p1.id === winnerId ? 0 : 1
    const names = [p1.name, p2.name]
    const cols = ['#3399FF', '#FF3366']

    let t = 0; let koFired = false; let flashA = 0
    let punchCount = 0; let lastPunch = 0

    interface Hit { x: number; y: number; life: number; mL: number; sz: number; color: string }
    const hits: Hit[] = []

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Ring bg — richer
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
      bg.addColorStop(0, '#0f0c1a'); bg.addColorStop(1, '#050410')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Ring floor — brighter
      const ringGrad = ctx.createRadialGradient(cx, cy + 22 * S, 0, cx, cy + 22 * S, 150 * S)
      ringGrad.addColorStop(0, 'rgba(100,50,50,0.35)'); ringGrad.addColorStop(0.7, 'rgba(60,30,30,0.15)')
      ringGrad.addColorStop(1, 'rgba(30,15,15,0)')
      ctx.fillStyle = ringGrad; ctx.beginPath(); ctx.ellipse(cx, cy + 22 * S, 140 * S, 45 * S, 0, 0, Math.PI * 2); ctx.fill()

      // Ropes — with subtle glow
      for (let r = 0; r < 3; r++) {
        const ry = cy - 32 * S + r * 22 * S
        ctx.save(); ctx.shadowColor = 'rgba(200,180,160,0.15)'; ctx.shadowBlur = 4 * S
        ctx.strokeStyle = `rgba(200,180,160,${0.18 + r * 0.06})`; ctx.lineWidth = 2.5 * S
        ctx.beginPath(); ctx.moveTo(cx - 130 * S, ry); ctx.lineTo(cx + 130 * S, ry); ctx.stroke()
        ctx.restore()
      }

      // Boxer positions
      const enterP = Math.min(p / 0.18, 1)
      const enterE = 1 - Math.pow(1 - enterP, 3)
      const bx1 = cx - 52 * S - (1 - enterE) * 85 * S
      const bx2 = cx + 52 * S + (1 - enterE) * 85 * S

      // Punching phase (0.25 - 0.7)
      let punchOffset1 = 0; let punchOffset2 = 0
      if (p > 0.25 && p < 0.7) {
        if (t - lastPunch > 320 && punchCount < 7) {
          lastPunch = t; punchCount++
          const puncher = punchCount % 2
          const hitX = puncher === 0 ? bx2 - 16 * S : bx1 + 16 * S
          hits.push({ x: hitX, y: cy + (Math.random() - 0.5) * 12 * S, life: 25, mL: 25, sz: 15 * S, color: puncher === 0 ? cols[0] : cols[1] })
        }
        const punchPhase = ((t - lastPunch) / 320)
        if (punchPhase < 0.3) {
          if (punchCount % 2 === 1) punchOffset1 = Math.sin(punchPhase / 0.3 * Math.PI) * 18 * S
          else punchOffset2 = -Math.sin(punchPhase / 0.3 * Math.PI) * 18 * S
        }
      }

      // KO punch — stronger
      if (p > 0.72 && !koFired) {
        koFired = true; flashA = 0.6
        const hitX = winIdx === 0 ? bx2 : bx1
        hits.push({ x: hitX, y: cy, life: 40, mL: 40, sz: 25 * S, color: '#FFD700' })
      }

      // Loser falls
      let loserFall = 0; let loserTilt = 0
      if (p > 0.72) {
        const fallP = Math.min((p - 0.72) / 0.18, 1)
        const eased = 1 - Math.pow(1 - fallP, 2)
        loserFall = eased * 40 * S; loserTilt = eased * 0.55
      }

      // Draw boxers — bigger
      for (let fi = 0; fi < 2; fi++) {
        const isWin = fi === winIdx
        const fx = fi === 0 ? bx1 + punchOffset1 : bx2 + punchOffset2
        const col = cols[fi]; const sz = 24 * S

        ctx.save()
        if (!isWin && p > 0.72) {
          const dir = fi === 0 ? -1 : 1
          ctx.translate(fx + dir * loserFall * 0.5, cy + loserFall)
          ctx.rotate(dir * loserTilt)
          ctx.translate(-(fx + dir * loserFall * 0.5), -(cy + loserFall))
          ctx.globalAlpha = 1 - Math.min((p - 0.72) / 0.25, 0.45)
        }

        // Glow for winner — stronger
        if (isWin && p > 0.75) { ctx.shadowColor = col; ctx.shadowBlur = 22 * S }

        // Body
        const g = ctx.createRadialGradient(fx - sz * 0.15, cy - sz * 0.15, 0, fx, cy, sz)
        g.addColorStop(0, '#FFF'); g.addColorStop(0.35, col); g.addColorStop(1, _alpha(col, 0.3))
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, cy, sz, 0, Math.PI * 2); ctx.fill()
        if (isWin && p > 0.75) { ctx.shadowBlur = 40 * S; ctx.globalAlpha = 0.3; ctx.fill() }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1

        // Gloves — bigger with glow
        const gloveDir = fi === 0 ? 1 : -1
        const gloveX = fx + gloveDir * (sz + 6 * S + (fi === 0 ? punchOffset1 * 0.5 : -punchOffset2 * 0.5))
        ctx.save(); ctx.shadowColor = '#CC2200'; ctx.shadowBlur = 6 * S
        ctx.fillStyle = '#CC2200'
        ctx.beginPath(); ctx.arc(gloveX, cy - 3 * S, 7.5 * S, 0, Math.PI * 2); ctx.fill()
        ctx.restore()

        // Name — bigger with glow
        ctx.shadowColor = isWin ? col : 'transparent'; ctx.shadowBlur = isWin ? 10 * S : 0
        ctx.fillStyle = isWin ? col : 'rgba(255,255,255,0.7)'
        ctx.font = `${isWin ? '800' : '600'} ${Math.round(13 * S)}px sans-serif`
        ctx.textAlign = 'center'; ctx.fillText(names[fi], fx, cy - sz - 12 * S)
        ctx.restore()
      }

      // Hit effects — with glow
      for (let i = hits.length - 1; i >= 0; i--) {
        const h = hits[i]; h.life--
        if (h.life <= 0) { hits.splice(i, 1); continue }
        const a = h.life / h.mL; const scale = 1 + (1 - a) * 1.8
        ctx.save(); ctx.globalAlpha = a * 0.8
        ctx.shadowColor = h.color; ctx.shadowBlur = 10 * S * a
        ctx.strokeStyle = h.color; ctx.lineWidth = 3 * S
        for (let r = 0; r < 5; r++) {
          const ra = (r / 5) * Math.PI * 2 + t * 0.05
          ctx.beginPath()
          ctx.moveTo(h.x + Math.cos(ra) * h.sz * 0.3 * scale, h.y + Math.sin(ra) * h.sz * 0.3 * scale)
          ctx.lineTo(h.x + Math.cos(ra) * h.sz * scale, h.y + Math.sin(ra) * h.sz * scale)
          ctx.stroke()
        }
        ctx.restore()
      }

      // Flash
      if (flashA > 0.01) { ctx.fillStyle = `rgba(255,255,255,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H); flashA *= 0.88 }

      // Winner reveal — double glow
      if (p > 0.80) {
        const rp = Math.min((p - 0.80) / 0.14, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(28 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = cols[winIdx]; ctx.shadowBlur = 30 * S
        ctx.fillStyle = cols[winIdx]; ctx.fillText(names[winIdx], cx, H * 0.08)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(names[winIdx], cx, H * 0.08)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(5,4,10,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introRevengeFireInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3600; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.40
    const accent = _css('--color-accent', '#00F5FF')
    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const names = participants.map(p => p.name)

    interface Flame { x: number; y: number; vx: number; vy: number; life: number; mL: number; color: string; sz: number }
    const flames: Flame[] = []
    let t = 0, flashA = 0, ignited = false
    let targetIdx = 0, switchTimer = 0

    function draw() {
      // Full clear + fire gradient background
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#080204')
      bg.addColorStop(0.6, ignited ? '#1a0800' : '#0c0305')
      bg.addColorStop(1, ignited ? '#2a0a00' : '#0a0204')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Bottom fire glow
      const fireGlow = ctx.createRadialGradient(cx, H, 0, cx, H, H * 0.6)
      fireGlow.addColorStop(0, _alpha('#FF4500', ignited ? 0.25 : 0.08))
      fireGlow.addColorStop(0.5, _alpha('#FF2200', ignited ? 0.1 : 0.03))
      fireGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = fireGlow; ctx.fillRect(0, 0, W, H)

      const p = Math.min(t / DUR, 1)

      // Scanning names
      if (p < 0.52) {
        switchTimer += 16
        if (switchTimer > 80) { targetIdx = (targetIdx + 1) % names.length; switchTimer = 0 }
      } else if (!ignited) {
        ignited = true; flashA = 1
        targetIdx = participants.findIndex(pp => pp.id === winnerId)
        if (targetIdx < 0) targetIdx = 0
      }

      // Continuous rising fire — MORE particles, BIGGER, with GLOW
      if (p > 0.03 && p < 0.88) {
        const cnt = slow ? 2 : (ignited ? 8 : 5)
        for (let i = 0; i < cnt; i++) {
          const spread = ignited ? 200 : 140
          const fx = cx + (Math.random() - 0.5) * spread * S
          const colors = ['#FF4500', '#FF6600', '#FFAA00', '#FFD700', '#FF2200', '#FF8C00']
          flames.push({ x: fx, y: H * (0.85 + Math.random() * 0.15), vx: (Math.random() - 0.5) * 1.5 * S, vy: -(3 + Math.random() * 6) * S, life: 50 + Math.random() * 40, mL: 90, color: colors[Math.floor(Math.random() * colors.length)], sz: (8 + Math.random() * 14) * S })
        }
      }

      // Massive ignition burst
      if (ignited && flashA > 0.8) {
        const cnt = slow ? 30 : 60
        for (let i = 0; i < cnt; i++) {
          const a = Math.PI * 2 / cnt * i; const spd = (6 + Math.random() * 14) * S
          flames.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 3 * S, life: 55 + Math.random() * 40, mL: 95, color: ['#FF4500', '#FFAA00', '#FF2200', '#FFD700', '#FFFFFF'][i % 5], sz: (6 + Math.random() * 10) * S })
        }
      }

      // Draw flames — with shadowBlur glow
      flames.forEach(f => { f.x += f.vx; f.y += f.vy; f.vy -= 0.03 * S; f.life-- })
      flames.forEach(f => {
        if (f.life <= 0) return; const a = f.life / f.mL
        ctx.save()
        ctx.shadowColor = f.color; ctx.shadowBlur = 14 * S * a
        ctx.beginPath(); ctx.arc(f.x, f.y, f.sz * a, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(f.color, a * 0.85); ctx.fill()
        ctx.restore()
      })
      for (let i = flames.length - 1; i >= 0; i--) { if (flames[i].life <= 0) flames.splice(i, 1) }

      // Name display — BIG
      ctx.save()
      const nameSize = ignited ? 30 : 24
      ctx.font = `800 ${Math.round(nameSize * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = ignited ? '#FFD700' : '#FFFFFF'
      ctx.shadowColor = ignited ? '#FF4500' : '#FF660088'; ctx.shadowBlur = ignited ? 30 * S : 10 * S
      // Glitch scan
      if (!ignited && Math.random() > 0.7) {
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#FF4500'
        ctx.fillText(names[targetIdx], cx + (Math.random() - 0.5) * 10 * S, cy + (Math.random() - 0.5) * 6 * S)
        ctx.globalAlpha = 1; ctx.fillStyle = '#FFFFFF'
      }
      ctx.fillText(names[targetIdx], cx, cy)
      // Extra glow pass on locked name
      if (ignited) { ctx.shadowBlur = 50 * S; ctx.globalAlpha = 0.5; ctx.fillText(names[targetIdx], cx, cy) }
      ctx.restore()

      // Orange/red flash on ignition
      if (flashA > 0.01) {
        ctx.fillStyle = `rgba(255,80,0,${flashA * 0.6})`; ctx.fillRect(0, 0, W, H)
        flashA *= 0.86
      }

      // Winner reveal
      if (p > 0.76) {
        const rp = Math.min((p - 0.76) / 0.16, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(32 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = accent; ctx.shadowBlur = 30 * S
        ctx.fillStyle = accent; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(8,2,2,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introRevengeTargetInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3500; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.42
    const accent = _css('--color-accent', '#00F5FF')
    const impact = _css('--color-impact', '#FF006E')
    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const names = participants.map(p => p.name)

    interface TSpark { x: number; y: number; vx: number; vy: number; life: number; mL: number; color: string; sz: number }
    const sparks: TSpark[] = []
    let t = 0, locked = false, flashA = 0
    let targetIdx = 0, switchTimer = 0, ringPulse = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7)
      bg.addColorStop(0, '#0a0318'); bg.addColorStop(1, '#020108')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Scanning
      if (p < 0.58) {
        switchTimer += 16
        if (switchTimer > 110) { targetIdx = (targetIdx + 1) % names.length; switchTimer = 0 }
        ringPulse = 0.5 + 0.5 * Math.sin(t * 0.08)
      } else if (!locked) {
        locked = true; flashA = 1; ringPulse = 1
        targetIdx = participants.findIndex(pp => pp.id === winnerId)
        if (targetIdx < 0) targetIdx = 0
        const cnt = slow ? 20 : 45
        for (let i = 0; i < cnt; i++) {
          const a = Math.PI * 2 / cnt * i; const spd = (4 + Math.random() * 9) * S
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 45 + Math.random() * 35, mL: 80, color: i % 3 === 0 ? '#FFFFFF' : i % 2 === 0 ? impact : accent, sz: (4 + Math.random() * 6) * S })
        }
      }

      // Target rings — with glow
      const rings = [95, 72, 52, 34]
      const ringColors = [impact, '#FFFFFF', impact, '#FFFFFF']
      rings.forEach((r, i) => {
        const show = Math.min(p / 0.12, 1)
        const alpha = show * (0.35 + (locked ? 0.55 : ringPulse * 0.4))
        ctx.save(); ctx.shadowColor = ringColors[i]; ctx.shadowBlur = locked ? 14 * S : 6 * S
        ctx.fillStyle = _alpha(ringColors[i], alpha)
        ctx.beginPath(); ctx.arc(cx, cy, r * S, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      })

      // Bullseye center — glowing
      ctx.save()
      ctx.shadowColor = impact; ctx.shadowBlur = locked ? 20 * S : 10 * S
      ctx.fillStyle = _alpha(impact, locked ? 0.95 : 0.5 + ringPulse * 0.4)
      ctx.beginPath(); ctx.arc(cx, cy, 14 * S, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      // Name — bigger, with glitch
      ctx.save()
      const nameSize = locked ? 26 : 20
      ctx.font = `800 ${Math.round(nameSize * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.shadowColor = locked ? accent : impact; ctx.shadowBlur = locked ? 22 * S : 6 * S
      ctx.fillStyle = locked ? accent : '#FFFFFF'
      if (!locked && Math.random() > 0.75) {
        ctx.globalAlpha = 0.35; ctx.fillStyle = impact
        ctx.fillText(names[targetIdx], cx + (Math.random() - 0.5) * 8 * S, cy + 115 * S + (Math.random() - 0.5) * 4 * S)
        ctx.globalAlpha = 1; ctx.fillStyle = '#FFFFFF'
      }
      ctx.fillText(names[targetIdx], cx, cy + 115 * S)
      if (locked) { ctx.shadowBlur = 40 * S; ctx.globalAlpha = 0.4; ctx.fillText(names[targetIdx], cx, cy + 115 * S) }
      ctx.restore()

      // Sparks with glow
      sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.12 * S; s.vx *= 0.99; s.life-- })
      sparks.forEach(s => {
        if (s.life <= 0) return; const a = s.life / s.mL
        ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 10 * S * a
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * a, 0, Math.PI * 2)
        ctx.fillStyle = _alpha(s.color, a * 0.9); ctx.fill(); ctx.restore()
      })
      for (let i = sparks.length - 1; i >= 0; i--) { if (sparks[i].life <= 0) sparks.splice(i, 1) }

      // Pink flash on lock
      if (flashA > 0.01) { ctx.fillStyle = `rgba(255,0,100,${flashA * 0.5})`; ctx.fillRect(0, 0, W, H); flashA *= 0.86 }

      // Winner reveal
      if (p > 0.78) {
        const rp = Math.min((p - 0.78) / 0.15, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(30 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = accent; ctx.shadowBlur = 30 * S
        ctx.fillStyle = accent; ctx.fillText(winnerName, cx, H * 0.10)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(winnerName, cx, H * 0.10)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(2,1,8,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

function introRevengeStormInteractive(participants: Participant[], winnerId: string): Promise<void> {
  return new Promise(resolve => {
    const DUR = 3800; const slow = _isSlowDevice()
    const { ctx, W, H } = _introBase(DUR); const S = Math.min(W, H) / 480
    const cx = W / 2, cy = H * 0.42
    const accent = _css('--color-accent', '#00F5FF')
    const winner = participants.find(p => p.id === winnerId)
    const winnerName = winner?.name || 'Winner'
    const names = participants.map(p => p.name)

    interface Bolt { x1: number; y1: number; x2: number; y2: number; life: number; mL: number; color: string; w: number }
    interface Drop { x: number; y: number; vy: number; life: number; len: number }
    const bolts: Bolt[] = [], drops: Drop[] = []
    let t = 0, flashA = 0, struck = false
    let targetIdx = 0, switchTimer = 0

    function draw() {
      // Full clear + stormy gradient
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#020215'); bg.addColorStop(0.4, '#050520'); bg.addColorStop(1, '#030310')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Lightning ambient glow from top
      if (struck || (t % 200 < 30 && Math.random() > 0.7)) {
        const topGlow = ctx.createRadialGradient(cx, 0, 0, cx, 0, H * 0.5)
        topGlow.addColorStop(0, _alpha('#6688FF', struck ? 0.15 : 0.06))
        topGlow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = topGlow; ctx.fillRect(0, 0, W, H)
      }

      const p = Math.min(t / DUR, 1)

      // HEAVY rain — visible streaks
      if (p > 0.03 && p < 0.92) {
        const cnt = slow ? 3 : 8
        for (let i = 0; i < cnt; i++) {
          drops.push({ x: Math.random() * W + 20, y: -10 - Math.random() * 30, vy: (8 + Math.random() * 8) * S, life: 35 + Math.random() * 20, len: (14 + Math.random() * 20) * S })
        }
      }
      drops.forEach(d => { d.y += d.vy; d.x -= 0.5 * S; d.life-- })
      drops.forEach(d => {
        if (d.life <= 0) return
        const a = Math.min(d.life / 30, 1)
        ctx.strokeStyle = _alpha('#8899DD', a * 0.35); ctx.lineWidth = 1.5 * S
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2 * S, d.y + d.len); ctx.stroke()
      })
      for (let i = drops.length - 1; i >= 0; i--) { if (drops[i].life <= 0) drops.splice(i, 1) }

      // Scanning
      if (p < 0.52) {
        switchTimer += 16
        if (switchTimer > 100) { targetIdx = (targetIdx + 1) % names.length; switchTimer = 0 }
      } else if (!struck) {
        struck = true; flashA = 1
        targetIdx = participants.findIndex(pp => pp.id === winnerId)
        if (targetIdx < 0) targetIdx = 0
        // MASSIVE lightning bolt — multi-segment with branches
        const segments = 10
        let bx = cx + (Math.random() - 0.5) * 30 * S, by = 0
        for (let i = 0; i < segments; i++) {
          const nx = bx + (Math.random() - 0.5) * 70 * S
          const ny = (i + 1) / segments * (cy + 20 * S)
          bolts.push({ x1: bx, y1: by, x2: nx, y2: ny, life: 45 + Math.random() * 20, mL: 65, color: '#FFFFFF', w: (5 - i * 0.35) * S })
          // Branch every 3rd segment
          if (i % 3 === 1) {
            const branchAngle = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5)
            const bl = 40 + Math.random() * 50
            bolts.push({ x1: nx, y1: ny, x2: nx + Math.cos(branchAngle) * bl * S, y2: ny + Math.sin(Math.abs(branchAngle)) * bl * S * 0.6, life: 30 + Math.random() * 15, mL: 45, color: '#AABBFF', w: 2 * S })
          }
          bx = nx; by = ny
        }
      }

      // Random ambient bolts — more frequent
      if (p > 0.08 && p < 0.88 && Math.random() < 0.035) {
        const bx = Math.random() * W, by = 0
        const segs = 3 + Math.floor(Math.random() * 3)
        let px = bx, py = by
        for (let s = 0; s < segs; s++) {
          const nx = px + (Math.random() - 0.5) * 60 * S
          const ny = py + (40 + Math.random() * 60) * S
          bolts.push({ x1: px, y1: py, x2: nx, y2: ny, life: 10 + Math.random() * 10, mL: 20, color: '#8888FF', w: (1.5 + Math.random()) * S })
          px = nx; py = ny
        }
      }

      // Draw bolts with strong glow
      bolts.forEach(b => { b.life-- })
      bolts.forEach(b => {
        if (b.life <= 0) return; const a = b.life / b.mL
        ctx.save()
        ctx.shadowColor = b.color; ctx.shadowBlur = 20 * S * a
        ctx.strokeStyle = _alpha(b.color, a); ctx.lineWidth = b.w * a
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke()
        // Extra glow pass
        ctx.shadowBlur = 40 * S * a; ctx.globalAlpha = a * 0.3
        ctx.stroke()
        ctx.restore()
      })
      for (let i = bolts.length - 1; i >= 0; i--) { if (bolts[i].life <= 0) bolts.splice(i, 1) }

      // Name — BIG
      ctx.save()
      const nameSize = struck ? 28 : 22
      ctx.font = `800 ${Math.round(nameSize * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = struck ? accent : '#BBBBDD'
      ctx.shadowColor = struck ? accent : '#6666AA'; ctx.shadowBlur = struck ? 24 * S : 8 * S
      // Flicker effect while scanning
      if (!struck && Math.random() > 0.8) {
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#8888FF'
        ctx.fillText(names[targetIdx], cx + (Math.random() - 0.5) * 6 * S, cy + (Math.random() - 0.5) * 4 * S)
        ctx.globalAlpha = 1; ctx.fillStyle = '#BBBBDD'
      }
      ctx.fillText(names[targetIdx], cx, cy)
      if (struck) { ctx.shadowBlur = 40 * S; ctx.globalAlpha = 0.4; ctx.fillText(names[targetIdx], cx, cy) }
      ctx.restore()

      // Blue-white flash on strike
      if (flashA > 0.01) {
        ctx.fillStyle = `rgba(180,190,255,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H)
        flashA *= 0.84
      }

      // Winner reveal
      if (p > 0.76) {
        const rp = Math.min((p - 0.76) / 0.16, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(30 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.shadowColor = accent; ctx.shadowBlur = 30 * S
        ctx.fillStyle = accent; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.shadowBlur = 50 * S; ctx.globalAlpha = rp * 0.4; ctx.fillText(winnerName, cx, H * 0.12)
        ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(2,2,10,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}
