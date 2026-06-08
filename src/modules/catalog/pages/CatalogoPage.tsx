import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ExternalLink, Package, Eye, EyeOff, ShoppingBag, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import toast from 'react-hot-toast'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

interface Product {
  id: string
  name: string
  image_url: string | null
  price_sale: number
  category_id: string | null
  is_active: boolean
  stock_current: number
}

interface Category {
  id: string
  name: string
}

export default function CatalogoPage() {
  const { restaurant, loading: restLoading } = useRestaurant()
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    if (!restaurant?.id) return

    async function load() {
      const [prodRes, catRes] = await Promise.all([
        db.from('products')
          .select('id, name, image_url, price_sale, category_id, is_active, stock_current')
          .eq('restaurant_id', restaurant!.id)
          .is('deleted_at', null)
          .order('sort_order'),
        db.from('product_categories')
          .select('id, name')
          .eq('restaurant_id', restaurant!.id)
          .eq('is_active', true)
          .order('sort_order'),
      ])
      setProducts(prodRes.data ?? [])
      setCategories(catRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [restaurant?.id])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p =>
      (!q || p.name.toLowerCase().includes(q)) &&
      (!activeCat || p.category_id === activeCat)
    )
  }, [products, search, activeCat])

  const activeCount = products.filter(p => p.is_active).length

  async function toggleActive(product: Product) {
    setToggling(product.id)
    const { error } = await db
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)

    if (error) {
      toast.error('Error al actualizar visibilidad')
    } else {
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p)
      )
    }
    setToggling(null)
  }

  function catLabel(id: string | null) {
    if (!id) return ''
    return categories.find(c => c.id === id)?.name ?? ''
  }

  function fmt(n: number) {
    return `$${n.toLocaleString('es-AR')}`
  }

  if (restLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#F4705A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShoppingBag className="w-12 h-12 mb-4" style={{ color: '#374151' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>No se encontró el restaurante</p>
      </div>
    )
  }

  return (
    <div className="min-h-full" style={{ background: '#0F1115' }}>
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-10">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Catálogo</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {activeCount} producto{activeCount !== 1 ? 's' : ''} visibles en tu catálogo público
            </p>
          </div>

          <a
            href={`/catalogo/${restaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: '#F4705A' }}
          >
            Ver catálogo
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* ── GO TO INVENTORY ── */}
        <button
          onClick={() => navigate('/dashboard/inventario')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl mb-5 transition-all hover:opacity-80"
          style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.2)' }}
        >
          <div className="flex items-center gap-2.5">
            <Package className="w-4 h-4" style={{ color: '#F4705A' }} />
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Para crear, editar o eliminar productos ir a{' '}
              <span className="font-semibold text-white">Inventario</span>
            </span>
          </div>
          <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#F4705A' }} />
        </button>

        {/* ── FILTERS ── */}
        <div className="flex gap-3 mb-4">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: '#1a1a1a', border: '1px solid #2a2d35' }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>

          {categories.length > 0 && (
            <select
              value={activeCat ?? ''}
              onChange={e => setActiveCat(e.target.value || null)}
              className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#1a1a1a', border: '1px solid #2a2d35' }}
            >
              <option value="">Todas</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── PRODUCT LIST ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ShoppingBag className="w-12 h-12" style={{ color: '#374151' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>No se encontraron productos</p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#1a1a1a', border: '1px solid #2a2d35' }}
          >
            {filtered.map((product, i) => (
              <div
                key={product.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid #2a2d35' : 'none',
                  opacity: product.is_active ? 1 : 0.45,
                }}
              >
                {/* Thumbnail */}
                <div
                  className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ background: '#2a2d35' }}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" style={{ color: '#4B5563' }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold" style={{ color: '#F4705A' }}>
                      {fmt(product.price_sale)}
                    </span>
                    {product.category_id && (
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                      >
                        {catLabel(product.category_id)}
                      </span>
                    )}
                    {product.stock_current <= 0 && (
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
                      >
                        Sin stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => toggleActive(product)}
                  disabled={toggling === product.id}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: product.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                  }}
                  title={product.is_active ? 'Ocultar del catálogo' : 'Mostrar en catálogo'}
                >
                  {product.is_active ? (
                    <Eye className="w-4 h-4" style={{ color: '#22c55e' }} />
                  ) : (
                    <EyeOff className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── BOTTOM NOTE ── */}
        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Los cambios de visibilidad se reflejan en el catálogo público de inmediato
        </p>
      </div>
    </div>
  )
}
