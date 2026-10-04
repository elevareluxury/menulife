import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Globe, TrendingUp, Target, Flame, Zap } from 'lucide-react'
import { ShimmerButton } from './Navbar'
import { useLandingT } from '@/i18n/app/landing'

import { reducedMotion } from './motion'
import { SplitText } from './SplitText'

declare const gsap: any

const MODULES = [
  { Icon: Globe,      key: 'identity', color: '#3B82F6' },
  { Icon: TrendingUp, key: 'money',    color: '#10B981' },
  { Icon: Target,     key: 'goals',    color: '#8B5CF6' },
  { Icon: Flame,      key: 'habits',   color: '#F59E0B' },
  { Icon: Zap,        key: 'brain',    color: '#F4705A' },
] as const

export function LifeOSSection() {
  const t = useLandingT().life
  useEffect(() => {
    if (typeof gsap === 'undefined' || reducedMotion()) return
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
          }}>{t.label}</p>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(32px,5vw,56px)', color: '#fff',
            lineHeight: 1.1, margin: '0 0 16px',
          }} data-split><SplitText text={t.title} />{' '}
            <em data-word className="ml-shine" style={{ color: 'var(--ml-salmon)', fontStyle: 'italic', display: 'inline-block' }}>{t.titleAccent}</em>
          </h2>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '17px',
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
            maxWidth: '520px', margin: '0 auto',
          }}>{t.subtitle}</p>
        </div>

        {/* Module cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '56px',
        }}>
          {MODULES.map(({ Icon, key, color }) => (
            <div
              key={key}
              data-life-card
              data-tilt
              className="liquid-glass"
              style={{
                padding: '28px 22px',
                background: 'rgba(15,17,21,0.97)',
                border: `1px solid rgba(255,255,255,0.07)`,
                transition: 'border-color 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
            >
              <span className="ml-spot" aria-hidden="true" />
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
              }}>{t[key]}</h3>
              <p style={{
                fontFamily: 'var(--font-jakarta)', fontSize: '13px',
                color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, margin: 0,
              }}>{t[`${key}Copy`]}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div data-life-cta style={{ textAlign: 'center' }}>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <ShimmerButton magnetic style={{ padding: '14px 36px', fontSize: '15px', borderRadius: '50px' }}>
              {t.cta}
            </ShimmerButton>
          </Link>
        </div>

      </div>
    </section>
  )
}
