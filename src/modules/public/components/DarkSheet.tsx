import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface DarkSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  maxHeight?: string
}

export function DarkSheet({ isOpen, onClose, children, title, maxHeight = '90vh' }: DarkSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl overflow-hidden"
            style={{ maxHeight, backgroundColor: 'var(--menu-card, #111111)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Header */}
            {title !== undefined && (
              <div
                className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--menu-border, rgba(255,255,255,0.06))' }}
              >
                <h2 className="text-base font-semibold" style={{ color: 'var(--menu-text-primary, #F5F5F5)' }}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  <X className="w-4 h-4" style={{ color: 'var(--menu-text-secondary, #888888)' }} />
                </button>
              </div>
            )}

            {/* Scrollable content */}
            <div
              className="overflow-y-auto flex-1"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
