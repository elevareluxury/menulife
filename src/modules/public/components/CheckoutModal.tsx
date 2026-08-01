import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DarkSheet } from './DarkSheet'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/cartStore'
import { useMenuStore } from '@/store/menuStore'
import toast from 'react-hot-toast'
import type { OrderTypeData } from '@/types'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  onSuccess: () => void
  slug?: string
  restaurantName?: string
  businessType?: string
  orderTypeData?: OrderTypeData | null
  mesaParam?: string | null
}

export function CheckoutModal({ isOpen, onClose, restaurantId, onSuccess, slug, restaurantName, businessType: businessTypeProp, orderTypeData, mesaParam }: CheckoutModalProps) {
  const navigate = useNavigate()
  const { items, sessionId, clearCart, getTotal } = useCartStore()
  const { currency, language } = useMenuStore()
  const [loading, setLoading] = useState(false)
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [tables, setTables] = useState<{ value: string; label: string }[]>([])

  // Pre-fill from orderTypeData (delivery/takeaway pre-selection)
  const isPreSelected = !!orderTypeData && orderTypeData.type !== 'dine_in'
  const deliveryFee = orderTypeData?.deliveryFee ?? 0

  useEffect(() => {
    if (mesaParam) setTableNumber(mesaParam)
  }, [mesaParam])

  useEffect(() => {
    if (!restaurantId || orderType !== 'dine_in') return
    async function fetchTables() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('tables')
        .select('table_number')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('table_number')
      if (data) {
        setTables((data as { table_number: string }[]).map(t => ({
          value: t.table_number,
          label: `Mesa ${t.table_number}`,
        })))
      }
    }
    fetchTables()
  }, [restaurantId, orderType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const subtotal = getTotal(currency)
      const total = subtotal + deliveryFee

      // Build order payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderPayload: Record<string, any> = {
        restaurant_id: restaurantId,
        session_id: sessionId,
        status: 'pending',
        subtotal,
        total,
        currency,
      }

      if (isPreSelected && orderTypeData) {
        orderPayload.order_type = orderTypeData.type
        orderPayload.order_type_detail = orderTypeData.type
        orderPayload.customer_name = orderTypeData.customerName ?? null
        orderPayload.customer_phone = orderTypeData.customerPhone ?? null
        orderPayload.customer_address = orderTypeData.customerAddress
          ? [orderTypeData.customerAddress, orderTypeData.customerAddressExtra].filter(Boolean).join(', ')
          : null
        orderPayload.delivery_fee = deliveryFee
        orderPayload.delivery_notes = orderTypeData.notes ?? null
        orderPayload.delivery_status = 'pending'
        orderPayload.table_number = null
      } else {
        orderPayload.order_type = orderType
        orderPayload.table_number = orderType === 'dine_in' ? tableNumber : null
        orderPayload.customer_name = orderType === 'takeaway' ? customerName : null
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single()

      if (orderError) {
        console.error('[Checkout] orders INSERT error:', orderError)
        throw orderError
      }

      // Snapshot cart items before clearCart()
      const cartSnapshot = items.map(i => ({ name: i.name, quantity: i.quantity }))

      const orderItems = items.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        menu_item_name: item.name,
        menu_item_name_en: item.name_en,
        quantity: item.quantity,
        price_snapshot: currency === 'ARS' ? item.price_ars : item.price_usd,
        currency,
        notes: item.notes || null,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) {
        console.error('[Checkout] order_items INSERT error:', itemsError)
        throw itemsError
      }

      // Stock decrement for retail businesses (best-effort)
      try {
        const effectiveBusinessType = businessTypeProp ?? (await (supabase as any)
          .from('restaurants')
          .select('business_type')
          .eq('id', restaurantId)
          .single()
          .then(({ data }: { data: { business_type: string } | null }) => data?.business_type))

        if (effectiveBusinessType === 'retail') {
          for (const item of items) {
            // Prefer ID lookup (exact, no ambiguity); fall back to exact name match
            // Note: .ilike was replaced with .eq — ilike matches substrings ('Café' → 'Café con leche')
            let productQuery = (supabase as any)
              .from('products')
              .select('id, stock_current, stock_min')
              .eq('restaurant_id', restaurantId)

            if (item.product_id) {
              productQuery = productQuery.eq('id', item.product_id)
            } else {
              productQuery = productQuery.eq('name', item.name)
            }

            const { data: product } = await productQuery.maybeSingle()

            if (!product || (product.stock_current ?? 0) <= 0) continue

            const newStock = Math.max(0, (product.stock_current ?? 0) - item.quantity)

            await (supabase as any)
              .from('products')
              .update({ stock_current: newStock })
              .eq('id', product.id)

            await (supabase as any)
              .from('inventory_movements')
              .insert({
                restaurant_id: restaurantId,
                product_id: product.id,
                type: 'sale',
                quantity: item.quantity,
                reason: `Venta online #${order.id.slice(0, 8)}`,
              })

            const alertType = newStock === 0
              ? 'out_of_stock'
              : product.stock_min != null && newStock <= product.stock_min
                ? 'low_stock'
                : null

            if (alertType) {
              await (supabase as any)
                .from('inventory_alerts')
                .insert({
                  restaurant_id: restaurantId,
                  product_id: product.id,
                  alert_type: alertType,
                  is_resolved: false,
                })
            }
          }
        }
      } catch (stockErr) {
        console.error('[Checkout] stock decrement error:', stockErr)
      }

      // Persist order for tracking + banner
      if (slug) {
        sessionStorage.setItem(
          `order_${slug}`,
          JSON.stringify({
            orderId: order.id,
            tableNumber: order.table_number,
            createdAt: order.created_at,
            total: order.total,
            status: 'pending',
            restaurantName: restaurantName ?? '',
            items: cartSnapshot,
          })
        )
      }

      toast.success(language === 'ES' ? '¡Pedido enviado!' : 'Order sent!')
      clearCart()
      onSuccess()
      onClose()

      if (slug) {
        navigate(`/r/${slug}/pedido/${order.id}`)
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al enviar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-2xl text-sm outline-none transition-colors"
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--menu-card-elevated, #1A1A1A)',
    border: '1px solid var(--menu-border, rgba(255,255,255,0.06))',
    color: 'var(--menu-text-primary, #F5F5F5)',
  }

  return (
    <DarkSheet
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ES' ? 'Confirmar pedido' : 'Confirm order'}
    >
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5 pb-8">
        {/* Order type — only show when NOT pre-selected from delivery/takeaway flow */}
        {!isPreSelected && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'dine_in'  as const, emoji: '🍽️', label: language === 'ES' ? 'Comer aquí' : 'Dine in'  },
              { type: 'takeaway' as const, emoji: '📦', label: language === 'ES' ? 'Para llevar' : 'Takeaway' },
            ].map(opt => {
              const active = orderType === opt.type
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setOrderType(opt.type)}
                  className="p-4 rounded-2xl text-center transition-all"
                  style={{
                    backgroundColor: active ? 'rgba(255,107,107,0.12)' : 'var(--menu-card-elevated, #1A1A1A)',
                    border: `1.5px solid ${active ? 'var(--menu-accent, #FF6B6B)' : 'var(--menu-border, rgba(255,255,255,0.06))'}`,
                  }}
                >
                  <div className="text-2xl mb-1">{opt.emoji}</div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: active ? 'var(--menu-accent, #FF6B6B)' : 'var(--menu-text-secondary, #888888)' }}
                  >
                    {opt.label}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Pre-selected delivery/takeaway summary */}
        {isPreSelected && orderTypeData && (
          <div className="p-3 rounded-2xl text-sm space-y-1" style={{ backgroundColor: 'rgba(247,127,0,0.08)', border: '1px solid rgba(247,127,0,0.2)' }}>
            <p className="font-semibold" style={{ color: '#F77F00' }}>
              {orderTypeData.type === 'delivery' ? '🛵 Delivery' : '🥡 Para llevar'}
            </p>
            {orderTypeData.customerName && <p style={{ color: 'var(--menu-text-secondary, #888)' }}>👤 {orderTypeData.customerName}</p>}
            {orderTypeData.customerPhone && <p style={{ color: 'var(--menu-text-secondary, #888)' }}>📱 {orderTypeData.customerPhone}</p>}
            {orderTypeData.customerAddress && <p style={{ color: 'var(--menu-text-secondary, #888)' }}>📍 {orderTypeData.customerAddress}</p>}
            {deliveryFee > 0 && <p style={{ color: 'var(--menu-text-secondary, #888)' }}>🛵 Envío: ${deliveryFee.toLocaleString('es-AR')}</p>}
          </div>
        )}

        {/* Dine-in: table number */}
        {!isPreSelected && orderType === 'dine_in' && (
          tables.length > 0 ? (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--menu-text-secondary, #888888)' }}>
                {language === 'ES' ? 'Mesa' : 'Table'}
              </label>
              <select
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                required
                className={inputClass}
                style={inputStyle}
              >
                <option value="">{language === 'ES' ? 'Seleccionar mesa' : 'Select table'}</option>
                {tables.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--menu-text-secondary, #888888)' }}>
                {language === 'ES' ? 'Número de mesa' : 'Table number'}
              </label>
              <input
                type="text"
                placeholder="7"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                required
                className={inputClass}
                style={inputStyle}
              />
            </div>
          )
        )}

        {/* Takeaway: customer name — only when not pre-selected */}
        {!isPreSelected && orderType === 'takeaway' && (
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--menu-text-secondary, #888888)' }}>
              {language === 'ES' ? 'Tu nombre' : 'Your name'}
            </label>
            <input
              type="text"
              placeholder={language === 'ES' ? 'Juan Pérez' : 'John Doe'}
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-opacity disabled:opacity-60"
          style={{
            background: 'var(--menu-accent-gradient, linear-gradient(135deg,#FF6B6B,#FF8E53))',
            boxShadow: '0 8px 24px rgba(255,107,107,0.35)',
            marginBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {language === 'ES' ? 'Enviando...' : 'Sending...'}
            </span>
          ) : (
            language === 'ES'
            ? `Enviar pedido${deliveryFee > 0 ? ` (+$${deliveryFee.toLocaleString('es-AR')} envío)` : ''}`
            : 'Send order'
          )}
        </button>
      </form>
    </DarkSheet>
  )
}
