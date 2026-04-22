import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import { useSplitStore } from '../store/useSplitStore'
import { parseDeepLink, clearDeepLink } from '../utils/deepLink'
import { showToast } from '../components/Toast'
import ModeSelector from '../components/ModeSelector'
import ParticipantGrid from '../components/ParticipantGrid'
import CountdownOverlay from '../components/CountdownOverlay'
import ResultOverlay from '../components/ResultOverlay'
import { useSorteo } from '../hooks/useSorteo'
import type { SorteoResult } from '../hooks/useSorteo'
import { selectOne, selectOneWithRevenge } from '../utils/selector'
import type { Participant } from '../types'
// Lazy-load intro animations — heavy chunk (~300KB) loads only on first sorteo
const showModeIntro = (mode: string, participants?: Participant[], winnerId?: string) =>
  import('../utils/intros/animations').then(m => m.showModeIntro(mode, participants, winnerId))
import ThemePanel from '../components/ThemePanel'
import SettingsModal from '../components/SettingsModal'
import GroupsModal from '../components/GroupsModal'
import HelpModal from '../components/HelpModal'
import TemplateChips from '../components/TemplateChips'
import RecentGroupsStrip from '../components/RecentGroupsStrip'
import type { Template } from '../utils/templates'
import { useHoldToSpin } from '../hooks/useHoldToSpin'
import { useVoice } from '../hooks/useVoice'
import { useCinemaMode } from '../hooks/useCinemaMode'
import { initAudio, playAddParticipant } from '../utils/audio'
import { narrateWinner, stopNarrator } from '../utils/narrator'

// Lazy-load heavy overlays — only fetched when their mode is triggered
const BombOverlay = lazy(() => import('../components/BombOverlay'))
const RouletteOverlay = lazy(() => import('../components/RouletteOverlay'))
const SplitOverlay = lazy(() => import('../components/SplitOverlay'))
const CoinOverlay = lazy(() => import('../components/CoinOverlay'))
const DiceOverlay = lazy(() => import('../components/DiceOverlay'))
const RussianRouletteOverlay = lazy(() => import('../components/RussianRouletteOverlay'))
const PaywallModal = lazy(() => import('../components/PaywallModal'))
const AnimationPreview = lazy(() => import('../components/AnimationPreview'))

interface Props {
  active: boolean
  onNavigate: (screen: 'home' | 'stats') => void
}

