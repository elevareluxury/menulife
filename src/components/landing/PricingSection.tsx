import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

declare const gsap: any

const PLANS = [
  {
    tag:      'INICIAL',
    name:     'Esencial',
    desc:     'Tu menú digital profesional desde hoy.',
    monthly:  80,
    features: ['1 local', 'Menú digital + QR', 'Onboarding por WhatsApp', 'Analytics básicos', 'Pagos móviles'],
    cta:      'Comenzar',
    featured: false,
    href:     '/solicitar-acceso',
  },
  {
    tag:      'CRECIMIENTO',
    name:     'Profesional',
    desc:     'Lo que eligen los negocios serios.',
    monthly:  130,
    features: ['Hasta 3 locales', 'Editor de menú + branding', 'Onboarding + videos', 'Analytics avanzados con IA', 'División de cuenta y propinas', 'Soporte prioritario'],
    cta:      'Empezar ahora →',
    featured: true,
    href:     '/solicitar-acceso',
  },
  {
    tag:      'ENTERPRISE',
    name:     'Hospitalidad',
    desc:     'Para grupos con múltiples locales y hotelería.',
    monthly:  null,
    features: ['Locales ilimitados', 'Integraciones personalizadas', 'Onboarding dedicado', 'Branding a medida', 'SLA + soporte dedicado', 'Opción white-label'],
    cta:      'Hablar con el equipo',
    featured: false,
    href:     '/solicitar-acceso',
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo('[data-price-title]',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-price-title]', start: 'top 85%' } })

    gsap.fromTo('[data-price-card]',
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.15,
        scrollTrigger: { trigger: '[data-price-card]', start: 'top 84%' } })
  }, [])

  const getPrice = (monthly: number | null) => {
    if (monthly === null) return null
    return annual ? Math.round(monthly * 0.8) : monthly
  }

  return (
    <section style={{ background: 'var(--ml-off-white)', padding: '96px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div data-price-title style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '12px' }}>
            PRECIOS
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(36px,5vw,56px)', color: '#1a1a1a', lineHeight: 1.1, margin: '0 0 32px' }}>
            Simple y{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>transparente.</em>
          </h2>

          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.06)', padding: '4px', borderRadius: '50px' }}>
            <button onClick={() => setAnnual(false)} style={{
              padding: '8px 20px', borderRadius: '50px', border: 'none',
              background: !annual ? '#fff' : 'transparent',
              boxShadow: !annual ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              color: !annual ? '#1a1a1a' : 'var(--ml-gray-500)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-jakarta)', transition: 'all 0.25s',
            }}>Mensual</button>
            <button onClick={() => setAnnual(true)} style={{
              padding: '8px 20px', borderRadius: '50px', border: 'none',
              background: annual ? '#fff' : 'transparent',
              boxShadow: annual ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              color: annual ? '#1a1a1a' : 'var(--ml-gray-500)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-jakarta)', transition: 'all 0.25s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              Anual
              <span style={{
                background: 'var(--ml-salmon)', color: '#fff',
                fontSize: '9px', fontWeight: 700, padding: '2px 6px',
                borderRadius: '50px', letterSpacing: '0.05em',
              }}>−20%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px,1fr))',
          gap: '24px',
          alignItems: 'start',
        }}>
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} price={getPrice(plan.monthly)} annual={annual} />
          ))}
        </div>

        {/* Trust line */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: '8px 24px', marginTop: '48px',
          fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'var(--ml-gray-500)',
        }}>
          {['Sin contrato. Cancelás cuando quieras.', 'Soporte por WhatsApp incluido.', 'Probá 14 días gratis.'].map((t, i) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && <span style={{ color: 'var(--ml-gray-200)' }}>|</span>}
              <span style={{ color: 'var(--ml-salmon)', fontWeight: 600 }}>✓</span> {t}
            </span>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: 'var(--ml-gray-500)' }}>
          ¿No sabés qué plan te conviene?{' '}
          <a href="#" style={{ color: 'var(--ml-salmon)', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >Reservá una llamada de estrategia</a>
          {' '}— encontramos la mejor opción para tu negocio.
        </p>
      </div>
    </section>
  )
}

