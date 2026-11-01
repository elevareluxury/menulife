import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowUpRight, ChevronDown, Clock, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react'
import type { ProfileLang, ProfileModule, WeekSchedule } from '../lib/profileTypes'
import { tr, trLabel, ui } from '../lib/profileI18n'
import { isExternal, safeHref, telHref, whatsappHref } from '../lib/safeUrl'
import { todayKey, WEEK_DAYS } from '../lib/schedule'
import { urlKey } from '../lib/clickKeys'
import { formatPrice } from '../lib/price'
import { SocialIcon } from './SocialIcon'
import { SafeImage } from './SafeImage'
// El visor baja recién cuando alguien abre una foto
const Lightbox = lazy(() => import('./Lightbox').then(m => ({ default: m.Lightbox })))
import { richText } from '../lib/richText'
import { cleanBranches, type Branch } from '../lib/branches'
import { mapLinks } from '../lib/mapLinks'
const Branches = lazy(() => import('./Branches').then(m => ({ default: m.Branches })))
import { NETWORK_LABELS, networkFromUrl } from '../lib/networks'

export interface ModuleProps {
  module: ProfileModule
  lang: ProfileLang
  /** Toque en un botón del módulo; `item` = clave del botón cuando el módulo tiene varios (lib/clickKeys) */
  onAction: (moduleId: string, item?: string) => void
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function linkProps(href: string) {
  return isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}

// ── Link ────────────────────────────────────────────────────────────────────

export function LinkModule({ module, lang, onAction }: ModuleProps) {
  const href = safeHref(module.content.url)
  if (!href) return null
  const title = tr(module.title, module.translations, 'title', lang) || href
  const subtitle = tr(str(module.content.subtitle), module.translations, 'subtitle', lang)
  const image = safeHref(module.content.image_url)
  // Sin red elegida (link común): se reconoce por el dominio (Instagram, YouTube, WhatsApp…); si no, la inicial
  const savedType = str(module.content.link_type)
  const linkType = !savedType || savedType === 'custom' || savedType === 'website' ? networkFromUrl(href) || savedType : savedType

  // Estilo "tarjeta": foto grande arriba, título abajo
  if (module.content.style === 'card' && image) {
    return (
      <a className="mp-link-card" href={href} {...linkProps(href)} onClick={() => onAction(module.id)}>
        <SafeImage className="mp-link-card-img" sizing="column" src={image} alt="" loading="lazy" />
        <span className="mp-link-card-body">
          <span className="mp-link-title">{title}</span>
          {subtitle && <span className="mp-link-sub" style={{ whiteSpace: 'normal' }}>{subtitle}</span>}
        </span>
      </a>
    )
  }

  return (
    <LinkRow href={href} title={title} subtitle={subtitle} image={image} linkType={linkType}
      highlight={module.content.style === 'highlight'} onClick={() => onAction(module.id)} />
  )
}

/** Link sin red reconocida (web suelta): la inicial del título sobre el acento, no la misma cadenita en todos */
const isGenericLink = (type?: string) => !type || type === 'website' || type === 'link' || type === 'custom'
function LinkGlyph({ type, title }: { type?: string; title: string }) {
  if (!isGenericLink(type)) return <SocialIcon network={type ?? ''} />
  const initial = Array.from(title.replace(/^https?:\/\/(www\.)?/i, '').trim())[0]?.toLocaleUpperCase() ?? ''
  return initial ? <span aria-hidden="true">{initial}</span> : <SocialIcon network={type ?? ''} />
}

/** Fila de link: ícono o miniatura, título, detalle y flecha. `highlight` = link destacado (color de acento). */
function LinkRow({ href, title, subtitle, image, linkType, highlight, onClick }: {
  href: string; title: string; subtitle?: string; image?: string | null; linkType?: string; highlight?: boolean; onClick: () => void
}) {
  return (
    <a className={`mp-link${highlight ? ' is-highlight' : ''}`} href={href} {...linkProps(href)} onClick={onClick}>
      <span className={`mp-link-icon${!image && isGenericLink(linkType) ? ' is-initial' : ''}`}>
        {image
          ? <SafeImage sizing="thumb" src={image} alt="" loading="lazy" fallback={<LinkGlyph type={linkType} title={title} />} />
          : <LinkGlyph type={linkType} title={title} />}
      </span>
      <span className="mp-link-body">
        <span className="mp-link-title">{title}</span>
        {subtitle && <span className="mp-link-sub">{subtitle}</span>}
      </span>
      <ArrowUpRight className="mp-link-arrow" size={18} aria-hidden="true" />
    </a>
  )
}

// ── Grupo de links (Fase 7) ─────────────────────────────────────────────────

interface LinkItem { title?: string; url?: string; subtitle?: string }

export function LinkGroupModule({ module, lang, onAction }: ModuleProps) {
  const items = (Array.isArray(module.content.items) ? module.content.items as LinkItem[] : [])
    .map(i => ({ ...i, href: safeHref(i?.url) }))
    .filter((i): i is LinkItem & { href: string } => !!i.href && !!str(i.title))
  if (!items.length) return null
  const heading = tr(module.title, module.translations, 'title', lang)
  // Títulos cortos y sin detalle: de a dos por fila (una lista larga de "Etsy", "Behance"… se lee peor)
  const grid = items.length >= 4 && items.every(i => Array.from(str(i.title)).length <= 14 && !str(i.subtitle))
  const rows = (
    <div className={`mp-link-group-rows${grid ? ' is-grid' : ''}`}>
      {items.map((i, n) => (
        <LinkRow key={i.href + n} href={i.href} title={str(i.title)} subtitle={str(i.subtitle)} linkType={networkFromUrl(i.href)}
          onClick={() => onAction(module.id, urlKey(i.url))} />
      ))}
    </div>
  )
  // Plegable (lo elige el dueño): el título abre y cierra la lista; sin título, "Links"
  if (module.content.collapse === 'folded') {
    return (
      <details className="mp-link-group is-folding">
        <summary className="mp-card-title mp-link-group-title">
          <span>{heading || ui(lang).links}</span>
          <span className="mp-link-group-count">{items.length}</span>
          <ChevronDown size={18} aria-hidden="true" className="mp-link-group-chevron" />
        </summary>
        {rows}
      </details>
    )
  }
  return (
    <section className="mp-link-group" aria-label={heading || ui(lang).links}>
      {heading && <h2 className="mp-card-title mp-link-group-title">{heading}</h2>}
      {rows}
    </section>
  )
}

// ── Social (se agrupan las redes consecutivas en una fila) ───────────────────

/** "@usuario" para mostrar debajo del ícono (WhatsApp y links largos muestran el nombre de la red) */
function socialHandleLabel(network: string, handle: string): string {
  const h = handle.trim()
  if (!h || network === 'whatsapp' || /[/\s]/.test(h) || /^https?:/i.test(h)) return NETWORK_LABELS[network] ?? network
  return h.startsWith('@') ? h : `@${h}`
}

export function SocialRow({ modules, lang, onAction }: { modules: ProfileModule[]; lang: ProfileLang; onAction: (id: string) => void }) {
  const items = modules
    .map(m => ({ m, href: safeHref(m.content.url), network: str(m.content.network) }))
    .filter((x): x is { m: ProfileModule; href: string; network: string } => !!x.href)
  if (!items.length) return null
  // Con más de 6 redes, filas parejas (4 y 4, no 6 y 2); sin scroll de costado en la página pública
  const rowsNeeded = Math.ceil(items.length / 6)
  const cols = Math.ceil(items.length / rowsNeeded)
  const withHandle = items.some(x => x.m.content.show_handle === 'yes')
  return (
    <nav className={`mp-socials${withHandle ? ' has-handles' : ''}`} aria-label={ui(lang).socials}
      style={items.length > 6 ? { gridTemplateColumns: `repeat(${cols}, auto)` } : undefined} data-many={items.length > 6 || undefined}>
      {items.map(({ m, href, network }) => {
        const name = NETWORK_LABELS[network] ?? m.title ?? network
        const handle = withHandle ? socialHandleLabel(network, str(m.content.handle)) : ''
        return (
          <a key={m.id} className="mp-social" href={href} {...linkProps(href)}
            aria-label={handle && handle !== name ? `${name} ${handle}` : name}
            onClick={() => onAction(m.id)}>
            <span className="mp-social-ico"><SocialIcon network={network} /></span>
            {handle && <span className="mp-social-handle" aria-hidden="true">{handle}</span>}
          </a>
        )
      })}
    </nav>
  )
}

// ── Contact ─────────────────────────────────────────────────────────────────

export function ContactModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const email = str(module.content.email)
  const phone = str(module.content.phone)
  const whatsapp = str(module.content.whatsapp)
  // Botones grandes con ícono (como la ficha de un contacto en el celular); el número o el email completo queda en
  // el nombre accesible y en el globito del mouse
  const rows = [
    whatsapp && whatsappHref(whatsapp) && { key: 'whatsapp', icon: <MessageCircle size={22} />, label: 'WhatsApp', detail: 'WhatsApp', href: whatsappHref(whatsapp)! },
    phone && telHref(phone) && { key: 'phone', icon: <Phone size={22} />, label: t.call, detail: `${t.call}: ${phone}`, href: telHref(phone)! },
    email && { key: 'email', icon: <Mail size={22} />, label: t.emailLabel, detail: `${t.emailLabel}: ${email}`, href: `mailto:${email}` },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; label: string; detail: string; href: string }[]
  if (!rows.length) return null

