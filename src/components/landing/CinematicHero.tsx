import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import FlowFieldBackground from '@/components/ui/flow-field-background'
import { HubPhonePreview } from './HubPhonePreview'

declare const gsap: any

export function CinematicHero() {
  const sectionRef    = useRef<HTMLElement>(null)
  const introRef      = useRef<HTMLDivElement>(null)
  const cardRef       = useRef<HTMLDivElement>(null)
  const phoneContRef  = useRef<HTMLDivElement>(null)
  const badgeLeftRef  = useRef<HTMLDivElement>(null)
  const badgeRightRef = useRef<HTMLDivElement>(null)
  const phoneRef      = useRef<HTMLDivElement>(null)
  const tlRef         = useRef<any>(null)

  /* ── ScrollTrigger pinned timeline ── */
  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return
    gsap.registerPlugin(ST)

    if (window.innerWidth <= 768) {
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
        <h1>
          <span className="ch-line1">Tu mundo digital</span>
          <span className="ch-line2">en un solo lugar.</span>
        </h1>
        <p className="ch-subtitle">
          Construye tu identidad digital, organiza tu vida y potencia tu negocio
          desde una única plataforma.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <button className="liquid-glass-btn" style={{
              padding: '12px 28px', fontSize: '14px', fontWeight: 600,
              color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
              borderRadius: '50px',
            }}>
              <span>Crear Mi Espacio Gratis →</span>
            </button>
          </Link>
          <a href="#soluciones" style={{ textDecoration: 'none' }}>
            <button className="liquid-glass-btn-ghost" style={{
              padding: '12px 24px', fontSize: '14px', fontWeight: 500,
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
              borderRadius: '50px',
            }}>
              Ver Soluciones
            </button>
          </a>
        </div>
      </div>

      {/* FASE 2: Card que sube con scroll */}
      <div ref={cardRef} className="ch-card">
        <div className="ch-card-content">
          <h2 className="ch-card-heading">Tu identidad digital, tu negocio y tu vida. Todo en uno.</h2>
          <p className="ch-card-description">
            <strong>Mycen</strong> unifica tu Hub Digital, tu sistema personal y tu
            plataforma de negocio — sin apps que instalar, sin silos.
          </p>
        </div>

        {/* iPhone mockup */}
        <div ref={phoneContRef} className="ch-phone-container">
          <div ref={phoneRef} className="liquid-glass-phone ch-phone-frame">
            <div className="ch-phone-notch" />
            <div className="ch-phone-screen">
              <HubPhonePreview />
            </div>
          </div>

          {/* Floating badges */}
          <div ref={badgeLeftRef} className="floating-badge ch-badge-left">
            <span className="ch-badge-title">✨ Hub creado</span>
            <span>mycen.digital/tu-perfil</span>
          </div>
          <div ref={badgeRightRef} className="floating-badge ch-badge-right">
            <span className="ch-badge-title">🎯 Meta alcanzada</span>
            <span>6/10 hábitos este mes</span>
          </div>
        </div>
      </div>

    </section>
  )
}
