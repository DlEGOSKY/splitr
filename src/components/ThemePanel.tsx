import React from 'react'
import { useSplitStore } from '../store/useSplitStore'

const THEMES: { id: string; label: string; s1: string; s2: string; s3: string }[] = [
  // Primera fila - Cyberpunk y Pinks
  { id: 'cyberpunk',  label: 'Cyberpunk',  s1: '#7B2FBE', s2: '#00F5FF', s3: '#FF006E' },
  { id: 'neonpink',   label: 'Neon Pink',  s1: '#D500F9', s2: '#FF4081', s3: '#FF80AB' },
  { id: 'vaporwave',  label: 'Vaporwave',  s1: '#E040FB', s2: '#7C4DFF', s3: '#FF4081' },
  { id: 'candy',      label: 'Candy',      s1: '#AA00FF', s2: '#FF4081', s3: '#64FFDA' },
  { id: 'sakura',     label: 'Sakura',     s1: '#AD1457', s2: '#F48FB1', s3: '#FCE4EC' },
  
  // Segunda fila - Fuegos y Rojos
  { id: 'fire',       label: 'Fuego',      s1: '#FF4500', s2: '#FFB800', s3: '#FF1744' },
  { id: 'blood',      label: 'Blood Red',  s1: '#B71C1C', s2: '#FF1744', s3: '#D50000' },
  { id: 'lava',       label: 'Lava',       s1: '#BF360C', s2: '#FF3D00', s3: '#FF9100' },
  { id: 'sunset',     label: 'Atardecer',  s1: '#C2185B', s2: '#FF9800', s3: '#FF5722' },
  { id: 'goldrush',   label: 'Gold Rush',  s1: '#FF8F00', s2: '#FFD600', s3: '#FFC107' },
  
  // Tercera fila - Verdes
  { id: 'matrix',     label: 'Matrix',     s1: '#00AA00', s2: '#00FF41', s3: '#39FF14' },
  { id: 'toxic',      label: 'Toxic',      s1: '#76FF03', s2: '#00E676', s3: '#AEEA00' },
  { id: 'jungle',     label: 'Jungle',     s1: '#2E7D32', s2: '#66BB6A', s3: '#AED581' },
  { id: 'storm',      label: 'Storm',      s1: '#37474F', s2: '#546E7A', s3: '#00E5FF' },
  { id: 'ocean',      label: 'Océano',     s1: '#0077B6', s2: '#48CAE4', s3: '#00B4D8' },
  
  // Cuarta fila - Azules y Espaciales
  { id: 'deepspace',  label: 'Deep Space', s1: '#4A148C', s2: '#7C4DFF', s3: '#536DFE' },
  { id: 'midnight',   label: 'Midnight',   s1: '#1A237E', s2: '#304FFE', s3: '#448AFF' },
  { id: 'slate',      label: 'Slate',      s1: '#455A64', s2: '#78909C', s3: '#B0BEC5' },
  { id: 'arctic',     label: 'Arctic',     s1: '#0288D1', s2: '#00BCD4', s3: '#84FFFF' },
  { id: 'light',      label: 'Claro',      s1: '#6200EA', s2: '#00BCD4', s3: '#FF4081' },
]

const META_COLORS: Record<string, string> = {
  cyberpunk: '#090912', fire: '#0a0500', matrix: '#000300', ocean: '#020810',
  sunset: '#0d0008', neonpink: '#0a0008', deepspace: '#03020d', toxic: '#010a00',
  blood: '#0a0000', light: '#f0f0f8', arctic: '#f8faff', goldrush: '#0a0800',
  vaporwave: '#0d0018', jungle: '#020d00', midnight: '#00020f', lava: '#0a0300',
  sakura: '#0d0008', slate: '#080a0f', candy: '#08001a', storm: '#03050e',
}

interface Props {
  visible: boolean
  onClose: () => void
}

function ThemePanel({ visible, onClose }: Props) {
  const currentTheme = useSplitStore((s) => s.prefs.theme)
  const updatePrefs = useSplitStore((s) => s.updatePrefs)
  const prefs = useSplitStore((s) => s.prefs)

  const handleSelect = (themeId: string) => {
    // Haptic first for immediate feedback
    if (prefs.vibration && 'vibrate' in navigator) {
      navigator.vibrate([8, 6, 14])
    }

    // Use View Transitions API if available for smooth morph
    const applyTheme = () => {
      updatePrefs({ theme: themeId })
      document.documentElement.setAttribute('data-theme', themeId)
      const meta = document.querySelector('meta[name="theme-color"]')
      meta?.setAttribute('content', META_COLORS[themeId] ?? '#090912')
    }

    if ('startViewTransition' in document) {
      (document as any).startViewTransition(applyTheme)
    } else {
      applyTheme()
    }
  }

  if (!visible) return null

  return (
    <>
      <div className="theme-backdrop" onClick={onClose} />
      <div className="theme-panel" style={{ display: 'block' }}>
        <div className="theme-panel-inner">
          <span className="theme-panel-title">Tema de color</span>
          <div className="theme-swatches">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-swatch ${currentTheme === t.id ? 'active' : ''}`}
                data-theme={t.id}
                onClick={() => handleSelect(t.id)}
                aria-label={`Tema ${t.label}`}
              >
                <span
                  className="swatch-preview"
                  style={{
                    '--s1': t.s1,
                    '--s2': t.s2,
                    '--s3': t.s3,
                  } as React.CSSProperties}
                />
                <span className="swatch-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default React.memo(ThemePanel)
