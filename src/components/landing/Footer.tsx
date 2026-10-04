import { Link } from 'react-router-dom'
import { useLandingT } from '@/i18n/app/landing'

const linkStyle = { fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'color 0.2s' }
const hover = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)' },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' },
}

export function Footer() {
  const t = useLandingT().footer
  const anchors = [
    { label: t.product, href: '#soluciones' },
    { label: t.pricing, href: '#pricing' },
    { label: t.faq,     href: '#faq' },
  ]
  const pages = [
    { label: t.terms,   to: '/terminos' },
    { label: t.privacy, to: '/privacidad' },
  ]

  return (
    <footer style={{
      background: '#0F1115',
      padding: '32px 24px',
      fontFamily: 'var(--font-jakarta)',
    }}>
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between',
        gap: '16px',
      }}>
        <Link to="/" style={{ display: 'flex', flexDirection: 'column', gap: '6px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Mycen" style={{ height: '28px', width: 'auto', opacity: 0.7 }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-jakarta)' }}>
            © Mycen 2026
          </span>
        </Link>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          {anchors.map(link => (
            <a key={link.href} href={link.href} style={linkStyle} {...hover}>{link.label}</a>
          ))}
          {pages.map(link => (
            <Link key={link.to} to={link.to} style={linkStyle} {...hover}>{link.label}</Link>
          ))}
        </nav>

        <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>
          {t.madeBy}
        </span>
      </div>
    </footer>
  )
}
