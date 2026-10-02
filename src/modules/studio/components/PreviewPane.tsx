import { useState } from 'react'
import { ExternalLink, Monitor, Smartphone } from 'lucide-react'
import { ProfileView } from '@/modules/profile/components/ProfileView'
import { themeVars } from '@/modules/profile/lib/profileTheme'
import type { ProfileLang } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'
import { useStudioT } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'

/** Vista previa en vivo: se actualiza mientras se edita (no registra visitas). */
export function LivePreview({ device = 'mobile' }: { device?: 'mobile' | 'desktop' }) {
  const { previewProfile } = useStudio()
  const appLang = useAppLang(s => s.lang)
  // La vista previa arranca en el idioma de Studio y se puede cambiar sin afectar la cuenta
  const [picked, setLang] = useState<ProfileLang | null>(null)
  const lang = picked ?? appLang
  return (
    <div className={device === 'mobile' ? 'st-phone' : 'st-desktop-frame'}>
      <div className="st-phone-scroll">
        <ProfileView profile={previewProfile} lang={lang} onLang={setLang}
          style={themeVars(previewProfile.theme)} onToast={() => undefined} toast={null} preview />
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
        <a className="st-btn st-btn-ghost st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> {t.common.open}
        </a>
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