function PricingCard({ plan, price, annual }: { plan: typeof PLANS[0]; price: number | null; annual: boolean }) {
  return (
    <div
      data-price-card
      style={{
        position:     'relative',
        borderRadius: '24px',
        padding:      '36px 32px',
        background:   plan.featured ? '#0F1115' : '#fff',
        border:       plan.featured ? '1px solid rgba(244,112,90,0.45)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow:    plan.featured ? '0 0 0 0 rgba(244,112,90,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
        animation:    plan.featured ? 'ml-pulse-glow 3s ease-in-out infinite' : 'none',
        transition:   'transform 0.3s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
    >
      {/* Popular badge */}
      {plan.featured && (
        <div style={{
          position:     'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
          background:   'var(--ml-salmon)', color: '#fff',
          padding:      '5px 16px', borderRadius: '50px',
          fontSize:     '11px', fontWeight: 700, fontFamily: 'var(--font-jakarta)',
          letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>Más popular</div>
      )}

      {/* Tag */}
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '8px' }}>
        {plan.tag}
      </p>

      {/* Name */}
      <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '26px', color: plan.featured ? '#fff' : '#1a1a1a', marginBottom: '8px' }}>
        {plan.name}
      </h3>
      <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: plan.featured ? 'rgba(255,255,255,0.5)' : 'var(--ml-gray-500)', marginBottom: '24px', lineHeight: 1.5 }}>
        {plan.desc}
      </p>

      {/* Price */}
      <div style={{ paddingBottom: '24px', marginBottom: '24px', borderBottom: `1px solid ${plan.featured ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
        {price !== null ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '52px', lineHeight: 1, color: plan.featured ? '#fff' : '#1a1a1a', transition: 'all 0.3s' }}>
              ${price}
            </span>
            <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: plan.featured ? 'rgba(255,255,255,0.4)' : 'var(--ml-gray-500)', paddingBottom: '8px' }}>
              /mes {annual && <span style={{ color: 'var(--ml-salmon)', fontWeight: 600, fontSize: '11px' }}>· facturado anual</span>}
            </span>
          </div>
        ) : (
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '36px', color: plan.featured ? '#fff' : '#1a1a1a' }}>A medida</span>
        )}
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {plan.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: plan.featured ? 'rgba(255,255,255,0.7)' : '#3d3c39' }}>
            <span style={{ color: 'var(--ml-salmon)', fontWeight: 700, flexShrink: 0, fontSize: '12px' }}>✓</span>
            {f}
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link to={plan.href} style={{ textDecoration: 'none' }}>
        <button style={{
          width:        '100%',
          padding:      '14px',
          borderRadius: '50px',
          border:       plan.featured ? 'none' : '1px solid rgba(0,0,0,0.15)',
          background:   plan.featured ? 'var(--ml-salmon)' : 'transparent',
          color:        plan.featured ? '#fff' : '#3d3c39',
          fontSize:     '14px', fontWeight: 600,
          cursor:       'pointer', fontFamily: 'var(--font-jakarta)',
          transition:   'all 0.2s',
          position:     'relative', overflow: 'hidden',
        }}
          onMouseEnter={e => {
            if (plan.featured) {
              e.currentTarget.style.boxShadow = '0 0 24px rgba(244,112,90,0.5)'
              e.currentTarget.style.transform = 'scale(1.02)'
            } else {
              e.currentTarget.style.borderColor = 'var(--ml-salmon)'
              e.currentTarget.style.color = 'var(--ml-salmon)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = ''
            e.currentTarget.style.transform = ''
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'
            e.currentTarget.style.color = plan.featured ? '#fff' : '#3d3c39'
          }}
        >
          {plan.cta}
          {plan.featured && (
            <span style={{
              position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
              animation: 'ml-shimmer 3s infinite',
            }} />
          )}
        </button>
      </Link>

      {/* Conviction line on pro card */}
      {plan.featured && (
        <p style={{ textAlign: 'center', marginTop: '12px', fontFamily: 'var(--font-jakarta)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
          &ldquo;Con 2 mesas más por noche, el sistema se paga solo.&rdquo;
        </p>
      )}
    </div>
  )
}
