import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Target, TrendingUp, CheckSquare, Brain,
  Link2, Settings2, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { useLocaleStore } from '@/store/localeStore'
import { useLifeData } from '../hooks/useLifeData'
import { colors, font, radius, fadeInUp, stagger } from '../design-system'

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

function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
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

// ── SVG Textures ──────────────────────────────────────────────────────────────

function WavesTexture() {
  return (
    <svg viewBox="0 0 120 70" fill="none" style={{
      position: 'absolute', bottom: 0, right: 0, width: '80%',
      opacity: 0.14, pointerEvents: 'none',
    }}>
      <path d="M0 55 Q30 38 60 50 Q90 62 120 48" stroke="#22C55E" strokeWidth="2" />
      <path d="M0 65 Q30 50 60 60 Q90 70 120 58" stroke="#22C55E" strokeWidth="1.5" />
      <path d="M0 45 Q30 28 60 40 Q90 52 120 38" stroke="#22C55E" strokeWidth="1" />
    </svg>
  )
}

function OrbitsTexture() {
  return (
    <svg viewBox="0 0 120 100" fill="none" style={{
      position: 'absolute', bottom: -8, right: -8, width: '70%',
      opacity: 0.14, pointerEvents: 'none',
    }}>
      <ellipse cx="85" cy="80" rx="52" ry="32" stroke="#3B82F6" strokeWidth="1.5" />
      <ellipse cx="85" cy="80" rx="34" ry="20" stroke="#3B82F6" strokeWidth="1" />
      <circle cx="85" cy="80" r="5" fill="#3B82F6" opacity="0.4" />
      <circle cx="118" cy="66" r="3" fill="#3B82F6" opacity="0.3" />
    </svg>
  )
}

function FlameTexture() {
  return (
    <svg viewBox="0 0 70 90" fill="none" style={{
      position: 'absolute', bottom: -4, right: 6, width: '42%',
      opacity: 0.15, pointerEvents: 'none',
    }}>
      <path d="M35 82 C18 68 8 50 18 34 C23 26 28 36 25 46 C36 32 44 12 34 2 C50 14 58 36 48 54 C56 46 58 32 54 24 C64 38 66 58 56 70 C51 77 43 82 35 82Z" fill="#F59E0B" />
    </svg>
  )
}

function NeuralTexture() {
  return (
    <svg viewBox="0 0 110 90" fill="none" style={{
      position: 'absolute', bottom: 0, right: 0, width: '72%',
      opacity: 0.13, pointerEvents: 'none',
    }}>
      <circle cx="85" cy="15" r="4" fill="#8B5CF6" />
      <circle cx="105" cy="42" r="3" fill="#8B5CF6" />
      <circle cx="90" cy="68" r="4" fill="#8B5CF6" />
      <circle cx="70" cy="82" r="3" fill="#8B5CF6" />
      <circle cx="104" cy="76" r="2.5" fill="#8B5CF6" />
      <line x1="85" y1="15" x2="105" y2="42" stroke="#8B5CF6" strokeWidth="1" />
      <line x1="105" y1="42" x2="90" y2="68" stroke="#8B5CF6" strokeWidth="1" />
      <line x1="90" y1="68" x2="70" y2="82" stroke="#8B5CF6" strokeWidth="1" />
      <line x1="90" y1="68" x2="104" y2="76" stroke="#8B5CF6" strokeWidth="1" />
      <line x1="85" y1="15" x2="90" y2="68" stroke="#8B5CF6" strokeWidth="0.5" opacity="0.5" />
      <line x1="105" y1="42" x2="104" y2="76" stroke="#8B5CF6" strokeWidth="0.5" opacity="0.5" />
    </svg>
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
      {/* Warm halo behind orb area */}
      <div style={{
        position: 'absolute',
        top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '420px', height: '320px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(244,112,90,0.05) 0%, transparent 68%)',
      }} />
    </div>
  )
}

// ── HoySummaryCard ────────────────────────────────────────────────────────────

interface HoyProps {
  goalsCount: number
  habitsCompleted: number
  habitsTotal: number
  moneyBalance: number
  pendingTasks: number
  currency: string
}

