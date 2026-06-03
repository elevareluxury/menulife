import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { StaggerTestimonials, type Testimonial } from '@/components/ui/stagger-testimonials'

declare const gsap: any

export function TestimonialsSection() {
  const { t, i18n } = useTranslation()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('testimonials')
      .select('id, name, role, business, content, content_en, avatar_url')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }: { data: Testimonial[] | null }) => {
        if (data) setTestimonials(data)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return
    gsap.fromTo('[data-test-title]',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-test-title]', start: 'top 85%' } })
  }, [])

  const lang = i18n.language?.startsWith('en') ? 'en' : 'es'

  return (
    <section style={{
      background: `
        radial-gradient(ellipse 50% 40% at 50% 0%, rgba(244,112,90,0.06) 0%, transparent 50%),
        linear-gradient(180deg, #0F1115 0%, #161a22 50%, #0F1115 100%)
      `,
      padding: '96px 0',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div data-test-title style={{ textAlign: 'center', marginBottom: '64px', padding: '0 24px' }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--ml-salmon)',
          fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
        }}>
          {t('testimonials.label')}
        </p>
        <h2 style={{
          fontFamily: 'var(--font-syne)', fontWeight: 800,
          fontSize: 'clamp(36px,5vw,56px)', color: '#fff', lineHeight: 1.1, margin: 0,
        }}>
          {t('testimonials.title')}{' '}
          <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>
            {t('testimonials.title_accent')}
          </em>
        </h2>
      </div>

      {/* Carrusel */}
      {loading ? (
        <div style={{ height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '3px solid rgba(244,112,90,0.3)',
            borderTopColor: '#F4705A',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      ) : testimonials.length > 0 ? (
        <StaggerTestimonials testimonials={testimonials} lang={lang} />
      ) : null}
    </section>
  )
}
