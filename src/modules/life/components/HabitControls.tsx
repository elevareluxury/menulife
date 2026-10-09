import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { LifeSheet, LifeButton, colors, font, radius, ink } from '../design-system'
import type { Habit } from '../hooks/useHabits'
import { useLifeT } from '@/i18n/app/life'

// Hábitos con cantidad, "X veces por semana" y ancla (V1 · etapa 10). Los usan Hábitos y "Tu día".

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Anillo de progreso con "+1": "5 de 8 vasos". */
export function QuantityButton({ habit, onAdd, size = 44 }: { habit: Habit; onAdd: () => void; size?: number }) {
  const p = useLifeT().habitPlus
  const target = habit.target_value ?? 1
  const ratio = Math.min(1, habit.todayValue / target)
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  const done = habit.completedToday
  return (
    <button type="button" onClick={onAdd} aria-label={`${p.plusOne(habit.name)} · ${p.progress(habit.todayValue, target, habit.unit ?? '')}`}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={done ? ink(habit.color) : 'none'} stroke={colors.border.medium} strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ink(habit.color)} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
      </svg>
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: done ? colors.accent.on : ink(habit.color),
      }}>
        <Plus size={size > 40 ? 18 : 15} strokeWidth={3} />
      </span>
    </button>
  )
}

/** Debajo del nombre: "Después de…", "5 de 8 vasos" y "2 de 3 esta semana". */
export function HabitMeta({ habit }: { habit: Habit }) {
  const p = useLifeT().habitPlus
  const items: string[] = []
  if (habit.anchor) items.push(p.afterAnchor(habit.anchor))
  if (habit.target_value != null) items.push(p.progress(habit.todayValue, habit.target_value, habit.unit ?? ''))
  if (habit.frequency.type === 'times_per_week') items.push(p.weekProgress(habit.weekCount, habit.frequency.times))
  if (!items.length) return null
  return (
    <span style={{ display: 'block', fontFamily: font, fontSize: '11.5px', color: colors.text.tertiary, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {items.join(' · ')}
    </span>
  )
}

/** Cambiar lo hecho hoy en un hábito con cantidad (por ejemplo, si se sumó de más). */
export function HabitValueSheet({ habit, onClose, onSave }: { habit: Habit | null; onClose: () => void; onSave: (v: number) => Promise<void> }) {
  const t = useLifeT()
  const p = t.habitPlus
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (habit) setValue(fmt(habit.todayValue))
  }, [habit])
  return (
    <LifeSheet open={!!habit} onClose={onClose} title={habit ? p.editValue(habit.name) : ''}>
      {habit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label htmlFor="habit-value" style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {p.valueLabel}{habit.unit ? ` (${habit.unit})` : ''}
          </label>
          <input id="habit-value" type="number" inputMode="decimal" min={0} max={100000} value={value} onChange={e => setValue(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: radius.md, background: colors.surface.high,
              border: `1px solid ${colors.border.medium}`, color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
            }} />
          <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: 0 }}>
            {p.progress(Number(value) || 0, habit.target_value ?? 1, habit.unit ?? '')}
          </p>
          <LifeButton disabled={saving} style={{ width: '100%' }} onClick={async () => {
            setSaving(true)
            try { await onSave(Math.max(0, Number(value) || 0)); onClose() } finally { setSaving(false) }
          }}>{saving ? t.common.saving : p.save}</LifeButton>
        </div>
      )}
    </LifeSheet>
  )
}
