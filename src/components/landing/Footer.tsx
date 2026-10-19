import { Link } from 'react-router-dom'
import { useLandingT } from '@/i18n/app/landing'
import { useSiteFlags } from '@/lib/siteFlags'
import { HuellaMark } from '@/components/ui/HuellaMark'

const CONTACT_EMAIL = 'team@mycen.id'

const linkStyle = { fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'color 0.2s' }
const hover = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)' },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' },
}

export function Footer() {
  const t = useLandingT().footer
  const { business } = useSiteFlags()
  const anchors = [
    { label: t.product, href: '#soluciones' },
    ...(business ? [{ label: t.pricing, href: '#pricing' }] : []),
    { label: t.contact, href: `mailto:${CONTACT_EMAIL}` },
  ]
  const pages = [
    { label: t.terms,   to: '/terminos' },
    { label: t.privacy, to: '/privacidad' },
    { label: t.support, to: '/soporte' },
  ]

  return (
    <footer style={{
      background: '#0F1115',
      padding: '40px 24px calc(32px + env(safe-area-inset-bottom))',
      fontFamily: 'var(--font-jakarta)',
    }}>
      {/* Todo centrado en columna: la huella, los links y la firma */}
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
        gap: '20px',
      }}>
        <Link to="/" aria-label="Mycen" data-rise style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <HuellaMark id="footer" size={44} animated />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-jakarta)' }}>
            © Mycen 2026
          </span>
        </Link>

        {/* Una sola línea también en el celular (entra en 320 px); en pantallas muy angostas baja a dos */}
        <nav data-rise style={{ display: 'flex', flexWrap: 'wrap', gap: '10px clamp(12px, 3.5vw, 24px)', alignItems: 'center', justifyContent: 'center' }}>
          {anchors.map(link => (
            <a key={link.href} href={link.href} style={linkStyle} {...hover}>{link.label}</a>
          ))}
          {pages.map(link => (
            <Link key={link.to} to={link.to} style={linkStyle} {...hover}>{link.label}</Link>
          ))}
        </nav>

        <span data-rise style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>
          {t.madeBy}
        </span>
      </div>
    </footer>
  )
}
