import { useState } from 'react'
import { X } from 'lucide-react'
import type { PrimaryAction, Translations } from '@/modules/profile/lib/profileTypes'
import { safeHref } from '@/modules/profile/lib/safeUrl'
import { useStudio } from '../StudioContext'
import { uploadMedia } from '../lib/studioApi'
import { Button, ImageField, PageHeader, SelectField, TextField } from '../components/ui'
import { EditTabs, ProfileSaveIndicator } from '../components/shared'
import { useStudioT } from '@/i18n/app/studio'

const PURPOSES = ['personal', 'professional', 'creator', 'business', 'event']

type EnField = 'display_name' | 'descriptor' | 'bio' | 'primary_action_label'

export function IdentityPage() {
  const { profile, patchProfile, userId, business } = useStudio()
  const t = useStudioT()
  const id = t.identity
  const [showEn, setShowEn] = useState(() => Object.keys(profile.translations?.en ?? {}).some(k => !k.startsWith('_')))

  const en = (profile.translations?.en ?? {}) as Record<string, unknown>
  const enValue = (k: EnField) => (typeof en[k] === 'string' ? (en[k] as string) : '')

  function setEn(field: EnField, value: string) {
    const nextEn: Record<string, unknown> = { ...en, [field]: value, _source: 'manual' }
    if (!value) delete nextEn[field]
    const next: Translations = { ...profile.translations, en: nextEn }
    patchProfile({ translations: next })
  }

  async function upload(field: 'avatar_url' | 'cover_url', file: File) {
    const url = await uploadMedia(userId, file)
    patchProfile({ [field]: url })
  }

  return (
    <>
      <EditTabs />
      <PageHeader title={id.title} subtitle={id.subtitle} actions={<ProfileSaveIndicator />} />

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{id.image}</h2>
        <ImageField label={id.avatar} shape="round" value={profile.avatar_url}
          onUpload={f => upload('avatar_url', f)} onClear={() => patchProfile({ avatar_url: null })}
          help={id.avatarHelp} />
        <ImageField label={id.cover} shape="wide" value={profile.cover_url}
          onUpload={f => upload('cover_url', f)} onClear={() => patchProfile({ cover_url: null })}
          help={id.coverHelp} />
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>{id.who}</h2>
        <TextField label={id.name} required maxLength={80} value={profile.display_name}
          onChange={v => patchProfile({ display_name: v })}
          error={!profile.display_name.trim() ? id.nameEmpty : null} />
        <TextField label={id.descriptor} maxLength={120} value={profile.descriptor ?? ''}
          placeholder={id.descriptorPlaceholder} help={id.descriptorHelp}
          onChange={v => patchProfile({ descriptor: v || null })} />
        <TextField label={id.bio} multiline maxLength={1000} value={profile.bio ?? ''}
          placeholder={id.bioPlaceholder}
          onChange={v => patchProfile({ bio: v || null })} />
        <SelectField label={id.purpose} value={profile.purpose ?? ''} options={PURPOSES.map(v => ({ value: v, label: id.purposes[v] }))}
          onChange={v => patchProfile({ purpose: v || null })} />
        <TagsField tags={profile.tags ?? []} onChange={tags => patchProfile({ tags })} />
      </section>

      <PrimaryActionCard
        value={profile.primary_action}
        onChange={v => patchProfile({ primary_action: v })}
        businessSlug={business?.slug ?? null}
        businessType={business?.business_type ?? null}
        enLabel={enValue('primary_action_label')}
        onEnLabel={v => setEn('primary_action_label', v)}
        showEn={showEn}
      />

      {profile.default_locale !== 'en' && (
      <section className="st-card st-stack">
        <div className="st-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="st-card-title" style={{ margin: 0 }}>{id.enTitle}</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowEn(s => !s)} aria-expanded={showEn}>
            {showEn ? t.common.hide : t.common.edit}
          </Button>
        </div>
        <p className="st-help" style={{ margin: 0 }}>{id.enHelp}</p>
        {showEn && (
          <>
            <TextField label={<><span className="st-en-tag">EN</span>{id.name}</>} maxLength={80}
              value={enValue('display_name')} onChange={v => setEn('display_name', v)} placeholder={profile.display_name} />
            <TextField label={<><span className="st-en-tag">EN</span>{id.descriptor}</>} maxLength={120}
              value={enValue('descriptor')} onChange={v => setEn('descriptor', v)} placeholder={profile.descriptor ?? ''} />
            <TextField label={<><span className="st-en-tag">EN</span>{id.bio}</>} multiline maxLength={1000}
              value={enValue('bio')} onChange={v => setEn('bio', v)} />
          </>
        )}
      </section>
      )}
    </>
  )
}

