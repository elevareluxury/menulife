import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShimmerButton } from './Navbar'

declare const gsap: any
declare const Splitting: any

export function FinalCTA() {
  const { t } = useTranslation()
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    if (typeof Splitting !== 'undefined' && titleRef.current) {
      const res = Splitting({ target: titleRef.current, by: 'words' })
      if (res?.[0]?.words?.length) {
        gsap.fromTo(res[0].words,
          { opacity: 0, y: -30, filter: 'blur(6px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.07, ease: 'power3.out',
            scrollTrigger: { trigger: titleRef.current, start: 'top 80%' } })
      }
    }

    gsap.fromTo('[data-cta-sub]',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: '[data-cta-sub]', start: 'top 82%' } })

    gsap.fromTo('[data-cta-btns]',
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.65, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '[data-cta-btns]', start: 'top 84%' } })
  }, [])

  return (
    <section style={{
      background: `
        radial-gradient(ellipse 50% 40% at 50% 0%, rgba(244,112,90,0.06) 0%, transparent 50%),
        linear-gradient(180deg, #0F1115 0%, #161a22 50%, #0F1115 100%)
      `,
      padding:   '112px 24px',
      textAlign: 'center',
      position:  'relative',
      overflow:  'hidden',
    }}>
      {/* Ambient glow decorations */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(244,112,90,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      <div className="liquid-glass" style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '64px 48px' }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--ml-salmon)',
          fontFamily: 'var(--font-jakarta)', marginBottom: '20px',
        }}>{t('cta_final.label')}</p>

        <h2 ref={titleRef} style={{
          fontFamily:    'var(--font-syne)',
          fontWeight:    800,
          fontSize:      'clamp(44px, 7vw, 80px)',
          lineHeight:    1.06,
          color:         '#fff',
          marginBottom:  '20px',
          letterSpacing: '-0.03em',
        }}>
          {t('cta_final.title')}{' '}
          <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>{t('cta_final.title_accent')}</em>
        </h2>

        <p data-cta-sub style={{
          fontFamily:    'var(--font-jakarta)',
          fontWeight:    300,
          fontSize:      '18px',
          color:         'rgba(255,255,255,0.55)',
          lineHeight:    1.65,
          marginBottom:  '48px',
          maxWidth:      '560px',
          margin:        '0 auto 48px',
          whiteSpace:    'pre-line',
        }}>
          {t('cta_final.subtitle')}
        </p>

        <div data-cta-btns style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          <Link to="/solicitar-acceso" style={{ textDecoration: 'none' }}>
            <ShimmerButton style={{ padding: '16px 40px', fontSize: '16px', borderRadius: '50px' }}>
              {t('cta_final.cta_primary')}
            </ShimmerButton>
          </Link>
          <button className="liquid-glass-btn-ghost" style={{
            padding: '16px 36px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '16px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
          }}>
            <span>{t('cta_final.cta_secondary')}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
