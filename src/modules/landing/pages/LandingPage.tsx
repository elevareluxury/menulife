import { useEffect } from 'react'
import { Navbar }               from '@/components/landing/Navbar'
import { CinematicHero }        from '@/components/landing/CinematicHero'
import { TrustBand }            from '@/components/landing/TrustBand'
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

export function LandingPage() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    const g = (window as any).gsap
    const ST = (window as any).ScrollTrigger
    if (g && ST) g.registerPlugin(ST)
    return () => { document.documentElement.style.scrollBehavior = 'auto' }
  }, [])

  return (
    <div style={{ background: 'var(--ml-dark)', overflowX: 'hidden', minHeight: '100vh' }}>
      <Navbar />

      <main>
        {/* Referral section — solo cuando llega con ?ref=hub&from=X */}
        <ReferralHeroSection />

        {/* Section 1 — Hero */}
        <CinematicHero />

        {/* Trust band */}
        <TrustBand />

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

        {/* Social proof */}
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
