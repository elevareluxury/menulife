import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarCheck, Check, History, ListChecks, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { usePrefs } from '@/lib/prefs'
import { useAuthStore } from '@/store/authStore'
import { FEATURES } from '@/lib/features'
import { useToday } from '../hooks/useToday'
import { insertTask, taskWithDate as withDate, useTasks, type LifeTask } from '../hooks/useTasks'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'
import { useWeeklyHistory, useWeeklyReview, useWeeklyReviewStatus, type FocusItem, type WeeklyReview } from '../hooks/useWeeklyReview'
import { isWeekLastDay, MAX_FOCUS, nextWeekDate, weekEndOf, weekHasWins, weekToReview, WEEKLY_TEXT_MAX } from '../lib/weeklyReview'
import { nearestMood } from '../lib/mood'
import { nextOccurrence } from '../lib/recurrence'
import { shiftDate, weekStartOf } from '../lib/habitStreak'
import { celebrate } from '../lib/celebrate'
import { MOOD_ICONS } from '../lib/moodIcons'
import { PickerWrap } from '@/components/ui/PickerWrap'

// "Tu semana en 5 minutos": tarjeta en Mi día el último día de la semana, hoja guiada de 3 pasos (lo que salió bien,
// qué soltar, 3 cosas para la semana que viene) y la lista de semanas anteriores (en Insights).

const card: React.CSSProperties = {
  background: colors.surface.base, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.xl, padding: '16px', position: 'relative',
}
const title: React.CSSProperties = { fontFamily: font, fontSize: '15px', fontWeight: 800, color: colors.text.primary, margin: 0 }
const muted: React.CSSProperties = { fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: '4px 0 0', lineHeight: 1.5 }
const label: React.CSSProperties = { fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.text.tertiary, display: 'block', marginBottom: 6 }
const input: React.CSSProperties = {
  flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: radius.sm, background: colors.surface.high,
  border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
}
const chipBtn: React.CSSProperties = {
  minHeight: 36, padding: '6px 12px', borderRadius: radius.full, border: `1px solid ${colors.border.medium}`, cursor: 'pointer',
  background: 'transparent', color: colors.text.primary, fontFamily: font, fontSize: '12.5px', fontWeight: 600,
}

const refresh = () => window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'brain' } }))
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

const dismissKey = (uid: string) => `mycen.life.weekly.dismissed.${uid}`
const isDismissed = (uid: string, week: string) => { try { return localStorage.getItem(dismissKey(uid)) === week } catch { return false } }
const dismiss = (uid: string, week: string) => { try { localStorage.setItem(dismissKey(uid), week) } catch { /* sin almacenamiento */ } }

function useWeekLabel() {
  const locale = langLocale(useAppLang(s => s.lang))
  const w = useLifeT().weekly
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  return (week: string) => w.range(fmt(week), fmt(weekEndOf(week)))
}

/** En Mi día, el último día de la semana (si todavía no se hizo la revisión ni se dejó para otro momento). */
export function WeeklyReviewCard() {
  const today = useToday()
  const weekStart = usePrefs(s => s.week_start)
  if (!FEATURES.lifeReflection || !isWeekLastDay(today, weekStart)) return null
  return <WeeklyReviewCardInner week={weekStartOf(today, weekStart)} />
}

