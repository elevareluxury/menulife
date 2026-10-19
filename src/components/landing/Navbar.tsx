import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLandingT } from '@/i18n/app/landing'
import { LanguageSelect } from '@/components/ui/LanguageSelect'
import { useSiteFlags } from '@/lib/siteFlags'
import { HuellaMark } from '@/components/ui/HuellaMark'

export function Navbar() {
  const l = useLandingT()
  const { business } = useSiteFlags()
  const [scrolled,   setScrolled]   = useState(false)

  const NAV_LINKS = [
    { label: l.nav.product, href: '#soluciones' },
    // Los precios son de Mycen Business: sin Business no hay sección de precios
    ...(business ? [{ label: l.nav.pricing, href: '#pricing' }] : []),
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className="liquid-glass-nav" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      borderBottom: scrolled ? '1px solid rgba(244,112,90,0.3)' : '1px solid rgba(255,255,255,0.08)',
      transition: 'border-color 0.4s ease',
      fontFamily: 'var(--font-jakarta)',
      animation: 'ml-fade-up 0.4s ease both',
    }}>
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '0 24px', height: '68px',
        // Tres columnas: lo de los costados no corre la huella del centro
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px',
      }}>
        {/* Izquierda: links (escritorio) o idioma (celular) */}
        <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'start' }}>
          <div className="hidden lg:flex" style={{ gap: '32px', alignItems: 'center' }}>
            {NAV_LINKS.map(link => (
              <NavLink key={link.href} href={link.href}>{link.label}</NavLink>
            ))}
          </div>
          <div className="flex lg:hidden"><LanguageSelect label={l.nav.language} /></div>
        </div>

        {/* Centro: la huella de Mycen, animada */}
        <Link to="/" aria-label="Mycen" className="nav-huella" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          <HuellaMark id="nav" size={44} animated />
        </Link>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex" style={{ gap: '12px', alignItems: 'center', justifySelf: 'end' }}>
          <LanguageSelect label={l.nav.language} />
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '8px 20px', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '50px', background: 'transparent',
              color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-jakarta)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            >{l.nav.login}</button>
          </Link>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <ShimmerButton magnetic>{l.nav.cta}</ShimmerButton>
          </Link>
        </div>

        {/* Celular: cuenta a la vista, sin menú escondido (el idioma va a la izquierda; el resto está en la página) */}
        <div className="flex lg:hidden" style={{ gap: '10px', alignItems: 'center', justifySelf: 'end' }}>
          <Link to="/login" aria-label={l.nav.login} title={l.nav.login} style={{
            width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff',
          }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{
      color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
      fontSize: '14px', fontWeight: 500, transition: 'color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
    >{children}</a>
  )
}

export function ShimmerButton({ children, style, onClick, magnetic }: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  /** se acerca al puntero (ver landing/motion.ts) */
  magnetic?: boolean
}) {
  return (
    <button onClick={onClick} data-magnetic={magnetic ? '' : undefined} className="liquid-glass-btn" style={{
      padding: '9px 22px',
      color: '#fff',
      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
      fontFamily: 'var(--font-jakarta)',
      ...style,
    }}>
      <span style={{ position: 'relative', zIndex: 2 }}>{children}</span>
      <span style={{
        position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
        animation: 'ml-shimmer 3s infinite',
        zIndex: 2,
      }} />
    </button>
  )
}
