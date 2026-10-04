import { useEffect, useState } from 'react'
import { useLandingT } from '@/i18n/app/landing'
import { useAppLang } from '@/i18n/app/store'
import { supabase } from '@/lib/supabase'
import { StaggerTestimonials, type Testimonial } from '@/components/ui/stagger-testimonials'

declare const gsap: any

// Sólo testimonios reales (tabla `testimonials`); si no hay, la sección no se muestra (CLAUDE.md: nada inventado).
export function TestimonialsSection() {
  const t = useLandingT().testimonials
  const appLang = useAppLang(s => s.lang)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('testimonials')
      .select('id, name, role, business, content, content_en, avatar_url')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }: { data: Testimonial[] | null }) => {
        if (data && data.length > 0) setTestimonials(data)
      })
  }, [])

  const hasAny = testimonials.length > 0
  useEffect(() => {
    if (!hasAny || typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return
    gsap.fromTo('[data-test-title]',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-test-title]', start: 'top 85%' } })
  }, [hasAny])

  if (!hasAny) return null
  const lang = appLang === 'es' ? 'es' : 'en'

  return (
    <section style={{
      background: `
        radial-gradient(ellipse 50% 40% at 50% 0%, rgba(244,112,90,0.06) 0%, transparent 50%),
        linear-gradient(180deg, #0F1115 0%, #161a22 50%, #0F1115 100%)
      `,
      padding: '96px 0',
    }}>
      {/* Header */}
      <div data-test-title style={{ textAlign: 'center', marginBottom: '64px', padding: '0 24px' }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--ml-salmon)',
          fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
        }}>
          {t.label}
        </p>
        <h2 style={{
          fontFamily: 'var(--font-syne)', fontWeight: 800,
          fontSize: 'clamp(36px,5vw,56px)', color: '#fff', lineHeight: 1.1, margin: 0,
        }}>
          {t.title}{' '}
          <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>
            {t.titleAccent}
          </em>
        </h2>
      </div>

      <StaggerTestimonials testimonials={testimonials} lang={lang} />
    </section>
  )
}
