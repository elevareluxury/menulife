import { useEffect, useRef } from 'react'
import { Share2, Target, FileText, Users, Building2, Wallet } from 'lucide-react'

declare const gsap: any

const FRAGS = [
  { Icon: Share2,    label: 'Redes',     color: '#3B82F6', top: '18%', left: '10%',  dur: 6.2, delay: 0   },
  { Icon: Target,    label: 'Objetivos', color: '#8B5CF6', top: '12%', left: '60%',  dur: 7.5, delay: 1.2 },
  { Icon: FileText,  label: 'Notas',     color: '#F59E0B', top: '62%', left: '7%',   dur: 8.1, delay: 0.7 },
  { Icon: Users,     label: 'Clientes',  color: '#10B981', top: '68%', left: '52%',  dur: 6.8, delay: 1.8 },
  { Icon: Building2, label: 'Negocio',   color: '#F4705A', top: '25%', left: '78%',  dur: 7.2, delay: 0.4 },
  { Icon: Wallet,    label: 'Finanzas',  color: '#EC4899', top: '74%', left: '80%',  dur: 8.6, delay: 2.1 },
]

export function FragmentationSection() {
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

    gsap.fromTo('[data-frag-icon]',
      { opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.12,
        scrollTrigger: { trigger: vizRef.current, start: 'top 80%' } })
  }, [])

  return (
    <section ref={sectionRef} style={{
      background: `
        radial-gradient(ellipse 70% 50% at 50% 50%, rgba(244,112,90,0.04) 0%, transparent 60%),
        var(--ml-dark)
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
          }}>EL PROBLEMA</p>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(32px,5vw,56px)', color: '#fff',
            lineHeight: 1.1, margin: '0 0 16px',
          }}>Hoy tu vida digital está{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>fragmentada.</em>
          </h2>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '17px',
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
            maxWidth: '520px', margin: '0 auto',
          }}>Demasiadas herramientas. Demasiado desorden.</p>
        </div>

        {/* Visualization */}
        <div ref={vizRef} style={{
          position: 'relative',
          height: 'clamp(320px, 50vw, 480px)',
          maxWidth: '760px',
          margin: '0 auto',
        }}>
          {/* Subtle grid lines */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            borderRadius: '24px',
          }} />

          {/* Connection lines (visual noise — disconnected) */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <line x1="15%" y1="25%" x2="65%" y2="18%"  stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="65%" y1="18%" x2="82%" y2="32%"  stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="12%" y1="68%" x2="55%" y2="74%"  stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="82%" y1="78%" x2="55%" y2="74%"  stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 6" />
          </svg>

          {/* Floating icons */}
          {FRAGS.map(({ Icon, label, color, top, left, dur, delay }) => (
            <div
              key={label}
              data-frag-icon
              style={{
                position: 'absolute',
                top, left,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                animation: `frag-float ${dur}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            >
              <div style={{
                width: '56px', height: '56px',
                borderRadius: '16px',
                background: `${color}12`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(12px)',
                boxShadow: `0 8px 24px ${color}18`,
              }}>
                <Icon size={22} style={{ color }} strokeWidth={1.8} />
              </div>
              <span style={{
                fontFamily: 'var(--font-jakarta)',
                fontSize: '11px', fontWeight: 500,
                color: 'rgba(255,255,255,0.3)',
                whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
          ))}

          {/* Center chaos indicator */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <span style={{ fontSize: '26px', opacity: 0.3 }}>?</span>
            </div>
            <p style={{
              fontFamily: 'var(--font-jakarta)', fontSize: '12px',
              color: 'rgba(255,255,255,0.2)',
            }}>Sin conexión</p>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes frag-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-10px) rotate(1.5deg); }
          66%       { transform: translateY(6px) rotate(-1deg); }
        }
      `}</style>
    </section>
  )
}
