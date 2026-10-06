import { useEffect, useRef } from 'react'

import { useLandingT } from '@/i18n/app/landing'

import { reducedMotion } from './motion'
import { SplitText } from './SplitText'

declare const gsap: any

export function VisionSection() {
  const t = useLandingT().vision
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (typeof gsap === 'undefined' || reducedMotion()) return
    const ST = (window as any).ScrollTrigger
    if (!ST) return


    gsap.fromTo('[data-vision-body]',
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out',
        scrollTrigger: { trigger: '[data-vision-body]', start: 'top 84%' } })
  }, [])

  return (
    <section style={{
      background: `
        radial-gradient(ellipse 60% 50% at 50% 50%, rgba(244,112,90,0.06) 0%, transparent 60%),
        linear-gradient(180deg, #0F1115 0%, #161a22 50%, #0F1115 100%)
      `,
      padding: '112px 24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <p style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--ml-salmon)',
          fontFamily: 'var(--font-jakarta)', marginBottom: '24px',
        }}>{t.label}</p>

        <h2 ref={titleRef} data-split style={{
          fontFamily: 'var(--font-syne)', fontWeight: 800,
          fontSize: 'clamp(32px,5vw,60px)',
          color: '#fff', lineHeight: 1.08,
          marginBottom: '28px', letterSpacing: '-0.02em',
        }}>
          <SplitText text={t.title} />{' '}
          <em data-word className="ml-shine" style={{ color: 'var(--ml-salmon)', fontStyle: 'normal', display: 'inline-block' }}>{t.titleAccent}</em>
        </h2>

        <p data-vision-body style={{
          fontFamily: 'var(--font-jakarta)',
          fontWeight: 300,
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.7,
          maxWidth: '640px',
          margin: '0 auto',
        }}>
          {t.body}
        </p>

      </div>
    </section>
  )
}