  return (
    <section className="mp-card" aria-label={t.contact}>
      <h2 className="mp-card-title">{trLabel(module.title, lang) || t.contact}</h2>
      <div className="mp-contact-grid" data-count={rows.length}>
        {rows.map(r => (
          <a key={r.href} className="mp-contact-btn" href={r.href} {...linkProps(r.href)} aria-label={r.detail} title={r.detail}
            onClick={() => onAction(module.id, r.key)}>
            <span className="mp-contact-ico" aria-hidden="true">{r.icon}</span><span>{r.label}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

// ── Location ────────────────────────────────────────────────────────────────

export function LocationModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const address = str(module.content.address)
  const city = str(module.content.city)
  const full = [address, city].filter(Boolean).join(', ')
  const own = safeHref(module.content.maps_url)
  const branches = cleanBranches(module.content.branches)
  if (!full && !own && !branches.length) return null
  const title = trLabel(module.title, lang) || t.location

  // Varias sucursales: lista con "Ver la más cerca" (chunk propio)
  if (branches.length) {
    const places: Branch[] = [
      ...(full || own ? [{ name: str(module.content.name), address, city, maps_url: own ?? '' }] : []),
      ...branches,
    ]
    return (
      <section className="mp-card" aria-label={title}>
        <h2 className="mp-card-title">{title}</h2>
        <Suspense fallback={<div className="mp-branches-wait" style={{ minHeight: places.length * 76 }} />}>
          <Branches places={places} lang={lang} onOpen={() => onAction(module.id)} />
        </Suspense>
      </section>
    )
  }

  const apps = mapLinks(full, own)
  return (
    <section className="mp-card" aria-label={t.location}>
      <h2 className="mp-card-title">{title}</h2>
      <div className="mp-row-list">
        {full && <div className="mp-row"><MapPin size={18} /><span>{full}</span></div>}
        <div className="mp-row mp-maps">
          <Navigation size={18} aria-hidden="true" />
          <span className="mp-maps-label">{t.howToGet}</span>
          <span className="mp-maps-apps">
            {apps.map(a => (
              <a key={a.key} className="mp-maps-app" href={a.href} target="_blank" rel="noopener noreferrer"
                aria-label={`${t.howToGet}: ${a.label}`} onClick={() => onAction(module.id)}>{a.label}</a>
            ))}
          </span>
        </div>
      </div>
    </section>
  )
}

// ── Text / Image ────────────────────────────────────────────────────────────

export function TextModule({ module, lang }: ModuleProps) {
  const title = tr(module.title, module.translations, 'title', lang)
  const body = tr(str(module.content.body), module.translations, 'body', lang)
  const image = safeHref(module.content.image_url)
  const [imageFailed, setImageFailed] = useState(false)
  if (!title && !body && !image) return null
  const showImage = !!image && !imageFailed
  if (!title && !body && !showImage) return null
  const text = (title || body) && (
    <>
      {title && <h2 className="mp-text-heading">{title}</h2>}
      {body && richText(body)}
    </>
  )
  // Con foto: la foto ocupa todo el ancho de la tarjeta (en cualquier estructura) y el texto va debajo con su margen
  if (showImage) {
    return (
      <article className="mp-card mp-card-media">
        <SafeImage className="mp-text-image" sizing="column" src={image!} alt="" loading="lazy" onFail={() => setImageFailed(true)} />
        {text && <div className="mp-card-media-body">{text}</div>}
      </article>
    )
  }
  return <article className="mp-card">{text}</article>
}

/** Proporción de una foto suelta: muy alta se recorta a 4:5 (como en las redes), chica no se agranda */
type ImageShape = 'normal' | 'tall' | 'small'
const imageShape = (img: HTMLImageElement): ImageShape =>
  img.naturalWidth < 320 && img.naturalHeight < 320 ? 'small' : img.naturalHeight / Math.max(1, img.naturalWidth) > 1.25 ? 'tall' : 'normal'

export function ImageModule({ module, lang }: ModuleProps) {
  const src = safeHref(module.content.url)
  const [failed, setFailed] = useState(false)
  const [shape, setShape] = useState<ImageShape>('normal')
  const [viewing, setViewing] = useState(false)
  // Una foto que ya no existe no deja un ícono roto: el bloque no se muestra
  if (!src || failed) return null
  const caption = tr(str(module.content.caption), module.translations, 'caption', lang)
  const alt = str(module.content.alt) || caption
  const over = !!caption && module.content.caption_style === 'over'
  const t = ui(lang)
  return (
    <figure className={`mp-card mp-image-card${over ? ' is-caption-over' : ''}`} style={{ padding: 0, margin: 0 }}>
      {/* Tocar la foto la abre a pantalla completa (el mismo visor que la galería) */}
      <button type="button" className="mp-image-open" aria-label={alt || t.gallery} onClick={() => setViewing(true)}>
        <SafeImage className={`mp-image mp-image-${shape}`} sizing="column" src={src} alt={alt} loading="lazy"
          onLoad={e => setShape(imageShape(e.currentTarget))} onFail={() => setFailed(true)} />
      </button>
      {caption && <figcaption className="mp-image-caption">{caption}</figcaption>}
      {viewing && (
        <Suspense fallback={null}><Lightbox items={[{ url: src, caption }]} index={0} onIndex={() => undefined} onClose={() => setViewing(false)}
          labels={{ close: t.close, prev: t.prevPhoto, next: t.nextPhoto }} /></Suspense>
      )}
    </figure>
  )
}

// ── Featured action / Product ───────────────────────────────────────────────

export function FeaturedActionModule({ module, lang, onAction }: ModuleProps) {
  const href = safeHref(module.content.url)
  const label = tr(str(module.content.label) || module.title, module.translations, 'label', lang)
  const subtitle = tr(str(module.content.subtitle), module.translations, 'subtitle', lang)
  if (!href || !label) return null
  return (
    <a className={`mp-featured${subtitle ? ' has-sub' : ''}`} href={href} {...linkProps(href)} onClick={() => onAction(module.id)}>
      <span className="mp-featured-text">
        <span>{label}</span>
        {subtitle && <small className="mp-featured-sub">{subtitle}</small>}
      </span>
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  )
}

export function ProductModule({ module, lang, onAction }: ModuleProps) {
  const name = tr(str(module.content.name) || module.title, module.translations, 'name', lang)
  const description = tr(str(module.content.description), module.translations, 'description', lang)
  const image = safeHref(module.content.image_url)
  const tag = tr(str(module.content.tag), module.translations, 'tag', lang)
  const price = typeof module.content.price === 'number' ? module.content.price : null
  const ctaHref = safeHref(module.content.cta_url)
  const ctaText = tr(str(module.content.cta_text), module.translations, 'cta_text', lang)
  if (!name) return null

  return (
    <article className="mp-card">
      <div className={`mp-product${image ? ' has-image' : ''}`}>
        {image && (
          <span className="mp-product-media">
            <SafeImage sizing="thumb" src={image} alt="" loading="lazy" />
            {tag && <span className="mp-product-tag is-over">{tag}</span>}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          {tag && !image && <span className="mp-product-tag">{tag}</span>}
          <h2 className="mp-product-name">{name}</h2>
          {description && <p className="mp-product-desc">{description}</p>}
          {price != null && (
            <span className="mp-product-price">
              {formatPrice(price, str(module.content.currency), lang)}
            </span>
          )}
        </div>
      </div>
      {ctaHref && ctaText && (
        <a className="mp-featured mp-product-cta" href={ctaHref} {...linkProps(ctaHref)}
          onClick={() => onAction(module.id)}>
          {ctaText}
        </a>
      )}
    </article>
  )
}

// ── Gallery ─────────────────────────────────────────────────────────────────

interface GalleryItem { url: string; type?: string; caption?: string; thumbnail_url?: string }

const isVideo = (item: GalleryItem) => item.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(item.url)

export function GalleryModule({ module, lang }: ModuleProps) {
  const t = ui(lang)
  const [open, setOpen] = useState<number | null>(null)
  // Fotos que no cargaron: se sacan de la grilla y del visor
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set())
  const items = (Array.isArray(module.content.items) ? module.content.items : [])
    .filter((i): i is GalleryItem => !!i && typeof (i as GalleryItem).url === 'string' && !!safeHref((i as GalleryItem).url))
    .filter(i => !broken.has(i.url))

  if (!items.length) return null

  return (
    <section className="mp-card" aria-label={t.gallery}>
      <h2 className="mp-card-title">{trLabel(module.title, lang) || t.gallery}</h2>
      {/* Estilo revista: la primera grande. Según cuántas fotos haya, la primera ocupa 2×2 o toda la fila (y con
          resto 2, la última va de a dos), así la grilla siempre cierra sin huecos */}
      <div className={`mp-gallery${items.length >= 3 ? ` is-mag-${items.length % 3}` : ''}`}>
        {items.map((item, i) => {
          const thumb = safeHref(item.thumbnail_url) ?? (isVideo(item) ? null : item.url)
          return (
            <button key={item.url + i} type="button" onClick={() => setOpen(i)}
              aria-label={item.caption || `${t.gallery} ${i + 1}`}>
              {thumb
                ? <SafeImage sizing="third" src={thumb} alt="" loading="lazy" onFail={() => setBroken(b => new Set(b).add(item.url))} />
                : <video src={item.url} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </button>
          )
        })}
      </div>
      {open != null && (
        <Suspense fallback={null}><Lightbox items={items.map(i => ({ url: i.url, caption: i.caption, video: isVideo(i) }))} index={open} onIndex={setOpen}
          onClose={() => setOpen(null)} labels={{ close: ui(lang).close, prev: t.prevPhoto, next: t.nextPhoto }} /></Suspense>
      )}
    </section>
  )
}

// ── Testimonials ────────────────────────────────────────────────────────────

interface Review { author_name?: string; rating?: number; text?: string }

/** Número que cuenta hasta su valor la primera vez que se ve (decorativo: el valor lo dicen las estrellas) */
function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  const animate = typeof IntersectionObserver !== 'undefined' && typeof window !== 'undefined'
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(animate ? 0 : value)
  useEffect(() => {
    const el = ref.current
    if (!el || !animate) return
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 900)
        setShown(value * (1 - Math.pow(1 - k, 3)))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [animate, value])
  return <strong ref={ref} className={className} aria-hidden="true">{shown.toFixed(1)}</strong>
}

/** Siempre 5 estrellas (las que faltan, tenues): la fila no se corre y se entiende "4 de 5" de un vistazo */
function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span className="mp-stars" role="img" aria-label={`${rating} / 5`}>
      {[0, 1, 2, 3, 4].map(i => <span key={i} aria-hidden="true" className={i < full ? undefined : 'is-off'}>★</span>)}
    </span>
  )
}

export function TestimonialsModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const items = (Array.isArray(module.content.items) ? module.content.items : []) as Review[]
  const google = (module.content.google ?? null) as { rating?: number; count?: number; url?: string } | null
  const googleHref = safeHref(google?.url)
  if (!items.length && !google?.rating) return null

  return (
    <section className="mp-card" aria-label={t.reviews}>
      <h2 className="mp-card-title">{trLabel(module.title, lang) || t.reviews}</h2>
      {google?.rating != null && (
        <div className={`mp-rating${items.length ? ' has-items' : ''}`}>
          <CountUp className="mp-rating-value" value={google.rating} />
          <div className="mp-rating-meta">
            <Stars rating={google.rating} />
            {google.count ? <span>{google.count} {t.reviewsCount}</span> : null}
          </div>
          {googleHref && (
            <a className="mp-btn-ghost mp-rating-link" href={googleHref}
              target="_blank" rel="noopener noreferrer" onClick={() => onAction(module.id)}>
              {t.seeOnGoogle}
            </a>
          )}
        </div>
      )}
      {items.map((r, i) => (
        <div key={i} className="mp-review">
          <div className="mp-review-head">
            <span>{r.author_name}</span>
            {r.rating ? <Stars rating={r.rating} /> : null}
          </div>
          {r.text && <p>{r.text}</p>}
        </div>
      ))}
    </section>
  )
}

// ── Hours ───────────────────────────────────────────────────────────────────

/** Agrupa días seguidos con el mismo horario (en el orden de la semana) */
function hourGroups(schedule: WeekSchedule, closed: string) {
  const groups: { days: (typeof WEEK_DAYS)[number][]; value: string }[] = []
  for (const day of WEEK_DAYS) {
    const slot = schedule[day]
    const value = !slot || slot.closed || !slot.open || !slot.close ? closed : `${slot.open} – ${slot.close}`
    const last = groups[groups.length - 1]
    if (last && last.value === value) last.days.push(day)
    else groups.push({ days: [day], value })
  }
  return groups
}

export function HoursModule({ module, lang }: ModuleProps) {
  const t = ui(lang)
  const schedule = (module.content.schedule ?? null) as WeekSchedule | null
  const timezone = str(module.content.timezone) || null
  if (!schedule) return null
  const today = todayKey(timezone)

  return (
    <section className="mp-card" aria-label={t.hours}>
      <h2 className="mp-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={14} aria-hidden="true" /> {trLabel(module.title, lang) || t.hours}
      </h2>
      {/* Días seguidos con el mismo horario van juntos ("Mar – Dom · Cerrado"); el grupo de hoy, resaltado */}
      <dl className="mp-hours" style={{ margin: 0 }}>
        {hourGroups(schedule, t.closed).map(g => {
          const cls = g.days.includes(today as typeof g.days[number]) ? 'is-today' : undefined
          const first = g.days[0]
          const last = g.days[g.days.length - 1]
          const label = g.days.length === 1 ? t.days[first] : `${t.days[first]} – ${t.days[last]}`
          return [
            <dt key={first + '-d'} className={cls}>{label}</dt>,
            <dd key={first + '-h'} className={cls}>{g.value}</dd>,
          ]
        })}
      </dl>
    </section>
  )
}

// ── Cards: tarjetas con foto (eventos, productos…), deslizables o apiladas ──

export interface CardItem {
  image_url?: string
  title?: string
  subtitle?: string
  date?: string
  /** Hora del evento HH:MM (diseño Flyers) */
  time?: string
  url?: string
  /** Traducciones por tarjeta: { en: { title, subtitle } } */
  en?: { title?: string; subtitle?: string }
}

const dateLocale = (lang: ProfileLang) => (lang === 'es' ? 'es-AR' : lang === 'en' ? 'en-US' : lang)

/** Fecha del flyer en partes (VIE · 14 · NOV); null si no hay fecha o no es válida */
function ticketDate(date: string | undefined, lang: ProfileLang) {
  if (!date) return null
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(dateLocale(lang), o).replace('.', '')
  return { weekday: part({ weekday: 'short' }), day: part({ day: 'numeric' }), month: part({ month: 'short' }) }
}

/**
 * Diseño Flyers (tickets): entradas que se deslizan de a uno, centradas. Arriba fecha, hora, título y lugar; en el
 * medio el flyer entero (9:16, sin recortes); abajo un talón troquelado con el botón "Entradas" (si hay link).
 * Coverflow (la del centro al frente, las de los costados giradas), entrada escalonada y brillo al quedar al frente.
 * Puntos abajo para saber cuántas hay y saltar a una.
 */
function TicketCards({ module, lang, onAction, items }: ModuleProps & { items: CardItem[] }) {
  const heading = tr(module.title, module.translations, 'title', lang)
  const t = ui(lang)
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = track.current
    if (!el) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const cards = Array.from(el.children) as HTMLElement[]
        const center = el.scrollLeft + el.clientWidth / 2
        let best = 0
        cards.forEach((c, i) => {
          if (Math.abs(c.offsetLeft + c.offsetWidth / 2 - center) < Math.abs(cards[best].offsetLeft + cards[best].offsetWidth / 2 - center)) best = i
        })
        setActive(best)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])

