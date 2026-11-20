import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useStudioT, type StudioDict } from '@/i18n/app/studio'
import { useAppLang } from '@/i18n/app/store'
import { AUDIENCE_PLATFORMS, MEASURE_CM, MEASURE_TEXT, REP_ROLES } from '@/modules/profile/lib/portfolio'
import { portfolioStrings, type PortfolioStrings } from '@/modules/profile/lib/portfolioI18n'
import { uploadMedia } from '../lib/studioApi'
import { Button, ImageField, SelectField, TextField } from './ui'
import type { ExtraEditorProps } from './moduleExtraEditors'

// Editores del portfolio profesional (medidas, audiencia, marcas, prensa, créditos, representación). Las reglas que
// valen al mostrar están en profile/lib/portfolio.ts; acá sólo se cargan.

export type Row = Record<string, string>
export interface AudienceValue { as_of: string; items: Row[] }

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', x: 'X', twitch: 'Twitch', spotify: 'Spotify',
  facebook: 'Facebook', threads: 'Threads', linkedin: 'LinkedIn', pinterest: 'Pinterest', kick: 'Kick',
}

function usePortfolio() {
  const t = useStudioT()
  const lang = useAppLang(st => st.lang)
  return { t, p: t.portfolio, pub: portfolioStrings(lang) }
}

/** Medidas: un campo por dato; vacío = no se muestra */
export function MeasurementsEditor({ value, onChange }: ExtraEditorProps<Row>) {
  const { p, pub } = usePortfolio()
  const set = (k: string, v: string) => onChange({ ...value, [k]: v })
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      <p className="st-help" style={{ margin: 0 }}>{p.measuresHelp}</p>
      <div className="st-grid-2">
        {MEASURE_CM.map(k => (
          <TextField key={k} label={`${pub.measures[k]} (cm)`} value={value[k] ?? ''} inputMode="decimal" maxLength={6} onChange={v => set(k, v)} />
        ))}
        {MEASURE_TEXT.map(k => (
          <TextField key={k} label={pub.measures[k]} value={value[k] ?? ''} maxLength={24} onChange={v => set(k, v)} />
        ))}
      </div>
      <p className="st-help" style={{ margin: 0 }}>{p.privacyHint}</p>
    </div>
  )
}

type Kind = 'text' | 'textarea' | 'url' | 'email' | 'tel' | 'date' | 'number' | 'image' | 'select'
interface Spec { key: string; label: string; kind: Kind; maxLength?: number; options?: { value: string; label: string }[]; inputMode?: 'decimal' | 'numeric' }

