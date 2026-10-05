import type { ComponentType } from 'react'
import type { BlockImage, BlockType, CreditItem, ProjectBlock } from '../lib/projectTypes'
import type { ProfileLang } from '../lib/profileTypes'
import { tr, ui } from '../lib/profileI18n'
import { safeHref } from '../lib/safeUrl'
import { parseVideoUrl } from '../lib/video'
import { SafeImage } from './SafeImage'

// Cómo se dibuja cada bloque de un proyecto. Registro `Record<BlockType, …>`: un bloque nuevo
// obliga a definir su vista (y su editor en Studio, `studio/lib/blockCatalog.ts`).

interface BlockProps { block: ProjectBlock; lang: ProfileLang }

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const text = (b: ProjectBlock, field: string, lang: ProfileLang) => tr(str(b.data[field]), b.translations, field, lang)

function images(v: unknown): BlockImage[] {
  return (Array.isArray(v) ? v : []).filter((i): i is BlockImage => !!i && !!safeHref((i as BlockImage).url))
}

const VIEWS: Record<BlockType, ComponentType<BlockProps>> = {
  heading: ({ block, lang }) => {
    const t = text(block, 'text', lang)
    return t ? <h2 className="mp-block-heading">{t}</h2> : null
  },
  paragraph: ({ block, lang }) => {
    const t = text(block, 'text', lang)
    return t ? <p className="mp-block-text">{t}</p> : null
  },
  image: ({ block, lang }) => {
    const src = safeHref(block.data.url)
    if (!src) return null
    const caption = text(block, 'caption', lang)
    return (
      <figure className="mp-block-figure">
        <SafeImage src={src} alt={str(block.data.alt) || caption} loading="lazy" />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    )
  },
  gallery: ({ block }) => {
    const items = images(block.data.items)
    if (!items.length) return null
    return (
      <div className={`mp-block-gallery${items.length === 1 ? ' is-single' : ''}`}>
        {items.map((i, n) => <SafeImage key={i.url + n} src={safeHref(i.url)!} alt={str(i.alt)} loading="lazy" />)}
      </div>
    )
  },
  video: ({ block, lang }) => {
    const video = parseVideoUrl(block.data.url)
    if (!video) return null
    const caption = text(block, 'caption', lang)
    return (
      <figure className="mp-block-figure">
        <div className="mp-block-video">
          <iframe src={video.src} title={caption || ui(lang).video} loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    )
  },
  quote: ({ block, lang }) => {
    const t = text(block, 'text', lang)
    if (!t) return null
    const author = text(block, 'author', lang)
    return (
      <figure className="mp-block-quote">
        <blockquote>{t}</blockquote>
        {author && <figcaption>{author}</figcaption>}
      </figure>
    )
  },
  divider: () => <hr className="mp-block-divider" />,
  credits: ({ block, lang }) => {
    const items = (Array.isArray(block.data.items) ? block.data.items as CreditItem[] : [])
      .filter(i => i && (str(i.role) || str(i.name)))
    if (!items.length) return null
    return (
      <section className="mp-block-credits" aria-label={ui(lang).credits}>
        <h2 className="mp-card-title">{ui(lang).credits}</h2>
        <dl>
          {items.map((i, n) => (
            <div key={n}><dt>{str(i.role)}</dt><dd>{str(i.name)}</dd></div>
          ))}
        </dl>
      </section>
    )
  },
}

export function ProjectBlocks({ blocks, lang }: { blocks: ProjectBlock[]; lang: ProfileLang }) {
  return (
    <div className="mp-blocks">
      {blocks.map(b => {
        const View = (VIEWS as Record<string, ComponentType<BlockProps> | undefined>)[b.type]
        return View ? <View key={b.id} block={b} lang={lang} /> : null
      })}
    </div>
  )
}
