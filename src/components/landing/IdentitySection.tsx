import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Check, Globe, Play, Music2, Mail, Bell, Heart, ArrowUpRight, Link2 } from 'lucide-react'
import { useLandingT } from '@/i18n/app/landing'
import { Huella } from '@/design/components/Huella'

import { SplitText } from './SplitText'
import './identity.css'

// "Tu identidad, en vivo": mientras se bajan los pasos, el celular de al lado (fijo) arma un perfil de ejemplo:
// nombre, huella, estructuras, módulos, compartir y "lo que más tocan". Es una ilustración: sin números ni datos de
// nadie. El paso activo lo decide qué texto cruza la franja de lectura de la pantalla (IntersectionObserver); cada
// cambio es una transición CSS de transform/opacity, así que con "reducir movimiento" sólo cambia, sin animarse.

const LAYOUTS = ['credencial', 'portada', 'editorial', 'bento', 'clasica'] as const
const PLATFORMS = ['WhatsApp', 'Instagram', 'TikTok', 'LinkedIn', 'X'] as const

/** QR decorativo (no se escanea): patrón fijo con los tres cuadros de las esquinas y un hueco para la huella */
function useQrCells(size = 21) {
  return useMemo(() => {
    const cells: Array<[number, number]> = []
    const finder = (x: number, y: number) =>
      [[0, 0], [size - 7, 0], [0, size - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7)
    let seed = 7
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (finder(x, y)) continue
      if (x > 7 && x < 13 && y > 7 && y < 13) continue
      seed = (seed * 9301 + 49297) % 233280
      if (seed / 233280 < 0.48) cells.push([x, y])
    }
    return cells
  }, [size])
}

function FakeQr() {
  const cells = useQrCells()
  return (
    <svg viewBox="0 0 21 21" className="idn-qr-svg" shapeRendering="crispEdges">
      {[[0, 0], [14, 0], [0, 14]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#05060F" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#05060F" />
        </g>
      ))}
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#05060F" />)}
    </svg>
  )
}

export function IdentitySection() {
  const t = useLandingT().identity
  const d = t.demo
  // -1 = todavía no se llegó al primer paso: el celular espera con la dirección vacía
  const [step, setStep] = useState(-1)
  const stepsRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = stepsRef.current
    if (!list || typeof IntersectionObserver === 'undefined') return
    // Franja de lectura: el medio de la pantalla en computadora; en el celular, debajo del teléfono fijo
    const narrow = window.matchMedia('(max-width: 899px)').matches
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.idnStep))
    }, { rootMargin: narrow ? '-66% 0px -14% 0px' : '-46% 0px -46% 0px' })
    list.querySelectorAll('[data-idn-step]').forEach(n => io.observe(n))
    return () => io.disconnect()
  }, [])

  const at = (n: number) => step >= n

  return (
    <section className="idn" aria-labelledby="idn-title">
      <div className="idn-inner">
        <header className="idn-head">
          <p className="idn-label">{t.label}</p>
          <h2 id="idn-title" data-split className="idn-title">
            <SplitText text={t.title} />{' '}
            <em data-word className="ml-shine">{t.titleAccent}</em>
          </h2>
          <p className="idn-sub">{t.subtitle}</p>
        </header>

        <div className="idn-stage">
          {/* El celular (decorativo: lo mismo lo dicen los pasos) */}
          <div className="idn-phone-col">
            <div className="idn-phone-sticky" aria-hidden="true">
              <div
                className={['idn-phone', ...[0, 1, 2, 3, 4, 5].filter(at).map(n => `idn-at-${n}`), `idn-now-${step}`].join(' ')}
                data-mycen-theme="universo"
              >
                <div className="idn-screen my-sky">
                  {/* Dirección: se escribe el nombre y aparece "disponible" */}
                  <div className="idn-url">
                    <Globe size={12} />
                    <span>mycen.id/</span>
                    <span className="idn-type"><span>ana</span><i className="idn-type-cover" /></span>
                    <span className="idn-avail"><Check size={11} strokeWidth={3} />{d.available}</span>
                  </div>

                  {/* Perfil */}
                  <div className="idn-hero">
                    <div className="idn-huella"><Huella seed="ana" variant="orbitas" spin /></div>
                    <div className="idn-avatar">A</div>
                  </div>
                  <div className="idn-id">
                    <strong>Ana Pérez</strong>
                    <span>{d.role}</span>
                  </div>
                  <div className="idn-cta-btn">{d.contact}</div>

                  {/* Módulos que entran de a uno */}
                  <ul className="idn-mods">
                    <li style={{ '--i': 0 } as CSSProperties}>
                      <span className="idn-mod-ico"><Link2 size={14} /></span>{d.portfolio}<ArrowUpRight size={13} className="idn-mod-go" />
                    </li>
                    <li style={{ '--i': 1 } as CSSProperties} className="idn-mod-video">
                      <span className="idn-thumb"><Play size={14} fill="currentColor" /></span>
                      <span className="idn-mod-txt">{d.video}<small>YouTube</small></span>
                    </li>
                    <li style={{ '--i': 2 } as CSSProperties}>
                      <span className="idn-mod-ico"><Music2 size={14} /></span>{d.music}
                      <span className="idn-eq"><i /><i /><i /><i /></span>
                    </li>
                    <li style={{ '--i': 3 } as CSSProperties} className="idn-mod-pair">
                      <span><Bell size={13} />{d.subscribe}</span>
                      <span><Heart size={13} />{d.support}</span>
                    </li>
                  </ul>

                  {/* Paso 3: las cinco estructuras reales, una tras otra */}
                  <div className="idn-layouts">
                    {LAYOUTS.map((l, i) => (
                      <img key={l} src={`/landing/perfil-${l}-universo.webp`} alt="" loading="lazy" decoding="async"
                        width={300} height={600} style={{ '--i': i } as CSSProperties} />
                    ))}
                  </div>

                  {/* Paso 5: compartir */}
                  <div className="idn-sheet idn-share">
                    <div className="idn-qr"><FakeQr /><span className="idn-qr-mark"><Huella seed="ana" variant="orbitas" /></span></div>
                    <div className="idn-share-url">mycen.id/ana</div>
                    <div className="idn-chips">{PLATFORMS.map(p => <span key={p}>{p}</span>)}</div>
                    <div className="idn-toast"><Check size={13} strokeWidth={3} />{d.copied}</div>
                  </div>

                  {/* Paso 6: lo que más tocan (barras sin números) */}
                  <div className="idn-sheet idn-stats">
                    <p>{d.topTaps}</p>
                    {[[d.contact, Mail, 1], [d.portfolio, Link2, 0.74], [d.video, Play, 0.52], [d.music, Music2, 0.34]].map(([label, Icon, w], i) => {
                      const I = Icon as typeof Mail
                      return (
                        <div key={i} className="idn-bar" style={{ '--i': i, '--w': w } as CSSProperties}>
                          <span className="idn-bar-label"><I size={12} />{label as string}</span>
                          <span className="idn-bar-track"><i /></span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Los pasos */}
          <ol ref={stepsRef} className="idn-steps">
            {t.steps.map((s, i) => (
              <li key={i} data-idn-step={i} className={i === step ? 'is-on' : undefined}>
                <span className="idn-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="idn-end">
          <Link to="/register" className="idn-go" data-magnetic>{t.cta}</Link>
          <p>{t.ctaNote}</p>
        </div>
      </div>
    </section>
  )
}
