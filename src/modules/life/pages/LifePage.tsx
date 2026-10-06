import { createElement, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Link2, Settings2, ChevronRight, Globe, Settings, Plus, Check, AlertCircle } from 'lucide-react'
import { useLifeT, type LifeDict } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { formatMoney as fmtMoney } from '@/lib/currencies'
import { LanguageSheet } from '../components/LanguageSheet'
import { TaskSheet } from '../components/TaskSheet'
import { TaskList } from '../components/TasksView'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { useActiveGoals } from '../hooks/useActiveGoals'
import { useTasks, localDateKey, type LifeTask } from '../hooks/useTasks'
import { useHabits } from '../hooks/useHabits'
import { useMoney } from '../hooks/useMoney'
import { useToday } from '../hooks/useToday'
import { getHabitIcon } from '../lib/lifePalette'
import { useInsights } from '../hooks/useInsights'
import { InsightCard } from '../components/InsightCard'
import { colors, font, radius, fadeInUp, stagger } from '../design-system'
import { FEATURES } from '@/lib/features'

// ── Deterministic starfield ───────────────────────────────────────────────────

function lcg(s: number) { return ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0 }

const STARS = (() => {
  const out: { x: number; y: number; r: number; o: number }[] = []
  let s = 0x2a3b4c5d
  for (let i = 0; i < 72; i++) {
    s = lcg(s); const x = (s % 1000) / 10
    s = lcg(s); const y = (s % 1000) / 10
    s = lcg(s); const r = 0.5 + (s % 16) / 16
    s = lcg(s); const o = 0.07 + (s % 36) / 100
    out.push({ x, y, r, o })
  }
  return out
})()

// ── Helpers ───────────────────────────────────────────────────────────────────

function greet(t: LifeDict) {
  const h = new Date().getHours()
  return h < 12 ? t.home.greetMorning : h < 20 ? t.home.greetAfternoon : t.home.greetEvening
}

function getInitials(user: { user_metadata?: Record<string, unknown>; email?: string } | null) {
  if (!user) return '?'
  const raw = (user.user_metadata?.['name'] as string | undefined) ?? user.email ?? ''
  const parts = raw.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

function getFirstName(user: { user_metadata?: Record<string, unknown>; email?: string } | null) {
  if (!user) return ''
  const raw = (user.user_metadata?.['name'] as string | undefined) ?? user.email ?? ''
  return raw.trim().split(/\s+/)[0] ?? ''
}

function getAvatarUrl(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null
  const m = user.user_metadata ?? {}
  return (m['avatar_url'] as string | undefined) ?? (m['picture'] as string | undefined) ?? null
}

// ── Insight destacado ────────────────────────────────────────────────────────

function InsightTeaser() {
  const t = useLifeT()
  const { insights } = useInsights()
  // Las vencidas ya se ven en la tarjeta de tareas: destacamos otro insight
  const featured = insights.find(i => i.kind !== 'tasksOverdue')
  if (!featured) return null
  return (
    <motion.section variants={fadeInUp} style={cardStyle} aria-label={t.insights.title}>
      <CardHeader title={t.insights.title} color={colors.accent.default} />
      <InsightCard insight={featured} compact />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SeeAllLink to="/life/insights" label={insights.length > 1 ? `${t.insights.seeAll} · ${insights.length}` : t.insights.seeAll} />
      </div>
    </motion.section>
  )
}

// ── StarfieldBackground ───────────────────────────────────────────────────────

function StarfieldBackground() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
      background: 'radial-gradient(ellipse 110% 60% at 50% 0%, rgba(99,102,241,0.09) 0%, transparent 65%), #0A0B0F',
    }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {STARS.map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.r * 0.11} fill="white" opacity={st.o} />
        ))}
      </svg>
      <div style={{
        position: 'absolute',
        top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '420px', height: '320px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(244,112,90,0.05) 0%, transparent 68%)',
      }} />
    </div>
  )
}

// ── HubSection ────────────────────────────────────────────────────────────────

interface HubSectionProps {
  hasRestaurant: boolean
  restaurantSlug: string | null
  avatarUrl: string | null
  initials: string
}

