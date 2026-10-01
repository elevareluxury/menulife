import { useState } from 'react'
import { ExternalLink, Monitor, Smartphone } from 'lucide-react'
import { ProfileView } from '@/modules/profile/components/ProfileView'
import { themeVars } from '@/modules/profile/lib/profileTheme'
import type { ProfileLang } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'

/** Vista previa en vivo: se actualiza mientras se edita (no registra visitas). */
export function LivePreview({ device = 'mobile' }: { device?: 'mobile' | 'desktop' }) {
  const { previewProfile } = useStudio()
  const [lang, setLang] = useState<ProfileLang>('es')
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
  return (
    <aside className="st-preview-pane" aria-label="Vista previa">
      <div className="st-row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <span className="st-label">Vista previa en vivo</span>
        <a className="st-btn st-btn-ghost st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> Abrir
        </a>
      </div>
      <LivePreview />
    </aside>
  )
}

/** Página de vista previa (móvil) con selector de dispositivo. */
export function PreviewSwitcher() {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  return (
    <div className="st-stack" style={{ alignItems: 'center' }}>
      <div className="st-segment" role="group" aria-label="Dispositivo">
        <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
          <Smartphone size={14} aria-hidden="true" /> Móvil
        </button>
        <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
          <Monitor size={14} aria-hidden="true" /> Escritorio
        </button>
      </div>
      <div style={{ width: device === 'mobile' ? 'min(100%, 380px)' : '100%' }}>
        <LivePreview device={device} />
      </div>
    </div>
  )
}
