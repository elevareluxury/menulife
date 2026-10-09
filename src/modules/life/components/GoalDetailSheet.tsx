import { createElement, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Check, CheckCircle2, Plus, Trash2, Edit3, Pause, Play, RotateCcw, Lightbulb, StickyNote, Link2 } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { LifeSheet, MiniProgressRing, colors, font, radius, tint, ink } from '../design-system'
import type { Goal, Milestone } from '../hooks/useGoals'
import { useTasks } from '../hooks/useTasks'
import { TaskList } from './TasksView'
import { useGoalLinks } from '../hooks/useGoalLinks'
import { getHabitIcon } from '../lib/lifePalette'
import { formatMoney } from '@/lib/currencies'

interface GoalDetailSheetProps {
  goal: Goal | null
  open: boolean
  onClose: () => void
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  onToggleMilestone: (ms: Milestone) => void
  onAddMilestone: (goalId: string, title: string) => Promise<void>
  onDeleteMilestone: (id: string, goalId: string) => void
  onUpdateProgress: (goalId: string, progress: number) => void
  onUpdateStatus: (goalId: string, status: string) => void
}

const STATUS_COLOR = {
  in_progress: colors.area.goals,
  completed:   colors.semantic.success,
  paused:      colors.text.tertiary,
}

const sectionLabel: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px',
}
const actionBtn: React.CSSProperties = {
  flex: 1, minHeight: 44, padding: '10px', borderRadius: radius.md,
  background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
  color: colors.text.secondary, fontFamily: font, fontSize: '13px', fontWeight: 600,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
}

