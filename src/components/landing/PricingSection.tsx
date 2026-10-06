import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLandingT } from '@/i18n/app/landing'

import { reducedMotion } from './motion'
import { SplitText } from './SplitText'

declare const gsap: any

type Billing = 'monthly' | '6months' | 'annual'

export function PricingSection() {
  const t = useLandingT().pricing
  const [billing, setBilling] = useState<Billing>('monthly')

  const PLANS = [
    {
      ...t.plan1,
      monthly:  70,
      featured: false,
      href:     '/register',
    },
    {
      ...t.plan2,
      monthly:  150,
      badge:    null,
      badgeNote: null,
      featured: true,
      href:     '/register',
    },
  ]

  useEffect(() => {
    if (typeof gsap === 'undefined' || reducedMotion()) return
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

  const getPrice = (monthly: number): number => {
    if (billing === '6months') return Math.round(monthly * 0.9)
    if (billing === 'annual')  return Math.round(monthly * 0.8)
    return monthly
  }

  const TOGGLE_OPTIONS: { key: Billing; label: string; badge?: string }[] = [
    { key: 'monthly',  label: t.monthly },
    { key: '6months',  label: t.sixMonths, badge: '−10%' },
    { key: 'annual',   label: t.annual,  badge: '−20%' },
  ]

  return (
    <section style={{ background: `radial-gradient(ellipse 60% 40% at 70% 80%, rgba(244,112,90,0.05) 0%, transparent 50%), var(--ml-off-white)`, padding: '96px 24px 48px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div data-price-title style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '12px' }}>
            {t.label}
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(36px,5vw,56px)', color: '#1a1a1a', lineHeight: 1.1, margin: '0 0 12px' }} data-split>
            <SplitText text={t.title} />{' '}
            <em data-word style={{ color: 'var(--ml-salmon)', fontStyle: 'normal', display: 'inline-block' }}>{t.titleAccent}</em>
          </h2>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '15px', color: 'var(--ml-gray-500)', margin: '0 0 28px' }}>
            {t.freeNote}
          </p>

          {/* 3-way Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.06)', padding: '4px', borderRadius: '50px' }}>
            {TOGGLE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setBilling(opt.key)}
                aria-pressed={billing === opt.key}
                style={{
                  padding: '8px 18px', borderRadius: '50px', border: 'none',
                  background: billing === opt.key ? '#fff' : 'transparent',
                  boxShadow: billing === opt.key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  color: billing === opt.key ? '#1a1a1a' : 'var(--ml-gray-500)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-jakarta)', transition: 'all 0.25s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {opt.label}
                {opt.badge && (
                  <span style={{
                    background: billing === opt.key ? 'var(--ml-salmon)' : 'rgba(244,112,90,0.15)',
                    color: billing === opt.key ? '#fff' : 'var(--ml-salmon)',
                    fontSize: '9px', fontWeight: 700, padding: '2px 6px',
                    borderRadius: '50px', letterSpacing: '0.05em',
                    transition: 'all 0.25s',
                  }}>{opt.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2 main plan cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px,1fr))',
          gap: '24px', alignItems: 'start',
          maxWidth: '720px', margin: '0 auto',
        }}>
          {PLANS.map(plan => (
            <PricingCard
              key={plan.name}
              plan={plan}
              price={getPrice(plan.monthly)}
              perMonth={t.perMonth}
              billingNote={billing === '6months' ? t.noteSixMonths : billing === 'annual' ? t.noteAnnual : ''}
            />
          ))}
        </div>

        {/* A medida card */}
        <div data-price-card style={{ maxWidth: '720px', margin: '16px auto 0' }}>
          <div className="liquid-glass-light" style={{
            borderRadius: '20px', padding: '24px 32px',
            display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '18px', color: '#1a1a1a', marginBottom: '4px' }}>
                {t.custom.name}
              </h3>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'var(--ml-gray-500)', margin: 0 }}>
                {t.custom.desc}
              </p>
            </div>
            <a
              href="https://wa.me/543416962827"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 24px', borderRadius: '50px',
                border: '1px solid rgba(0,0,0,0.15)',
                background: 'transparent',
                color: '#3d3c39',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-jakarta)', textDecoration: 'none',
                display: 'inline-block', transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ml-salmon)'; e.currentTarget.style.color = 'var(--ml-salmon)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'; e.currentTarget.style.color = '#3d3c39' }}
            >
              {t.custom.cta}
            </a>
          </div>
        </div>

        {/* Trust line */}
        <p style={{
          textAlign: 'center', marginTop: '40px',
          fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'var(--ml-gray-500)',
        }}>
          {t.trustLine}
        </p>
      </div>
    </section>
  )
}

