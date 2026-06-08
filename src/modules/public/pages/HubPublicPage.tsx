import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import type { Restaurant } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubStory {
  id: string
  restaurant_id: string
  image_url: string | null
  title: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface HubFeatured {
  id: string
  restaurant_id: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  image_url: string | null
  cta_text: string | null
  cta_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SocialLinks {
  instagram?: string | null
  facebook?: string | null
  tiktok?: string | null
  whatsapp?: string | null
  google_maps?: string | null
}

// ─── Known route prefixes ─────────────────────────────────────────────────────

const RESERVED_SLUGS = new Set([
  'dashboard', 'login', 'register', 'mozo', 'kitchen', 'delivery',
  'r', 'waiter', 'super-admin', 'superadmin', 'onboarding',
  'solicitar-acceso', 'auth', 'forgot-password', 'reset-password',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSocialLinks(raw: unknown): SocialLinks {
  if (!raw || typeof raw !== 'object') return {}
  return raw as SocialLinks
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-4"
      style={{ background: '#0F1115' }}
    >
      <Globe className="w-16 h-16 mb-4" style={{ color: '#F4705A' }} />
      <h1 className="text-3xl font-bold text-white mb-2">404</h1>
      <p className="text-gray-400 mb-6">Este Hub no fue encontrado.</p>
      <a
        href="/"
        className="text-sm font-semibold px-6 py-3 rounded-xl"
        style={{ background: '#F4705A', color: '#fff' }}
      >
        Volver al inicio
      </a>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0F1115' }}
    >
      <div
        className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#F4705A', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HubPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [story, setStory] = useState<HubStory | null>(null)
  const [featured, setFeatured] = useState<HubFeatured[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return }

    // Guard reserved slugs
    const firstSegment = slug.split('/')[0].toLowerCase()
    if (RESERVED_SLUGS.has(firstSegment)) {
      navigate('/', { replace: true })
      return
    }

    async function loadData() {
      try {
        // 1. Fetch restaurant
        const { data: rest, error: restErr } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug!)
          .eq('is_active', true)
          .single()

        if (restErr || !rest) {
          setNotFound(true)
          return
        }

        setRestaurant(rest as Restaurant)

        // 2. Fetch story (single, may not exist)
        const { data: storyData } = await (supabase as any)
          .from('hub_stories')
          .select('*')
          .eq('restaurant_id', (rest as Restaurant).id)
          .eq('is_active', true)
          .limit(1)
          .single()

        setStory(storyData ?? null)

        // 3. Fetch featured items
        const { data: featuredData } = await (supabase as any)
          .from('hub_featured')
          .select('*')
          .eq('restaurant_id', (rest as Restaurant).id)
          .eq('is_active', true)
          .order('sort_order')
          .limit(10)

        setFeatured(featuredData ?? [])
      } catch (err) {
        console.error('HubPublicPage error:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [slug, navigate])

  if (loading) return <LoadingSpinner />
  if (notFound || !restaurant) return <NotFoundPage />

  const social = parseSocialLinks(restaurant.social_links)
  const waPhone = social.whatsapp || restaurant.phone || ''

  // ── Contact links
  type ContactItem = { href: string; label: string; icon: React.ReactNode }
  const contacts: ContactItem[] = []

  if (waPhone) {
    const cleanPhone = waPhone.replace(/\D/g, '')
    contacts.push({
      href: `https://wa.me/${cleanPhone}`,
      label: 'WhatsApp',
      icon: <MessageCircle className="w-5 h-5" />,
    })
  }
  if (restaurant.phone && !social.whatsapp) {
    contacts.push({
      href: `tel:${restaurant.phone}`,
      label: 'Teléfono',
      icon: <Phone className="w-5 h-5" />,
    })
  }
  if (social.instagram) {
    contacts.push({
      href: `https://instagram.com/${social.instagram}`,
      label: 'Instagram',
      icon: <ExternalLink className="w-5 h-5" />,
    })
  }
  if (social.facebook) {
    contacts.push({
      href: `https://facebook.com/${social.facebook}`,
      label: 'Facebook',
      icon: <ExternalLink className="w-5 h-5" />,
    })
  }
  if (restaurant.website) {
    contacts.push({
      href: restaurant.website,
      label: 'Web',
      icon: <Globe className="w-5 h-5" />,
    })
  }

  // ── Action buttons
  type ActionBtn = { label: string; href: string; external?: boolean }
  const actions: ActionBtn[] = []

  if (restaurant.business_type === 'retail') {
    actions.push({ label: '🛍 Ver Catálogo', href: `/r/${slug}` })
    if (waPhone) {
      const cleanPhone = waPhone.replace(/\D/g, '')
      actions.push({ label: '💬 Contacto', href: `https://wa.me/${cleanPhone}`, external: true })
    }
  } else {
    // gastronomy (default)
    actions.push({ label: '🍽 Ver Menú', href: `/r/${slug}` })
    if (restaurant.reservations_enabled) {
      actions.push({ label: '📅 Reservar', href: `/r/${slug}/reservar` })
    }
    if (restaurant.delivery_enabled) {
      actions.push({ label: '🛵 Delivery', href: `/r/${slug}?type=delivery` })
    }
    if (waPhone) {
      const cleanPhone = waPhone.replace(/\D/g, '')
      actions.push({ label: '💬 Contacto', href: `https://wa.me/${cleanPhone}`, external: true })
    }
  }

  const addressFull = [restaurant.address, restaurant.city].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen" style={{ background: '#0F1115' }}>
      <div className="max-w-[480px] mx-auto pb-8">

        {/* ── 1. Historia ── */}
        {story && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative w-full h-48 overflow-hidden"
          >
            {story.image_url ? (
              <img
                src={story.image_url}
                alt={story.title ?? 'Historia'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#F4705A,#0F1115)' }} />
            )}
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center px-4">
              {story.title && (
                <p className="font-bold text-white text-xl mb-1">{story.title}</p>
              )}
              {story.description && (
                <p className="text-gray-300 text-sm">{story.description}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── 2. Header ── */}
        <div className="relative">
          {/* Banner */}
          {restaurant.cover_image_url ? (
            <img
              src={restaurant.cover_image_url}
              alt="banner"
              className="w-full h-40 object-cover"
            />
          ) : (
            <div
              className="w-full h-40"
              style={{ background: 'linear-gradient(135deg,#F4705A,#0F1115)' }}
            />
          )}

          {/* Logo */}
          <div className="absolute -bottom-10 left-4">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-20 h-20 rounded-full border-2 border-white object-cover"
                style={{ background: '#1a1a1a' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: '#F4705A' }}
              >
                {restaurant.name[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* ── Name + Description ── */}
        <div className="pt-14 px-4">
          <h1 className="font-bold text-2xl text-white">{restaurant.name}</h1>
          {restaurant.description && (
            <p
              className="text-gray-400 text-sm mt-1"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {restaurant.description}
            </p>
          )}
        </div>

        {/* ── 3. Contact Icons ── */}
        {contacts.length > 0 && (
          <div className="flex flex-wrap gap-3 px-4 mt-4">
            {contacts.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                title={c.label}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: 'rgba(244,112,90,0.15)',
                  border: '1px solid rgba(244,112,90,0.4)',
                  color: '#F4705A',
                }}
              >
                {c.icon}
              </a>
            ))}
          </div>
        )}

        {/* ── 4. Location ── */}
        {addressFull && (
          <div
            className="mx-4 mt-4 rounded-xl p-4"
            style={{ background: '#1a1a1a', border: '1px solid #374151' }}
          >
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#F4705A' }} />
              <p className="text-gray-300 text-sm">{addressFull}</p>
            </div>
            <button
              onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(addressFull)}`)}
              className="text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'rgba(244,112,90,0.15)', color: '#F4705A', border: '1px solid rgba(244,112,90,0.3)' }}
            >
              Ver en mapa
            </button>
          </div>
        )}

        {/* ── 5. Featured ── */}
        {featured.length > 0 && (
          <div className="mt-6 px-4">
            <h2 className="text-white font-semibold text-lg mb-3">Destacados</h2>
            <div className="flex overflow-x-auto gap-3 pb-2" style={{ scrollbarWidth: 'none' }}>
              {featured.map((item) => (
                <div
                  key={item.id}
                  className="w-56 flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
                  style={{ background: '#1a1a1a', border: '1px solid #374151' }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-32"
                      style={{ background: 'linear-gradient(135deg,#F4705A44,#1a1a1a)' }}
                    />
                  )}
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="font-semibold text-white text-sm">{item.title}</p>
                    {item.description && (
                      <p
                        className="text-gray-400 text-xs mt-1"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.description}
                      </p>
                    )}
                    {item.cta_text && item.cta_url && (
                      <a
                        href={item.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto text-center text-xs font-semibold py-2 rounded-lg mt-3 transition-all hover:opacity-80"
                        style={{ background: '#F4705A', color: '#fff', marginTop: 'auto' }}
                      >
                        {item.cta_text}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 6. Action Buttons ── */}
        {actions.length > 0 && (
          <div
            className={`px-4 mt-6 grid gap-3 ${actions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
          >
            {actions.map((btn) =>
              btn.external ? (
                <a
                  key={btn.label}
                  href={btn.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center py-4 rounded-xl font-semibold text-white transition-all hover:opacity-80 active:scale-95"
                  style={{ background: '#F4705A' }}
                >
                  {btn.label}
                </a>
              ) : (
                <a
                  key={btn.label}
                  href={btn.href}
                  className="text-center py-4 rounded-xl font-semibold text-white transition-all hover:opacity-80 active:scale-95"
                  style={{ background: '#F4705A' }}
                >
                  {btn.label}
                </a>
              )
            )}
          </div>
        )}

        {/* ── 7. Footer ── */}
        <p className="text-center text-xs mt-8 mb-4" style={{ color: '#4B5563' }}>
          Creado con MenuLife
        </p>
      </div>
    </div>
  )
}
