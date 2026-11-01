import { useState } from 'react'
import { MEDIA_PROVIDER_NAME, parseMediaUrl } from '../lib/media'
import { safeHref } from '../lib/safeUrl'
import { tr, ui } from '../lib/profileI18n'
import type { ModuleProps } from './ProfileModules'
import { PlayerFacade } from './PlayerFacade'

/**
 * Video y música (V1 · etapa 04) con fachada: al abrir el perfil sólo se dibuja un reproductor propio (PlayerFacade)
 * con la portada o la huella del perfil, el título y "Reproducir". El reproductor del proveedor (y cualquier pedido a YouTube, Spotify, etc.) se
 * carga recién cuando el visitante lo toca.
 */
export function MediaModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const [playing, setPlaying] = useState(false)
  const embed = parseMediaUrl(module.content.url)
  if (!embed) return null
  const provider = MEDIA_PROVIDER_NAME[embed.provider]
  // Portada que se guardó en Mycen al cargar el link (Studio): se ve sin conectarse con el proveedor
  const cover = safeHref(module.content.cover_url)
  const title = tr(module.title, module.translations, 'title', lang) || provider
  const video = embed.kind === 'video'
  // Tamaño elegido en Studio (lib/moduleSize): barra de 80 px (Spotify compacto) o video vertical 9:16
  const bar = module.config?.size === 'bar' && embed.provider === 'spotify'
  const vertical = video && module.config?.size === 'vertical'
  const ratio = vertical ? 9 / 16 : embed.ratio
  const height = bar ? 80 : embed.height
  const box = height
    ? { height }
    : { aspectRatio: String(ratio), maxWidth: ratio < 1 ? 340 : undefined, marginInline: ratio < 1 ? 'auto' : undefined }

  return (
    <section className={`mp-card mp-media mp-media-${embed.kind}${bar ? ' mp-media-bar' : ''}`} aria-label={title}>
      {/* Música abierta: el ecualizador y la plataforma arriba del reproductor (decorativo, no dice si está sonando) */}
      {playing && !video && (
        <div className="mp-now" aria-hidden="true"><span className="mp-eq"><i /><i /><i /><i /></span>{provider}</div>
      )}
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
        // Música: la tarjeta mide lo mismo que el reproductor que la reemplaza, así la página no salta al tocar
        <PlayerFacade kind={embed.kind} title={title} provider={provider} playLabel={t.playOn.replace('{provider}', provider)}
          cover={cover} tall={!bar && (height ?? 0) >= 300}
          style={video ? { aspectRatio: String(vertical ? ratio : Math.max(ratio, 16 / 9)) } : height ? { minHeight: height } : undefined}
          onPlay={() => { setPlaying(true); onAction(module.id) }} />
      )}
    </section>
  )
}
