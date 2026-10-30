import { useEffect } from 'react'
import { Huella } from '@/design/components/Huella'
import { ClaimName } from '@/components/claim/ClaimName'
import '@/design/motion.css'
import { useLandingT } from '@/i18n/app/landing'
import { SplitText } from './SplitText'

export function CinematicHero() {
  const l = useLandingT()

  // Saca el esqueleto estático del hero (index.html, scripts/heroShell.ts): desde acá se ve el de React
  useEffect(() => { document.getElementById('boot-hero')?.remove() }, [])

  return (
    <section className="ch-section">

      {/* Fondo: el cielo de Universo con una huella grande (V1 · etapa 13). Sólo cubre la primera pantalla. La huella
          gira lento con transform (sin "reducir movimiento"); nada de canvas. */}
      <div aria-hidden="true" data-mycen-theme="universo" className="my-sky ch-sky">
        <div className="ch-huella">
          <Huella seed="mycen" variant="orbitas" spin draw />
        </div>
        <div className="ch-sky-fade" />
      </div>

      <div className="ch-intro">
        <h1>
          <span className="ch-line1"><SplitText text={l.hero.line1} /></span>
          <span className="ch-line2"><SplitText text={l.hero.line2} /></span>
        </h1>
        <p className="ch-subtitle">{l.hero.subtitle}</p>
        {/* "Elegí tu nombre": el registro empieza acá, con la dirección ya elegida */}
        <div className="ch-claim"><ClaimName from="hero" /></div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
    </section>
  )
}
