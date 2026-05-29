import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

declare const gsap: any

const T_META = [
  { key: 't1', initials: 'VM', color: '#F4705A' },
  { key: 't2', initials: 'RA', color: '#3B82F6' },
  { key: 't3', initials: 'SC', color: '#10B981' },
]

export function TestimonialsSection() {
  const { t } = useTranslation()
  const TESTIMONIALS = T_META.map(m => ({
    initials: m.initials,
    color: m.color,
    name: t(`testimonials.${m.key}_name`),
    negocio: t(`testimonials.${m.key}_biz`),
    quote: t(`testimonials.${m.key}_quote`),
  }))

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
            {t('testimonials.label')}
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(36px,5vw,56px)', color: '#fff', lineHeight: 1.1, margin: 0 }}>
            {t('testimonials.title')}{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>{t('testimonials.title_accent')}</em>
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

function TestimonialCard({ t }: { t: { initials: string; color: string; name: string; negocio: string; quote: string } }) {
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
