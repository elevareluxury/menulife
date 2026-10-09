import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, ListChecks, Moon, Plus, Sparkles, Star, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import { localDateKey, useTasks, type LifeTask, type TaskFormData } from '../hooks/useTasks'
import { useHabits } from '../hooks/useHabits'
import { MAX_PRIORITIES, useDailyReview, type Priority } from '../hooks/useDailyReview'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'
import { nextOccurrence } from '../lib/recurrence'
import { shiftDate } from '../lib/habitStreak'
import { useLifeT } from '@/i18n/app/life'

// "Mi día" (V1 · etapa 11): las 3 prioridades de la mañana y el cierre del día (primero lo logrado).

const card: React.CSSProperties = {
  background: colors.surface.base, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.xl, padding: '16px',
}
const title: React.CSSProperties = { fontFamily: font, fontSize: '15px', fontWeight: 800, color: colors.text.primary, margin: 0 }
const muted: React.CSSProperties = { fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: '4px 0 0', lineHeight: 1.5 }
const input: React.CSSProperties = {
  flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: radius.sm, background: colors.surface.high,
  border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
}
const chipBtn: React.CSSProperties = {
  minHeight: 36, padding: '6px 12px', borderRadius: radius.full, border: `1px solid ${colors.border.medium}`, cursor: 'pointer',
  background: 'transparent', color: colors.text.primary, fontFamily: font, fontSize: '12.5px', fontWeight: 600,
}

const refresh = () => window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'brain' } }))

/** Datos de una tarea para guardarla con otra fecha (sin perder repetición, subtareas ni meta). */
function withDate(task: LifeTask, due: string | null): TaskFormData {
  return {
    title: task.title, notes: task.notes, due_date: due, due_time: task.due_time, remind_minutes: task.remind_minutes,
    goal_id: task.goal_id, is_focus: task.is_focus, recurrence: due ? task.recurrence : null, subtasks: task.subtasks,
  }
}

function CheckBox({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={done} aria-label={label} onClick={onClick}
      style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
      <span aria-hidden="true" style={{
        width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.on,
        border: `2px solid ${done ? colors.semantic.success : colors.border.medium}`, background: done ? colors.semantic.success : 'transparent',
      }}>{done && <Check className="life-pop" size={13} strokeWidth={3} />}</span>
    </button>
  )
}

