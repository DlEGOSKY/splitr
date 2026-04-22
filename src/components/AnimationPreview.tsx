import { useState } from 'react'

// Lazy-load heavy animation chunk only when preview is used
const getIntros = () => import('../utils/intros/animations')

interface Props {
  visible: boolean
  onClose: () => void
}

const DEMO = [
  { id: '1', name: 'Ana', luck: 50, active: true },
  { id: '2', name: 'Bob', luck: 50, active: true },
  { id: '3', name: 'Carlos', luck: 50, active: true },
  { id: '4', name: 'Diana', luck: 50, active: true }
]

interface AnimEntry {
  id: string
  name: string
  tag: 'interactive' | 'generic'
  fn: () => Promise<void>
}

const CATEGORIES: { title: string; entries: AnimEntry[] }[] = [
  {
    title: 'Normal',
    entries: [
      { id: 'normal_crosshair', name: 'Crosshair', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('normal_crosshair')) },
      { id: 'normal_missile', name: 'Missile', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('normal_missile')) },
      { id: 'normal_sniper', name: 'Sniper', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('normal_sniper')) },
    ]
  },
  {
    title: 'Elimination',
    entries: [
      { id: 'elim_slots_i', name: 'Casino Slots', tag: 'interactive', fn: () => getIntros().then(m => m.introElimSlotsInteractive(DEMO, '2')) },
      { id: 'elim_chairs_i', name: 'Musical Chairs', tag: 'interactive', fn: () => getIntros().then(m => m.introElimChairsInteractive(DEMO, '2')) },
      { id: 'elim_bulbs_i', name: 'Electric Bulbs', tag: 'interactive', fn: () => getIntros().then(m => m.introElimBulbsInteractive(DEMO, '2')) },
      { id: 'elim_bulbs', name: 'Bulbs (generic)', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('elim_bulbs')) },
      { id: 'elim_chairs', name: 'Chairs (generic)', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('elim_chairs')) },
      { id: 'elim_slots', name: 'Slots (generic)', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('elim_slots')) },
    ]
  },
  {
    title: 'Russian Roulette',
    entries: [
      { id: 'russian_i', name: 'Russian Roulette', tag: 'interactive', fn: () => getIntros().then(m => m.introRussianRouletteInteractive(DEMO, '2')) },
    ]
  },
  {
    title: 'Order',
    entries: [
      { id: 'order_race_i', name: 'Racing Cars', tag: 'interactive', fn: () => getIntros().then(m => m.introOrderRaceInteractive(DEMO, '4')) },
      { id: 'order_podium_i', name: 'Olympic Podium', tag: 'interactive', fn: () => getIntros().then(m => m.introOrderPodiumInteractive(DEMO, '4')) },
      { id: 'order_podium', name: 'Podium (generic)', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('order_podium')) },
      { id: 'order_race', name: 'Race (generic)', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('order_race')) },
      { id: 'order_wheel', name: 'Wheel (generic)', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('order_wheel')) },
    ]
  },
  {
    title: 'Teams',
    entries: [
      { id: 'team_orbit', name: 'Orbit', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('team_orbit')) },
      { id: 'team_magnet', name: 'Magnet', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('team_magnet')) },
      { id: 'team_cards', name: 'Cards', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('team_cards')) },
    ]
  },
  {
    title: 'Duel',
    entries: [
      { id: 'duel_clash', name: 'Clash', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('duel_clash')) },
      { id: 'duel_western', name: 'Western', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('duel_western')) },
      { id: 'duel_boxing', name: 'Boxing', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('duel_boxing')) },
    ]
  },
  {
    title: 'Revenge',
    entries: [
      { id: 'revenge_fire', name: 'Fire', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('revenge_fire')) },
      { id: 'revenge_target', name: 'Target', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('revenge_target')) },
      { id: 'revenge_storm', name: 'Storm', tag: 'generic', fn: () => getIntros().then(m => m.previewIntro('revenge_storm')) },
    ]
  },
]

export default function AnimationPreview({ visible, onClose }: Props) {
  const [playing, setPlaying] = useState<string | null>(null)

  if (!visible) return null

  const play = async (entry: AnimEntry) => {
    if (playing) return
    setPlaying(entry.id)
    try { await entry.fn() } catch (e) { console.error('Animation error:', e) }
    setPlaying(null)
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/80 backdrop-blur-sm py-3 -mx-4 px-4 z-10">
          <h2 className="text-lg font-semibold text-white">All Animations</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat.title} className="mb-5">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">{cat.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              {cat.entries.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => play(entry)}
                  disabled={!!playing}
                  className={`p-2.5 rounded-lg text-left transition-all text-sm ${
                    playing === entry.id
                      ? 'bg-purple-600 text-white scale-95'
                      : playing
                        ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95'
                  }`}
                >
                  <div className="font-medium leading-tight">{entry.name}</div>
                  <div className={`text-[10px] mt-0.5 ${
                    entry.tag === 'interactive' ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {playing === entry.id ? 'playing...' : entry.tag}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="text-[10px] text-gray-600 mt-4 text-center">
          Demo: Ana, Bob, Carlos, Diana
        </div>
      </div>
    </div>
  )
}
