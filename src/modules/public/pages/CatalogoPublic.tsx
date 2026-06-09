import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, X, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  price_sale: number
  image_url: string | null
  brand: string | null
  sku: string | null
  stock_current: number
  category_id: string | null
  sort_order: number
}

interface ProductCategory {
  id: string
  name: string
  name_en: string | null
  sort_order: number
}

interface SocialLinks {
  whatsapp?: string | null
  instagram?: string | null
  facebook?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

const RESERVED = new Set([
  'dashboard', 'login', 'register', 'mozo', 'kitchen', 'delivery', 'catalogo',
  'r', 'waiter', 'super-admin', 'superadmin', 'onboarding', 'hub',
  'solicitar-acceso', 'auth', 'forgot-password', 'reset-password',
])

function fmt(n: number): string {
  return `$${n.toLocaleString('es-AR')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CatalogoPublic() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)

  const isEN = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')

  useEffect(() => {
    if (!slug || RESERVED.has(slug)) { navigate('/', { replace: true }); return }

    async function load() {
      setLoading(true)

      const { data: rest } = await db
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (!rest) { setNotFound(true); setLoading(false); return }
      setRestaurant(rest as Restaurant)

      const [catsRes, prodRes] = await Promise.all([
        db.from('product_categories')
          .select('id, name, name_en, sort_order')
          .eq('restaurant_id', rest.id)
          .eq('is_active', true)
          .order('sort_order'),
        db.from('products')
          .select('id, name, name_en, description, description_en, price_sale, image_url, brand, sku, stock_current, category_id, sort_order')
          .eq('restaurant_id', rest.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('sort_order'),
      ])

      setCategories(catsRes.data ?? [])
      setProducts(prodRes.data ?? [])
      setLoading(false)
    }

    load()
  }, [slug, navigate])

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      const name = (isEN && p.name_en ? p.name_en : p.name).toLowerCase()
      const desc = (isEN && p.description_en ? p.description_en : p.description ?? '').toLowerCase()
      return (!q || name.includes(q) || desc.includes(q)) && (!activeCat || p.category_id === activeCat)
    })
  }, [products, search, activeCat, isEN])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function pName(p: Product) { return isEN && p.name_en ? p.name_en : p.name }
  function pDesc(p: Product) { return isEN && p.description_en ? p.description_en : p.description }
  function cName(c: ProductCategory) { return isEN && c.name_en ? c.name_en : c.name }
  function catLabel(id: string | null) {
    if (!id) return ''
    return cName(categories.find(c => c.id === id) ?? ({ name: '', name_en: null } as ProductCategory))
  }

  function waUrl(p: Product): string {
    const wa = (restaurant?.social_links as SocialLinks | null)?.whatsapp
    if (!wa) return '#'
    return `https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Me interesa ${p.name}`)}`
  }

  const hasWA = !!((restaurant?.social_links as SocialLinks | null)?.whatsapp)

  // ── Loading / 404 ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1115' }}>
        <div className="w-8 h-8 border-2 border-[#F4705A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0F1115' }}>
        <ShoppingBag className="w-16 h-16" style={{ color: '#374151' }} />
        <h1 className="text-white text-xl font-bold">Catálogo no encontrado</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Este catálogo no existe o no está disponible</p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#0F1115', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 80 }}>

