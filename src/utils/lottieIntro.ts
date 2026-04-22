/**
 * Hybrid Lottie + Canvas intro system
 * Lottie handles cinematic background effects (fire, explosions, particles)
 * Canvas overlay handles dynamic data (participant names, winner reveal)
 */
import type { AnimationItem } from 'lottie-web'
import type { Participant } from '../types'
import { getPerformanceLevel } from './performance'

// Dynamic import — lottie only loads when an animation is triggered (code-split)
let _lottie: typeof import('lottie-web/build/player/lottie_light').default | null = null
async function _loadLottie() {
  if (!_lottie) {
    const mod = await import('lottie-web/build/player/lottie_light')
    _lottie = mod.default
  }
  return _lottie
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

function _alpha(color: string, alpha: number): string {
  if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, `${alpha})`)
  if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`)
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const r = parseInt(color[1]+color[1], 16), g = parseInt(color[2]+color[2], 16), b = parseInt(color[3]+color[3], 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  if (/^#[0-9a-f]{6,8}$/i.test(color)) {
    const r = parseInt(color.slice(1,3), 16), g = parseInt(color.slice(3,5), 16), b = parseInt(color.slice(5,7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return color
}

function _css(prop: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback
}

function _isSlowDevice(): boolean {
  if (getPerformanceLevel() === 'reduced') return true
  return (navigator.hardwareConcurrency || 4) <= 6
}

// ══════════════════════════════════════════════════════════
// LOTTIE + CANVAS HYBRID BASE
// ══════════════════════════════════════════════════════════

interface HybridBase {
  overlay: HTMLDivElement
  lottieContainer: HTMLDivElement
  anim: AnimationItem
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  S: number
}

async function _hybridBase(dur: number, animationData: object): Promise<HybridBase> {
  const lottie = await _loadLottie()
  const overlay = document.createElement('div')
  overlay.style.cssText = `position:fixed;inset:0;z-index:9997;background:rgba(4,2,14,0.98);pointer-events:none;animation:overlayFadeIn 180ms ease both;display:flex;align-items:center;justify-content:center;`
  document.body.appendChild(overlay)

  const screenW = window.innerWidth
  const screenH = window.innerHeight
  const W = Math.min(screenW, 480)
  const H = Math.min(screenH, 680)
  const S = Math.min(W, H) / 480

  // Lottie container (background layer)
  const lottieContainer = document.createElement('div')
  lottieContainer.style.cssText = `position:absolute;width:${W}px;height:${H}px;left:${Math.floor((screenW - W) / 2)}px;top:${Math.floor((screenH - H) / 2)}px;overflow:hidden;`
  overlay.appendChild(lottieContainer)

  const anim = lottie!.loadAnimation({
    container: lottieContainer,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData,
    rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
  })

  // Canvas overlay (foreground layer for text/data)
  const canvas = document.createElement('canvas')
  const DPR = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * DPR
  canvas.height = H * DPR
  canvas.style.cssText = `position:absolute;left:${Math.floor((screenW - W) / 2)}px;top:${Math.floor((screenH - H) / 2)}px;width:${W}px;height:${H}px;pointer-events:none;`
  const ctx = canvas.getContext('2d')!
  ctx.scale(DPR, DPR)
  overlay.appendChild(canvas)

  // Cleanup
  const FADE = 250
  setTimeout(() => { overlay.style.transition = `opacity ${FADE}ms ease`; overlay.style.opacity = '0' }, dur - FADE)
  setTimeout(() => { anim.destroy(); overlay.remove() }, dur + 50)

  return { overlay, lottieContainer, anim, canvas, ctx, W, H, S }
}

// ══════════════════════════════════════════════════════════
// LOTTIE ANIMATION DATA (programmatic — no external files)
// ══════════════════════════════════════════════════════════

/** Generate a cinematic fire/ember Lottie animation data object */
function _lottieFireData(W: number, H: number): object {
  const particles: object[] = []
  const count = _isSlowDevice() ? 12 : 25

  for (let i = 0; i < count; i++) {
    const startX = Math.random() * W
    const startY = H * 0.8 + Math.random() * H * 0.3
    const endY = -H * 0.2
    const size = 6 + Math.random() * 20
    const delay = Math.random() * 50
    const dur = 40 + Math.random() * 40
    const sway = (Math.random() - 0.5) * 80
    const colors = ['ff4500', 'ff6600', 'ffaa00', 'ffd700', 'ff2200']
    const color = colors[i % colors.length]

    particles.push({
      ty: 4, // shape group
      nm: `fire_${i}`,
      it: [
        // Ellipse shape
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [size, size * 1.3] }, nm: 'e' },
        // Fill
        {
          ty: 'fl', c: { a: 0, k: [
            parseInt(color.slice(0,2),16)/255,
            parseInt(color.slice(2,4),16)/255,
            parseInt(color.slice(4,6),16)/255, 1
          ]}, o: { a: 1, k: [
            { t: delay, s: [0] },
            { t: delay + 5, s: [80] },
            { t: delay + dur * 0.7, s: [60] },
            { t: delay + dur, s: [0] }
          ]}, nm: 'f'
        },
        // Transform
        {
          ty: 'tr',
          p: { a: 1, k: [
            { t: delay, s: [startX, startY], e: [startX + sway * 0.3, startY - (startY - endY) * 0.3], i: { x: 0.4, y: 0 }, o: { x: 0.6, y: 1 } },
            { t: delay + dur * 0.5, s: [startX + sway * 0.3, startY - (startY - endY) * 0.3], e: [startX + sway, endY], i: { x: 0.4, y: 0 }, o: { x: 0.6, y: 1 } },
            { t: delay + dur, s: [startX + sway, endY] }
          ]},
          s: { a: 1, k: [
            { t: delay, s: [100, 100] },
            { t: delay + dur * 0.3, s: [120, 130] },
            { t: delay + dur, s: [30, 30] }
          ]},
          o: { a: 0, k: 100 },
          r: { a: 1, k: [
            { t: delay, s: [0] },
            { t: delay + dur, s: [(Math.random() - 0.5) * 360] }
          ]},
          a: { a: 0, k: [0, 0] }
        }
      ]
    })
  }

  // Glow circle in center
  particles.push({
    ty: 4, nm: 'glow',
    it: [
      { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [W * 0.6, H * 0.4] }, nm: 'e' },
      {
        ty: 'fl',
        c: { a: 1, k: [
          { t: 0, s: [1, 0.27, 0] },
          { t: 30, s: [1, 0.45, 0] },
          { t: 60, s: [1, 0.27, 0] }
        ]},
        o: { a: 1, k: [
          { t: 0, s: [15] },
          { t: 30, s: [25] },
          { t: 60, s: [15] }
        ]},
        nm: 'f'
      },
      {
        ty: 'tr', p: { a: 0, k: [W / 2, H * 0.5] },
        s: { a: 1, k: [{ t: 0, s: [100, 100] }, { t: 30, s: [115, 110] }, { t: 60, s: [100, 100] }] },
        o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, a: { a: 0, k: [0, 0] }
      }
    ]
  })

  return {
    v: '5.7.4', fr: 30, ip: 0, op: 90, w: Math.round(W), h: Math.round(H),
    layers: [{
      ty: 4, nm: 'fire', sr: 1, ks: {
        o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }
      },
      ip: 0, op: 90, st: 0, shapes: particles
    }]
  }
}

/** Generate a cinematic storm/lightning Lottie animation */
function _lottieStormData(W: number, H: number): object {
  const shapes: object[] = []
  const slow = _isSlowDevice()

  // Rain drops
  const dropCount = slow ? 20 : 50
  for (let i = 0; i < dropCount; i++) {
    const x = Math.random() * W
    const startY = -20 - Math.random() * 100
    const endY = H + 20
    const dur = 15 + Math.random() * 15
    const delay = Math.random() * 60
    const len = 10 + Math.random() * 20

    shapes.push({
      ty: 4, nm: `rain_${i}`,
      it: [
        { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [1.5, len] }, r: { a: 0, k: 0 }, nm: 'r' },
        { ty: 'fl', c: { a: 0, k: [0.4, 0.53, 0.8, 1] }, o: { a: 0, k: 30 }, nm: 'f' },
        {
          ty: 'tr',
          p: { a: 1, k: [
            { t: delay, s: [x, startY] },
            { t: delay + dur, s: [x - 15, endY] }
          ]},
          o: { a: 0, k: 100 }, r: { a: 0, k: 8 },
          s: { a: 0, k: [100, 100] }, a: { a: 0, k: [0, 0] }
        }
      ]
    })
  }

  // Lightning bolts
  const boltCount = slow ? 2 : 4
  for (let b = 0; b < boltCount; b++) {
    const bx = W * 0.2 + Math.random() * W * 0.6
    const segments: number[][] = [[bx, 0]]
    let px = bx, py = 0
    for (let s = 0; s < 6; s++) {
      px += (Math.random() - 0.5) * 80
      py += H / 7
      segments.push([px, py])
    }

    const flashAt = 20 + b * 20
    const path = segments.map((p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`).join(' ')

    shapes.push({
      ty: 4, nm: `bolt_${b}`,
      it: [
        {
          ty: 'sh', ks: {
            a: 0, k: {
              c: false, v: segments.map(s => [s[0], s[1]]),
              i: segments.map(() => [0, 0]),
              o: segments.map(() => [0, 0])
            }
          }, nm: 'path'
        },
        { ty: 'st', c: { a: 0, k: [0.8, 0.85, 1, 1] }, o: { a: 1, k: [
          { t: flashAt - 1, s: [0] }, { t: flashAt, s: [100] },
          { t: flashAt + 3, s: [80] }, { t: flashAt + 8, s: [0] }
        ]}, w: { a: 1, k: [
          { t: flashAt, s: [4] }, { t: flashAt + 5, s: [1] }
        ]}, nm: 'stroke' },
        {
          ty: 'tr', p: { a: 0, k: [0, 0] }, o: { a: 0, k: 100 },
          r: { a: 0, k: 0 }, s: { a: 0, k: [100, 100] }, a: { a: 0, k: [0, 0] }
        }
      ]
    })

    // Flash rect
    void path // path is used in shape above via segments
    shapes.push({
      ty: 4, nm: `flash_${b}`,
      it: [
        { ty: 'rc', p: { a: 0, k: [W/2, H/2] }, s: { a: 0, k: [W, H] }, r: { a: 0, k: 0 }, nm: 'r' },
        { ty: 'fl', c: { a: 0, k: [0.8, 0.85, 1, 1] }, o: { a: 1, k: [
          { t: flashAt - 1, s: [0] }, { t: flashAt, s: [20] },
          { t: flashAt + 2, s: [10] }, { t: flashAt + 6, s: [0] }
        ]}, nm: 'f' },
        {
          ty: 'tr', p: { a: 0, k: [0, 0] }, o: { a: 0, k: 100 },
          r: { a: 0, k: 0 }, s: { a: 0, k: [100, 100] }, a: { a: 0, k: [0, 0] }
        }
      ]
    })
  }

  return {
    v: '5.7.4', fr: 30, ip: 0, op: 90, w: Math.round(W), h: Math.round(H),
    layers: [{
      ty: 4, nm: 'storm', sr: 1, ks: {
        o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }
      },
      ip: 0, op: 90, st: 0, shapes
    }]
  }
}

