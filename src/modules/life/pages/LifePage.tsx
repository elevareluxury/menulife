import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { Wallet, Target, Flame, Zap, LayoutDashboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface AreaCard {
  to: string
  icon: LucideIcon
  label: string
  color: string
  hint: string
}

const AREAS: AreaCard[] = [
  { to: '/life/money',  icon: Wallet, label: 'Money',  color: '#22C55E', hint: 'Sin movimientos aún' },
  { to: '/life/goals',  icon: Target, label: 'Goals',  color: '#3B82F6', hint: '0 metas activas'     },
  { to: '/life/habits', icon: Flame,  label: 'Habits', color: '#F59E0B', hint: 'Sin hábitos aún'     },
  { to: '/life/brain',  icon: Zap,    label: 'Brain',  color: '#8B5CF6', hint: 'Mente lista'          },
]

function greet(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function LifePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { hasRestaurant } = useLifeStore()

  const rawName = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? ''
  const firstName = rawName.split(' ')[0] || 'ahí'

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px 0' }}>

      {/* Business OS chip */}
      {hasRestaurant && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 11px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.45)',
              fontSize: '11px', fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-jakarta)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
            }}
          >
            <LayoutDashboard size={12} />
            Mi negocio
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ paddingTop: '20px', marginBottom: '28px' }}>
        <p style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-jakarta)',
          marginBottom: '4px',
          letterSpacing: '0.02em',
        }}>
          {greet()}
        </p>
        <h1 style={{
          fontSize: '34px',
          fontWeight: 800,
          color: '#F5F7FA',
          fontFamily: 'var(--font-jakarta)',
          lineHeight: 1.1,
          margin: 0,
        }}>
          {firstName}
        </h1>
      </div>

      {/* Life Score hero */}
      <div style={{
        borderRadius: '24px',
        padding: '24px 24px 20px',
        background: 'linear-gradient(135deg, rgba(244,112,90,0.07) 0%, rgba(244,112,90,0.02) 100%)',
        border: '1px solid rgba(244,112,90,0.10)',
        marginBottom: '20px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
          marginBottom: '14px',
          fontFamily: 'var(--font-jakarta)',
        }}>
          Life Score
        </p>
        <div style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          border: '2px solid rgba(244,112,90,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          background: 'rgba(244,112,90,0.05)',
        }}>
          <span style={{
            fontSize: '30px',
            fontWeight: 800,
            color: 'rgba(244,112,90,0.35)',
            fontFamily: 'var(--font-jakarta)',
          }}>—</span>
        </div>
        <p style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.25)',
          fontFamily: 'var(--font-jakarta)',
          lineHeight: 1.5,
        }}>
          Registrá tu vida para calcular tu score
        </p>
      </div>

      {/* Area cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {AREAS.map(({ to, icon: Icon, label, color, hint }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            style={{
              borderRadius: '20px',
              padding: '18px',
              textAlign: 'left',
              background: '#13161C',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              transition: 'background 0.18s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#13161C'
              e.currentTarget.style.transform = ''
            }}
          >
            <div style={{
              width: '36px', height: '36px',
              borderRadius: '12px',
              background: `${color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '12px',
            }}>
              <Icon size={17} style={{ color }} strokeWidth={2} />
            </div>
            <p style={{
              fontSize: '14px', fontWeight: 700,
              color: '#F5F7FA',
              fontFamily: 'var(--font-jakarta)',
              marginBottom: '3px',
            }}>
              {label}
            </p>
            <p style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.28)',
              fontFamily: 'var(--font-jakarta)',
            }}>
              {hint}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
