import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Flame, Target, Wallet, Zap, Trophy, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { colors, font, radius } from '../design-system'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReplaySummary {
  monthLabel: string
  habitsDone: number
  habitsTotal: number
  habitsBestStreak: number
  topHabitName: string | null
  goalsCompleted: number
  goalsActive: number
  avgGoalProgress: number
  monthIncome: number
  monthExpense: number
  monthBalance: number
  ideasCount: number
  notesCount: number
  tasksCompleted: number
  achievementsCount: number
  lifeScore: number | null
}

// ── Data generation ───────────────────────────────────────────────────────────
async function generateReplay(userId: string, year: number, month: number): Promise<ReplaySummary> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStart = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${pad(month)}-${pad(lastDay)}`

  const [habitsRes, logsRes, goalsRes, txRes, brainRes, achievementsRes, scoreRes] = await Promise.all([
    db.from('life_habits').select('id,name').eq('user_id', userId).eq('is_active', true),
    db.from('life_habit_logs').select('habit_id,completed_date').eq('user_id', userId)
      .gte('completed_date', monthStart).lte('completed_date', monthEnd),
    db.from('life_goals').select('status,progress,name').eq('user_id', userId),
    db.from('life_transactions').select('type,amount').eq('user_id', userId)
      .gte('occurred_at', monthStart + 'T00:00:00').lte('occurred_at', monthEnd + 'T23:59:59'),
    db.from('life_brain_items').select('type,is_completed').eq('user_id', userId)
      .gte('created_at', monthStart + 'T00:00:00').lte('created_at', monthEnd + 'T23:59:59'),
    db.from('life_achievements').select('id').eq('user_id', userId)
      .gte('achieved_at', monthStart + 'T00:00:00').lte('achieved_at', monthEnd + 'T23:59:59'),
    db.from('life_score').select('score').eq('user_id', userId).maybeSingle(),
  ])

  const habits: { id: string; name: string }[] = habitsRes.data ?? []
  const logs: { habit_id: string; completed_date: string }[] = logsRes.data ?? []
  const goals: { status: string; progress: number; name: string }[] = goalsRes.data ?? []
  const txs: { type: string; amount: string }[] = txRes.data ?? []
  const brainItems: { type: string; is_completed: boolean }[] = brainRes.data ?? []
  const achievements: { id: string }[] = achievementsRes.data ?? []

  // Habit stats
  const habitsDone = new Set(logs.map(l => l.habit_id)).size
  // Per-habit log count (for best streak proxy)
  const logsByHabit: Record<string, number> = {}
  logs.forEach(l => { logsByHabit[l.habit_id] = (logsByHabit[l.habit_id] ?? 0) + 1 })
  const topEntry = Object.entries(logsByHabit).sort((a, b) => b[1] - a[1])[0]
  const topHabitId = topEntry?.[0]
  const topHabitName = topHabitId ? (habits.find(h => h.id === topHabitId)?.name ?? null) : null
  const habitsBestStreak = topEntry?.[1] ?? 0

  // Goal stats
  const completed = goals.filter(g => g.status === 'completed')
  const active    = goals.filter(g => g.status === 'in_progress')
  const avgGoalProgress = active.length > 0
    ? Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length)
    : 0

  // Money
  const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Brain
  const ideasCount    = brainItems.filter(i => i.type === 'idea').length
  const notesCount    = brainItems.filter(i => i.type === 'note').length
  const tasksCompleted = brainItems.filter(i => i.type === 'task' && i.is_completed).length

  const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const monthLabel = `${MONTHS_ES[month - 1]} ${year}`

  const summary: ReplaySummary = {
    monthLabel,
    habitsDone, habitsTotal: habits.length, habitsBestStreak, topHabitName,
    goalsCompleted: completed.length, goalsActive: active.length, avgGoalProgress,
    monthIncome: income, monthExpense: expense, monthBalance: income - expense,
    ideasCount, notesCount, tasksCompleted,
    achievementsCount: achievements.length,
    lifeScore: scoreRes.data?.score ?? null,
  }

  // Cache in life_snapshots (upsert)
  await db.from('life_snapshots').upsert(
    { user_id: userId, period_type: 'month', period_date: monthStart, summary },
    { onConflict: 'user_id,period_type,period_date' }
  )

  return summary
}

// ── Story Card ────────────────────────────────────────────────────────────────
function StoryCard({
  gradient, children, index, total,
}: {
  gradient: string
  children: React.ReactNode
  index: number
  total: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20%' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
      style={{
        minHeight: '78vh',
        borderRadius: radius['2xl'],
        background: gradient,
        padding: '36px 28px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 2.5, borderRadius: '2px',
            background: i <= index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </div>
      {children}
    </motion.div>
  )
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <p style={{ fontFamily: font, fontSize: '64px', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontFamily: font, fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '6px 0 0' }}>
        {label}
      </p>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <span style={{ fontFamily: font, fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: font, fontSize: '14px', color: '#fff', fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function CardIcon({ icon: Icon }: { icon: typeof Flame }) {
  return (
    <div style={{ width: 52, height: 52, borderRadius: '18px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={26} style={{ color: '#fff' }} strokeWidth={1.8} />
    </div>
  )
}

function formatMoney(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}k`
  return `$${Math.round(abs).toLocaleString('es')}`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ReplaySkeleton() {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        {[{ h: '78vh' }, { h: '78vh' }].map(({ h }, i) => (
          <div key={i} style={{ height: h, background: colors.surface.base, borderRadius: radius['2xl'], marginBottom: '12px' }} />
        ))}
      </motion.div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function LifeReplayPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<ReplaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const now = new Date()
      const result = await generateReplay(user.id, now.getFullYear(), now.getMonth() + 1)
      setSummary(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  if (loading) return <ReplaySkeleton />

  if (error || !summary) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <p style={{ fontFamily: font, color: colors.text.tertiary, fontSize: '14px' }}>
          No se pudo generar el recap. Intentá de nuevo.
        </p>
      </div>
    )
  }

  const TOTAL = 6
  const hasData = summary.habitsDone > 0 || summary.goalsCompleted > 0 || summary.monthBalance !== 0 || summary.tasksCompleted > 0

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>

        {/* Back button */}
        <div style={{ paddingTop: '20px', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/life')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderRadius: radius.full,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border.subtle}`,
              color: colors.text.secondary, fontFamily: font, fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Volver
          </button>
        </div>

        {!hasData ? (
          /* Not enough data */
          <div style={{
            minHeight: '70vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px',
          }}>
            <div style={{ width: 72, height: 72, borderRadius: '24px', background: `${colors.accent.default}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Star size={32} style={{ color: colors.accent.default }} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontFamily: font, fontSize: '22px', fontWeight: 800, color: colors.text.primary, margin: '0 0 10px' }}>
              Tu historia se está escribiendo
            </h2>
            <p style={{ fontFamily: font, fontSize: '14px', color: colors.text.tertiary, lineHeight: 1.7, margin: 0 }}>
              Seguí usando Life OS este mes — hábitos, metas, dinero y Brain — y acá vas a ver tu replay personal.
            </p>
          </div>
        ) : (
          <>
            {/* Card 0 — Cover */}
            <StoryCard gradient="linear-gradient(145deg, #1A0D2E 0%, #2D1B4E 50%, #1E1040 100%)" index={0} total={TOTAL}>
              <div>
                <p style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  TU MES EN REVIEW
                </p>
                <h1 style={{ fontFamily: font, fontSize: '36px', fontWeight: 800, color: '#fff', margin: '0 0 6px', textTransform: 'capitalize' }}>
                  {summary.monthLabel}
                </h1>
              </div>
              <div>
                {summary.lifeScore !== null && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontFamily: font, fontSize: '80px', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1 }}>
                      {summary.lifeScore}
                    </p>
                    <p style={{ fontFamily: font, fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: '4px 0 0', fontWeight: 600 }}>
                      Life Score final
                    </p>
                  </div>
                )}
                <p style={{ fontFamily: font, fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  Deslizá para ver tu recap ↓
                </p>
              </div>
            </StoryCard>

            {/* Card 1 — Habits */}
            <StoryCard gradient="linear-gradient(145deg, #1A1000 0%, #3D2600 50%, #291A00 100%)" index={1} total={TOTAL}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <CardIcon icon={Flame} />
                <div>
                  <p style={{ fontFamily: font, fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>HÁBITOS</p>
                  <p style={{ fontFamily: font, fontSize: '20px', color: '#fff', fontWeight: 800, margin: 0 }}>Consistencia</p>
                </div>
              </div>
              <div>
                <BigStat
                  value={summary.habitsTotal > 0
                    ? `${Math.round((summary.habitsDone / summary.habitsTotal) * 100)}%`
                    : '—'
                  }
                  label={`${summary.habitsDone} hábitos completados este mes`}
                />
                {summary.topHabitName && (
                  <div style={{ marginTop: '24px' }}>
                    <StatRow label="Más constante" value={summary.topHabitName} />
                    <StatRow label="Racha más larga" value={`${summary.habitsBestStreak} días`} />
                  </div>
                )}
              </div>
            </StoryCard>

            {/* Card 2 — Goals */}
            <StoryCard gradient="linear-gradient(145deg, #001020 0%, #001D3D 50%, #00142B 100%)" index={2} total={TOTAL}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <CardIcon icon={Target} />
                <div>
                  <p style={{ fontFamily: font, fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>METAS</p>
                  <p style={{ fontFamily: font, fontSize: '20px', color: '#fff', fontWeight: 800, margin: 0 }}>Objetivos</p>
                </div>
              </div>
              <div>
                <BigStat
                  value={String(summary.goalsCompleted)}
                  label={`meta${summary.goalsCompleted !== 1 ? 's' : ''} completada${summary.goalsCompleted !== 1 ? 's' : ''}`}
                />
                <div style={{ marginTop: '24px' }}>
                  <StatRow label="En progreso" value={summary.goalsActive} />
                  <StatRow label="Progreso promedio" value={`${summary.avgGoalProgress}%`} />
                </div>
              </div>
            </StoryCard>

            {/* Card 3 — Money */}
            <StoryCard
              gradient={summary.monthBalance >= 0
                ? 'linear-gradient(145deg, #001A0A 0%, #00381A 50%, #002610 100%)'
                : 'linear-gradient(145deg, #1A0000 0%, #380000 50%, #260000 100%)'
              }
              index={3} total={TOTAL}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <CardIcon icon={Wallet} />
                <div>
                  <p style={{ fontFamily: font, fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>DINERO</p>
                  <p style={{ fontFamily: font, fontSize: '20px', color: '#fff', fontWeight: 800, margin: 0 }}>Finanzas del mes</p>
                </div>
              </div>
              <div>
                <BigStat
                  value={(summary.monthBalance >= 0 ? '+' : '-') + formatMoney(summary.monthBalance)}
                  label={summary.monthBalance >= 0 ? 'balance positivo ✦' : 'balance negativo'}
                />
                <div style={{ marginTop: '24px' }}>
                  <StatRow label="Ingresos" value={'+' + formatMoney(summary.monthIncome)} />
                  <StatRow label="Gastos"   value={'-' + formatMoney(summary.monthExpense)} />
                </div>
              </div>
            </StoryCard>

            {/* Card 4 — Brain */}
            <StoryCard gradient="linear-gradient(145deg, #0A0014 0%, #1E0038 50%, #140020 100%)" index={4} total={TOTAL}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <CardIcon icon={Zap} />
                <div>
                  <p style={{ fontFamily: font, fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>BRAIN</p>
                  <p style={{ fontFamily: font, fontSize: '20px', color: '#fff', fontWeight: 800, margin: 0 }}>Segunda mente</p>
                </div>
              </div>
              <div>
                <BigStat
                  value={String(summary.ideasCount + summary.notesCount + summary.tasksCompleted)}
                  label="capturas este mes"
                />
                <div style={{ marginTop: '24px' }}>
                  <StatRow label="Ideas guardadas"    value={summary.ideasCount} />
                  <StatRow label="Notas creadas"      value={summary.notesCount} />
                  <StatRow label="Tareas completadas" value={summary.tasksCompleted} />
                </div>
              </div>
            </StoryCard>

            {/* Card 5 — Achievements + close */}
            <StoryCard gradient="linear-gradient(145deg, #1A0F00 0%, #3D2600 40%, #2B1E00 100%)" index={5} total={TOTAL}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <CardIcon icon={Trophy} />
                <div>
                  <p style={{ fontFamily: font, fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>LOGROS</p>
                  <p style={{ fontFamily: font, fontSize: '20px', color: '#fff', fontWeight: 800, margin: 0 }}>Este mes</p>
                </div>
              </div>
              <div>
                <BigStat
                  value={String(summary.achievementsCount)}
                  label={`logro${summary.achievementsCount !== 1 ? 's' : ''} desbloqueado${summary.achievementsCount !== 1 ? 's' : ''}`}
                />
                <div style={{ marginTop: '32px', padding: '20px', borderRadius: radius.lg, background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <p style={{ fontFamily: font, fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                    Seguí construyendo
                  </p>
                  <p style={{ fontFamily: font, fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                    Cada acción cuenta. Tu próximo recap va a contar una historia aún mejor.
                  </p>
                </div>
              </div>
            </StoryCard>
          </>
        )}
      </div>
    </div>
  )
}
