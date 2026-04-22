import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import HomeScreen from './screens/HomeScreen'
import StatsScreen from './screens/StatsScreen'
import ToastContainer from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineIndicator from './components/OfflineIndicator'
import { useSplitStore } from './store/useSplitStore'
import { initPerformance } from './utils/performance'
import { useRipple } from './hooks/useRipple'
import { getSeasonalMoments, applyBodyMoments } from './utils/moments'
import { applyPersonalityBodyClass } from './utils/personality'

type Screen = 'home' | 'stats'

const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? '12%' : '-12%',
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.8 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-12%' : '12%',
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  }),
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [direction, setDirection] = useState(0)
  const theme = useSplitStore((s) => s.prefs.theme)
  const personality = useSplitStore((s) => s.prefs.personality)

  useRipple()

  useEffect(() => {
    applyPersonalityBodyClass(personality || 'neutral')
  }, [personality])

  const navigate = (target: Screen) => {
    setDirection(target === 'stats' ? 1 : -1)
    setScreen(target)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    initPerformance()

    // Initialize glow intensity
    const glow = useSplitStore.getState().prefs.glow
    const intensity = glow / 100
    document.documentElement.style.setProperty('--glow-intensity', intensity.toString())

    // Seasonal moments (Halloween, Christmas, etc.) — se refresca cada hora
    // para cruzar medianoche sin recargar la app
    const refreshMoments = () => applyBodyMoments(getSeasonalMoments())
    refreshMoments()
    const id = setInterval(refreshMoments, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <ErrorBoundary>
    <div id="app">
      <AnimatePresence mode="wait" custom={direction}>
        {screen === 'home' ? (
          <motion.div
            key="home"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          >
            <HomeScreen active onNavigate={navigate} />
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          >
            <StatsScreen active onNavigate={navigate} />
          </motion.div>
        )}
      </AnimatePresence>
      <ToastContainer />
      <OfflineIndicator />
    </div>
    </ErrorBoundary>
  )
}
