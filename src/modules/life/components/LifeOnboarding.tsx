import { createElement, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Briefcase, GraduationCap, HeartPulse, House, Moon, PenLine, Sparkles, Users, Wallet, X, type LucideIcon,
} from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { usePrefs } from '@/lib/prefs'
import { trackEvent, trackOncePerSession } from '@/lib/productEvents'
import { LifeButton, colors, font, radius, tint, ink } from '../design-system'
import { useToday } from '../hooks/useToday'
import { createOnboardingPlan, type CreatedPlan } from '../hooks/useLifeOnboarding'
import { weekdayOf } from '../lib/habitStreak'
import { getHabitIcon } from '../lib/lifePalette'
import { celebrate } from '../lib/celebrate'
import {
  MAX_GOAL, MAX_HABIT, MAX_TASK, ONBOARDING_AREAS, planProblem, proposalFor, type OnboardingArea, type OnboardingPlan,
} from '../lib/lifeOnboarding'

// Onboarding de Life OS: 1) "¿Qué querés mejorar?" → 2) la propuesta ya armada y editable → "Listo" crea todo y
// vuelve a Mi día con la tarea como prioridad y el hábito para tildar. "Lo armo yo" lo saltea en cualquier paso.

const AREA_ICONS: Record<OnboardingArea, LucideIcon> = {
  health: HeartPulse, money: Wallet, learn: GraduationCap, order: House,
  work: Briefcase, relationships: Users, rest: Moon, other: PenLine,
}