export function GoalDetailSheet({
  goal, open, onClose, onEdit, onDelete,
  onToggleMilestone, onAddMilestone, onDeleteMilestone,
  onUpdateProgress, onUpdateStatus,
}: GoalDetailSheetProps) {
  const t = useLifeT()
  const d = t.goalDetail
  const locale = langLocale(useAppLang(s => s.lang))
  const [newMsTitle, setNewMsTitle] = useState('')
  const [addingMs, setAddingMs]     = useState(false)
  const [addError, setAddError]     = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const prevProgress = useRef<number | null>(null)

  // Festejo al llegar al 100 % (sólo cuando cruza el umbral, no al abrir una meta ya completa)
  useEffect(() => {
    if (!goal) { prevProgress.current = null; return }
    const prev = prevProgress.current
    prevProgress.current = goal.progress
    if (prev != null && prev < 100 && goal.progress === 100) {
      const on = window.setTimeout(() => setCelebrating(true), 0)
      const off = window.setTimeout(() => setCelebrating(false), 2200)
      return () => { window.clearTimeout(on); window.clearTimeout(off) }
    }
  }, [goal])

  if (!goal) return null

  const hasMilestones = goal.milestones.length > 0
  const statusColor = STATUS_COLOR[goal.status]
  const isCompleted = goal.status === 'completed'

  const handleAddMs = async () => {
    if (!newMsTitle.trim() || addingMs) return
    setAddingMs(true); setAddError(false)
    try {
      await onAddMilestone(goal.id, newMsTitle.trim())
      setNewMsTitle('')
    } catch { setAddError(true) }
    finally { setAddingMs(false) }
  }

  return (
    <LifeSheet open={open} onClose={onClose} title={goal.name} maxHeight="92vh">
      <div style={{ position: 'relative' }}>
        <AnimatePresence>
          {celebrating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, zIndex: 10, background: `${tint(ink(goal.color), 9)}`, borderRadius: radius.xl,
                display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
              }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}>
                <CheckCircle2 size={80} style={{ color: ink(goal.color) }} strokeWidth={1.5} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div aria-hidden="true" style={{ height: 4, borderRadius: radius.full, background: ink(goal.color), marginBottom: '18px' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {goal.description && (
              <p style={{ fontFamily: font, fontSize: '14px', color: colors.text.secondary, lineHeight: 1.5, margin: 0 }}>
                {goal.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: goal.description ? 12 : 0, flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 10px', borderRadius: radius.full, background: `${tint(ink(statusColor), 8)}`, border: `1px solid ${tint(ink(statusColor), 16)}`, fontFamily: font, fontSize: '11px', fontWeight: 700, color: statusColor }}>
                {t.status[goal.status]}
              </span>
              {goal.target_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: radius.full, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, fontFamily: font, fontSize: '11px', fontWeight: 600, color: colors.text.secondary }}>
                  <CalendarDays size={12} aria-label={t.goals.targetDate} />
                  {new Date(goal.target_date + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <MiniProgressRing progress={goal.progress} color={ink(goal.color)} size={56} showLabel />
        </div>

        {/* Pasos */}
        <div style={{ marginBottom: '20px' }}>
          <p style={sectionLabel}>{d.steps}</p>
          <p style={{ fontFamily: font, fontSize: '12.5px', color: colors.text.tertiary, margin: '0 0 10px', lineHeight: 1.5 }}>
            {hasMilestones ? d.stepsHelp : d.stepsEmpty}
          </p>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {goal.milestones.map(ms => (
              <li key={ms.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 6px', borderRadius: radius.sm,
                background: ms.is_completed ? `${tint(ink(goal.color), 4)}` : 'transparent',
              }}>
                <button type="button" role="checkbox" aria-checked={ms.is_completed} aria-label={d.completeStep(ms.title)}
                  onClick={() => onToggleMilestone(ms)}
                  style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <span aria-hidden="true" style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `2px solid ${ms.is_completed ? ink(goal.color) : colors.border.medium}`,
                    background: ms.is_completed ? ink(goal.color) : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {ms.is_completed && <Check className="life-pop" size={13} style={{ color: colors.accent.on }} strokeWidth={3} />}
                  </span>
                </button>
                <span style={{
                  flex: 1, minWidth: 0, fontFamily: font, fontSize: '14px', fontWeight: 500,
                  color: ms.is_completed ? colors.text.tertiary : colors.text.primary,
                  textDecoration: ms.is_completed ? 'line-through' : 'none',
                }}>
                  {ms.title}
                </span>
                <button type="button" onClick={() => onDeleteMilestone(ms.id, goal.id)} aria-label={d.deleteStep(ms.title)}
                  style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: colors.text.tertiary }}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input value={newMsTitle} onChange={e => setNewMsTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleAddMs() }}
              placeholder={d.addStep} aria-label={d.addStepButton} maxLength={100}
              style={{
                flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: radius.sm,
                background: colors.surface.high, border: `1px solid ${addError ? colors.semantic.error : colors.border.subtle}`,
                color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
              }} />
            <button type="button" onClick={() => void handleAddMs()} disabled={addingMs || !newMsTitle.trim()} aria-label={d.addStepButton}
              style={{
                width: 44, height: 44, borderRadius: radius.sm, background: ink(goal.color), border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !newMsTitle.trim() ? 0.4 : 1, flexShrink: 0,
              }}>
              <Plus size={18} style={{ color: colors.accent.on }} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
          {addError && <p role="alert" style={{ fontFamily: font, fontSize: '12px', color: colors.semantic.error, margin: '6px 0 0' }}>{t.common.saveError}</p>}
        </div>

        <GoalTasks goal={goal} />

        <GoalLinks goal={goal} />

        {/* Progreso manual (sólo sin pasos) */}
        {!hasMilestones && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label htmlFor="goal-progress" style={{ ...sectionLabel, margin: 0 }}>{d.manualProgress}</label>
              <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 800, color: ink(goal.color) }}>{goal.progress}%</span>
            </div>
            <input id="goal-progress" type="range" min={0} max={100} value={goal.progress}
              onChange={e => onUpdateProgress(goal.id, Number(e.target.value))}
              style={{ width: '100%', accentColor: ink(goal.color), cursor: 'pointer', minHeight: 32 }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <button type="button" onClick={() => onEdit(goal)} style={actionBtn}>
            <Edit3 size={14} aria-hidden="true" /> {d.edit}
          </button>
          {!isCompleted && (
            <button type="button" onClick={() => onUpdateStatus(goal.id, goal.status === 'paused' ? 'in_progress' : 'paused')} style={actionBtn}>
              {goal.status === 'paused'
                ? <><Play size={14} aria-hidden="true" /> {t.goals.resume}</>
                : <><Pause size={14} aria-hidden="true" /> {t.goals.pause}</>}
            </button>
          )}
          {isCompleted ? (
            <button type="button" onClick={() => onUpdateStatus(goal.id, 'in_progress')} style={actionBtn}>
              <RotateCcw size={14} aria-hidden="true" /> {d.reopen}
            </button>
          ) : (
            <button type="button" onClick={() => onUpdateStatus(goal.id, 'completed')}
              style={{ ...actionBtn, color: ink(goal.color), border: `1px solid ${tint(ink(goal.color), 25)}` }}>
              <CheckCircle2 size={14} aria-hidden="true" /> {d.complete}
            </button>
          )}
        </div>

        <button type="button" onClick={() => onDelete(goal)}
          style={{
            width: '100%', marginTop: '12px', minHeight: 44, padding: '10px', borderRadius: radius.md,
            background: tint(colors.semantic.error, 6), border: `1px solid ${tint(colors.semantic.error, 20)}`,
            color: colors.semantic.error, fontFamily: font, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
          <Trash2 size={14} aria-hidden="true" /> {d.delete}
        </button>
      </div>
    </LifeSheet>
  )
}

/** Tareas de Brain vinculadas a la meta (se completan desde acá; se crean ya vinculadas). */
function GoalTasks({ goal }: { goal: Goal }) {
  const t = useLifeT()
  const { tasks, loading, createTask, toggleTask } = useTasks()
  const [title, setTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [failed, setFailed] = useState(false)
  const mine = tasks
    .filter(x => x.goal_id === goal.id)
    .sort((a, b) => Number(!!a.completed_at) - Number(!!b.completed_at) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))

  const add = async () => {
    if (!title.trim() || adding) return
    setAdding(true); setFailed(false)
    try {
      await createTask({ title: title.trim(), goal_id: goal.id })
      setTitle('')
    } catch { setFailed(true) } finally { setAdding(false) }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={sectionLabel}>{t.tasks.goalTasks}</p>
      {!loading && mine.length === 0 && (
        <p style={{ fontFamily: font, fontSize: '12.5px', color: colors.text.tertiary, margin: '0 0 10px', lineHeight: 1.5 }}>{t.tasks.goalTasksEmpty}</p>
      )}
      {mine.length > 0 && (
        <TaskList tasks={mine} showDate
          onToggle={x => { toggleTask(x).catch(() => setFailed(true)) }} />
      )}
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void add() }}
          placeholder={t.tasks.goalTaskPlaceholder} aria-label={t.tasks.goalTaskPlaceholder} maxLength={200}
          style={{
            flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: radius.sm,
            background: colors.surface.high, border: `1px solid ${failed ? colors.semantic.error : colors.border.subtle}`,
            color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
          }} />
        <button type="button" onClick={() => void add()} disabled={adding || !title.trim()} aria-label={t.agenda.addTask}
          style={{
            width: 44, height: 44, borderRadius: radius.sm, background: ink(goal.color), border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !title.trim() ? 0.4 : 1, flexShrink: 0,
          }}>
          <Plus size={18} style={{ color: colors.accent.on }} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
      {failed && <p role="alert" style={{ fontFamily: font, fontSize: '12px', color: colors.semantic.error, margin: '6px 0 0' }}>{t.common.saveError}</p>}
    </div>
  )
}

/** Hábitos, dinero y notas vinculados a la meta (se vinculan desde su propia edición). */
function GoalLinks({ goal }: { goal: Goal }) {
  const t = useLifeT()
  const c = t.connections
  const locale = langLocale(useAppLang(s => s.lang))
  const { habits, money, notes, loaded } = useGoalLinks(goal.id)
  if (!loaded) return null

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }
  const name: React.CSSProperties = { flex: 1, minWidth: 0, fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const meta: React.CSSProperties = { fontFamily: font, fontSize: '12px', color: colors.text.tertiary, flexShrink: 0 }

  if (habits.length === 0 && money.length === 0 && notes.length === 0) {
    return (
      <p style={{ display: 'flex', gap: 8, fontFamily: font, fontSize: '12.5px', color: colors.text.tertiary, margin: '0 0 20px', lineHeight: 1.5 }}>
        <Link2 size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />{c.hint}
      </p>
    )
  }

  return (
    <>
      {habits.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={sectionLabel}>{c.habits}</p>
          {habits.map(h => (
            <div key={h.id} style={row}>
              <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${tint(ink(h.color), 9)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {createElement(getHabitIcon(h.icon), { size: 14, style: { color: ink(h.color) }, strokeWidth: 2.2 })}
              </span>
              <span style={name}>{h.name}</span>
              {h.scheduled > 0 && <span style={meta}>{c.habitRate(h.done, h.scheduled)}</span>}
            </div>
          ))}
        </div>
      )}
      {money.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={sectionLabel}>{c.money}</p>
          {money.map(m => (
            <div key={m.currency} style={{ ...row, flexWrap: 'wrap', fontFamily: font, fontSize: '13px', color: colors.text.secondary }}>
              <span style={{ fontWeight: 700, color: colors.text.primary, minWidth: 40 }}>{m.currency}</span>
              {m.income > 0 && <span>{t.money.income} <strong style={{ color: colors.semantic.success }}>{formatMoney(m.income, m.currency, locale)}</strong></span>}
              {m.expense > 0 && <span>{t.money.expense} <strong style={{ color: colors.text.primary }}>{formatMoney(m.expense, m.currency, locale)}</strong></span>}
              <span style={{ ...meta, marginInlineStart: 'auto' }}>{c.movements(m.count)}</span>
            </div>
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={sectionLabel}>{c.notes}</p>
          {notes.map(n => (
            <div key={n.id} style={row}>
              {n.type === 'idea'
                ? <Lightbulb size={15} aria-label={t.brain.types.idea} style={{ color: colors.area.brain, flexShrink: 0 }} />
                : <StickyNote size={15} aria-label={t.brain.types.note} style={{ color: colors.area.goals, flexShrink: 0 }} />}
              <span style={name}>{n.title}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
