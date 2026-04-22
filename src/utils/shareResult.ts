import { getAvatarColorsByName, getInitials } from './avatar'
import { showToast } from '../components/Toast'

// ══════════════════════════════════════════════════════════
// SHARE RESULT — Canvas → PNG card generator
// ══════════════════════════════════════════════════════════

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

async function loadFont(name: string, url: string, opts: FontFaceDescriptors = {}): Promise<void> {
  if (document.fonts.check(`12px "${name}"`)) return
  try {
    const f = new FontFace(name, url, opts)
    await f.load()
    document.fonts.add(f)
  } catch { /* silencioso — fallback al sistema */ }
}

export async function shareResult(winnerName: string, question: string): Promise<void> {
  const colors = getAvatarColorsByName(winnerName)
  const initials = getInitials(winnerName)

  showToast('Generando imagen...')

  // ── Load fonts ──
  const BEBAS_URL = 'url(https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.woff2)'
  const JAKARTA_URL = 'url(https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4Ko20yygg_o.woff2)'

  await Promise.allSettled([
    loadFont('Bebas Neue', BEBAS_URL),
    loadFont('Plus Jakarta Sans', JAKARTA_URL, { weight: '600' }),
  ])
  try { await document.fonts.ready } catch { /* continue */ }

  // ── Dimensions (Instagram Story ratio) ──
  const W = 400, H = 600
  const DPR = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * DPR
  canvas.height = H * DPR
  const ctx = canvas.getContext('2d')!
  ctx.scale(DPR, DPR)

  const hue = colors.hue
  const hue2 = (hue + 40) % 360

  // ══ BACKGROUND ══
  ctx.fillStyle = '#07070f'
  ctx.fillRect(0, 0, W, H)

  const bgGrad = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, W * 1.1)
  bgGrad.addColorStop(0, `hsla(${hue}, 70%, 20%, 0.9)`)
  bgGrad.addColorStop(0.5, `hsla(${hue}, 60%, 12%, 0.6)`)
  bgGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  const bgGrad2 = ctx.createLinearGradient(0, H * 0.6, 0, H)
  bgGrad2.addColorStop(0, 'transparent')
  bgGrad2.addColorStop(1, `hsla(${hue2}, 50%, 8%, 0.8)`)
  ctx.fillStyle = bgGrad2
  ctx.fillRect(0, 0, W, H)

  // ══ LIGHT RAYS ══
  ctx.save()
  ctx.globalAlpha = 0.12
  for (let i = -2; i <= 2; i++) {
    const rayX = W / 2 + i * 60
    const rayGrad = ctx.createLinearGradient(rayX, 0, W / 2, H * 0.55)
    rayGrad.addColorStop(0, `hsl(${hue}, 90%, 80%)`)
    rayGrad.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.moveTo(rayX - 15, 0)
    ctx.lineTo(rayX + 15, 0)
    ctx.lineTo(W / 2 + 30, H * 0.55)
    ctx.lineTo(W / 2 - 30, H * 0.55)
    ctx.fillStyle = rayGrad
    ctx.fill()
  }
  ctx.restore()

  // ══ AVATAR ══
  const cx = W / 2
  const cy = H * 0.32
  const r = 76

  // Glow rings
  for (let i = 3; i >= 1; i--) {
    ctx.save()
    ctx.shadowColor = colors.color
    ctx.shadowBlur = 15 * i
    ctx.beginPath()
    ctx.arc(cx, cy, r + i * 5, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.15 * i})`
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }

  // Solid ring
  ctx.save()
  ctx.shadowColor = colors.color
  ctx.shadowBlur = 25
  ctx.beginPath()
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2)
  ctx.strokeStyle = colors.color
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()

  // Avatar fill
  const avatarGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  avatarGrad.addColorStop(0, `hsl(${hue}, 90%, 32%)`)
  avatarGrad.addColorStop(1, `hsl(${hue2}, 95%, 56%)`)
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = avatarGrad
  ctx.fill()

  // Internal highlight
  const highlight = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx, cy, r)
  highlight.addColorStop(0, 'rgba(255,255,255,0.35)')
  highlight.addColorStop(0.5, 'rgba(255,255,255,0.05)')
  highlight.addColorStop(1, 'rgba(0,0,0,0.2)')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = highlight
  ctx.fill()

  // Initials
  const initFontSize = initials.length > 2 ? r * 0.58 : r * 0.68
  ctx.fillStyle = 'white'
  ctx.font = `${initFontSize}px 'Bebas Neue', Impact, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 6
  ctx.fillText(initials, cx, cy + initFontSize * 0.05)
  ctx.shadowBlur = 0

  // ══ LABEL ══
  ctx.fillStyle = `hsla(${hue}, 60%, 75%, 0.7)`
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('EL ELEGIDO ES', W / 2, H * 0.565)

  // ══ NAME ══
  const maxW = W * 0.88
  const name = winnerName.toUpperCase()
  let fontSize = 68
  ctx.font = `${fontSize}px 'Bebas Neue', Impact, sans-serif`
  while (ctx.measureText(name).width > maxW && fontSize > 28) {
    fontSize -= 2
    ctx.font = `${fontSize}px 'Bebas Neue', Impact, sans-serif`
  }

  ctx.save()
  ctx.shadowColor = colors.color
  ctx.shadowBlur = 22
  ctx.fillStyle = colors.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(name, W / 2, H * 0.672)
  ctx.shadowBlur = 10
  ctx.fillStyle = 'white'
  ctx.globalAlpha = 0.15
  ctx.fillText(name, W / 2 + 1, H * 0.672 + 1)
  ctx.restore()

  // ══ SEPARATOR ══
  const sepY = H * 0.71
  const sepGrad = ctx.createLinearGradient(W * 0.15, sepY, W * 0.85, sepY)
  sepGrad.addColorStop(0, 'transparent')
  sepGrad.addColorStop(0.3, `hsla(${hue}, 80%, 65%, 0.6)`)
  sepGrad.addColorStop(0.7, `hsla(${hue}, 80%, 65%, 0.6)`)
  sepGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = sepGrad
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W * 0.15, sepY)
  ctx.lineTo(W * 0.85, sepY)
  ctx.stroke()

  // ══ QUESTION ══
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = 'italic 600 14px "Plus Jakarta Sans", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const qMaxW = W * 0.78
  const qLines = wrapText(ctx, question, qMaxW)
  qLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, H * 0.758 + i * 20)
  })

  // ══ BRANDING ══
  ctx.save()
  ctx.setLineDash([3, 6])
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W * 0.1, H * 0.9)
  ctx.lineTo(W * 0.9, H * 0.9)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = `hsla(${hue}, 70%, 70%, 0.5)`
  ctx.font = "bold 18px 'Bebas Neue', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('SPLITR', W / 2, H * 0.955)

  // ══ DECORATIVE BORDER ══
  const border = ctx.createLinearGradient(0, 0, W, H)
  border.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.5)`)
  border.addColorStop(0.5, `hsla(${hue2}, 80%, 65%, 0.2)`)
  border.addColorStop(1, `hsla(${hue}, 80%, 65%, 0.5)`)
  ctx.strokeStyle = border
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(1, 1, W - 2, H - 2, 20)
  ctx.stroke()

  // ══ SHARE / DOWNLOAD ══
  canvas.toBlob(async (blob) => {
    if (!blob) { showToast('Error al generar la imagen'); return }
    const file = new File([blob], 'splitr-resultado.png', { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${winnerName} tiene que pagar`,
          text: `${question} → ${winnerName} · via Splitr`,
        })
        return
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return
      }
    }
    // Fallback: download PNG
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: 'splitr-resultado.png' })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
    showToast('Imagen descargada')
  }, 'image/png', 0.95)
}
