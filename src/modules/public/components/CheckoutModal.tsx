import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/cartStore'
import { useMenuStore } from '@/store/menuStore'
import toast from 'react-hot-toast'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  onSuccess: () => void
}

export function CheckoutModal({ isOpen, onClose, restaurantId, onSuccess }: CheckoutModalProps) {
  const { items, sessionId, clearCart, getTotal } = useCartStore()
  const { currency, language } = useMenuStore()
  const [loading, setLoading] = useState(false)
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [tables, setTables] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mesaParam = params.get('mesa')
    if (mesaParam) {
      setTableNumber(mesaParam)
    }
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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      toast.success(language === 'ES' ? '¡Pedido enviado!' : 'Order sent!')
      clearCart()
      onSuccess()
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al enviar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const title = language === 'ES' ? 'Confirmar Pedido' : 'Confirm Order'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOrderType('dine_in')}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              orderType === 'dine_in'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-emerald-500'
            }`}
          >
            <div className="text-2xl mb-1">🍽️</div>
            <div className="font-medium">
              {language === 'ES' ? 'Comer aquí' : 'Dine in'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOrderType('takeaway')}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              orderType === 'takeaway'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-emerald-500'
            }`}
          >
            <div className="text-2xl mb-1">📦</div>
            <div className="font-medium">
              {language === 'ES' ? 'Para llevar' : 'Takeaway'}
            </div>
          </button>
        </div>

        {orderType === 'dine_in' && (
          tables.length > 0 ? (
            <Select
              label={language === 'ES' ? 'Mesa' : 'Table'}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              options={[
                { value: '', label: language === 'ES' ? 'Seleccionar mesa' : 'Select table' },
                ...tables,
              ]}
              required
            />
          ) : (
            <Input
              label={language === 'ES' ? 'Número de Mesa' : 'Table Number'}
              placeholder="7"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
            />
          )
        )}

        {orderType === 'takeaway' && (
          <Input
            label={language === 'ES' ? 'Tu Nombre' : 'Your Name'}
            placeholder={language === 'ES' ? 'Juan Pérez' : 'John Doe'}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {language === 'ES' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={loading}>
            {language === 'ES' ? 'Enviar Pedido' : 'Send Order'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
