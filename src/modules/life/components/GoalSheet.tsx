import { useState, useEffect } from 'react'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import { LIFE_COLORS } from '../lib/lifePalette'
import type { Goal, GoalFormData } from '../hooks/useGoals'

interface GoalSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: GoalFormData) => Promise<void>
  initial?: Goal | null
}

const DEFAULT: GoalFormData = { name: '', description: '', target_date: '', color: '#3B82F6' }

export function GoalSheet({ open, onClose, onSave, initial }: GoalSheetProps) {
  const [form, setForm] = useState<GoalFormData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name,
        description: initial.description ?? '',
        target_date: initial.target_date ?? '',
        color: initial.color,
      } : DEFAULT)
      setError('')
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true)
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        target_date: form.target_date || undefined,
      })
      onClose()
    } catch { setError('Error al guardar. Intentá de nuevo.') }
    finally { setSaving(false) }
  }

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? 'Editar meta' : 'Nueva meta'}>
      {/* Color bar preview */}
      <div style={{ height: 4, borderRadius: radius.full, background: form.color, marginBottom: '20px' }} />

      {/* Name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          META
        </label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="¿Qué querés lograr?"
          maxLength={80}
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box',
            borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${error && !form.name.trim() ? colors.semantic.error : colors.border.medium}`,
            color: colors.text.primary,
            fontFamily: font, fontSize: '15px', fontWeight: 600, outline: 'none',
          }}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          DESCRIPCIÓN (opcional)
        </label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="¿Por qué es importante para vos?"
          rows={3}
          maxLength={300}
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box',
            borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${colors.border.medium}`,
            color: colors.text.primary,
            fontFamily: font, fontSize: '14px', outline: 'none',
            resize: 'vertical', minHeight: '72px',
          }}
        />
      </div>

      {/* Target date */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          FECHA OBJETIVO (opcional)
        </label>
        <input
          type="date"
          value={form.target_date}
          onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box',
            borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${colors.border.medium}`,
            color: form.target_date ? colors.text.primary : colors.text.tertiary,
            fontFamily: font, fontSize: '14px', outline: 'none',
            colorScheme: 'dark',
          }}
        />
      </div>

      {/* Color */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          COLOR
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {LIFE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setForm(f => ({ ...f, color: c }))}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: c, border: 'none', cursor: 'pointer',
                boxShadow: form.color === c ? `0 0 0 3px ${c}55, 0 0 0 5px ${colors.surface.elevated}` : 'none',
                transition: 'box-shadow 0.15s',
              }}
            />
          ))}
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: font, fontSize: '12px', color: colors.semantic.error, marginBottom: '12px' }}>
          {error}
        </p>
      )}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear meta'}
      </LifeButton>
    </LifeSheet>
  )
}