function HubSection({ hasRestaurant, restaurantSlug, avatarUrl, initials }: HubSectionProps) {
  const navigate = useNavigate()
  const t = useLifeT()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      background: 'rgba(99,102,241,0.04)',
      border: '1px solid rgba(99,102,241,0.11)',
      borderRadius: radius.xl,
      padding: '14px 16px 14px 14px',
    }}>

      {/* LEFT — orb with profile photo */}
      <motion.div
        animate={{ scale: [1, 1.016, 1] }}
        transition={{ duration: 5.0, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: 130, height: 130,
          borderRadius: '50%',
          flexShrink: 0,
          background: 'radial-gradient(circle at 36% 32%, #5C60C0 0%, #3730A3 32%, #1E1B4B 65%, #0E0D1F 100%)',
          boxShadow: '0 0 38px rgba(99,102,241,0.30), 0 0 88px rgba(99,102,241,0.09), 0 14px 36px rgba(0,0,0,0.52)',
          overflow: 'hidden',
        }}
      >
        {/* Rotating shimmer */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%', zIndex: 1,
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.024) 20%, transparent 40%, rgba(255,255,255,0.013) 65%, transparent 80%)',
          }}
        />
        {/* Specular highlight */}
        <div style={{
          position: 'absolute', top: '8%', left: '12%',
          width: '44%', height: '42%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.11) 0%, transparent 70%)',
          zIndex: 2, pointerEvents: 'none',
        }} />
        {/* Bottom inner glow */}
        <div style={{
          position: 'absolute', bottom: '-6%', left: '20%',
          width: '58%', height: '46%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.24) 0%, transparent 70%)',
          zIndex: 2, pointerEvents: 'none',
        }} />
        {/* Profile photo / initials */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{
                width: '68%', height: '68%',
                borderRadius: '50%', objectFit: 'cover',
                border: '2.5px solid rgba(255,255,255,0.18)',
                boxShadow: '0 2px 14px rgba(0,0,0,0.45)',
              }}
            />
          ) : (
            <div style={{
              width: '64%', height: '64%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(244,112,90,0.85) 0%, rgba(139,92,246,0.85) 100%)',
              border: '2.5px solid rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: font, fontSize: '22px', fontWeight: 800, color: '#fff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.38)',
            }}>
              {initials}
            </div>
          )}
        </div>
      </motion.div>

      {/* RIGHT — title + subtitle + buttons */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: font, fontSize: '15px', fontWeight: 700,
          color: colors.text.primary, margin: '0 0 2px', letterSpacing: '-0.01em',
        }}>
          {t.home.identityTitle}
        </p>
        <p style={{
          fontFamily: font, fontSize: '12px', color: colors.text.tertiary,
          margin: '0 0 13px', lineHeight: 1.4,
        }}>
          {hasRestaurant && restaurantSlug ? `Mycen Identity · @${restaurantSlug}` : t.home.identitySubtitle}
        </p>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {/* Mycen Studio: editar la identidad (si no hay perfil, Studio ofrece crearlo) */}
          <button
            type="button"
            onClick={() => navigate('/studio')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '8px 14px', borderRadius: radius.full,
              background: '#F1F0E9', border: '1px solid #F1F0E9',
              color: '#111311', fontFamily: font, fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Settings2 size={12} strokeWidth={2.5} />
            {t.home.openStudio}
          </button>
          {hasRestaurant && restaurantSlug && (
            <button
              type="button"
              onClick={() => navigate(`/${restaurantSlug}`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '8px 12px', borderRadius: radius.full,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border.subtle}`,
                color: colors.text.tertiary, fontFamily: font, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Link2 size={11} strokeWidth={2.5} />
              {t.home.viewProfile}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tarjetas de "Tu día" ─────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  position: 'relative', overflow: 'hidden',
  background: 'rgba(255,255,255,0.028)',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: radius.xl,
  padding: '12px 14px',
}

const cardTitle: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.09em', textTransform: 'uppercase', margin: 0,
}

const mutedText: React.CSSProperties = { fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: '6px 0 2px', lineHeight: 1.5 }

const linkBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 2, minHeight: 32, padding: '4px 0',
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.text.secondary,
}

function CardHeader({ title, color, action }: { title: string; color: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 }}>
      <h2 style={{ ...cardTitle, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
        {title}
      </h2>
      {action}
    </div>
  )
}

function SeeAllLink({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(to)} style={linkBtn}>
      {label}<ChevronRight size={13} className="flip-rtl" aria-hidden="true" />
    </button>
  )
}

function SeeAll({ to }: { to: string }) {
  return <SeeAllLink to={to} label={useLifeT().day.seeAll} />
}

/** Tareas del día: foco, las que vencen hoy y las que ya completaste hoy. */
function TodayTasksCard() {
  const t = useLifeT()
  const navigate = useNavigate()
  const today = useToday()
  const { tasks, error, createTask, updateTask, toggleTask, setFocus } = useTasks()
  const [sheet, setSheet] = useState<{ open: boolean; task: LifeTask | null }>({ open: false, task: null })

  const { list, overdue } = useMemo(() => {
    const doneToday = (x: LifeTask) => !!x.completed_at && localDateKey(new Date(x.completed_at)) === today
    const pending = tasks.filter(x => !x.completed_at)
    const focus = pending.filter(x => x.is_focus)
    const dueToday = pending.filter(x => !x.is_focus && x.due_date === today)
      .sort((a, b) => (a.due_time ?? '99').localeCompare(b.due_time ?? '99'))
    return {
      list: [...focus, ...dueToday, ...tasks.filter(doneToday)],
      overdue: pending.filter(x => x.due_date && x.due_date < today).length,
    }
  }, [tasks, today])

  const fail = () => toast.error(t.common.saveError)
  const shown = list.slice(0, 6)

  return (
    <section style={cardStyle} aria-label={t.day.tasksTitle}>
      <div>
        <CardHeader title={t.day.tasksTitle} color={colors.area.brain} action={
          <button type="button" onClick={() => setSheet({ open: true, task: null })} aria-label={t.day.addTask} title={t.day.addTask}
            style={{
              width: 36, height: 36, borderRadius: radius.full, border: `1px solid ${colors.accent.soft}`, cursor: 'pointer',
              background: colors.accent.soft, color: colors.accent.default,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        } />
      </div>
      {error ? <p role="alert" style={{ ...mutedText, color: colors.semantic.error }}>{t.day.loadError}</p>
        : shown.length === 0 ? <p style={mutedText}>{t.day.noTasksToday}</p>
          : <TaskList tasks={shown} markFocus
              onToggle={x => { toggleTask(x).catch(fail) }}
              onEdit={x => setSheet({ open: true, task: x })}
              onFocus={x => { setFocus(x, !x.is_focus).catch(fail) }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
        {overdue > 0 ? (
          <button type="button" onClick={() => navigate('/life/brain?vista=tareas')}
            style={{ ...linkBtn, color: colors.semantic.error }}>
            <AlertCircle size={13} aria-hidden="true" style={{ marginInlineEnd: 4 }} />{t.tasks.overdue} · {overdue}
          </button>
        ) : <span />}
        <SeeAll to="/life/brain?vista=tareas" />
      </div>
      <TaskSheet open={sheet.open} initial={sheet.task} defaultDate={sheet.task ? null : today}
        onClose={() => setSheet(s => ({ ...s, open: false }))}
        onSave={data => (sheet.task ? updateTask(sheet.task.id, data) : createTask(data))} />
    </section>
  )
}

/** Hábitos programados para hoy, para tildar desde el inicio. */
function TodayHabitsCard() {
  const t = useLifeT()
  const navigate = useNavigate()
  const { activeHabits, todayHabits, completedToday, error, toggleToday } = useHabits()

  return (
    <section style={cardStyle} aria-label={t.day.habitsTitle}>
      <CardHeader title={t.day.habitsTitle} color={colors.area.habits} action={
        todayHabits.length > 0
          ? <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.text.secondary }}>{completedToday}/{todayHabits.length}</span>
          : undefined
      } />
      {error ? <p role="alert" style={{ ...mutedText, color: colors.semantic.error }}>{t.day.loadError}</p>
        : activeHabits.length === 0 ? (
          <>
            <p style={mutedText}>{t.day.noHabits}</p>
            <button type="button" onClick={() => navigate('/life/habits')} style={{ ...linkBtn, color: colors.area.habits }}>{t.day.createHabit}</button>
          </>
        ) : todayHabits.length === 0 ? <p style={mutedText}>{t.day.noHabitsToday}</p> : (
          <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, display: 'flex', flexDirection: 'column' }}>
            {todayHabits.map((h, i) => (
              <li key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', borderTop: i ? `1px solid ${colors.border.subtle}` : 'none' }}>
                <span aria-hidden="true" style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${h.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {createElement(getHabitIcon(h.icon), { size: 15, style: { color: h.color }, strokeWidth: 2.2 })}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontFamily: font, fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: h.completedToday ? colors.text.secondary : colors.text.primary,
                  }}>{h.name}</span>
                  {h.streak > 0 && <span style={{ display: 'block', fontFamily: font, fontSize: '11.5px', color: colors.text.tertiary }}>{t.habits.streak(h.streak)}</span>}
                </span>
                <button type="button" role="checkbox" aria-checked={h.completedToday}
                  aria-label={h.completedToday ? t.habits.unmarkToday(h.name) : t.habits.markToday(h.name)}
                  onClick={() => { toggleToday(h.id, !h.completedToday).catch(() => toast.error(t.common.saveError)) }}
                  style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <span aria-hidden="true" style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `2px solid ${h.completedToday ? h.color : colors.border.medium}`,
                    background: h.completedToday ? h.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s',
                  }}>
                    {h.completedToday && <Check size={15} strokeWidth={3} style={{ color: '#fff' }} />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      {activeHabits.length > 0 && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SeeAll to="/life/habits" /></div>}
    </section>
  )
}

function GoalsCard() {
  const t = useLifeT()
  const navigate = useNavigate()
  const { goals, total, error } = useActiveGoals(3)

  return (
    <section style={cardStyle} aria-label={t.day.goalsTitle}>
      <CardHeader title={total > 0 ? `${t.day.goalsTitle} · ${total}` : t.day.goalsTitle} color={colors.area.goals} />
      {error ? <p role="alert" style={{ ...mutedText, color: colors.semantic.error }}>{t.day.loadError}</p>
        : goals.length === 0 ? (
          <>
            <p style={mutedText}>{t.day.noGoals}</p>
            <button type="button" onClick={() => navigate('/life/goals')} style={{ ...linkBtn, color: colors.area.goals }}>{t.day.createGoal}</button>
          </>
        ) : (
          <>
            <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {goals.map(g => (
                <li key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                    <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: g.color, flexShrink: 0 }}>{g.progress}%</span>
                  </div>
                  <div role="progressbar" aria-label={g.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.progress}
                    style={{ height: 6, borderRadius: radius.full, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${g.progress}%`, height: '100%', borderRadius: radius.full, background: g.color }} />
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}><SeeAll to="/life/goals" /></div>
          </>
        )}
    </section>
  )
}

