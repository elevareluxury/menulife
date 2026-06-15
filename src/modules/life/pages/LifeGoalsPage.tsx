import { Target, ArrowUpRight } from 'lucide-react'

export function LifeGoalsPage() {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px 0' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '14px',
            background: 'rgba(59,130,246,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={20} style={{ color: '#3B82F6' }} strokeWidth={2} />
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800,
            color: '#F5F7FA',
            fontFamily: 'var(--font-jakarta)',
            margin: 0,
          }}>
            Goals
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-jakarta)' }}>
          Lo que querés lograr
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
        {[
          { label: 'Activas',    value: '—' },
          { label: 'Completadas', value: '—' },
          { label: 'Progreso',   value: '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            borderRadius: '16px', padding: '16px',
            background: '#13161C',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '22px', fontWeight: 800,
              color: '#F5F7FA',
              fontFamily: 'var(--font-jakarta)',
              marginBottom: '4px',
            }}>
              {value}
            </p>
            <p style={{
              fontSize: '10px', fontWeight: 600,
              color: 'rgba(255,255,255,0.28)',
              fontFamily: 'var(--font-jakarta)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              {label}
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
          background: 'rgba(59,130,246,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <Target size={24} style={{ color: '#3B82F6' }} strokeWidth={1.8} />
        </div>
        <h2 style={{
          fontSize: '18px', fontWeight: 700,
          color: '#F5F7FA',
          fontFamily: 'var(--font-jakarta)',
          marginBottom: '8px',
        }}>
          Definí hacia dónde vas
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-jakarta)',
          maxWidth: '260px', margin: '0 auto 24px',
          lineHeight: 1.65,
        }}>
          Cada meta grande empieza con escribirla. Tus objetivos y su progreso aparecen aquí.
        </p>
        <button
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px',
            borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: 'rgba(59,130,246,0.12)',
            color: '#3B82F6',
            fontSize: '13px', fontWeight: 700,
            fontFamily: 'var(--font-jakarta)',
            transition: 'background 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)' }}
        >
          Crear primera meta
          <ArrowUpRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
