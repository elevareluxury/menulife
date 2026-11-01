import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, FileText, Pause, Play, Ticket } from 'lucide-react'
import { Huella } from '@/design/components/Huella'
import { tr, ui } from '../lib/profileI18n'
import { safeHref, isExternal } from '../lib/safeUrl'
import { urlKey } from '../lib/clickKeys'
import { fetchPollResults, votePoll, type PollResults } from '../lib/profileApi'
import { loadPodcast } from '../lib/podcastClient'
import { inspectFeedUrl, type PodcastResponse } from '../lib/podcast'
import { MEDIA_PROVIDER_NAME, parseMediaUrl } from '../lib/media'
import type { ModuleProps } from './ProfileModules'
import { useProfileModule } from './profileModuleContext'
import { PlayerFacade } from './PlayerFacade'
import './v2modules.css'

// Módulos de la entrega 2 (chunk propio: sólo lo baja un perfil que usa alguno). Encuesta, descargables, cupón,
// galería de videos y podcast. Nada de terceros antes de que el visitante toque algo.

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const linkProps = (href: string) => (isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})

// ── Encuesta ────────────────────────────────────────────────────────────────

interface PollOption { id: string; label: string }

const pollKey = (id: string) => `mycen_poll:${id}`
function readVote(id: string): string | null {
  try { return localStorage.getItem(pollKey(id)) } catch { return null }
}
function saveVote(id: string, option: string) {
  try { localStorage.setItem(pollKey(id), option) } catch { /* sin almacenamiento: igual se votó */ }
}

export function PollModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const ctx = useProfileModule()
  const options = (Array.isArray(module.content.options) ? module.content.options as PollOption[] : [])
    .filter(o => o && /^[a-z0-9]{1,16}$/.test(str(o.id)) && str(o.label).trim()).slice(0, 6)
  const question = tr(module.title, module.translations, 'title', lang)
  const [mine, setMine] = useState<string | null>(() => readVote(module.id))
  const [results, setResults] = useState<PollResults | null>(null)
  const [busy, setBusy] = useState(false)

  // Quien ya votó ve los resultados al volver
  useEffect(() => {
    if (!mine || ctx?.preview || !ctx?.handle) return
    let alive = true
    void fetchPollResults(ctx.handle, module.id).then(r => { if (alive && r) setResults(r) })
    return () => { alive = false }
  }, [mine, ctx?.preview, ctx?.handle, module.id])

  if (options.length < 2) return null

  async function vote(id: string) {
    if (busy) return
    setMine(id)
    onAction(module.id, `v:${id}`)
    if (ctx?.preview || !ctx?.handle) return
    saveVote(module.id, id)
    setBusy(true)
    const r = await votePoll(ctx.handle, module.id, id)
    if (r) setResults(r)
    setBusy(false)
  }

  const total = results?.total ?? 0
  const showResults = !!mine && !!results
  return (
    <section className="mp-card mp-poll" aria-label={question || t.yourVote}>
      {question && <h2 className="mp-card-title">{question}</h2>}
      <div className="mp-poll-options" role="group" aria-label={question || undefined}>
        {options.map(o => {
          const n = results?.counts[o.id] ?? 0
          const pct = total ? Math.round((n / total) * 100) : 0
          const chosen = mine === o.id
          return (
            <button key={o.id} type="button" className={`mp-poll-option${chosen ? ' is-mine' : ''}${showResults ? ' has-results' : ''}`}
              aria-pressed={chosen} disabled={busy} onClick={() => vote(o.id)}
              style={showResults ? { '--mp-pct': `${pct}%` } as React.CSSProperties : undefined}>
              {showResults && <span className="mp-poll-bar" aria-hidden="true" />}
              <span className="mp-poll-label">{chosen && <Check size={16} aria-hidden="true" />}{o.label}</span>
              {showResults && <span className="mp-poll-pct">{pct}%</span>}
            </button>
          )
        })}
      </div>
      {mine && results && (
        <p className="mp-poll-total" role="status">
          {total === 1 ? t.oneVote : total ? t.votesCount.replace('{n}', String(total)) : t.noVotes}
        </p>
      )}
    </section>
  )
}

