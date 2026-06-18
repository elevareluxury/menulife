import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { colors, font, radius, shadow } from '../tokens'

interface LifeConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function LifeConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm, onCancel, danger = false,
}: LifeConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onCancel}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 301,
              width: 'min(88vw, 340px)',
              background: colors.surface.elevated,
              borderRadius: radius.xl,
              border: `1px solid ${colors.border.medium}`,
              boxShadow: shadow.elevated,
              padding: '24px 20px 20px',
            }}
          >
            {danger && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: radius.md,
                  background: 'rgba(239,68,68,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={20} style={{ color: colors.semantic.error }} strokeWidth={2} />
                </div>
              </div>
            )}
            <h3 style={{
              fontFamily: font, fontSize: '16px', fontWeight: 700,
              color: colors.text.primary, textAlign: 'center', margin: '0 0 8px',
            }}>
              {title}
            </h3>
            <p style={{
              fontFamily: font, fontSize: '13px',
              color: colors.text.secondary, textAlign: 'center',
              lineHeight: 1.5, margin: '0 0 20px',
            }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onCancel}
                style={{
                  flex: 1, padding: '11px', borderRadius: radius.md,
                  background: colors.border.subtle,
                  border: `1px solid ${colors.border.medium}`,
                  color: colors.text.secondary,
                  fontFamily: font, fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.border.medium }}
                onMouseLeave={e => { e.currentTarget.style.background = colors.border.subtle }}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1, padding: '11px', borderRadius: radius.md,
                  background: danger ? colors.semantic.error : colors.accent.default,
                  border: 'none',
                  color: '#fff',
                  fontFamily: font, fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
