import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, CalendarDays, ChevronLeft, Clock, MapPin, Share2, Ticket } from 'lucide-react'
import { useScrollLock } from '@/lib/scrollLock'
import { webOrigin } from '@/lib/platform'
import { langLocale } from '@/i18n/app/languages'
import { tr } from '../lib/profileI18n'
import { isExternal, safeHref } from '../lib/safeUrl'
import { urlKey } from '../lib/clickKeys'
import { eventHref, localToday, posterRatio, readEvents, upcomingEvents, type EventItem } from '../lib/events'
import { eventsStrings, type EventsStrings } from '../lib/eventsI18n'
import type { ProfileLang } from '../lib/profileTypes'
import type { ModuleProps } from './ProfileModules'
import { useProfileModule } from './profileModuleContext'
import { SafeImage } from './SafeImage'
import './events.css'

// Módulo "Eventos" (ticketera para productoras; chunk propio). Un carrusel de entradas grandes, casi del alto de la
// pantalla: arriba la fecha del evento al frente, la portada entera (la tarjeta toma la forma del flyer) con la hora
// y la etiqueta, el título y el lugar, y abajo "Entradas", que lleva directo al link. Tocar la portada abre la ficha
// del evento (portada, datos, descripción y "Comprar entradas" fijo abajo), que tiene su propio link (?evento=<id>)
// para compartirla. Los eventos con fecha pasada se ocultan solos.

