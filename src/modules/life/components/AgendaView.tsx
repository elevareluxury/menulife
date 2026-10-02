import { useMemo, useState } from 'react'
import { Bell, BellRing, CalendarPlus, Check, ChevronLeft, ChevronRight, ListTodo, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { LifeCard, LifeEmptyState, colors, font, radius } from '../design-system'
import type { Goal } from '../hooks/useGoals'
import { localDateKey, useTasks, type LifeTask } from '../hooks/useTasks'
import { downloadTaskIcs } from '../lib/ics'
import { TaskSheet } from './TaskSheet'
import { deleteWithUndo } from '../lib/undo'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { usePrefs } from '@/lib/prefs'

function monthMatrix(year: number, month: number, weekStart: 0 | 1): (Date | null)[] {
  const first = new Date(year, month, 1)
  const offset = weekStart === 1 ? (first.getDay() + 6) % 7 : first.getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7) cells.push(null)
  return cells
}

function longDate(key: string, locale: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Iniciales de los días en el idioma activo, empezando por el día configurado. */
function weekdayInitials(locale: string, weekStart: 0 | 1): string[] {
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + ((i + weekStart) % 7)).toLocaleDateString(locale, { weekday: 'narrow' }))
}

export function AgendaView({ goals }: { goals: Goal[] }) {
  const { tasks, loading, error, reload, createTask, updateTask, toggleTask, deleteTask, hideLocally } = useTasks()
  const t = useLifeT()
  const a = t.agenda
  const locale = langLocale(useAppLang(st => st.lang))
  const weekStart = usePrefs(st => st.week_start)
  const todayKey = localDateKey()
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = useState(todayKey)
  const [sheet, setSheet] = useState<{ open: boolean; task: LifeTask | null }>({ open: false, task: null })
  const [permission, setPermission] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'denied'))

  const goalById = useMemo(() => new Map(goals.map(g => [g.id, g])), [goals])
  const cells = useMemo(() => monthMatrix(cursor.y, cursor.m, weekStart), [cursor, weekStart])

  const byDay = useMemo(() => {
    const map = new Map<string, LifeTask[]>()
    tasks.forEach(t => { if (t.due_date) map.set(t.due_date, [...(map.get(t.due_date) ?? []), t]) })
    return map
  }, [tasks])
  const goalsByDay = useMemo(() => {
    const map = new Map<string, Goal[]>()
    goals.forEach(g => { if (g.target_date && g.status !== 'completed') map.set(g.target_date, [...(map.get(g.target_date) ?? []), g]) })
    return map
  }, [goals])

  const overdue = tasks.filter(t => !t.completed_at && t.due_date && t.due_date < todayKey)
  const undated = tasks.filter(t => !t.due_date && !t.completed_at)
  const dayTasks = byDay.get(selected) ?? []
  const dayGoals = goalsByDay.get(selected) ?? []
  const hasReminders = tasks.some(t => t.remind_minutes != null && !t.completed_at)

  const rawMonth = new Date(cursor.y, cursor.m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)
  const shift = (delta: number) => setCursor(c => {
    const d = new Date(c.y, c.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  async function safely(fn: () => Promise<void>) {
    try { await fn() } catch { toast.error(t.common.saveError) }
  }

  const remove = (task: LifeTask) => {
    hideLocally(task.id)
    deleteWithUndo({ message: t.undo.deleted(task.title), commit: () => deleteTask(task.id), restore: reload })
  }

  async function askPermission() {
    if (typeof Notification === 'undefined') return
    setPermission(await Notification.requestPermission())
  }

  const navBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: radius.full, border: `1px solid ${colors.border.subtle}`,
    background: 'transparent', color: colors.text.secondary, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  if (loading) {
    return <LifeCard><p style={{ fontFamily: font, color: colors.text.tertiary, margin: 0 }} role="status">{a.loading}</p></LifeCard>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && <LifeCard><p role="alert" style={{ fontFamily: font, color: colors.semantic.error, margin: 0 }}>{a.loadError}</p></LifeCard>}

      {/* Calendario */}
      <LifeCard style={{ padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button type="button" style={navBtn} onClick={() => shift(-1)} aria-label={a.prevMonth}><ChevronLeft size={16} className="flip-rtl" aria-hidden="true" /></button>
          <h2 style={{ fontFamily: font, fontSize: '15px', fontWeight: 700, color: colors.text.primary, margin: 0 }}
            aria-live="polite">{monthLabel}</h2>
          <button type="button" style={navBtn} onClick={() => shift(1)} aria-label={a.nextMonth}><ChevronRight size={16} className="flip-rtl" aria-hidden="true" /></button>
        </div>
        <div role="grid" aria-label={a.calendarOf(monthLabel)}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {weekdayInitials(locale, weekStart).map((w, i) => (
            <div key={i} role="columnheader" style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, textAlign: 'center', padding: '4px 0', textTransform: 'uppercase' }}>{w}</div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={i} />
            const key = localDateKey(date)
            const pending = (byDay.get(key) ?? []).filter(t => !t.completed_at).length
            const goalsHere = goalsByDay.get(key) ?? []
            const isToday = key === todayKey
            const isSelected = key === selected
            return (
              <button key={i} type="button" role="gridcell" aria-selected={isSelected}
                aria-label={`${longDate(key, locale)}${pending ? `, ${a.dayTasks(pending)}` : ''}${goalsHere.length ? `, ${a.goalDate}` : ''}`}
                onClick={() => setSelected(key)}
                style={{
                  aspectRatio: '1', minHeight: 40, borderRadius: radius.sm, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  background: isSelected ? colors.accent.soft : 'transparent',
                  border: isSelected ? `1px solid ${colors.accent.default}` : isToday ? `1px solid ${colors.border.medium}` : '1px solid transparent',
                  color: isToday ? colors.accent.default : colors.text.secondary,
                  fontFamily: font, fontSize: '13px', fontWeight: isToday || isSelected ? 800 : 500,
                }}>
                {date.getDate()}
                <span style={{ display: 'flex', gap: 3, height: 5 }} aria-hidden="true">
                  {pending > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors.accent.default }} />}
                  {goalsHere.slice(0, 2).map(g => <span key={g.id} style={{ width: 5, height: 5, borderRadius: '50%', background: g.color }} />)}
                </span>
              </button>
            )
          })}
        </div>
      </LifeCard>

      {/* Avisos del navegador */}
      {hasReminders && permission === 'default' && (
        <LifeCard style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BellRing size={18} style={{ color: colors.accent.default, flexShrink: 0 }} aria-hidden="true" />
          <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: 0, flex: 1 }}>
            {a.enableTitle}
          </p>
          <button type="button" onClick={askPermission} style={{
            padding: '8px 12px', borderRadius: radius.full, border: 'none', cursor: 'pointer',
            background: colors.accent.default, color: '#fff', fontFamily: font, fontSize: '12px', fontWeight: 700,
          }}>{a.enable}</button>
        </LifeCard>
      )}

      {/* Día seleccionado */}
      <LifeCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: 8 }}>
          <h2 style={{ fontFamily: font, fontSize: '15px', fontWeight: 700, color: colors.text.primary, margin: 0, textTransform: 'capitalize' }}>
            {selected === todayKey ? a.today : longDate(selected, locale)}
          </h2>
          <button type="button" onClick={() => setSheet({ open: true, task: null })} aria-label={a.addTask}
            style={{ ...navBtn, background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`, color: colors.accent.default }}>
            <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        {dayGoals.map(g => (
          <p key={g.id} style={{ fontFamily: font, fontSize: '12.5px', color: colors.text.secondary, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} aria-hidden="true" />
            {a.goalTarget} <strong>{g.name}</strong>
          </p>
        ))}
        {dayTasks.length === 0
          ? <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: 0 }}>{a.noTasks}</p>
          : <TaskList tasks={dayTasks} goalById={goalById} onToggle={t => safely(() => toggleTask(t))}
              onEdit={t => setSheet({ open: true, task: t })} onDelete={remove} />}
      </LifeCard>

      {overdue.length > 0 && (
        <LifeCard>
          <h2 style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: colors.semantic.error, margin: '0 0 10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {a.overdue(overdue.length)}
          </h2>
          <TaskList tasks={overdue} goalById={goalById} showDate onToggle={t => safely(() => toggleTask(t))}
            onEdit={t => setSheet({ open: true, task: t })} onDelete={remove} />
        </LifeCard>
      )}

      <LifeCard>
        <h2 style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: colors.text.tertiary, margin: '0 0 10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {a.undated(undated.length)}
        </h2>
        {undated.length === 0 && tasks.length === 0 ? (
          <LifeEmptyState icon={ListTodo} iconColor={colors.area.goals}
            title={a.emptyTitle}
            subtitle={a.emptyText}
            action={{ label: a.addTask, onClick: () => setSheet({ open: true, task: null }) }} />
        ) : undated.length === 0
          ? <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: 0 }}>{a.allDated}</p>
          : <TaskList tasks={undated} goalById={goalById} onToggle={t => safely(() => toggleTask(t))}
              onEdit={t => setSheet({ open: true, task: t })} onDelete={remove} />}
      </LifeCard>

      <TaskSheet open={sheet.open} initial={sheet.task} defaultDate={selected} goals={goals}
        onClose={() => setSheet({ open: false, task: null })}
        onSave={data => (sheet.task ? updateTask(sheet.task.id, data) : createTask(data))} />

    </div>
  )
}

function TaskList({ tasks, goalById, onToggle, onEdit, onDelete, showDate }: {
  tasks: LifeTask[]
  goalById: Map<string, Goal>
  onToggle: (t: LifeTask) => void
  onEdit: (t: LifeTask) => void
  onDelete: (t: LifeTask) => void
  showDate?: boolean
}) {
  const t0 = useLifeT()
  const a = t0.agenda
  const locale = langLocale(useAppLang(st => st.lang))
  const sorted = [...tasks].sort((a, b) =>
    Number(!!a.completed_at) - Number(!!b.completed_at) || (a.due_time ?? '99').localeCompare(b.due_time ?? '99'))
  const iconBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: radius.full, border: 'none', background: 'transparent',
    color: colors.text.tertiary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {sorted.map(t => {
        const done = !!t.completed_at
        const goal = t.goal_id ? goalById.get(t.goal_id) : undefined
        return (
          <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
            <button type="button" role="checkbox" aria-checked={done} aria-label={a.complete(t.title)} onClick={() => onToggle(t)}
              style={{
                width: 26, height: 26, margin: 7, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
                border: `2px solid ${done ? colors.semantic.success : colors.border.medium}`,
                background: done ? colors.semantic.success : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}>
              {done && <Check size={14} strokeWidth={3} />}
            </button>
            <button type="button" onClick={() => onEdit(t)} aria-label={a.edit(t.title)}
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'start', cursor: 'pointer', padding: '4px 0' }}>
              <span style={{
                display: 'block', fontFamily: font, fontSize: '14px', fontWeight: 600,
                color: done ? colors.text.secondary : colors.text.primary, textDecoration: done ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{t.title}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: font, fontSize: '11.5px', color: colors.text.tertiary, marginTop: 2 }}>
                {showDate && t.due_date && <span>{new Date(`${t.due_date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>}
                {t.due_time && <span>{t.due_time.slice(0, 5)}</span>}
                {t.remind_minutes != null && <Bell size={11} aria-label={a.withReminder} />}
                {goal && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: goal.color }} aria-hidden="true" />{goal.name}
                  </span>
                )}
              </span>
            </button>
            {t.due_date && !done && (
              <button type="button" style={iconBtn} aria-label={a.toCalendar(t.title)} title={a.toCalendarShort}
                onClick={() => { downloadTaskIcs(t) }}>
                <CalendarPlus size={16} aria-hidden="true" />
              </button>
            )}
            <button type="button" style={iconBtn} aria-label={a.delete(t.title)} onClick={() => onDelete(t)}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
