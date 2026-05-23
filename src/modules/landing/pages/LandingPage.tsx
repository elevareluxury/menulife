import { useEffect } from 'react'
import { CustomCursor } from '@/components/landing/CustomCursor'
import { GrainOverlay } from '@/components/landing/GrainOverlay'
import { Navbar } from '@/components/landing/Navbar'
import { HeroSection } from '@/components/landing/HeroSection'
import { ExperiencesSection } from '@/components/landing/ExperiencesSection'
import { FlowSection } from '@/components/landing/FlowSection'
import { WhatsAppSection } from '@/components/landing/WhatsAppSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { Footer } from '@/components/landing/Footer'

export function LandingPage() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
    }
  }, [])

  return (
    <div className="min-h-screen bg-cream overflow-x-hidden">
      <CustomCursor />
      <GrainOverlay />
      <Navbar />

      <HeroSection />
      <div id="experiences">
        <ExperiencesSection />
      </div>
      <div id="flow">
        <FlowSection />
      </div>
      <div id="whatsapp">
        <WhatsAppSection />
      </div>
      <div id="pricing">
        <PricingSection />
      </div>
      <FinalCTA />
      <Footer />
    </div>
  )
}
