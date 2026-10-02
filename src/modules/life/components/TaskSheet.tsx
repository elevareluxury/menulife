import { useEffect, useState } from 'react'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import type { Goal } from '../hooks/useGoals'
import type { LifeTask, TaskFormData } from '../hooks/useTasks'
import { useLifeT } from '@/i18n/app/life'

const REMINDER_OPTIONS = [
  { value: '', key: 'none' }, { value: '0', key: 'now' }, { value: '10', key: 'm10' },
  { value: '30', key: 'm30' }, { value: '60', key: 'h1' }, { value: '1440', key: 'd1' },
] as const

const labelStyle: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px',
}
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: radius.md,
  background: colors.surface.elevated, border: `1px solid ${colors.border.medium}`,
  color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none', colorScheme: 'dark',
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: TaskFormData) => Promise<void>
  initial?: LifeTask | null
  defaultDate?: string | null
  goals: Goal[]
}

export function TaskSheet({ open, onClose, onSave, initial, defaultDate, goals }: Props) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [remind, setRemind] = useState('')
  const [goalId, setGoalId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const t = useLifeT()
  const s = t.taskSheet

  // Reinicia el formulario cada vez que se abre (mismo patrón que GoalSheet)
  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(initial?.title ?? '')
    setNotes(initial?.notes ?? '')
    setDate(initial?.due_date ?? defaultDate ?? '')
    setTime(initial?.due_time?.slice(0, 5) ?? '')
    setRemind(initial?.remind_minutes != null ? String(initial.remind_minutes) : '')
    setGoalId(initial?.goal_id ?? '')
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial, defaultDate])

  async function save() {
    if (!title.trim()) { setError(s.titleRequired); return }
    if (remind && !date) { setError(s.needDate); return }
    setSaving(true); setError('')
    try {
      await onSave({
        title, notes, due_date: date || null, due_time: time || null,
        remind_minutes: remind === '' ? null : Number(remind), goal_id: goalId || null,
      })
      onClose()
    } catch {
      setError(t.common.saveError)
    } finally { setSaving(false) }
  }

  const activeGoals = goals.filter(g => g.status !== 'completed')

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? s.editTitle : s.newTitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="task-title" style={labelStyle}>{s.task}</label>
          <input id="task-title" autoFocus value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void save() }}
            placeholder={s.placeholder} style={inputStyle} aria-invalid={!!error && !title.trim()} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label htmlFor="task-date" style={labelStyle}>{s.date}</label>
            <input id="task-date" type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="task-time" style={labelStyle}>{s.time}</label>
            <input id="task-time" type="time" value={time} disabled={!date} onChange={e => setTime(e.target.value)}
              style={{ ...inputStyle, opacity: date ? 1 : 0.5 }} />
          </div>
        </div>
        <div>
          <label htmlFor="task-remind" style={labelStyle}>{s.reminder}</label>
          <select id="task-remind" value={remind} onChange={e => setRemind(e.target.value)} style={inputStyle}>
            {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{s.reminders[o.key]}</option>)}
          </select>
          {remind && !time && date && (
            <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: '6px 0 0' }}>
              {s.noTimeHint}
            </p>
          )}
        </div>
        {activeGoals.length > 0 && (
          <div>
            <label htmlFor="task-goal" style={labelStyle}>{s.goal}</label>
            <select id="task-goal" value={goalId} onChange={e => setGoalId(e.target.value)} style={inputStyle}>
              <option value="">{s.noGoal}</option>
              {activeGoals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="task-notes" style={labelStyle}>{s.notes}</label>
          <textarea id="task-notes" value={notes} maxLength={2000} rows={3} onChange={e => setNotes(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        {error && <p role="alert" style={{ fontFamily: font, fontSize: '13px', color: colors.semantic.error, margin: 0 }}>{error}</p>}
        <LifeButton onClick={save} disabled={saving} style={{ width: '100%' }}>
          {saving ? t.common.saving : initial ? s.update : s.create}
        </LifeButton>
      </div>
    </LifeSheet>
  )
}