const card: React.CSSProperties = {
  background: colors.surface.base, border: `1px solid ${colors.border.glass}`, borderRadius: radius.xl,
  padding: '18px 16px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
}
const h1: React.CSSProperties = {
  fontFamily: font, fontSize: '24px', fontWeight: 800, color: colors.text.primary, margin: 0, letterSpacing: '-0.02em',
  lineHeight: 1.2, outline: 'none',
}
const muted: React.CSSProperties = { fontFamily: font, fontSize: '14px', color: colors.text.secondary, margin: '6px 0 0', lineHeight: 1.5 }
const label: React.CSSProperties = {
  display: 'block', fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
}
const input: React.CSSProperties = {
  width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '11px 12px', borderRadius: radius.md,
  background: colors.surface.high, border: `1px solid ${colors.border.medium}`, color: colors.text.primary,
  fontFamily: font, fontSize: '16px', outline: 'none',
}
const section: React.CSSProperties = {
  padding: 12, borderRadius: radius.lg, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`,
}

const dayInitial = (day: number, locale: string) => new Date(2024, 0, 7 + day).toLocaleDateString(locale, { weekday: 'narrow' })
const dayName = (day: number, locale: string) => new Date(2024, 0, 7 + day).toLocaleDateString(locale, { weekday: 'long' })

export function LifeOnboarding({ userId, onDone }: { userId: string; onDone: (completed: boolean) => void }) {
  const t = useLifeT()
  const o = t.onboarding
  const today = useToday()
  const reduce = useReducedMotion()
  const [step, setStep] = useState<1 | 2>(1)
  const [other, setOther] = useState<{ open: boolean; text: string }>({ open: false, text: '' })
  const [plan, setPlan] = useState<OnboardingPlan | null>(null)
  const [problem, setProblem] = useState<ReturnType<typeof planProblem>>(null)
  const [saving, setSaving] = useState(false)
  const created = useRef<CreatedPlan>({})
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)

  useEffect(() => { trackOncePerSession(`life-onboarding-${userId}`, 'life_onboarding_started') }, [userId])

  // Al cambiar de paso, el foco va al título nuevo (los lectores de pantalla lo anuncian)
  useEffect(() => {
    if (!moved.current) return
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [step, reduce])

  const choose = (area: OnboardingArea, otherText = '') => {
    // Si vuelve a elegir la misma opción, se conserva lo que ya editó
    if (plan?.area !== area || area === 'other') setPlan(proposalFor(area, t, weekdayOf(today), otherText))
    setProblem(null)
    moved.current = true
    setStep(2)
  }

  const skip = () => {
    trackEvent('life_onboarding_skipped', { step })
    onDone(false)
  }

  async function finish() {
    if (!plan || saving) return
    const p = planProblem(plan)
    setProblem(p)
    if (p) {
      document.getElementById(`life-ob-${p}`)?.focus()
      return
    }
    setSaving(true)
    try {
      await createOnboardingPlan(userId, plan, today, created.current)
      trackEvent('life_onboarding_completed', { tipo: plan.area, count: 1 + (plan.habit ? 1 : 0) + (plan.task ? 1 : 0) })
      celebrate()
      onDone(true)
    } catch {
      toast.error(t.common.saveError)
      setSaving(false)
    }
  }

  const enter = reduce ? false : { opacity: 0, y: 10 }

  return (
    <section aria-label={o.regionLabel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.text.tertiary, margin: 0 }}>{o.step(step, 2)}</p>
        <button type="button" onClick={skip}
          style={{
            minHeight: 44, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: font, fontSize: '14px', fontWeight: 700, color: colors.text.secondary, textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}>
          {o.skip}
        </button>
      </div>

      {step === 1 ? (
        <motion.div key="pick" initial={enter} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} style={card}>
          <h1 ref={heading} tabIndex={-1} id="life-ob-title" style={h1}>{o.pickTitle}</h1>
          <p style={muted}>{o.pickText}</p>
          <ul aria-labelledby="life-ob-title" style={{
            listStyle: 'none', margin: '16px 0 0', padding: 0,
            // Dos columnas desde 320 px (el ancho útil de la tarjeta ahí es ~254 px)
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8,
          }}>
            {ONBOARDING_AREAS.map(area => {
              const selected = area === 'other' ? other.open : plan?.area === area
              return (
                <li key={area}>
                  <button type="button" aria-pressed={selected}
                    onClick={() => (area === 'other' ? setOther(s => ({ ...s, open: true })) : choose(area))}
                    style={{
                      // Ícono arriba del texto: en 320 px la etiqueta tiene todo el ancho y no se corta a mitad de palabra
                      width: '100%', height: '100%', minHeight: 72, padding: '10px 12px', borderRadius: radius.lg, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 6, textAlign: 'start',
                      background: selected ? colors.accent.soft : colors.surface.high,
                      border: `1.5px solid ${selected ? colors.accent.default : colors.border.subtle}`,
                      color: colors.text.primary, fontFamily: font, fontSize: '14px', fontWeight: 700, lineHeight: 1.25,
                    }}>
                    {createElement(AREA_ICONS[area], { size: 18, 'aria-hidden': true, style: { color: colors.accent.ink, flexShrink: 0 } })}
                    <span style={{ minWidth: 0, maxWidth: '100%', overflowWrap: 'break-word', hyphens: 'auto' }}>{o.areas[area]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {other.open && (
            <form style={{ marginTop: 14 }} onSubmit={e => { e.preventDefault(); if (other.text.trim()) choose('other', other.text) }}>
              <label htmlFor="life-ob-other" style={label}>{o.otherLabel}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input id="life-ob-other" autoFocus value={other.text} maxLength={MAX_GOAL} placeholder={o.otherPlaceholder}
                  onChange={e => setOther(s => ({ ...s, text: e.target.value }))} style={{ ...input, flex: '1 1 160px', width: 'auto' }} />
                <LifeButton type="submit" disabled={!other.text.trim()} style={{ minHeight: 44, flex: '0 0 auto', opacity: other.text.trim() ? 1 : 0.5 }}>
                  {o.continue}
                </LifeButton>
              </div>
            </form>
          )}
        </motion.div>
      ) : plan && (
        <motion.div key="plan" initial={enter} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} style={card}>
          <h1 ref={heading} tabIndex={-1} style={h1}>{o.planTitle}</h1>
          <p style={muted}>{o.planText}</p>
          <PlanEditor plan={plan} onChange={p => { setPlan(p); setProblem(null) }} problem={problem} />
          {problem && (
            <p role="alert" style={{ ...muted, color: colors.semantic.error, fontWeight: 600 }}>
              {{ goal: o.goalRequired, habit: o.habitRequired, days: o.daysRequired, task: o.taskRequired }[problem]}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <LifeButton type="button" variant="secondary" onClick={() => { moved.current = true; setStep(1) }} disabled={saving}
              style={{ minHeight: 48, flex: '0 0 auto' }}>
              <ArrowLeft size={15} aria-hidden="true" className="flip-rtl" /> {o.back}
            </LifeButton>
            <LifeButton type="button" onClick={() => { void finish() }} disabled={saving} aria-busy={saving || undefined}
              style={{ minHeight: 48, flex: '1 1 140px' }}>
              {saving ? o.creating : o.done}
            </LifeButton>
          </div>
        </motion.div>
      )}
    </section>
  )
}

/** La propuesta editable: meta, hábito chico (con días) y la primera tarea. El hábito y la tarea se pueden sacar. */
function PlanEditor({ plan, onChange, problem }: {
  plan: OnboardingPlan; onChange: (p: OnboardingPlan) => void; problem: ReturnType<typeof planProblem>
}) {
  const t = useLifeT()
  const o = t.onboarding
  const today = useToday()
  const locale = langLocale(useAppLang(s => s.lang))
  const weekStart = usePrefs(s => s.week_start)
  const order = weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
  const color = ink(plan.goal.color)
  // Lo que escribió antes de sacar el hábito o la tarea vuelve si los suma otra vez
  const [lastHabit, setLastHabit] = useState(plan.habit)
  const [lastTask, setLastTask] = useState(plan.task)
  const fallback = () => proposalFor(plan.area, t, weekdayOf(today))

  const toggleDay = (day: number) => {
    if (!plan.habit) return
    const days = plan.habit.days.includes(day) ? plan.habit.days.filter(d => d !== day) : [...plan.habit.days, day].sort((a, b) => a - b)
    onChange({ ...plan, habit: { ...plan.habit, days } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
      <div style={{ ...section, borderColor: tint(color, 35) }}>
        <label htmlFor="life-ob-goal" style={{ ...label, color }}>{o.goal}</label>
        <input id="life-ob-goal" value={plan.goal.name} maxLength={MAX_GOAL} aria-invalid={problem === 'goal' || undefined}
          onChange={e => onChange({ ...plan, goal: { ...plan.goal, name: e.target.value } })} style={input} />
      </div>

      <div style={section}>
        <Include id="life-ob-include-habit" checked={!!plan.habit} label={o.includeHabit} onChange={on => {
          if (!on) setLastHabit(plan.habit)
          onChange({ ...plan, habit: on ? (lastHabit ?? fallback().habit) : null })
        }} />
        {plan.habit && (
          <div style={{ marginTop: 10 }}>
            <label htmlFor="life-ob-habit" style={label}>{o.habit}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: tint(color, 12),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {createElement(getHabitIcon(plan.habit.icon), { size: 17, style: { color }, strokeWidth: 2.2 })}
              </span>
              <input id="life-ob-habit" value={plan.habit.name} maxLength={MAX_HABIT} aria-invalid={problem === 'habit' || undefined}
                onChange={e => plan.habit && onChange({ ...plan, habit: { ...plan.habit, name: e.target.value } })} style={input} />
            </div>
            <p id="life-ob-days-label" style={{ ...label, margin: '12px 0 6px' }}>{o.habitDays}</p>
            <div id="life-ob-days" role="group" aria-labelledby="life-ob-days-label" tabIndex={-1}
              style={{ display: 'flex', gap: 4, outline: 'none' }}>
              {order.map(day => {
                const active = plan.habit!.days.includes(day)
                return (
                  <button key={day} type="button" aria-pressed={active} aria-label={dayName(day, locale)} onClick={() => toggleDay(day)}
                    style={{
                      flex: '1 1 0', minWidth: 0, height: 44, padding: 0, borderRadius: radius.sm, cursor: 'pointer',
                      background: active ? tint(color, 14) : colors.surface.base,
                      border: `1.5px solid ${active ? color : colors.border.subtle}`,
                      color: active ? color : colors.text.tertiary,
                      fontFamily: font, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase',
                    }}>
                    {dayInitial(day, locale)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div style={section}>
        <Include id="life-ob-include-task" checked={!!plan.task} label={o.includeTask} onChange={on => {
          if (!on) setLastTask(plan.task)
          onChange({ ...plan, task: on ? (lastTask ?? fallback().task) : null })
        }} />
        {plan.task && (
          <div style={{ marginTop: 10 }}>
            <label htmlFor="life-ob-task" style={label}>{o.task}</label>
            <input id="life-ob-task" value={plan.task.title} maxLength={MAX_TASK} aria-invalid={problem === 'task' || undefined}
              onChange={e => onChange({ ...plan, task: { title: e.target.value } })} style={input} />
          </div>
        )}
      </div>
    </div>
  )
}

function Include({ id, checked, label: text, onChange }: { id: string; checked: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <label htmlFor={id} style={{
      display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer',
      fontFamily: font, fontSize: '14px', fontWeight: 700, color: colors.text.primary,
    }}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 20, height: 20, margin: 0, accentColor: 'var(--my-accent)', flexShrink: 0 }} />
      {text}
    </label>
  )
}

/** Después de "Listo": una celebración breve arriba de Mi día. */
export function OnboardingCelebration({ onClose }: { onClose: () => void }) {
  const o = useLifeT().onboarding
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }) }, [])
  return (
    <motion.section ref={ref} tabIndex={-1} role="status" aria-labelledby="life-ob-done"
      initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
      style={{
        ...card, display: 'flex', alignItems: 'flex-start', gap: 12, outline: 'none',
        background: colors.accent.soft, borderColor: colors.accent.default,
      }}>
      <motion.span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0, marginTop: 2 }}
        initial={reduce ? false : { scale: 0.4, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 14, delay: 0.1 }}>
        <Sparkles size={22} style={{ color: colors.accent.ink }} />
      </motion.span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 id="life-ob-done" style={{ fontFamily: font, fontSize: '16px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>{o.celebrateTitle}</h2>
        <p style={{ ...muted, margin: '4px 0 0', fontSize: '13px' }}>{o.celebrateText}</p>
      </div>
      <button type="button" onClick={onClose} aria-label={o.celebrateClose}
        style={{
          width: 44, height: 44, marginBlockStart: -10, marginInlineEnd: -8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', color: colors.text.tertiary, cursor: 'pointer',
        }}>
        <X size={16} aria-hidden="true" />
      </button>
    </motion.section>
  )
}