function PricingCard({
  plan, price, perMonth, billingNote,
}: {
  plan: { tag: string; name: string; desc: string; monthly: number; badge: string | null; badgeNote: string | null; features: readonly string[]; cta: string; featured: boolean; href: string; note?: string }
  price: number
  perMonth: string
  billingNote: string
}) {
  return (
    <div
      data-price-card
      className={plan.featured ? 'liquid-glass-featured' : 'liquid-glass-light'}
      style={{
        position: 'relative', padding: '36px 32px',
        ...(plan.featured ? {
          background: '#0F1115',
          // Resplandor fijo: animar box-shadow repinta la tarjeta en cada cuadro y traba el scroll
          boxShadow: '0 0 40px rgba(244,112,90,0.35), 0 0 80px rgba(244,112,90,0.12)',
          overflow: 'visible',
        } : {}),
      }}
      data-tilt
    >
      <span className="ml-spot" aria-hidden="true" />
      {/* Featured badge */}
      {plan.featured && (
        <div style={{
          position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
          background: '#F4705A', color: '#fff',
          padding: '6px 16px', borderRadius: '999px',
          fontSize: '0.6875rem', fontWeight: 700, fontFamily: 'var(--font-jakarta)',
          letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          border: 'none', boxShadow: 'none', zIndex: 30,
          display: 'inline-block', lineHeight: 1.4,
        }}>{plan.tag}</div>
      )}

      {/* Tag line for non-featured */}
      {!plan.featured && (
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '8px' }}>
          {plan.tag}
        </p>
      )}

      <h3 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '26px', color: plan.featured ? '#fff' : '#1a1a1a', marginBottom: '4px' }}>
        {plan.name}
      </h3>

      {/* Launch badge */}
      {plan.badge && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{
            background: 'rgba(244,112,90,0.12)', color: '#F4705A',
            border: '1px solid rgba(244,112,90,0.35)',
            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '50px',
            fontFamily: 'var(--font-jakarta)',
          }}>
            {plan.badge}
          </span>
        </div>
      )}

      <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: plan.featured ? 'rgba(255,255,255,0.5)' : 'var(--ml-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
        {plan.desc}
      </p>

      <div style={{ paddingBottom: '24px', marginBottom: '24px', borderBottom: `1px solid ${plan.featured ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '52px', lineHeight: 1, color: plan.featured ? '#fff' : '#1a1a1a', transition: 'all 0.3s' }}>
            US$<AnimatedNumber value={price} />
          </span>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: plan.featured ? 'rgba(255,255,255,0.4)' : 'var(--ml-gray-500)', paddingBottom: '8px' }}>
            {perMonth}{' '}
            {billingNote && <span style={{ color: 'var(--ml-salmon)', fontWeight: 600, fontSize: '11px' }}>{billingNote}</span>}
          </span>
        </div>
        {plan.badgeNote && (
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '11px', color: 'var(--ml-gray-500)', margin: '6px 0 0', fontStyle: 'normal' }}>
            {plan.badgeNote}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {plan.features.map(f => (
          <div key={f} data-rise style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-jakarta)', fontSize: '14px', color: plan.featured ? 'rgba(255,255,255,0.7)' : '#3d3c39' }}>
            <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0, fontSize: '12px' }}>✓</span>
            {f}
          </div>
        ))}
      </div>

      <Link to={plan.href} style={{ textDecoration: 'none', display: 'block' }}>
        {plan.featured ? (
          <button className="liquid-glass-btn" style={{
            width: '100%', padding: '14px',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-jakarta)',
          }}>
            <span>{plan.cta}</span>
            <span style={{
              position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
              animation: 'ml-shimmer 3s infinite', zIndex: 2,
            }} />
          </button>
        ) : (
          <button className="liquid-glass-btn-ghost" style={{
            width: '100%', padding: '14px',
            color: '#3d3c39', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-jakarta)',
            border: '1px solid rgba(0,0,0,0.15)',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ml-salmon)'; e.currentTarget.style.color = 'var(--ml-salmon)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'; e.currentTarget.style.color = '#3d3c39' }}
          >
            <span>{plan.cta}</span>
          </button>
        )}
      </Link>

      {plan.featured && plan.note && (
        <p style={{ textAlign: 'center', marginTop: '12px', fontFamily: 'var(--font-jakarta)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontStyle: 'normal' }}>
          {plan.note}
        </p>
      )}
    </div>
  )
}

/** Número que cuenta hasta el valor nuevo al cambiar la facturación (quieto con "reducir movimiento"). */
function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(value)
  // El texto lo maneja este componente (no React): así la animación no pisa un nodo de React
  useLayoutEffect(() => { if (ref.current) ref.current.textContent = String(shown.current) }, [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof gsap === 'undefined' || reducedMotion()) { shown.current = value; el.textContent = String(value); return }
    const obj = { n: shown.current }
    const tween = gsap.to(obj, {
      n: value, duration: 0.6, ease: 'power3.out',
      onUpdate: () => { el.textContent = String(Math.round(obj.n)) },
      onComplete: () => { shown.current = value },
    })
    return () => { tween.kill(); shown.current = Math.round(obj.n) }
  }, [value])
  return <span ref={ref} />
}
