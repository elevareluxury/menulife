import { Link } from 'react-router-dom'
import { ACCENT_COLORS, SECONDARY_COLORS } from '@/design/themes'
import { brandMarkSvg } from '@/lib/brandMark'

// SVG propio, generado con la semilla fija de la marca (no lleva texto de nadie)
const MARK = brandMarkSvg(ACCENT_COLORS.plasma.universo.accent, SECONDARY_COLORS.universo, '-auth')

/** Marca de las pantallas de acceso: la huella de Mycen (la del ícono de la app) y "mycen.id" debajo. Lleva al inicio. */
export function AuthBrand() {
  return (
    <Link to="/" aria-label="mycen.id" style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      textDecoration: 'none', marginBottom: '16px',
    }}>
      <span aria-hidden="true" className="auth-brand-mark" style={{ display: 'block', width: '64px', height: '64px' }}
        dangerouslySetInnerHTML={{ __html: MARK }} />
      <span aria-hidden="true" style={{
        fontFamily: 'var(--font-jakarta)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em', color: '#fff',
      }}>
        mycen.id
      </span>
    </Link>
  )
}
