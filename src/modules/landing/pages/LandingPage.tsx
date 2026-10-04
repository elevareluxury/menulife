import { useEffect } from 'react'
// Primero: deja gsap, ScrollTrigger y Splitting disponibles para las secciones
import '@/components/landing/landingLibs'
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
import { useLandingLocale }     from '../lib/useLandingLocale'

export function LandingPage() {
  useLandingLocale()
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = 'auto' }
  }, [])

  return (
    <div style={{ background: 'var(--ml-dark)', overflowX: 'hidden', minHeight: '100vh' }}>
      <Navbar />

      <main>
        {/* Section 1 — Hero */}
        <CinematicHero />

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