  const goTo = (i: number) => {
    const el = track.current
    const card = el?.children[i] as HTMLElement | undefined
    if (!el || !card) return
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: 'smooth' })
  }

  // Entrada: las tarjetas suben una tras otra cuando la sección aparece en pantalla
  const section = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = section.current
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={section} className={`mp-tix${shown ? ' is-in' : ''}`} aria-label={heading || t.cards}>
      {heading && <h2 className="mp-card-title mp-section-title">{heading}</h2>}
      <div ref={track} className="mp-tix-track" tabIndex={0} role="region" aria-label={`${heading || t.cards} — ${t.swipeHint}`}>
        {items.map((item, i) => {
          const href = safeHref(item.url)
          const img = safeHref(item.image_url)
          const title = (lang === 'en' && item.en?.title) || item.title || ''
          const subtitle = (lang === 'en' && item.en?.subtitle) || item.subtitle || ''
          const when = ticketDate(item.date, lang)
          const body = (
            <>
              {/* Arriba: fecha, título y lugar · el flyer entero (sin recortes: si no es 9:16, el fondo es el mismo flyer difuminado) */}
              <div className="mp-tix-top">
                <div className="mp-tix-head">
                  {(when || item.time) && (
                    <span className="mp-tix-when">
                      {[when && `${when.weekday} ${when.day} ${when.month}`, item.time].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {title && <span className="mp-tix-title">{title}</span>}
                  {subtitle && <span className="mp-tix-sub"><MapPin size={13} aria-hidden="true" />{subtitle}</span>}
                </div>
                <div className="mp-tix-flyer">
                  {img
                    ? <>
                        <SafeImage className="mp-tix-backdrop" sizing="column" src={img} alt="" aria-hidden="true" loading={i < 2 ? 'eager' : 'lazy'} />
                        <SafeImage className="mp-tix-img" sizing="column" src={img} alt={title} loading={i < 2 ? 'eager' : 'lazy'} />
                      </>
                    : <span className="mp-tix-blank" aria-hidden="true">{title}</span>}
                  <span className="mp-tix-sheen" aria-hidden="true" />
                </div>
              </div>
              {/* Abajo: el talón troquelado con el botón de entradas */}
              {href && (
                <div className="mp-tix-stub">
                  <span className="mp-tix-cta">{t.tickets} <ArrowUpRight size={17} aria-hidden="true" /></span>
                </div>
              )}
            </>
          )
          const pos = i === active ? ' is-active' : i < active ? ' is-before' : ' is-after'
          const cls = `mp-tix-card${pos}${href ? ' has-stub' : ''}`
          // --i: orden para la entrada escalonada
          const style = { '--i': i } as CSSProperties
          return href
            ? <a key={i} className={cls} style={style} href={href} {...linkProps(href)} onClick={() => onAction(module.id, urlKey(item.url))}>{body}</a>
            : <article key={i} className={cls} style={style}>{body}</article>
        })}
      </div>
      {items.length > 1 && (
        <div className="mp-tix-dots">
          {items.map((item, i) => (
            <button key={i} type="button" data-touch-exempt className={i === active ? 'is-active' : undefined} aria-current={i === active || undefined}
              aria-label={`${i + 1} / ${items.length}${item.title ? ` · ${item.title}` : ''}`} onClick={() => goTo(i)} />
          ))}
        </div>
      )}
    </section>
  )
}

function formatCardDate(date: string, lang: ProfileLang): string {
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function CardsModule({ module, lang, onAction }: ModuleProps) {
  const items = (Array.isArray(module.content.items) ? module.content.items : []) as CardItem[]
  const visible = items.filter(i => i && (i.title || i.image_url))
  if (!visible.length) return null
  if (module.content.layout === 'tickets') return <TicketCards module={module} lang={lang} onAction={onAction} items={visible} />
  const layout = module.content.layout === 'stack' ? 'stack' : 'carousel'
  const heading = tr(module.title, module.translations, 'title', lang)

  return (
    <section aria-label={heading || ui(lang).cards}>
      {heading && <h2 className="mp-card-title mp-section-title">{heading}</h2>}
      <div className={layout === 'carousel' ? 'mp-cards-carousel' : 'mp-cards-stack'}
        tabIndex={layout === 'carousel' ? 0 : undefined}
        role={layout === 'carousel' ? 'region' : undefined}
        aria-label={layout === 'carousel' ? `${heading || ui(lang).cards} — ${ui(lang).swipeHint}` : undefined}>
        {visible.map((item, i) => {
          const href = safeHref(item.url)
          const title = (lang === 'en' && item.en?.title) || item.title || ''
          const subtitle = (lang === 'en' && item.en?.subtitle) || item.subtitle || ''
          const body = (
            <>
              {safeHref(item.image_url) && <SafeImage className="mp-cards-img" sizing="column" src={safeHref(item.image_url)!} alt="" loading="lazy" />}
              <div className="mp-cards-body">
                {item.date && <span className="mp-cards-date">{formatCardDate(item.date, lang)}</span>}
                {title && <span className="mp-cards-title">{title}</span>}
                {subtitle && <span className="mp-cards-sub">{subtitle}</span>}
              </div>
            </>
          )
          return href
            ? <a key={i} className="mp-cards-item" href={href} {...linkProps(href)} onClick={() => onAction(module.id, urlKey(item.url))}>{body}</a>
            : <article key={i} className="mp-cards-item">{body}</article>
        })}
      </div>
    </section>
  )
}
