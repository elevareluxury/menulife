import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/hooks/useLanguage'

export function Navbar() {
  const { t } = useTranslation()
  const { currentLang, toggleLanguage } = useLanguage()
  const [scrolled,   setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const NAV_LINKS = [
    { label: 'Producto', href: '#experiencias' },
    { label: 'Precios',  href: '#precios' },
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/Logo.png" alt="Mycen" style={{ height: '36px', width: 'auto' }} />
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex" style={{ gap: '32px', alignItems: 'center' }}>
          {NAV_LINKS.map(link => (
            <NavLink key={link.href} href={link.href}>{link.label}</NavLink>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex" style={{ gap: '12px', alignItems: 'center' }}>
          <LanguageToggle currentLang={currentLang} onToggle={toggleLanguage} />
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '8px 20px', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '50px', background: 'transparent',
              color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-jakarta)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            >{t('nav.login')}</button>
          </Link>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <ShimmerButton>{t('nav.cta')}</ShimmerButton>
          </Link>
        </div>

        {/* Mobile burger */}
        <button className="lg:hidden" onClick={() => setMobileOpen(v => !v)} aria-label="Menú"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '4px' }}>
          {mobileOpen
            ? <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          }
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          background: 'rgba(15,17,21,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 24px', fontFamily: 'var(--font-jakarta)',
        }}>
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} style={{
              display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
              padding: '10px 0', fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>{link.label}</a>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Idioma</span>
            <LanguageToggle currentLang={currentLang} onToggle={toggleLanguage} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            <Link to="/login" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', background: 'transparent', color: '#fff', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                {t('nav.login')}
              </button>
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
              <ShimmerButton style={{ width: '100%' }}>{t('nav.cta')}</ShimmerButton>
            </Link>
          </div>
        </div>
      )}
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

function LanguageToggle({ currentLang, onToggle }: { currentLang: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Change language"
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '6px 12px', borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.05)',
        cursor: 'pointer', transition: 'all 0.2s',
        fontFamily: 'var(--font-jakarta)',
        fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    >
      <span style={{ color: currentLang === 'es' ? '#fff' : 'rgba(255,255,255,0.4)' }}>ES</span>
      <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
      <span style={{ color: currentLang === 'en' ? '#fff' : 'rgba(255,255,255,0.4)' }}>EN</span>
    </button>
  )
}

export function ShimmerButton({ children, style, onClick }: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="liquid-glass-btn" style={{
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
