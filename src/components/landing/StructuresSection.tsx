import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLandingT } from '@/i18n/app/landing'
import { SplitText } from './SplitText'

// Las cinco estructuras del perfil en los dos temas (V1 · etapa 13). Son imágenes estáticas de perfiles de ejemplo
// (scripts/landing-shots), no componentes en vivo: pesan poco y no capturan gestos. Van en una sola fila que se desliza
// de costado (con el dedo, la rueda, el teclado o las flechas) y se encastra en cada tarjeta; si entran todas, centradas.

const LAYOUTS = ['credencial', 'portada', 'editorial', 'bento', 'clasica'] as const
const THEMES = ['universo', 'amanecer'] as const

export function StructuresSection() {
  const t = useLandingT().structures
  const [theme, setTheme] = useState<(typeof THEMES)[number]>('universo')
  const rowRef = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  // Hasta dónde se deslizó (en árabe, scrollLeft va de 0 a negativo)
  const measure = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    const max = row.scrollWidth - row.clientWidth
    const pos = Math.abs(row.scrollLeft)
    setEdges({ start: pos <= 2, end: pos >= max - 2 })
  }, [])
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    measure()
    row.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => { row.removeEventListener('scroll', measure); window.removeEventListener('resize', measure) }
  }, [measure])

  const slide = (dir: 1 | -1) => {
    const row = rowRef.current
    const card = row?.querySelector('li')
    if (!row || !card) return
    const rtl = getComputedStyle(row).direction === 'rtl' ? -1 : 1
    row.scrollBy({ left: dir * rtl * (card.getBoundingClientRect().width + 16), behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="ml-structures" style={{ background: 'var(--ml-dark)', padding: 'var(--ml-section-y) 16px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--ml-salmon)', fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
          }}>{t.label}</p>
          <h2 id="ml-structures" data-split style={{
            fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 'clamp(32px,5vw,56px)', color: '#fff',
            lineHeight: 1.1, margin: '0 0 16px',
          }}>
            <SplitText text={t.title} />{' '}
            <em data-word className="ml-shine" style={{ fontStyle: 'normal', display: 'inline-block' }}>{t.titleAccent}</em>
          </h2>
          <p style={{
            fontFamily: 'var(--font-jakarta)', fontSize: '17px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6,
            maxWidth: '560px', margin: '0 auto 28px',
          }}>{t.subtitle}</p>

          <div role="radiogroup" aria-label={t.themes} className="ml-theme-switch">
            {THEMES.map(th => (
              <button key={th} type="button" role="radio" aria-checked={theme === th} onClick={() => setTheme(th)}>
                <span aria-hidden="true" className={`ml-theme-dot ml-theme-dot-${th}`} />
                {t[th]}
              </button>
            ))}
          </div>
        </div>

        {/* Fila deslizable: se puede enfocar con el teclado (flechas) y tiene nombre para los lectores de pantalla */}
        <ul ref={rowRef} className="ml-structures" tabIndex={0} aria-label={`${t.title} ${t.titleAccent}`}>
          {LAYOUTS.map(layout => {
            const info = t.layouts[layout]
            return (
              <li key={layout} data-rise>
                <figure style={{ margin: 0 }}>
                  <img
                    src={`/landing/perfil-${layout}-${theme}.webp`}
                    alt={t.alt(info.name, t[theme])}
                    width={300} height={600} loading="lazy" decoding="async"
                  />
                  <figcaption>
                    <strong>{info.name}</strong>
                    <span>{info.text}</span>
                  </figcaption>
                </figure>
              </li>
            )
          })}
        </ul>
        {!(edges.start && edges.end) && (
          <div className="ml-structures-nav">
            <button type="button" onClick={() => slide(-1)} disabled={edges.start} aria-label={t.prev}>
              <ChevronLeft size={20} aria-hidden="true" className="ml-flip-rtl" />
            </button>
            <button type="button" onClick={() => slide(1)} disabled={edges.end} aria-label={t.next}>
              <ChevronRight size={20} aria-hidden="true" className="ml-flip-rtl" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
