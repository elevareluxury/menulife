import { useEffect } from 'react'

declare const gsap: any

const TESTIMONIALS = [
  {
    initials: 'VM',
    color:    '#F4705A',
    name:     'Valeria Moreno',
    negocio:  'Trattoria Bella, Rosario',
    quote:    'Antes mis clientes me preguntaban el precio de todo y yo tenía que ir y venir. Ahora escanean el QR y piden solos. Las fotos del menú son hermosas y el botón de pago directo desde el celular cambió todo. Mis mesas rotan más rápido y las propinas subieron porque la experiencia es otra.',
  },
  {
    initials: 'RA',
    color:    '#3B82F6',
    name:     'Rodrigo Altamirano',
    negocio:  'Parrilla Don Rodrigo, Córdoba',
    quote:    'Lo que más me gustó fue poder ver todo desde el celular mientras estoy en casa. Las ventas del día, qué platos vendí más, si hay algún problema en cocina. Antes tenía que estar físicamente en el local. Ahora con MenuLife tengo el restaurante en el bolsillo, literalmente.',
  },
  {
    initials: 'SC',
    color:    '#10B981',
    name:     'Sebastián Cruz',
    negocio:  'Café del Puerto, Buenos Aires',
    quote:    'Mis mozos aprendieron a usar el sistema en una tarde. Lo que me sorprendió es que lo manejan todo desde el celular — toman el pedido, lo mandan a cocina, cobran. Antes tenían comandas en papel que se perdían. Ahora todo está en tiempo real y no se equivocan más en los pedidos.',
  },
]

export function TestimonialsSection() {
  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo('[data-test-title]',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-test-title]', start: 'top 85%' } })

    gsap.fromTo('[data-test-card]',
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out', stagger: 0.18,
        scrollTrigger: { trigger: '[data-test-card]', start: 'top 84%' } })
  }, [])

  return (
    <section style={{
      background: `
        linear-gradient(to top, rgba(244,112,90,0.1) 0%, transparent 40%),
        #0F1115
      `,
      padding: '96px 24px',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div data-test-title style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '12px' }}>
            CLIENTES
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(36px,5vw,56px)', color: '#fff', lineHeight: 1.1, margin: 0 }}>
            Lo que dicen quienes{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>ya lo usan.</em>
          </h2>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
          gap: '24px',
        }}>
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  return (
    <article
      data-test-card
      style={{
        background:     'rgba(255,255,255,0.05)',
        border:         '1px solid rgba(255,255,255,0.08)',
        borderRadius:   '20px',
        padding:        '28px',
        transition:     'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s',
        cursor:         'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform   = 'scale(1.02)'
        e.currentTarget.style.boxShadow   = '0 0 0 1px rgba(244,112,90,0.3), 0 20px 60px rgba(244,112,90,0.08)'
        e.currentTarget.style.borderColor = 'rgba(244,112,90,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform   = ''
        e.currentTarget.style.boxShadow   = ''
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      {/* Stars */}
      <div style={{ color: 'var(--ml-salmon)', fontSize: '14px', marginBottom: '16px', letterSpacing: '2px' }}>★★★★★</div>

      {/* Quote */}
      <p style={{
        fontFamily:  'var(--font-jakarta)',
        fontSize:    '14px',
        fontWeight:  300,
        fontStyle:   'italic',
        color:       'rgba(255,255,255,0.78)',
        lineHeight:  1.75,
        marginBottom:'24px',
      }}>
        &ldquo;{t.quote}&rdquo;
      </p>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width:          '44px', height: '44px', borderRadius: '50%',
          background:     t.color,
          display:        'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily:     'var(--font-syne)', fontWeight: 800, fontSize: '14px', color: '#fff',
          flexShrink:     0,
        }}>{t.initials}</div>
        <div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{t.name}</div>
          <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{t.negocio}</div>
        </div>
      </div>
    </article>
  )
}
