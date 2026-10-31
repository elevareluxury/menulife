import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import { Share2, Target, FileText, Users, Building2, Wallet } from 'lucide-react'
import { useLandingT } from '@/i18n/app/landing'
import { Huella } from '@/design/components/Huella'

import { reducedMotion } from './motion'
import { SplitText } from './SplitText'
import './fragmentation.css'

// "Hoy tu vida digital está fragmentada": cada herramienta flota por su cuenta, con avisos que titilan y conexiones que
// se cortan; en el centro, la huella de Mycen apagada y con interferencia. Al bajar, todo se ordena en un anillo
// alrededor de la huella, que se enciende: es la entrada a "Todo conectado" (la sección siguiente).
const FRAGS = [
  { Icon: Share2,    key: 'social',   color: '#3B82F6', top: '16%', left: '8%',  dur: 6.2, delay: 0   },
  { Icon: Target,    key: 'goals',    color: '#8B5CF6', top: '8%',  left: '56%', dur: 7.5, delay: 1.2 },
  { Icon: FileText,  key: 'notes',    color: '#F59E0B', top: '60%', left: '4%',  dur: 8.1, delay: 0.7 },
  { Icon: Users,     key: 'clients',  color: '#10B981', top: '76%', left: '34%', dur: 6.8, delay: 1.8 },
  { Icon: Building2, key: 'business', color: '#F4705A', top: '28%', left: '80%', dur: 7.2, delay: 0.4 },
  { Icon: Wallet,    key: 'money',    color: '#EC4899', top: '72%', left: '82%', dur: 8.6, delay: 2.1 },
] as const

// Conexiones que intentan unir herramientas y se cortan (índices de FRAGS)
const LINKS = [[0, 1], [1, 4], [2, 3], [3, 5], [0, 2]] as const

