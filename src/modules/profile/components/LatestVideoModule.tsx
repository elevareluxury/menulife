import { useEffect, useState } from 'react'
import { channelQuery, type LatestVideo } from '../lib/latestVideo'
import { loadLatestVideos } from '../lib/latestVideoClient'
import { latestVideoT } from '../lib/latestVideoI18n'
import { parseMediaUrl } from '../lib/media'
import { tr, ui } from '../lib/profileI18n'
import type { ModuleProps } from './ProfileModules'
import { useProfileModule } from './profileModuleContext'
import { PlayerFacade } from './PlayerFacade'
import './LatestVideoModule.css'

/** Lo que respondió el servidor para una consulta (null = sin videos o error) */
type Result = { query: string; videos: LatestVideo[] | null }

/**
 * "Último video" de un canal de YouTube: se actualiza solo (no hace falta volver a publicar). Los datos vienen de la
 * función de Mycen (`/api/youtube-latest`); la fachada es la huella del perfil, sin miniaturas de YouTube, y el
 * reproductor sin cookies se carga recién cuando el visitante toca "Reproducir" (como Video y música).
 */
export function LatestVideoModule({ module, lang, onAction }: ModuleProps) {
  const t = latestVideoT(lang)
  const ctx = useProfileModule()
  const query = channelQuery(module.content)
  const count = module.content.count === 3 ? 3 : 1
  const showTitle = module.content.show_title !== false
  const [result, setResult] = useState<Result | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)

  useEffect(() => {
    if (!query) return
    let alive = true
    loadLatestVideos(query).then(r => {
      if (alive) setResult({ query, videos: r && r.videos.length ? r.videos : null })
    })
    return () => { alive = false }
  }, [query])

  const heading = tr(module.title, module.translations, 'title', lang) || t.heading
  if (!query) return null

  if (!result || result.query !== query) {
    return (
      <section className="mp-card mp-media mp-latest" aria-label={heading} aria-busy="true">
        <div className="mp-latest-skeleton my-pulse" role="status"><span className="mp-latest-sr">{t.loading}</span></div>
      </section>
    )
  }
  if (!result.videos) {
    // En la página pública no se muestra nada; en la vista previa de Studio, una nota para el dueño
    return ctx?.preview ? <section className="mp-card mp-latest-note" aria-label={heading}><p>{t.previewEmpty}</p></section> : null
  }

  const [first, ...rest] = result.videos.slice(0, count)
  const play = (id: string) => { setPlaying(id); onAction(module.id) }
  const label = (v: LatestVideo, n: number) => (showTitle && v.title ? v.title : n === 0 ? heading : `${t.previous} ${n}`)

  return (
    <section className="mp-card mp-media mp-media-video mp-latest" aria-label={heading}>
      <LatestItem video={first} title={label(first, 0)} playing={playing === first.id} onPlay={() => play(first.id)} lang={lang} />
      {rest.length > 0 && (
        <ul className="mp-latest-more">
          {rest.map((v, i) => (
            <li key={v.id}>
              <LatestItem video={v} title={label(v, i + 1)} playing={playing === v.id} onPlay={() => play(v.id)} lang={lang} small />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function LatestItem({ video, title, playing, onPlay, lang, small }: {
  video: LatestVideo
  title: string
  playing: boolean
  onPlay: () => void
  lang: ModuleProps['lang']
  small?: boolean
}) {
  // El iframe se arma con el id validado (YouTube sin cookies), igual que Video y música
  const embed = parseMediaUrl(`https://youtu.be/${video.id}`)
  if (!embed) return null
  if (playing) {
    return (
      <div className="mp-media-frame mp-latest-frame">
        <iframe src={embed.src} title={`${title} (YouTube)`} allow={embed.allow} allowFullScreen loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    )
  }
  return (
    <PlayerFacade kind="video" title={title} provider="YouTube" playLabel={ui(lang).playOn.replace('{provider}', 'YouTube')}
      small={small} onPlay={onPlay} />
  )
}
