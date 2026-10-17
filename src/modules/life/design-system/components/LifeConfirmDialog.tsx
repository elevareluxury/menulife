import { useId, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { colors, font, radius, shadow, tint } from '../tokens'
import { useLifeT } from '@/i18n/app/life'
import { useScrollLock } from '@/lib/scrollLock'

interface LifeConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
  /** El botón de confirmar queda apagado (por ejemplo, hasta escribir la palabra de confirmación) */
  confirmDisabled?: boolean
  /** Algo más entre el texto y los botones (por ejemplo, el "¿Por qué lo hago?" antes de soltar) */
  children?: ReactNode
}

export function LifeConfirmDialog({
  open, title, message,
  confirmLabel,
  cancelLabel,
  onConfirm, onCancel, danger = false, confirmDisabled = false, children,
}: LifeConfirmDialogProps) {
  const t = useLifeT()
  const titleId = useId()
  const textId = useId()
  confirmLabel ??= t.common.confirm
  cancelLabel ??= t.common.cancel
  useScrollLock(open)
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
              position: 'fixed', inset: 0, zIndex: 300, touchAction: 'none',
              background: 'var(--my-scrim)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          <motion.div
            key="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={textId}
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
              padding: '24px 20px 20px', touchAction: 'none',
            }}
          >
            {danger && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: radius.md,
                  background: tint(colors.semantic.error, 10),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={20} style={{ color: colors.semantic.error }} strokeWidth={2} />
                </div>
              </div>
            )}
            <h3 id={titleId} style={{
              fontFamily: font, fontSize: '16px', fontWeight: 700,
              color: colors.text.primary, textAlign: 'center', margin: '0 0 8px',
            }}>
              {title}
            </h3>
            <p id={textId} style={{
              fontFamily: font, fontSize: '13px',
              color: colors.text.secondary, textAlign: 'center',
              lineHeight: 1.5, margin: '0 0 20px',
            }}>
              {message}
            </p>
            {children}
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
                disabled={confirmDisabled}
                style={{
                  flex: 1, padding: '11px', borderRadius: radius.md,
                  background: danger ? colors.semantic.error : colors.accent.default,
                  border: 'none',
                  color: colors.accent.on,
                  fontFamily: font, fontSize: '14px', fontWeight: 700,
                  cursor: confirmDisabled ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s', opacity: confirmDisabled ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!confirmDisabled) e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { if (!confirmDisabled) e.currentTarget.style.opacity = '1' }}
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
