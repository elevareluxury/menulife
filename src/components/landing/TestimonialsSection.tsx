import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { StaggerTestimonials, type Testimonial } from '@/components/ui/stagger-testimonials'

declare const gsap: any

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: 'f1',
    name: 'Valeria Moreno',
    role: 'Dueña',
    business: 'Trattoria Bella, Rosario',
    content: 'Antes mis clientes me preguntaban el precio de todo y yo tenía que ir y venir. Ahora escanean el QR y piden solos. Las fotos del menú son hermosas y el botón de pago directo desde el celular cambió todo. Mis mesas rotan más rápido y las propinas subieron porque la experiencia es otra.',
    content_en: "Before, my customers would ask me the price of everything and I had to keep going back and forth. Now they scan the QR and order themselves. The menu photos are beautiful and the direct payment button changed everything. My tables turn over faster and tips went up.",
  },
  {
    id: 'f2',
    name: 'Rodrigo Altamirano',
    role: 'Dueño',
    business: 'Parrilla Don Rodrigo, Córdoba',
    content: 'Lo que más me gustó fue poder ver todo desde el celular mientras estoy en casa. Las ventas del día, qué platos vendí más, si hay algún problema en cocina. Antes tenía que estar físicamente en el local. Ahora con Mycen tengo el restaurante en el bolsillo, literalmente.',
    content_en: "What I liked most was being able to see everything from my phone while at home. The day's sales, which dishes sold most, if there's any issue in the kitchen. Before I had to be physically at the restaurant. Now with Mycen I have the restaurant in my pocket, literally.",
  },
  {
    id: 'f3',
    name: 'Sebastián Cruz',
    role: 'Dueño',
    business: 'Café del Puerto, Buenos Aires',
    content: 'Mis mozos aprendieron a usar el sistema en una tarde. Lo que me sorprendió es que lo manejan todo desde el celular — toman el pedido, lo mandan a cocina, cobran. Antes tenían comandas en papel que se perdían. Ahora todo está en tiempo real y no se equivocan más en los pedidos.',
    content_en: "My waiters learned the system in an afternoon. What surprised me is they manage everything from their phones — take orders, send them to the kitchen, collect payment. Before they had paper tickets that got lost. Now everything is real time and they no longer make order mistakes.",
  },
]

export function TestimonialsSection() {
  const { t, i18n } = useTranslation()
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('testimonials')
      .select('id, name, role, business, content, content_en, avatar_url')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }: { data: Testimonial[] | null; error: unknown }) => {
        if (error) console.error('[Testimonials] fetch error:', error)
        if (data && data.length > 0) setTestimonials(data)
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

      <StaggerTestimonials testimonials={testimonials} lang={lang} />
    </section>
  )
}
