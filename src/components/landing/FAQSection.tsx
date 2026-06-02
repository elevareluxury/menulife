import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

declare const gsap: any

export function FAQSection() {
  const { t } = useTranslation()
  const [open, setOpen] = useState<number | null>(null)

  const FAQS = [1,2,3,4,5,6,7,8].map(n => ({
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`),
  }))

  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo('[data-faq-title]',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-faq-title]', start: 'top 85%' } })

    gsap.fromTo('[data-faq-item]',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out',
        scrollTrigger: { trigger: '[data-faq-item]', start: 'top 84%' } })
  }, [])

  return (
    <section style={{ background: `radial-gradient(ellipse 50% 60% at 50% 100%, rgba(244,112,90,0.04) 0%, transparent 55%), var(--ml-off-white)`, padding: '96px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {/* Header */}
        <div data-faq-title style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '12px' }}>
            {t('faq.label')}
          </p>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 'clamp(32px,4.5vw,48px)', color: '#1a1a1a', lineHeight: 1.1, margin: 0 }}>
            {t('faq.title')}{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>{t('faq.title_accent')}</em>
          </h2>
        </div>

        {/* Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}

        </div>
      </div>
    </section>
  )
}

function FAQItem({ faq, isOpen, onToggle }: {
  faq: { q: string; a: string }
  isOpen: boolean
  onToggle: () => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)

  return (
    <div
      data-faq-item
      className="liquid-glass-light"
      style={{
        borderLeft: isOpen ? '3px solid var(--ml-salmon)' : '3px solid transparent',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width:      '100%', textAlign: 'left',
          padding:    '20px 16px 20px 20px',
          background: 'transparent', border: 'none',
          cursor:     'pointer',
          display:    'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px',
          color: isOpen ? 'var(--ml-salmon)' : '#1a1a1a',
          transition: 'color 0.25s', lineHeight: 1.35,
        }}>{faq.q}</span>

        <span style={{
          width: '28px', height: '28px', flexShrink: 0,
          borderRadius: '50%',
          border: `1.5px solid ${isOpen ? 'var(--ml-salmon)' : 'rgba(0,0,0,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          color: isOpen ? 'var(--ml-salmon)' : '#aaa',
          fontSize: '18px', lineHeight: 1,
        }}>+</span>
      </button>

      {/* Answer — smooth height animation */}
      <div style={{
        maxHeight:  isOpen ? '400px' : '0',
        overflow:   'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div ref={bodyRef} style={{
          padding:    '0 20px 20px 20px',
          fontFamily: 'var(--font-jakarta)',
          fontSize:   '15px',
          fontWeight: 300,
          color:      'var(--ml-gray-500)',
          lineHeight: 1.7,
        }}>
          {faq.a}
        </div>
      </div>
    </div>
  )
}