/** Generate crosshair/targeting Lottie animation */
function _lottieCrosshairData(W: number, H: number): object {
  const cx = W / 2, cy = H * 0.46
  const shapes: object[] = []

  // Concentric rings that appear one by one
  const rings = [80, 60, 42, 26]
  const colors = [[1, 0, 0.43], [0, 0.96, 1], [1, 0, 0.43], [0, 0.96, 1]]
  rings.forEach((r, i) => {
    const delay = i * 5
    shapes.push({
      ty: 4, nm: `ring_${i}`,
      it: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [r * 2, r * 2] }, nm: 'e' },
        { ty: 'st', c: { a: 0, k: [...colors[i], 1] }, o: { a: 1, k: [
          { t: delay, s: [0] }, { t: delay + 8, s: [70] }, { t: 80, s: [70] }, { t: 90, s: [0] }
        ]}, w: { a: 0, k: 2 + (3 - i) }, nm: 's' },
        {
          ty: 'tr', p: { a: 0, k: [cx, cy] },
          s: { a: 1, k: [
            { t: delay, s: [0, 0] }, { t: delay + 10, s: [100, 100] }
          ]},
          o: { a: 0, k: 100 }, r: { a: 1, k: [
            { t: 0, s: [0] }, { t: 90, s: [i % 2 === 0 ? 15 : -15] }
          ]},
          a: { a: 0, k: [0, 0] }
        }
      ]
    })
  })

  // Cross lines
  const lineLen = 100;
  [
    [[cx - lineLen, cy], [cx + lineLen, cy]],
    [[cx, cy - lineLen], [cx, cy + lineLen]]
  ].forEach((line, i) => {
    shapes.push({
      ty: 4, nm: `line_${i}`,
      it: [
        {
          ty: 'sh', ks: { a: 0, k: {
            c: false,
            v: [line[0], line[1]],
            i: [[0,0],[0,0]], o: [[0,0],[0,0]]
          }}, nm: 'path'
        },
        { ty: 'st', c: { a: 0, k: [0, 0.96, 1, 1] }, o: { a: 1, k: [
          { t: 5, s: [0] }, { t: 12, s: [50] }
        ]}, w: { a: 0, k: 1.5 }, nm: 's' },
        {
          ty: 'tr', p: { a: 0, k: [0, 0] }, o: { a: 0, k: 100 },
          r: { a: 0, k: 0 }, s: { a: 0, k: [100, 100] }, a: { a: 0, k: [0, 0] }
        }
      ]
    })
  })

  // Scanning dots rotating
  for (let d = 0; d < 8; d++) {
    const angle = d * Math.PI * 2 / 8
    const dist = 55
    shapes.push({
      ty: 4, nm: `dot_${d}`,
      it: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [4, 4] }, nm: 'e' },
        { ty: 'fl', c: { a: 0, k: [1, 0, 0.43, 1] }, o: { a: 1, k: [
          { t: d * 3, s: [0] }, { t: d * 3 + 5, s: [80] },
          { t: d * 3 + 15, s: [80] }, { t: d * 3 + 20, s: [30] }
        ]}, nm: 'f' },
        {
          ty: 'tr',
          p: { a: 1, k: [
            { t: 0, s: [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist] },
            { t: 90, s: [cx + Math.cos(angle + 0.8) * dist, cy + Math.sin(angle + 0.8) * dist] }
          ]},
          o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
          s: { a: 0, k: [100, 100] }, a: { a: 0, k: [0, 0] }
        }
      ]
    })
  }

  return {
    v: '5.7.4', fr: 30, ip: 0, op: 90, w: Math.round(W), h: Math.round(H),
    layers: [{
      ty: 4, nm: 'crosshair', sr: 1, ks: {
        o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }
      },
      ip: 0, op: 90, st: 0, shapes
    }]
  }
}

