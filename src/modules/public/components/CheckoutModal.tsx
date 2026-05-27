import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DarkSheet } from './DarkSheet'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/cartStore'
import { useMenuStore } from '@/store/menuStore'
import toast from 'react-hot-toast'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  onSuccess: () => void
  slug?: string
  restaurantName?: string
}

export function CheckoutModal({ isOpen, onClose, restaurantId, onSuccess, slug, restaurantName }: CheckoutModalProps) {
  const navigate = useNavigate()
  const { items, sessionId, clearCart, getTotal } = useCartStore()
  const { currency, language } = useMenuStore()
  const [loading, setLoading] = useState(false)
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [tables, setTables] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    const mesaParam = new URLSearchParams(window.location.search).get('mesa')
    if (mesaParam) setTableNumber(mesaParam)
  }, [])

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
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          session_id: sessionId,
          order_type: orderType,
          table_number: orderType === 'dine_in' ? tableNumber : null,
          customer_name: orderType === 'takeaway' ? customerName : null,
          status: 'pending',
          subtotal: getTotal(currency),
          total: getTotal(currency),
          currency,
        })
        .select()
        .single()

      if (orderError) throw orderError

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
      if (itemsError) throw itemsError

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
        {/* Order type */}
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

        {/* Dine-in: table number */}
        {orderType === 'dine_in' && (
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

        {/* Takeaway: customer name */}
        {orderType === 'takeaway' && (
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
            language === 'ES' ? 'Enviar pedido' : 'Send order'
          )}
        </button>
      </form>
    </DarkSheet>
  )
}
