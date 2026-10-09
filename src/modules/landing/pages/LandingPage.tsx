import { useEffect, useRef, useState } from 'react'
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
import { StructuresSection }    from '@/components/landing/StructuresSection'
import { BusinessSection }      from '@/components/landing/BusinessSection'
import { TestimonialsSection }  from '@/components/landing/TestimonialsSection'
import { PricingSection }       from '@/components/landing/PricingSection'
import { VisionSection }        from '@/components/landing/VisionSection'
import { FinalCTA }             from '@/components/landing/FinalCTA'
import { FAQSection }           from '@/components/landing/FAQSection'
import { Footer }               from '@/components/landing/Footer'
import { ReferralHeroSection } from '@/components/landing/ReferralHeroSection'
import { useLandingLocale }     from '../lib/useLandingLocale'

/** Secciones que se dibujan después del hero (ver `shown`) */
const REST = 11

export function LandingPage() {
  useLandingLocale()
  const rootRef = useRef<HTMLDivElement>(null)
  const lang = useAppLang(s => s.lang)
  // Rendimiento (V1 · etapa 13): primero se dibuja el hero y después, de a una sección por tarea, el resto. Así el
  // celular no queda trabado dibujando toda la página de una vez. Con un ancla (#pricing) se dibuja todo de entrada.
  const [shown, setShown] = useState(() => (typeof window !== 'undefined' && window.location.hash ? REST : 0))
  useEffect(() => {
    if (shown >= REST) return
    const id = window.setTimeout(() => setShown(n => n + 1), shown === 0 ? 50 : 0)
    return () => window.clearTimeout(id)
  }, [shown])
  const ready = shown >= REST
  // Los efectos de movimiento se enganchan cuando ya está toda la página
  useLandingMotion(rootRef, ready ? lang : null)
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

        {/* Section 1 — Hero (se dibuja primero; el resto entra de a una sección por tarea) */}
        <CinematicHero />

        {/* Cinta con los 12 idiomas */}
        {shown > 0 && <LanguageMarquee />}

        {/* Section 2 — Problema / Fragmentación */}
        {shown > 1 && <FragmentationSection />}

        {/* Section 3 — Solución / Todo conectado */}
        {shown > 2 && <div id="soluciones"><SolutionSection /></div>}

        {/* Las cinco estructuras del perfil y los dos temas (imágenes de ejemplo) */}
        {shown > 3 && <StructuresSection />}

        {/* Section 4 — Mycen Personal / Life OS (con "Mi día") */}
        {shown > 4 && <LifeOSSection />}

        {/* Section 5 — Mycen Business */}
        {shown > 5 && <BusinessSection />}

        {/* Testimonios reales (si no hay, no se muestra) */}
        {shown > 6 && <TestimonialsSection />}

        {/* Section 6 — Pricing */}
        {shown > 7 && <div id="pricing"><PricingSection /></div>}

        {/* Section 7 — Visión */}
        {shown > 8 && <VisionSection />}

        {/* Section 8 — CTA Final */}
        {shown > 9 && <FinalCTA />}

        {/* Section 9 — FAQ */}
        {shown > 10 && <FAQSection />}
      </main>

      {ready && <Footer />}
    </div>
  )
}
