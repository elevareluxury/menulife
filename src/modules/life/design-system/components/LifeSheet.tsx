import { useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { colors, font, radius, shadow } from '../tokens'

interface LifeSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxHeight?: string
}

export function LifeSheet({ open, onClose, title, children, maxHeight = '88vh' }: LifeSheetProps) {
  // Lock body scroll + handle Escape key
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 201,
              maxHeight,
              display: 'flex', flexDirection: 'column',
              background: colors.surface.elevated,
              borderRadius: `${radius['2xl']} ${radius['2xl']} 0 0`,
              boxShadow: shadow.elevated,
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* Handle */}
            <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.border.medium }} />
            </div>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px 0', flexShrink: 0,
            }}>
              <h3 style={{
                fontFamily: font, fontSize: '17px', fontWeight: 700,
                color: colors.text.primary, margin: 0,
              }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: radius.full,
                  background: colors.border.subtle, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.border.medium }}
                onMouseLeave={e => { e.currentTarget.style.background = colors.border.subtle }}
              >
                <X size={16} style={{ color: colors.text.tertiary }} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 28px' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
