import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type MovType = 'purchase' | 'sale' | 'adjustment' | 'loss' | 'return' | 'transfer'

interface Movement {
  id: string
  restaurant_id: string
  product_id: string
  type: MovType
  quantity: number
  previous_stock: number
  new_stock: number
  unit_cost: number | null
  reason: string | null
  created_at: string
  product?: { name: string }
}

interface Product {
  id: string
  name: string
  stock_current: number
  stock_min: number
  is_active: boolean
}

interface Props {
  restaurantId: string
  prefillProductId?: string
  onPrefillConsumed?: () => void
}

const TYPE_LABELS: Record<MovType, string> = {
  purchase:   'Compra',
  sale:       'Venta',
  adjustment: 'Ajuste',
  loss:       'Pérdida',
  return:     'Devolución',
  transfer:   'Transferencia',
}

const TYPE_COLORS: Record<MovType, { bg: string; text: string }> = {
  purchase:   { bg: 'rgba(34,197,94,0.15)',  text: '#22c55e' },
  sale:       { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
  adjustment: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  loss:       { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444' },
  return:     { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  transfer:   { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
}

const MUTED = 'rgba(255,255,255,0.45)'
const TEXT  = '#F5F7FA'
const CARD  = '#1a1a1a'
const BDR   = '1px solid rgba(255,255,255,0.08)'

function TypeBadge({ type }: { type: MovType }) {
  const c = TYPE_COLORS[type] ?? { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// Modal -------------------------------------------------------------------

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  products: Product[]
  prefillProductId?: string
  onSaved: () => void
}

function MovimientoModal({ isOpen, onClose, restaurantId, products, prefillProductId, onSaved }: ModalProps) {
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<MovType>('purchase')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [reason, setReason] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setType('purchase')
    setQuantity('')
    setUnitCost('')
    setReason('')
    setProductSearch('')
    if (prefillProductId) {
      setProductId(prefillProductId)
      const p = products.find(x => x.id === prefillProductId)
      if (p) setProductSearch(p.name)
    } else {
      setProductId('')
    }
  }, [isOpen, prefillProductId, products])

  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase()
    return !q || p.name.toLowerCase().includes(q)
  })

  async function handleSubmit() {
    if (!productId) { toast.error('Seleccioná un producto'); return }
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) { toast.error('La cantidad debe ser mayor a 0'); return }

    setSaving(true)
    try {
      // Fetch current stock
      const { data: prodData, error: prodErr } = await db
        .from('products')
        .select('stock_current, stock_min')
        .eq('id', productId)
        .single()
      if (prodErr) throw prodErr

      const prevStock: number = prodData.stock_current
      const stockMin: number = prodData.stock_min

      // Compute new stock
      let newStock: number
      if (type === 'purchase' || type === 'return') {
        newStock = prevStock + qty
      } else if (type === 'loss' || type === 'transfer' || type === 'sale') {
        newStock = Math.max(0, prevStock - qty)
      } else {
        // adjustment: quantity is signed — but since we only take positive input,
        // we compare to previous
        newStock = qty  // for adjustment, treat quantity as absolute new stock? No:
        // Based on spec: "adjustment: signed by user input" → we take the raw number
        // But input is "positive number" — so adjustments are +qty
        newStock = prevStock + qty
      }

      // Insert movement
      const { error: movErr } = await db.from('inventory_movements').insert({
        restaurant_id: restaurantId,
        product_id: productId,
        type,
        quantity: qty,
        previous_stock: prevStock,
        new_stock: newStock,
        unit_cost: (type === 'purchase' && unitCost) ? parseFloat(unitCost) : null,
        reason: reason.trim() || null,
      })
      if (movErr) throw movErr

      // Update product stock
      const { error: updateErr } = await db
        .from('products')
        .update({ stock_current: newStock, updated_at: new Date().toISOString() })
        .eq('id', productId)
      if (updateErr) throw updateErr

      // Create alert if below min
      if (newStock <= stockMin) {
        const alertType = newStock === 0 ? 'out_of_stock' : 'low_stock'
        await db.from('inventory_alerts').insert({
          restaurant_id: restaurantId,
          product_id: productId,
          type: alertType,
          message: newStock === 0 ? 'Producto sin stock' : `Stock bajo: ${newStock} unidades (mínimo ${stockMin})`,
          is_resolved: false,
        })
      }

      toast.success('Movimiento registrado')
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar movimiento'
      toast.error(msg)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#16181F] border border-white/[0.08] rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-lg font-semibold" style={{ color: TEXT }}>Registrar movimiento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white/50" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {/* Product search */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Producto *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setProductId('') }}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
            {productSearch && !productId && (
              <div className="mt-1 rounded-lg bg-[#0F1115] border border-gray-700 max-h-40 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="px-3 py-2 text-xs" style={{ color: MUTED }}>Sin resultados</p>
                ) : (
                  filteredProducts.slice(0, 20).map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.05] transition-colors"
                      style={{ color: TEXT }}
                      onClick={() => { setProductId(p.id); setProductSearch(p.name) }}
                    >
                      {p.name}
                      <span className="ml-2 text-xs" style={{ color: MUTED }}>Stock: {p.stock_current}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {productId && (
              <p className="text-xs mt-1 text-green-400">
                ✓ {products.find(p => p.id === productId)?.name}
              </p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Tipo *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as MovType)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
            >
              <option value="purchase">Compra</option>
              <option value="adjustment">Ajuste (sumar)</option>
              <option value="loss">Pérdida</option>
              <option value="return">Devolución</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Cantidad *</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
            />
          </div>

          {/* Unit cost (only for purchase) */}
          {type === 'purchase' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Costo unitario</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Motivo (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Compra del proveedor XYZ"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1115] border border-gray-700 focus:outline-none focus:border-[#F4705A]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.08]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: '#F4705A' }}
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

// Main -------------------------------------------------------------------

export function MovimientosTab({ restaurantId, prefillProductId, onPrefillConsumed }: Props) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<MovType | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('products')
        .select('id, name, stock_current, stock_min, is_active')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      setProducts(data ?? [])
    } catch (err) {
      console.error('Error loading products', err)
    }
  }, [restaurantId])

  const fetchMovements = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('inventory_movements')
        .select('*, product:product_id(name)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setMovements(data ?? [])
    } catch (err) {
      toast.error('Error al cargar movimientos')
      console.error(err)
    }
  }, [restaurantId])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchMovements(), fetchProducts()]).finally(() => setLoading(false))
  }, [fetchMovements, fetchProducts])

  // Auto-open modal if prefillProductId is set
  useEffect(() => {
    if (prefillProductId && products.length > 0) {
      setModalOpen(true)
    }
  }, [prefillProductId, products])

  function handleModalClose() {
    setModalOpen(false)
    onPrefillConsumed?.()
  }

  const filtered = filterType === 'all' ? movements : movements.filter(m => m.type === filterType)

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
      <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as MovType | 'all')}
          className="px-3 py-2 rounded-lg text-sm text-white bg-[#1a1a1a] border border-gray-800 focus:outline-none focus:border-[#F4705A]"
        >
          <option value="all">Todos los tipos</option>
          <option value="purchase">Compra</option>
          <option value="sale">Venta</option>
          <option value="adjustment">Ajuste</option>
          <option value="loss">Pérdida</option>
          <option value="return">Devolución</option>
          <option value="transfer">Transferencia</option>
        </select>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-80 transition-opacity"
          style={{ background: '#F4705A' }}
        >
          <Plus className="w-4 h-4" />
          Registrar movimiento
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: MUTED }}>
          <p>No hay movimientos registrados</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: BDR }}>
          {/* Header */}
          <div
            className="hidden sm:grid grid-cols-[1fr_160px_100px_100px_1fr] gap-4 px-4 py-3 text-xs font-medium"
            style={{ background: '#131519', color: MUTED, borderBottom: BDR }}
          >
            <span>Producto</span>
            <span>Tipo</span>
            <span className="text-center">Cantidad</span>
            <span className="text-center">Stock</span>
            <span>Motivo</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {filtered.map(mov => (
              <div
                key={mov.id}
                className="px-4 py-3 hover:bg-white/[0.02] transition-colors"
                style={{ background: CARD }}
              >
                {/* Mobile */}
                <div className="sm:hidden space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: TEXT }}>
                      {mov.product?.name ?? '—'}
                    </span>
                    <TypeBadge type={mov.type} />
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: MUTED }}>
                    <span>+{mov.quantity}</span>
                    <span>{mov.previous_stock} → {mov.new_stock}</span>
                    <span>{formatDate(mov.created_at)}</span>
                  </div>
                  {mov.reason && <p className="text-xs" style={{ color: MUTED }}>{mov.reason}</p>}
                </div>

                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[1fr_160px_100px_100px_1fr] gap-4 items-center">
                  <div>
                    <p className="text-sm font-medium" style={{ color: TEXT }}>{mov.product?.name ?? '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: MUTED }}>{formatDate(mov.created_at)}</p>
                  </div>
                  <TypeBadge type={mov.type} />
                  <p className="text-sm text-center font-medium" style={{ color: TEXT }}>
                    {mov.type === 'loss' || mov.type === 'transfer' || mov.type === 'sale'
                      ? `-${mov.quantity}`
                      : `+${mov.quantity}`
                    }
                  </p>
                  <p className="text-xs text-center" style={{ color: MUTED }}>
                    {mov.previous_stock} → <span style={{ color: TEXT }}>{mov.new_stock}</span>
                  </p>
                  <p className="text-xs truncate" style={{ color: MUTED }}>{mov.reason ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MovimientoModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        restaurantId={restaurantId}
        products={products}
        prefillProductId={prefillProductId}
        onSaved={() => { fetchMovements(); fetchProducts() }}
      />
    </div>
  )
}
