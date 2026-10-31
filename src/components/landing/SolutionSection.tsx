import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { CSSProperties } from 'react'
import {
  Globe, Target, Rocket, Link2, MessageCircle, FolderOpen, QrCode, CheckSquare, Flame, Wallet, Flag,
  UtensilsCrossed, ShoppingBag, CalendarClock, BarChart3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLandingT } from '@/i18n/app/landing'
import { useSiteFlags } from '@/lib/siteFlags'
import { Huella } from '@/design/components/Huella'

import { reducedMotion } from './motion'
import { SplitText } from './SplitText'
import './solution.css'

type ChipKey = 'links' | 'messages' | 'projects' | 'qr' | 'tasks' | 'habits' | 'money' | 'goals' | 'menu' | 'orders' | 'bookings' | 'sales'

// Cada parte de Mycen es una órbita alrededor de la huella: el planeta con su nombre y, en la misma órbita, lo que
// tiene adentro. Las órbitas son círculos concéntricos en un mismo plano inclinado y aplastado (perspectiva sin 3D) y
// giran juntas: lo de cada órbita va intercalado con lo de las otras, así nada se pisa.
const ORBITS = [
  {
    key: 'identity', Icon: Globe, color: '#3B82F6',
    chips: [['links', Link2], ['messages', MessageCircle], ['projects', FolderOpen], ['qr', QrCode]],
  },
  {
    key: 'organization', Icon: Target, color: '#8B5CF6',
    chips: [['tasks', CheckSquare], ['habits', Flame], ['money', Wallet], ['goals', Flag]],
  },
  {
    key: 'business', Icon: Rocket, color: '#F4705A',
    chips: [['menu', UtensilsCrossed], ['orders', ShoppingBag], ['bookings', CalendarClock], ['sales', BarChart3]],
  },
] as const satisfies ReadonlyArray<{
  key: 'identity' | 'organization' | 'business'; Icon: LucideIcon; color: string
  chips: ReadonlyArray<readonly [ChipKey, LucideIcon]>
}>

/** Radios (en % del ancho del dibujo) según cuántas órbitas hay */
const RADII: Record<number, number[]> = { 2: [22, 38], 3: [18, 29, 40] }
const TILT = -10      // grados
const DUR = 80        // segundos por vuelta
const STEP = 72       // 5 cosas por órbita

/** Dónde arranca cada órbita: corrida STEP/n respecto de la anterior (intercalada) y dos pasos más (144°), para que
 *  los planetas queden repartidos */
function orbitStart(i: number, n: number) {
  return 200 + i * (STEP / n) + i * 2 * STEP
}

/** Retraso (negativo) para que el "adelante/atrás" de cada cosa arranque donde está en la órbita */
function depthDelay(angle: number) {
  return `${-((((angle % 360) + 360) % 360) / 360) * DUR}s`
}

