import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Huella } from '@/design/components/Huella'
import '@/design/motion.css'
import { useLandingT } from '@/i18n/app/landing'
import { SplitText } from './SplitText'

import { reducedMotion } from './motion'

declare const gsap: any

export function CinematicHero() {
  const l = useLandingT()
  const sectionRef = useRef<HTMLElement>(null)
  const introRef   = useRef<HTMLDivElement>(null)
  const cardRef    = useRef<HTMLDivElement>(null)
  const tlRef      = useRef<any>(null)

  // Saca el esqueleto estático del hero (index.html, scripts/heroShell.ts): desde acá se ve el de React
  useEffect(() => { document.getElementById('boot-hero')?.remove() }, [])

  /* ── ScrollTrigger pinned timeline ── */
  useEffect(() => {
    if (typeof gsap === 'undefined' || reducedMotion()) return
    const ST = (window as any).ScrollTrigger
    if (!ST) return
    gsap.registerPlugin(ST)

    if (window.innerWidth <= 768) {
      // El título y el texto se ven de entrada (sin animarlos): es lo primero que se lee y lo que mide la carga
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: cardRef.current, start: 'top 82%' }
        }
      )
      return
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=250%',
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      }
    })
    tlRef.current = tl

    // FASE 1→2: título se va, card sube
    tl.to(introRef.current, { opacity: 0, y: -100, duration: 0.3 })
      .fromTo(cardRef.current,
        { y: '100vh', scale: 0.8, borderRadius: '40px' },
        { y: 0, scale: 1, borderRadius: '24px', duration: 0.5 },
        '-=0.1'
      )

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [])

  return (
    <section ref={sectionRef} className="ch-section">

      {/* Fondo: el cielo de Universo con una huella grande (V1 · etapa 13). Sólo cubre la primera pantalla. La huella
          gira lento con transform (sin "reducir movimiento"); nada de canvas. */}
      <div aria-hidden="true" data-mycen-theme="universo" className="my-sky ch-sky">
        <div className="ch-huella">
          <Huella seed="mycen" variant="orbitas" spin draw />
        </div>
        <div className="ch-sky-fade" />
      </div>

      {/* FASE 1: Intro */}
      <div ref={introRef} className="ch-intro">
        <h1>
          <span className="ch-line1"><SplitText text={l.hero.line1} /></span>
          <span className="ch-line2"><SplitText text={l.hero.line2} /></span>
        </h1>
        <p className="ch-subtitle">{l.hero.subtitle}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <button data-magnetic className="liquid-glass-btn" style={{
              padding: '12px 28px', fontSize: '14px', fontWeight: 600,
              color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
              borderRadius: '50px',
            }}>
              <span>{l.hero.cta}</span>
            </button>
          </Link>
          <a href="#soluciones" style={{ textDecoration: 'none' }}>
            <button data-magnetic className="liquid-glass-btn-ghost" style={{
              padding: '12px 24px', fontSize: '14px', fontWeight: 500,
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
              borderRadius: '50px',
            }}>
              {l.hero.how}
            </button>
          </a>
        </div>
      </div>

      {/* FASE 2: Card que sube con scroll */}
      <div ref={cardRef} className="ch-card">
        <div className="ch-card-content">
          <h2 className="ch-card-heading" data-split><SplitText text={l.hero.cardTitle} /></h2>
          <p className="ch-card-description">
            <strong>Mycen</strong> {l.hero.cardText}
          </p>
        </div>

      </div>

    </section>
  )
}
