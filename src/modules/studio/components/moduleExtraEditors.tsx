import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from 'lucide-react'
import type { WeekSchedule } from '@/modules/profile/lib/profileTypes'
import { WEEK_DAYS } from '@/modules/profile/lib/schedule'
import type { CardItem } from '@/modules/profile/components/ProfileModules'
import { uploadMedia } from '../lib/studioApi'
import { useStudio } from '../StudioContext'
import { Button, ImageField, SelectField, TextField, Toggle } from './ui'
import { useStudioT } from '@/i18n/app/studio'
import { huellaSeed } from '@/lib/huella'
import { useAppLang } from '@/i18n/app/store'
import { inspectMediaUrl, MEDIA_PROVIDER_NAME } from '@/modules/profile/lib/media'
import { lookVars, profileLook } from '@/modules/profile/lib/profileLook'
import { MediaModule } from '@/modules/profile/components/MediaModule'
import { ProfileHuellaContext } from '@/modules/profile/components/profileLookContext'
import '@/modules/profile/profile.css'
import '@/modules/profile/layouts/layouts.css'

// Editores propios de los tipos que no se arman sólo con campos simples. Cada uno se registra en
// `lib/moduleCatalog.ts` (campo `extra`) junto con cómo se inicializa, se valida y se guarda.

export interface ExtraEditorProps<S> {
  value: S
  onChange: (value: S) => void
  userId: string
}

// ── Horarios ────────────────────────────────────────────────────────────────