export function SolutionSection() {
  const t = useLandingT().solution
  const { business } = useSiteFlags()
  const orbits = ORBITS.filter(o => business || o.key !== 'business')
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef   = useRef<HTMLDivElement>(null)
  const vizRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viz = vizRef.current
    if (reducedMotion() || !viz) return
    const cleanups: Array<() => void> = []

    const ctx = gsap.context(() => {
      gsap.fromTo(titleRef.current,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 85%' } })

      // Entrada: la huella aparece, cada órbita se abre desde el centro y lo de adentro se enciende de a uno
      const tl = gsap.timeline({ scrollTrigger: { trigger: viz, start: 'top 78%' } })
      tl.fromTo('[data-sol-core]', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.7)' })
        .fromTo('[data-sol-burst]', { opacity: 0.9, scale: 0.6 }, { opacity: 0, scale: 3, duration: 1.1, ease: 'power2.out' }, '<0.2')
        .fromTo('[data-sol-orbit]', { opacity: 0, scale: 0.35, rotate: -40 },
          { opacity: 1, scale: 1, rotate: 0, duration: 1.2, ease: 'expo.out', stagger: 0.18 }, '<0.1')
        .fromTo('[data-sol-item]', { opacity: 0, scale: 0.3 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.05 }, '<0.35')

      gsap.fromTo('[data-sol-cards]',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12,
          scrollTrigger: { trigger: '[data-sol-cards]', start: 'top 85%' } })
    }, sectionRef)

    // Con mouse: el sistema se inclina en 3D siguiendo el puntero
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      const stage = viz.querySelector<HTMLElement>('[data-sol-stage]')
      if (stage) {
        gsap.set(stage, { transformPerspective: 1100 })
        const rx = gsap.quickTo(stage, 'rotationX', { duration: 0.9, ease: 'power3.out' })
        const ry = gsap.quickTo(stage, 'rotationY', { duration: 0.9, ease: 'power3.out' })
        const move = (e: PointerEvent) => {
          const b = viz.getBoundingClientRect()
          rx(((e.clientY - b.top) / b.height - 0.5) * -14)
          ry(((e.clientX - b.left) / b.width - 0.5) * 18)
        }
        const leave = () => { rx(0); ry(0) }
        viz.addEventListener('pointermove', move)
        viz.addEventListener('pointerleave', leave)
        cleanups.push(() => { viz.removeEventListener('pointermove', move); viz.removeEventListener('pointerleave', leave) })
      }
    }

    return () => { ctx.revert(); cleanups.forEach(f => f()) }
  }, [business])

  return (
    <section ref={sectionRef} style={{
      background: `
        radial-gradient(ellipse 60% 50% at 50% 40%, rgba(244,112,90,0.06) 0%, transparent 60%),
        var(--ml-dark-2)
      `,
      padding: 'var(--ml-section-y) 24px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Orbes de fondo: respiran y se desplazan con el scroll */}
      <div aria-hidden="true" data-parallax="0.5" style={{ position: 'absolute', top: '8%', left: '-8%', width: '420px', height: '420px', pointerEvents: 'none' }}>
        <div className="ml-orb" style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 65%)', filter: 'blur(20px)' }} />
      </div>
      <div aria-hidden="true" data-parallax="0.9" style={{ position: 'absolute', bottom: '5%', right: '-10%', width: '480px', height: '480px', pointerEvents: 'none' }}>
        <div className="ml-orb" style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,112,90,0.16), transparent 65%)', filter: 'blur(24px)', animationDelay: '-4s' }} />
      </div>
      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div ref={titleRef} style={{ textAlign: 'center', marginBottom: '40px' }}>
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
          }}>{t.subtitle}</p>
        </div>

        {/* Sistema: la huella de Mycen en el centro y una órbita por cada parte (decorativo: lo dicen las tarjetas) */}
        <div ref={vizRef} className="sol-viz" data-orbits={orbits.length} data-mycen-theme="universo" aria-hidden="true">
          <div className="sol-stage" data-sol-stage>
            <div className="sol-halo" />
            {/* La huella va debajo: lo que orbita pasa por delante */}
            <div className="sol-core" data-sol-core>
              <span className="sol-burst" data-sol-burst />
              <span className="sol-wave" />
              <span className="sol-wave" />
              <Huella seed="mycen" variant="orbitas" spin />
            </div>

            {orbits.map((o, n) => {
              const at = orbitStart(n, orbits.length)
              const items = [
                { key: o.key, label: t[o.key], Icon: o.Icon, main: true, angle: at },
                ...o.chips.map(([key, Icon], i) => ({ key, label: t.chips[key], Icon, main: false, angle: at + STEP * (i + 1) })),
              ]
              const vars = {
                '--c': o.color, '--rr': RADII[orbits.length][n], '--tilt': `${TILT}deg`, '--dur': `${DUR}s`,
                '--sweep': `${DUR / (5 + n * 2)}s`,
              } as CSSProperties
              return (
                <div key={o.key} className="sol-orbit" data-sol-orbit style={vars}>
                  <div className="sol-plane">
                    <div className="sol-ring" />
                    <div className="sol-sweep" />
                    <div className="sol-spin">
                      {items.map(it => (
                        <div key={it.key} className="sol-arm" style={{ '--a': `${it.angle}deg` } as CSSProperties}>
                          <div className="sol-unspin">
                            <div className="sol-upright">
                              <div className="sol-depth" style={{ animationDelay: depthDelay(it.angle) }}>
                                <div data-sol-item className={it.main ? 'sol-planet' : 'sol-chip'}>
                                  <span className="sol-icon"><it.Icon size={it.main ? 18 : 12} strokeWidth={2} /></span>
                                  <span className="sol-label">{it.label}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

          </div>
        </div>

        {/* Una tarjeta por parte */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {orbits.map(({ key, Icon, color }) => (
            <div
              key={key}
              data-sol-cards
              className="liquid-glass"
              style={{
                padding: '28px 24px',
                background: 'rgba(15,17,21,0.97)',
                border: `1px solid ${color}20`,
              }}
              data-tilt
            >
              <span className="ml-spot" aria-hidden="true" />
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: `${color}15`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Icon size={20} style={{ color }} strokeWidth={2} />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-syne)', fontWeight: 800,
                fontSize: '18px', color: '#fff', marginBottom: '8px',
              }}>{t[key]}</h3>
              <p style={{
                fontFamily: 'var(--font-jakarta)', fontSize: '14px',
                color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0,
              }}>{t[`${key}Sub`]}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
