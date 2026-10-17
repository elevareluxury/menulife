import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { colors, font, radius, shadow } from '../tokens'
import { useLifeT } from '@/i18n/app/life'
import { useScrollLock } from '@/lib/scrollLock'

interface LifeSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxHeight?: string
}

export function LifeSheet({ open, onClose, title, children, maxHeight = '88dvh' }: LifeSheetProps) {
  const titleId = useId()
  const t = useLifeT()
  // Lo de atrás queda quieto (también el marco de Life OS) y Escape cierra
  useScrollLock(open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // En un portal a <body>: si no, una página con su propio apilado (z-index) la dejaba debajo de la barra de abajo
  if (typeof document === 'undefined') return null
  return createPortal(
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
              position: 'fixed', inset: 0, zIndex: 200, touchAction: 'none',
              background: 'var(--my-scrim)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            style={{
              position: 'fixed',
              // Arriba del teclado y nunca más alta que lo que se ve (`--kb`/`--vvh`, lib/viewportVars.ts)
              bottom: 'var(--kb, 0px)', left: 0, right: 0,
              zIndex: 201,
              maxHeight: `min(${maxHeight}, calc(var(--vvh, 100dvh) - 12px))`,
              display: 'flex', flexDirection: 'column',
              background: colors.surface.elevated,
              borderRadius: `${radius['2xl']} ${radius['2xl']} 0 0`,
              boxShadow: shadow.elevated,
              paddingBottom: 'env(safe-area-inset-bottom)',
              // La hoja no se arrastra ni rebota: sólo su contenido se mueve, y sólo para arriba y abajo
              overscrollBehavior: 'none', touchAction: 'pan-y pinch-zoom',
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
              <h3 id={titleId} style={{
                fontFamily: font, fontSize: '17px', fontWeight: 700,
                color: colors.text.primary, margin: 0,
              }}>
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.common.close}
                style={{
                  width: 40, height: 40, borderRadius: radius.full, flexShrink: 0,
                  background: colors.border.subtle, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.border.medium }}
                onMouseLeave={e => { e.currentTarget.style.background = colors.border.subtle }}
              >
                <X size={16} style={{ color: colors.text.tertiary }} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            {/* Sólo se mueve para arriba y abajo; empieza siempre desde arriba (se monta de nuevo cada vez que abre) */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'none', padding: '16px 20px 28px' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