const linkProps = (href: string) => (isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function dateParts(date: string | undefined, lang: ProfileLang) {
  if (!date) return null
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const loc = langLocale(lang)
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(loc, o).replace('.', '')
  return {
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }),
    weekday: part({ weekday: 'short' }),
    long: d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

const titleOf = (e: EventItem, lang: ProfileLang) => (lang === 'en' && e.en?.title) || e.title || ''
const descriptionOf = (e: EventItem, lang: ProfileLang) => (lang === 'en' && e.en?.description) || e.description || ''

export function EventsModule({ module, lang, onAction }: ModuleProps) {
  const ctx = useProfileModule()
  const preview = !!ctx?.preview
  const s = eventsStrings(lang)
  const heading = tr(module.title, module.translations, 'title', lang)
  const [today] = useState(localToday)
  const items = useMemo(() => upcomingEvents(readEvents(module.content.items), today), [module.content.items, today])

  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [ratios, setRatios] = useState<Record<string, number>>({})
  const measure = (id: string) => (e: SyntheticEvent<HTMLImageElement>) => {
    const ar = posterRatio(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
    setRatios(r => (r[id] === ar ? r : { ...r, [id]: ar }))
  }

  // Ficha abierta: la del link (?evento=<id>) al llegar, o la que se tocó. Con el botón atrás del celular se cierra.
  const fromUrl = (list: EventItem[]) => {
    const id = new URLSearchParams(window.location.search).get('evento')
    return id && list.some(e => e.id === id) ? id : null
  }
  const [openId, setOpenId] = useState<string | null>(() => (preview ? null : fromUrl(items)))
  const pushed = useRef(false)
  // Llegó con el link de un evento: su tarjeta queda al frente detrás de la ficha
  const [initialId] = useState(openId)
  useEffect(() => {
    const i = initialId ? items.findIndex(e => e.id === initialId) : -1
    if (i > 0) requestAnimationFrame(() => goTo(i, 'instant'))
  }, [initialId, items])
  useEffect(() => {
    if (preview) return
    const onPop = () => { pushed.current = false; setOpenId(fromUrl(items)) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [items, preview])

  const openEvent = (e: EventItem) => {
    if (!preview) {
      window.history.pushState(window.history.state, '', eventHref(window.location.href, e.id))
      pushed.current = true
    }
    setOpenId(e.id)
  }
  const closeEvent = () => {
    if (!preview && pushed.current) { window.history.back(); return }
    if (!preview) window.history.replaceState(window.history.state, '', eventHref(window.location.href, null))
    setOpenId(null)
  }

  useEffect(() => {
    const el = track.current
    if (!el) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const cards = Array.from(el.children) as HTMLElement[]
        if (!cards.length) return
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

  function goTo(i: number, behavior: ScrollBehavior = 'smooth') {
    const el = track.current
    const card = el?.children[i] as HTMLElement | undefined
    if (!el || !card) return
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior })
  }

  if (!items.length) return null
  const current = items[Math.min(active, items.length - 1)]
  const head = dateParts(current.date, lang)
  const arOf = (e: EventItem | undefined) => (e && e.image_url ? ratios[e.id] ?? 0.8 : 0.8)
  const opened = openId ? items.find(e => e.id === openId) ?? null : null

  return (
    <section className="mp-ev" aria-label={heading || s.section}>
      {heading && <h2 className="mp-card-title mp-section-title">{heading}</h2>}
      {/* La fecha del evento que está al frente, grande (decorativa: cada tarjeta dice la suya) */}
      <div className="mp-ev-head" aria-hidden="true">
        {head
          ? <span key={current.id} className="mp-ev-bigdate">{head.day} {head.month}</span>
          : <span key={current.id} className="mp-ev-bigdate">{titleOf(current, lang)}</span>}
        {(head || current.time) && (
          <span className="mp-ev-headmeta">{[head?.weekday, current.time].filter(Boolean).join(' · ')}</span>
        )}
      </div>
      <div ref={track} className="mp-ev-track" tabIndex={0} role="region" aria-label={`${heading || s.section} — ${s.swipe}`}
        style={{ '--ev-ar-first': arOf(items[0]), '--ev-ar-last': arOf(items[items.length - 1]) } as CSSProperties}>
        {items.map((e, i) => {
          const title = titleOf(e, lang)
          const d = dateParts(e.date, lang)
          const href = e.url ? safeHref(e.url) : null
          const pos = i === active ? ' is-active' : ' is-side'
          return (
            <article key={e.id} className={`mp-ev-card${pos}`} style={{ '--ev-ar': arOf(e), '--i': i } as CSSProperties}>
              <button type="button" className="mp-ev-poster" onClick={() => openEvent(e)} aria-haspopup="dialog"
                aria-label={s.open([title, d?.long, e.time, e.venue].filter(Boolean).join(' · '))}>
                {e.image_url
                  ? <>
                      <SafeImage className="mp-ev-backdrop" sizing="column" src={e.image_url} alt="" loading={i < 2 ? 'eager' : 'lazy'} />
                      <SafeImage className="mp-ev-img" sizing="column" src={e.image_url} alt="" loading={i < 2 ? 'eager' : 'lazy'} onLoad={measure(e.id)} />
                    </>
                  : <span className="mp-ev-blank">{title}</span>}
                {(e.time || e.tag) && (
                  <span className="mp-ev-chips">
                    {e.time && <span className="mp-ev-chip"><Clock size={12} aria-hidden="true" />{e.time}</span>}
                    {e.tag && <span className="mp-ev-chip">{e.tag}</span>}
                  </span>
                )}
                <span className="mp-ev-sheen" />
              </button>
              <div className="mp-ev-info">
                {d && <span className="mp-ev-when">{d.weekday} {d.day} {d.month}{e.time ? ` · ${e.time}` : ''}</span>}
                {title && <span className="mp-ev-title">{title}</span>}
                {e.venue && <span className="mp-ev-venue"><MapPin size={13} aria-hidden="true" />{e.venue}</span>}
              </div>
              {href && (
                <a className="mp-ev-buy" href={href} {...linkProps(href)} aria-label={title ? `${s.tickets}: ${title}` : s.tickets}
                  onClick={() => onAction(module.id, urlKey(e.url))}>
                  <Ticket size={17} aria-hidden="true" />{s.tickets}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              )}
            </article>
          )
        })}
      </div>
      {items.length > 1 && (
        <div className="mp-ev-dots">
          {items.map((e, i) => (
            <button key={e.id} type="button" data-touch-exempt className={i === active ? 'is-active' : undefined} aria-current={i === active || undefined}
              aria-label={`${s.position(i + 1, items.length)}${e.title ? ` · ${titleOf(e, lang)}` : ''}`} onClick={() => goTo(i)} />
          ))}
        </div>
      )}
      {opened && (
        <EventDetail event={opened} lang={lang} s={s} handle={ctx?.handle ?? ''} preview={preview}
          onClose={closeEvent} onBuy={() => onAction(module.id, urlKey(opened.url))} />
      )}
    </section>
  )
}

/** Ficha del evento a pantalla completa (portal: los objetos de la página usan transform y romperían el fixed) */
function EventDetail({ event, lang, s, handle, preview, onClose, onBuy }: {
  event: EventItem
  lang: ProfileLang
  s: EventsStrings
  handle: string
  preview: boolean
  onClose: () => void
  onBuy: () => void
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [look, setLook] = useState<{ theme?: string; accent?: string }>({})
  useLayoutEffect(() => {
    const el = anchor.current
    setLook({
      theme: el?.closest<HTMLElement>('[data-mycen-theme]')?.dataset.mycenTheme ?? 'universo',
      accent: el?.closest<HTMLElement>('[data-mycen-accent]')?.dataset.mycenAccent,
    })
  }, [])
  const ready = !!look.theme
  useScrollLock(ready)

  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!ready) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('.mp-evd-back')?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const list = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!list.length) return
      const first = list[0], last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.({ preventScroll: true }) }
  }, [ready])

  const title = titleOf(event, lang)
  const description = descriptionOf(event, lang)
  const d = dateParts(event.date, lang)
  const href = event.url ? safeHref(event.url) : null
  const [expanded, setExpanded] = useState(false)
  const long = description.length > 320 || description.split('\n').length > 6
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${webOrigin()}/${handle}?evento=${event.id}`
    try {
      if (navigator.share) { await navigator.share({ title, url }); return }
    } catch { return }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2400) } catch { /* sin portapapeles */ }
  }

  return (
    <>
      <span ref={anchor} hidden />
      {ready && createPortal(
        <div ref={panel} className="mp-evd" role="dialog" aria-modal="true" aria-labelledby={titleId}
          data-mycen-theme={look.theme} data-mycen-accent={look.accent} dir={document.documentElement.dir || undefined}>
          {event.image_url && <span className="mp-evd-glowbox" aria-hidden="true"><img className="mp-evd-glow" src={event.image_url} alt="" /></span>}
          <div className="mp-evd-top">
            <button type="button" className="mp-evd-back" onClick={onClose}>
              <ChevronLeft size={18} aria-hidden="true" />{s.back}
            </button>
            <div className="mp-evd-topchips">
              {event.tag && <span className="mp-evd-chip">{event.tag}</span>}
              {!preview && handle && (
                <button type="button" className="mp-evd-share" onClick={share} aria-label={s.share}>
                  <Share2 size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="mp-evd-body">
            {event.image_url && (
              <div className="mp-evd-poster">
                <img src={event.image_url} alt={title} />
              </div>
            )}
            <div className="mp-evd-info">
            <h2 id={titleId} className="mp-evd-title">{title}</h2>
            <ul className="mp-evd-meta">
              {d && <li><CalendarDays size={17} aria-hidden="true" /><span>{d.long}</span></li>}
              {event.time && <li><Clock size={17} aria-hidden="true" /><span>{event.time}</span></li>}
              {event.venue && <li><MapPin size={17} aria-hidden="true" /><span>{event.venue}</span></li>}
            </ul>
            {description && (
              <div className="mp-evd-desc-wrap">
                <p className={`mp-evd-desc${long && !expanded ? ' is-clamped' : ''}`}>{description}</p>
                {long && (
                  <button type="button" className="mp-evd-more" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>
                    {expanded ? s.readLess : s.readMore}
                  </button>
                )}
              </div>
            )}
            <p className="mp-evd-status" role="status">{copied ? s.copied : ''}</p>
            </div>
          </div>
          {href && (
            <div className="mp-evd-cta">
              <a className="mp-evd-buy" href={href} {...linkProps(href)} onClick={onBuy}>
                <Ticket size={18} aria-hidden="true" />{s.buy}<ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