export function FragmentationSection() {
  const t = useLandingT().problem
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef   = useRef<HTMLDivElement>(null)
  const vizRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viz = vizRef.current
    if (reducedMotion() || !viz) return

    const ctx = gsap.context(() => {
      gsap.fromTo(titleRef.current,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 85%' } })

      // Entrada: las herramientas caen desordenadas, cada una por su lado
      // (en la caja: el contenedor ya se mueve con la animación CSS, que le ganaría a GSAP)
      gsap.fromTo('[data-frag-box]',
        { opacity: 0, scale: 0.4 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)', stagger: { each: 0.1, from: 'random' },
          scrollTrigger: { trigger: viz, start: 'top 80%' } })

      // Al bajar: cada herramienta va a su lugar en un anillo alrededor de la huella, la interferencia se apaga, las
      // conexiones rotas desaparecen y la huella se enciende
      const boxes = gsap.utils.toArray<HTMLElement>('[data-frag-box]', viz)
      const ringTarget = (box: HTMLElement, i: number, axis: 'x' | 'y') => {
        const holder = box.parentElement as HTMLElement
        // offset* no cambia con transform: la cuenta sirve aunque ya se haya movido
        const cx = holder.offsetLeft + box.offsetLeft + box.offsetWidth / 2
        const cy = holder.offsetTop + box.offsetTop + box.offsetHeight / 2
        const r = Math.min(viz.clientWidth, viz.clientHeight) * 0.36
        const a = (i / boxes.length) * Math.PI * 2 - Math.PI / 2
        return axis === 'x' ? viz.clientWidth / 2 + Math.cos(a) * r - cx : viz.clientHeight / 2 + Math.sin(a) * r - cy
      }
      const tl = gsap.timeline({
        // Termina con el dibujo en el medio de la pantalla: el orden se ve entero antes de seguir bajando
        scrollTrigger: { trigger: viz, start: 'top 70%', end: 'center 50%', scrub: 1, invalidateOnRefresh: true },
      })
      boxes.forEach((box, i) => {
        tl.fromTo(box, { x: 0, y: 0, rotate: gsap.utils.random(-14, 14) },
          { x: () => ringTarget(box, i, 'x'), y: () => ringTarget(box, i, 'y'), rotate: 0, ease: 'power2.inOut' }, 0)
      })
      tl.to('[data-frag-lines]', { opacity: 0, ease: 'none', duration: 0.4 }, 0)
        .to('[data-frag-label]', { opacity: 0, ease: 'none', duration: 0.4 }, 0.1)
        .to('[data-frag-noise]', { opacity: 0, ease: 'none', duration: 0.5 }, 0.4)
        .fromTo('[data-frag-on]', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.55 }, 0.45)
        .fromTo('[data-frag-ring]', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.5 }, 0.5)
        .to('[data-frag-dot]', { opacity: 0, ease: 'none', duration: 0.3 }, 0.6)
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} style={{
      background: `
        radial-gradient(ellipse 70% 50% at 50% 50%, rgba(244,112,90,0.04) 0%, transparent 60%),
        var(--ml-dark)
      `,
      padding: 'var(--ml-section-y) 24px',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div ref={titleRef} style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--ml-salmon)',
            fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
          }}>{t.label}</p>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 700,
            fontSize: 'clamp(32px,5vw,56px)', color: '#fff',
            lineHeight: 1.1, margin: '0 0 16px',
          }} data-split><SplitText text={t.title} />{' '}
            <em data-word className="ml-shine" style={{ color: 'var(--ml-salmon)', fontStyle: 'normal', display: 'inline-block' }}>{t.titleAccent}</em>
          </h2>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '17px',
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
            maxWidth: '520px', margin: '0 auto',
          }}>{t.subtitle}</p>
        </div>

        {/* Dibujo (los nombres se leen; el resto es decorativo) */}
        <div ref={vizRef} className="frag-viz">
          <div className="frag-grid" aria-hidden="true" />

          {/* Conexiones que se cortan */}
          <svg className="frag-lines" data-frag-lines aria-hidden="true">
            {LINKS.map(([a, b], i) => {
              const A = FRAGS[a], B = FRAGS[b]
              // Centro aproximado de cada caja (la caja mide 56 px; el dibujo, ~760 × 420)
              const cx = (p: string) => `${parseFloat(p) + 3.7}%`
              const cy = (p: string) => `${parseFloat(p) + 6.7}%`
              const x1 = cx(A.left), y1 = cy(A.top), x2 = cx(B.left), y2 = cy(B.top)
              return (
                <g key={i} className="frag-line" style={{ animationDelay: `${i * -0.9}s` }}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} />
                </g>
              )
            })}
          </svg>

          {/* La huella: apagada y con interferencia; se enciende al ordenarse todo */}
          <div className="frag-core" aria-hidden="true">
            <span className="frag-ring" data-frag-ring />
            {/* El parpadeo y la interferencia van en capas de adentro: la animación CSS le ganaría a la opacidad que pone
                el scroll, así que el scroll apaga el grupo entero */}
            <div className="frag-huella" data-frag-noise>
              <div className="frag-layer frag-huella--off">
                <Huella seed="mycen" variant="orbitas" colorA="#4B5563" colorB="#9CA3AF" />
              </div>
              <div className="frag-layer frag-ghost frag-ghost--a">
                <Huella seed="mycen" variant="orbitas" colorA="#FF4D6D" colorB="#FF4D6D" />
              </div>
              <div className="frag-layer frag-ghost frag-ghost--b">
                <Huella seed="mycen" variant="orbitas" colorA="#22D3EE" colorB="#22D3EE" />
              </div>
            </div>
            <div className="frag-huella frag-huella--on" data-frag-on data-mycen-theme="universo">
              <Huella seed="mycen" variant="orbitas" spin />
            </div>
          </div>
          <p className="frag-off-label" data-frag-label>{t.disconnected}</p>

          {/* Herramientas sueltas */}
          {FRAGS.map(({ Icon, key, color, top, left, dur, delay }) => (
            <div
              key={key}
              className="frag-holder"
              style={{ top, left, animationDuration: `${dur}s`, animationDelay: `${-delay}s` }}
            >
              <div data-frag-box className="frag-box" style={{ '--c': color } as CSSProperties}>
                <Icon size={22} style={{ color }} strokeWidth={1.8} aria-hidden="true" />
                <span className="frag-dot" data-frag-dot aria-hidden="true" style={{ animationDelay: `${delay * 1.3}s` }} />
                <span className="frag-name">{t.items[key]}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
