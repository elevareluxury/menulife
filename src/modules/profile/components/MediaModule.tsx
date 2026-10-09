import { useState } from 'react'
import { Play } from 'lucide-react'
import { Huella } from '@/design/components/Huella'
import { MEDIA_PROVIDER_NAME, parseMediaUrl } from '../lib/media'
import { tr, ui } from '../lib/profileI18n'
import type { ModuleProps } from './ProfileModules'
import { useProfileHuella } from './profileLookContext'

/**
 * Video y música (V1 · etapa 04) con fachada: al abrir el perfil sólo se dibuja una tarjeta liviana con la huella del
 * perfil, el título y "Reproducir". El reproductor del proveedor (y cualquier pedido a YouTube, Spotify, etc.) se
 * carga recién cuando el visitante lo toca.
 */
export function MediaModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const huella = useProfileHuella()
  const [playing, setPlaying] = useState(false)
  const embed = parseMediaUrl(module.content.url)
  if (!embed) return null
  const provider = MEDIA_PROVIDER_NAME[embed.provider]
  const title = tr(module.title, module.translations, 'title', lang) || provider
  const video = embed.kind === 'video'
  const box = embed.height
    ? { height: embed.height }
    : { aspectRatio: String(embed.ratio), maxWidth: embed.ratio < 1 ? 340 : undefined, marginInline: embed.ratio < 1 ? 'auto' : undefined }

  return (
    <section className={`mp-card mp-media mp-media-${embed.kind}`} aria-label={title}>
      {playing ? (
        <div className="mp-media-frame" style={box}>
          <iframe
            src={embed.src}
            title={`${title} (${provider})`}
            allow={embed.allow}
            allowFullScreen={video}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <button type="button" className="mp-media-facade" style={video ? { aspectRatio: String(Math.max(embed.ratio, 16 / 9)) } : undefined}
          onClick={() => { setPlaying(true); onAction(module.id) }}>
          {huella && (
            <span className="mp-media-art" aria-hidden="true">
              <Huella seed={huella.seed} variant={huella.variant} />
            </span>
          )}
          <span className="mp-media-play" aria-hidden="true"><Play size={22} fill="currentColor" /></span>
          <span className="mp-media-text">
            <span className="mp-media-title">{title}</span>
            <span className="mp-media-provider">{t.playOn.replace('{provider}', provider)}</span>
          </span>
        </button>
      )}
    </section>
  )
}
