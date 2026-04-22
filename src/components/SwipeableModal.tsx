import React, { useRef } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'

interface Props {
  visible: boolean
  onClose: () => void
  tall?: boolean
  children: React.ReactNode
}

const DISMISS_THRESHOLD = 80

export default function SwipeableModal({ visible, onClose, tall, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_THRESHOLD || info.velocity.y > 300) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="modal-backdrop open"
          style={{ display: 'flex' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            ref={sheetRef}
            className={`modal-sheet ${tall ? 'modal-sheet-tall' : ''}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring' as const, stiffness: 350, damping: 30, mass: 0.8 }}
            style={{ animation: 'none' }}
          >
            <div className="modal-handle" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