export default function HomeScreen({ active, onNavigate }: Props) {
  const {
    mode, setMode, question, setQuestion,
    addParticipant, participants, getActiveParticipants,
    phase, setPhase, winnerId
  } = useSplitStore()

  const [inputName, setInputName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [flashingId, setFlashingId] = useState<string | null>(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [resultData, setResultData] = useState<SorteoResult | null>(null)
  const [showThemes, setShowThemes] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showGroups, setShowGroups] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showRussian, setShowRussian] = useState(false)
  const [showAnimationPreview, setShowAnimationPreview] = useState(false)
  const [showRoulette, setShowRoulette] = useState(false)
  const [rouletteWinnerId, setRouletteWinnerId] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showCoin, setShowCoin] = useState(false)
  const [showDice, setShowDice] = useState(false)
  const [showBomb, setShowBomb] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const audioInitRef = useRef(false)
  /** When set, the next sorteo run forces this winner (for replay) */
  const replayForcedWinnerRef = useRef<string | null>(null)

  const { runSorteo, cancelSorteo } = useSorteo()
  const sortearRef = useRef<() => void>(() => {})
  const cinema = useCinemaMode()

  // Apply deep link on first mount (?q=...&mode=...&names=...)
  useEffect(() => {
    const payload = parseDeepLink()
    if (!payload) return

    if (payload.question) setQuestion(payload.question)
    if (payload.mode) setMode(payload.mode)
    if (payload.names && payload.names.length > 0) {
      payload.names.forEach((n) => addParticipant(n))
    }

    clearDeepLink()
    const parts: string[] = []
    if (payload.question) parts.push('pregunta')
    if (payload.mode) parts.push('modo')
    if (payload.names?.length) parts.push(`${payload.names.length} participantes`)
    if (parts.length) showToast(`Cargado: ${parts.join(' · ')}`, 'success')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const hold = useHoldToSpin(() => sortearRef.current())
  const voice = useVoice(() => sortearRef.current())

  const activeCount = getActiveParticipants().length
  const totalCount = participants.length

  const ensureAudio = () => {
    if (!audioInitRef.current) {
      initAudio()
      audioInitRef.current = true
    }
  }

  // Narrador: respeta pref y agrega delay suave para coordinar con fanfare
  const narrateIfEnabled = (name: string) => {
    const prefs = useSplitStore.getState().prefs
    if (!prefs.narrator || !name) return
    setTimeout(() => narrateWinner(name, { mode }), 450)
  }

  const handleApplyTemplate = (tpl: Template) => {
    ensureAudio()
    setQuestion(tpl.question)
    setMode(tpl.mode)
    if (tpl.exampleNames && tpl.exampleNames.length > 0) {
      tpl.exampleNames.forEach((n) => addParticipant(n))
    }
    // Focus input for quick typing if no example names
    if (!tpl.exampleNames?.length) {
      setTimeout(() => inputRef.current?.focus(), 60)
    }
    showToast(`Plantilla: ${tpl.label}`, 'success')
  }

  const handleAdd = () => {
    if (!inputName.trim()) return
    ensureAudio()
    const prevCount = participants.length
    addParticipant(inputName)
    playAddParticipant()
    setInputName('')
    inputRef.current?.focus()
    
    // Auto-scroll to new participant with flash
    requestAnimationFrame(() => {
      const newParticipants = useSplitStore.getState().participants
      if (newParticipants.length > prevCount) {
        const newId = newParticipants[newParticipants.length - 1].id
        const el = document.querySelector(`[data-participant-id="${newId}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          el.classList.add('just-added')
          setTimeout(() => el.classList.remove('just-added'), 600)
        }
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const handleCountdownComplete = useCallback(async () => {
    setShowCountdown(false)
    
    // Get participants and pre-select winner for interactive intros
    const { getActiveParticipants } = useSplitStore.getState()
    const activeParticipants = getActiveParticipants()
    
    // Pre-select winner for interactive animations
    let preSelectedWinner: string | null = null

    // If this is a replay, force the previously selected winner
    if (replayForcedWinnerRef.current && activeParticipants.find(p => p.id === replayForcedWinnerRef.current)) {
      preSelectedWinner = replayForcedWinnerRef.current
      replayForcedWinnerRef.current = null // single-use flag
    } else if (activeParticipants.length >= 2) {
      // Use same logic as useSorteo to pre-select winner
      const { mode, lastWinnerId } = useSplitStore.getState()
      switch (mode) {
        case 'elimination':
          preSelectedWinner = selectOne(activeParticipants)
          break
        case 'revenge':
          preSelectedWinner = selectOneWithRevenge(activeParticipants, lastWinnerId)
          break
        default:
          preSelectedWinner = selectOne(activeParticipants)
          break
      }
    }
    
    // Intro canvas por modo (diana, bombillas, etc.) with real data
    if (preSelectedWinner) {
      await showModeIntro(mode, activeParticipants, preSelectedWinner)
    } else {
      await showModeIntro(mode)
    }
    
    // Flash scan en avatares (using pre-selected winner)
    runSorteo(
      (id) => setFlashingId(id),
      (result) => {
        setFlashingId(null)
        setResultData(result)
      },
      preSelectedWinner // Pass pre-selected winner to ensure consistency
    )
  }, [runSorteo, mode])

  const handleSortear = async () => {
    if (activeCount < 2 || phase !== 'idle') return
    ensureAudio()
    const prefs = useSplitStore.getState().prefs
    if (prefs.vibration && 'vibrate' in navigator) {
      navigator.vibrate([15, 10, 30])
    }

    // Russian mode now uses canvas animation like other modes
    // (removed special case to use unified flow)

    if (mode === 'coin') {
      setPhase('spinning')
      setShowCoin(true)
      return
    }

    if (mode === 'dice') {
      setPhase('spinning')
      setShowDice(true)
      return
    }

    if (mode === 'bomb') {
      setPhase('spinning')
      setShowBomb(true)
      return
    }

    if (mode === 'split') {
      setPhase('spinning')
      setShowSplit(true)
      return
    }

    // Roulette visual mode
    if (prefs.roulette && mode === 'normal') {
      const active = getActiveParticipants()
      const wId = selectOne(active)
      setRouletteWinnerId(wId)
      setPhase('spinning')
      setShowRoulette(true)
      return
    }
    
    // Ritual pre-roll (opt-in) — ~800ms de acumulación de tensión
    // antes del countdown. CSS-only mediante body.splitr-ritual.
    const prefsNow = useSplitStore.getState().prefs
    if (prefsNow.ritual) {
      document.body.classList.add('splitr-ritual')
      setPhase('countdown') // evita doble click
      setTimeout(() => {
        document.body.classList.remove('splitr-ritual')
        setShowCountdown(true)
      }, 800)
      return
    }

    setPhase('countdown')
    setShowCountdown(true)
  }
  sortearRef.current = handleSortear

  const handleRussianComplete = useCallback((winnerId: string) => {
    setShowRussian(false)
    const winnerName = participants.find(p => p.id === winnerId)?.name || ''
    useSplitStore.getState().setWinner(winnerId)
    useSplitStore.getState().recordChosen(winnerId)
    useSplitStore.getState().recordHistory(winnerId, winnerName, question, mode)
    setResultData({
      winnerId,
      winnerName,
      sequence: []
    })
    setPhase('result')
    narrateIfEnabled(winnerName)
  }, [mode, question, participants, setPhase])

  const handleCloseResult = useCallback(() => {
    stopNarrator()
    setResultData(null)
    cancelSorteo()
    useSplitStore.getState().setPhase('idle')
    useSplitStore.getState().setWinner(null)
  }, [cancelSorteo])

  /**
   * Replay: re-ejecuta el mismo sorteo forzando al mismo ganador.
   * Requiere que el modo soporte countdown + flash (no overlays externos).
   */
  const handleReplay = useCallback(() => {
    if (!resultData) return
    const currentWinnerId = resultData.winnerId
    // Overlays externos (coin/dice/bomb/russian/split) tienen su propia UI,
    // para esos volvemos a disparar el flujo normal (sin forzar winner).
    const overlayModes: Array<typeof mode> = ['coin', 'dice', 'bomb', 'russian', 'split']
    stopNarrator()
    setResultData(null)
    useSplitStore.getState().setPhase('idle')
    useSplitStore.getState().setWinner(null)

    if (!overlayModes.includes(mode)) {
      // Forzar mismo ganador en el próximo countdown
      replayForcedWinnerRef.current = currentWinnerId
    }
    // Pequeño delay para que el overlay termine de cerrar antes de re-lanzar
    setTimeout(() => sortearRef.current(), 120)
  }, [resultData, mode])

  return (
    <section
      className={`screen ${active ? 'active' : ''}`}
      id="screen-home"
      role="main"
      aria-label="Pantalla principal"
    >
      {/* Header */}
      <header className="app-header">
        <h1 className="app-logo">
          <span className="app-logo-bolt">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </span>
          Splitr
        </h1>
        <div className="header-actions">
          <button className="btn btn-icon" onClick={() => onNavigate('stats')} aria-label="Ver estadísticas" title="Estadísticas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </button>
          <button className="btn btn-icon" onClick={() => setShowGroups(true)} aria-label="Grupos guardados" title="Mis grupos">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </button>
          <div className="header-divider" />
          <button className="btn btn-icon" onClick={() => setShowThemes(!showThemes)} aria-label="Cambiar tema" title="Tema de color">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2C6.5 2 2 6.5 2 12"/></svg>
          </button>
          <button className="btn btn-icon" onClick={() => setShowSettings(true)} aria-label="Personalizar" title="Personalizar">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button className="btn btn-icon" onClick={() => setShowHelp(true)} aria-label="Ayuda e instalación" title="Ayuda">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>
          </button>
          <button
            className={`btn btn-icon cinema-toggle${cinema.active ? ' cinema-toggle-active' : ''}`}
            onClick={cinema.toggle}
            aria-label={cinema.active ? 'Salir del modo cine' : 'Activar modo cine'}
            aria-pressed={cinema.active}
            title={cinema.active ? 'Salir del modo cine' : 'Modo cine'}
          >
            {cinema.active ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v4a1 1 0 01-1 1H3M21 8h-4a1 1 0 01-1-1V3M3 16h4a1 1 0 011 1v4M16 21v-4a1 1 0 011-1h4" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <div className="header-divider" />
          <button className="btn btn-icon btn-pro" onClick={() => setShowPaywall(true)} aria-label="Splitr Pro" title="Pro">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H3V5h3M18 9h3V5h-3"/><path d="M6 5h12v6a6 6 0 0 1-12 0V5z"/><path d="M9 17v2M15 17v2M7 19h10"/></svg>
            <span className="btn-pro-badge">PRO</span>
          </button>
        </div>
      </header>

      {/* Input de pregunta personalizable */}
      <div>
        <input
          type="text"
          className="input-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="¿Quién hace qué?"
          maxLength={60}
          aria-label="Pregunta o tarea del sorteo"
        />
      </div>

      {/* Selector de modo */}
      <ModeSelector mode={mode} onSelect={setMode} />

      {/* Añadir participante */}
      <div className="input-group">
        <input
          ref={inputRef}
          type="text"
          className="input-text"
          placeholder="Nombre del participante..."
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={30}
          aria-label="Nombre del nuevo participante"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button className="btn btn-primary" onClick={handleAdd} aria-label="Agregar participante">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Añadir
        </button>
      </div>

      {/* Contador + acciones */}
      <div className="counter-row">
        <span className="counter-chip">
          <span className="count">{activeCount}</span>/{totalCount} activos
        </span>
        {totalCount > 0 && (
          <button
            onClick={() => useSplitStore.getState().clearParticipants()}
            aria-label="Borrar todos"
            title="Borrar todos"
            className="btn btn-icon clear-all-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        )}
      </div>

      {/* Duel hint */}
      {mode === 'duel' && phase === 'idle' && totalCount >= 2 && (
        <div className="duel-hint">
          {useSplitStore.getState().duelIds.length < 2
            ? `Toca 2 participantes para el duelo (${useSplitStore.getState().duelIds.length}/2)`
            : 'Duelo listo'}
        </div>
      )}

      {/* Grid de participantes */}
      <div className="participants-section">
        {totalCount === 0 ? (
          <>
            <TemplateChips onApply={handleApplyTemplate} />
            <RecentGroupsStrip onLoaded={(name) => showToast(`Cargado: ${name}`, 'success')} />
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                  <circle cx="9" cy="7" r="3.5"/><path d="M2 20c0-3.5 3-6.5 7-6.5s7 3 7 6.5"/>
                  <circle cx="17" cy="7" r="2.5" opacity="0.4"/><path d="M22 20c0-2.8-2-5-5-5" opacity="0.4"/>
                </svg>
              </div>
              <p className="empty-state-title">Agrega participantes</p>
              <p className="empty-state-sub">Escribe un nombre arriba o toca una plantilla</p>
            </div>
          </>
        ) : (
          <ParticipantGrid flashingId={flashingId} winnerId={winnerId} />
        )}
      </div>

      <div className="neon-divider"></div>

      {/* Botón de voz (solo en modo voice) */}
      {mode === 'voice' && voice.available && (
        <button
          onClick={voice.toggle}
          className={`btn ${voice.listening ? 'btn-impact' : 'btn-accent'} voice-btn`}
          aria-label={voice.listening ? 'Detener escucha' : 'Activar voz'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          {voice.listening ? 'Escuchando... di "Sortear"' : 'Activar micrófono'}
        </button>
      )}

      {/* Botón principal de sorteo */}
      <button
        className={`btn btn-impact${hold.holding ? ' revving' : ''}`}
        onClick={handleSortear}
        onPointerDown={() => { if (activeCount >= 2 && phase === 'idle') hold.start() }}
        onPointerUp={hold.cancel}
        onPointerLeave={hold.cancel}
        disabled={activeCount < 2 || phase !== 'idle'}
        aria-label="Iniciar sorteo"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="13,2 4.5,13.5 11,13.5 11,22 19.5,10.5 13,10.5"/></svg>
        SORTEAR
        {hold.holding && (
          <svg
            className="hold-ring"
            viewBox="0 0 36 36"
          >
            <circle cx="18" cy="18" r="16" fill="none" stroke="var(--color-accent)"
              strokeWidth="2" strokeDasharray="100.5" strokeLinecap="round"
              strokeDashoffset={100.5 * (1 - hold.progress)}
              className="hold-ring-circle"
            />
          </svg>
        )}
      </button>

      {/* Countdown 3-2-1-¡YA! */}
      <CountdownOverlay
        visible={showCountdown}
        onComplete={handleCountdownComplete}
      />

      {/* Panel de temas */}
      <ThemePanel visible={showThemes} onClose={() => setShowThemes(false)} />

      {/* Modal de ajustes */}
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />

      {/* Modal de grupos */}
      <GroupsModal visible={showGroups} onClose={() => setShowGroups(false)} />

      {/* Modal de ayuda */}
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />

      {/* Lazy-loaded overlays — each chunk fetched on first use */}
      <Suspense fallback={null}>
        {/* Paywall */}
        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />

        {/* Roulette visual */}
        <RouletteOverlay
          visible={showRoulette}
          participants={participants}
          winnerId={rouletteWinnerId}
          onComplete={() => {
            setShowRoulette(false)
            if (rouletteWinnerId) {
              const winnerName = participants.find(p => p.id === rouletteWinnerId)?.name || ''
              useSplitStore.getState().setWinner(rouletteWinnerId)
              useSplitStore.getState().recordChosen(rouletteWinnerId)
              useSplitStore.getState().recordHistory(rouletteWinnerId, winnerName, question, mode)
              setResultData({ winnerId: rouletteWinnerId, winnerName, sequence: [] })
              setPhase('result')
              narrateIfEnabled(winnerName)
            }
          }}
        />

        {/* Ruleta Rusa */}
        <RussianRouletteOverlay
          visible={showRussian}
          participants={participants}
          onComplete={handleRussianComplete}
        />

        {/* Cara o Cruz */}
        <CoinOverlay
          visible={showCoin}
          onComplete={(result) => {
            setShowCoin(false)
            useSplitStore.getState().setPhase('idle')
            showToast(`Resultado: ${result.toUpperCase()}`)
          }}
        />

        {/* Dado */}
        <DiceOverlay
          visible={showDice}
          participants={participants}
          onComplete={(wId, diceResult) => {
            setShowDice(false)
            const winnerName = participants.find(p => p.id === wId)?.name || ''
            useSplitStore.getState().setWinner(wId)
            useSplitStore.getState().recordChosen(wId)
            useSplitStore.getState().recordHistory(wId, winnerName, question, mode)
            setResultData({ winnerId: wId, winnerName, sequence: [] })
            setPhase('result')
            showToast(`Dado: ${diceResult} → ${winnerName}`)
            narrateIfEnabled(winnerName)
          }}
        />

        {/* Bomba */}
        <BombOverlay
          visible={showBomb}
          participants={participants}
          onComplete={(wId) => {
            setShowBomb(false)
            const winnerName = participants.find(p => p.id === wId)?.name || ''
            useSplitStore.getState().setWinner(wId)
            useSplitStore.getState().recordChosen(wId)
            useSplitStore.getState().recordHistory(wId, winnerName, question, mode)
            setResultData({ winnerId: wId, winnerName, sequence: [] })
            setPhase('result')
            narrateIfEnabled(winnerName)
          }}
        />

        {/* Split / Dividir */}
        <SplitOverlay
          visible={showSplit}
          participants={participants}
          question={question}
          onClose={() => { setShowSplit(false); useSplitStore.getState().setPhase('idle') }}
          onRemix={handleSortear}
        />

        {/* Animation Preview (dev only) */}
        {import.meta.env.DEV && (
          <>
            <button
              onClick={() => setShowAnimationPreview(true)}
              style={{
                position: 'fixed', bottom: 16, left: 16,
                background: 'var(--color-primary)', color: '#fff',
                border: 'none', borderRadius: '50%',
                width: 44, height: 44, fontSize: '1.2rem',
                cursor: 'pointer', zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
              title="Preview Animations"
            >
              🎬
            </button>
            <AnimationPreview
              visible={showAnimationPreview}
              onClose={() => setShowAnimationPreview(false)}
            />
          </>
        )}
      </Suspense>

      {/* Resultado */}
      <ResultOverlay
        visible={!!resultData}
        winnerName={resultData?.winnerName ?? ''}
        question={question}
        teammates={resultData?.teammates}
        onClose={handleCloseResult}
        onRepeat={handleSortear}
        onReplay={handleReplay}
      />
    </section>
  )
}
