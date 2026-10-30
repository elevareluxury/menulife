import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock, Mail, MapPin, MessageCircle, Navigation, Phone, X } from 'lucide-react'
import type { ProfileLang, ProfileModule, WeekSchedule } from '../lib/profileTypes'
import { tr, trLabel, ui } from '../lib/profileI18n'
import { isExternal, safeHref, telHref, whatsappHref } from '../lib/safeUrl'
import { todayKey, WEEK_DAYS } from '../lib/schedule'
import { NETWORK_LABELS } from '../lib/networks'
import { urlKey } from '../lib/clickKeys'
import { SocialIcon } from './SocialIcon'
import { SafeImage } from './SafeImage'
import { useScrollLock } from '@/lib/scrollLock'

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
  const linkType = str(module.content.link_type)

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

/** Fila de link: ícono o miniatura, título, detalle y flecha. `highlight` = link destacado (color de acento). */
function LinkRow({ href, title, subtitle, image, linkType, highlight, onClick }: {
  href: string; title: string; subtitle?: string; image?: string | null; linkType?: string; highlight?: boolean; onClick: () => void
}) {
  return (
    <a className={`mp-link${highlight ? ' is-highlight' : ''}`} href={href} {...linkProps(href)} onClick={onClick}>
      <span className="mp-link-icon">
        {image ? <SafeImage sizing="thumb" src={image} alt="" loading="lazy" fallback={<SocialIcon network={linkType ?? ''} />} /> : <SocialIcon network={linkType ?? ''} />}
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
  return (
    <section className="mp-link-group" aria-label={heading || ui(lang).links}>
      {heading && <h2 className="mp-card-title" style={{ padding: '0 4px' }}>{heading}</h2>}
      {items.map((i, n) => (
        <LinkRow key={i.href + n} href={i.href} title={str(i.title)} subtitle={str(i.subtitle)} onClick={() => onAction(module.id, urlKey(i.url))} />
      ))}
    </section>
  )
}

// ── Social (se agrupan las redes consecutivas en una fila) ───────────────────

export function SocialRow({ modules, lang, onAction }: { modules: ProfileModule[]; lang: ProfileLang; onAction: (id: string) => void }) {
  const items = modules
    .map(m => ({ m, href: safeHref(m.content.url), network: str(m.content.network) }))
    .filter((x): x is { m: ProfileModule; href: string; network: string } => !!x.href)
  if (!items.length) return null
  return (
    <nav className="mp-socials" aria-label={ui(lang).socials}>
      {items.map(({ m, href, network }) => (
        <a key={m.id} className="mp-social" href={href} {...linkProps(href)}
          aria-label={NETWORK_LABELS[network] ?? m.title ?? network}
          onClick={() => onAction(m.id)}>
          <SocialIcon network={network} />
        </a>
      ))}
    </nav>
  )
}

// ── Contact ─────────────────────────────────────────────────────────────────

export function ContactModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const email = str(module.content.email)
  const phone = str(module.content.phone)
  const whatsapp = str(module.content.whatsapp)
  const rows = [
    whatsapp && whatsappHref(whatsapp) && { key: 'whatsapp', icon: <MessageCircle size={18} />, label: 'WhatsApp', href: whatsappHref(whatsapp)! },
    phone && telHref(phone) && { key: 'phone', icon: <Phone size={18} />, label: phone, href: telHref(phone)! },
    email && { key: 'email', icon: <Mail size={18} />, label: email, href: `mailto:${email}` },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; label: string; href: string }[]
  if (!rows.length) return null

  return (
    <section className="mp-card" aria-label={t.contact}>
      <h2 className="mp-card-title">{trLabel(module.title, lang) || t.contact}</h2>
      <div className="mp-row-list">
        {rows.map(r => (
          <a key={r.href} className="mp-row" href={r.href} {...linkProps(r.href)} onClick={() => onAction(module.id, r.key)}>
            {r.icon}<span>{r.label}</span>
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
  const maps = safeHref(module.content.maps_url)
    ?? (full ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}` : null)
  if (!full && !maps) return null

  return (
    <section className="mp-card" aria-label={t.location}>
      <h2 className="mp-card-title">{trLabel(module.title, lang) || t.location}</h2>
      <div className="mp-row-list">
        {full && <div className="mp-row"><MapPin size={18} /><span>{full}</span></div>}
        {maps && (
          <a className="mp-row" href={maps} target="_blank" rel="noopener noreferrer" onClick={() => onAction(module.id)}>
            <Navigation size={18} /><span>{t.howToGet}</span>
          </a>
        )}
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
      {body && <p className="mp-text-body">{body}</p>}
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
  // Una foto que ya no existe no deja un ícono roto: el bloque no se muestra
  if (!src || failed) return null
  const caption = tr(str(module.content.caption), module.translations, 'caption', lang)
  return (
    <figure className="mp-card mp-image-card" style={{ padding: 0, margin: 0 }}>
      <SafeImage className={`mp-image mp-image-${shape}`} sizing="column" src={src} alt={str(module.content.alt) || caption} loading="lazy"
        onLoad={e => setShape(imageShape(e.currentTarget))} onFail={() => setFailed(true)} />
      {caption && <figcaption style={{ padding: '12px 16px', fontSize: 14, color: 'var(--p-muted)' }}>{caption}</figcaption>}
    </figure>
  )
}

// ── Featured action / Product ───────────────────────────────────────────────

export function FeaturedActionModule({ module, lang, onAction }: ModuleProps) {
  const href = safeHref(module.content.url)
  const label = tr(str(module.content.label) || module.title, module.translations, 'label', lang)
  if (!href || !label) return null
  return (
    <a className="mp-btn-ghost" href={href} {...linkProps(href)} onClick={() => onAction(module.id)}>
      {label} <ArrowUpRight size={16} aria-hidden="true" />
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
      <div className="mp-product">
        {image && <SafeImage sizing="thumb" src={image} alt="" loading="lazy" />}
        <div style={{ minWidth: 0 }}>
          {tag && <span className="mp-product-tag">{tag}</span>}
          <h2 className="mp-product-name">{name}</h2>
          {description && <p className="mp-product-desc">{description}</p>}
          {price != null && (
            <span className="mp-product-price">
              $ {new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-AR').format(price)}
            </span>
          )}
        </div>
      </div>
      {ctaHref && ctaText && (
        <a className="mp-btn-ghost" style={{ marginTop: 14 }} href={ctaHref} {...linkProps(ctaHref)}
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

  useEffect(() => {
    if (open == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen(i => (i == null ? i : (i + 1) % items.length))
      if (e.key === 'ArrowLeft') setOpen(i => (i == null ? i : (i - 1 + items.length) % items.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items.length])

  // Con el visor abierto, la página de atrás queda quieta
  useScrollLock(open != null)

  if (!items.length) return null
  const current = open != null ? items[Math.min(open, items.length - 1)] : null

  return (
    <section className="mp-card" aria-label={t.gallery}>
      <h2 className="mp-card-title">{trLabel(module.title, lang) || t.gallery}</h2>
      <div className="mp-gallery">
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
      {current && (
        <div className="mp-lightbox" role="dialog" aria-modal="true" aria-label={`${open! + 1} / ${items.length}`} onClick={() => setOpen(null)}>
          <button type="button" className="mp-icon-btn mp-lightbox-close" aria-label={ui(lang).close} onClick={() => setOpen(null)}>
            <X size={20} />
          </button>
          {items.length > 1 && (
            <>
              {/* En el celular no hay flechas del teclado: botones para pasar de foto */}
              <button type="button" className="mp-icon-btn mp-lightbox-nav is-prev" aria-label={t.prevPhoto}
                onClick={e => { e.stopPropagation(); setOpen(i => (i == null ? i : (i - 1 + items.length) % items.length)) }}>
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <button type="button" className="mp-icon-btn mp-lightbox-nav is-next" aria-label={t.nextPhoto}
                onClick={e => { e.stopPropagation(); setOpen(i => (i == null ? i : (i + 1) % items.length)) }}>
                <ChevronRight size={22} aria-hidden="true" />
              </button>
              <span className="mp-lightbox-count" aria-hidden="true">{open! + 1} / {items.length}</span>
            </>
          )}
          {isVideo(current)
            ? <video src={current.url} controls autoPlay playsInline onClick={e => e.stopPropagation()} />
            : <img src={current.url} alt={current.caption ?? ''} onClick={e => e.stopPropagation()} />}
        </div>
      )}
    </section>
  )
}

// ── Testimonials ────────────────────────────────────────────────────────────

interface Review { author_name?: string; rating?: number; text?: string }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: items.length ? 14 : 0 }}>
          <strong style={{ fontSize: 28 }}>{google.rating.toFixed(1)}</strong>
          <div style={{ fontSize: 13, color: 'var(--p-muted)' }}>
            <div className="mp-stars" aria-label={`${google.rating} / 5`}>{'★'.repeat(Math.round(google.rating))}</div>
            {google.count ? `${google.count} ${t.reviewsCount}` : null}
          </div>
          {googleHref && (
            <a className="mp-btn-ghost" style={{ marginLeft: 'auto', minHeight: 40 }} href={googleHref}
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
            {r.rating ? <span className="mp-stars" aria-label={`${r.rating} / 5`}>{'★'.repeat(Math.min(5, r.rating))}</span> : null}
          </div>
          {r.text && <p>{r.text}</p>}
        </div>
      ))}
    </section>
  )
}

// ── Hours ───────────────────────────────────────────────────────────────────

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
      <dl className="mp-hours" style={{ margin: 0 }}>
        {WEEK_DAYS.map(day => {
          const slot = schedule[day]
          const cls = day === today ? 'is-today' : undefined
          const value = !slot || slot.closed || !slot.open || !slot.close ? t.closed : `${slot.open} – ${slot.close}`
          return [
            <dt key={day + '-d'} className={cls}>{t.days[day]}</dt>,
            <dd key={day + '-h'} className={cls}>{value}</dd>,
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
      {heading && <h2 className="mp-card-title" style={{ padding: '0 4px' }}>{heading}</h2>}
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
      {heading && <h2 className="mp-card-title" style={{ padding: '0 4px' }}>{heading}</h2>}
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
