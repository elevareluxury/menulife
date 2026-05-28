import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ShimmerButton } from './Navbar'

declare const gsap: any
declare const Splitting: any
declare const THREE: any

export function HeroSection() {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const phoneCenterRef = useRef<HTMLDivElement>(null)
  const phoneLeftRef   = useRef<HTMLDivElement>(null)
  const phoneRightRef  = useRef<HTMLDivElement>(null)
  const titleRef       = useRef<HTMLHeadingElement>(null)
  const sectionRef     = useRef<HTMLElement>(null)

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

  /* Phone parallax */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth  - 0.5) * 12
      const y = (e.clientY / window.innerHeight - 0.5) * 8
      if (phoneCenterRef.current)
        phoneCenterRef.current.style.transform = `rotateY(${5 + x * 0.8}deg) rotateX(${-y * 0.5}deg) translateZ(0)`
      if (phoneLeftRef.current)
        phoneLeftRef.current.style.transform   = `rotateY(${-15 + x * 1.2}deg) rotateX(${-y * 0.3}deg) translateZ(-80px)`
      if (phoneRightRef.current)
        phoneRightRef.current.style.transform  = `rotateY(${20 + x * 0.6}deg) rotateX(${-y * 0.4}deg) translateZ(-40px)`
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  /* GSAP entrance */
  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const tl = gsap.timeline({ delay: 0.3 })

    tl.fromTo('[data-hero-badge]',  { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.2)

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

    const phones = [phoneLeftRef.current, phoneCenterRef.current, phoneRightRef.current].filter(Boolean)
    if (phones.length) {
      tl.fromTo(phones, { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.15, ease: 'power3.out' }, 0.8)
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
          <div data-hero-badge style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', background: 'rgba(244,112,90,0.12)',
            border: '1px solid rgba(244,112,90,0.3)', borderRadius: '50px', marginBottom: '28px',
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ml-salmon)', display: 'inline-block' }} />
            <span style={{ color: 'var(--ml-salmon)', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-jakarta)', letterSpacing: '0.04em' }}>
              Sistema de Hospitalidad Digital
            </span>
          </div>

          <h1 ref={titleRef} style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(48px, 6.5vw, 96px)',
            lineHeight: 1.04, color: '#fff',
            marginBottom: '24px', letterSpacing: '-0.03em',
          }}>
            El sistema operativo{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>del negocio moderno.</em>
          </h1>

          <p data-hero-sub style={{
            fontFamily: 'var(--font-jakarta)', fontWeight: 300, fontSize: '18px',
            lineHeight: 1.65, color: 'rgba(255,255,255,0.62)',
            marginBottom: '36px', maxWidth: '460px',
          }}>
            Menús, pagos, herramientas para mozos y experiencias para clientes — unificados en una sola plataforma premium.
          </p>

          <div data-hero-ctas style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '32px' }}>
            <Link to="/solicitar-acceso" style={{ textDecoration: 'none' }}>
              <ShimmerButton style={{ padding: '15px 32px', fontSize: '15px', borderRadius: '50px' }}>
                Solicitar acceso →
              </ShimmerButton>
            </Link>
            <button style={{
              padding: '15px 28px', borderRadius: '50px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
              color: 'rgba(255,255,255,0.75)', fontSize: '15px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-jakarta)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
            >Reservar demo</button>
          </div>

          <div data-hero-trust style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {['Sin app', 'Listo en minutos', 'Pagos móviles', 'Onboarding por WhatsApp'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.42)', fontFamily: 'var(--font-jakarta)' }}>
                <span style={{ color: 'var(--ml-salmon)', fontWeight: 700, fontSize: '11px' }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>

        {/* Right: 3D phones */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: '560px', perspective: '1200px', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(244,112,90,0.18) 0%, transparent 70%)',
            filter: 'blur(24px)', pointerEvents: 'none',
          }} />

          {/* Left phone */}
          <div ref={phoneLeftRef} style={{
            position: 'absolute', left: '10px',
            transform: 'rotateY(-15deg) translateZ(-80px)',
            transition: 'transform 0.12s ease-out', opacity: 0,
          }}>
            <PhoneShell w={190} h={380}><WaiterContent /></PhoneShell>
          </div>

          {/* Center phone */}
          <div ref={phoneCenterRef} style={{
            position: 'relative',
            transform: 'rotateY(5deg) translateZ(0)',
            transition: 'transform 0.12s ease-out',
            filter: 'drop-shadow(0 0 40px rgba(244,112,90,0.28))',
            opacity: 0,
          }}>
            <PhoneShell w={232} h={464}><MenuContent /></PhoneShell>
          </div>

          {/* Right phone */}
          <div ref={phoneRightRef} style={{
            position: 'absolute', right: '10px',
            transform: 'rotateY(20deg) translateZ(-40px)',
            transition: 'transform 0.12s ease-out', opacity: 0,
          }}>
            <PhoneShell w={208} h={416}><DashContent /></PhoneShell>
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

function PhoneShell({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  return (
    <div style={{
      width: `${w}px`, height: `${h}px`,
      borderRadius: '34px', border: '2px solid rgba(255,255,255,0.12)',
      background: '#12151c', overflow: 'hidden', position: 'relative',
      boxShadow: '0 28px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      <div style={{
        position: 'absolute', top: '10px', left: '50%',
        transform: 'translateX(-50%)', width: '50px', height: '13px',
        background: '#0a0c10', borderRadius: '20px', zIndex: 10,
      }} />
      <div style={{ paddingTop: '28px', height: '100%', overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

function WaiterContent() {
  const mesas = [
    { n: '1', st: 'Libre',   c: 'free' }, { n: '2', st: 'Ocupada', c: 'occ' },
    { n: '3', st: 'Ocupada', c: 'occ' },  { n: '4', st: '¡Pago!',  c: 'pay' },
    { n: '5', st: 'Ocupada', c: 'occ' },  { n: '6', st: 'Libre',   c: 'free' },
  ]
  const col = (c: string) => ({
    free: { bg: 'rgba(255,255,255,0.04)', br: 'rgba(255,255,255,0.07)', tx: 'rgba(255,255,255,0.35)' },
    occ:  { bg: 'rgba(244,112,90,0.12)',  br: 'rgba(244,112,90,0.28)',  tx: '#f8957f' },
    pay:  { bg: 'rgba(245,158,11,0.12)',  br: 'rgba(245,158,11,0.28)',  tx: '#F59E0B' },
  }[c] ?? { bg: '', br: '', tx: '' })

  return (
    <div style={{ height: '100%', background: '#0F1115', padding: '8px', fontFamily: 'var(--font-jakarta)' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
        MenuLife <span style={{ background: 'var(--ml-salmon)', color: '#fff', borderRadius: '4px', padding: '1px 5px', fontSize: '7px', marginLeft: '4px' }}>MOZO</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
        {mesas.map(m => {
          const c = col(m.c)
          return (
            <div key={m.n} style={{ background: c.bg, border: `1px solid ${c.br}`, borderRadius: '8px', padding: '6px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: c.tx }}>{m.n}</div>
              <div style={{ fontSize: '8px', color: c.tx, opacity: 0.85 }}>{m.st}</div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: '8px', background: 'rgba(244,112,90,0.1)', border: '1px solid rgba(244,112,90,0.2)', borderRadius: '8px', padding: '6px 8px' }}>
        <div style={{ fontSize: '9px', color: 'var(--ml-salmon)', fontWeight: 600 }}>🔔 Mesa 5 — pide cuenta</div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>hace 1 min</div>
      </div>
    </div>
  )
}

function MenuContent() {
  return (
    <div style={{ height: '100%', background: '#fff', fontFamily: 'var(--font-jakarta)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0F1115', padding: '8px 10px', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>La Trattoria</div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)' }}>Menú digital · Mesa 5</div>
      </div>
      <div style={{ display: 'flex', gap: '5px', padding: '6px 8px', background: '#fafafa', flexShrink: 0 }}>
        {['Pastas', 'Carnes', 'Postres'].map((c, i) => (
          <span key={c} style={{
            padding: '3px 8px', borderRadius: '50px', fontSize: '8px', fontWeight: 600, whiteSpace: 'nowrap',
            background: i === 0 ? 'var(--ml-salmon)' : 'rgba(244,112,90,0.1)',
            color: i === 0 ? '#fff' : 'var(--ml-salmon)',
          }}>{c}</span>
        ))}
      </div>
      <div style={{ flex: 1, padding: '4px 8px', overflow: 'hidden' }}>
        {[
          { e: '🍝', n: 'Pasta Carbonara', d: 'Panceta, parmesano', p: '$18' },
          { e: '🍋', n: 'Risotto Limone',  d: 'Limón, albahaca',    p: '$22' },
          { e: '🥩', n: 'Tagliata',        d: 'Rúcula, cherry',     p: '$34' },
        ].map(it => (
          <div key={it.n} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '14px' }}>{it.e}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#1a1a1a' }}>{it.n}</div>
              <div style={{ fontSize: '8px', color: '#aaa' }}>{it.d}</div>
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--ml-salmon)' }}>{it.p}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '6px 8px', flexShrink: 0 }}>
        <div style={{ background: 'var(--ml-salmon)', borderRadius: '50px', padding: '7px 10px', textAlign: 'center', fontSize: '9px', fontWeight: 700, color: '#fff' }}>
          Ver carrito · $40.00 →
        </div>
      </div>
    </div>
  )
}

function DashContent() {
  return (
    <div style={{ height: '100%', background: '#0F1115', fontFamily: 'var(--font-jakarta)', padding: '8px' }}>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.38)', marginBottom: '8px' }}>Buenos días, Carlos</div>
      <div style={{ background: 'linear-gradient(135deg,#161a22,#1e2433)', borderRadius: '10px', padding: '10px', textAlign: 'center', marginBottom: '8px', border: '1px solid rgba(244,112,90,0.14)' }}>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.38)', marginBottom: '4px' }}>Ingresos hoy</div>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#fff' }}>$2,840</div>
        <div style={{ fontSize: '9px', color: '#10B981', marginTop: '3px' }}>↑ +12% vs ayer</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
        {[['48','Cubiertos'],['$59','Ticket prom.'],['94%','Satisfac.'],['12','Reseñas']].map(([v,l]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '7px', padding: '5px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: '13px', fontWeight: 700, color: '#fff' }}>{v}</div>
            <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.38)' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '32px', padding: '0 2px' }}>
        {[35,52,44,78,65,90,72].map((h, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: '3px 3px 0 0',
            background: `linear-gradient(to top, var(--ml-salmon-dark), var(--ml-salmon))`,
            height: `${h}%`, opacity: i === 5 ? 1 : 0.5,
          }} />
        ))}
      </div>
    </div>
  )
}
