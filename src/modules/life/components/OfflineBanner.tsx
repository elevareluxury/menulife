import { UploadCloud } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { colors, font, radius } from '../design-system'
import { useOutbox } from '../lib/outbox'

/** Aviso arriba cuando quedan capturas por subir (el "sin conexión" general lo muestra la app). */
export function OfflineBanner() {
  const t = useLifeT()
  const { pending, offline } = useOutbox()
  if (offline || pending === 0) return null
  return (
    <div role="status" style={{
      position: 'sticky', top: 0, zIndex: 40, display: 'flex', justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top) + 6px) 16px 6px', pointerEvents: 'none',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: radius.full,
        background: colors.surface.elevated, border: `1px solid ${colors.border.medium}`,
        fontFamily: font, fontSize: '12px', fontWeight: 600, color: colors.text.secondary,
      }}>
        <UploadCloud size={13} aria-hidden="true" />
        {t.offline.pending(pending)}
      </span>
    </div>
  )
}
