import { useEffect } from 'react'
import { Navbar }              from '@/components/landing/Navbar'
import { HeroSection }         from '@/components/landing/HeroSection'
import { TrustBand }           from '@/components/landing/TrustBand'
import { ExperiencesSection }  from '@/components/landing/ExperiencesSection'
import { FlowSection }         from '@/components/landing/FlowSection'
import { WhatsAppSection }     from '@/components/landing/WhatsAppSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { PricingSection }      from '@/components/landing/PricingSection'
import { FAQSection }          from '@/components/landing/FAQSection'
import { FinalCTA }            from '@/components/landing/FinalCTA'
import { Footer }              from '@/components/landing/Footer'

export function LandingPage() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    // Register ScrollTrigger once at app level
    const g = (window as any).gsap
    const ST = (window as any).ScrollTrigger
    if (g && ST) g.registerPlugin(ST)
    return () => { document.documentElement.style.scrollBehavior = 'auto' }
  }, [])

  return (
    <div style={{ background: 'var(--ml-dark)', overflowX: 'hidden', minHeight: '100vh' }}>
      <Navbar />

      <main>
        <HeroSection />
        <TrustBand />

        <div id="experiences">
          <ExperiencesSection />
        </div>

        <div id="flow">
          <FlowSection />
        </div>

        <div id="whatsapp">
          <WhatsAppSection />
        </div>

        <TestimonialsSection />

        <div id="pricing">
          <PricingSection />
        </div>

        <FAQSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  )
}
