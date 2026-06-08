import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { ProductModal, type Product } from './ProductModal'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface Category {
  id: string
  name: string
}

interface Props {
  restaurantId: string
}

type StockFilter = 'all' | 'low' | 'out'
type SortField = 'name' | 'price_sale' | 'stock_current'

const MUTED = 'rgba(255,255,255,0.45)'
const TEXT  = '#F5F7FA'
const CARD  = '#1a1a1a'
const BDR   = '1px solid rgba(255,255,255,0.08)'

function StockBadge({ current, min }: { current: number; min: number }) {
  if (current === 0) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
        Sin stock
      </span>
    )
  }
  if (current <= min) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
        Stock bajo ({current})
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
      {current} u.
    </span>
  )
}

export function ProductosTab({ restaurantId }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStock, setFilterStock] = useState<StockFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('product_categories')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
      if (error) throw error
      setCategories(data ?? [])
    } catch (err) {
      console.error('Error loading categories', err)
    }
  }, [restaurantId])

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      if (error) throw error
      setProducts(data ?? [])
    } catch (err) {
      toast.error('Error al cargar productos')
      console.error(err)
    }
  }, [restaurantId])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchProducts(), fetchCategories()]).finally(() => setLoading(false))
  }, [fetchProducts, fetchCategories])

  async function toggleActive(product: Product) {
    setTogglingId(product.id)
    try {
      const { error } = await db
        .from('products')
        .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
        .eq('id', product.id)
      if (error) throw error
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p))
    } catch (err) {
      toast.error('Error al actualizar')
      console.error(err)
    } finally {
      setTogglingId(null)
    }
  }

  function handleSaved() {
    fetchProducts()
  }

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase()
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? '').toLowerCase().includes(q)) return false
      if (filterCategory && p.category_id !== filterCategory) return false
      if (filterStock === 'out' && p.stock_current !== 0) return false
      if (filterStock === 'low' && !(p.stock_current > 0 && p.stock_current <= p.stock_min)) return false
      return true
    })
    .sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name)
      if (sortField === 'price_sale') return b.price_sale - a.price_sale
      return b.stock_current - a.stock_current
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#F4705A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white bg-[#1a1a1a] border border-gray-800 focus:outline-none focus:border-[#F4705A]"
          />
        </div>

        {/* Filters */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white bg-[#1a1a1a] border border-gray-800 focus:outline-none focus:border-[#F4705A]"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={filterStock}
          onChange={e => setFilterStock(e.target.value as StockFilter)}
          className="px-3 py-2 rounded-lg text-sm text-white bg-[#1a1a1a] border border-gray-800 focus:outline-none focus:border-[#F4705A]"
        >
          <option value="all">Todo el stock</option>
          <option value="low">Stock bajo</option>
          <option value="out">Sin stock</option>
        </select>

        <select
          value={sortField}
          onChange={e => setSortField(e.target.value as SortField)}
          className="px-3 py-2 rounded-lg text-sm text-white bg-[#1a1a1a] border border-gray-800 focus:outline-none focus:border-[#F4705A]"
        >
          <option value="name">Ordenar: Nombre</option>
          <option value="price_sale">Ordenar: Precio</option>
          <option value="stock_current">Ordenar: Stock</option>
        </select>

        <button
          onClick={() => { setSelectedProduct(null); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap hover:opacity-80 transition-opacity"
          style={{ background: '#F4705A' }}
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </button>
      </div>

      {/* Count */}
      <p className="text-xs mb-3" style={{ color: MUTED }}>{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p style={{ color: MUTED }}>No se encontraron productos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(product => (
            <div
              key={product.id}
              className="rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-gray-700 transition-colors"
              style={{ background: CARD, border: BDR }}
              onClick={() => { setSelectedProduct(product); setModalOpen(true) }}
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/[0.05] flex items-center justify-center">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  : <Package className="w-5 h-5 text-gray-600" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" style={{ color: TEXT }}>{product.name}</span>
                  {product.sku && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.05] font-mono" style={{ color: MUTED }}>
                      {product.sku}
                    </span>
                  )}
                  {!product.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Inactivo</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {product.category_id && (
                    <span className="text-xs" style={{ color: MUTED }}>
                      {categoryMap[product.category_id] ?? 'Categoría'}
                    </span>
                  )}
                </div>
              </div>

              {/* Price & cost */}
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{formatPrice(product.price_sale, 'ARS')}</p>
                {product.cost > 0 && (
                  <p className="text-xs" style={{ color: MUTED }}>Costo: {formatPrice(product.cost, 'ARS')}</p>
                )}
                {product.price_sale > 0 && (
                  <p className="text-xs text-green-400">
                    Margen: {((product.price_sale - product.cost) / product.price_sale * 100).toFixed(0)}%
                  </p>
                )}
              </div>

              {/* Stock badge */}
              <div className="shrink-0">
                <StockBadge current={product.stock_current} min={product.stock_min} />
              </div>

              {/* Active toggle */}
              <div
                className="shrink-0"
                onClick={e => { e.stopPropagation(); toggleActive(product) }}
              >
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={product.is_active}
                    disabled={togglingId === product.id}
                    readOnly
                  />
                  <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:bg-[#F4705A] transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedProduct(null) }}
        restaurantId={restaurantId}
        product={selectedProduct}
        categories={categories}
        onSaved={handleSaved}
      />
    </div>
  )
}