export function HoursEditor({ value: schedule, onChange }: ExtraEditorProps<WeekSchedule>) {
  const e = useStudioT().editor
  return (
    <div className="st-stack" style={{ gap: 6 }}>
      <span className="st-label">{e.hoursTitle}</span>
      <p className="st-help" style={{ margin: 0 }}>{e.hoursHelp}</p>
      {WEEK_DAYS.map(day => {
        const slot = schedule[day] ?? { open: '09:00', close: '18:00', closed: true }
        const open = !slot.closed
        const update = (patch: Partial<typeof slot>) => onChange({ ...schedule, [day]: { ...slot, ...patch } })
        return (
          <div key={day} className="st-row" style={{ minHeight: 44, borderTop: '1px solid var(--st-border)', paddingTop: 6 }}>
            <span style={{ width: 92, fontSize: 14 }}>{e.days[day]}</span>
            <button type="button" role="switch" aria-checked={open} aria-label={e.dayOpen(e.days[day])}
              className="st-toggle" onClick={() => update({ closed: open })}><span aria-hidden="true" /></button>
            {open ? (
              <>
                <input className="st-input" type="time" aria-label={e.dayOpens(e.days[day])} style={{ width: 'auto', padding: '7px 8px' }}
                  value={slot.open ?? '09:00'} onChange={e => update({ open: e.target.value })} />
                <span aria-hidden="true">–</span>
                <input className="st-input" type="time" aria-label={e.dayCloses(e.days[day])} style={{ width: 'auto', padding: '7px 8px' }}
                  value={slot.close ?? '18:00'} onChange={e => update({ close: e.target.value })} />
              </>
            ) : <span className="st-help">{e.closed}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── Galería ─────────────────────────────────────────────────────────────────

export interface GalleryItem { url: string; type?: string; caption?: string }

export function GalleryEditor({ value: items, onChange, userId }: ExtraEditorProps<GalleryItem[]>) {
  const [adding, setAdding] = useState(false)
  const e = useStudioT().editor
  return (
    <div className="st-stack" style={{ gap: 8 }}>
      <span className="st-label">{e.photos(items.length)}</span>
      {items.map((item, i) => (
        <div key={item.url + i} className="st-row">
          <img className="st-image-thumb" src={item.url} alt="" />
          <span className="st-help" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.photoN(i + 1)}</span>
          <button type="button" className="st-icon-btn" aria-label={e.removePhoto(i + 1)}
            onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
        </div>
      ))}
      {adding
        ? <ImageField label={e.newPhoto} value={null}
            onUpload={async f => { onChange([...items, { url: await uploadMedia(userId, f), type: 'image' }]); setAdding(false) }}
            onClear={() => setAdding(false)} />
        : <Button size="sm" onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true" /> {e.addPhoto}</Button>}
    </div>
  )
}

// ── Tarjetas ────────────────────────────────────────────────────────────────

export function CardsEditor({ value: items, onChange, userId }: ExtraEditorProps<CardItem[]>) {
  const e = useStudioT().editor
  const update = (i: number, patch: Partial<CardItem>) => onChange(items.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const move = (i: number, d: -1 | 1) => {
    const t = i + d
    if (t < 0 || t >= items.length) return
    const next = [...items]
    ;[next[i], next[t]] = [next[t], next[i]]
    onChange(next)
  }
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      <span className="st-label">{e.cards(items.length)}</span>
      {items.map((card, i) => (
        <div key={i} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
          <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{e.cardN(i + 1)}</strong>
            <div className="st-row" style={{ gap: 0 }}>
              <button type="button" className="st-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={e.upCard(i + 1)}><ArrowUp size={15} /></button>
              <button type="button" className="st-icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={e.downCard(i + 1)}><ArrowDown size={15} /></button>
              <button type="button" className="st-icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={e.removeCard(i + 1)}><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="st-stack" style={{ gap: 12 }}>
            <ImageField label={e.photo} shape="wide" value={card.image_url}
              onUpload={async f => update(i, { image_url: await uploadMedia(userId, f) })}
              onClear={() => update(i, { image_url: undefined })} />
            <TextField label={e.cardTitle} value={card.title ?? ''} maxLength={80} onChange={v => update(i, { title: v })} placeholder={e.cardTitlePlaceholder} />
            <TextField label={e.cardDescription} value={card.subtitle ?? ''} maxLength={160} onChange={v => update(i, { subtitle: v })} />
            <div className="st-grid-2">
              <TextField label={e.cardDate} type="date" value={card.date ?? ''} onChange={v => update(i, { date: v || undefined })} />
              <TextField label={e.cardLink} type="url" value={card.url ?? ''} onChange={v => update(i, { url: v })} placeholder="https://…" />
            </div>
            <details>
              <summary className="st-help" style={{ cursor: 'pointer' }}><span className="st-en-tag">EN</span>{e.enOptional}</summary>
              <div className="st-stack" style={{ gap: 10, marginTop: 10 }}>
                <TextField label={e.enTitle} value={card.en?.title ?? ''} maxLength={80} onChange={v => update(i, { en: { ...card.en, title: v } })} />
                <TextField label={e.enDescription} value={card.en?.subtitle ?? ''} maxLength={160} onChange={v => update(i, { en: { ...card.en, subtitle: v } })} />
              </div>
            </details>
          </div>
        </div>
      ))}
      {items.length < 20 && (
        <Button size="sm" onClick={() => onChange([...items, {}])}><Plus size={15} aria-hidden="true" /> {e.addCard}</Button>
      )}
    </div>
  )
}

// ── Reseñas ─────────────────────────────────────────────────────────────────

export interface ReviewItem { author_name?: string; rating?: number; text?: string }
/** Calificación de Google tal como se escribe en el formulario (texto) */
export interface GoogleRatingInput { rating: string; count: string; url: string }
export interface ReviewsValue { items: ReviewItem[]; google: GoogleRatingInput }

export function ReviewsEditor({ value, onChange: onValue }: ExtraEditorProps<ReviewsValue>) {
  const { items, google } = value
  const onChange = (next: ReviewItem[]) => onValue({ ...value, items: next })
  const onGoogle = (next: GoogleRatingInput) => onValue({ ...value, google: next })
  const update = (i: number, patch: Partial<ReviewItem>) => onChange(items.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const e = useStudioT().editor
  return (
    <div className="st-stack" style={{ gap: 12 }}>
      <div className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
        <span className="st-label">{e.google}</span>
        <div className="st-grid-2" style={{ marginTop: 10 }}>
          <TextField label={e.rating} inputMode="decimal" value={google.rating} onChange={v => onGoogle({ ...google, rating: v })} placeholder="4.7" />
          <TextField label={e.ratingCount} inputMode="numeric" value={google.count} onChange={v => onGoogle({ ...google, count: v.replace(/\D/g, '') })} placeholder="312" />
        </div>
        <div style={{ marginTop: 12 }}>
          <TextField label={e.googleLink} type="url" value={google.url} onChange={v => onGoogle({ ...google, url: v })} placeholder="https://g.page/r/…" />
        </div>
      </div>
      <span className="st-label">{e.featured(items.length)}</span>
      <p className="st-help" style={{ margin: 0 }}>{e.realReviews}</p>
      {items.map((r, i) => (
        <div key={i} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
          <div className="st-stack" style={{ gap: 10 }}>
            <div className="st-row" style={{ justifyContent: 'space-between' }}>
              <div className="st-row" role="radiogroup" aria-label={e.starsOf(i + 1)} style={{ gap: 2 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" role="radio" aria-checked={(r.rating ?? 5) === n} aria-label={e.stars(n)}
                    className="st-icon-btn" style={{ width: 32, height: 32, color: n <= (r.rating ?? 5) ? '#F5B83D' : 'var(--st-faint)' }}
                    onClick={() => update(i, { rating: n })}>
                    <Star size={16} fill={n <= (r.rating ?? 5) ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <button type="button" className="st-icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={e.removeReview(i + 1)}><Trash2 size={15} /></button>
            </div>
            <TextField label={e.reviewName} value={r.author_name ?? ''} maxLength={60} onChange={v => update(i, { author_name: v })} />
            <TextField label={e.reviewText} multiline value={r.text ?? ''} maxLength={400} onChange={v => update(i, { text: v })} />
          </div>
        </div>
      ))}
      {items.length < 10 && (
        <Button size="sm" onClick={() => onChange([...items, { rating: 5 }])}><Plus size={15} aria-hidden="true" /> {e.addReview}</Button>
      )}
    </div>
  )
}

// ── Proyectos (Fase 5) ──────────────────────────────────────────────────────

function NoProjects() {
  const e = useStudioT().editor
  return (
    <div className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
      <p className="st-help" style={{ margin: '0 0 10px' }}>{e.projectsEmpty}</p>
      <Link className="st-btn st-btn-secondary st-btn-sm" to="/studio/projects">{e.goToProjects}</Link>
    </div>
  )
}

export function ProjectPicker({ value, onChange }: ExtraEditorProps<string>) {
  const { projects } = useStudio()
  const e = useStudioT().editor
  const available = projects.filter(p => p.status !== 'archived')
  if (!available.length) return <NoProjects />
  return (
    <div className="st-stack" style={{ gap: 6 }}>
      <SelectField label={e.projectPick} required value={value} onChange={onChange}
        options={available.map(p => ({ value: p.id, label: p.status === 'published' ? p.title : `${p.title} (${e.notPublished})` }))} />
      <p className="st-help" style={{ margin: 0 }}>{e.projectsHelp}</p>
    </div>
  )
}

/** ids null = todos los proyectos públicos; si no, esos y en ese orden */
export function PortfolioPicker({ value: ids, onChange }: ExtraEditorProps<string[] | null>) {
  const { projects } = useStudio()
  const e = useStudioT().editor
  const available = projects.filter(p => p.status !== 'archived')
  if (!available.length) return <NoProjects />
  const selected = (ids ?? []).map(id => available.find(p => p.id === id)).filter(p => !!p)
  const others = available.filter(p => !ids?.includes(p.id))
  const label = (p: typeof available[number]) => (p.status === 'published' ? p.title : `${p.title} (${e.notPublished})`)
  const move = (i: number, d: -1 | 1) => {
    const next = selected.map(p => p.id)
    const t = i + d
    if (t < 0 || t >= next.length) return
    ;[next[i], next[t]] = [next[t], next[i]]
    onChange(next)
  }
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      <Toggle checked={ids === null} label={e.portfolioAll} description={e.projectsHelp}
        onChange={all => onChange(all ? null : available.filter(p => p.status === 'published').map(p => p.id))} />
      {ids !== null && (
        <fieldset className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
          <legend className="st-label">{e.portfolioPick}</legend>
          <ul className="st-pick-list">
            {selected.map((p, i) => (
              <li key={p.id}>
                <label><input type="checkbox" checked onChange={() => onChange(ids.filter(x => x !== p.id))} /> {label(p)}</label>
                <span className="st-row" style={{ gap: 0 }}>
                  <button type="button" className="st-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`↑ ${p.title}`}><ArrowUp size={15} /></button>
                  <button type="button" className="st-icon-btn" disabled={i === selected.length - 1} onClick={() => move(i, 1)} aria-label={`↓ ${p.title}`}><ArrowDown size={15} /></button>
                </span>
              </li>
            ))}
            {others.map(p => (
              <li key={p.id}>
                <label><input type="checkbox" checked={false} onChange={() => onChange([...ids, p.id])} /> {label(p)}</label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  )
}

// ── Grupo de links (Fase 7) ─────────────────────────────────────────────────

export interface LinkItemInput { title?: string; url?: string; subtitle?: string }

export function LinkItemsEditor({ value: items, onChange }: ExtraEditorProps<LinkItemInput[]>) {
  const e = useStudioT().editor
  const update = (i: number, patch: Partial<LinkItemInput>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, d: -1 | 1) => {
    const t = i + d
    if (t < 0 || t >= items.length) return
    const next = [...items]
    ;[next[i], next[t]] = [next[t], next[i]]
    onChange(next)
  }
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      <span className="st-label">{e.groupLinks(items.length)}</span>
      {items.map((item, i) => (
        <div key={i} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
          <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{e.linkN(i + 1)}</strong>
            <div className="st-row" style={{ gap: 0 }}>
              <button type="button" className="st-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={e.upLink(i + 1)}><ArrowUp size={15} /></button>
              <button type="button" className="st-icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={e.downLink(i + 1)}><ArrowDown size={15} /></button>
              <button type="button" className="st-icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={e.removeLink(i + 1)}><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="st-stack" style={{ gap: 12 }}>
            <TextField label={e.linkTitle} value={item.title ?? ''} maxLength={120} onChange={v => update(i, { title: v })} />
            <TextField label="URL" type="url" value={item.url ?? ''} placeholder="https://…" onChange={v => update(i, { url: v })} />
            <TextField label={e.linkSubtitle} value={item.subtitle ?? ''} maxLength={120} onChange={v => update(i, { subtitle: v })} />
          </div>
        </div>
      ))}
      {items.length < 20 && (
        <Button size="sm" onClick={() => onChange([...items, {}])}><Plus size={15} aria-hidden="true" /> {e.addLink}</Button>
      )}
    </div>
  )
}

// ── Video y música (V1 · etapa 04): se pega el link, se detecta el proveedor y se ve la fachada ──

export function MediaUrlEditor({ value: url, onChange }: ExtraEditorProps<string>) {
  const t = useStudioT().media
  const { profile } = useStudio()
  const lang = useAppLang(st => st.lang)
  const result = inspectMediaUrl(url)
  const embed = 'embed' in result ? result.embed : null
  const error = url.trim() && 'error' in result ? t.errors[result.error] : null
  const look = profileLook(profile.theme)
  return (
    <div className="st-stack" style={{ gap: 12 }}>
      <TextField label={t.url} type="url" value={url} placeholder="https://…" required help={t.help}
        error={error} onChange={onChange} />
      {embed && (
        <div className="st-stack" style={{ gap: 8 }}>
          <p className="st-help" role="status" style={{ margin: 0 }}>
            {t.detected.replace('{provider}', MEDIA_PROVIDER_NAME[embed.provider])} · {embed.kind === 'video' ? t.video : t.music}
          </p>
          {/* Vista previa de la fachada con el tema y la huella del perfil (no carga nada del proveedor) */}
          <div className="mp-root my-profile st-media-preview" data-mycen-theme={look.mode} data-mycen-accent={look.accent}
            style={{ ...lookVars(look), minHeight: 0, padding: 12, borderRadius: 16 }} inert>
            <ProfileHuellaContext.Provider value={{ seed: huellaSeed(profile), variant: look.huellaVariant }}>
              <MediaModule module={{ id: 'preview', type: 'media', title: null, content: { url }, config: {}, translations: {} }}
                lang={lang} onAction={() => undefined} />
            </ProfileHuellaContext.Provider>
          </div>
          <p className="st-help" style={{ margin: 0 }}>{t.preview}</p>
        </div>
      )}
    </div>
  )
}
