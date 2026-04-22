import { useEffect, useRef, useCallback } from 'react'
import { getAvatarColors } from '../utils/avatar'
import { useSplitStore } from '../store/useSplitStore'
import { playWinnerFanfare } from '../utils/audio'
import { spawnConfetti } from '../utils/particles'

interface Props {
  visible: boolean
  participants: Array<{ id: string; name: string; active: boolean }>
  winnerId: string | null
  onComplete: () => void
}

const PALETTE_HUES = [120, 150, 80, 55, 30, 0, 330, 300, 270, 240, 200, 170]

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export default function RouletteOverlay({ visible, participants, winnerId, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)

  const active = participants.filter(p => p.active)
  const N = active.length
  const winnerIdx = active.findIndex(p => p.id === winnerId)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || N < 2 || winnerIdx === -1) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefs = useSplitStore.getState().prefs
    const speedMult = (prefs.speed || 100) / 100
    const DURATION = Math.round(2800 / speedMult)
    const EXTRA_SPINS = 4
    const sliceAngle = (Math.PI * 2) / N
    const targetAngle = -winnerIdx * sliceAngle - sliceAngle / 2
    const totalRotation = targetAngle - EXTRA_SPINS * Math.PI * 2

    const DPR = Math.min(window.devicePixelRatio || 2, 2)
    const rect = canvas.getBoundingClientRect()
    const size = rect.width
    canvas.width = size * DPR
    canvas.height = size * DPR
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

    const cx = size / 2
    const cy = size / 2
    const R = size / 2 - 6
    const Ri = R * 0.13

    const sectorColors = active.map((_, i) => {
      const hue = PALETTE_HUES[i % PALETTE_HUES.length]
      return {
        light: `hsl(${hue}, 95%, 62%)`,
        mid:   `hsl(${hue}, 85%, 42%)`,
        dark:  `hsl(${hue}, 80%, 28%)`,
        glow:  `hsla(${hue}, 95%, 65%, 0.9)`,
      }
    })

    function drawWheel(angle: number) {
      ctx!.clearRect(0, 0, size, size)

      active.forEach((p, i) => {
        const startA = angle + i * sliceAngle
        const endA = angle + (i + 1) * sliceAngle
        const colors = sectorColors[i]

        ctx!.beginPath()
        ctx!.moveTo(cx, cy)
        ctx!.arc(cx, cy, R, startA, endA)
        ctx!.closePath()
        ctx!.fillStyle = colors.mid
        ctx!.fill()

        const grad = ctx!.createRadialGradient(cx, cy, Ri, cx, cy, R)
        grad.addColorStop(0, colors.light + '40')
        grad.addColorStop(0.7, colors.mid + '20')
        grad.addColorStop(1, colors.dark + '60')
        ctx!.fillStyle = grad
        ctx!.fill()

        ctx!.strokeStyle = colors.dark
        ctx!.lineWidth = 1.5
        ctx!.stroke()

        // Text
        const midA = startA + sliceAngle / 2
        const textR = R * 0.65
        const tx = cx + Math.cos(midA) * textR
        const ty = cy + Math.sin(midA) * textR

        ctx!.save()
        ctx!.translate(tx, ty)
        ctx!.rotate(midA + Math.PI / 2)
        ctx!.fillStyle = '#fff'
        ctx!.font = `bold ${Math.round(Math.max(10, size * 0.028))}px sans-serif`
        ctx!.textAlign = 'center'
        ctx!.textBaseline = 'middle'
        ctx!.shadowColor = 'rgba(0,0,0,0.7)'
        ctx!.shadowBlur = 3
        const name = p.name.length > 8 ? p.name.slice(0, 7) + '...' : p.name
        ctx!.fillText(name, 0, 0)
        ctx!.restore()
      })

      // Center
      const centerGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Ri)
      centerGrad.addColorStop(0, '#2a2a3a')
      centerGrad.addColorStop(0.7, '#1a1a2a')
      centerGrad.addColorStop(1, '#0a0a1a')
      ctx!.beginPath()
      ctx!.arc(cx, cy, Ri, 0, Math.PI * 2)
      ctx!.fillStyle = centerGrad
      ctx!.fill()
      ctx!.strokeStyle = '#444'
      ctx!.lineWidth = 2
      ctx!.stroke()

      // Pointer
      const ps = R * 0.08
      ctx!.beginPath()
      ctx!.moveTo(cx, cy - R - 3)
      ctx!.lineTo(cx - ps, cy - R + ps)
      ctx!.lineTo(cx + ps, cy - R + ps)
      ctx!.closePath()
      ctx!.fillStyle = '#ff4444'
      ctx!.fill()
      ctx!.strokeStyle = '#aa0000'
      ctx!.lineWidth = 2
      ctx!.stroke()
    }

    function tick(timestamp: number) {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)

      if (progress < 1) {
        const eased = easeOutCubic(progress)
        drawWheel(totalRotation * eased)

        const speed = 1 - eased
        if (prefs.vibration && 'vibrate' in navigator && speed > 0.1) {
          navigator.vibrate(speed > 0.5 ? 5 : speed > 0.2 ? 8 : 15)
        }

        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Final frame
        drawWheel(targetAngle)

        if (prefs.sound) playWinnerFanfare()
        if (prefs.vibration && 'vibrate' in navigator) navigator.vibrate([40, 20, 80])
        if (prefs.particles) spawnConfetti()

        setTimeout(onComplete, 1100)
      }
    }

    startTimeRef.current = null
    rafRef.current = requestAnimationFrame(tick)
  }, [N, winnerIdx, active, onComplete])

  useEffect(() => {
    if (visible && N >= 2 && winnerIdx >= 0) {
      draw()
    }
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [visible, draw, N, winnerIdx])

  if (!visible || N < 2 || winnerIdx === -1) return null

  const winnerColors = getAvatarColors(active[winnerIdx].name)

  return (
    <div
      className="roulette-overlay"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${Math.min(window.innerWidth * 0.86, 360)}px`,
          height: `${Math.min(window.innerWidth * 0.86, 360)}px`,
        }}
      />
      <div
        className="roulette-label"
        style={{
          color: winnerColors.color,
          textShadow: `0 0 20px ${winnerColors.color}88`,
        }}
      />
    </div>
  )
}
