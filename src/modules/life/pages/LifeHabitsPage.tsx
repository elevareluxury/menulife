import { Flame, ArrowUpRight } from 'lucide-react'

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function LifeHabitsPage() {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px 0' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '14px',
            background: 'rgba(245,158,11,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Flame size={20} style={{ color: '#F59E0B' }} strokeWidth={2} />
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800,
            color: '#F5F7FA',
            fontFamily: 'var(--font-jakarta)',
            margin: 0,
          }}>
            Habits
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-jakarta)' }}>
          Los pequeños actos que construyen quien sos
        </p>
      </div>

      {/* Week tracker placeholder */}
      <div style={{
        borderRadius: '20px', padding: '20px',
        background: '#13161C',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'var(--font-jakarta)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Esta semana
          </span>
          <span style={{
            fontSize: '12px', fontWeight: 700,
            color: '#F59E0B',
            fontFamily: 'var(--font-jakarta)',
          }}>
            0 / 0
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {DAYS.map(day => (
            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '100%', aspectRatio: '1',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }} />
              <span style={{
                fontSize: '10px', fontWeight: 500,
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'var(--font-jakarta)',
              }}>
                {day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <div style={{
        borderRadius: '24px',
        padding: '48px 24px',
        background: '#13161C',
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '20px',
          background: 'rgba(245,158,11,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <Flame size={24} style={{ color: '#F59E0B' }} strokeWidth={1.8} />
        </div>
        <h2 style={{
          fontSize: '18px', fontWeight: 700,
          color: '#F5F7FA',
          fontFamily: 'var(--font-jakarta)',
          marginBottom: '8px',
        }}>
          Los hábitos construyen la vida
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-jakarta)',
          maxWidth: '260px', margin: '0 auto 24px',
          lineHeight: 1.65,
        }}>
          Creá tu primer hábito y empezá a rastrear tu racha diaria.
        </p>
        <button
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px',
            borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: 'rgba(245,158,11,0.12)',
            color: '#F59E0B',
            fontSize: '13px', fontWeight: 700,
            fontFamily: 'var(--font-jakarta)',
            transition: 'background 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)' }}
        >
          Crear primer hábito
          <ArrowUpRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