        {/* ── HEADER ── */}
        <div className="px-4 pt-8 pb-5 text-center">
          <a href={`/${slug}`} className="inline-block no-underline">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                style={{ border: '2px solid #F4705A' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-3xl"
                style={{ background: '#F4705A' }}
              >
                {restaurant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h1
              className="text-2xl font-bold text-white mb-1"
              style={{ fontFamily: 'Ruda, Inter, sans-serif' }}
            >
              {restaurant.name}
            </h1>
          </a>
          {restaurant.description && (
            <p className="text-sm leading-snug px-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {restaurant.description}
            </p>
          )}
        </div>

        {/* ── SEARCH ── */}
        <div className="px-4 mb-4">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
            style={{ background: '#1a1a1a', border: '1px solid #2a2d35' }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              placeholder={isEN ? 'Search products...' : 'Buscar productos...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            )}
          </div>
        </div>

        {/* ── CATEGORY PILLS ── */}
        {categories.length > 0 && (
          <div className="px-4 mb-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-2" style={{ width: 'max-content' }}>
              <button
                onClick={() => setActiveCat(null)}
                className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                style={{
                  background: !activeCat ? '#F4705A' : '#1a1a1a',
                  color: !activeCat ? '#fff' : 'rgba(255,255,255,0.45)',
                  border: `1px solid ${!activeCat ? '#F4705A' : '#2a2d35'}`,
                }}
              >
                {isEN ? 'All' : 'Todas'}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                  style={{
                    background: activeCat === cat.id ? '#F4705A' : '#1a1a1a',
                    color: activeCat === cat.id ? '#fff' : 'rgba(255,255,255,0.45)',
                    border: `1px solid ${activeCat === cat.id ? '#F4705A' : '#2a2d35'}`,
                  }}
                >
                  {cName(cat)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PRODUCTS GRID ── */}
        <div className="px-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ShoppingBag className="w-12 h-12" style={{ color: '#374151' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isEN ? 'No products found' : 'No se encontraron productos'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(product => (
                <motion.button
                  key={product.id}
                  onClick={() => setSelected(product)}
                  className="text-left rounded-2xl overflow-hidden"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2d35' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Image */}
                  <div className="relative" style={{ aspectRatio: '1 / 1' }}>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={pName(product)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: '#2a2d35' }}
                      >
                        <ShoppingBag className="w-8 h-8" style={{ color: '#4B5563' }} />
                      </div>
                    )}
                    {product.stock_current <= 0 && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.55)' }}
                      >
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-lg"
                          style={{ background: '#F87171', color: '#fff' }}
                        >
                          {isEN ? 'Out of stock' : 'Agotado'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-white font-bold text-sm leading-tight line-clamp-1">
                      {pName(product)}
                    </p>
                    <p className="text-base font-bold mt-0.5" style={{ color: '#F4705A' }}>
                      {fmt(product.price_sale)}
                    </p>
                    {product.category_id && (
                      <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {catLabel(product.category_id)}
                      </p>
                    )}

                    {hasWA && (
                      <a
                        href={waUrl(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-85"
                        style={{ background: '#25D366' }}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {isEN ? 'Enquire' : 'Consultar'}
                      </a>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="text-center py-10 mt-4">
          <a
            href="https://menulife.digital"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            Creado con{' '}
            <span style={{ color: '#F4705A', fontWeight: 600 }}>MenuLife</span>
          </a>
        </div>
      </div>

      {/* ── PRODUCT DETAIL MODAL ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.72)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
              style={{ background: '#1a1a1a', maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              {/* Close */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <X className="w-4 h-4 text-white" />
              </button>

              {/* Image */}
              <div className="relative" style={{ aspectRatio: '16 / 9' }}>
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt={pName(selected)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: '#2a2d35' }}
                  >
                    <ShoppingBag className="w-16 h-16" style={{ color: '#4B5563' }} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className="text-xl font-bold text-white leading-tight flex-1"
                    style={{ fontFamily: 'Ruda, Inter, sans-serif' }}
                  >
                    {pName(selected)}
                  </h2>
                  <span className="text-xl font-bold flex-shrink-0" style={{ color: '#F4705A' }}>
                    {fmt(selected.price_sale)}
                  </span>
                </div>

                {pDesc(selected) && (
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {pDesc(selected)}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: selected.stock_current > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
                      color: selected.stock_current > 0 ? '#22c55e' : '#F87171',
                    }}
                  >
                    {selected.stock_current > 0
                      ? (isEN ? 'Available' : 'Disponible')
                      : (isEN ? 'Out of stock' : 'Agotado')}
                  </span>

                  {selected.brand && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
                    >
                      {selected.brand}
                    </span>
                  )}

                  {selected.sku && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-mono"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
                    >
                      SKU: {selected.sku}
                    </span>
                  )}
                </div>

                {hasWA ? (
                  <a
                    href={waUrl(selected)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-bold text-white"
                    style={{ background: '#25D366', marginTop: 8 }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    {isEN ? 'Enquire on WhatsApp' : 'Consultar por WhatsApp'}
                  </a>
                ) : (
                  <div
                    className="flex items-center justify-center w-full py-4 rounded-2xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
                  >
                    {isEN ? 'Contact us for more info' : 'Contactanos para más info'}
                  </div>
                )}
              </div>

              <div style={{ height: 'max(env(safe-area-inset-bottom), 16px)' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
