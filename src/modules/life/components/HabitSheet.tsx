import { createElement, useState, useEffect } from 'react'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { usePrefs } from '@/lib/prefs'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import { LIFE_COLORS, HABIT_ICONS, getHabitIcon } from '../lib/lifePalette'
import type { Habit, HabitFormData } from '../hooks/useHabits'
import { GoalSelect } from './GoalSelect'

interface HabitSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: HabitFormData) => Promise<void>
  initial?: Habit | null
}

const DEFAULT: HabitFormData = {
  name: '',
  icon: 'Star',
  color: '#F4705A',
  frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
  target_value: null, unit: null, anchor: null, reminder_time: null, reminder_enabled: false,
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', boxSizing: 'border-box', borderRadius: radius.md,
  background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
  color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
}
const hintStyle: React.CSSProperties = { fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: '6px 0 0', lineHeight: 1.45 }

const label: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px',
}

/** Inicial del día de la semana en el idioma activo (0 = domingo). */
function dayInitial(day: number, locale: string): string {
  const d = new Date(2024, 0, 7 + day) // 7 de enero de 2024 fue domingo
  return d.toLocaleDateString(locale, { weekday: 'narrow' })
}
function dayName(day: number, locale: string): string {
  return new Date(2024, 0, 7 + day).toLocaleDateString(locale, { weekday: 'long' })
}

