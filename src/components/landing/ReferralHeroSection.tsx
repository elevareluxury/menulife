import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface RestaurantPreview {
  name: string
  slug: string
  logo_url: string | null
  hub_category: string | null
  city: string | null
}

export function ReferralHeroSection() {
  const [searchParams] = useSearchParams()
  const ref  = searchParams.get('ref')
  const from = searchParams.get('from')
  const [restaurant, setRestaurant] = useState<RestaurantPreview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ref !== 'hub' || !from) { setLoading(false); return }

    db.from('restaurants')
      .select('name, slug, logo_url, hub_category, city')
      .eq('slug', from)
      .maybeSingle()
      .then(({ data }: { data: RestaurantPreview | null }) => {
        if (data) setRestaurant(data)
        setLoading(false)
      })
  }, [ref, from])

  if (loading || !restaurant) return null

  return (
    <section style={{
      background: 'linear-gradient(135deg, #0F1115 0%, #1A1D24 100%)',
      borderBottom: '1px solid rgba(244,112,90,0.15)',
      padding: '80px 24px 60px',
      position: 'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 300,
        background: 'radial-gradient(ellipse, rgba(244,112,90,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 48,
        alignItems: 'center',
        position: 'relative',
      }}>
        {/* ── Izquierda: mensaje */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 999,
            background: 'rgba(244,112,90,0.12)',
            border: '1px solid rgba(244,112,90,0.3)',
            color: '#F4705A', fontSize: 12, fontWeight: 600,
            marginBottom: 20,
          }}>
            <ExternalLink size={12} />
            Así se ve el ID de {restaurant.name}
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800, color: '#fff',
            lineHeight: 1.1, margin: '0 0 20px',
            letterSpacing: '-0.02em',
          }}>
            Creá el tuyo<br />en 30 segundos
          </h1>

          <p style={{
            fontSize: 17, color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.55, margin: '0 0 32px', maxWidth: 480,
          }}>
            Tu ID digital gratuito. Compartí tu historia, links, redes y
            todo lo que quieras con una URL única.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 24px', borderRadius: 999,
              background: '#F4705A', color: '#fff',
              textDecoration: 'none', fontSize: 15, fontWeight: 700,
            }}>
              Crear mi ID gratis
              <ArrowRight size={16} />
            </Link>
            <a
              href={`/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 24px', borderRadius: 999,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', textDecoration: 'none',
                fontSize: 15, fontWeight: 600,
              }}
            >
              Ver el de {restaurant.name}
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* ── Derecha: preview del ID */}
        <div style={{ position: 'relative' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24, padding: 32,
            textAlign: 'center', backdropFilter: 'blur(10px)',
          }}>
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt=""
                style={{
                  width: 100, height: 100, borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid rgba(255,255,255,0.15)',
                  margin: '0 auto 20px', display: 'block',
                }}
              />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(135deg, #F4705A 0%, #C7522A 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 36, fontWeight: 800,
                margin: '0 auto 20px',
              }}>
                {restaurant.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <h3 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              {restaurant.name}
            </h3>

            {restaurant.city && (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
                {restaurant.city}
              </p>
            )}

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 13, color: 'rgba(255,255,255,0.7)',
            }}>
              menulife.digital/{restaurant.slug}
            </div>
          </div>

          {/* Badge flotante */}
          <div style={{
            position: 'absolute', top: -12, right: -12,
            padding: '6px 12px', borderRadius: 999,
            background: '#F4705A', color: '#fff',
            fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            boxShadow: '0 4px 12px rgba(244,112,90,0.4)',
          }}>
            En vivo
          </div>
        </div>
      </div>

      {/* Mobile: stack vertical */}
      <style>{`
        @media (max-width: 720px) {
          .referral-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
