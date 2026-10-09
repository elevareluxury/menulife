import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Plus, Repeat, X } from 'lucide-react'
import { colors, font, radius } from '../design-system'
import { MAX_SUBTASKS, MAX_SUBTASK_TEXT, type Subtask } from '../hooks/useTasks'
import type { CustomRepeat, RepeatChoice } from '../lib/recurrence'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { usePrefs } from '@/lib/prefs'

// Repetición y subtareas de una tarea (V1 · etapa 09), dentro de TaskSheet.

const labelStyle: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px',
}
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: radius.md,
  background: colors.surface.elevated, border: `1px solid ${colors.border.medium}`,
  color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none', colorScheme: 'dark',
}
const hint: React.CSSProperties = { fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: '6px 0 0' }
const iconBtn: React.CSSProperties = {
  width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'none', border: 'none', borderRadius: radius.sm, color: colors.text.tertiary, cursor: 'pointer',
}

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

export function RepeatField({ date, choice, onChoice, custom, onCustom }: {
  date: string
  choice: RepeatChoice
  onChoice: (c: RepeatChoice) => void
  custom: CustomRepeat
  onCustom: (c: CustomRepeat) => void
}) {
  const r = useLifeT().repeat
  const locale = langLocale(useAppLang(s => s.lang))
  const weekStart = usePrefs(s => s.week_start)
  const due = date ? new Date(`${date}T12:00:00`) : null
  const dayName = due ? due.toLocaleDateString(locale, { weekday: 'long' }) : ''
  const weekdayOrder = Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7)
  const dayLabel = (d: number, style: 'narrow' | 'long') => new Date(2024, 0, 7 + d).toLocaleDateString(locale, { weekday: style })

  const options: { value: RepeatChoice; label: string }[] = [
    { value: 'none', label: r.none },
    { value: 'daily', label: r.daily },
    { value: 'weekdays', label: r.weekdays },
    { value: 'weekly', label: due ? r.weekly(dayName) : r.weekly('…') },
    { value: 'monthly', label: due ? r.monthly(due.getDate()) : r.monthly(0) },
    { value: 'custom', label: r.custom },
  ]

  return (
    <div>
      <label htmlFor="task-repeat" style={labelStyle}>{r.label}</label>
      <select id="task-repeat" value={date ? choice : 'none'} disabled={!date} onChange={e => onChoice(e.target.value as RepeatChoice)}
        style={{ ...inputStyle, opacity: date ? 1 : 0.5 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {!date && <p style={hint}>{r.needDate}</p>}
      {date && choice === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {r.every && <span style={{ fontFamily: font, fontSize: '14px', color: colors.text.secondary }}>{r.every}</span>}
            <input type="number" min={1} max={365} inputMode="numeric" aria-label={`${r.every} ${custom.unit === 'days' ? r.days : r.weeks}`.trim()}
              value={custom.every} onChange={e => onCustom({ ...custom, every: Number(e.target.value) || 1 })}
              style={{ ...inputStyle, width: 84 }} />
            <select aria-label={r.custom} value={custom.unit} onChange={e => onCustom({ ...custom, unit: e.target.value as CustomRepeat['unit'] })}
              style={{ ...inputStyle, width: 'auto', flex: 1 }}>
              <option value="days">{r.days}</option>
              <option value="weeks">{r.weeks}</option>
            </select>
          </div>
          {custom.unit === 'weeks' && (
            <div role="group" aria-label={r.on} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {weekdayOrder.map(d => {
                const on = custom.weekdays.includes(d)
                return (
                  <button key={d} type="button" aria-pressed={on} aria-label={dayLabel(d, 'long')}
                    onClick={() => onCustom({ ...custom, weekdays: on ? custom.weekdays.filter(x => x !== d) : [...custom.weekdays, d] })}
                    style={{
                      width: 40, height: 40, borderRadius: radius.full, cursor: 'pointer', fontFamily: font, fontSize: '13px', fontWeight: 700,
                      border: `1px solid ${on ? colors.accent.default : colors.border.medium}`,
                      background: on ? colors.accent.soft : 'transparent', color: on ? colors.accent.default : colors.text.secondary,
                    }}>
                    {dayLabel(d, 'narrow')}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
      {date && choice !== 'none' && (
        <p style={{ ...hint, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Repeat size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} /> {r.hint}
        </p>
      )}
    </div>
  )
}

export function SubtasksField({ items, onChange }: { items: Subtask[]; onChange: (items: Subtask[]) => void }) {
  const r = useLifeT().repeat
  const [draft, setDraft] = useState('')
  const full = items.length >= MAX_SUBTASKS

  function add() {
    const text = draft.trim().slice(0, MAX_SUBTASK_TEXT)
    if (!text || full) return
    onChange([...items, { id: newId(), text, done: false }])
    setDraft('')
  }
  const move = (i: number, delta: number) => {
    const next = [...items]
    const [it] = next.splice(i, 1)
    next.splice(i + delta, 0, it)
    onChange(next)
  }
  const done = items.filter(s => s.done).length

  return (
    <div>
      <span id="task-subtasks" style={labelStyle}>
        {r.subtasks}{items.length > 0 && ` · ${r.progress(done, items.length)}`}
      </span>
      {items.length > 0 && (
        <ul aria-labelledby="task-subtasks" style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((s, i) => (
            <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button type="button" role="checkbox" aria-checked={s.done} aria-label={r.done(s.text)}
                onClick={() => onChange(items.map(x => (x.id === s.id ? { ...x, done: !x.done } : x)))} style={iconBtn}>
                <span aria-hidden="true" style={{
                  width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  border: `2px solid ${s.done ? colors.semantic.success : colors.border.medium}`, background: s.done ? colors.semantic.success : 'transparent',
                }}>{s.done && <Check size={12} strokeWidth={3} />}</span>
              </button>
              <input value={s.text} maxLength={MAX_SUBTASK_TEXT} aria-label={s.text}
                onChange={e => onChange(items.map(x => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
                style={{
                  flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: radius.sm, border: '1px solid transparent', background: 'transparent',
                  color: s.done ? colors.text.secondary : colors.text.primary, textDecoration: s.done ? 'line-through' : 'none',
                  fontFamily: font, fontSize: '16px', outline: 'none',
                }} />
              <button type="button" aria-label={r.up(s.text)} disabled={i === 0} onClick={() => move(i, -1)} style={{ ...iconBtn, opacity: i === 0 ? 0.3 : 1 }}>
                <ArrowUp size={15} aria-hidden="true" />
              </button>
              <button type="button" aria-label={r.down(s.text)} disabled={i === items.length - 1} onClick={() => move(i, 1)}
                style={{ ...iconBtn, opacity: i === items.length - 1 ? 0.3 : 1 }}>
                <ArrowDown size={15} aria-hidden="true" />
              </button>
              <button type="button" aria-label={r.remove(s.text)} onClick={() => onChange(items.filter(x => x.id !== s.id))} style={iconBtn}>
                <X size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {full ? <p style={hint}>{r.max}</p> : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={draft} maxLength={MAX_SUBTASK_TEXT} placeholder={r.subtaskPlaceholder} aria-label={r.addSubtask}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
          <button type="button" onClick={add} disabled={!draft.trim()} aria-label={r.addSubtask}
            style={{ ...iconBtn, width: 48, height: 48, border: `1px solid ${colors.border.medium}`, opacity: draft.trim() ? 1 : 0.4 }}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
