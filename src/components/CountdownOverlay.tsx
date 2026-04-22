import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  visible: boolean
  onComplete: () => void
}

const STEPS = ['3', '2', '1', '¡YA!']
const STEP_DURATION = 500

const digitVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 26, mass: 0.6 },
  },
  exit: {
    scale: 0.7,
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
}

export default function CountdownOverlay({ visible, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(-1)

  useEffect(() => {
    if (!visible) {
      setCurrentStep(-1)
      return
    }

    let step = 0
    setCurrentStep(0)

    const timer = setInterval(() => {
      step++
      if (step >= STEPS.length) {
        clearInterval(timer)
        setTimeout(onComplete, 180)
        return
      }
      setCurrentStep(step)
    }, STEP_DURATION)

    return () => clearInterval(timer)
  }, [visible, onComplete])

  if (!visible || currentStep < 0) return null

  const isGo = currentStep === STEPS.length - 1

  return (
    <div className={`countdown-overlay${isGo ? ' countdown-go' : ''}`}>
      <div className="countdown-bg" />
      <div key={`ring-${currentStep}`} className="countdown-ring" />
      <div key={`ring2-${currentStep}`} className="countdown-ring countdown-ring-outer" />
      <AnimatePresence mode="wait">
        <motion.span
          key={currentStep}
          className={`countdown-digit ${isGo ? 'go' : ''}`}
          variants={digitVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {STEPS[currentStep]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
