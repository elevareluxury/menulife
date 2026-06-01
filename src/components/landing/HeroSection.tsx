import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShimmerButton } from './Navbar'

declare const gsap: any
declare const Splitting: any
declare const THREE: any

export function HeroSection() {
  const { t } = useTranslation()
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const phoneWrapRef = useRef<HTMLDivElement>(null)
  const phoneRef     = useRef<HTMLDivElement>(null)
  const titleRef     = useRef<HTMLHeadingElement>(null)
  const sectionRef   = useRef<HTMLElement>(null)

  /* Three.js particles */
  useEffect(() => {
    let frameId: number
    let renderer: any
    let cleanupFns: (() => void)[] = []

    const init = () => {
      if (typeof THREE === 'undefined' || !canvasRef.current) {
        const t = setTimeout(init, 120)
        cleanupFns.push(() => clearTimeout(t))
        return
      }
      const canvas = canvasRef.current
      const w = window.innerWidth
      const h = sectionRef.current?.offsetHeight || window.innerHeight

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
      camera.position.z = 4

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

      const makePts = (count: number, color: number, size: number, opacity: number) => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 14
        const geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity, sizeAttenuation: true })
        const pts = new THREE.Points(geom, mat)
        scene.add(pts)
        return pts
      }

      const white  = makePts(180, 0xffffff, 0.025, 0.45)
      const salmon = makePts(30,  0xF4705A, 0.04,  0.7)

      let mx = 0, my = 0
      const onMove = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth  - 0.5) * 0.02
        my = (e.clientY / window.innerHeight - 0.5) * 0.02
      }
      window.addEventListener('mousemove', onMove)

      const animate = () => {
        frameId = requestAnimationFrame(animate)
        white.rotation.y  += 0.00018
        salmon.rotation.y -= 0.00025
        camera.position.x += (mx - camera.position.x) * 0.04
        camera.position.y += (-my - camera.position.y) * 0.04
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        const nw = window.innerWidth
        const nh = sectionRef.current?.offsetHeight || window.innerHeight
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh)
      }
      window.addEventListener('resize', onResize)
      cleanupFns.push(
        () => window.removeEventListener('mousemove', onMove),
        () => window.removeEventListener('resize', onResize),
        () => cancelAnimationFrame(frameId),
        () => renderer.dispose(),
      )
    }

    init()
    return () => cleanupFns.forEach(f => f())
  }, [])

  /* Phone parallax - single 3D phone */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return
      const x = (e.clientX / window.innerWidth  - 0.5) * 12
      const y = (e.clientY / window.innerHeight - 0.5) * 8
      if (phoneRef.current) {
        phoneRef.current.style.transform =
          `perspective(1200px) rotateY(${-8 + x * 0.4}deg) rotateX(${3 - y * 0.3}deg)`
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  /* GSAP entrance */
  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const tl = gsap.timeline({ delay: 0.3 })

    if (typeof Splitting !== 'undefined' && titleRef.current) {
      const res = Splitting({ target: titleRef.current, by: 'words' })
      if (res?.[0]?.words?.length) {
        tl.fromTo(res[0].words,
          { opacity: 0, y: 30, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65, stagger: 0.06, ease: 'power3.out' }, 0.35)
      }
    }

    tl.fromTo('[data-hero-sub]',   { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.1)
      .fromTo('[data-hero-ctas]',  { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.3)
      .fromTo('[data-hero-trust]', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.5)

    if (phoneWrapRef.current) {
      tl.fromTo(phoneWrapRef.current, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' }, 0.8)
    }
  }, [])

  return (
    <section ref={sectionRef} style={{
      position:   'relative',
      minHeight:  '100vh',
      display:    'flex',
      alignItems: 'center',
      overflow:   'hidden',
      background: `
        radial-gradient(ellipse 70% 60% at 15% 60%, rgba(244,112,90,0.15) 0%, transparent 55%),
        radial-gradient(ellipse 50% 70% at 85% 30%, rgba(30,36,60,0.8) 0%, transparent 60%),
        #0F1115
      `,
      paddingTop: '68px',
    }}>
      <canvas ref={canvasRef} style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1280px', margin: '0 auto',
        padding: '60px 24px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)',
        gap: '48px', alignItems: 'center', width: '100%',
      }} className="lg:grid-cols-2 grid-cols-1">

        {/* Left */}
        <div style={{ maxWidth: '560px' }}>
          <h1 ref={titleRef} style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(48px, 6.5vw, 96px)',
            lineHeight: 1.04, color: '#fff',
            marginBottom: '24px', letterSpacing: '-0.03em',
          }}>
            {t('hero.title').split(/(del negocio moderno\.|for the modern business\.)/).map((part, i) =>
              i % 2 === 1
                ? <em key={i} style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>{part}</em>
                : part
            )}
          </h1>

          <p data-hero-sub style={{
            fontFamily: 'var(--font-jakarta)', fontWeight: 300, fontSize: '18px',
            lineHeight: 1.65, color: 'rgba(255,255,255,0.62)',
            marginBottom: '36px', maxWidth: '460px',
          }}>
            {t('hero.subtitle')}
          </p>

          <div data-hero-ctas style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '32px' }}>
            <Link to="/solicitar-acceso" style={{ textDecoration: 'none' }}>
              <ShimmerButton style={{ padding: '15px 32px', fontSize: '15px', borderRadius: '50px' }}>
                {t('hero.cta_primary')}
              </ShimmerButton>
            </Link>
            <a
              href="mailto:contacto@menulife.digital"
              style={{
                padding: '15px 28px', borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
                color: 'rgba(255,255,255,0.75)', fontSize: '15px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-jakarta)',
                textDecoration: 'none', display: 'inline-block',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
            >
              {t('hero.cta_secondary')}
            </a>
          </div>

          <div data-hero-trust style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {(['trust_1', 'trust_2', 'trust_3', 'trust_4'] as const).map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.42)', fontFamily: 'var(--font-jakarta)' }}>
                <span style={{ color: 'var(--ml-salmon)', fontWeight: 700, fontSize: '11px' }}>✓</span>{t(`hero.${key}`)}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Single 3D phone */}
        <div ref={phoneWrapRef} style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: '600px', position: 'relative', opacity: 0,
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(244,112,90,0.14) 0%, transparent 70%)',
            filter: 'blur(32px)', pointerEvents: 'none',
          }} />

          {/* Phone frame */}
          <div ref={phoneRef} style={{
            width: '280px',
            height: '560px',
            borderRadius: '36px',
            border: '8px solid #2a2a2a',
            background: '#000',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.1)',
            transform: 'perspective(1200px) rotateY(-8deg) rotateX(3deg)',
            transition: 'transform 0.1s ease-out',
            position: 'relative',
          }}>
            {/* Notch */}
            <div style={{
              position: 'absolute', top: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: '80px', height: '24px',
              background: '#111', borderRadius: '0 0 14px 14px',
              zIndex: 10,
            }} />
            <iframe
              src="/r/test-restaurant"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '28px' }}
              title="MenuLife Demo"
            />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute', bottom: '28px', left: '50%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-jakarta)',
        fontSize: '10px', letterSpacing: '0.15em', userSelect: 'none',
        animation: 'ml-scroll-arrow 2.5s ease-in-out infinite',
      }}>
        <span style={{ textTransform: 'uppercase' }}>Scroll</span>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  )
}