// ── Acción principal ────────────────────────────────────────────────────────

function PrimaryActionCard({ value, onChange, businessSlug, businessType, enLabel, onEnLabel, showEn }: {
  value: PrimaryAction | null
  onChange: (v: PrimaryAction | null) => void
  businessSlug: string | null
  businessType: string | null
  enLabel: string
  onEnLabel: (v: string) => void
  showEn: boolean
}) {
  const t = useStudioT()
  const id = t.identity
  const ps = id.presets
  const presets: { kind: string; label: string; url: string; hint?: string }[] = [
    ...(businessSlug && businessType !== 'retail' ? [{ kind: 'menu', label: ps.menu, url: `/r/${businessSlug}` }] : []),
    ...(businessSlug && businessType === 'retail' ? [{ kind: 'shop', label: ps.shop, url: `/catalogo/${businessSlug}` }] : []),
    { kind: 'whatsapp', label: ps.whatsapp, url: 'https://wa.me/', hint: id.hintWhatsapp },
    { kind: 'contact', label: ps.contact, url: 'mailto:' , hint: id.hintMail },
    { kind: 'web', label: ps.web, url: 'https://' },
    { kind: 'portfolio', label: ps.portfolio, url: 'https://' },
    { kind: 'booking', label: ps.booking, url: 'https://' },
  ]
  const [hint, setHint] = useState<string | null>(null)
  const urlError = value && value.url && !safeHref(value.url) ? id.invalidUrl : null
  const incomplete = value && (/^(https:\/\/|mailto:|https:\/\/wa\.me\/)$/.test(value.url) || !value.url)

  return (
    <section className="st-card st-stack">
      <div>
        <h2 className="st-card-title" style={{ margin: 0 }}>{id.actionTitle}</h2>
        <p className="st-help" style={{ margin: '6px 0 0' }}>{id.actionHelp}</p>
      </div>
      <div className="st-row" style={{ flexWrap: 'wrap', gap: 8 }}>
        {presets.map(p => (
          <Button key={p.kind + p.label} size="sm" variant={value?.kind === p.kind ? 'primary' : 'secondary'}
            onClick={() => { onChange({ kind: p.kind, label: p.label, url: p.url }); setHint(p.hint ?? null) }}>
            {p.label}
          </Button>
        ))}
        {value && <Button size="sm" variant="ghost" onClick={() => { onChange(null); setHint(null) }}>{id.noAction}</Button>}
      </div>
      {value && (
        <div className="st-grid-2">
          <TextField label={id.buttonText} required maxLength={40} value={value.label}
            onChange={v => onChange({ ...value, label: v, kind: value.kind || 'custom' })}
            error={!value.label.trim() ? id.buttonTextEmpty : null} />
          <TextField label={id.destination} required value={value.url}
            onChange={v => onChange({ ...value, url: v })}
            error={urlError ?? (incomplete ? (hint ?? id.completeAddress) : null)} />
          {showEn && (
            <TextField label={<><span className="st-en-tag">EN</span>{id.buttonText}</>} maxLength={40}
              value={enLabel} onChange={onEnLabel} />
          )}
        </div>
      )}
    </section>
  )
}

// ── Etiquetas ───────────────────────────────────────────────────────────────

const MAX_TAGS = 8

function TagsField({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const id = useStudioT().identity

  function add() {
    const value = draft.trim().replace(/\s+/g, ' ').slice(0, 30)
    if (!value) return
    if (tags.some(t => t.toLowerCase() === value.toLowerCase())) { setError(id.tagExists); return }
    if (tags.length >= MAX_TAGS) { setError(id.tagsMax(MAX_TAGS)); return }
    onChange([...tags, value])
    setDraft(''); setError(null)
  }

  return (
    <div className="st-field">
      <TextField label={id.tags} value={draft} maxLength={30}
        onChange={v => { setDraft(v); setError(null) }} onEnter={add}
        placeholder={id.tagsPlaceholder}
        help={id.tagsHelp(MAX_TAGS)} error={error} />
      <div className="st-row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {tags.map(t => (
          <span key={t} className="st-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 4px 4px 10px', fontSize: 13 }}>
            {t}
            <button type="button" className="st-icon-btn" style={{ width: 24, height: 24 }}
              aria-label={id.removeTag(t)} onClick={() => onChange(tags.filter(x => x !== t))}><X size={13} /></button>
          </span>
        ))}
        <Button size="sm" variant="ghost" onClick={add} disabled={!draft.trim()}>{id.addTag}</Button>
      </div>
    </div>
  )
}
