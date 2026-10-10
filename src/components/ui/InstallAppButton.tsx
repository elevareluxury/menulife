import { useState } from 'react'
import type { CSSProperties } from 'react'
import { MonitorDown, Share, Smartphone } from 'lucide-react'
import { Sheet } from '@/design'
import { installMode, useInstallPWA } from '@/hooks/useInstallPWA'
import { useInstallT } from '@/i18n/app/install'

// "Agregar a inicio" en el encabezado de Mi día y de Studio. Donde el navegador lo permite (Chrome, Edge, Android)
// abre su ventana de instalar; en iPhone/iPad (o Android sin esa ventana) muestra los pasos. Si Mycen ya se abrió
// como app, o en una computadora sin la opción, no se muestra.

interface InstallAppButtonProps {
  className?: string
  style?: CSSProperties
  /** Sólo el ícono (con el texto como nombre accesible) */
  iconOnly?: boolean
}

export function InstallAppButton({ className, style, iconOnly }: InstallAppButtonProps) {
  const t = useInstallT()
  const pwa = useInstallPWA()
  const { install, platform } = pwa
  const [open, setOpen] = useState(false)

  const mode = installMode(pwa)
  if (!mode) return null

  const Icon = mode === 'prompt' && platform === 'desktop' ? MonitorDown : Smartphone
  const steps = mode === 'ios' ? t.ios : t.android

  return (
    <>
      <button type="button" data-install-app className={className} style={style} aria-label={iconOnly ? t.add : undefined} title={t.add}
        onClick={() => { if (mode === 'prompt') void install(); else setOpen(true) }}>
        <Icon size={16} aria-hidden="true" />
        {!iconOnly && <span>{t.add}</span>}
      </button>
      {mode !== 'prompt' && (
        <Sheet open={open} onClose={() => setOpen(false)} title={t.title} closeLabel={t.close}>
          <p style={{ margin: '0 0 14px', color: 'var(--my-muted)', lineHeight: 'var(--my-lh-body)' }}>{t.intro}</p>
          <ol style={{ margin: 0, paddingInlineStart: 22, listStyle: 'decimal', display: 'grid', gap: 10, color: 'var(--my-text)', lineHeight: 'var(--my-lh-body)' }}>
            {steps.map((s, i) => (
              <li key={i}>
                {s}
                {mode === 'ios' && i === 0 && <Share size={15} aria-hidden="true" style={{ display: 'inline', marginInlineStart: 6, verticalAlign: '-2px' }} />}
              </li>
            ))}
          </ol>
        </Sheet>
      )}
    </>
  )
}
