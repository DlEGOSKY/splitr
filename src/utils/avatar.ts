const PALETTES = [
  { color: '#7B2FBE', gradient: 'linear-gradient(135deg, #7B2FBE, #9B59B6)' },
  { color: '#00F5FF', gradient: 'linear-gradient(135deg, #00B4D8, #00F5FF)' },
  { color: '#FF006E', gradient: 'linear-gradient(135deg, #FF006E, #FF4488)' },
  { color: '#39FF14', gradient: 'linear-gradient(135deg, #00AA00, #39FF14)' },
  { color: '#FFD700', gradient: 'linear-gradient(135deg, #CC8800, #FFD700)' },
  { color: '#FF4500', gradient: 'linear-gradient(135deg, #CC3700, #FF4500)' },
  { color: '#1E90FF', gradient: 'linear-gradient(135deg, #1565C0, #1E90FF)' },
  { color: '#FF69B4', gradient: 'linear-gradient(135deg, #C94080, #FF69B4)' },
  { color: '#00CED1', gradient: 'linear-gradient(135deg, #008B8B, #00CED1)' },
  { color: '#FF8C00', gradient: 'linear-gradient(135deg, #CC6600, #FF8C00)' },
]

// Progressive color system - creates smooth transitions between participants
const PROGRESSIVE_COLORS = [
  { color: '#39FF14', gradient: 'linear-gradient(135deg, #00AA00, #39FF14)' }, // Green
  { color: '#7FFF00', gradient: 'linear-gradient(135deg, #66CC00, #7FFF00)' }, // Lime
  { color: '#FFD700', gradient: 'linear-gradient(135deg, #CC8800, #FFD700)' }, // Gold
  { color: '#FF8C00', gradient: 'linear-gradient(135deg, #CC6600, #FF8C00)' }, // Orange
  { color: '#FF4500', gradient: 'linear-gradient(135deg, #CC3700, #FF4500)' }, // Red-Orange
  { color: '#FF006E', gradient: 'linear-gradient(135deg, #CC0055, #FF006E)' }, // Pink
  { color: '#7B2FBE', gradient: 'linear-gradient(135deg, #5A1F8B, #7B2FBE)' }, // Purple
  { color: '#1E90FF', gradient: 'linear-gradient(135deg, #1565C0, #1E90FF)' }, // Blue
  { color: '#00F5FF', gradient: 'linear-gradient(135deg, #00B4D8, #00F5FF)' }, // Cyan
  { color: '#00CED1', gradient: 'linear-gradient(135deg, #008B8B, #00CED1)' }, // Turquoise
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function getAvatarColors(name: string, index?: number, totalCount?: number) {
  // If we have index and total count, use progressive colors
  if (typeof index === 'number' && typeof totalCount === 'number' && totalCount > 1) {
    const colorIndex = Math.floor((index / Math.max(totalCount - 1, 1)) * (PROGRESSIVE_COLORS.length - 1))
    return PROGRESSIVE_COLORS[Math.min(colorIndex, PROGRESSIVE_COLORS.length - 1)]
  }
  
  // Fallback to hash-based colors
  const idx = hashName(name) % PALETTES.length
  return PALETTES[idx]
}

export function getInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

// ── HSL-based color system (for canvas drawing, share cards, etc.) ──

export interface AvatarColorsByName {
  hue: number
  gradient: string
  color: string
  glow: string
  rgb: string
}

function hslToRgbString(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`
}

export function getAvatarColorsByName(name: string): AvatarColorsByName {
  const hash = hashName(name || 'X')
  const hue = hash % 360
  const hue2 = (hue + 40) % 360
  return {
    hue,
    gradient: `linear-gradient(135deg, hsl(${hue},75%,38%) 0%, hsl(${hue2},80%,55%) 100%)`,
    color: `hsl(${hue},75%,55%)`,
    glow: `hsla(${hue},80%,55%,0.45)`,
    rgb: hslToRgbString(hue, 75, 55),
  }
}
