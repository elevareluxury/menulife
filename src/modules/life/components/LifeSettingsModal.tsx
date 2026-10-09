import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { colors, font, radius, tint } from '../design-system'
import { useInstallPWA } from '@/hooks/useInstallPWA'

interface LifeSettingsModalProps {
  open: boolean
  onClose: () => void
  onShowIOSInstructions: () => void
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '14px',
  width: '100%', padding: '12px 10px',
  background: 'none', border: 'none',
  borderRadius: radius.md,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s',
}

export function LifeSettingsModal({ open, onClose, onShowIOSInstructions }: LifeSettingsModalProps) {
  const navigate = useNavigate()
  const { canInstall, isInstalled, install, needsIOSInstructions } = useInstallPWA()

  const showInstallRow = (canInstall || needsIOSInstructions) && !isInstalled

  const handleInstall = async () => {
    if (needsIOSInstructions) {
      onClose()
      onShowIOSInstructions()
    } else {
      onClose()
      await install()
    }
  }

  const handleSignOut = async () => {
    onClose()
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'var(--my-scrim)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, margin: '0 auto',
              background: colors.surface.elevated,
              borderRadius: `${radius.xl} ${radius.xl} 0 0`,
              padding: `20px 16px calc(28px + env(safe-area-inset-bottom))`,
              border: `1px solid ${colors.border.glass}`,
              borderBottom: 'none',
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.border.medium, margin: '0 auto 18px' }} />

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '0 4px' }}>
              <h2 style={{ fontFamily: font, fontSize: '17px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
                Configuración
              </h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text.tertiary, padding: 4 }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Install app */}
            {showInstallRow && (
              <button
                onClick={handleInstall}
                style={rowStyle}
                onMouseEnter={e => { e.currentTarget.style.background = colors.surface.base }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                {needsIOSInstructions
                  ? <Share size={18} strokeWidth={2} style={{ color: colors.text.secondary, flexShrink: 0 }} />
                  : <Download size={18} strokeWidth={2} style={{ color: colors.text.secondary, flexShrink: 0 }} />
                }
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.primary, margin: 0 }}>
                    Agregar a inicio
                  </p>
                  <p style={{ fontFamily: font, fontSize: '11px', color: colors.text.tertiary, margin: '1px 0 0' }}>
                    {needsIOSInstructions ? 'Instrucciones para iOS' : 'Instalar como app'}
                  </p>
                </div>
              </button>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: colors.surface.base, margin: '6px 10px' }} />

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              style={rowStyle}
              onMouseEnter={e => { e.currentTarget.style.background = tint(colors.semantic.error, 6) }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <LogOut size={18} strokeWidth={2} style={{ color: colors.semantic.error, flexShrink: 0 }} />
              <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.semantic.error, margin: 0 }}>
                Cerrar sesión
              </p>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