// ══════════════════════════════════════════════════════════
// HYBRID INTERACTIVE ANIMATIONS
// ══════════════════════════════════════════════════════════

export async function lottieRevengeFireInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const DUR = 3500
  const screenW = window.innerWidth, screenH = window.innerHeight
  const W = Math.min(screenW, 480), H = Math.min(screenH, 680)
  const { ctx, S, anim } = await _hybridBase(DUR, _lottieFireData(W, H))
  const cx = W / 2, cy = H * 0.46
  const accent = _css('--color-accent', '#00F5FF')
  const winner = participants.find(p => p.id === winnerId)
  const winnerName = winner?.name || 'Winner'
  const names = participants.map(p => p.name)

  return new Promise(resolve => {
    let t = 0, locked = false, flashA = 0
    let targetIdx = 0, switchTimer = 0

    // Speed up Lottie slightly for more drama
    anim.setSpeed(1.3)

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      // Scanning names
      if (p < 0.55) {
        switchTimer += 16
        if (switchTimer > 100) { targetIdx = (targetIdx + 1) % names.length; switchTimer = 0 }
      } else if (!locked) {
        locked = true; flashA = 1
        targetIdx = participants.findIndex(pp => pp.id === winnerId)
        if (targetIdx < 0) targetIdx = 0
        anim.setSpeed(0.6) // Slow down for reveal
      }

      // Vignette overlay
      const vignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.5)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(0.7, 'rgba(0,0,0,0.15)')
      vignette.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H)

      // Name cycling — large dramatic text
      const nameSize = locked ? 26 : 22
      ctx.save()
      ctx.font = `800 ${Math.round(nameSize * S)}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillStyle = locked ? '#FFD700' : '#FFFFFF'
      if (locked) { ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 20 * S }
      else { ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 8 * S }

      // Glitch effect while scanning
      if (!locked && Math.random() > 0.85) {
        ctx.fillStyle = _alpha('#FF4500', 0.6)
        ctx.fillText(names[targetIdx], cx + (Math.random() - 0.5) * 6 * S, cy + (Math.random() - 0.5) * 4 * S)
      }
      ctx.fillText(names[targetIdx], cx, cy)
      ctx.shadowBlur = 0; ctx.restore()

      // Flash on lock
      if (flashA > 0.01) {
        ctx.fillStyle = `rgba(255,100,0,${flashA * 0.5})`; ctx.fillRect(0, 0, W, H)
        flashA *= 0.88
      }

      // Winner reveal with glow
      if (p > 0.75) {
        const rp = Math.min((p - 0.75) / 0.18, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(28 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 24 * S
        ctx.fillText(winnerName, cx, H * 0.12)
        ctx.shadowBlur = 0; ctx.restore()
      }

      // Fade out
      if (p > 0.92) {
        ctx.fillStyle = `rgba(10,2,2,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H)
      }

      t += 16
      if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw)
    setTimeout(resolve, DUR + 100)
  })
}

