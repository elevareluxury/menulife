import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Flame, Target, Wallet, Zap, Trophy, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLocaleStore } from '@/store/localeStore'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { colors, font, radius } from '../design-system'
import { dayKey } from '../hooks/useToday'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Datos del mes (todo con fechas reales del período) ───────────────────────

interface HabitRow { id: string; name: string; frequency: { days?: number[] } | null; created_at: string }

interface ReplaySummary {
  habitsScheduled: number
  habitsDone: number
  topHabitName: string | null
  longestStreak: number
  stepsDone: number
  activeGoals: number
  currency: string
  income: number
  expense: number
  otherCurrencies: string[]
  ideasCount: number
  notesCount: number
  tasksCompleted: number
  achievementsCount: number
}

function daysOfMonth(year: number, month: number, until: string): string[] {
  const out: string[] = []
  for (let d = new Date(year, month - 1, 1); d.getMonth() === month - 1; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d)
    if (k > until) break
    out.push(k)
  }
  return out
}

const weekday = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getDay() }

async function generateReplay(userId: string, year: number, month: number, mainCurrency: string): Promise<ReplaySummary> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const firstDay = `${year}-${pad(month)}-01`
  const nextFirst = new Date(year, month, 1)
  const lastDay = dayKey(new Date(year, month, 0))
  const fromIso = new Date(year, month - 1, 1).toISOString()
  const toIso = nextFirst.toISOString()
  const today = dayKey()

  const q = (table: string, cols: string) => db.from(table).select(cols).eq('user_id', userId)
  const [habitsRes, logsRes, stepsRes, goalsRes, txRes, brainRes, tasksRes, achRes] = await Promise.all([
    q('life_habits', 'id,name,frequency,created_at').eq('is_active', true),
    q('life_habit_logs', 'habit_id,completed_date').gte('completed_date', firstDay).lte('completed_date', lastDay),
    q('life_goal_milestones', 'id').gte('completed_at', fromIso).lt('completed_at', toIso),
    q('life_goals', 'id').eq('status', 'in_progress'),
    q('life_transactions', 'type,amount,currency').gte('occurred_at', fromIso).lt('occurred_at', toIso),
    q('life_brain_items', 'type').gte('created_at', fromIso).lt('created_at', toIso),
    q('life_tasks', 'id').gte('completed_at', fromIso).lt('completed_at', toIso),
    q('life_achievements', 'id').gte('achieved_at', fromIso).lt('achieved_at', toIso),
  ])
  const failed = [habitsRes, logsRes, stepsRes, goalsRes, txRes, brainRes, achRes].find(r => r.error)
  if (failed) throw failed.error

  // Hábitos: días programados del mes (desde que existe el hábito y hasta hoy) vs. días cumplidos
  const habits: HabitRow[] = habitsRes.data ?? []
  const logs: { habit_id: string; completed_date: string }[] = logsRes.data ?? []
  const days = daysOfMonth(year, month, today)
  let scheduledTotal = 0
  let doneTotal = 0
  let top: { name: string; rate: number; done: number } | null = null
  let longestStreak = 0
  for (const h of habits) {
    const sched = h.frequency?.days?.length ? h.frequency.days : [0, 1, 2, 3, 4, 5, 6]
    const since = dayKey(new Date(h.created_at))
    const done = new Set(logs.filter(l => l.habit_id === h.id).map(l => l.completed_date))
    let scheduled = 0
    let streak = 0
    for (const d of days) {
      if (d < since && !done.has(d)) continue
      const isSched = sched.includes(weekday(d))
      if (isSched) scheduled++
      if (done.has(d)) { streak++; longestStreak = Math.max(longestStreak, streak) }
      else if (isSched && d !== today) streak = 0
    }
    const doneCount = days.filter(d => done.has(d)).length
    scheduledTotal += scheduled
    doneTotal += Math.min(doneCount, scheduled || doneCount)
    if (doneCount > 0) {
      const rate = scheduled ? doneCount / scheduled : 1
      if (!top || rate > top.rate || (rate === top.rate && doneCount > top.done)) top = { name: h.name, rate, done: doneCount }
    }
  }

  // Dinero: sólo la moneda principal se suma; las demás se nombran
  const txs: { type: string; amount: string; currency: string | null }[] = txRes.data ?? []
  const main = txs.filter(t => (t.currency ?? mainCurrency) === mainCurrency)
  const income = main.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = main.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const otherCurrencies = [...new Set(txs.map(t => t.currency ?? mainCurrency).filter(c => c !== mainCurrency))]

  const brain: { type: string }[] = brainRes.data ?? []

  return {
    habitsScheduled: scheduledTotal,
    habitsDone: doneTotal,
    topHabitName: top?.name ?? null,
    longestStreak,
    stepsDone: (stepsRes.data ?? []).length,
    activeGoals: (goalsRes.data ?? []).length,
    currency: mainCurrency,
    income, expense, otherCurrencies,
    ideasCount: brain.filter(b => b.type === 'idea').length,
    notesCount: brain.filter(b => b.type === 'note').length,
    tasksCompleted: tasksRes.error ? 0 : (tasksRes.data ?? []).length,
    achievementsCount: (achRes.data ?? []).length,
  }
}

