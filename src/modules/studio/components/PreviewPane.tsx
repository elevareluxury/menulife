import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Maximize2, Monitor, Smartphone, X } from 'lucide-react'
import { ProfileView } from '@/modules/profile/components/ProfileView'
import { themeVars } from '@/modules/profile/lib/profileTheme'
import { usePrefersLight } from '@/modules/profile/lib/usePrefersLight'
import type { ProfileLang } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'

/** Vista previa en vivo: se actualiza mientras se edita (no registra visitas). */
export function LivePreview({ device = 'mobile' }: { device?: 'mobile' | 'desktop' }) {
  const { previewProfile } = useStudio()
  const prefersLight = usePrefersLight()
  const appLang = useAppLang(s => s.lang)
  // La vista previa arranca en el idioma de Studio y se puede cambiar sin afectar la cuenta
  const [picked, setLang] = useState<ProfileLang | null>(null)
  const lang = picked ?? appLang
  return (
    <div className={device === 'mobile' ? 'st-phone' : 'st-desktop-frame'}>
      <div className="st-phone-scroll">
        <ProfileView profile={previewProfile} lang={lang} onLang={setLang}
          style={themeVars(previewProfile.theme, prefersLight)} onToast={() => undefined} toast={null} preview />
      </div>
    </div>
  )
}

export function PreviewPane() {
  const { publicUrl } = useStudio()
  const t = useStudioT()
  return (
    <aside className="st-preview-pane" aria-label={t.preview.title}>
      <div className="st-row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <span className="st-label">{t.preview.live}</span>
        <span className="st-row" style={{ gap: 4 }}>
          <FullscreenPreviewButton compact />
          <a className="st-btn st-btn-ghost st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} aria-hidden="true" /> {t.common.open}
          </a>
        </span>
      </div>
      <LivePreview />
    </aside>
  )
}

/** Página de vista previa (móvil) con selector de dispositivo. */
export function PreviewSwitcher() {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const t = useStudioT().preview
  return (
    <div className="st-stack" style={{ alignItems: 'center' }}>
      <div className="st-segment" role="group" aria-label={t.device}>
        <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
          <Smartphone size={14} aria-hidden="true" /> {t.mobile}
        </button>
        <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
          <Monitor size={14} aria-hidden="true" /> {t.desktop}
        </button>
      </div>
      <div style={{ width: device === 'mobile' ? 'min(100%, 380px)' : '100%' }}>
        <LivePreview device={device} />
      </div>
    </div>
  )
}

/**
 * Vista previa a pantalla completa: el perfil como lo ve un visitante, ocupando toda la pantalla.
 * Se cierra con el botón o con Escape y el foco vuelve a donde estaba.
 */
export function FullscreenPreviewButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const t = useStudioT().preview
  return (
    <>
      <button ref={trigger} type="button" className={`st-btn st-btn-${compact ? 'ghost' : 'secondary'} st-btn-sm`}
        onClick={() => setOpen(true)} aria-label={compact ? t.fullscreen : undefined} title={t.fullscreen}>
        <Maximize2 size={14} aria-hidden="true" /> {!compact && t.fullscreen}
      </button>
      {open && <FullscreenPreview onClose={() => { setOpen(false); trigger.current?.focus() }} />}
    </>
  )
}

function FullscreenPreview({ onClose }: { onClose: () => void }) {
  const { previewProfile } = useStudio()
  const prefersLight = usePrefersLight()
  const appLang = useAppLang(s => s.lang)
  const [picked, setLang] = useState<ProfileLang | null>(null)
  const close = useRef<HTMLButtonElement>(null)
  const t = useStudioT().preview

  useEffect(() => {
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return createPortal(
    <div className="st-fullscreen" role="dialog" aria-modal="true" aria-label={t.title}>
      <button ref={close} type="button" className="st-fullscreen-close" onClick={onClose} aria-label={t.exitFullscreen}>
        <X size={20} aria-hidden="true" />
      </button>
      <ProfileView profile={previewProfile} lang={picked ?? appLang} onLang={setLang}
        style={themeVars(previewProfile.theme, prefersLight)} onToast={() => undefined} toast={null} preview />
    </div>,
    document.body,
  )
}