export async function lottieRevengeStormInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const DUR = 3800
  const screenW = window.innerWidth, screenH = window.innerHeight
  const W = Math.min(screenW, 480), H = Math.min(screenH, 680)
  const { ctx, S, anim } = await _hybridBase(DUR, _lottieStormData(W, H))
  const cx = W / 2, cy = H * 0.46
  const accent = _css('--color-accent', '#00F5FF')
  const winner = participants.find(p => p.id === winnerId)
  const winnerName = winner?.name || 'Winner'
  const names = participants.map(p => p.name)

  return new Promise(resolve => {
    let t = 0, struck = false, flashA = 0
    let targetIdx = 0, switchTimer = 0

    anim.setSpeed(1.2)

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      if (p < 0.55) {
        switchTimer += 16
        if (switchTimer > 110) { targetIdx = (targetIdx + 1) % names.length; switchTimer = 0 }
      } else if (!struck) {
        struck = true; flashA = 1
        targetIdx = participants.findIndex(pp => pp.id === winnerId)
        if (targetIdx < 0) targetIdx = 0
      }

      // Dark vignette for storm mood
      const vig = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.5)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(3,3,20,0.5)')
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H)

      // Name display
      ctx.save()
      ctx.font = `800 ${Math.round(22 * S)}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillStyle = struck ? accent : '#CCCCDD'
      if (struck) { ctx.shadowColor = accent; ctx.shadowBlur = 18 * S }
      ctx.fillText(names[targetIdx], cx, cy + 10 * S)
      ctx.shadowBlur = 0; ctx.restore()

      if (flashA > 0.01) {
        ctx.fillStyle = `rgba(200,200,255,${flashA * 0.6})`; ctx.fillRect(0, 0, W, H)
        flashA *= 0.84
      }

      if (p > 0.76) {
        const rp = Math.min((p - 0.76) / 0.17, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(28 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 24 * S
        ctx.fillText(winnerName, cx, H * 0.1)
        ctx.shadowBlur = 0; ctx.restore()
      }

      if (p > 0.92) { ctx.fillStyle = `rgba(3,3,12,${(p - 0.92) / 0.08})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}

