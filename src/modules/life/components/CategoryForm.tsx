import { useId, useState } from 'react'
import { Check } from 'lucide-react'
import { LifeButton, colors, font, radius, ink } from '../design-system'
import { LIFE_COLORS } from '../lib/lifePalette'
import { CATEGORY_NAME_MAX, categoryNameError, type CustomCategory, type MoneyType } from '../lib/moneyCategories'
import { useLifeT } from '@/i18n/app/life'
import { categorySaveError } from '../hooks/useCategories'

/** Nombre + color de la paleta. Lo usan "+ Nueva" en un movimiento y "Editar" en Ajustes. */
export function CategoryForm({ type, items, initial, defaultColor, submitLabel, onSubmit, onCancel }: {
  type: MoneyType
  items: readonly CustomCategory[]
  initial?: { id: string; name: string; color: string }
  defaultColor?: string
  submitLabel: string
  onSubmit: (name: string, color: string) => Promise<void>
  onCancel: () => void
}) {
  const t = useLifeT()
  const c = t.categoriesUi
  const id = useId()
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState<string>(initial?.color ?? defaultColor ?? LIFE_COLORS[0])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const problem = categoryNameError(name, type, items, t.categories, initial?.id)
    if (problem) { setError(c.errors[problem]); return }
    setSaving(true)
    try {
      await onSubmit(name, color)
    } catch (err) {
      setError(categorySaveError(err, t))
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: radius.md, background: colors.surface.high, border: `1px solid ${colors.border.subtle}` }}>
      <label htmlFor={`${id}-name`} style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: colors.text.secondary }}>{c.name}</label>
      <input id={`${id}-name`} value={name} maxLength={CATEGORY_NAME_MAX} autoFocus placeholder={c.namePlaceholder}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        onChange={e => { setName(e.target.value); setError('') }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }}
        style={{
          width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '10px 12px', borderRadius: radius.md,
          background: colors.surface.base, border: `1px solid ${error ? colors.semantic.error : colors.border.subtle}`,
          color: colors.text.primary, fontFamily: font, fontSize: 16, outline: 'none',
        }} />
      <div role="radiogroup" aria-label={c.color} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {LIFE_COLORS.map((hex, i) => (
          <button key={hex} type="button" role="radio" aria-checked={color === hex} aria-label={c.colors[i]} title={c.colors[i]}
            onClick={() => setColor(hex)}
            style={{
              width: 36, height: 36, borderRadius: radius.full, cursor: 'pointer', padding: 0,
              background: ink(hex), border: `2px solid ${color === hex ? colors.text.primary : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {color === hex && <Check size={16} aria-hidden="true" style={{ color: colors.bg }} strokeWidth={3} />}
          </button>
        ))}
      </div>
      {error && <p id={`${id}-error`} role="alert" style={{ fontFamily: font, fontSize: 12, color: colors.semantic.error, margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <LifeButton variant="ghost" size="sm" type="button" onClick={onCancel}>{t.common.cancel}</LifeButton>
        <LifeButton size="sm" type="button" onClick={() => void submit()} disabled={saving}>{saving ? t.common.saving : submitLabel}</LifeButton>
      </div>
    </div>
  )
}
