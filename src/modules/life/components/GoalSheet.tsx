import { useState, useEffect } from 'react'
import { useLifeT } from '@/i18n/app/life'
import { LifeSheet, LifeButton, colors, font, radius, ink } from '../design-system'
import { LIFE_COLORS } from '../lib/lifePalette'
import type { Goal, GoalFormData } from '../hooks/useGoals'

interface GoalSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: GoalFormData) => Promise<void>
  initial?: Goal | null
}

const DEFAULT: GoalFormData = { name: '', description: '', target_date: '', color: colors.area.goals }

const label: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px',
}
const field: React.CSSProperties = {
  width: '100%', padding: '12px 14px', boxSizing: 'border-box', borderRadius: radius.md,
  background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
  color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
}

export function GoalSheet({ open, onClose, onSave, initial }: GoalSheetProps) {
  const t = useLifeT()
  const [form, setForm] = useState<GoalFormData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm(initial ? {
      name: initial.name, description: initial.description ?? '',
      target_date: initial.target_date ?? '', color: initial.color,
    } : DEFAULT)
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial])

  const handleSave = async () => {
    if (!form.name.trim()) { setError(t.goalSheet.nameRequired); return }
    setSaving(true)
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        target_date: form.target_date || undefined,
      })
      onClose()
    } catch { setError(t.common.saveError) }
    finally { setSaving(false) }
  }

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? t.goalSheet.editTitle : t.goalSheet.newTitle}>
      <div aria-hidden="true" style={{ height: 4, borderRadius: radius.full, background: ink(form.color), marginBottom: '20px' }} />

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="goal-name" style={label}>{t.goalSheet.name}</label>
        <input id="goal-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={t.goalSheet.namePlaceholder} maxLength={80} aria-invalid={!!error && !form.name.trim()}
          style={{ ...field, fontWeight: 600, border: `1px solid ${error && !form.name.trim() ? colors.semantic.error : colors.border.medium}` }} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="goal-description" style={label}>{t.goalSheet.description}</label>
        <textarea id="goal-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder={t.goalSheet.descriptionPlaceholder} rows={3} maxLength={300}
          style={{ ...field, resize: 'vertical', minHeight: '72px' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="goal-date" style={label}>{t.goalSheet.targetDate}</label>
        <input id="goal-date" type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
          style={{ ...field, color: form.target_date ? colors.text.primary : colors.text.tertiary, colorScheme: 'inherit' }} />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <span style={label}>{t.goalSheet.color}</span>
        <div role="radiogroup" aria-label={t.goalSheet.color} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {LIFE_COLORS.map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={form.color === c} aria-label={t.goalSheet.colorN(i + 1)}
              onClick={() => setForm(f => ({ ...f, color: c }))}
              style={{
                width: 36, height: 36, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                boxShadow: form.color === c ? `0 0 0 3px ${c}55, 0 0 0 5px ${colors.surface.elevated}` : 'none',
              }} />
          ))}
        </div>
      </div>

      {error && <p role="alert" style={{ fontFamily: font, fontSize: '13px', color: colors.semantic.error, marginBottom: '12px' }}>{error}</p>}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? t.common.saving : initial ? t.goalSheet.update : t.goalSheet.create}
      </LifeButton>
    </LifeSheet>
  )
}
