import { useEffect, useState } from 'react'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import type { Goal } from '../hooks/useGoals'
import type { LifeTask, TaskFormData } from '../hooks/useTasks'

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sin recordatorio' },
  { value: '0', label: 'En el momento' },
  { value: '10', label: '10 minutos antes' },
  { value: '30', label: '30 minutos antes' },
  { value: '60', label: '1 hora antes' },
  { value: '1440', label: '1 día antes' },
]

const labelStyle: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.08em', display: 'block', marginBottom: '8px',
}
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: radius.md,
  background: colors.surface.elevated, border: `1px solid ${colors.border.medium}`,
  color: colors.text.primary, fontFamily: font, fontSize: '15px', outline: 'none', colorScheme: 'dark',
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
    if (!title.trim()) { setError('Escribí qué tenés que hacer.'); return }
    if (remind && !date) { setError('Para recordártelo, elegí una fecha.'); return }
    setSaving(true); setError('')
    try {
      await onSave({
        title, notes, due_date: date || null, due_time: time || null,
        remind_minutes: remind === '' ? null : Number(remind), goal_id: goalId || null,
      })
      onClose()
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally { setSaving(false) }
  }

  const activeGoals = goals.filter(g => g.status !== 'completed')

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? 'Editar tarea' : 'Nueva tarea'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="task-title" style={labelStyle}>TAREA</label>
          <input id="task-title" autoFocus value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void save() }}
            placeholder="¿Qué tenés que hacer?" style={inputStyle} aria-invalid={!!error && !title.trim()} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label htmlFor="task-date" style={labelStyle}>FECHA</label>
            <input id="task-date" type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="task-time" style={labelStyle}>HORA</label>
            <input id="task-time" type="time" value={time} disabled={!date} onChange={e => setTime(e.target.value)}
              style={{ ...inputStyle, opacity: date ? 1 : 0.5 }} />
          </div>
        </div>
        <div>
          <label htmlFor="task-remind" style={labelStyle}>RECORDATORIO</label>
          <select id="task-remind" value={remind} onChange={e => setRemind(e.target.value)} style={inputStyle}>
            {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {remind && !time && date && (
            <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: '6px 0 0' }}>
              Sin hora, el aviso se calcula sobre las 09:00 de ese día.
            </p>
          )}
        </div>
        {activeGoals.length > 0 && (
          <div>
            <label htmlFor="task-goal" style={labelStyle}>META (OPCIONAL)</label>
            <select id="task-goal" value={goalId} onChange={e => setGoalId(e.target.value)} style={inputStyle}>
              <option value="">Sin meta</option>
              {activeGoals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="task-notes" style={labelStyle}>NOTAS</label>
          <textarea id="task-notes" value={notes} maxLength={2000} rows={3} onChange={e => setNotes(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        {error && <p role="alert" style={{ fontFamily: font, fontSize: '13px', color: colors.semantic.error, margin: 0 }}>{error}</p>}
        <LifeButton onClick={save} disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Agregar tarea'}
        </LifeButton>
      </div>
    </LifeSheet>
  )
}
