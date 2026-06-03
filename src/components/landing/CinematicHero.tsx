import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import FlowFieldBackground from '@/components/ui/flow-field-background'

declare const gsap: any

export function CinematicHero() {
  const sectionRef    = useRef<HTMLElement>(null)
  const introRef      = useRef<HTMLDivElement>(null)
  const cardRef       = useRef<HTMLDivElement>(null)
  const phoneContRef  = useRef<HTMLDivElement>(null)
  const badgeLeftRef  = useRef<HTMLDivElement>(null)
  const badgeRightRef = useRef<HTMLDivElement>(null)
  const metricRef     = useRef<HTMLDivElement>(null)
  const ctaRef        = useRef<HTMLDivElement>(null)
  const counterRef    = useRef<HTMLSpanElement>(null)
  const phoneRef      = useRef<HTMLDivElement>(null)
  const tlRef         = useRef<any>(null)

  /* ── ScrollTrigger pinned timeline ── */
  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return
    gsap.registerPlugin(ST)

    if (window.innerWidth <= 768) {
      // Mobile: simple fade-in, no pin, no scrub
      gsap.fromTo(introRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
      )
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: cardRef.current, start: 'top 82%' }
        }
      )
      gsap.fromTo(metricRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6,
          scrollTrigger: {
            trigger: metricRef.current, start: 'top 85%',
            onEnter: () => {
              if (counterRef.current) {
                gsap.to(counterRef.current, {
                  textContent: 1240, duration: 1.5,
                  snap: { textContent: 1 }, ease: 'power2.out',
                })
              }
            },
          }
        }
      )
      gsap.fromTo(ctaRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: ctaRef.current, start: 'top 82%' }
        }
      )
      return
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=300%',
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

    // Phone aparece dentro de la card
    tl.fromTo(phoneContRef.current,
      { opacity: 0, y: 100, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4 },
      '-=0.2'
    )

    // Badges flotan
    tl.fromTo(badgeLeftRef.current,
      { opacity: 0, x: -60, y: 20 },
      { opacity: 1, x: 0, y: 0, duration: 0.3 },
      '-=0.2'
    )
    tl.fromTo(badgeRightRef.current,
      { opacity: 0, x: 60, y: -20 },
      { opacity: 1, x: 0, y: 0, duration: 0.3 },
      '-=0.2'
    )

    // Counter anima de 0 a 1240
    tl.fromTo(metricRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, duration: 0.3,
        onStart: () => {
          if (counterRef.current) {
            gsap.to(counterRef.current, {
              textContent: 1240,
              duration: 1.5,
              snap: { textContent: 1 },
              ease: 'power2.out',
              overwrite: true,
            })
          }
        }
      }
    )

    // FASE 2→3: card se achica, CTAs aparecen
    tl.to(cardRef.current, { scale: 0.85, y: -60, opacity: 0.6, duration: 0.4 })
    tl.fromTo(ctaRef.current,
      { opacity: 0, y: 80 },
      { opacity: 1, y: 0, duration: 0.4 },
      '-=0.2'
    )

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [])

  /* ── Parallax del phone con mouse ── */
  useEffect(() => {
    const phone = phoneRef.current
    if (!phone) return

    function onMouseMove(e: MouseEvent) {
      if (window.innerWidth < 768 || !phone) return
      const rect = phone.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const rotY = ((e.clientX - cx) / window.innerWidth) * 12
      const rotX = ((e.clientY - cy) / window.innerHeight) * -8
      gsap.to(phone, {
        rotateX: rotX, rotateY: rotY, transformPerspective: 1200,
        duration: 0.1, ease: 'none', overwrite: true,
      })
    }

    function onMouseLeave() {
      if (typeof gsap === 'undefined' || !phone) return
      gsap.to(phone, {
        rotateX: 0, rotateY: 0,
        duration: 0.6, ease: 'power2.out', overwrite: true,
      })
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    phone.addEventListener('mouseleave', onMouseLeave)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      phone?.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  return (
    <section ref={sectionRef} className="ch-section">

      {/* Fondo de partículas — solo cubre la primera pantalla */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <FlowFieldBackground
          color="#F4705A"
          trailOpacity={0.08}
          particleCount={isMobile ? 200 : 400}
          speed={0.6}
        />
        {/* Gradiente que desvanece las partículas hacia abajo */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '35%',
          background: 'linear-gradient(to bottom, transparent, #0F1115)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* FASE 1: Intro */}
      <div ref={introRef} className="ch-intro">
        <p className="ch-label">PLATAFORMA GASTRONÓMICA</p>
        <h1>
          <span className="ch-line1">El sistema operativo</span>
          <span className="ch-line2">del negocio moderno.</span>
        </h1>
        <p className="ch-subtitle">
          Menús, pagos, herramientas para mozos y experiencias para clientes
          — unificados en una sola plataforma premium.
        </p>

        <div className="ch-scroll-hint">
          <span>Scroll</span>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>

      {/* FASE 2: Card que sube con scroll */}
      <div ref={cardRef} className="ch-card">
        <div className="ch-card-content">
          <h2 className="ch-card-heading">Todo el restaurante, una sola pantalla.</h2>
          <p className="ch-card-description">
            <strong>Tu plataforma</strong> unifica el menú digital QR, pagos,
            gestión de mozos y la experiencia del cliente — sin apps que instalar.
          </p>
        </div>

        {/* iPhone mockup */}
        <div ref={phoneContRef} className="ch-phone-container">
          <div ref={phoneRef} className="liquid-glass-phone ch-phone-frame">
            <div className="ch-phone-notch" />
            <div className="ch-phone-screen">
              <iframe src="/r/test-restaurant" title="MenuLife Demo" />
            </div>
          </div>

          {/* Floating badges */}
          <div ref={badgeLeftRef} className="floating-badge ch-badge-left">
            <span className="ch-badge-title">🧾 Nuevo pedido</span>
            <span>Mesa 4 — 3 items</span>
          </div>
          <div ref={badgeRightRef} className="floating-badge ch-badge-right">
            <span className="ch-badge-title">💳 Pago recibido</span>
            <span>$48.000 — MercadoPago</span>
          </div>
        </div>

        {/* Metric counter */}
        <div ref={metricRef} className="ch-metric-counter">
          <span ref={counterRef} className="ch-metric-value">0</span>
          <span className="ch-metric-label">Pedidos este mes</span>
        </div>
      </div>

      {/* FASE 3: CTAs */}
      <div ref={ctaRef} className="ch-cta">
        <h2>Empezá hoy mismo.</h2>
        <p>
          Menú digital listo en minutos. Sin app. Sin complicaciones.
          Onboarding por WhatsApp.
        </p>
        <div className="ch-cta-buttons">
          <Link to="/solicitar-acceso" className="liquid-glass-btn ch-cta-btn">
            <span>Solicitar acceso →</span>
          </Link>
          <Link to="/r/test-restaurant" className="liquid-glass-btn-ghost ch-cta-btn">
            <span>Ver demo</span>
          </Link>
        </div>
        <div className="ch-trust-badges">
          <span>✓ Sin app</span>
          <span>✓ Listo en minutos</span>
          <span>✓ Pagos móviles</span>
          <span>✓ Onboarding por WhatsApp</span>
        </div>
      </div>

    </section>
  )
}
