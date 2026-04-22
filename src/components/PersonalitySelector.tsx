import { useSplitStore } from '../store/useSplitStore'
import { PERSONALITIES, type PersonalityId } from '../utils/personality'
import { hapticTap } from '../utils/haptics'

/**
 * Selector visual de personalidades del sorteo.
 * Se muestra en Settings → Visual.
 * Afecta narrador (frases + pitch/rate) y estilo visual (body class).
 */
export default function PersonalitySelector() {
  const current = useSplitStore((s) => s.prefs.personality) ?? 'neutral'
  const updatePrefs = useSplitStore((s) => s.updatePrefs)

  const handleSelect = (id: PersonalityId) => {
    hapticTap()
    updatePrefs({ personality: id })
  }

  return (
    <div className="personality-selector" role="radiogroup" aria-label="Personalidad del sorteo">
      {PERSONALITIES.map((p) => {
        const active = current === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`personality-card${active ? ' personality-card-active' : ''}`}
            onClick={() => handleSelect(p.id)}
            title={p.description}
          >
            <span className="personality-card-icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={p.iconPath} />
              </svg>
            </span>
            <span className="personality-card-label">{p.label}</span>
            <span className="personality-card-desc">{p.description}</span>
          </button>
        )
      })}
    </div>
  )
}
