import { getPerformanceLevel } from '../performance'

/** Safely apply alpha to any color format (hex, hsl, rgb, named) */
export function _alpha(color: string, alpha: number): string {
  if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, `${alpha})`)
  if (color.startsWith('hsla')) return color.replace(/[\d.]+\)$/, `${alpha})`)
  if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`)
  if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `,${alpha})`)
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const r = parseInt(color[1]+color[1], 16)
    const g = parseInt(color[2]+color[2], 16)
    const b = parseInt(color[3]+color[3], 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  if (/^#[0-9a-f]{6,8}$/i.test(color)) {
    const r = parseInt(color.slice(1,3), 16)
    const g = parseInt(color.slice(3,5), 16)
    const b = parseInt(color.slice(5,7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return color
}

export function _isSlowDevice(): boolean {
  if (getPerformanceLevel() === 'reduced') return true
  const cores = navigator.hardwareConcurrency || 4
  return cores <= 6
}

export interface IntroBase {
  overlay: HTMLDivElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  W: number
  H: number
}

export function _introBase(dur: number): IntroBase {
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

export function _css(prop: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback
}

export interface Spark { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number }

export function _drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[], gravity: number) {
  sparks.forEach(s => {
    s.x += s.vx; s.y += s.vy; s.vy += gravity; s.alpha -= 0.028
    if (s.alpha <= 0) return
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.alpha, 0, Math.PI * 2)
    ctx.fillStyle = s.color; ctx.globalAlpha = s.alpha; ctx.fill()
  })
  ctx.globalAlpha = 1
}

export function _burst(sparks: Spark[], x: number, y: number, n: number, S: number, colors: string[]) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 2 / n * i + (Math.random() - 0.5) * 0.4
    const spd = (2 + Math.random() * 6) * S
    sparks.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, alpha: 1, color: colors[i % colors.length], size: (2 + Math.random() * 3) * S })
  }
}