function WeeklyReviewCardInner({ week }: { week: string }) {
  const w = useLifeT().weekly
  const uid = useAuthStore(s => s.user?.id)
  const status = useWeeklyReviewStatus(week)
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  if (!uid || !status || status.closed || hidden || isDismissed(uid, week)) return null
  return (
    <>
      <section style={{ ...card, borderColor: colors.accent.default }} aria-labelledby="life-weekly-card">
        <h2 id="life-weekly-card" style={{ ...title, display: 'flex', alignItems: 'center', gap: 8, paddingInlineEnd: 36 }}>
          <CalendarCheck size={16} aria-hidden="true" style={{ color: colors.accent.ink }} /> {w.cardTitle}
        </h2>
        <p style={muted}>{w.cardText}</p>
        <button type="button" onClick={() => setOpen(true)}
          style={{ ...chipBtn, marginTop: 10, minHeight: 40, background: colors.accent.default, borderColor: colors.accent.default, color: colors.accent.on, fontWeight: 700 }}>
          {w.start}
        </button>
        <button type="button" aria-label={w.later} title={w.later} onClick={() => { dismiss(uid, week); setHidden(true) }}
          style={{ position: 'absolute', top: 8, insetInlineEnd: 8, width: 40, height: 40, background: 'none', border: 'none', color: colors.text.tertiary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} aria-hidden="true" />
        </button>
      </section>
      {open && <WeeklyReviewSheet week={week} onClose={() => setOpen(false)} onDone={() => setHidden(true)} />}
    </>
  )
}

type Step = 'wins' | 'letGo' | 'focus'

/** Hoja guiada de 3 pasos. Si la semana ya se revisó, muestra lo guardado. */
export function WeeklyReviewSheet({ week, onClose, onDone }: { week: string; onClose: () => void; onDone?: () => void }) {
  const t = useLifeT()
  const w = t.weekly
  const navigate = useNavigate()
  const weekLabel = useWeekLabel()
  const { review, summary, loading, error, finish } = useWeeklyReview(week)
  const [step, setStep] = useState<Step>('wins')
  const [wins, setWins] = useState<string | null>(null)
  const [letGo, setLetGo] = useState<string | null>(null)
  const [focus, setFocus] = useState<FocusItem[] | null>(null)
  const [saving, setSaving] = useState(false)
  const winsText = wins ?? review.wins ?? ''
  const letGoText = letGo ?? review.let_go ?? ''
  const focusItems = focus ?? review.next_focus
  const fail = () => toast.error(t.common.saveError)

  async function done() {
    setSaving(true)
    try {
      await finish({ wins: winsText, let_go: letGoText, next_focus: focusItems })
      celebrate()
      toast.success(w.done)
      onDone?.()
      onClose()
    } catch { fail() } finally { setSaving(false) }
  }

  const stepNo = step === 'wins' ? 1 : step === 'letGo' ? 2 : 3
  return (
    <LifeSheet open onClose={onClose} title={w.sheetTitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ ...muted, margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>{weekLabel(week)}</span>
          {!review.closed_at && <span aria-hidden="true">·</span>}
          {!review.closed_at && <span>{w.step(stepNo)}</span>}
        </p>
        {loading ? <p role="status" style={muted}>{w.loading}</p> : error ? <p role="alert" style={muted}>{w.loadError}</p> : review.closed_at ? (
          <>
            <WeekReviewDetails review={review} />
            <LifeButton variant="secondary" onClick={() => { onClose(); navigate('/life/insights#semanas') }} style={{ width: '100%' }}>
              <History size={14} aria-hidden="true" style={{ marginInlineEnd: 6, verticalAlign: '-2px' }} />{w.seeHistory}
            </LifeButton>
          </>
        ) : step === 'wins' ? (
          <>
            <h3 style={title}>{w.wentWell}</h3>
            {summary && weekHasWins(summary) ? (
              <ul aria-label={w.wentWell} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {summary.tasksDone > 0 && <WinRow text={w.tasksDone(summary.tasksDone)} />}
                {summary.habitsDone > 0 && <WinRow text={w.habitsDone(summary.habitsDone)} />}
                {summary.mood && <WinRow text={w.moodAvg(t.mood.levels[nearestMood(summary.mood.avg) - 1], summary.mood.days)} moodIcon={nearestMood(summary.mood.avg)} />}
              </ul>
            ) : <p style={muted}>{w.quiet}</p>}
            <div>
              <label htmlFor="weekly-wins" style={label}>{w.winsLabel}</label>
              <textarea id="weekly-wins" value={winsText} maxLength={WEEKLY_TEXT_MAX} rows={3} placeholder={w.winsPlaceholder}
                onChange={e => setWins(e.target.value)} style={{ ...input, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <LifeButton onClick={() => setStep('letGo')} style={{ width: '100%' }}>{w.next}</LifeButton>
          </>
        ) : step === 'letGo' ? (
          <>
            <h3 style={title}>{w.letGoTitle}</h3>
            <p style={{ ...muted, margin: 0 }}>{w.letGoHint}</p>
            <OverdueTasks week={week} />
            <div>
              <label htmlFor="weekly-letgo" style={label}>{w.letGoLabel}</label>
              <textarea id="weekly-letgo" value={letGoText} maxLength={WEEKLY_TEXT_MAX} rows={2} placeholder={w.letGoPlaceholder}
                onChange={e => setLetGo(e.target.value)} style={{ ...input, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <LifeButton variant="secondary" onClick={() => setStep('wins')} style={{ flex: 1 }}>{w.back}</LifeButton>
              <LifeButton onClick={() => setStep('focus')} style={{ flex: 1 }}>{w.next}</LifeButton>
            </div>
          </>
        ) : (
          <>
            <h3 style={title}>{w.focusTitle}</h3>
            <p style={{ ...muted, margin: 0 }}>{w.focusHint}</p>
            <FocusEditor week={week} items={focusItems} onChange={setFocus} />
            <div style={{ display: 'flex', gap: 8 }}>
              <LifeButton variant="secondary" onClick={() => setStep('letGo')} style={{ flex: 1 }}>{w.back}</LifeButton>
              <LifeButton onClick={done} disabled={saving} style={{ flex: 1 }}>{saving ? t.common.saving : w.finish}</LifeButton>
            </div>
          </>
        )}
      </div>
    </LifeSheet>
  )
}

function WinRow({ text, moodIcon }: { text: string; moodIcon?: 1 | 2 | 3 | 4 | 5 }) {
  const Icon = moodIcon ? MOOD_ICONS[moodIcon] : Check
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: font, fontSize: '14px', color: colors.text.primary }}>
      <Icon size={16} aria-hidden="true" style={{ color: moodIcon ? colors.accent.ink : colors.semantic.success, flexShrink: 0 }} />
      <span>{text}</span>
    </li>
  )
}

/** Paso 2: las tareas atrasadas de la semana, para pasarlas a la que viene, cambiarles la fecha o soltarlas. */
function OverdueTasks({ week }: { week: string }) {
  const t = useLifeT()
  const w = t.weekly
  const m = t.myDay
  const today = useToday()
  const { tasks, updateTask } = useTasks()
  const [dateFor, setDateFor] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [handled, setHandled] = useState<Set<string>>(new Set())
  const nextDate = nextWeekDate(week, today)
  const tomorrow = shiftDate(today, 1)
  const until = weekEndOf(week) < today ? weekEndOf(week) : today
  const overdue = tasks.filter(x => !x.completed_at && x.due_date && x.due_date <= until && !handled.has(x.id))

  async function move(task: LifeTask, due: string | null) {
    try {
      // Soltar una tarea que se repite = saltar a la próxima vez (como en el cierre del día)
      const target = due ?? (task.recurrence && task.due_date ? nextOccurrence(task.due_date, task.recurrence, tomorrow) : null)
      await updateTask(task.id, withDate(task, target))
      setHandled(prev => new Set(prev).add(task.id))
      setDateFor(null)
      refresh()
    } catch { toast.error(t.common.saveError) }
  }

  if (!overdue.length) return <p style={{ ...muted, margin: 0 }}>{w.overdueNone}</p>
  return (
    <ul aria-label={w.overdueTitle} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {overdue.slice(0, 50).map(task => (
        <li key={task.id} aria-label={task.title} style={{ padding: 12, borderRadius: radius.md, background: colors.surface.high }}>
          <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.primary, margin: '0 0 8px' }}>{task.title}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" style={chipBtn} onClick={() => { void move(task, nextDate) }}>{w.nextWeek}</button>
            <button type="button" style={chipBtn} onClick={() => { setDateFor(task.id); setNewDate(nextDate) }}>{m.changeDate}</button>
            <button type="button" style={chipBtn} onClick={() => { void move(task, null) }}>{m.letGo}</button>
          </div>
          {dateFor === task.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <PickerWrap kind="date"><input type="date" aria-label={m.changeDate} value={newDate} min={today} onChange={e => setNewDate(e.target.value)} style={{ ...input, colorScheme: 'inherit' }} /></PickerWrap>
              <button type="button" style={chipBtn} disabled={!newDate} onClick={() => { void move(task, newDate) }}>{t.common.save}</button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Paso 3: hasta 3 cosas para la semana que viene, anotadas o creadas como tareas (con fecha al empezar la semana). */
function FocusEditor({ week, items, onChange }: { week: string; items: FocusItem[]; onChange: (items: FocusItem[]) => void }) {
  const t = useLifeT()
  const w = t.weekly
  const today = useToday()
  const uid = useAuthStore(s => s.user?.id)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [why, setWhy] = useState(false)
  const full = items.length >= MAX_FOCUS
  const text = draft.trim().slice(0, 200)

  async function add(asTask: boolean) {
    if (full) { setWhy(true); return }
    if (!text) return
    if (!asTask) { onChange([...items, { id: newId(), kind: 'text', text, done: false }]); setDraft(''); return }
    setBusy(true)
    try {
      if (!uid) return
      const task = await insertTask(uid, { title: text, due_date: nextWeekDate(week, today) })
      onChange([...items, { id: newId(), kind: 'task', task_id: task.id, text }])
      setDraft('')
      refresh()
    } catch { toast.error(t.common.saveError) } finally { setBusy(false) }
  }

  return (
    <div>
      {items.length > 0 && (
        <ol aria-label={w.focusTitle} style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => (
            <li key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 12px', borderRadius: radius.md, background: colors.surface.high }}>
              <span aria-hidden="true" style={{ fontFamily: font, fontSize: '13px', fontWeight: 800, color: colors.accent.ink }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.text}</span>
              {it.kind === 'task' && <span style={{ fontFamily: font, fontSize: '11px', color: colors.text.tertiary }}>{w.taskTag}</span>}
              <button type="button" aria-label={w.removeFocus(it.text ?? '')} onClick={() => { setWhy(false); onChange(items.filter(x => x.id !== it.id)) }}
                style={{ width: 40, height: 40, background: 'none', border: 'none', color: colors.text.tertiary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <input value={draft} maxLength={200} placeholder={w.focusPlaceholder} aria-label={w.focusPlaceholder}
        onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(false) }}
        style={{ ...input, width: '100%', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" style={{ ...chipBtn, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: text ? 1 : 0.5 }} disabled={!text || busy} onClick={() => { void add(false) }}>
          <Plus size={14} aria-hidden="true" /> {w.addText}
        </button>
        <button type="button" style={{ ...chipBtn, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: text ? 1 : 0.5 }} disabled={!text || busy} onClick={() => { void add(true) }}>
          <ListChecks size={14} aria-hidden="true" /> {w.addTask}
        </button>
      </div>
      {(why || (full && text)) && <p role="status" style={{ ...muted, color: colors.text.primary }}>{w.focusFull}</p>}
    </div>
  )
}

/** Lo guardado de una semana (en la hoja ya cerrada y en la lista de semanas). */
function WeekReviewDetails({ review }: { review: WeeklyReview }) {
  const w = useLifeT().weekly
  const row = (name: string, body: React.ReactNode) => (
    <div>
      <p style={{ ...label, marginBottom: 2 }}>{name}</p>
      <div style={{ fontFamily: font, fontSize: '14px', color: colors.text.primary, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{body}</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {review.wins && row(w.winsShort, review.wins)}
      {review.let_go && row(w.letGoShort, review.let_go)}
      {review.next_focus.length > 0 && row(w.focusShort, (
        <ol style={{ margin: 0, paddingInlineStart: 20 }}>
          {review.next_focus.map(f => <li key={f.id}>{f.text}</li>)}
        </ol>
      ))}
      {!review.wins && !review.let_go && !review.next_focus.length && <p style={{ ...muted, margin: 0 }}>{w.closedEmpty}</p>}
    </div>
  )
}

/** Insights: hacer la revisión cuando la persona quiera y ver las semanas anteriores. */
export function WeeklyHistory() {
  const w = useLifeT().weekly
  const today = useToday()
  const weekStart = usePrefs(s => s.week_start)
  const weekLabel = useWeekLabel()
  const { items, loading, reload } = useWeeklyHistory()
  const [open, setOpen] = useState(false)
  const { hash } = useLocation()
  const ref = useRef<HTMLElement>(null)
  // "Ver semanas anteriores" desde la hoja lleva acá
  useEffect(() => { if (hash === '#semanas' && !loading) ref.current?.scrollIntoView({ block: 'start' }) }, [hash, loading])
  if (!FEATURES.lifeReflection) return null
  const week = weekToReview(today, weekStart)
  return (
    <section ref={ref} id="semanas" aria-labelledby="life-weekly-history" style={{ ...card, marginTop: 16 }}>
      <h2 id="life-weekly-history" style={{ ...title, display: 'flex', alignItems: 'center', gap: 8 }}>
        <History size={15} aria-hidden="true" style={{ color: colors.accent.ink }} /> {w.historyTitle}
      </h2>
      <button type="button" onClick={() => setOpen(true)} style={{ ...chipBtn, marginTop: 10, minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <CalendarCheck size={14} aria-hidden="true" /> {w.reviewWeek(weekLabel(week))}
      </button>
      {!loading && (items.length === 0 ? <p style={muted}>{w.historyEmpty}</p> : (
        <ul aria-label={w.historyTitle} style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(r => (
            <li key={r.week_start} aria-label={weekLabel(r.week_start)} style={{ padding: 12, borderRadius: radius.md, background: colors.surface.high }}>
              <p style={{ ...title, fontSize: '13px', marginBottom: 8 }}>{weekLabel(r.week_start)}</p>
              <WeekReviewDetails review={r} />
            </li>
          ))}
        </ul>
      ))}
      {open && <WeeklyReviewSheet week={week} onClose={() => { setOpen(false); reload() }} />}
    </section>
  )
}
