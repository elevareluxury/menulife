import { Zap, Lightbulb, StickyNote, CheckSquare, ArrowUpRight } from 'lucide-react'

const TYPES = [
  { icon: Lightbulb,   label: 'Ideas',  color: '#8B5CF6', count: 0 },
  { icon: StickyNote,  label: 'Notas',  color: '#3B82F6', count: 0 },
  { icon: CheckSquare, label: 'Tareas', color: '#22C55E', count: 0 },
]

export function LifeBrainPage() {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px 0' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '14px',
            background: 'rgba(139,92,246,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} style={{ color: '#8B5CF6' }} strokeWidth={2} />
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800,
            color: '#F5F7FA',
            fontFamily: 'var(--font-jakarta)',
            margin: 0,
          }}>
            Brain
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-jakarta)' }}>
          Tu mente externalizada
        </p>
      </div>

      {/* Type counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '28px' }}>
        {TYPES.map(({ icon: Icon, label, color, count }) => (
          <div key={label} style={{
            borderRadius: '16px', padding: '16px',
            background: '#13161C',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: `${color}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <Icon size={15} style={{ color }} strokeWidth={2} />
            </div>
            <p style={{
              fontSize: '20px', fontWeight: 800,
              color: '#F5F7FA',
              fontFamily: 'var(--font-jakarta)',
              marginBottom: '2px',
            }}>
              {count}
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
          background: 'rgba(139,92,246,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <Zap size={24} style={{ color: '#8B5CF6' }} strokeWidth={1.8} />
        </div>
        <h2 style={{
          fontSize: '18px', fontWeight: 700,
          color: '#F5F7FA',
          fontFamily: 'var(--font-jakarta)',
          marginBottom: '8px',
        }}>
          Tu mente, organizada
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-jakarta)',
          maxWidth: '260px', margin: '0 auto 24px',
          lineHeight: 1.65,
        }}>
          Ideas, notas y tareas en un solo lugar. Soltá lo que tenés en la cabeza.
        </p>
        <button
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px',
            borderRadius: '999px', border: 'none', cursor: 'pointer',
            background: 'rgba(139,92,246,0.12)',
            color: '#8B5CF6',
            fontSize: '13px', fontWeight: 700,
            fontFamily: 'var(--font-jakarta)',
            transition: 'background 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)' }}
        >
          Capturá tu primer pensamiento
          <ArrowUpRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
