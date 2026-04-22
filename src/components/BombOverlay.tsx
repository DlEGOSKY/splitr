import { useEffect, useRef } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import { playWinnerFanfare } from '../utils/audio'
import { getAvatarColorsByName, getInitials } from '../utils/avatar'
import type { Participant } from '../types'

interface Props {
  visible: boolean
  participants: Participant[]
  onComplete: (winnerId: string) => void
}

interface Spark {
  x: number; y: number; vx: number; vy: number
  alpha: number; size: number; color: string
}

export default function BombOverlay({ visible, participants, onComplete }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!visible) return

    const active = participants.filter(p => p.active)
    if (active.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const prefs = useSplitStore.getState().prefs

    const W = Math.min(window.innerWidth, 480)
    const H = Math.min(window.innerHeight, 680)
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * DPR
    canvas.height = H * DPR
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')!
    ctx.scale(DPR, DPR)

    const S = Math.min(W, H) / 480
    const st = getComputedStyle(document.documentElement)
    const impact = st.getPropertyValue('--color-impact').trim() || '#FF006E'
    const orange = '#FF6B00'

    const FUSE_DUR = 4000 + Math.random() * 3000
    const TOTAL = FUSE_DUR + 2000
    const winner = active[Math.floor(Math.random() * active.length)]
    const n = active.length
    const sparks: Spark[] = []
    let exploded = false
    let t = 0
    let lastVibrate = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = Math.min(t / FUSE_DUR, 1)
      const cx = W / 2, cy = H * 0.42

      // Current holder
      const urgency = Math.pow(p, 2)
      const passMs = Math.max(80, 320 - urgency * 240)
      const holderIdx = Math.floor(t / passMs) % n
      const holder = active[holderIdx]
      const hc = getAvatarColorsByName(holder.name)

      if (!exploded) {
        // Pulsing red background
        if (p > 0.7) {
          const hp = (p - 0.7) / 0.3
          const pulse = Math.abs(Math.sin(t * 0.02 * (1 + hp * 3)))
          ctx.fillStyle = `rgba(80,0,0,${hp * pulse * 0.18})`
          ctx.fillRect(0, 0, W, H)
        }

        // Holder avatar
        const avatarPulse = p > 0.6 ? 1 + Math.abs(Math.sin(t * 0.03 * (1 + (p - 0.6) * 4))) * 0.08 : 1
        const avR = 34 * S * avatarPulse
        ctx.beginPath(); ctx.arc(cx, cy - 72 * S, avR * 1.25, 0, Math.PI * 2)
        ctx.fillStyle = hc.color + '22'; ctx.fill()
        ctx.beginPath(); ctx.arc(cx, cy - 72 * S, avR, 0, Math.PI * 2)
        ctx.fillStyle = hc.color; ctx.fill()
        ctx.font = `bold ${Math.round(14 * S)}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = '#fff'; ctx.fillText(getInitials(holder.name), cx, cy - 72 * S)
        ctx.textBaseline = 'alphabetic'
        ctx.font = `bold ${Math.round(15 * S * avatarPulse)}px sans-serif`
        ctx.fillStyle = hc.color
        ctx.fillText(holder.name.toUpperCase(), cx, cy - 26 * S)

        // Bomb body
        const bombWobble = p > 0.5 ? Math.sin(t * 0.15 * (1 + (p - 0.5) * 3)) * 5 * S * (p - 0.5) * 2 : 0
        const bx = cx + bombWobble, by = cy + 30 * S, br = 32 * S

        // Shadow
        ctx.save(); ctx.globalAlpha = 0.3
        ctx.beginPath(); ctx.ellipse(bx, by + br + 4 * S, br * 0.85, br * 0.2, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#000'; ctx.fill(); ctx.restore()

        // Body
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fillStyle = '#111'; ctx.fill()
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2 * S; ctx.stroke()

        // Highlight
        ctx.beginPath(); ctx.arc(bx - br * 0.28, by - br * 0.3, br * 0.38, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill()

        // Texture
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1 * S
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 4
          ctx.beginPath(); ctx.arc(bx, by, br * 0.75, a, a + 0.4); ctx.stroke()
        }

        // Fuse
        const fuseMaxLen = 45 * S, fuseLen = fuseMaxLen * (1 - p) + 3 * S
        const fuseBaseX = bx + br * 0.55, fuseBaseY = by - br * 0.6
        const fuseEndX = fuseBaseX + Math.sin(t * 0.08) * 4 * S
        const fuseEndY = fuseBaseY - fuseLen

        ctx.strokeStyle = '#7a4a15'; ctx.lineWidth = 2.5 * S; ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(fuseBaseX, fuseBaseY)
        ctx.quadraticCurveTo(fuseBaseX + 12 * S + Math.sin(t * 0.06) * 6 * S, fuseBaseY - fuseLen * 0.5, fuseEndX, fuseEndY)
        ctx.stroke()

        // Fuse sparks
        if (fuseLen > 3 * S) {
          const sparkCount = Math.ceil(2 + p * 4)
          for (let i = 0; i < sparkCount; i++) {
            const a = Math.random() * Math.PI * 2, r2 = (2 + Math.random() * 6) * S
            ctx.beginPath(); ctx.arc(fuseEndX + Math.cos(a) * r2, fuseEndY + Math.sin(a) * r2, (1 + Math.random() * 2) * S, 0, Math.PI * 2)
            ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FF8800'; ctx.globalAlpha = Math.random() * 0.9 + 0.1; ctx.fill()
          }
          ctx.globalAlpha = 1
          ctx.beginPath(); ctx.arc(fuseEndX, fuseEndY, 3 * S, 0, Math.PI * 2)
          ctx.fillStyle = '#FFF'; ctx.fill()
        }

        // Progress bar
        const barW = 200 * S, barH = 12 * S, bx2 = cx - barW / 2, bY = cy + 80 * S
        ctx.fillStyle = 'rgba(255,255,255,0.07)'
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(bx2, bY, barW, barH, barH / 2); else ctx.rect(bx2, bY, barW, barH)
        ctx.fill()

        const fuseColor = p < 0.4 ? '#39FF14'
          : p < 0.68 ? `rgb(${Math.round(57 + p * 250)},${Math.round(255 - p * 220)},20)`
          : `rgb(255,${Math.round(20 * (1 - p) * 3)},20)`
        const fuseW = barW * (1 - p)
        if (fuseW > 0) {
          ctx.fillStyle = fuseColor
          ctx.beginPath()
          if (ctx.roundRect) ctx.roundRect(bx2, bY, fuseW, barH, barH / 2); else ctx.rect(bx2, bY, fuseW, barH)
          ctx.fill()
          if (p > 0.65) {
            ctx.shadowColor = fuseColor; ctx.shadowBlur = 8
            ctx.fillStyle = fuseColor
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(bx2, bY, fuseW, barH, barH / 2); else ctx.rect(bx2, bY, fuseW, barH)
            ctx.fill(); ctx.shadowBlur = 0
          }
        }
        ctx.font = `${Math.round(10 * S)}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('MECHA', cx, bY + 24 * S)

        // Countdown text
        if (p > 0.75) {
          const sec = Math.ceil((1 - p) * FUSE_DUR / 1000)
          const cp = (p - 0.75) / 0.25, cpPulse = Math.abs(Math.sin(t * 0.04 * (1 + cp * 4)))
          ctx.font = `bold ${Math.round((20 + cp * 20) * S * cpPulse)}px sans-serif`
          ctx.textAlign = 'center'; ctx.fillStyle = impact; ctx.globalAlpha = Math.min(cp * 3, 1) * cpPulse
          ctx.fillText(sec > 0 ? sec + '…' : '¡BOOM!', cx, cy - 110 * S)
          ctx.globalAlpha = 1
        }

        // Escalating vibration
        if (p > 0.5 && prefs.vibration && 'vibrate' in navigator) {
          const vibInt = Math.round(600 - p * 520)
          if (t - lastVibrate > vibInt) { lastVibrate = t; navigator.vibrate(p > 0.82 ? 50 : 25) }
        }

      } else {
        // Post-explosion
        const ep = Math.min((t - FUSE_DUR) / 500, 1)

        // Flash
        if (ep < 0.4) {
          const fb = ep < 0.2 ? ep / 0.2 : (0.4 - ep) / 0.2
          ctx.beginPath(); ctx.arc(cx, cy + 30 * S, 100 * S * fb, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,120,0,${fb * 0.6})`; ctx.fill()
          ctx.fillStyle = `rgba(255,255,200,${fb * 0.35})`; ctx.fillRect(0, 0, W, H)
        }

        // Sparks
        sparks.forEach(s => {
          s.x += s.vx; s.y += s.vy; s.vy += 0.14 * S; s.vx *= 0.97; s.alpha -= 0.02
          if (s.alpha <= 0) return
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.alpha, 0, Math.PI * 2)
          ctx.fillStyle = s.color; ctx.globalAlpha = s.alpha; ctx.fill()
        })
        ctx.globalAlpha = 1

        // Winner reveal
        if (ep > 0.3) {
          const rp = Math.min((ep - 0.3) / 0.4, 1), pulse = 0.85 + 0.15 * Math.sin(t * 0.03)
          const wc = getAvatarColorsByName(winner.name)
          const avR = 38 * S * rp * pulse

          ctx.beginPath(); ctx.arc(cx, cy - 10 * S, avR * 1.3, 0, Math.PI * 2)
          ctx.fillStyle = wc.color + '22'; ctx.fill()
          ctx.beginPath(); ctx.arc(cx, cy - 10 * S, avR, 0, Math.PI * 2)
          ctx.fillStyle = wc.color; ctx.globalAlpha = rp; ctx.fill(); ctx.globalAlpha = 1

          ctx.font = `bold ${Math.round(14 * S * rp)}px sans-serif`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillStyle = '#fff'; ctx.globalAlpha = rp
          ctx.fillText(getInitials(winner.name), cx, cy - 10 * S); ctx.textBaseline = 'alphabetic'

          ctx.font = `bold ${Math.round(42 * S * rp * pulse)}px sans-serif`
          ctx.fillStyle = impact; ctx.fillText('BOOM!', cx, cy - 62 * S)

          ctx.font = `bold ${Math.round(24 * S * rp * pulse)}px sans-serif`
          ctx.fillStyle = wc.color
          ctx.fillText(winner.name.toUpperCase(), cx, cy + 44 * S)
          ctx.globalAlpha = 1
        }
      }

      // Trigger explosion
      if (p >= 1 && !exploded) {
        exploded = true
        for (let i = 0; i < 38; i++) {
          const a = Math.random() * Math.PI * 2, spd = (4 + Math.random() * 11) * S
          sparks.push({
            x: cx, y: cy + 30 * S,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 5 * S,
            alpha: 1, size: (2 + Math.random() * 5) * S,
            color: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? orange : impact,
          })
        }
        if (prefs.sound) playWinnerFanfare()
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([150, 60, 300, 60, 500])
      }

      t += 16
      if (t < TOTAL) {
        rafRef.current = requestAnimationFrame(draw)
      } else {
        // Animation complete — notify parent
        setTimeout(() => onComplete(winner.id), 280)
      }
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [visible, participants, onComplete])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      className="bomb-overlay"
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