// ── Piezas visuales ───────────────────────────────────────────────────────────

function StoryCard({ gradient, children, index, total }: { gradient: string; children: React.ReactNode; index: number; total: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20%' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
      style={{
        minHeight: '72dvh', borderRadius: radius['2xl'], background: gradient, padding: '32px 24px', marginBottom: '12px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }} aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2.5, borderRadius: '2px', background: i <= index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)' }} />
        ))}
      </div>
      {children}
    </motion.section>
  )
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <p dir="ltr" style={{ fontFamily: font, fontSize: 'clamp(40px, 14vw, 64px)', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1, textAlign: 'start' }}>{value}</p>
      <p style={{ fontFamily: font, fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>{label}</p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <span style={{ fontFamily: font, fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: font, fontSize: '14px', color: '#fff', fontWeight: 700, textAlign: 'end' }}>{value}</span>
    </div>
  )
}

function CardHeader({ icon: Icon, kicker, title }: { icon: typeof Flame; kicker: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
      <div style={{ width: 52, height: 52, borderRadius: '18px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={26} style={{ color: '#fff' }} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div>
        <p style={{ fontFamily: font, fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' }}>{kicker}</p>
        <h2 style={{ fontFamily: font, fontSize: '20px', color: '#fff', fontWeight: 800, margin: 0 }}>{title}</h2>
      </div>
    </div>
  )
}

function ReplaySkeleton() {
  return (
    <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
      {[0, 1].map(i => <div key={i} style={{ height: '72dvh', background: colors.surface.base, borderRadius: radius['2xl'], marginBottom: '12px' }} />)}
    </motion.div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export function LifeReplayPage() {
  const navigate = useNavigate()
  const t = useLifeT()
  const r = t.replay
  const locale = langLocale(useAppLang(s => s.lang))
  const currency = useLocaleStore(s => s.currency)
  const { user } = useAuthStore()
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [attempt, setAttempt] = useState(0)
  const key = `${cursor.y}-${cursor.m}-${currency}-${attempt}`
  const [result, setResult] = useState<{ key: string; summary: ReplaySummary | null; error: boolean } | null>(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    generateReplay(user.id, cursor.y, cursor.m, currency)
      .then(summary => { if (alive) setResult({ key, summary, error: false }) })
      .catch(() => { if (alive) setResult({ key, summary: null, error: true }) })
    return () => { alive = false }
  }, [user, cursor, currency, key])

  const loading = result?.key !== key
  const summary = result?.summary ?? null
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth() + 1
  const rawLabel = new Date(cursor.y, cursor.m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
  const shift = (delta: number) => setCursor(c => {
    const d = new Date(c.y, c.m - 1 + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() + 1 }
  })
  const money = (n: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, notation: Math.abs(n) >= 100000 ? 'compact' : 'standard', maximumFractionDigits: Math.abs(n) >= 100000 ? 1 : 0 }).format(n)
    } catch { return `${currency} ${Math.round(n)}` }
  }

  const navBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: radius.full, border: `1px solid ${colors.border.subtle}`, background: 'transparent',
    color: colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  const balance = summary ? summary.income - summary.expense : 0
  const hasData = !!summary && (
    summary.habitsDone > 0 || summary.stepsDone > 0 || summary.income > 0 || summary.expense > 0 ||
    summary.ideasCount > 0 || summary.notesCount > 0 || summary.tasksCompleted > 0 || summary.achievementsCount > 0 ||
    summary.otherCurrencies.length > 0
  )
  const TOTAL = 6

  return (
    <div style={{ background: colors.bg, paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{ paddingTop: '20px', paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <button type="button" onClick={() => navigate('/life')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', minHeight: 40, padding: '8px 12px', borderRadius: radius.full,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border.subtle}`,
              color: colors.text.secondary, fontFamily: font, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" className="flip-rtl" /> {r.back}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" style={navBtn} onClick={() => shift(-1)} aria-label={r.prevMonth}><ChevronLeft size={16} aria-hidden="true" className="flip-rtl" /></button>
            <span aria-live="polite" style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: colors.text.primary, minWidth: 120, textAlign: 'center' }}>{monthLabel}</span>
            <button type="button" style={{ ...navBtn, opacity: isCurrentMonth ? 0.35 : 1 }} disabled={isCurrentMonth}
              onClick={() => shift(1)} aria-label={r.nextMonth}><ChevronRight size={16} aria-hidden="true" className="flip-rtl" /></button>
          </div>
        </div>

        {loading ? <ReplaySkeleton /> : result?.error || !summary ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: font, color: colors.text.secondary, fontSize: '14px' }}>{r.error}</p>
            <button type="button" onClick={() => setAttempt(a => a + 1)}
              style={{ marginTop: 12, minHeight: 44, padding: '10px 20px', borderRadius: radius.full, border: `1px solid ${colors.border.medium}`, background: 'transparent', color: colors.text.primary, fontFamily: font, fontWeight: 600, cursor: 'pointer' }}>
              {r.retry}
            </button>
          </div>
        ) : !hasData ? (
          <div style={{ minHeight: '60dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '24px', background: `${colors.accent.default}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Star size={32} style={{ color: colors.accent.default }} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 style={{ fontFamily: font, fontSize: '22px', fontWeight: 800, color: colors.text.primary, margin: '0 0 10px' }}>{r.emptyTitle}</h2>
            <p style={{ fontFamily: font, fontSize: '14px', color: colors.text.secondary, lineHeight: 1.7, margin: 0 }}>{r.emptyText}</p>
          </div>
        ) : (
          <>
            <StoryCard gradient="linear-gradient(145deg, #1A0D2E 0%, #2D1B4E 50%, #1E1040 100%)" index={0} total={TOTAL}>
              <div>
                <p style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', margin: '0 0 8px', textTransform: 'uppercase' }}>{r.cover}</p>
                <h1 style={{ fontFamily: font, fontSize: '36px', fontWeight: 800, color: '#fff', margin: 0 }}>{monthLabel}</h1>
              </div>
              <p style={{ fontFamily: font, fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>{r.swipe}</p>
            </StoryCard>

            <StoryCard gradient="linear-gradient(145deg, #1A1000 0%, #3D2600 50%, #291A00 100%)" index={1} total={TOTAL}>
              <CardHeader icon={Flame} kicker={r.habits} title={r.habitsTitle} />
              <div>
                <BigStat value={summary.habitsScheduled > 0 ? `${Math.round((summary.habitsDone / summary.habitsScheduled) * 100)}%` : '—'} label={r.habitsRate} />
                <p style={{ fontFamily: font, fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: '12px 0 0' }}>{r.habitsDone(summary.habitsDone)}</p>
                {summary.topHabitName && (
                  <div style={{ marginTop: '24px' }}>
                    <StatRow label={r.mostConsistent} value={summary.topHabitName} />
                    <StatRow label={r.longestStreak} value={r.days(summary.longestStreak)} />
                  </div>
                )}
              </div>
            </StoryCard>

            <StoryCard gradient="linear-gradient(145deg, #001020 0%, #001D3D 50%, #00142B 100%)" index={2} total={TOTAL}>
              <CardHeader icon={Target} kicker={r.goals} title={r.goalsTitle} />
              <div>
                <BigStat value={String(summary.stepsDone)} label={r.stepsDone(summary.stepsDone)} />
                <div style={{ marginTop: '24px' }}>
                  <StatRow label={r.activeGoals} value={summary.activeGoals} />
                </div>
              </div>
            </StoryCard>

            <StoryCard
              gradient={balance >= 0
                ? 'linear-gradient(145deg, #001A0A 0%, #00381A 50%, #002610 100%)'
                : 'linear-gradient(145deg, #1A0000 0%, #380000 50%, #260000 100%)'}
              index={3} total={TOTAL}>
              <CardHeader icon={Wallet} kicker={r.money} title={r.moneyTitle} />
              <div>
                <BigStat value={money(balance)} label={`${balance >= 0 ? r.positive : r.negative} · ${summary.currency}`} />
                <div style={{ marginTop: '24px' }}>
                  <StatRow label={r.income} value={money(summary.income)} />
                  <StatRow label={r.expense} value={money(summary.expense)} />
                </div>
                {summary.otherCurrencies.length > 0 && (
                  <p style={{ fontFamily: font, fontSize: 12.5, color: 'rgba(255,255,255,0.6)', margin: '14px 0 0' }}>
                    {r.otherCurrencies(summary.otherCurrencies.join(', '))}
                  </p>
                )}
              </div>
            </StoryCard>

            <StoryCard gradient="linear-gradient(145deg, #0A0014 0%, #1E0038 50%, #140020 100%)" index={4} total={TOTAL}>
              <CardHeader icon={Zap} kicker={r.brain} title={r.brainTitle} />
              <div>
                <BigStat value={String(summary.ideasCount + summary.notesCount)} label={r.captures} />
                <div style={{ marginTop: '24px' }}>
                  <StatRow label={r.ideas} value={summary.ideasCount} />
                  <StatRow label={r.notes} value={summary.notesCount} />
                  <StatRow label={r.tasksDone} value={summary.tasksCompleted} />
                </div>
              </div>
            </StoryCard>

            <StoryCard gradient="linear-gradient(145deg, #1A0F00 0%, #3D2600 40%, #2B1E00 100%)" index={5} total={TOTAL}>
              <CardHeader icon={Trophy} kicker={r.achievements} title={r.achievementsTitle} />
              <div>
                <BigStat value={String(summary.achievementsCount)} label={r.unlocked(summary.achievementsCount)} />
                <div style={{ marginTop: '32px', padding: '20px', borderRadius: radius.lg, background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <p style={{ fontFamily: font, fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{r.keepGoing}</p>
                  <p style={{ fontFamily: font, fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>{r.keepGoingText}</p>
                </div>
              </div>
            </StoryCard>
          </>
        )}
      </div>
    </div>
  )
}
