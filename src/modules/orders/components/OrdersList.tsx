import { useState } from 'react'
import { Clock, Utensils, Package, CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { formatPrice, getTimeSince } from '@/lib/utils'
import { CheckoutModal } from '@/modules/pos/components/CheckoutModal'
import toast from 'react-hot-toast'

interface OrderItem {
  id: string
  menu_item_name: string
  quantity: number
  notes: string | null
}

interface Order {
  id: string
  order_type: string
  table_number: string | null
  customer_name: string | null
  status: string
  total: number
  currency: string
  created_at: string
  items: OrderItem[]
}

type OrderStatus = 'pending' | 'cooking' | 'ready' | 'delivered' | 'cancelled' | 'confirmed'

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Nuevo',      color: 'bg-blue-100 text-blue-800' },
  cooking:   { label: 'Preparando', color: 'bg-yellow-100 text-yellow-800' },
  ready:     { label: 'Listo',      color: 'bg-green-100 text-green-800' },
  delivered: { label: 'Entregado',  color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelado',  color: 'bg-red-100 text-red-800' },
}

interface OrdersListProps {
  orders: Order[]
  showActions?: boolean
  restaurantId?: string
}

export function OrdersList({ orders, showActions = true, restaurantId }: OrdersListProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [checkoutOrder, setCheckoutOrder] = useState<{ id: string; tableNumber: string } | null>(null)

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      next.has(orderId) ? next.delete(orderId) : next.add(orderId)
      return next
    })
  }

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
      if (error) throw error
      toast.success('Estado actualizado')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar')
    }
  }

  const cancelOrder = async (orderId: string) => {
    if (!confirm('¿Cancelar este pedido?')) return
    await updateStatus(orderId, 'cancelled')
  }

  if (orders.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No hay pedidos</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isExpanded = expandedOrders.has(order.id)
        const { minutes, color } = getTimeSince(order.created_at)
        const badge = STATUS_BADGES[order.status] ?? STATUS_BADGES.pending

        return (
          <Card key={order.id} className="p-4">
            <div
              className="flex items-start justify-between cursor-pointer"
              onClick={() => toggleExpand(order.id)}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                  {order.order_type === 'dine_in' ? (
                    <Utensils className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Package className="w-5 h-5 text-emerald-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold">
                      {order.order_type === 'dine_in'
                        ? `Mesa ${order.table_number}`
                        : order.customer_name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className={`w-4 h-4 ${
                        color === 'red' ? 'text-red-500' :
                        color === 'yellow' ? 'text-yellow-500' :
                        'text-green-500'
                      }`} />
                      {minutes}m
                    </span>
                    <span>{order.items.length} items</span>
                    <span className="font-semibold text-emerald-600">
                      {formatPrice(order.total, order.currency as 'ARS' | 'USD')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-sm">
                      <span className="font-semibold text-emerald-600 shrink-0">{item.quantity}x</span>
                      <div className="flex-1">
                        <div>{item.menu_item_name}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded mt-1">
                            📝 {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {showActions && order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {order.status === 'pending' && (
                      <Button size="sm" onClick={() => updateStatus(order.id, 'cooking')}>
                        Aceptar
                      </Button>
                    )}
                    {order.status === 'cooking' && (
                      <Button size="sm" onClick={() => updateStatus(order.id, 'ready')}>
                        Marcar Listo
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button size="sm" onClick={() => updateStatus(order.id, 'delivered')}>
                        Entregar
                      </Button>
                    )}
                    {restaurantId && (
                      <Button
                        size="sm"
                        onClick={() => setCheckoutOrder({
                          id: order.id,
                          tableNumber: order.order_type === 'dine_in'
                            ? (order.table_number ?? 'S/N')
                            : (order.customer_name ?? 'Mostrador'),
                        })}
                        style={{ background: '#22c55e', color: '#fff', borderColor: '#22c55e' }}
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        Cobrar
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => cancelOrder(order.id)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}

      {checkoutOrder && restaurantId && (
        <CheckoutModal
          isOpen={true}
          onClose={() => setCheckoutOrder(null)}
          onSuccess={() => setCheckoutOrder(null)}
          orderId={checkoutOrder.id}
          tableNumber={checkoutOrder.tableNumber}
          restaurantId={restaurantId}
          cashRegisterId={null}
        />
      )}
    </div>
  )
}
