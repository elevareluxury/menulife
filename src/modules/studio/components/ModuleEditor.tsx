import { useState } from 'react'
import type { ModuleType, Translations } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'
import { createModule, friendlyError, updateModule, uploadMedia } from '../lib/studioApi'
import { moduleDef, type FieldDef } from '../lib/moduleCatalog'
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
  def.prefill?.(values, module?.content ?? null)
  return values
}

function initialEn(module: StudioModule | null): Record<string, string> {
  const en = (module?.translations?.en ?? {}) as Record<string, unknown>
  return Object.fromEntries(Object.entries(en).filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')) as Record<string, string>
}

/** Crear o editar un módulo. `module` null = nuevo. Todo lo propio de cada tipo sale de su definición en el catálogo. */
export function ModuleEditor({ type, module, onClose }: { type: ModuleType; module: StudioModule | null; onClose: () => void }) {
  const { profile, modules, setModules, userId, business } = useStudio()
  const t = useStudioT()
  const e = t.editor
  const def = moduleDef(type, t)
  const [values, setValues] = useState(() => initialValues(type, module, t))
  const [en, setEn] = useState(() => initialEn(module))
  const [showEn, setShowEn] = useState(() => Object.keys(initialEn(module)).length > 0)
  const [extra, setExtra] = useState<unknown>(() => def.extra?.init(module))
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
    const extraProblem = def.extra?.validate(extra)
    if (extraProblem) return extraProblem
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
    def.finalize?.(content, values)
    def.extra?.apply(extra, content, { businessTimezone: business?.timezone })

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

        {def.extra && <def.extra.Editor value={extra} onChange={v => { setExtra(v); setError(null) }} userId={userId} />}

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
