import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Plus, Minus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import type { DeliveryDriver } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SOURCES = [
  { value: 'rappi',     label: 'Rappi',     color: '#FF6200', emoji: '🟠' },
  { value: 'pedidosya', label: 'PedidosYa', color: '#FFD700', emoji: '🟡' },
  { value: 'whatsapp',  label: 'WhatsApp',  color: '#25D366', emoji: '🟢' },
  { value: 'phone',     label: 'Teléfono',  color: '#3B82F6', emoji: '🔵' },
  { value: 'own',       label: 'Propio',    color: '#FF6B7A', emoji: '🔴' },
  { value: 'other',     label: 'Otro',      color: '#6B7280', emoji: '⚫' },
]

interface TopProduct {
  menu_item_name: string
  last_unit_price: number
  total_ordered: number
}

interface CartItem {
  name: string
  qty: number
  price: number
}

interface ExternalOrderModalProps {
  restaurantId: string
  drivers: DeliveryDriver[]
  onClose: () => void
  onCreated: () => void
}

function fmtPrice(n: number) { return n.toLocaleString('es-AR') }

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: 'rgba(255,255,255,0.9)',
  padding: '9px 12px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

export function ExternalOrderModal({ restaurantId, drivers, onClose, onCreated }: ExternalOrderModalProps) {
  const [source, setSource] = useState('rappi')
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [externalId, setExternalId] = useState('')
  const [notes, setNotes] = useState('')
  const [driverId, setDriverId] = useState('')
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<TopProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const { data } = await db
          .from('view_top_products')
          .select('menu_item_name, last_unit_price, total_ordered')
          .eq('restaurant_id', restaurantId)
          .order('total_ordered', { ascending: false })
          .limit(8)
        setTopProducts(data ?? [])
      } catch {
        // view may not exist — show empty
      } finally {
        setLoadingProducts(false)
      }
    }
    fetchTopProducts()
  }, [restaurantId])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!search.trim()) { setSearchResults([]); return }
    searchTimerRef.current = setTimeout(async () => {
      const { data } = await db
        .from('view_top_products')
        .select('menu_item_name, last_unit_price, total_ordered')
        .eq('restaurant_id', restaurantId)
        .ilike('menu_item_name', `%${search.trim()}%`)
        .order('total_ordered', { ascending: false })
        .limit(8)
      setSearchResults(data ?? [])
    }, 200)
  }, [search, restaurantId])

  const handleSubmit = useCallback(async () => {
    if (!customerName.trim()) { toast.error('Nombre del cliente requerido'); return }
    if (cart.length === 0) { toast.error('Agregá al menos un producto'); return }
    if (submitting) return
    setSubmitting(true)
    try {
      const subtotalVal = cart.reduce((s, i) => s + i.qty * i.price, 0)
      const totalVal = subtotalVal + (orderType === 'delivery' ? deliveryFee : 0)
      const { data: newOrder, error } = await db.from('orders').insert({
        restaurant_id: restaurantId,
        order_type: orderType,
        order_type_detail: orderType,
        status: 'pending',
        delivery_status: 'confirmed',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_address: orderType === 'delivery' ? customerAddress.trim() || null : null,
        delivery_fee: orderType === 'delivery' ? deliveryFee : 0,
        subtotal: subtotalVal,
        total: totalVal,
        currency: 'ARS',
        external_source: source,
        external_order_id: externalId.trim() || null,
        delivery_notes: notes.trim() || null,
        delivery_driver_id: driverId || null,
      }).select('id').single()
      if (error) throw error
      await db.from('order_items').insert(
        cart.map(i => ({
          order_id: newOrder.id,
          menu_item_name: i.name,
          quantity: i.qty,
          unit_price: i.price,
          total_price: i.qty * i.price,
        }))
      )
      toast.success('Pedido creado')
      onCreated()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al crear pedido')
    } finally {
      setSubmitting(false)
    }
  }, [cart, customerName, customerPhone, customerAddress, driverId, deliveryFee, externalId, notes, orderType, restaurantId, source, submitting, onClose, onCreated])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSubmit, onClose])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
    }
    const timer = setTimeout(() => window.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(timer); window.removeEventListener('mousedown', handler) }
  }, [onClose])

  const addToCart = (product: TopProduct) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.name === product.menu_item_name)
      if (idx >= 0) return prev.map((i, j) => j === idx ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { name: product.menu_item_name, qty: 1, price: product.last_unit_price ?? 0 }]
    })
    setSearch('')
    setSearchResults([])
  }

  const addCustomItem = () => {
    const trimmed = search.trim()
    if (!trimmed) return
    setCart(prev => {
      const idx = prev.findIndex(i => i.name === trimmed)
      if (idx >= 0) return prev.map((i, j) => j === idx ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { name: trimmed, qty: 1, price: 0 }]
    })
    setSearch('')
    setSearchResults([])
  }

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => prev.map((i, j) => j === idx ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0))
  }

  const updatePrice = (idx: number, price: number) => {
    setCart(prev => prev.map((i, j) => j === idx ? { ...i, price } : i))
  }

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0)
  const total = subtotal + (orderType === 'delivery' ? deliveryFee : 0)
  const displayedProducts = search.trim() ? searchResults : topProducts
  const sourceObj = SOURCES.find(s => s.value === source)!

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 12px', overflowY: 'auto',
    }}>
      <div
        ref={modalRef}
        style={{
          width: '100%', maxWidth: '560px',
          background: '#13161C', borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
              + Pedido externo
            </h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>Ctrl+Enter para guardar</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Source selector */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Origen
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {SOURCES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSource(s.value)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    border: `2px solid ${source === s.value ? s.color : 'rgba(255,255,255,0.1)'}`,
                    background: source === s.value ? `${s.color}22` : 'transparent',
                    color: source === s.value ? s.color : 'rgba(255,255,255,0.45)',
                    transition: 'all 0.15s',
                  }}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type toggle */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['delivery', 'takeaway'] as const).map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                style={{
                  flex: 1, padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  border: `2px solid ${orderType === t ? (t === 'delivery' ? '#F77F00' : '#3B82F6') : 'rgba(255,255,255,0.1)'}`,
                  background: orderType === t ? (t === 'delivery' ? 'rgba(247,127,0,0.15)' : 'rgba(59,130,246,0.15)') : 'transparent',
                  color: orderType === t ? (t === 'delivery' ? '#F77F00' : '#3B82F6') : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'delivery' ? '🛵 Delivery' : '🥡 Takeaway'}
              </button>
            ))}
          </div>

          {/* Customer fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Nombre *</label>
                <input style={inputStyle} placeholder="Nombre del cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Teléfono</label>
                <input style={inputStyle} placeholder="Ej. 11 1234-5678" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
            </div>
            {orderType === 'delivery' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Dirección</label>
                <input style={inputStyle} placeholder="Calle 123, Piso 2, Dto A" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
              </div>
            )}
          </div>

          {/* Products */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Productos
            </label>

            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                style={{ ...inputStyle, paddingRight: search.trim() ? '90px' : '12px' }}
                placeholder="Buscar o escribir producto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && search.trim() && searchResults.length === 0) addCustomItem() }}
              />
              {search.trim() && (
                <button
                  onClick={addCustomItem}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px',
                    padding: '4px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600,
                  }}
                >
                  + agregar
                </button>
              )}
            </div>

            {/* Product list */}
            {loadingProducts ? (
              <div style={{ textAlign: 'center', padding: '10px' }}><Spinner size="sm" /></div>
            ) : displayedProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {displayedProducts.map(p => (
                  <button
                    key={p.menu_item_name}
                    onClick={() => addToCart(p)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                      transition: 'background 0.12s',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{p.menu_item_name}</span>
                    {(p.last_unit_price ?? 0) > 0 && (
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        ${fmtPrice(p.last_unit_price)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : !search.trim() ? (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                Escribí un producto para buscarlo o agregarlo manualmente
              </p>
            ) : null}

            {/* Cart */}
            {cart.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                      borderBottom: idx < cart.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.85)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={e => updatePrice(idx, parseFloat(e.target.value) || 0)}
                      placeholder="$"
                      style={{ ...inputStyle, width: '72px', padding: '4px 8px', fontSize: '12px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => updateQty(idx, -1)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                        <Minus size={11} />
                      </button>
                      <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                        {item.qty}
                      </span>
                      <button onClick={() => updateQty(idx, 1)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                        <Plus size={11} />
                      </button>
                    </div>
                    <button onClick={() => setCart(prev => prev.filter((_, j) => j !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: '4px', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extra fields row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {orderType === 'delivery' && (
              <div style={{ flex: '1 1 110px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Costo envío</label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder="0"
                  value={deliveryFee || ''}
                  onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
            <div style={{ flex: '1 1 130px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>ID externo</label>
              <input style={inputStyle} placeholder="Nro de pedido" value={externalId} onChange={e => setExternalId(e.target.value)} />
            </div>
            {orderType === 'delivery' && drivers.length > 0 && (
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Repartidor</label>
                <select value={driverId} onChange={e => setDriverId(e.target.value)} style={selectStyle}>
                  <option value="">Sin asignar</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Notas</label>
            <textarea
              style={{ ...inputStyle, minHeight: '58px', resize: 'vertical' } as React.CSSProperties}
              placeholder="Instrucciones especiales, aclaraciones..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Total + submit */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Total del pedido</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-syne)' }}>
                ${fmtPrice(total)}
              </div>
              {orderType === 'delivery' && deliveryFee > 0 && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                  ${fmtPrice(subtotal)} + ${fmtPrice(deliveryFee)} env
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                background: submitting ? 'rgba(255,255,255,0.1)' : sourceObj.color,
                border: 'none', color: '#fff', opacity: submitting ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              {submitting && <Spinner size="sm" />}
              {submitting ? 'Guardando...' : `Crear pedido ${sourceObj.emoji}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