function HoySummaryCard({ goalsCount, habitsCompleted, habitsTotal, moneyBalance, pendingTasks, currency }: HoyProps) {
  const navigate = useNavigate()
  const formatMoney = (n: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

  const rows = [
    { icon: Target,      label: 'Metas',    value: `${goalsCount} en curso`,                    color: colors.area.goals,  route: '/life/goals'  },
    { icon: TrendingUp,  label: 'Dinero',   value: formatMoney(moneyBalance),                   color: colors.area.money,  route: '/life/money'  },
    { icon: CheckSquare, label: 'Hábitos',  value: `${habitsCompleted}/${habitsTotal} hoy`,     color: colors.area.habits, route: '/life/habits' },
    { icon: Brain,       label: 'Brain',    value: `${pendingTasks} pendientes`,                 color: colors.area.brain,  route: '/life/brain'  },
  ]

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'rgba(255,255,255,0.028)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: radius.xl,
      padding: '4px 0',
    }}>
      {/* Sunrise halo */}
      <div style={{
        position: 'absolute', top: '-40%', left: '-8%',
        width: '55%', height: '210%',
        background: 'radial-gradient(ellipse, rgba(251,146,60,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        padding: '11px 16px 5px',
        fontFamily: font, fontSize: '10px', fontWeight: 700,
        color: colors.text.tertiary, letterSpacing: '0.09em', textTransform: 'uppercase',
      }}>
        Hoy
      </div>

      {rows.map((row, i) => {
        const Icon = row.icon
        return (
          <button
            key={row.route}
            onClick={() => navigate(row.route)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '9px 16px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '8px', flexShrink: 0,
              background: `${row.color}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={13} style={{ color: row.color }} strokeWidth={2.3} />
            </div>
            <p style={{ flex: 1, fontFamily: font, fontSize: '13px', fontWeight: 600, color: colors.text.primary, margin: 0 }}>
              {row.label}
            </p>
            <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.secondary, margin: '0 4px 0 0' }}>
              {row.value}
            </p>
            <ChevronRight size={13} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
          </button>
        )
      })}
    </div>
  )
}

// ── HubOrb ────────────────────────────────────────────────────────────────────

interface HubOrbProps {
  restaurantName: string | null
  restaurantSlug: string | null
  hasRestaurant: boolean
}

function HubOrb({ restaurantName, restaurantSlug, hasRestaurant }: HubOrbProps) {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <motion.div
        animate={{ scale: [1, 1.026, 1] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative', width: 188, height: 188, borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 32%, #5C60C0 0%, #3730A3 32%, #1E1B4B 65%, #0E0D1F 100%)',
          boxShadow: '0 0 52px rgba(99,102,241,0.28), 0 0 130px rgba(99,102,241,0.09), 0 28px 64px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          cursor: hasRestaurant ? 'pointer' : 'default',
        }}
        onClick={() => { if (hasRestaurant) navigate('/dashboard') }}
      >
        {/* Rotating shimmer */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.032) 22%, transparent 42%, rgba(255,255,255,0.016) 68%, transparent 84%)',
          }}
        />
        {/* Specular highlight */}
        <div style={{
          position: 'absolute', top: '9%', left: '14%',
          width: '46%', height: '44%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.10) 0%, transparent 70%)',
        }} />
        {/* Inner depth glow */}
        <div style={{
          position: 'absolute', bottom: '-8%', left: '22%',
          width: '56%', height: '48%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)',
        }} />
      </motion.div>

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: font, fontSize: '17px', fontWeight: 700,
          color: colors.text.primary, margin: '0 0 3px', letterSpacing: '-0.01em',
        }}>
          {hasRestaurant ? (restaurantName ?? 'Mi negocio') : 'Hub Digital'}
        </p>
        <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: 0 }}>
          {hasRestaurant && restaurantSlug ? `@${restaurantSlug}` : 'Tu presencia en la web'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {hasRestaurant ? (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px', borderRadius: radius.full,
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                color: '#818CF8', fontFamily: font, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Link2 size={11} strokeWidth={2.5} /> Ver link
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px', borderRadius: radius.full,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border.subtle}`,
                color: colors.text.tertiary, fontFamily: font, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Settings2 size={11} strokeWidth={2.5} /> Configurar
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '7px 18px', borderRadius: radius.full,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
              color: '#818CF8', fontFamily: font, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Crear mi hub
          </button>
        )}
      </div>
    </div>
  )
}

// ── ModuleGrid ────────────────────────────────────────────────────────────────

const MODULES = [
  { id: 'money',  label: 'Dinero',  icon: TrendingUp,  color: '#22C55E', route: '/life/money',  Texture: WavesTexture  },
  { id: 'goals',  label: 'Metas',   icon: Target,      color: '#3B82F6', route: '/life/goals',  Texture: OrbitsTexture },
  { id: 'habits', label: 'Hábitos', icon: CheckSquare, color: '#F59E0B', route: '/life/habits', Texture: FlameTexture  },
  { id: 'brain',  label: 'Brain',   icon: Brain,       color: '#8B5CF6', route: '/life/brain',  Texture: NeuralTexture },
]

function ModuleGrid() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      {MODULES.map(mod => {
        const Icon = mod.icon
        const { Texture } = mod
        return (
          <button
            key={mod.id}
            onClick={() => navigate(mod.route)}
            style={{
              position: 'relative', overflow: 'hidden',
              padding: '18px 16px 16px', borderRadius: radius.xl,
              background: `linear-gradient(135deg, ${mod.color}13 0%, ${mod.color}07 100%)`,
              border: `1px solid ${mod.color}1E`,
              cursor: 'pointer', textAlign: 'left',
              minHeight: '112px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}
          >
            <Texture />
            <div style={{
              width: 34, height: 34, borderRadius: '10px',
              background: `${mod.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1,
            }}>
              <Icon size={15} style={{ color: mod.color }} strokeWidth={2.3} />
            </div>
            <p style={{
              fontFamily: font, fontSize: '14px', fontWeight: 700,
              color: colors.text.primary, margin: 0,
              position: 'relative', zIndex: 1,
            }}>
              {mod.label}
            </p>
          </button>
        )
      })}
    </div>
  )
}

// ── PageSkeleton ──────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0A0B0F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        animate={{ opacity: [0.3, 0.52, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          display: 'flex', flexDirection: 'column', gap: '12px',
          padding: '32px', width: '100%', maxWidth: '420px',
        }}
      >
        {([48, 140, 210, 136] as const).map((h, i) => (
          <div key={i} style={{
            height: h, background: 'rgba(255,255,255,0.04)', borderRadius: radius.xl,
          }} />
        ))}
      </motion.div>
    </div>
  )
}

// ── LifePage ──────────────────────────────────────────────────────────────────

export function LifePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { hasRestaurant, restaurantName, restaurantSlug } = useLifeStore()
  const { currency } = useLocaleStore()
  const data = useLifeData()

  if (data.loading) return <PageSkeleton />

  const firstName = getFirstName(user)
  const initials  = getInitials(user)
  const balance   = data.monthIncome - data.monthExpense

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
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #F4705A 0%, #8B5CF6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: font, fontSize: '15px', fontWeight: 800, color: '#fff',
              boxShadow: '0 0 0 2px rgba(244,112,90,0.22)',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: font, fontSize: '11px', color: colors.text.tertiary,
                margin: '0 0 1px', letterSpacing: '0.02em',
              }}>
                {greet()}
              </p>
              <p style={{
                fontFamily: font, fontSize: '17px', fontWeight: 700,
                color: colors.text.primary, margin: 0,
              }}>
                {firstName}
              </p>
            </div>
            {hasRestaurant && (
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '5px 11px', borderRadius: radius.full,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border.subtle}`,
                  color: colors.text.tertiary, fontFamily: font, fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mi negocio
              </button>
            )}
          </motion.div>

          {/* ── Hoy card ───────────────────────────────────────────────────── */}
          <motion.div variants={fadeInUp}>
            <HoySummaryCard
              goalsCount={data.activeGoalsCount}
              habitsCompleted={data.habitsCompletedToday}
              habitsTotal={data.habitsTotalToday}
              moneyBalance={balance}
              pendingTasks={data.pendingTasksCount}
              currency={currency}
            />
          </motion.div>

          {/* ── Hub Orb hero ────────────────────────────────────────────────── */}
          <motion.div variants={fadeInUp} style={{
            display: 'flex', justifyContent: 'center', padding: '18px 0 10px',
          }}>
            <HubOrb
              restaurantName={restaurantName}
              restaurantSlug={restaurantSlug}
              hasRestaurant={hasRestaurant}
            />
          </motion.div>

          {/* ── Module grid ─────────────────────────────────────────────────── */}
          <motion.div variants={fadeInUp}>
            <ModuleGrid />
          </motion.div>

          {/* ── Recap link ──────────────────────────────────────────────────── */}
          {!data.isNewUser && (
            <motion.div variants={fadeInUp} style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
              <button
                onClick={() => navigate('/life/replay')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 16px', borderRadius: radius.full,
                  background: 'rgba(244,112,90,0.07)', border: `1px solid ${colors.accent.glow}`,
                  color: colors.accent.default, fontFamily: font, fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.01em',
                }}
              >
                ✦ Ver recap del mes
              </button>
            </motion.div>
          )}

        </motion.div>
      </div>
    </>
  )
}
