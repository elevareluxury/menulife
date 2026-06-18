import { useEffect, useRef } from 'react'
import { Globe, Target, Rocket } from 'lucide-react'

declare const gsap: any

const SATELLITES = [
  {
    Icon: Globe,   label: 'Identidad',    sub: 'Tu presencia digital unificada',
    color: '#3B82F6', angle: 270, // top
  },
  {
    Icon: Target,  label: 'Organización', sub: 'Tu vida personal en orden',
    color: '#8B5CF6', angle: 30, // bottom-right
  },
  {
    Icon: Rocket,  label: 'Negocios',    sub: 'Tu operación potenciada',
    color: '#F4705A', angle: 150, // bottom-left
  },
]

function polarToPercent(angle: number, rx: number, ry: number) {
  const rad = (angle - 90) * (Math.PI / 180)
  return {
    x: 50 + rx * Math.cos(rad),
    y: 50 + ry * Math.sin(rad),
  }
}

export function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef   = useRef<HTMLDivElement>(null)
  const vizRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo(titleRef.current,
      { opacity: 0, y: 48 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: titleRef.current, start: 'top 85%' } })

    gsap.fromTo('[data-sol-core]',
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.8)',
        scrollTrigger: { trigger: vizRef.current, start: 'top 80%' } })

    gsap.fromTo('[data-sol-sat]',
      { opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.4)', stagger: 0.15,
        scrollTrigger: { trigger: vizRef.current, start: 'top 78%' } })

    gsap.fromTo('[data-sol-line]',
      { opacity: 0, strokeDashoffset: 200 },
      { opacity: 1, strokeDashoffset: 0, duration: 0.9, ease: 'power2.out', stagger: 0.2,
        scrollTrigger: { trigger: vizRef.current, start: 'top 76%' } })

    gsap.fromTo('[data-sol-cards]',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: '[data-sol-cards]', start: 'top 85%' } })
  }, [])

  const RX = 38, RY = 36

  return (
    <section ref={sectionRef} style={{
      background: `
        radial-gradient(ellipse 60% 50% at 50% 40%, rgba(244,112,90,0.06) 0%, transparent 60%),
        var(--ml-dark-2)
      `,
      padding: '96px 24px',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div ref={titleRef} style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--ml-salmon)',
            fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
          }}>LA SOLUCIÓN</p>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(32px,5vw,56px)', color: '#fff',
            lineHeight: 1.1, margin: '0 0 16px',
          }}>Todo conectado dentro de{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>Mycen.</em>
          </h2>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '17px',
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
          }}>Una cuenta. Una plataforma. Un ecosistema.</p>
        </div>

        {/* Orbital visualization */}
        <div ref={vizRef} style={{
          position: 'relative',
          width: '100%', maxWidth: '480px',
          aspectRatio: '1 / 1',
          margin: '0 auto 64px',
        }}>
          {/* SVG: orbit ring + connection lines */}
          <svg
            viewBox="0 0 100 100"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* Orbit ellipse */}
            <ellipse
              cx="50" cy="50"
              rx={RX} ry={RY}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
              strokeDasharray="2 3"
            />
            {/* Connection lines */}
            {SATELLITES.map(({ label, color, angle }) => {
              const pos = polarToPercent(angle, RX, RY)
              return (
                <line
                  key={label}
                  data-sol-line
                  x1="50" y1="50"
                  x2={pos.x} y2={pos.y}
                  stroke={color}
                  strokeWidth="0.4"
                  strokeOpacity="0.5"
                  strokeDasharray="200"
                  strokeDashoffset="200"
                />
              )
            })}
          </svg>

          {/* Core node */}
          <div data-sol-core style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px', height: '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,112,90,0.25) 0%, rgba(244,112,90,0.05) 70%)',
            border: '1.5px solid rgba(244,112,90,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(244,112,90,0.25), 0 0 80px rgba(244,112,90,0.1)',
            zIndex: 2,
          }}>
            <span style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800, fontSize: '14px',
              color: '#fff', letterSpacing: '0.05em',
            }}>Mycen</span>
          </div>

          {/* Satellite nodes */}
          {SATELLITES.map(({ Icon, label, color, angle }) => {
            const pos = polarToPercent(angle, RX, RY)
            return (
              <div
                key={label}
                data-sol-sat
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  zIndex: 3,
                }}
              >
                <div style={{
                  width: '52px', height: '52px',
                  borderRadius: '14px',
                  background: `${color}15`,
                  border: `1px solid ${color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 24px ${color}20`,
                  backdropFilter: 'blur(12px)',
                }}>
                  <Icon size={20} style={{ color }} strokeWidth={1.8} />
                </div>
                <span style={{
                  fontFamily: 'var(--font-jakarta)',
                  fontSize: '11px', fontWeight: 600,
                  color: 'rgba(255,255,255,0.6)',
                  whiteSpace: 'nowrap',
                }}>{label}</span>
              </div>
            )
          })}
        </div>

        {/* 3 feature cards below */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {SATELLITES.map(({ Icon, label, sub, color }) => (
            <div
              key={label}
              data-sol-cards
              className="liquid-glass"
              style={{
                padding: '28px 24px',
                background: 'rgba(15,17,21,0.97)',
                border: `1px solid ${color}20`,
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: `${color}15`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Icon size={20} style={{ color }} strokeWidth={2} />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-syne)', fontWeight: 800,
                fontSize: '18px', color: '#fff', marginBottom: '8px',
              }}>{label}</h3>
              <p style={{
                fontFamily: 'var(--font-jakarta)', fontSize: '14px',
                color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0,
              }}>{sub}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
