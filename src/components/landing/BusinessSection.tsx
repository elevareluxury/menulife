import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed, ShoppingBag, CalendarDays } from 'lucide-react'

declare const gsap: any

const VERTICALS = [
  {
    Icon: UtensilsCrossed,
    tag: 'Gastronomía',
    title: 'Digitaliza la experiencia de tus clientes.',
    features: ['Menú digital QR sin app', 'Gestión de pedidos y mesas', 'Pantalla de cocina (KDS)', 'Delivery y takeaway'],
    cta: 'Explorar Gastronomía',
    href: '/register',
    color: '#F4705A',
    bg: 'rgba(244,112,90,0.05)',
    border: 'rgba(244,112,90,0.18)',
  },
  {
    Icon: ShoppingBag,
    tag: 'Retail',
    title: 'Muestra tus productos y genera más ventas.',
    features: ['Catálogo digital con fotos', 'Gestión de inventario', 'Punto de venta integrado', 'Analytics de ventas'],
    cta: 'Explorar Retail',
    href: '/register',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.05)',
    border: 'rgba(59,130,246,0.18)',
  },
  {
    Icon: CalendarDays,
    tag: 'Servicios',
    title: 'Convierte visitas en clientes.',
    features: ['Agenda y gestión de turnos', 'CRM de clientes', 'Membresías y paquetes', 'Presupuestos y cotizaciones'],
    cta: 'Explorar Servicios',
    href: '/register',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.05)',
    border: 'rgba(139,92,246,0.18)',
  },
]

export function BusinessSection() {
  useEffect(() => {
    if (typeof gsap === 'undefined') return
    const ST = (window as any).ScrollTrigger
    if (!ST) return

    gsap.fromTo('[data-biz-title]',
      { opacity: 0, y: 48 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-biz-title]', start: 'top 85%' } })

    gsap.fromTo('[data-biz-card]',
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.18,
        scrollTrigger: { trigger: '[data-biz-card]', start: 'top 85%' } })
  }, [])

  return (
    <section style={{
      background: `
        radial-gradient(ellipse 60% 50% at 70% 30%, rgba(59,130,246,0.04) 0%, transparent 50%),
        var(--ml-dark-2)
      `,
      padding: '96px 24px',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div data-biz-title style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--ml-salmon)',
            fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
          }}>MYCEN BUSINESS</p>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: 'clamp(32px,5vw,56px)', color: '#fff',
            lineHeight: 1.1, margin: '0 0 16px',
          }}>Una plataforma adaptada{' '}
            <em style={{ color: 'var(--ml-salmon)', fontStyle: 'italic' }}>a tu industria.</em>
          </h2>
        </div>

        {/* 3 vertical cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {VERTICALS.map(({ Icon, tag, title, features, cta, href, color, bg, border }) => (
            <div
              key={tag}
              data-biz-card
              className="liquid-glass"
              style={{
                padding: '36px 28px',
                background: `rgba(15,17,21,0.97)`,
                border: `1px solid ${border}`,
                display: 'flex', flexDirection: 'column',
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px) scale(1.01)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              {/* Icon */}
              <div style={{
                width: '52px', height: '52px',
                borderRadius: '15px',
                background: bg,
                border: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: `0 6px 20px ${color}15`,
              }}>
                <Icon size={24} style={{ color }} strokeWidth={1.8} />
              </div>

              {/* Label */}
              <p style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color, fontFamily: 'var(--font-jakarta)',
                marginBottom: '10px',
              }}>{tag}</p>

              {/* Title */}
              <h3 style={{
                fontFamily: 'var(--font-syne)', fontWeight: 800,
                fontSize: '22px', color: '#fff', lineHeight: 1.2,
                marginBottom: '20px', flexGrow: 1,
              }}>{title}</h3>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '28px' }}>
                {features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color, fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{
                      fontFamily: 'var(--font-jakarta)', fontSize: '13px',
                      color: 'rgba(255,255,255,0.55)', lineHeight: 1.4,
                    }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link to={href} style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${color}40`,
                  background: `${color}10`,
                  color,
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-jakarta)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${color}20`
                    e.currentTarget.style.borderColor = `${color}80`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = `${color}10`
                    e.currentTarget.style.borderColor = `${color}40`
                  }}
                >
                  {cta} →
                </button>
              </Link>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
