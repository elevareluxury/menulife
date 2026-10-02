import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from 'lucide-react'
import type { ModuleType, Translations, WeekSchedule } from '@/modules/profile/lib/profileTypes'
import { WEEK_DAYS } from '@/modules/profile/lib/schedule'
import { useStudio } from '../StudioContext'
import { createModule, friendlyError, updateModule, uploadMedia } from '../lib/studioApi'
import { moduleDef, socialUrl, type FieldDef } from '../lib/moduleCatalog'
import { safeHref } from '@/modules/profile/lib/safeUrl'
import type { CardItem } from '@/modules/profile/components/ProfileModules'
import type { StudioModule } from '../lib/studioTypes'
import { Button, Drawer, ImageField, SelectField, TextField } from './ui'
import { useStudioT, type StudioDict } from '@/i18n/app/studio'

const str = (v: unknown) => (v == null ? '' : String(v))

function initialValues(type: ModuleType, module: StudioModule | null, t: StudioDict): Record<string, string> {
  const def = moduleDef(type, t)
  const values: Record<string, string> = {}
  for (const f of def.fields) {
    values[f.key] = f.isTitle ? str(module?.title) : str(module?.content[f.key])
  }
  if (type === 'social' && module && !values.handle) values.handle = str(module.content.url)
  if (type === 'link' && !values.style) values.style = 'button'
  if (type === 'cards' && !values.layout) values.layout = 'carousel'
  return values
}

