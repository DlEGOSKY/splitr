/**
 * Generador de imagen compartible del resultado.
 * Dibuja un poster 1080x1080 (ideal IG/WhatsApp) con identidad Splitr.
 *
 * - Cero dependencias externas (Canvas API nativa)
 * - Usa Web Share API cuando está disponible (móvil)
 * - Fallback: descarga directa + copy to clipboard como imagen
 */
import { getAvatarColorsByName, getInitials } from './avatar'

export interface PosterOptions {
  winnerName: string
  question: string
  teammates?: string[]
  theme?: {
    accent: string
    primary: string
  }
}

const SIZE = 1080
const PADDING = 72

/** Dibuja el poster completo en un canvas y devuelve una Promise<Blob> PNG */
export async function generateResultPoster(opts: PosterOptions): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  const accent = opts.theme?.accent || '#00f5ff'
  const primary = opts.theme?.primary || '#7b2fbe'

  // ── Fondo: gradient cyberpunk diagonal ─────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE)
  bgGrad.addColorStop(0, '#04020e')
  bgGrad.addColorStop(0.5, '#0a0820')
  bgGrad.addColorStop(1, '#120630')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, SIZE, SIZE)

  // ── Noise sutil ────────────────────────────────────────────────────────
  const noiseCount = 280
  for (let i = 0; i < noiseCount; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 1, 1)
  }

  // ── Glow radial detrás del avatar ──────────────────────────────────────
  const cx = SIZE / 2
  const avatarCY = SIZE * 0.4
  const glow = ctx.createRadialGradient(cx, avatarCY, 20, cx, avatarCY, 380)
  glow.addColorStop(0, hexToRgba(accent, 0.35))
  glow.addColorStop(0.5, hexToRgba(primary, 0.15))
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, avatarCY, 380, 0, Math.PI * 2)
  ctx.fill()

  // ── Header: SPLITR logo text ───────────────────────────────────────────
  ctx.fillStyle = hexToRgba(accent, 0.85)
  ctx.font = 'bold 40px "Space Grotesk", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = hexToRgba(accent, 0.6)
  ctx.shadowBlur = 20
  ctx.fillText('SPLITR', cx, PADDING)
  ctx.shadowBlur = 0

  // Separador bajo el logo
  ctx.strokeStyle = hexToRgba(accent, 0.35)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 50, PADDING + 62)
  ctx.lineTo(cx + 50, PADDING + 62)
  ctx.stroke()

  // ── Label superior ─────────────────────────────────────────────────────
  const hasTeam = opts.teammates && opts.teammates.length > 0
  const label = hasTeam ? 'EQUIPO GANADOR' : 'HA SIDO ELEGIDO'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = 'bold 22px "Space Grotesk", system-ui, sans-serif'
  // letterSpacing no es universal en Canvas2D; usamos el nombre espaciado manualmente
  ctx.fillText(label.split('').join(' '), cx, PADDING + 100)

  // ── Avatar circular con iniciales ──────────────────────────────────────
  const colors = getAvatarColorsByName(opts.winnerName)
  const initials = getInitials(opts.winnerName)
  const avatarR = 140

  // Avatar gradient fill — construimos HSL stops desde el hue del nombre
  const avGrad = ctx.createLinearGradient(
    cx - avatarR, avatarCY - avatarR,
    cx + avatarR, avatarCY + avatarR
  )
  const hue2 = (colors.hue + 40) % 360
  avGrad.addColorStop(0, `hsl(${colors.hue}, 75%, 55%)`)
  avGrad.addColorStop(1, `hsl(${hue2}, 85%, 45%)`)
  ctx.fillStyle = avGrad
  ctx.beginPath()
  ctx.arc(cx, avatarCY, avatarR, 0, Math.PI * 2)
  ctx.fill()

  // Avatar borde neón
  ctx.strokeStyle = hexToRgba('#ffffff', 0.3)
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(cx, avatarCY, avatarR, 0, Math.PI * 2)
  ctx.stroke()

  // Iniciales centradas
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 120px "Space Grotesk", system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 10
  ctx.fillText(initials, cx, avatarCY)
  ctx.shadowBlur = 0

  // ── Nombre gigante del ganador ─────────────────────────────────────────
  const nameY = avatarCY + avatarR + 80
  const nameSize = fitFontSize(ctx, opts.winnerName, SIZE - PADDING * 2, 130, 60)
  ctx.font = `900 ${nameSize}px "Space Grotesk", system-ui, sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'top'
  ctx.shadowColor = hexToRgba(accent, 0.6)
  ctx.shadowBlur = 28
  ctx.fillText(opts.winnerName.toUpperCase(), cx, nameY)
  ctx.shadowBlur = 0

  // ── Teammates chips (si aplica) ────────────────────────────────────────
  let teammatesBottom = nameY + nameSize
  if (hasTeam) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = 'italic 24px "Space Grotesk", system-ui, sans-serif'
    ctx.fillText('junto a ' + opts.teammates!.slice(0, 4).join(' · '), cx, teammatesBottom + 30)
    teammatesBottom += 70
  }

  // ── Pregunta en la parte inferior ──────────────────────────────────────
  if (opts.question) {
    const qText = `"${opts.question}"`
    const qSize = fitFontSize(ctx, qText, SIZE - PADDING * 2, 40, 22)
    ctx.font = `italic ${qSize}px "Space Grotesk", system-ui, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(qText, cx, SIZE - PADDING - 100)
  }

  // ── Watermark/URL ──────────────────────────────────────────────────────
  ctx.fillStyle = hexToRgba(accent, 0.5)
  ctx.font = 'bold 20px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText('splitr.app', cx, SIZE - PADDING - 30)

  // ── Esquinas decorativas tipo HUD ──────────────────────────────────────
  drawCornerBracket(ctx, PADDING - 10, PADDING - 10, 40, accent)
  drawCornerBracket(ctx, SIZE - PADDING + 10, PADDING - 10, 40, accent, 'tr')
  drawCornerBracket(ctx, PADDING - 10, SIZE - PADDING + 10, 40, accent, 'bl')
  drawCornerBracket(ctx, SIZE - PADDING + 10, SIZE - PADDING + 10, 40, accent, 'br')

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas toBlob failed'))
    }, 'image/png', 0.95)
  })
}

