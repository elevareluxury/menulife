import { Download, Share, X } from 'lucide-react'
import { colors, font, radius, tint } from '../design-system'

interface InstallAppBannerProps {
  needsIOSInstructions: boolean
  onInstall: () => void
  onShowIOSInstructions: () => void
  onDismiss: () => void
}

export function InstallAppBanner({
  needsIOSInstructions, onInstall, onShowIOSInstructions, onDismiss,
}: InstallAppBannerProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 14px',
      background: tint(colors.accent.default, 10),
      border: `1px solid ${tint(colors.accent.default, 25)}`,
      borderRadius: radius.lg,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
        background: colors.accent.default,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {needsIOSInstructions
          ? <Share size={17} style={{ color: colors.accent.on }} strokeWidth={2.5} />
          : <Download size={17} style={{ color: colors.accent.on }} strokeWidth={2.5} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: colors.text.primary, margin: '0 0 1px' }}>
          Agregar Mycen a inicio
        </p>
        <p style={{ fontFamily: font, fontSize: '11px', color: colors.text.tertiary, margin: 0, lineHeight: 1.4 }}>
          {needsIOSInstructions
            ? 'Compartir → "En pantalla de inicio"'
            : 'Acceso rápido sin abrir el navegador'}
        </p>
      </div>

      <button
        onClick={needsIOSInstructions ? onShowIOSInstructions : onInstall}
        style={{
          padding: '6px 13px', borderRadius: radius.full,
          background: colors.area.brain, border: 'none', color: colors.accent.on,
          fontFamily: font, fontSize: '12px', fontWeight: 700,
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        {needsIOSInstructions ? 'Ver' : 'Instalar'}
      </button>

      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px', color: colors.text.tertiary, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}
