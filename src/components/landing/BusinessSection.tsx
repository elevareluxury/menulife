import { useEffect } from 'react'
import { UtensilsCrossed, ShoppingBag, CalendarDays } from 'lucide-react'
import { useLandingT } from '@/i18n/app/landing'

import { reducedMotion } from './motion'
import { SplitText } from './SplitText'

declare const gsap: any

const VERTICALS = [
  {
    Icon: UtensilsCrossed,
    key: 'food',
    color: '#F4705A',
    bg: 'rgba(244,112,90,0.05)',
    border: 'rgba(244,112,90,0.18)',
  },
  {
    Icon: ShoppingBag,
    key: 'retail',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.05)',
    border: 'rgba(59,130,246,0.18)',
  },
  {
    Icon: CalendarDays,
    key: 'services',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.05)',
    border: 'rgba(139,92,246,0.18)',
  },
] as const

export function BusinessSection() {
  const t = useLandingT().business
  useEffect(() => {
    if (typeof gsap === 'undefined' || reducedMotion()) return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo('[data-biz-title]',
      { opacity: 0, y: 48 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-biz-title]', start: 'top 85%' } })

    gsap.fromTo('[data-biz-card]',
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.18,
        scrollTrigger: { trigger: '[data-biz-card]', start: 'top 85%' } })
  }, [])

  return (
    <section style={{
      background: `
        radial-gradient(ellipse 60% 50% at 70% 30%, rgba(59,130,246,0.04) 0%, transparent 50%),
        var(--ml-dark-2)
      `,
      padding: '96px 24px',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div data-biz-title style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--ml-salmon)',
            fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
          }}>{t.label}</p>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(32px,5vw,56px)', color: '#fff',
            lineHeight: 1.1, margin: '0 0 16px',
          }} data-split><SplitText text={t.title} />{' '}
            <em data-word className="ml-shine" style={{ color: 'var(--ml-salmon)', fontStyle: 'normal', display: 'inline-block' }}>{t.titleAccent}</em>
          </h2>
        </div>

        {/* 3 vertical cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {VERTICALS.map(({ Icon, key, color, bg, border }) => ({ ...t[key], Icon, key, color, bg, border })).map(({ Icon, key, tag, title, features, cta, color, bg, border }) => (
            <div
              key={key}
              data-biz-card
              className="liquid-glass"
              style={{
                padding: '36px 28px',
                background: `rgba(15,17,21,0.97)`,
                border: `1px solid ${border}`,
                display: 'flex', flexDirection: 'column',
              }}
              data-tilt
            >
              <span className="ml-spot" aria-hidden="true" />
              {/* Icon */}
              <div style={{
                width: '52px', height: '52px',
                borderRadius: '15px',
                background: bg,
                border: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: `0 6px 20px ${color}15`,
              }}>
                <Icon size={24} style={{ color }} strokeWidth={1.8} />
              </div>

              {/* Label */}
              <p style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color, fontFamily: 'var(--font-jakarta)',
                marginBottom: '10px',
              }}>{tag}</p>

              {/* Title */}
              <h3 style={{
                fontFamily: 'var(--font-syne)', fontWeight: 800,
                fontSize: '22px', color: '#fff', lineHeight: 1.2,
                marginBottom: '20px', flexGrow: 1,
              }}>{title}</h3>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '28px' }}>
                {features.map(f => (
                  <div key={f} data-rise style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color, fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{
                      fontFamily: 'var(--font-jakarta)', fontSize: '13px',
                      color: 'rgba(255,255,255,0.55)', lineHeight: 1.4,
                    }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* Business todavía no está abierto en la V1: sólo se anuncia */}
              <p style={{
                width: '100%', padding: '12px', borderRadius: '12px', margin: 0, textAlign: 'center',
                border: `1px dashed ${color}40`, color, fontSize: '13px', fontWeight: 600,
                fontFamily: 'var(--font-jakarta)',
              }}>
                {cta}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
