import { useMemo, useState, type KeyboardEvent } from 'react'
import {
  Bell, BellRing, CalendarPlus, Check, ChevronLeft, ChevronRight, ListTodo, Pencil, Plus, Star, StarOff, Trash2,
  CalendarDays, List, Repeat,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { LifeCard, LifeEmptyState, colors, font, radius, ink } from '../design-system'
import { useGoalOptions, type GoalOption } from '../hooks/useGoalOptions'
import { localDateKey, useTasks, type LifeTask } from '../hooks/useTasks'
import { useToday } from '../hooks/useToday'
import { downloadTaskIcs } from '../lib/ics'
import { upcomingOccurrences } from '../lib/recurrence'
import { deleteWithUndo } from '../lib/undo'
import { TaskSheet } from './TaskSheet'
import { ActionMenu } from './ActionMenu'
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

const byTime = (a: LifeTask, b: LifeTask) =>
  (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || (a.due_time ?? '99').localeCompare(b.due_time ?? '99')

const sectionTitle: React.CSSProperties = {
  fontFamily: font, fontSize: '12px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase',
}

type Mode = 'list' | 'calendar'

/** Tareas de Brain: lista por vencimiento (foco, vencidas, hoy, próximas, sin fecha) o calendario. */
export function TasksView() {
  const { tasks, loading, error, reload, createTask, updateTask, toggleTask, setFocus, deleteTask, hideLocally } = useTasks()
  const goals = useGoalOptions()
  const t = useLifeT()
  const a = t.agenda
  const k = t.tasks
  const locale = langLocale(useAppLang(st => st.lang))
  const weekStart = usePrefs(st => st.week_start)
  const todayKey = useToday()
  const [mode, setMode] = useState<Mode>('list')
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = useState(() => localDateKey())
  const [sheet, setSheet] = useState<{ open: boolean; task: LifeTask | null; date: string | null }>({ open: false, task: null, date: null })
  const [showDone, setShowDone] = useState(false)
  const [quick, setQuick] = useState('')
  const [adding, setAdding] = useState(false)
  const [permission, setPermission] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'denied'))

  const goalById = useMemo(() => new Map(goals.map(g => [g.id, g])), [goals])

  const sections = useMemo(() => {
    const pending = tasks.filter(x => !x.completed_at)
    const rest = pending.filter(x => !x.is_focus)
    return {
      focus: pending.filter(x => x.is_focus).sort(byTime),
      overdue: rest.filter(x => x.due_date && x.due_date < todayKey).sort(byTime),
      today: rest.filter(x => x.due_date === todayKey).sort(byTime),
      upcoming: rest.filter(x => x.due_date && x.due_date > todayKey).sort(byTime),
      noDate: rest.filter(x => !x.due_date).sort((p, q) => p.created_at.localeCompare(q.created_at)),
      done: tasks.filter(x => x.completed_at).sort((p, q) => (q.completed_at ?? '').localeCompare(p.completed_at ?? '')),
    }
  }, [tasks, todayKey])

  const byDay = useMemo(() => {
    const map = new Map<string, LifeTask[]>()
    tasks.forEach(x => { if (x.due_date) map.set(x.due_date, [...(map.get(x.due_date) ?? []), x]) })
    return map
  }, [tasks])
  // Próximas repeticiones de las tareas pendientes (V1 · etapa 09): se ven en el calendario, no son tareas todavía
  const projectedByDay = useMemo(() => {
    const until = localDateKey(new Date(cursor.y, cursor.m + 1, 0))
    const map = new Map<string, LifeTask[]>()
    tasks.forEach(x => {
      if (x.completed_at || !x.recurrence || !x.due_date) return
      upcomingOccurrences(x.due_date, x.recurrence, until).forEach(day => map.set(day, [...(map.get(day) ?? []), x]))
    })
    return map
  }, [tasks, cursor])
  const goalsByDay = useMemo(() => {
    const map = new Map<string, GoalOption[]>()
    goals.forEach(g => { if (g.target_date && g.status !== 'completed') map.set(g.target_date, [...(map.get(g.target_date) ?? []), g]) })
    return map
  }, [goals])
  const cells = useMemo(() => monthMatrix(cursor.y, cursor.m, weekStart), [cursor, weekStart])

  const hasReminders = tasks.some(x => x.remind_minutes != null && !x.completed_at)
  const pendingCount = tasks.length - sections.done.length

  const rawMonth = new Date(cursor.y, cursor.m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)
  const shift = (delta: number) => setCursor(c => {
    const d = new Date(c.y, c.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const fail = () => toast.error(t.common.saveError)
  const openNew = (date: string | null) => setSheet({ open: true, task: null, date })

  const remove = (task: LifeTask) => {
    hideLocally(task.id)
    deleteWithUndo({ message: t.undo.deleted(task.title), commit: () => deleteTask(task.id), restore: reload })
  }

  const rowProps = {
    goalById,
    onToggle: (x: LifeTask) => { toggleTask(x).catch(fail) },
    onEdit: (x: LifeTask) => setSheet({ open: true, task: x, date: null }),
    onFocus: (x: LifeTask) => { setFocus(x, !x.is_focus).catch(fail) },
    onDelete: remove,
  }

  async function quickAdd() {
    const title = quick.trim()
    if (!title || adding) return
    setAdding(true)
    try {
      await createTask({ title })
      setQuick('')
    } catch { fail() } finally { setAdding(false) }
  }

  async function askPermission() {
    if (typeof Notification === 'undefined') return
    setPermission(await Notification.requestPermission())
  }

  const navBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: radius.full, border: `1px solid ${colors.border.subtle}`,
    background: 'transparent', color: colors.text.secondary, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }

  if (loading) {
    return <LifeCard><p style={{ fontFamily: font, color: colors.text.tertiary, margin: 0 }} role="status">{a.loading}</p></LifeCard>
  }

  const listSections: { id: string; title: string; color: string; items: LifeTask[]; showDate: boolean; hint?: string }[] = [
    { id: 'focus', title: k.focus, color: colors.accent.ink, items: sections.focus, showDate: true, hint: k.focusHint },
    { id: 'overdue', title: k.overdue, color: colors.semantic.error, items: sections.overdue, showDate: true },
    { id: 'today', title: k.today, color: colors.text.primary, items: sections.today, showDate: false },
    { id: 'upcoming', title: k.upcoming, color: colors.text.tertiary, items: sections.upcoming, showDate: true },
    { id: 'noDate', title: k.noDate, color: colors.text.tertiary, items: sections.noDate, showDate: false },
  ]

  const dayTasks = byDay.get(selected) ?? []
  const dayRepeats = projectedByDay.get(selected) ?? []
  const dayGoals = goalsByDay.get(selected) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && <LifeCard><p role="alert" style={{ fontFamily: font, color: colors.semantic.error, margin: 0 }}>{a.loadError}</p></LifeCard>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div role="radiogroup" aria-label={k.modeLabel} style={{
          display: 'flex', flex: 1, padding: 4, gap: 4, borderRadius: radius.full,
          background: colors.surface.base, border: `1px solid ${colors.border.subtle}`,
        }}>
          {([['list', k.list, List], ['calendar', k.calendar, CalendarDays]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
              style={{
                flex: 1, minHeight: 36, padding: '6px 10px', borderRadius: radius.full, border: 'none', cursor: 'pointer',
                background: mode === id ? colors.accent.soft : 'transparent',
                color: mode === id ? colors.accent.ink : colors.text.secondary,
                fontFamily: font, fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <Icon size={14} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => openNew(mode === 'calendar' ? selected : null)} aria-label={a.addTask} title={a.addTask}
          style={{ ...navBtn, background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`, color: colors.accent.ink }}>
          <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {hasReminders && permission === 'default' && (
        <LifeCard style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BellRing size={18} style={{ color: colors.accent.ink, flexShrink: 0 }} aria-hidden="true" />
          <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: 0, flex: 1 }}>{a.enableTitle}</p>
          <button type="button" onClick={askPermission} style={{
            minHeight: 36, padding: '8px 12px', borderRadius: radius.full, border: 'none', cursor: 'pointer',
            background: colors.accent.default, color: colors.accent.on, fontFamily: font, fontSize: '12px', fontWeight: 700,
          }}>{a.enable}</button>
        </LifeCard>
      )}

      {mode === 'list' ? (
        <>
          <LifeCard style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={quick} onChange={e => setQuick(e.target.value)} maxLength={200}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') void quickAdd() }}
              placeholder={k.quickAdd} aria-label={k.quickAdd}
              style={{
                flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: radius.sm,
                background: colors.surface.high, border: `1px solid ${colors.border.subtle}`,
                color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
              }} />
            <button type="button" onClick={() => void quickAdd()} disabled={!quick.trim() || adding} aria-label={a.addTask}
              style={{
                width: 44, height: 44, borderRadius: radius.sm, flexShrink: 0, border: 'none',
                background: quick.trim() ? colors.semantic.success : colors.surface.high,
                cursor: quick.trim() ? 'pointer' : 'default', opacity: quick.trim() ? 1 : 0.4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Check size={16} strokeWidth={3} style={{ color: quick.trim() ? colors.accent.on : colors.text.tertiary }} aria-hidden="true" />
            </button>
          </LifeCard>

          {tasks.length === 0 ? (
            <LifeCard>
              <LifeEmptyState icon={ListTodo} iconColor={colors.semantic.success}
                title={k.emptyTitle} subtitle={k.emptyText}
                action={{ label: a.addTask, onClick: () => openNew(null) }} />
            </LifeCard>
          ) : (
            <>
              {pendingCount === 0 && (
                <LifeCard><p style={{ fontFamily: font, fontSize: '14px', color: colors.text.secondary, margin: 0 }}>{k.allClear}</p></LifeCard>
              )}
              {listSections.filter(sec => sec.items.length > 0).map(sec => (
                <LifeCard key={sec.id} style={{ padding: '12px 14px' }}>
                  <h2 style={{ ...sectionTitle, color: ink(sec.color), display: 'flex', alignItems: 'center', gap: 6 }}>
                    {sec.id === 'focus' && <Star size={12} fill="currentColor" aria-hidden="true" />}
                    {sec.title} · {sec.items.length}
                  </h2>
                  {sec.hint && <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: '0 0 4px' }}>{sec.hint}</p>}
                  <TaskList tasks={sec.items} showDate={sec.showDate} {...rowProps} />
                </LifeCard>
              ))}
              {sections.done.length > 0 && (
                <LifeCard style={{ padding: '12px 14px' }}>
                  <button type="button" onClick={() => setShowDone(v => !v)} aria-expanded={showDone}
                    style={{ ...sectionTitle, margin: 0, minHeight: 32, width: '100%', textAlign: 'start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: colors.text.tertiary }}>
                    {showDone ? k.hideDone : k.showDone} · {sections.done.length}
                  </button>
                  {showDone && <div style={{ marginTop: 6 }}><TaskList tasks={sections.done} showDate {...rowProps} /></div>}
                </LifeCard>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <LifeCard style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <button type="button" style={navBtn} onClick={() => shift(-1)} aria-label={a.prevMonth}><ChevronLeft size={16} className="flip-rtl" aria-hidden="true" /></button>
              <h2 style={{ fontFamily: font, fontSize: '15px', fontWeight: 700, color: colors.text.primary, margin: 0 }} aria-live="polite">{monthLabel}</h2>
              <button type="button" style={navBtn} onClick={() => shift(1)} aria-label={a.nextMonth}><ChevronRight size={16} className="flip-rtl" aria-hidden="true" /></button>
            </div>
            <div role="grid" aria-label={a.calendarOf(monthLabel)} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {weekdayInitials(locale, weekStart).map((w, i) => (
                <div key={i} role="columnheader" style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, textAlign: 'center', padding: '4px 0', textTransform: 'uppercase' }}>{w}</div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={i} />
                const key = localDateKey(date)
                const pending = (byDay.get(key) ?? []).filter(x => !x.completed_at).length
                const repeats = (projectedByDay.get(key) ?? []).length
                const goalsHere = goalsByDay.get(key) ?? []
                const isToday = key === todayKey
                const isSelected = key === selected
                return (
                  <button key={i} type="button" role="gridcell" aria-selected={isSelected}
                    aria-label={`${longDate(key, locale)}${pending ? `, ${a.dayTasks(pending)}` : ''}${repeats ? `, ${t.repeat.repeats}` : ''}${goalsHere.length ? `, ${a.goalDate}` : ''}`}
                    onClick={() => setSelected(key)}
                    style={{
                      aspectRatio: '1', minHeight: 40, borderRadius: radius.sm, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                      background: isSelected ? colors.accent.soft : 'transparent',
                      border: isSelected ? `1px solid ${colors.accent.default}` : isToday ? `1px solid ${colors.border.medium}` : '1px solid transparent',
                      color: isToday ? colors.accent.ink : colors.text.secondary,
                      fontFamily: font, fontSize: '13px', fontWeight: isToday || isSelected ? 800 : 500,
                    }}>
                    {date.getDate()}
                    <span style={{ display: 'flex', gap: 3, height: 5 }} aria-hidden="true">
                      {pending > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors.accent.default }} />}
                      {repeats > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', boxSizing: 'border-box', border: `1px solid ${colors.accent.default}` }} />}
                      {goalsHere.slice(0, 2).map(g => <span key={g.id} style={{ width: 5, height: 5, borderRadius: '50%', background: ink(g.color) }} />)}
                    </span>
                  </button>
                )
              })}
            </div>
          </LifeCard>

          <LifeCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: 8 }}>
              <h2 style={{ fontFamily: font, fontSize: '15px', fontWeight: 700, color: colors.text.primary, margin: 0, textTransform: 'capitalize' }}>
                {selected === todayKey ? a.today : longDate(selected, locale)}
              </h2>
              <button type="button" onClick={() => openNew(selected)} aria-label={a.addTask}
                style={{ ...navBtn, background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`, color: colors.accent.ink }}>
                <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
            {dayGoals.map(g => (
              <p key={g.id} style={{ fontFamily: font, fontSize: '12.5px', color: colors.text.secondary, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ink(g.color) }} aria-hidden="true" />
                {a.goalTarget} <strong>{g.name}</strong>
              </p>
            ))}
            {dayTasks.length === 0 && dayRepeats.length === 0
              ? <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: 0 }}>{a.noTasks}</p>
              : dayTasks.length === 0 ? null
              : <TaskList tasks={[...dayTasks].sort((p, q) => Number(!!p.completed_at) - Number(!!q.completed_at) || byTime(p, q))} {...rowProps} />}
            {dayRepeats.length > 0 && (
              <ul aria-label={t.repeat.repeats} style={{ listStyle: 'none', margin: dayTasks.length ? '8px 0 0' : 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dayRepeats.map(x => (
                  <li key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 32, paddingInlineStart: 10, fontFamily: font, fontSize: '14px', color: colors.text.secondary }}>
                    <Repeat size={14} aria-label={t.repeat.repeats} style={{ color: colors.accent.ink, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</span>
                    {x.due_time && <span style={{ fontSize: '11.5px', color: colors.text.tertiary }}>{x.due_time.slice(0, 5)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </LifeCard>
        </>
      )}

      <TaskSheet open={sheet.open} initial={sheet.task} defaultDate={sheet.date}
        onClose={() => setSheet(s => ({ ...s, open: false }))}
        onSave={data => (sheet.task ? updateTask(sheet.task.id, data) : createTask(data))} />
    </div>
  )
}

export function TaskList({ tasks, goalById, onToggle, onEdit, onFocus, onDelete, showDate, markFocus }: {
  tasks: LifeTask[]
  goalById?: Map<string, GoalOption>
  onToggle: (t: LifeTask) => void
  onEdit?: (t: LifeTask) => void
  onFocus?: (t: LifeTask) => void
  onDelete?: (t: LifeTask) => void
  showDate?: boolean
  /** Marca con una estrella las tareas en foco (fuera de la sección "Foco de hoy"). */
  markFocus?: boolean
}) {
  const t0 = useLifeT()
  const a = t0.agenda
  const locale = langLocale(useAppLang(st => st.lang))
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
      {tasks.map((t, i) => {
        const done = !!t.completed_at
        const goal = t.goal_id ? goalById?.get(t.goal_id) : undefined
        const actions = [
          ...(onEdit ? [{ icon: Pencil, label: t0.common.edit, onSelect: () => onEdit(t) }] : []),
          ...(onFocus && !done ? [{ icon: t.is_focus ? StarOff : Star, label: t.is_focus ? t0.tasks.removeFocus : t0.tasks.addFocus, onSelect: () => onFocus(t) }] : []),
          ...(t.due_date && !done ? [{ icon: CalendarPlus, label: a.toCalendarShort, onSelect: () => downloadTaskIcs(t) }] : []),
          ...(onDelete ? [{ icon: Trash2, label: t0.common.delete, onSelect: () => onDelete(t), danger: true }] : []),
        ]
        return (
          <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', borderTop: i ? `1px solid ${colors.border.subtle}` : 'none' }}>
            <button type="button" role="checkbox" aria-checked={done} aria-label={a.complete(t.title)} onClick={() => onToggle(t)}
              style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <span aria-hidden="true" style={{
                width: 22, height: 22, borderRadius: 7,
                border: `2px solid ${done ? colors.semantic.success : colors.border.medium}`,
                background: done ? colors.semantic.success : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.on,
              }}>
                {done && <Check className="life-pop" size={13} strokeWidth={3} />}
              </span>
            </button>
            <button type="button" onClick={() => onEdit?.(t)} aria-label={onEdit ? a.edit(t.title) : undefined} disabled={!onEdit}
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'start', cursor: onEdit ? 'pointer' : 'default', padding: '6px 0' }}>
              <span style={{
                display: 'block', fontFamily: font, fontSize: '14px', fontWeight: 600,
                color: done ? colors.text.secondary : colors.text.primary, textDecoration: done ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {markFocus && t.is_focus && !done && (
                  <Star size={12} fill="currentColor" aria-label={t0.tasks.focus}
                    style={{ display: 'inline-block', color: colors.accent.ink, marginInlineEnd: 6, verticalAlign: '-1px' }} />
                )}
                {t.title}
              </span>
              {(showDate && t.due_date) || t.due_time || t.remind_minutes != null || goal || t.recurrence || t.subtasks.length ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontFamily: font, fontSize: '11.5px', color: colors.text.tertiary, marginTop: 2 }}>
                  {showDate && t.due_date && <span>{new Date(`${t.due_date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>}
                  {t.due_time && <span>{t.due_time.slice(0, 5)}</span>}
                  {t.remind_minutes != null && !done && <Bell size={11} aria-label={a.withReminder} />}
                  {t.recurrence && <Repeat size={11} aria-label={t0.repeat.repeats} />}
                  {t.subtasks.length > 0 && (
                    <span>{t0.repeat.progress(t.subtasks.filter(st => st.done).length, t.subtasks.length)}</span>
                  )}
                  {goal && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ink(goal.color), flexShrink: 0 }} aria-hidden="true" />{goal.name}
                    </span>
                  )}
                </span>
              ) : null}
            </button>
            {actions.length > 0 && <ActionMenu label={t0.brain.options} actions={actions} />}
          </li>
        )
      })}
    </ul>
  )
}