/** Resumen del mes en la moneda principal; las otras monedas se muestran aparte (nunca se suman). */
function MoneyCard() {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const { monthIncome, monthExpense, monthBalance, otherTotals, mainCurrency, loading } = useMoney()
  const empty = monthIncome === 0 && monthExpense === 0 && otherTotals.length === 0

  return (
    <section style={cardStyle} aria-label={t.day.moneyTitle}>
      <CardHeader title={t.day.moneyTitle} color={colors.area.money} />
      {loading ? null : empty ? <p style={mutedText}>{t.day.noMoney}</p> : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary }}>{t.day.balance}</span>
            <span style={{ fontFamily: font, fontSize: '22px', fontWeight: 800, color: monthBalance < 0 ? colors.semantic.error : colors.text.primary }}>
              {fmtMoney(monthBalance, mainCurrency, locale)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4, fontFamily: font, fontSize: '12.5px', color: colors.text.secondary, flexWrap: 'wrap' }}>
            <span>{t.money.income} <strong style={{ color: colors.semantic.success }}>{fmtMoney(monthIncome, mainCurrency, locale)}</strong></span>
            <span>{t.money.expense} <strong style={{ color: colors.text.primary }}>{fmtMoney(monthExpense, mainCurrency, locale)}</strong></span>
          </div>
          {otherTotals.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: '8px 0 0', borderTop: `1px solid ${colors.border.subtle}` }}>
              {otherTotals.map(r => (
                <li key={r.currency} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: font, fontSize: '12.5px', color: colors.text.secondary, padding: '2px 0' }}>
                  <span>{r.currency}</span>
                  <span style={{ color: r.balance < 0 ? colors.semantic.error : colors.text.primary, fontWeight: 600 }}>{fmtMoney(r.balance, r.currency, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}><SeeAll to="/life/money" /></div>
    </section>
  )
}

