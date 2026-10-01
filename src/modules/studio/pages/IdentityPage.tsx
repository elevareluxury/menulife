import { useState } from 'react'
import { X } from 'lucide-react'
import type { PrimaryAction, Translations } from '@/modules/profile/lib/profileTypes'
import { safeHref } from '@/modules/profile/lib/safeUrl'
import { useStudio } from '../StudioContext'
import { uploadMedia } from '../lib/studioApi'
import { Button, ImageField, PageHeader, SelectField, TextField } from '../components/ui'
import { EditTabs, ProfileSaveIndicator } from '../components/shared'

const PURPOSES = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Profesional' },
  { value: 'creator', label: 'Creador/a' },
  { value: 'business', label: 'Negocio' },
  { value: 'event', label: 'Evento' },
]

type EnField = 'display_name' | 'descriptor' | 'bio' | 'primary_action_label'

export function IdentityPage() {
  const { profile, patchProfile, userId, business } = useStudio()
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
      <PageHeader title="Mi identidad" subtitle="Lo primero que ve quien abre tu perfil." actions={<ProfileSaveIndicator />} />

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>Imagen</h2>
        <ImageField label="Foto de perfil" shape="round" value={profile.avatar_url}
          onUpload={f => upload('avatar_url', f)} onClear={() => patchProfile({ avatar_url: null })}
          help="Cuadrada, mínimo 400 × 400 px. JPG, PNG o WebP hasta 5 MB." />
        <ImageField label="Portada (opcional)" shape="wide" value={profile.cover_url}
          onUpload={f => upload('cover_url', f)} onClear={() => patchProfile({ cover_url: null })}
          help="Horizontal, recomendado 1200 × 400 px." />
      </section>

      <section className="st-card st-stack">
        <h2 className="st-card-title" style={{ margin: 0 }}>Quién sos</h2>
        <TextField label="Nombre" required maxLength={80} value={profile.display_name}
          onChange={v => patchProfile({ display_name: v })}
          error={!profile.display_name.trim() ? 'El nombre no puede quedar vacío.' : null} />
        <TextField label="Descriptor" maxLength={120} value={profile.descriptor ?? ''}
          placeholder="Directora creativa · Fundadora" help="Una línea: qué hacés o qué es tu negocio."
          onChange={v => patchProfile({ descriptor: v || null })} />
        <TextField label="Bio" multiline maxLength={1000} value={profile.bio ?? ''}
          placeholder="Contá en pocas líneas quién sos y qué ofrecés."
          onChange={v => patchProfile({ bio: v || null })} />
        <SelectField label="Propósito" value={profile.purpose ?? ''} options={PURPOSES}
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

      <section className="st-card st-stack">
        <div className="st-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="st-card-title" style={{ margin: 0 }}>Versión en inglés</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowEn(s => !s)} aria-expanded={showEn}>
            {showEn ? 'Ocultar' : 'Editar'}
          </Button>
        </div>
        <p className="st-help" style={{ margin: 0 }}>
          Opcional. Lo que completes acá se muestra cuando el visitante elige EN; lo que quede vacío se mostrará en español.
        </p>
        {showEn && (
          <>
            <TextField label={<><span className="st-en-tag">EN</span>Nombre</>} maxLength={80}
              value={enValue('display_name')} onChange={v => setEn('display_name', v)} placeholder={profile.display_name} />
            <TextField label={<><span className="st-en-tag">EN</span>Descriptor</>} maxLength={120}
              value={enValue('descriptor')} onChange={v => setEn('descriptor', v)} placeholder={profile.descriptor ?? ''} />
            <TextField label={<><span className="st-en-tag">EN</span>Bio</>} multiline maxLength={1000}
              value={enValue('bio')} onChange={v => setEn('bio', v)} />
          </>
        )}
      </section>
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
  const presets: { kind: string; label: string; url: string; hint?: string }[] = [
    ...(businessSlug && businessType !== 'retail' ? [{ kind: 'menu', label: 'Ver menú', url: `/r/${businessSlug}` }] : []),
    ...(businessSlug && businessType === 'retail' ? [{ kind: 'shop', label: 'Ver catálogo', url: `/catalogo/${businessSlug}` }] : []),
    { kind: 'whatsapp', label: 'Escribime por WhatsApp', url: 'https://wa.me/', hint: 'Completá tu número después de wa.me/' },
    { kind: 'contact', label: 'Contactar', url: 'mailto:' , hint: 'Completá tu email después de mailto:' },
    { kind: 'web', label: 'Visitar web', url: 'https://' },
    { kind: 'portfolio', label: 'Ver portfolio', url: 'https://' },
    { kind: 'booking', label: 'Agendar', url: 'https://' },
  ]
  const [hint, setHint] = useState<string | null>(null)
  const urlError = value && value.url && !safeHref(value.url) ? 'La URL no es válida.' : null
  const incomplete = value && (/^(https:\/\/|mailto:|https:\/\/wa\.me\/)$/.test(value.url) || !value.url)

  return (
    <section className="st-card st-stack">
      <div>
        <h2 className="st-card-title" style={{ margin: 0 }}>Acción principal</h2>
        <p className="st-help" style={{ margin: '6px 0 0' }}>El botón más visible de tu perfil. Si no elegís ninguno, no se muestra.</p>
      </div>
      <div className="st-row" style={{ flexWrap: 'wrap', gap: 8 }}>
        {presets.map(p => (
          <Button key={p.kind + p.label} size="sm" variant={value?.kind === p.kind ? 'primary' : 'secondary'}
            onClick={() => { onChange({ kind: p.kind, label: p.label, url: p.url }); setHint(p.hint ?? null) }}>
            {p.label}
          </Button>
        ))}
        {value && <Button size="sm" variant="ghost" onClick={() => { onChange(null); setHint(null) }}>Sin acción</Button>}
      </div>
      {value && (
        <div className="st-grid-2">
          <TextField label="Texto del botón" required maxLength={40} value={value.label}
            onChange={v => onChange({ ...value, label: v, kind: value.kind || 'custom' })}
            error={!value.label.trim() ? 'Escribí el texto del botón.' : null} />
          <TextField label="Destino (URL)" required value={value.url}
            onChange={v => onChange({ ...value, url: v })}
            error={urlError ?? (incomplete ? (hint ?? 'Completá la dirección.') : null)} />
          {showEn && (
            <TextField label={<><span className="st-en-tag">EN</span>Texto del botón</>} maxLength={40}
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

  function add() {
    const value = draft.trim().replace(/\s+/g, ' ').slice(0, 30)
    if (!value) return
    if (tags.some(t => t.toLowerCase() === value.toLowerCase())) { setError('Esa etiqueta ya está.'); return }
    if (tags.length >= MAX_TAGS) { setError(`Podés tener hasta ${MAX_TAGS} etiquetas.`); return }
    onChange([...tags, value])
    setDraft(''); setError(null)
  }

  return (
    <div className="st-field">
      <TextField label="Etiquetas (opcional)" value={draft} maxLength={30}
        onChange={v => { setDraft(v); setError(null) }} onEnter={add}
        placeholder="Ej. Pizza, Vinos, Diseño… · Enter para agregar"
        help={`Se muestran debajo de tu nombre. Hasta ${MAX_TAGS}.`} error={error} />
      <div className="st-row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {tags.map(t => (
          <span key={t} className="st-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 4px 4px 10px', fontSize: 13 }}>
            {t}
            <button type="button" className="st-icon-btn" style={{ width: 24, height: 24 }}
              aria-label={`Quitar etiqueta ${t}`} onClick={() => onChange(tags.filter(x => x !== t))}><X size={13} /></button>
          </span>
        ))}
        <Button size="sm" variant="ghost" onClick={add} disabled={!draft.trim()}>Agregar etiqueta</Button>
      </div>
    </div>
  )
}
