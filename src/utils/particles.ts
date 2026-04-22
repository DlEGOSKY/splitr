interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  rotation: number
  rotSpeed: number
}

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let raf = 0

const COLORS = [
  '#FF006E', '#00F0FF', '#FFD700', '#FF4444', '#00FF88',
  '#FF00FF', '#FFFFFF', '#FF8800', '#44FFAA', '#8844FF'
]

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.id = 'particles-canvas'
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:150;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx = canvas.getContext('2d')
  document.body.appendChild(canvas)

  window.addEventListener('resize', () => {
    if (canvas) {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
  })
}

function loop() {
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  particles = particles.filter(p => p.life > 0)

  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.15 // gravity
    p.life--
    p.rotation += p.rotSpeed

    const alpha = p.life / p.maxLife
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.fillStyle = p.color
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
    ctx.restore()
  }

  if (particles.length > 0) {
    raf = requestAnimationFrame(loop)
  } else {
    // Clean up canvas when done
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas)
      canvas = null
      ctx = null
    }
  }
}

export function spawnConfetti(cx?: number, cy?: number, count = 60) {
  ensureCanvas()

  const x = cx ?? window.innerWidth / 2
  const y = cy ?? window.innerHeight / 3

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 3 + Math.random() * 6
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      life: 60 + Math.random() * 40,
      maxLife: 100,
      size: 4 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    })
  }

  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(loop)
}

/**
 * Burst pequeño de partículas con paleta custom, sesgado hacia arriba.
 * Usado por las reactions post-resultado. Intencionalmente corto y ligero
 * para permitir múltiples reactions rápidas sin saturar el canvas.
 */
export function spawnReaction(cx: number, cy: number, palette: string[], count = 18) {
  ensureCanvas()

  for (let i = 0; i < count; i++) {
    // Ángulo sesgado hacia arriba (-PI a 0, con spread lateral)
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.85
    const speed = 3 + Math.random() * 4
    particles.push({
      x: cx + (Math.random() - 0.5) * 10,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 2 + Math.random() * 3,
      color: palette[Math.floor(Math.random() * palette.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    })
  }

  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(loop)
}

export function spawnSparks(cx: number, cy: number, count = 20) {
  ensureCanvas()

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 4
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 15 + Math.random() * 15,
      maxLife: 30,
      size: 2 + Math.random() * 2,
      color: COLORS[Math.floor(Math.random() * 3)],
      rotation: 0,
      rotSpeed: 0,
    })
  }

  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(loop)
}