export async function lottieCrosshairInteractive(participants: Participant[], winnerId: string): Promise<void> {
  const DUR = 3200
  const screenW = window.innerWidth, screenH = window.innerHeight
  const W = Math.min(screenW, 480), H = Math.min(screenH, 680)
  const { ctx, S, anim } = await _hybridBase(DUR, _lottieCrosshairData(W, H))
  const cx = W / 2, cy = H * 0.46
  const accent = _css('--color-accent', '#00F5FF')
  const impact = _css('--color-impact', '#FF006E')
  const winner = participants.find(p => p.id === winnerId)
  const winnerName = winner?.name || 'Winner'
  const names = participants.map(p => p.name)

  return new Promise(resolve => {
    let t = 0, locked = false, flashA = 0
    let targetIdx = 0, switchTimer = 0

    anim.setSpeed(1.0)

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = Math.min(t / DUR, 1)

      if (p < 0.6) {
        switchTimer += 16
        if (switchTimer > 110) { targetIdx = (targetIdx + 1) % names.length; switchTimer = 0 }
      } else if (!locked) {
        locked = true; flashA = 1
        targetIdx = participants.findIndex(pp => pp.id === winnerId)
        if (targetIdx < 0) targetIdx = 0
      }

      // Vignette
      const vig = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(W, H) * 0.4)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(4,2,14,0.7)')
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H)

      // Name
      const nameS = locked ? 24 : 18
      ctx.save()
      ctx.font = `700 ${Math.round(nameS * S)}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillStyle = locked ? accent : '#FFFFFF'
      if (locked) { ctx.shadowColor = accent; ctx.shadowBlur = 14 * S }

      // Glitch scan
      if (!locked && Math.random() > 0.8) {
        ctx.fillStyle = _alpha(impact, 0.5)
        ctx.fillText(names[targetIdx], cx + (Math.random() - 0.5) * 5 * S, cy + 60 * S + (Math.random() - 0.5) * 3 * S)
      }
      ctx.fillText(names[targetIdx], cx, cy + 60 * S)
      ctx.shadowBlur = 0; ctx.restore()

      if (flashA > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H)
        flashA *= 0.86
      }

      if (p > 0.78) {
        const rp = Math.min((p - 0.78) / 0.15, 1)
        ctx.save(); ctx.globalAlpha = rp
        ctx.font = `900 ${Math.round(26 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 20 * S
        ctx.fillText(winnerName, cx, H * 0.1)
        ctx.shadowBlur = 0; ctx.restore()
      }

      if (p > 0.93) { ctx.fillStyle = `rgba(4,2,14,${(p - 0.93) / 0.07})`; ctx.fillRect(0, 0, W, H) }
      t += 16; if (t < DUR + 200) requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw); setTimeout(resolve, DUR + 100)
  })
}
