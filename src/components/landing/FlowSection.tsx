import { useEffect, useRef } from 'react'

declare const gsap: any

const STEPS = [
  { icon: '⬛', emoji: '📷', num: 1, title: 'Escanear QR',      desc: 'El cliente escanea el QR de la mesa. Sin app, sin fricción.' },
  { icon: '⚡', emoji: '⚡', num: 2, title: 'Abre al instante', desc: 'El menú carga en menos de un segundo.' },
  { icon: '🍽️', emoji: '🍽️', num: 3, title: 'Navega el menú',  desc: 'Fotos, categorías y precios claros.' },
  { icon: '💳', emoji: '💳', num: 4, title: 'Paga',             desc: 'Un toque. Apple Pay, Stripe, MercadoPago.' },
  { icon: '📈', emoji: '📈', num: 5, title: 'Analytics live',   desc: 'El negocio recibe datos en tiempo real.' },
]

export function FlowSection() {
  const lineRef    = useRef<SVGPathElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    // Title
    gsap.fromTo('[data-flow-title]',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-flow-title]', start: 'top 85%' } })

    // SVG line draw
    if (lineRef.current) {
      const len = lineRef.current.getTotalLength?.() || 1200
      lineRef.current.style.strokeDasharray  = `${len}`
      lineRef.current.style.strokeDashoffset = `${len}`
      gsap.to(lineRef.current, {
        strokeDashoffset: 0,
        duration: 1.6, ease: 'power2.inOut',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', end: 'bottom 80%', scrub: 1.2 },
      })
    }

    // Step icons
    gsap.fromTo('[data-step-icon]',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.55, stagger: 0.12, ease: 'back.out(2)',
        scrollTrigger: { trigger: '[data-step-icon]', start: 'top 82%' } })

    gsap.fromTo('[data-step-text]',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: '[data-step-text]', start: 'top 82%' } })
  }, [])

  return (
    <section ref={sectionRef} style={{
      background: 'var(--ml-off-white)',
      padding:    '96px 24px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div data-flow-title style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '12px' }}>
            CÓMO FUNCIONA
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(36px,5vw,56px)', color: '#1a1a1a', lineHeight: 1.1, margin: 0 }}>
            Del escaneo al pago{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>en segundos.</em>
          </h2>
        </div>

        {/* Steps — horizontal on desktop */}
        <div style={{ position: 'relative' }}>
          {/* SVG connecting line (desktop only) */}
          <div className="hidden lg:block" style={{ position: 'absolute', top: '28px', left: '10%', right: '10%', height: '4px', zIndex: 0 }}>
            <svg width="100%" height="4" preserveAspectRatio="none" overflow="visible">
              {/* Background track */}
              <path d="M 0 2 L 100% 2" stroke="rgba(244,112,90,0.12)" strokeWidth="3" fill="none" />
              {/* Animated fill */}
              <path ref={lineRef} d="M 0 2 L 100% 2" stroke="var(--ml-salmon)" strokeWidth="3" fill="none"
                strokeLinecap="round"
                style={{ strokeDasharray: '1200', strokeDashoffset: '1200' }}
              />
            </svg>
          </div>

          <div style={{
            display:           'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap:               '32px',
            position:          'relative', zIndex: 1,
          }}>
            {STEPS.map((step) => (
              <StepItem key={step.num} step={step} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function StepItem({ step }: { step: typeof STEPS[0] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
      {/* Icon circle */}
      <div data-step-icon style={{
        position:       'relative',
        width:          '56px', height: '56px',
        borderRadius:   '50%',
        background:     '#0F1115',
        border:         '2px solid rgba(244,112,90,0.25)',
        display:        'flex', alignItems: 'center', justifyContent: 'center',
        fontSize:       '22px',
        cursor:         'default',
        transition:     'transform 0.5s ease, border-color 0.3s, box-shadow 0.3s',
        zIndex:         1,
        boxShadow:      '0 4px 20px rgba(0,0,0,0.12)',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform    = 'rotate(360deg) scale(1.12)'
          e.currentTarget.style.borderColor  = 'var(--ml-salmon)'
          e.currentTarget.style.boxShadow    = '0 0 20px rgba(244,112,90,0.35)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform    = 'rotate(0deg) scale(1)'
          e.currentTarget.style.borderColor  = 'rgba(244,112,90,0.25)'
          e.currentTarget.style.boxShadow    = '0 4px 20px rgba(0,0,0,0.12)'
        }}
      >
        {step.emoji}
        {/* Step number badge */}
        <span style={{
          position:     'absolute', top: '-6px', right: '-6px',
          width:        '20px', height: '20px',
          borderRadius: '50%',
          background:   'var(--ml-salmon)',
          color:        '#fff', fontSize: '10px', fontWeight: 800,
          display:      'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily:   'var(--font-syne)',
        }}>{step.num}</span>
      </div>

      {/* Text */}
      <div data-step-text>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: '#1a1a1a', margin: '0 0 6px' }}>
          {step.title}
        </h3>
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'var(--ml-gray-500)', lineHeight: 1.55, margin: 0, maxWidth: '160px' }}>
          {step.desc}
        </p>
      </div>
    </div>
  )
}