// ── Descargables (PDF) ──────────────────────────────────────────────────────

interface FileItem { title?: string; url?: string; size?: number }

function fileSize(bytes: number | undefined, lang: string): string {
  if (!bytes || bytes <= 0) return ''
  const mb = bytes / 1048576
  const fmt = new Intl.NumberFormat(lang, { maximumFractionDigits: mb < 10 ? 1 : 0 })
  return mb >= 1 ? `${fmt.format(mb)} MB` : `${fmt.format(Math.max(1, Math.round(bytes / 1024)))} KB`
}

export function DownloadsModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const items = (Array.isArray(module.content.items) ? module.content.items as FileItem[] : [])
    .map(i => ({ ...i, href: safeHref(i?.url) }))
    .filter((i): i is FileItem & { href: string } => !!i.href && /^https:\/\//.test(i.href) && !!str(i.title).trim())
  if (!items.length) return null
  const heading = tr(module.title, module.translations, 'title', lang)
  return (
    <section className="mp-card mp-files" aria-label={heading || t.download}>
      {heading && <h2 className="mp-card-title">{heading}</h2>}
      <ul className="mp-files-list">
        {items.map((i, n) => (
          <li key={i.href + n}>
            <a className="mp-file" href={i.href} {...linkProps(i.href)} download onClick={() => onAction(module.id, urlKey(i.url))}>
              <span className="mp-file-ico" aria-hidden="true"><FileText size={20} /></span>
              <span className="mp-file-body">
                <span className="mp-file-title">{str(i.title)}</span>
                <span className="mp-file-meta">PDF{fileSize(i.size, lang) && ` · ${fileSize(i.size, lang)}`}</span>
              </span>
              <span className="mp-file-go" aria-hidden="true"><Download size={18} /></span>
              <span className="mp-sr-only">{t.download}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Cupón ───────────────────────────────────────────────────────────────────

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CouponModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const code = str(module.content.code).trim()
  const expires = str(module.content.expires)
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // Vencido: no se muestra (nadie quiere un código que no anda)
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(code) || (/^\d{4}-\d{2}-\d{2}$/.test(expires) && expires < today())) return null
  const title = tr(module.title, module.translations, 'title', lang)
  const text = tr(str(module.content.text), module.translations, 'text', lang)
  const href = safeHref(module.content.url)
  const until = /^\d{4}-\d{2}-\d{2}$/.test(expires)
    ? t.validUntil.replace('{date}', new Date(`${expires}T12:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'long' }))
    : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      navigator.vibrate?.(15)
      onAction(module.id, 'copy')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2200)
    } catch { /* sin portapapeles: el código queda a la vista */ }
  }

  return (
    <section className="mp-card mp-coupon" aria-label={title || t.copyCode}>
      <span className="mp-coupon-ico" aria-hidden="true"><Ticket size={20} /></span>
      {title && <h2 className="mp-card-title mp-coupon-title">{title}</h2>}
      {text && <p className="mp-coupon-text">{text}</p>}
      <div className="mp-coupon-code">
        <code>{code}</code>
        <button type="button" className="mp-coupon-copy" onClick={copy}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? t.codeCopied : t.copyCode}
        </button>
      </div>
      <span className="mp-sr-only" role="status">{copied ? t.codeCopied : ''}</span>
      {until && <p className="mp-coupon-until">{until}</p>}
      {href && (
        <a className="mp-featured mp-coupon-use" href={href} {...linkProps(href)} onClick={() => onAction(module.id)}>{t.useCoupon}</a>
      )}
    </section>
  )
}

// ── Galería de videos ───────────────────────────────────────────────────────

interface VideoItem { url?: string; title?: string; cover_url?: string }

export function VideoGalleryModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const [playing, setPlaying] = useState<number | null>(null)
  const videos = (Array.isArray(module.content.items) ? module.content.items as VideoItem[] : [])
    .map(i => ({ item: i, embed: parseMediaUrl(i?.url) }))
    .filter((x): x is { item: VideoItem; embed: NonNullable<ReturnType<typeof parseMediaUrl>> } => !!x.embed && x.embed.kind === 'video')
    .slice(0, 12)
  if (!videos.length) return null
  const heading = tr(module.title, module.translations, 'title', lang) || t.videos
  return (
    <section className="mp-vgal" aria-label={heading}>
      <h2 className="mp-card-title mp-section-title">{heading}</h2>
      <div className="mp-vgal-track" tabIndex={0} role="region" aria-label={`${heading} — ${t.swipeHint}`}>
        {videos.map(({ item, embed }, i) => {
          const provider = MEDIA_PROVIDER_NAME[embed.provider]
          const title = str(item.title).trim() || provider
          return (
            <div key={(item.url ?? '') + i} className="mp-vgal-item mp-card mp-media mp-media-video">
              {playing === i ? (
                <div className="mp-media-frame" style={{ aspectRatio: String(embed.ratio < 1 ? embed.ratio : 16 / 9) }}>
                  <iframe src={embed.src} title={`${title} (${provider})`} allow={embed.allow} allowFullScreen loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin" />
                </div>
              ) : (
                <PlayerFacade kind="video" title={title} provider={provider} playLabel={t.playOn.replace('{provider}', provider)}
                  cover={safeHref(item.cover_url)} style={{ aspectRatio: '16 / 9' }}
                  onPlay={() => { setPlaying(i); onAction(module.id, urlKey(item.url)) }} />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Podcast ─────────────────────────────────────────────────────────────────

export function PodcastModule({ module, lang, onAction }: ModuleProps) {
  const t = ui(lang)
  const ctx = useProfileModule()
  const checked = inspectFeedUrl(str(module.content.feed))
  const feed = 'url' in checked ? checked.url : null
  const count = Math.min(5, Math.max(1, Number(module.content.count) || 3))
  const [data, setData] = useState<PodcastResponse | null | undefined>(undefined)
  const [playing, setPlaying] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!feed) return
    let alive = true
    void loadPodcast(feed).then(r => { if (alive) setData(r) })
    return () => { alive = false }
  }, [feed])

  if (!feed || data === null || (data && !data.episodes.length)) return null
  const heading = tr(module.title, module.translations, 'title', lang) || data?.title || t.podcast

  function toggle(i: number) {
    if (playing === i && audio.current) {
      if (audio.current.paused) void audio.current.play().catch(() => undefined)
      else audio.current.pause()
      return
    }
    setPlaying(i)
    setPaused(false)
    onAction(module.id, `ep:${i}`)
  }

  return (
    <section className="mp-card mp-podcast" aria-label={heading} aria-busy={data === undefined}>
      <div className="mp-podcast-head">
        <span className="mp-podcast-art" aria-hidden="true">
          {ctx && <Huella seed={ctx.seed} variant={ctx.variant} />}
        </span>
        <div className="mp-podcast-name">
          <h2 className="mp-card-title">{heading}</h2>
          <span className="mp-podcast-kind">{t.podcast} · {t.episodes}</span>
        </div>
      </div>
      {data === undefined
        ? <div className="mp-podcast-skeleton" aria-hidden="true" />
        : (
          <ol className="mp-podcast-list">
            {data.episodes.slice(0, count).map((e, i) => (
              <li key={e.audio} className={playing === i ? 'is-playing' : undefined}>
                <button type="button" className="mp-podcast-play" onClick={() => toggle(i)}
                  aria-label={`${playing === i && !paused ? t.pause : t.listen}: ${e.title}`}>
                  {playing === i && !paused ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" />}
                </button>
                <div className="mp-podcast-ep">
                  <span className="mp-podcast-ep-title">{e.title}</span>
                  <span className="mp-podcast-ep-meta">
                    {[e.date && new Date(e.date).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' }), e.duration].filter(Boolean).join(' · ')}
                  </span>
                  {/* El audio del hosting se pide recién al tocar "Escuchar" */}
                  {playing === i && (
                    <audio ref={audio} className="mp-podcast-audio" src={e.audio} controls autoPlay preload="none"
                      onPause={() => setPaused(true)} onPlay={() => setPaused(false)} />
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
    </section>
  )
}
