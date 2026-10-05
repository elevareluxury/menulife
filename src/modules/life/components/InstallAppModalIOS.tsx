import { motion, AnimatePresence } from 'framer-motion'
import { X, Share } from 'lucide-react'
import { colors, font, radius } from '../design-system'

interface InstallAppModalIOSProps {
  open: boolean
  onClose: () => void
}

export function InstallAppModalIOS({ open, onClose }: InstallAppModalIOSProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 310,
            background: 'rgba(0,0,0,0.72)',
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
              background: colors.surface.high,
              borderRadius: `${radius.xl} ${radius.xl} 0 0`,
              padding: `24px 22px calc(34px + env(safe-area-inset-bottom))`,
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none',
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.10)', margin: '0 auto 22px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: font, fontSize: '18px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
                Agregar a inicio
              </h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text.tertiary, padding: 4 }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: font, fontSize: '14px', fontWeight: 800, color: '#818CF8',
                }}>1</div>
                <div style={{ paddingTop: 2 }}>
                  <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 700, color: colors.text.primary, margin: '0 0 6px' }}>
                    Toca el botón Compartir
                  </p>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)',
                  }}>
                    <Share size={12} style={{ color: '#818CF8' }} strokeWidth={2.5} />
                    <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: '#818CF8' }}>
                      Compartir
                    </span>
                  </div>
                  <span style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary, marginLeft: 6 }}>
                    en la barra de Safari
                  </span>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 46 }} />

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: font, fontSize: '14px', fontWeight: 800, color: '#818CF8',
                }}>2</div>
                <div style={{ paddingTop: 2 }}>
                  <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 700, color: colors.text.primary, margin: '0 0 4px' }}>
                    Seleccioná "En pantalla de inicio"
                  </p>
                  <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: 0 }}>
                    Luego tocá "Agregar" para confirmar
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '100%', marginTop: '28px', padding: '13px',
                borderRadius: radius.full,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                color: colors.text.secondary,
                fontFamily: font, fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
