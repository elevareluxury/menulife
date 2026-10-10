import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Huella } from '@/design/components/Huella'
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
    </section>
  )
}
