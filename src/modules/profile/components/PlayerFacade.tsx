import type { CSSProperties, ReactNode } from 'react'
import { Maximize, Play } from 'lucide-react'
import { Huella } from '@/design/components/Huella'
import { SafeImage } from './SafeImage'
import { useProfileModule } from './profileModuleContext'

/**
 * Fachada de un reproductor (Video y música, "Último video"): se dibuja como un reproductor de verdad, pero es un
 * botón propio; el del proveedor se carga recién al tocarlo. Nombre accesible = título + "Reproducir en …".
 *   video: pantalla oscura (tema Universo con el acento del perfil), título, "Reproducir" grande y barra de controles
 *   music: portada (o la huella del perfil), título, plataforma, línea de progreso en cero y "Reproducir"
 */
export function PlayerFacade({ kind, title, provider, playLabel, cover, style, tall, small, onPlay }: {
  kind: 'video' | 'music'
  title: string
  provider: string
  /** "Reproducir en YouTube" */
  playLabel: string
  /** Portada guardada en Mycen; si no hay o no carga, la huella del perfil */
  cover?: string | null
  style?: CSSProperties
  /** Música alta (disco o lista): portada grande */
  tall?: boolean
  /** Miniatura chica (anteriores de "Último video") */
  small?: boolean
  onPlay: () => void
}) {
  const ctx = useProfileModule()
  const art: ReactNode = ctx ? (
    <span className="mp-media-art" aria-hidden="true"><Huella seed={ctx.seed} variant={ctx.variant} /></span>
  ) : null
  const picture = cover
    ? <SafeImage className="mp-media-cover" sizing="column" src={cover} alt="" loading="lazy" decoding="async" fallback={art} />
    : art

  if (kind === 'video') {
    return (
      <button type="button" className={`mp-media-facade mp-player-video${small ? ' is-small' : ''}`} style={style} onClick={onPlay}
        data-mycen-theme="universo" data-mycen-accent={ctx?.accent}>
        {picture}
        <span className="mp-player-shade" aria-hidden="true" />
        <span className="mp-player-head"><span className="mp-media-title">{title}</span></span>
        <span className="mp-media-play mp-player-big" aria-hidden="true"><Play size={small ? 18 : 26} fill="currentColor" /></span>
        {!small && (
          <span className="mp-player-controls" aria-hidden="true">
            <Play size={14} fill="currentColor" />
            <span className="mp-player-track" />
            <span className="mp-player-brand">{provider}</span>
            <Maximize size={14} />
          </span>
        )}
        <span className="mp-sr-only">{playLabel}</span>
      </button>
    )
  }

  return (
    <button type="button" className={`mp-media-facade mp-player-music${tall ? ' is-tall' : ''}`} style={style} onClick={onPlay}>
      <span className="mp-player-art" aria-hidden="true">{picture}</span>
      <span className="mp-player-info">
        <span className="mp-media-title">{title}</span>
        <span className="mp-media-provider" aria-hidden="true">{provider}</span>
        <span className="mp-player-track" aria-hidden="true" />
      </span>
      <span className="mp-media-play" aria-hidden="true"><Play size={22} fill="currentColor" /></span>
      <span className="mp-sr-only">{playLabel}</span>
    </button>
  )
}