export function HabitSheet({ open, onClose, onSave, initial }: HabitSheetProps) {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const weekStart = usePrefs(s => s.week_start)
  const order = weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
  const [form, setForm]     = useState<HabitFormData>(DEFAULT)
  // Días elegidos cuando el modo es "Ciertos días" (se recuerdan si se pasa a "Veces por semana" y se vuelve)
  const [days, setDays]     = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [times, setTimes]   = useState(3)
  const [withQty, setWithQty] = useState(false)
  const p = t.habitPlus
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm(initial
      ? {
          name: initial.name, icon: initial.icon, color: initial.color, frequency: initial.frequency, goal_id: initial.goal_id ?? null,
          target_value: initial.target_value, unit: initial.unit, anchor: initial.anchor,
          reminder_time: initial.reminder_time?.slice(0, 5) ?? null, reminder_enabled: initial.reminder_enabled,
        }
      : DEFAULT)
    const f = initial?.frequency
    setDays(f && f.type !== 'times_per_week' ? f.days : [0, 1, 2, 3, 4, 5, 6])
    setTimes(f?.type === 'times_per_week' ? f.times : 3)
    setWithQty(initial?.target_value != null)
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial])

  const byTimes = form.frequency.type === 'times_per_week'
  const toggleDay = (day: number) => {
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort((a, b) => a - b)
    setDays(next)
    setForm(f => ({ ...f, frequency: { type: next.length === 7 ? 'daily' : 'weekly', days: next } }))
  }
  const setMode = (mode: 'days' | 'times') => setForm(f => ({
    ...f, frequency: mode === 'times' ? { type: 'times_per_week', times } : { type: days.length === 7 ? 'daily' : 'weekly', days },
  }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError(t.habitSheet.nameRequired); return }
    if (!byTimes && days.length === 0) { setError(t.habitSheet.daysRequired); return }
    if (withQty && !(Number(form.target_value) > 0)) { setError(p.targetRequired); return }
    if (form.reminder_enabled && !form.reminder_time) { setError(p.reminderNeedTime); return }
    setSaving(true)
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        target_value: withQty ? Number(form.target_value) : null,
        unit: withQty ? form.unit?.trim() || null : null,
        anchor: form.anchor?.trim() || null,
        reminder_time: form.reminder_enabled ? form.reminder_time : form.reminder_time || null,
      })
      onClose()
    } catch { setError(t.common.saveError) }
    finally { setSaving(false) }
  }

  const everyDay = !byTimes && days.length === 7

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? t.habitSheet.editTitle : t.habitSheet.newTitle}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: radius.lg,
          background: `${form.color}22`, border: `2px solid ${form.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {createElement(getHabitIcon(form.icon), { size: 28, style: { color: form.color }, strokeWidth: 2, 'aria-hidden': true })}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="habit-name" style={label}>{t.habitSheet.name}</label>
        <input id="habit-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={t.habitSheet.namePlaceholder} maxLength={60} aria-invalid={!!error && !form.name.trim()}
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box', borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${error && !form.name.trim() ? colors.semantic.error : colors.border.medium}`,
            color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
          }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <span style={label}>{t.habitSheet.icon}</span>
        <div role="radiogroup" aria-label={t.habitSheet.icon} style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
          {HABIT_ICONS.map(({ name, icon: Icon }) => (
            <button key={name} type="button" role="radio" aria-checked={form.icon === name} aria-label={name}
              onClick={() => setForm(f => ({ ...f, icon: name }))}
              style={{
                aspectRatio: '1', minHeight: 36, borderRadius: radius.sm,
                background: form.icon === name ? `${form.color}25` : colors.surface.high,
                border: `1.5px solid ${form.icon === name ? form.color : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
              <Icon size={17} style={{ color: form.icon === name ? form.color : colors.text.tertiary }} strokeWidth={2} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <span style={label}>{t.habitSheet.color}</span>
        <div role="radiogroup" aria-label={t.habitSheet.color} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

      <div style={{ marginBottom: '20px' }}>
        <span style={label}>{p.when}</span>
        <div role="radiogroup" aria-label={p.when} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {(['days', 'times'] as const).map(m => {
            const on = (m === 'times') === byTimes
            return (
              <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMode(m)}
                style={{
                  flex: 1, minHeight: 40, borderRadius: radius.full, cursor: 'pointer', fontFamily: font, fontSize: '13px', fontWeight: 700,
                  background: on ? `${form.color}20` : colors.surface.high, border: `1.5px solid ${on ? form.color : 'transparent'}`,
                  color: on ? form.color : colors.text.secondary,
                }}>
                {m === 'days' ? p.modeDays : p.modeTimes}
              </button>
            )
          })}
        </div>
        {byTimes ? (
          <select aria-label={p.modeTimes} value={times} style={fieldStyle}
            onChange={e => { const n = Number(e.target.value); setTimes(n); setForm(f => ({ ...f, frequency: { type: 'times_per_week', times: n } })) }}>
            {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{p.timesValue(n)}</option>)}
          </select>
        ) : (
          <>
            <span style={{ ...label, marginBottom: 6 }}>{t.habitSheet.days}{everyDay ? ` · ${t.habitSheet.every}` : ''}</span>
            <div role="group" aria-label={t.habitSheet.days} style={{ display: 'flex', gap: '6px' }}>
              {order.map(day => {
                const active = days.includes(day)
                return (
                  <button key={day} type="button" aria-pressed={active} aria-label={dayName(day, locale)} onClick={() => toggleDay(day)}
                    style={{
                      flex: 1, height: 40, borderRadius: radius.sm,
                      background: active ? `${form.color}20` : colors.surface.high,
                      border: `1.5px solid ${active ? form.color : 'transparent'}`,
                      color: active ? form.color : colors.text.tertiary,
                      fontFamily: font, fontSize: '12px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase',
                    }}>
                    {dayInitial(day, locale)}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minHeight: 40 }}>
          <input type="checkbox" checked={withQty} onChange={e => setWithQty(e.target.checked)}
            style={{ width: 20, height: 20, accentColor: form.color }} />
          <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.primary }}>{p.quantity}</span>
        </label>
        {withQty ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            <div>
              <label htmlFor="habit-target" style={label}>{p.target}</label>
              <input id="habit-target" type="number" inputMode="decimal" min={1} max={100000} value={form.target_value ?? ''}
                onChange={e => setForm(f => ({ ...f, target_value: e.target.value === '' ? null : Number(e.target.value) }))} style={fieldStyle} />
            </div>
            <div>
              <label htmlFor="habit-unit" style={label}>{p.unit}</label>
              <input id="habit-unit" maxLength={20} value={form.unit ?? ''} placeholder={p.unitPlaceholder}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={fieldStyle} />
            </div>
          </div>
        ) : <p style={hintStyle}>{p.quantityHint}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="habit-anchor" style={label}>{p.anchor}</label>
        <input id="habit-anchor" maxLength={60} value={form.anchor ?? ''} placeholder={p.anchorPlaceholder}
          onChange={e => setForm(f => ({ ...f, anchor: e.target.value }))} style={fieldStyle} />
        <p style={hintStyle}>{p.anchorHint}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minHeight: 40 }}>
          <input type="checkbox" checked={!!form.reminder_enabled}
            onChange={e => setForm(f => ({ ...f, reminder_enabled: e.target.checked, reminder_time: f.reminder_time ?? '09:00' }))}
            style={{ width: 20, height: 20, accentColor: form.color }} />
          <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.primary }}>{p.reminder}</span>
        </label>
        {form.reminder_enabled && (
          <div style={{ marginTop: 8 }}>
            <label htmlFor="habit-reminder" style={label}>{p.reminderTime}</label>
            <input id="habit-reminder" type="time" value={form.reminder_time ?? ''}
              onChange={e => setForm(f => ({ ...f, reminder_time: e.target.value || null }))} style={{ ...fieldStyle, colorScheme: 'dark' }} />
          </div>
        )}
        <p style={hintStyle}>{p.reminderHint}</p>
      </div>

      <GoalSelect id="habit-goal" enabled={open} value={form.goal_id} onChange={goal_id => setForm(f => ({ ...f, goal_id }))} />

      {error && <p role="alert" style={{ fontFamily: font, fontSize: '13px', color: colors.semantic.error, marginBottom: '12px' }}>{error}</p>}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? t.common.saving : initial ? t.habitSheet.update : t.habitSheet.create}
      </LifeButton>
    </LifeSheet>
  )
}
