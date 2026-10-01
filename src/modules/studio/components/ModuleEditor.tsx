import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ModuleType, Translations, WeekSchedule } from '@/modules/profile/lib/profileTypes'
import { WEEK_DAYS } from '@/modules/profile/lib/schedule'
import { useStudio } from '../StudioContext'
import { createModule, friendlyError, updateModule, uploadMedia } from '../lib/studioApi'
import { moduleDef, socialUrl, type FieldDef } from '../lib/moduleCatalog'
import type { StudioModule } from '../lib/studioTypes'
import { Button, Drawer, ImageField, SelectField, TextField } from './ui'

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
  friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

const str = (v: unknown) => (v == null ? '' : String(v))

function initialValues(type: ModuleType, module: StudioModule | null): Record<string, string> {
  const def = moduleDef(type)
  const values: Record<string, string> = {}
  for (const f of def.fields) {
    values[f.key] = f.isTitle ? str(module?.title) : str(module?.content[f.key])
  }
  if (type === 'social' && module && !values.handle) values.handle = str(module.content.url)
  return values
}

function initialEn(module: StudioModule | null): Record<string, string> {
  const en = (module?.translations?.en ?? {}) as Record<string, unknown>
  return Object.fromEntries(Object.entries(en).filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')) as Record<string, string>
}

/** Crear o editar un módulo. `module` null = nuevo. */
export function ModuleEditor({ type, module, onClose }: { type: ModuleType; module: StudioModule | null; onClose: () => void }) {
  const { profile, modules, setModules, userId, business } = useStudio()
  const def = moduleDef(type)
  const [values, setValues] = useState(() => initialValues(type, module))
  const [en, setEn] = useState(() => initialEn(module))
  const [showEn, setShowEn] = useState(() => Object.keys(initialEn(module)).length > 0)
  const [schedule, setSchedule] = useState<WeekSchedule>(() => (module?.content.schedule as WeekSchedule) ?? {})
  const [gallery, setGallery] = useState<{ url: string; type?: string; caption?: string }[]>(
    () => (Array.isArray(module?.content.items) ? module!.content.items as { url: string }[] : []))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string) => { setValues(prev => ({ ...prev, [k]: v })); setError(null) }
  const translatable = def.fields.filter(f => f.translatable)

  function fieldError(f: FieldDef): string | null {
    if (!submitted) return null
    if (f.required && !values[f.key]?.trim()) return 'Este campo es obligatorio.'
    if (f.kind === 'number' && values[f.key] && Number.isNaN(Number(values[f.key].replace(',', '.')))) return 'Ingresá un número.'
    return null
  }

  function validate(): string | null {
    for (const f of def.fields) {
      if (f.required && !values[f.key]?.trim()) return `Completá "${f.label}".`
    }
    if (type === 'gallery' && gallery.length === 0) return 'Subí al menos una foto.'
    if (type === 'hours' && !WEEK_DAYS.some(d => schedule[d])) return 'Configurá al menos un día.'
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
    } catch (e) {
      setError(friendlyError(e))
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={`${module ? 'Editar' : 'Agregar'} ${def.label.toLowerCase()}`}
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={saving} onClick={save}>{module ? 'Guardar cambios' : 'Agregar'}</Button>
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

        {translatable.length > 0 && (
          <div className="st-card" style={{ background: 'var(--st-bg)' }}>
            <div className="st-row" style={{ justifyContent: 'space-between' }}>
              <span className="st-label"><span className="st-en-tag">EN</span>Versión en inglés (opcional)</span>
              <Button size="sm" variant="ghost" onClick={() => setShowEn(s => !s)} aria-expanded={showEn}>
                {showEn ? 'Ocultar' : 'Agregar'}
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
  return (
    <div className="st-stack" style={{ gap: 6 }}>
      <span className="st-label">Horario semanal</span>
      <p className="st-help" style={{ margin: 0 }}>Si cerrás después de medianoche (ej. 20:00 a 02:00) se calcula bien igual.</p>
      {WEEK_DAYS.map(day => {
        const slot = schedule[day] ?? { open: '09:00', close: '18:00', closed: true }
        const open = !slot.closed
        const update = (patch: Partial<typeof slot>) => onChange({ ...schedule, [day]: { ...slot, ...patch } })
        return (
          <div key={day} className="st-row" style={{ minHeight: 44, borderTop: '1px solid var(--st-border)', paddingTop: 6 }}>
            <span style={{ width: 92, fontSize: 14 }}>{DAY_LABELS[day]}</span>
            <button type="button" role="switch" aria-checked={open} aria-label={`${DAY_LABELS[day]} abierto`}
              className="st-toggle" onClick={() => update({ closed: open })}><span aria-hidden="true" /></button>
            {open ? (
              <>
                <input className="st-input" type="time" aria-label={`${DAY_LABELS[day]} apertura`} style={{ width: 'auto', padding: '7px 8px' }}
                  value={slot.open ?? '09:00'} onChange={e => update({ open: e.target.value })} />
                <span aria-hidden="true">–</span>
                <input className="st-input" type="time" aria-label={`${DAY_LABELS[day]} cierre`} style={{ width: 'auto', padding: '7px 8px' }}
                  value={slot.close ?? '18:00'} onChange={e => update({ close: e.target.value })} />
              </>
            ) : <span className="st-help">Cerrado</span>}
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
  return (
    <div className="st-stack" style={{ gap: 8 }}>
      <span className="st-label">Fotos ({items.length})</span>
      {items.map((item, i) => (
        <div key={item.url + i} className="st-row">
          <img className="st-image-thumb" src={item.url} alt="" />
          <span className="st-help" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>Foto {i + 1}</span>
          <button type="button" className="st-icon-btn" aria-label={`Quitar foto ${i + 1}`}
            onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
        </div>
      ))}
      {adding
        ? <ImageField label="Nueva foto" value={null}
            onUpload={async f => { onChange([...items, { url: await uploadMedia(userId, f), type: 'image' }]); setAdding(false) }}
            onClear={() => setAdding(false)} />
        : <Button size="sm" onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true" /> Agregar foto</Button>}
    </div>
  )
}