/** Mañana: hasta 3 prioridades (de las tareas o escritas al vuelo) y el acceso al cierre del día. */
export function MyDaySection() {
  const t = useLifeT()
  const m = t.myDay
  const navigate = useNavigate()
  const today = localDateKey()
  const day = useDailyReview(today)
  const { review, loading, addTaskPriority, addTextPriority, removePriority, toggleTextPriority } = day
  const { tasks, loading: tasksLoading, toggleTask } = useTasks()
  const { activeHabits, loading: habitsLoading } = useHabits()
  const [draft, setDraft] = useState('')
  const [picking, setPicking] = useState(false)
  const [why, setWhy] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const full = review.priorities.length >= MAX_PRIORITIES
  const evening = new Date().getHours() >= 18
  const taskById = useMemo(() => new Map(tasks.map(x => [x.id, x])), [tasks])
  const fail = () => toast.error(t.common.saveError)

  const pickable = tasks.filter(x => !x.completed_at && !review.priorities.some(p => p.kind === 'task' && p.task_id === x.id))
  const tryAdd = (fn: () => Promise<void>) => {
    if (full) { setWhy(true); return }
    fn().catch(fail)
  }

  const label = (p: Priority) => (p.kind === 'task' ? taskById.get(p.task_id)?.title ?? '' : p.text)
  const isDone = (p: Priority) => (p.kind === 'task' ? !!taskById.get(p.task_id)?.completed_at : !!p.done)

  const firstDay = !tasksLoading && !habitsLoading && tasks.length === 0 && activeHabits.length === 0

  return (
    <>
      {firstDay && <MyDayEmpty onAddTask={() => navigate('/life/brain?vista=tareas')} />}
      <section style={card} aria-labelledby="myday-priorities">
        <h2 id="myday-priorities" style={{ ...title, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={15} aria-hidden="true" style={{ color: colors.accent.ink }} /> {m.prioritiesTitle}
          <span style={{ marginInlineStart: 'auto', fontSize: '12px', fontWeight: 700, color: colors.text.tertiary }}>{review.priorities.length}/{MAX_PRIORITIES}</span>
        </h2>
        {!review.priorities.length && <p style={muted}>{m.prioritiesHint}</p>}
        {!loading && review.priorities.length > 0 && (
          <ul aria-label={m.prioritiesTitle} style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
            {review.priorities.filter(p => label(p)).map(p => {
              const done = isDone(p)
              const task = p.kind === 'task' ? taskById.get(p.task_id) : undefined
              return (
                <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckBox done={done} label={m.done(label(p))} onClick={() => {
                    if (task) toggleTask(task).then(refresh).catch(fail)
                    else toggleTextPriority(p.id).catch(fail)
                  }} />
                  <button type="button" onClick={() => { if (task) navigate('/life/brain?vista=tareas') }} disabled={!task}
                    style={{
                      flex: 1, minWidth: 0, textAlign: 'start', background: 'none', border: 'none', padding: '8px 0', cursor: task ? 'pointer' : 'default',
                      fontFamily: font, fontSize: '15px', fontWeight: 600, color: done ? colors.text.secondary : colors.text.primary,
                      textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{label(p)}</button>
                  <button type="button" aria-label={m.remove(label(p))} onClick={() => { setWhy(false); removePriority(p.id).catch(fail) }}
                    style={{ width: 40, height: 40, background: 'none', border: 'none', color: colors.text.tertiary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={15} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={draft} maxLength={200} placeholder={m.writePlaceholder} aria-label={m.writePlaceholder}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) tryAdd(() => addTextPriority(draft).then(() => setDraft(''))) }}
            style={input} />
          <button type="button" aria-label={m.add} disabled={!draft.trim()}
            onClick={() => tryAdd(() => addTextPriority(draft).then(() => setDraft('')))}
            style={{ ...chipBtn, width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: draft.trim() ? 1 : 0.4 }}>
            <Plus size={17} aria-hidden="true" />
          </button>
        </div>
        <button type="button" onClick={() => (full ? setWhy(true) : setPicking(true))} style={{ ...chipBtn, marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ListChecks size={14} aria-hidden="true" /> {m.addFromTasks}
        </button>
        {why && <p role="status" style={{ ...muted, color: colors.text.primary }}>{m.whyThree}</p>}
      </section>

      <section style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, ...(evening && !review.closed_at ? { borderColor: colors.accent.default } : {}) }}
        aria-label={review.closed_at ? m.closed : m.closeDay}>
        <Moon size={20} aria-hidden="true" style={{ color: evening ? colors.accent.ink : colors.text.tertiary, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...title, fontSize: '14px' }}>{review.closed_at ? m.closed : m.closeDay}</p>
          <p style={{ ...muted, margin: '2px 0 0' }}>{review.closed_at ? m.closedText : m.closeHint}</p>
        </div>
        <button type="button" onClick={() => setReviewOpen(true)}
          style={{ ...chipBtn, ...(evening && !review.closed_at ? { background: colors.accent.default, borderColor: colors.accent.default, color: colors.accent.on } : {}) }}>
          {review.closed_at ? m.reopen : m.closeDay}
        </button>
      </section>

      <LifeSheet open={picking} onClose={() => setPicking(false)} title={m.pickTitle}>
        {pickable.length === 0 ? <p style={muted}>{m.noTasksToPick}</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pickable.slice(0, 100).map(x => (
              <li key={x.id}>
                <button type="button" onClick={() => { setPicking(false); tryAdd(() => addTaskPriority(x.id)) }}
                  style={{ width: '100%', minHeight: 48, textAlign: 'start', padding: '10px 12px', borderRadius: radius.md, cursor: 'pointer',
                    background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, fontSize: '14px', fontWeight: 600 }}>
                  {x.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </LifeSheet>

      {reviewOpen && <DayReviewSheet day={day} onClose={() => setReviewOpen(false)} />}
    </>
  )
}

type PendingItem = { key: string; text: string; task?: LifeTask; priority?: Priority }

/** Cierre del día: primero lo logrado (con una celebración breve), después lo que quedó, y una línea opcional. */
function DayReviewSheet({ day, onClose }: { day: ReturnType<typeof useDailyReview>; onClose: () => void }) {
  const t = useLifeT()
  const m = t.myDay
  const today = localDateKey()
  const tomorrow = shiftDate(today, 1)
  const { review, closeDay, removePriority } = day
  const { tasks, createTask, updateTask } = useTasks()
  const { todayHabits, activeHabits } = useHabits()
  const [step, setStep] = useState<'achieved' | 'pending'>('achieved')
  const [reflection, setReflection] = useState('')
  const [dateFor, setDateFor] = useState<string | null>(null)
  const [newDate, setNewDate] = useState(tomorrow)
  const [handled, setHandled] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const fail = () => toast.error(t.common.saveError)
  const closed = !!review.closed_at

  const taskById = new Map(tasks.map(x => [x.id, x]))
  const priorityTaskIds = new Set(review.priorities.flatMap(p => (p.kind === 'task' ? [p.task_id] : [])))
  const habitsDone = [...todayHabits, ...activeHabits.filter(h => !h.scheduledToday)].filter(h => h.completedToday)
  const tasksDone = tasks.filter(x => x.completed_at && localDateKey(new Date(x.completed_at)) === today)
  const textDone = review.priorities.filter(p => p.kind === 'text' && p.done)
  const achieved = [
    ...habitsDone.map(h => ({ key: `h-${h.id}`, kind: m.habitLabel, text: h.name })),
    ...tasksDone.map(x => ({ key: `t-${x.id}`, kind: priorityTaskIds.has(x.id) ? m.priorityLabel : m.taskLabel, text: x.title })),
    ...textDone.map(p => ({ key: `p-${p.id}`, kind: m.priorityLabel, text: p.kind === 'text' ? p.text : '' })),
  ]

  const pending: PendingItem[] = [
    ...review.priorities.flatMap((p): PendingItem[] => {
      if (p.kind === 'text') return p.done ? [] : [{ key: `p-${p.id}`, text: p.text, priority: p }]
      const task = taskById.get(p.task_id)
      return task && !task.completed_at ? [{ key: `t-${task.id}`, text: task.title, task, priority: p }] : []
    }),
    ...tasks.filter(x => !x.completed_at && x.due_date && x.due_date <= today && !priorityTaskIds.has(x.id))
      .map(x => ({ key: `t-${x.id}`, text: x.title, task: x })),
  ].filter(item => !handled.has(item.key))

  async function move(item: PendingItem, due: string | null) {
    try {
      if (item.task) {
        // Soltar una tarea que se repite = saltar a la próxima vez (no se pierde la repetición)
        const target = due ?? (item.task.recurrence && item.task.due_date ? nextOccurrence(item.task.due_date, item.task.recurrence, tomorrow) : null)
        await updateTask(item.task.id, withDate(item.task, target))
      } else if (item.priority?.kind === 'text' && due) {
        await createTask({ title: item.priority.text, due_date: due })
      }
      if (item.priority) await removePriority(item.priority.id)
      setHandled(prev => new Set(prev).add(item.key))
      setDateFor(null)
      refresh()
    } catch { fail() }
  }

  async function finish() {
    setSaving(true)
    try { await closeDay(reflection); onClose() } catch { fail() } finally { setSaving(false) }
  }

  return (
    <LifeSheet open onClose={onClose} title={m.reviewTitle}>
      {step === 'achieved' || closed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={title}>{m.achieved}</h3>
          {achieved.length > 0 ? (
            <>
              <p role="status" style={{ ...muted, display: 'flex', alignItems: 'center', gap: 8, color: colors.text.primary, fontWeight: 700, fontSize: '15px' }}>
                <motion.span aria-hidden="true" initial={{ scale: 0.4, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 14 }} style={{ display: 'inline-flex' }}>
                  <Sparkles size={18} style={{ color: colors.accent.ink }} />
                </motion.span>
                {m.celebrate(achieved.length)}
              </p>
              <ul aria-label={m.achieved} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {achieved.map(a => (
                  <li key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: font, fontSize: '14px', color: colors.text.primary }}>
                    <Check size={15} aria-hidden="true" style={{ color: colors.semantic.success, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.text}</span>
                    <span style={{ fontSize: '11px', color: colors.text.tertiary }}>{a.kind}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p style={muted}>{m.achievedNone}</p>}
          {closed ? (
            review.reflection && <p style={{ ...muted, fontStyle: 'italic' }}>“{review.reflection}”</p>
          ) : (
            <LifeButton onClick={() => setStep('pending')} style={{ width: '100%' }}>{m.next}</LifeButton>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={title}>{m.pending}</h3>
          {pending.length === 0 ? <p style={muted}>{m.pendingNone}</p> : (
            <>
              <p style={muted}>{m.letGoHint}</p>
              <ul aria-label={m.pending} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map(item => (
                  <li key={item.key} aria-label={item.text} style={{ padding: 12, borderRadius: radius.md, background: colors.surface.high }}>
                    <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.primary, margin: '0 0 8px' }}>{item.text}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <button type="button" style={chipBtn} onClick={() => { void move(item, tomorrow) }}>{m.tomorrow}</button>
                      <button type="button" style={chipBtn} onClick={() => { setDateFor(item.key); setNewDate(tomorrow) }}>{m.changeDate}</button>
                      <button type="button" style={chipBtn} onClick={() => { void move(item, null) }}>{m.letGo}</button>
                    </div>
                    {dateFor === item.key && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input type="date" aria-label={m.changeDate} value={newDate} min={tomorrow} onChange={e => setNewDate(e.target.value)} style={{ ...input, colorScheme: 'inherit' }} />
                        <button type="button" style={chipBtn} disabled={!newDate} onClick={() => { void move(item, newDate) }}>{t.common.save}</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div>
            <label htmlFor="myday-reflection" style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.text.tertiary, display: 'block', marginBottom: 6 }}>{m.howWas}</label>
            <textarea id="myday-reflection" value={reflection} maxLength={280} rows={2} placeholder={m.howPlaceholder}
              onChange={e => setReflection(e.target.value)} style={{ ...input, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <LifeButton onClick={finish} disabled={saving} style={{ width: '100%' }}>{saving ? t.common.saving : m.closeDay}</LifeButton>
        </div>
      )}
    </LifeSheet>
  )
}

/** Primer día sin datos: invita a crear el primer hábito o la primera tarea, con un ejemplo. */
export function MyDayEmpty({ onAddTask }: { onAddTask: () => void }) {
  const m = useLifeT().myDay
  const navigate = useNavigate()
  return (
    <section style={card} aria-labelledby="myday-empty">
      <h2 id="myday-empty" style={title}>{m.emptyTitle}</h2>
      <p style={muted}>{m.emptyText}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button type="button" style={chipBtn} onClick={() => navigate('/life/habits')}>{m.emptyHabit}</button>
        <button type="button" style={chipBtn} onClick={onAddTask}>{m.emptyTask}</button>
      </div>
    </section>
  )
}