function ItemsEditor({ value, onChange, userId, specs, max, blank, title }: ExtraEditorProps<Row[]> & {
  specs: Spec[]; max: number; blank: Row; title: (row: Row, i: number) => string
}) {
  const { p } = usePortfolio()
  const update = (i: number, k: string, v: string) => onChange(value.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const move = (i: number, d: -1 | 1) => {
    const to = i + d
    if (to < 0 || to >= value.length) return
    const next = [...value]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
  }
  return (
    <div className="st-stack" style={{ gap: 10 }}>
      {value.map((row, i) => (
        <div key={i} className="st-card" style={{ background: 'var(--st-bg)', margin: 0 }}>
          <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <strong style={{ fontSize: 14, minWidth: 0, overflowWrap: 'anywhere' }}>{title(row, i)}</strong>
            <div className="st-row" style={{ gap: 0 }}>
              <button type="button" className="st-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={p.up(i + 1)}><ArrowUp size={15} /></button>
              <button type="button" className="st-icon-btn" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={p.down(i + 1)}><ArrowDown size={15} /></button>
              <button type="button" className="st-icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={p.remove(i + 1)}><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="st-stack" style={{ gap: 12 }}>
            {specs.map(s => s.kind === 'image'
              ? <ImageField key={s.key} label={s.label} shape="wide" value={row[s.key] || null}
                  onUpload={async f => update(i, s.key, await uploadMedia(userId, f))} onClear={() => update(i, s.key, '')} />
              : s.kind === 'select'
                ? <SelectField key={s.key} label={s.label} required value={row[s.key] ?? ''} options={s.options ?? []} onChange={v => update(i, s.key, v)} />
                : <TextField key={s.key} label={s.label} value={row[s.key] ?? ''} maxLength={s.maxLength} multiline={s.kind === 'textarea'}
                    type={s.kind === 'textarea' || s.kind === 'number' ? 'text' : s.kind} inputMode={s.inputMode} onChange={v => update(i, s.key, v)} />)}
          </div>
        </div>
      ))}
      {value.length < max && (
        <Button size="sm" onClick={() => onChange([...value, { ...blank }])}><Plus size={15} aria-hidden="true" /> {p.add}</Button>
      )}
      <p className="st-help" style={{ margin: 0 }}>{p.privacyHint}</p>
    </div>
  )
}

const platformOptions = (p: StudioDict['portfolio']) =>
  AUDIENCE_PLATFORMS.map(v => ({ value: v, label: PLATFORM_NAMES[v] ?? p.other }))

export function AudienceEditor({ value, onChange, userId }: ExtraEditorProps<AudienceValue>) {
  const { p } = usePortfolio()
  const specs: Spec[] = [
    { key: 'platform', label: p.platform, kind: 'select', options: platformOptions(p) },
    { key: 'handle', label: p.handle, kind: 'text', maxLength: 60 },
    { key: 'followers', label: p.followers, kind: 'number', inputMode: 'numeric', maxLength: 14 },
    { key: 'avg_views', label: p.avgViews, kind: 'number', inputMode: 'numeric', maxLength: 14 },
    { key: 'engagement', label: p.engagement, kind: 'number', inputMode: 'decimal', maxLength: 5 },
    { key: 'url', label: p.link, kind: 'url' },
  ]
  return (
    <div className="st-stack" style={{ gap: 12 }}>
      <TextField label={p.asOf} type="date" value={value.as_of} help={p.asOfHelp} onChange={as_of => onChange({ ...value, as_of })} />
      <ItemsEditor value={value.items} onChange={items => onChange({ ...value, items })} userId={userId} specs={specs} max={12}
        blank={{ platform: 'instagram' }} title={(r, i) => (PLATFORM_NAMES[r.platform] ?? p.other) + (r.handle ? ` · @${r.handle.replace(/^@/, '')}` : '') || p.item(i + 1)} />
    </div>
  )
}

export function BrandsEditor(props: ExtraEditorProps<Row[]>) {
  const { p } = usePortfolio()
  return <ItemsEditor {...props} max={40} blank={{}} title={(r, i) => r.name?.trim() || p.item(i + 1)} specs={[
    { key: 'name', label: p.brandName, kind: 'text', maxLength: 60 },
    { key: 'logo_url', label: p.logo, kind: 'image' },
    { key: 'url', label: p.link, kind: 'url' },
    { key: 'year', label: p.year, kind: 'number', inputMode: 'numeric', maxLength: 4 },
  ]} />
}

export function PressEditor(props: ExtraEditorProps<Row[]>) {
  const { p } = usePortfolio()
  return <ItemsEditor {...props} max={20} blank={{}} title={(r, i) => r.outlet?.trim() || p.item(i + 1)} specs={[
    { key: 'quote', label: p.quote, kind: 'textarea', maxLength: 400 },
    { key: 'outlet', label: p.outlet, kind: 'text', maxLength: 80 },
    { key: 'url', label: p.link, kind: 'url' },
    { key: 'date', label: p.date, kind: 'date' },
  ]} />
}

export function CreditsEditor(props: ExtraEditorProps<Row[]>) {
  const { p } = usePortfolio()
  return <ItemsEditor {...props} max={60} blank={{}} title={(r, i) => r.title?.trim() || p.item(i + 1)} specs={[
    { key: 'title', label: p.creditTitle, kind: 'text', maxLength: 120 },
    { key: 'role', label: p.role, kind: 'text', maxLength: 80 },
    { key: 'company', label: p.company, kind: 'text', maxLength: 80 },
    { key: 'year', label: p.year, kind: 'number', inputMode: 'numeric', maxLength: 4 },
    { key: 'url', label: p.link, kind: 'url' },
  ]} />
}

const roleOptions = (pub: PortfolioStrings) => REP_ROLES.map(v => ({ value: v, label: pub.roles[v] }))

export function RepresentationEditor(props: ExtraEditorProps<Row[]>) {
  const { p, pub } = usePortfolio()
  return <ItemsEditor {...props} max={12} blank={{ role: 'agency' }} title={(r, i) => r.name?.trim() || p.item(i + 1)} specs={[
    { key: 'role', label: p.repRole, kind: 'select', options: roleOptions(pub) },
    { key: 'name', label: p.repName, kind: 'text', maxLength: 80 },
    { key: 'city', label: p.city, kind: 'text', maxLength: 60 },
    { key: 'email', label: p.email, kind: 'email', maxLength: 254 },
    { key: 'phone', label: p.phone, kind: 'tel', maxLength: 30 },
    { key: 'url', label: p.web, kind: 'url' },
  ]} />
}
