import { useEffect, useRef } from 'react'
// Primero: deja gsap y ScrollTrigger disponibles para las secciones
import '@/components/landing/landingLibs'
import '@/components/landing/landing-motion.css'
import { reducedMotion, useLandingMotion } from '@/components/landing/motion'
import { ScrollProgress }       from '@/components/landing/ScrollProgress'
import { LanguageMarquee }      from '@/components/landing/LanguageMarquee'
import { useAppLang }           from '@/i18n/app/store'
import { Navbar }               from '@/components/landing/Navbar'
import { CinematicHero }        from '@/components/landing/CinematicHero'
import { FragmentationSection } from '@/components/landing/FragmentationSection'
import { SolutionSection }      from '@/components/landing/SolutionSection'
import { LifeOSSection }        from '@/components/landing/LifeOSSection'
import { BusinessSection }      from '@/components/landing/BusinessSection'
import { TestimonialsSection }  from '@/components/landing/TestimonialsSection'
import { PricingSection }       from '@/components/landing/PricingSection'
import { VisionSection }        from '@/components/landing/VisionSection'
import { FinalCTA }             from '@/components/landing/FinalCTA'
import { FAQSection }           from '@/components/landing/FAQSection'
import { Footer }               from '@/components/landing/Footer'
import { ReferralHeroSection } from '@/components/landing/ReferralHeroSection'
import { useLandingLocale }     from '../lib/useLandingLocale'

export function LandingPage() {
  useLandingLocale()
  const rootRef = useRef<HTMLDivElement>(null)
  const lang = useAppLang(s => s.lang)
  useLandingMotion(rootRef, lang)
  // Anclas (#soluciones, #pricing, #faq) con desplazamiento suave por JS. No se usa `scroll-behavior: smooth` en <html>:
  // con el hero fijado por ScrollTrigger hace que el scroll se trabe y salte.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]')
      const id = a?.getAttribute('href')?.slice(1)
      const target = id ? document.getElementById(id) : null
      if (!target) return
      e.preventDefault()
      target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
      history.replaceState(history.state, '', `#${id}`)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <div ref={rootRef} style={{ background: 'var(--ml-dark)', minHeight: '100vh' }}>
      <ScrollProgress />
      <Navbar />

      <main>
        {/* Referral section — solo cuando llega con ?ref=hub&from=X */}
        <ReferralHeroSection />

        {/* Section 1 — Hero */}
        <CinematicHero />

        {/* Cinta con los 12 idiomas */}
        <LanguageMarquee />

        {/* Section 2 — Problema / Fragmentación */}
        <FragmentationSection />

        {/* Section 3 — Solución / Todo conectado */}
        <div id="soluciones">
          <SolutionSection />
        </div>

        {/* Section 4 — Mycen Personal / Life OS */}
        <LifeOSSection />

        {/* Section 5 — Mycen Business */}
        <BusinessSection />

        {/* Testimonios reales (si no hay, no se muestra) */}
        <TestimonialsSection />

        {/* Section 6 — Pricing */}
        <div id="pricing">
          <PricingSection />
        </div>

        {/* Section 7 — Visión */}
        <VisionSection />

        {/* Section 8 — CTA Final */}
        <FinalCTA />

        {/* Section 9 — FAQ */}
        <FAQSection />
      </main>

      <Footer />
    </div>
  )
}