const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: radius.full, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border.subtle}`,
  color: colors.text.secondary, cursor: 'pointer',
}

// ── LifePage ──────────────────────────────────────────────────────────────────

export function LifePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { hasRestaurant, restaurantSlug, restaurantPlan } = useLifeStore()
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const today = useToday()
  const [langOpen, setLangOpen] = useState(false)

  const firstName = getFirstName(user)
  const initials  = getInitials(user)
  const avatarUrl = getAvatarUrl(user)
  const rawDate = new Date(`${today}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1)

  return (
    <>
      <StarfieldBackground />
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: '480px', margin: '0 auto',
        padding: `calc(env(safe-area-inset-top) + 14px) 16px 24px`,
      }}>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <motion.div variants={fadeInUp} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0 2px',
          }}>
            {/* La foto de perfil se muestra una sola vez: en la tarjeta "Mi identidad" */}
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: font, fontSize: '11px', color: colors.text.tertiary,
                margin: '0 0 1px', letterSpacing: '0.02em',
              }}>
                {greet(t)}
              </p>
              <p style={{
                fontFamily: font, fontSize: '17px', fontWeight: 700,
                color: colors.text.primary, margin: 0,
              }}>
                {firstName}
              </p>
            </div>
            {(FEATURES.businessInLife || (restaurantPlan?.startsWith('os_') ?? false)) && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '5px 11px', borderRadius: radius.full,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border.subtle}`,
                  color: colors.text.tertiary, fontFamily: font, fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t.home.myBusiness}
              </button>
            )}
            <button type="button" onClick={() => setLangOpen(true)} aria-label={t.home.language} title={t.home.language}
              style={iconBtn}>
              <Globe size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => navigate('/life/settings')} aria-label={t.home.settings} title={t.home.settings}
              style={iconBtn}>
              <Settings size={16} aria-hidden="true" />
            </button>
          </motion.div>

          {/* ── Tu día ─────────────────────────────────────────────────────── */}
          <motion.div variants={fadeInUp} style={{ padding: '6px 2px 0' }}>
            <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
              {t.day.yourDay}
            </h1>
            <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.tertiary, margin: '2px 0 0' }}>{dateLabel}</p>
          </motion.div>
          <motion.div variants={fadeInUp}><TodayTasksCard /></motion.div>
          <motion.div variants={fadeInUp}><TodayHabitsCard /></motion.div>
          <motion.div variants={fadeInUp}><GoalsCard /></motion.div>
          <motion.div variants={fadeInUp}><MoneyCard /></motion.div>
          {FEATURES.lifeInsights && <InsightTeaser />}

          {/* ── Mi identidad (Mycen Identity → Studio) ──────────────────────── */}
          <motion.div variants={fadeInUp}>
            <HubSection
              hasRestaurant={hasRestaurant}
              restaurantSlug={restaurantSlug}
              avatarUrl={avatarUrl}
              initials={initials}
            />
          </motion.div>

          {/* ── Recap del mes ───────────────────────────────────────────────── */}
          {FEATURES.lifeReplay && (
            <motion.div variants={fadeInUp} style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => navigate('/life/replay')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  minHeight: 36, padding: '7px 16px', borderRadius: radius.full,
                  background: 'rgba(244,112,90,0.07)', border: `1px solid ${colors.accent.glow}`,
                  color: colors.accent.default, fontFamily: font, fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.01em',
                }}
              >
                {t.home.recap}
              </button>
            </motion.div>
          )}

        </motion.div>
      </div>
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
    </>
  )
}