/** Comparte el poster usando Web Share API (móvil) o descarga como fallback */
export async function shareResultImage(opts: PosterOptions): Promise<'shared' | 'downloaded'> {
  const blob = await generateResultPoster(opts)
  const fileName = `splitr-${sanitize(opts.winnerName)}.png`
  const file = new File([blob], fileName, { type: 'image/png' })

  // Intentar Web Share API con archivos (móvil)
  if (
    typeof navigator !== 'undefined' &&
    'share' in navigator &&
    'canShare' in navigator &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: 'Splitr',
        text: `${opts.winnerName} ha sido elegido${opts.question ? `: ${opts.question}` : ''}`,
      })
      return 'shared'
    } catch (err) {
      // Usuario canceló o no soportado — caer a descarga
      if ((err as Error)?.name === 'AbortError') return 'shared'
    }
  }

  // Fallback: descargar
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

// ── Helpers ──────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number
): number {
  let size = startSize
  while (size > minSize) {
    ctx.font = `900 ${size}px "Space Grotesk", system-ui, sans-serif`
    const m = ctx.measureText(text)
    if (m.width <= maxWidth) return size
    size -= 4
  }
  return minSize
}

function drawCornerBracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  corner: 'tl' | 'tr' | 'bl' | 'br' = 'tl'
) {
  ctx.strokeStyle = hexToRgba(color, 0.55)
  ctx.lineWidth = 3
  ctx.beginPath()
  switch (corner) {
    case 'tl':
      ctx.moveTo(x, y + size)
      ctx.lineTo(x, y)
      ctx.lineTo(x + size, y)
      break
    case 'tr':
      ctx.moveTo(x - size, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + size)
      break
    case 'bl':
      ctx.moveTo(x, y - size)
      ctx.lineTo(x, y)
      ctx.lineTo(x + size, y)
      break
    case 'br':
      ctx.moveTo(x, y - size)
      ctx.lineTo(x, y)
      ctx.lineTo(x - size, y)
      break
  }
  ctx.stroke()
}

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ganador'
}
