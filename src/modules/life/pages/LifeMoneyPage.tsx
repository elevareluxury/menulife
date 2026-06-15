import { Wallet, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'

export function LifeMoneyPage() {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px 0' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '14px',
            background: 'rgba(34,197,94,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wallet size={20} style={{ color: '#22C55E' }} strokeWidth={2} />
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800,
            color: '#F5F7FA',
            fontFamily: 'var(--font-jakarta)',
            margin: 0,
          }}>
            Money
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-jakarta)' }}>
          Tu flujo financiero personal
        </p>
      </div>

      {/* Balance cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
        {[
          { label: 'Ingresos este mes', icon: TrendingUp,   color: '#22C55E', value: '—' },
          { label: 'Gastos este mes',   icon: TrendingDown, color: '#F4705A', value: '—' },
        ].map(({ label, icon: Icon, color, value }) => (
          <div key={label} style={{
            borderRadius: '18px', padding: '18px',
            background: '#13161C',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Icon size={13} style={{ color }} strokeWidth={2.5} />
              <span style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.35)',
                fontFamily: 'var(--font-jakarta)', fontWeight: 600,
                letterSpacing: '0.03em',
              }}>
                {label}
              </span>
            </div>
            <p style={{
              fontSize: '26px', fontWeight: 800,
              color: '#F5F7FA',
              fontFamily: 'var(--font-jakarta)',
            }}>
              {value}
            </p>
          </div>
        ))}
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
          background: 'rgba(34,197,94,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <Wallet size={24} style={{ color: '#22C55E' }} strokeWidth={1.8} />
        </div>
        <h2 style={{
          fontSize: '18px', fontWeight: 700,
          color: '#F5F7FA',
          fontFamily: 'var(--font-jakarta)',
          marginBottom: '8px',
        }}>
          Tu dinero, visible
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-jakarta)',
          maxWidth: '260px', margin: '0 auto 24px',
          lineHeight: 1.65,
        }}>
          Registrá ingresos y gastos para ver hacia dónde va tu energía financiera.
        </p>
        <button
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px',
            borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: 'rgba(34,197,94,0.12)',
            color: '#22C55E',
            fontSize: '13px', fontWeight: 700,
            fontFamily: 'var(--font-jakarta)',
            transition: 'background 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.12)' }}
        >
          Agregar primer movimiento
          <ArrowUpRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