function initialEn(module: StudioModule | null): Record<string, string> {
  const en = (module?.translations?.en ?? {}) as Record<string, unknown>
  return Object.fromEntries(Object.entries(en).filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')) as Record<string, string>
}

/** Crear o editar un módulo. `module` null = nuevo. */
export function ModuleEditor({ type, module, onClose }: { type: ModuleType; module: StudioModule | null; onClose: () => void }) {
  const { profile, modules, setModules, userId, business } = useStudio()
  const t = useStudioT()
  const e = t.editor
  const def = moduleDef(type, t)
  const [values, setValues] = useState(() => initialValues(type, module, t))
  const [en, setEn] = useState(() => initialEn(module))
  const [showEn, setShowEn] = useState(() => Object.keys(initialEn(module)).length > 0)
  const [schedule, setSchedule] = useState<WeekSchedule>(() => (module?.content.schedule as WeekSchedule) ?? {})
  const [gallery, setGallery] = useState<{ url: string; type?: string; caption?: string }[]>(
    () => (Array.isArray(module?.content.items) ? module!.content.items as { url: string }[] : []))
  const [cards, setCards] = useState<CardItem[]>(
    () => (Array.isArray(module?.content.items) && type === 'cards' ? module!.content.items as CardItem[] : [{}]))
  const [reviews, setReviews] = useState<ReviewItem[]>(
    () => (Array.isArray(module?.content.items) && type === 'testimonials' ? module!.content.items as ReviewItem[] : []))
  const [google, setGoogle] = useState<{ rating: string; count: string; url: string }>(() => {
    const g = (module?.content.google ?? {}) as { rating?: number; count?: number; url?: string }
    return { rating: g.rating != null ? String(g.rating) : '', count: g.count != null ? String(g.count) : '', url: g.url ?? '' }
  })
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string) => { setValues(prev => ({ ...prev, [k]: v })); setError(null) }
  const translatable = def.fields.filter(f => f.translatable)

  function fieldError(f: FieldDef): string | null {
    if (!submitted) return null
    if (f.required && !values[f.key]?.trim()) return e.required
    if (f.kind === 'number' && values[f.key] && Number.isNaN(Number(values[f.key].replace(',', '.')))) return e.number
    return null
  }

  function validate(): string | null {
    for (const f of def.fields) {
      if (f.required && !values[f.key]?.trim()) return e.complete(f.label)
    }
    if (type === 'gallery' && gallery.length === 0) return e.galleryEmpty
    if (type === 'hours' && !WEEK_DAYS.some(d => schedule[d])) return e.hoursEmpty
    if (type === 'cards') {
      const filled = cards.filter(c => c.title?.trim() || c.image_url)
      if (!filled.length) return e.cardsEmpty
      if (filled.some(c => c.url?.trim() && !safeHref(c.url))) return e.cardsBadLink
    }
    if (type === 'testimonials') {
      if (!reviews.some(r => r.author_name?.trim() && r.text?.trim()) && !google.rating) return e.reviewsEmpty
      const rating = Number(google.rating.replace(',', '.'))
      if (google.rating && (Number.isNaN(rating) || rating < 1 || rating > 5)) return e.googleRange
      if (google.url && !safeHref(google.url)) return e.googleBadLink
    }
    return def.validate?.(values) ?? null
  }

  function buildPayload(): { title: string | null; content: Record<string, unknown>; translations: Translations } {
    let title: string | null = module?.title ?? null
    const content: Record<string, unknown> = { ...(module?.content ?? {}) }
    for (const f of def.fields) {
      const v = values[f.key]?.trim() ?? ''
      if (f.isTitle) { title = v || null; continue }
      if (f.kind === 'number') {
        if (v) content[f.key] = Number(v.replace(',', '.'))
        else delete content[f.key]
        continue
      }
      if (v) content[f.key] = v
      else delete content[f.key]
    }
    if (type === 'social') content.url = socialUrl(values.network, values.handle ?? '')
    if (type === 'link' && !content.link_type) content.link_type = 'custom'
    if (type === 'hours') {
      content.schedule = schedule
      content.timezone = str(module?.content.timezone) || business?.timezone || 'America/Argentina/Buenos_Aires'
    }
    if (type === 'gallery') content.items = gallery
    if (type === 'cards') {
      content.items = cards
        .filter(c => c.title?.trim() || c.image_url)
        .map(c => Object.fromEntries(Object.entries({
          image_url: c.image_url, title: c.title?.trim(), subtitle: c.subtitle?.trim(), date: c.date,
          url: c.url?.trim() ? safeHref(c.url) : undefined,
          en: c.en?.title?.trim() || c.en?.subtitle?.trim() ? { title: c.en?.title?.trim() || undefined, subtitle: c.en?.subtitle?.trim() || undefined } : undefined,
        }).filter(([, v]) => v)))
    }
    if (type === 'testimonials') {
      content.items = reviews
        .filter(r => r.author_name?.trim() && r.text?.trim())
        .map(r => ({ author_name: r.author_name!.trim(), rating: r.rating ?? 5, text: r.text!.trim() }))
      const g: Record<string, unknown> = {}
      if (google.rating) g.rating = Number(google.rating.replace(',', '.'))
      if (google.count) g.count = Number(google.count)
      if (google.url) g.url = safeHref(google.url)
      if (Object.keys(g).length) content.google = g
      else delete content.google
    }

    const enClean = Object.fromEntries(Object.entries(en).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v))
    const translations: Translations = { ...(module?.translations ?? {}) }
    if (Object.keys(enClean).length) translations.en = { ...enClean, _source: 'manual' }
    else delete translations.en
    return { title, content, translations }
  }

  async function save() {
    setSubmitted(true)
    const problem = validate()
    if (problem) { setError(problem); return }
    setSaving(true); setError(null)
    try {
      const payload = buildPayload()
      if (module) {
        const saved = await updateModule(module.id, payload)
        setModules(prev => prev.map(m => (m.id === saved.id ? saved : m)))
      } else {
        const position = (modules.reduce((max, m) => Math.max(max, m.position), 0) || 0) + 10
        const saved = await createModule({ profile_id: profile.id, type, position, ...payload })
        setModules(prev => [...prev, saved])
      }
      onClose()
    } catch (err) {
      setError(friendlyError(err))
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={module ? e.titleEdit(def.label) : e.titleNew(def.label)}
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
        <Button variant="primary" loading={saving} onClick={save}>{module ? e.saveChanges : t.common.add}</Button>
      </>}
    >
      <div className="st-stack">
        {def.fields.map(f => {
          if (f.kind === 'image') {
            return (
              <ImageField key={f.key} label={f.label + (f.required ? ' *' : '')} value={values[f.key] || null}
                onUpload={async file => set(f.key, await uploadMedia(userId, file))}
                onClear={() => set(f.key, '')} />
            )
          }
          if (f.kind === 'select') {
            return (
              <SelectField key={f.key} label={f.label} required={f.required} value={values[f.key] ?? ''}
                options={f.options ?? []} onChange={v => set(f.key, v)} error={fieldError(f)} />
            )
          }
          return (
            <TextField key={f.key} label={f.label} required={f.required} value={values[f.key] ?? ''}
              onChange={v => set(f.key, v)} placeholder={f.placeholder} maxLength={f.maxLength}
              multiline={f.kind === 'textarea'}
              type={f.kind === 'email' ? 'email' : f.kind === 'tel' ? 'tel' : f.kind === 'url' ? 'url' : 'text'}
              inputMode={f.kind === 'number' ? 'decimal' : undefined}
              error={fieldError(f)} />
          )
        })}

        {type === 'hours' && <HoursEditor schedule={schedule} onChange={setSchedule} />}
        {type === 'gallery' && <GalleryEditor items={gallery} onChange={setGallery} userId={userId} />}
        {type === 'cards' && <CardsEditor items={cards} onChange={c => { setCards(c); setError(null) }} userId={userId} />}
        {type === 'testimonials' && (
          <ReviewsEditor items={reviews} onChange={r => { setReviews(r); setError(null) }}
            google={google} onGoogle={g => { setGoogle(g); setError(null) }} />
        )}

        {translatable.length > 0 && (
          <div className="st-card" style={{ background: 'var(--st-bg)' }}>
            <div className="st-row" style={{ justifyContent: 'space-between' }}>
              <span className="st-label"><span className="st-en-tag">EN</span>{e.enOptional}</span>
              <Button size="sm" variant="ghost" onClick={() => setShowEn(s => !s)} aria-expanded={showEn}>
                {showEn ? t.common.hide : t.common.add}
              </Button>
            </div>
            {showEn && (
              <div className="st-stack" style={{ marginTop: 12 }}>
                {translatable.map(f => (
                  <TextField key={f.key} label={f.label} value={en[f.key] ?? ''} maxLength={f.maxLength}
                    multiline={f.kind === 'textarea'} placeholder={values[f.key]}
                    onChange={v => setEn(prev => ({ ...prev, [f.key]: v }))} />
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="st-error" role="alert">{error}</p>}
      </div>
    </Drawer>
  )
}

// ── Horarios ────────────────────────────────────────────────────────────────

function HoursEditor({ schedule, onChange }: { schedule: WeekSchedule; onChange: (s: WeekSchedule) => void }) {
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

function GalleryEditor({ items, onChange, userId }: {
  items: { url: string; type?: string; caption?: string }[]
  onChange: (items: { url: string; type?: string; caption?: string }[]) => void
  userId: string
}) {
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

function CardsEditor({ items, onChange, userId }: { items: CardItem[]; onChange: (items: CardItem[]) => void; userId: string }) {
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

interface ReviewItem { author_name?: string; rating?: number; text?: string }

function ReviewsEditor({ items, onChange, google, onGoogle }: {
  items: ReviewItem[]
  onChange: (items: ReviewItem[]) => void
  google: { rating: string; count: string; url: string }
  onGoogle: (g: { rating: string; count: string; url: string }) => void
}) {
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
