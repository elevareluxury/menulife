import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Producto', href: '#experiencias' },
  { label: 'Precios',  href: '#precios' },
  { label: 'Contacto', href: 'mailto:contacto@menulife.digital' },
  { label: 'FAQ',      href: '#faq' },
]

export function Footer() {
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
        <Link to="/" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', letterSpacing: '0.04em' }}>
          © Mycen 2026
        </Link>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
          Hecho por Resilio
        </span>
      </div>
    </footer>
  )
}
