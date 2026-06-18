import { useState, useEffect } from 'react'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import { LIFE_COLORS, HABIT_ICONS, getHabitIcon } from '../lib/lifePalette'
import type { Habit, HabitFormData } from '../hooks/useHabits'

interface HabitSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: HabitFormData) => Promise<void>
  initial?: Habit | null
}

const DAYS_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const DEFAULT: HabitFormData = {
  name: '',
  icon: 'Star',
  color: '#F4705A',
  frequency: { type: 'daily', days: [0,1,2,3,4,5,6] },
}

export function HabitSheet({ open, onClose, onSave, initial }: HabitSheetProps) {
  const [form, setForm]   = useState<HabitFormData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { name: initial.name, icon: initial.icon, color: initial.color, frequency: initial.frequency }
        : DEFAULT
      )
      setError('')
    }
  }, [open, initial])

  const toggleDay = (day: number) => {
    setForm(f => {
      const days = f.frequency.days.includes(day)
        ? f.frequency.days.filter(d => d !== day)
        : [...f.frequency.days, day].sort((a, b) => a - b)
      const type = days.length === 7 ? 'daily' : 'weekly'
      return { ...f, frequency: { type, days } }
    })
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    if (form.frequency.days.length === 0) { setError('Seleccioná al menos un día'); return }
    setSaving(true)
    try {
      await onSave({ ...form, name: form.name.trim() })
      onClose()
    } catch { setError('Error al guardar. Intentá de nuevo.') }
    finally { setSaving(false) }
  }

  const SelectedIcon = getHabitIcon(form.icon)

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? 'Editar hábito' : 'Nuevo hábito'}>
      {/* Preview */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: radius.lg,
          background: `${form.color}22`,
          border: `2px solid ${form.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SelectedIcon size={28} style={{ color: form.color }} strokeWidth={2} />
        </div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          NOMBRE
        </label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Ej: Leer 30 minutos"
          maxLength={60}
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box',
            borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${error && !form.name.trim() ? colors.semantic.error : colors.border.medium}`,
            color: colors.text.primary,
            fontFamily: font, fontSize: '15px', outline: 'none',
          }}
        />
      </div>

      {/* Icon picker */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          ÍCONO
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
          {HABIT_ICONS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setForm(f => ({ ...f, icon: name }))}
              style={{
                aspectRatio: '1', borderRadius: radius.sm,
                background: form.icon === name ? `${form.color}25` : colors.surface.high,
                border: `1.5px solid ${form.icon === name ? form.color : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Icon size={17} style={{ color: form.icon === name ? form.color : colors.text.tertiary }} strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          COLOR
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

      {/* Frequency */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          DÍAS
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          {DAYS_LABELS.map((label, i) => {
            const active = form.frequency.days.includes(i)
            return (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                style={{
                  flex: 1, height: 36, borderRadius: radius.sm,
                  background: active ? `${form.color}20` : colors.surface.high,
                  border: `1.5px solid ${active ? form.color : 'transparent'}`,
                  color: active ? form.color : colors.text.tertiary,
                  fontFamily: font, fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: font, fontSize: '12px', color: colors.semantic.error, marginBottom: '12px' }}>
          {error}
        </p>
      )}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear hábito'}
      </LifeButton>
    </LifeSheet>
  )
}
