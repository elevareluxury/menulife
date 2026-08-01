import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Globe, TrendingUp, Target, Flame, Zap } from 'lucide-react'
import { ShimmerButton } from './Navbar'

declare const gsap: any

const MODULES = [
  {
    Icon: Globe,      name: 'ID Digital',
    copy: 'Comparte todo lo importante desde un único perfil.',
    color: '#3B82F6',
  },
  {
    Icon: TrendingUp, name: 'Money',
    copy: 'Ten claridad total sobre tus ingresos y gastos.',
    color: '#10B981',
  },
  {
    Icon: Target,     name: 'Goals',
    copy: 'Transforma metas en resultados reales.',
    color: '#8B5CF6',
  },
  {
    Icon: Flame,      name: 'Habits',
    copy: 'Construye consistencia día tras día.',
    color: '#F59E0B',
  },
  {
    Icon: Zap,        name: 'Brain',
    copy: 'Nunca vuelvas a perder una idea importante.',
    color: '#F4705A',
  },
]

export function LifeOSSection() {
  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo('[data-life-title]',
      { opacity: 0, y: 48 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-life-title]', start: 'top 85%' } })

    gsap.fromTo('[data-life-card]',
      { opacity: 0, y: 56 },
      { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: '[data-life-card]', start: 'top 85%' } })

    gsap.fromTo('[data-life-cta]',
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.65, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '[data-life-cta]', start: 'top 88%' } })
  }, [])

  return (
    <section style={{
      background: `
        radial-gradient(ellipse 60% 40% at 20% 60%, rgba(59,130,246,0.05) 0%, transparent 50%),
        radial-gradient(ellipse 50% 40% at 80% 20%, rgba(139,92,246,0.05) 0%, transparent 50%),
        var(--ml-dark)
      `,
      padding: '96px 24px',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div data-life-title style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--ml-salmon)',
            fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
          }}>MYCEN PERSONAL</p>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(32px,5vw,56px)', color: '#fff',
            lineHeight: 1.1, margin: '0 0 16px',
          }}>Tu sistema operativo{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>personal.</em>
          </h2>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '17px',
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
            maxWidth: '520px', margin: '0 auto',
          }}>
            Organiza y visualiza tu progreso desde un único lugar.
          </p>
        </div>

        {/* Module cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '56px',
        }}>
          {MODULES.map(({ Icon, name, copy, color }) => (
            <div
              key={name}
              data-life-card
              className="liquid-glass"
              style={{
                padding: '28px 22px',
                background: 'rgba(15,17,21,0.97)',
                border: `1px solid rgba(255,255,255,0.07)`,
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.borderColor = `${color}40`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
              }}
            >
              <div style={{
                width: '48px', height: '48px',
                borderRadius: '14px',
                background: `${color}15`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '18px',
                boxShadow: `0 4px 16px ${color}15`,
              }}>
                <Icon size={22} style={{ color }} strokeWidth={1.8} />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-syne)', fontWeight: 800,
                fontSize: '17px', color: '#fff', marginBottom: '8px',
              }}>{name}</h3>
              <p style={{
                fontFamily: 'var(--font-jakarta)', fontSize: '13px',
                color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, margin: 0,
              }}>{copy}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div data-life-cta style={{ textAlign: 'center' }}>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <ShimmerButton style={{ padding: '14px 36px', fontSize: '15px', borderRadius: '50px' }}>
              Crear Mi Espacio Gratis →
            </ShimmerButton>
          </Link>
        </div>

      </div>
    </section>
  )
}
