import { ArrowUpRight, Music2 } from 'lucide-react'
import { Huella } from '@/design/components/Huella'
import { tr } from '../lib/profileI18n'
import { LISTEN_PLATFORM_NAME, readListenLinks } from '../lib/listenOn'
import { safeHref } from '../lib/safeUrl'
import { supportListenStrings } from '../lib/supportListenI18n'
import type { ModuleProps } from './ProfileModules'
import { SafeImage } from './SafeImage'
import { useProfileModule } from './profileModuleContext'
import './supportListen.css'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * "Escuchá en" (V1.1): una canción o un disco con un botón por plataforma. Son links comunes: no se carga ningún
 * reproductor ni ícono de terceros. Sin portada, va la huella del perfil.
 */
export function ListenOnModule({ module, lang, onAction }: ModuleProps) {
  const t = supportListenStrings(lang)
  const huella = useProfileModule()
  const links = readListenLinks(module.content.links)
  if (!links.length) return null

  const title = tr(module.title, module.translations, 'title', lang) || LISTEN_PLATFORM_NAME[links[0].platform]
  const artist = str(module.content.artist).trim()
  const cover = safeHref(module.content.cover_url)
  const headingId = `listen-${module.id}`
  const art = huella
    ? <span className="mp-listen-huella"><Huella seed={huella.seed} variant={huella.variant} /></span>
    : <Music2 size={32} />

  return (
    <section className="mp-card mp-listen" aria-labelledby={headingId}>
      <div className="mp-listen-head">
        <div className="mp-listen-cover" aria-hidden="true">
          {cover ? <SafeImage src={cover} alt="" loading="lazy" fallback={art} /> : art}
        </div>
        <div className="mp-listen-meta">
          <h2 id={headingId} className="mp-listen-title">{title}</h2>
          {artist && <p className="mp-listen-artist">{artist}</p>}
        </div>
      </div>
      <ul className="mp-listen-links">
        {links.map(l => {
          const name = LISTEN_PLATFORM_NAME[l.platform]
          return (
            <li key={l.platform}>
              <a className="mp-listen-link" href={l.url} target="_blank" rel="noopener noreferrer"
                aria-label={t.listenOn.replace('{platform}', name)} onClick={() => onAction(module.id, l.platform)}>
                <Music2 size={18} aria-hidden="true" className="mp-listen-icon" />
                <span className="mp-listen-name" translate="no">{name}</span>
                <ArrowUpRight size={18} aria-hidden="true" className="mp-listen-arrow" />
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
