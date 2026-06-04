import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getTimeSince, formatOrderTime } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import type { KitchenOrder } from '../hooks/useKitchenOrders'

interface OrderCardProps {
  order: KitchenOrder
  onStatusChange: (orderId: string, newStatus: string) => void
  isFirst: boolean
  isLast: boolean
}

const timerColorClasses = {
  green: 'border-green-500 bg-green-500/10',
  yellow: 'border-yellow-500 bg-yellow-500/10',
  red: 'border-red-500 bg-red-500/10',
}

const timerTextClasses = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
}

export function OrderCard({ order, onStatusChange, isFirst, isLast }: OrderCardProps) {
  const { minutes, color } = getTimeSince(order.created_at)

  const getNextStatus = () => {
    if (order.status === ORDER_STATUS.PENDING) return ORDER_STATUS.COOKING
    if (order.status === ORDER_STATUS.COOKING) return ORDER_STATUS.READY
    if (order.status === ORDER_STATUS.READY) return ORDER_STATUS.DELIVERED
    return null
  }

  const getPrevStatus = () => {
    if (order.status === ORDER_STATUS.DELIVERED) return ORDER_STATUS.READY
    if (order.status === ORDER_STATUS.READY) return ORDER_STATUS.COOKING
    if (order.status === ORDER_STATUS.COOKING) return ORDER_STATUS.PENDING
    return null
  }

  const borderClass = timerColorClasses[color as keyof typeof timerColorClasses] ?? 'border-gray-600'
  const textClass = timerTextClasses[color as keyof typeof timerTextClasses] ?? 'text-gray-400'

  // Delivery/Takeaway visual differentiation
  const orderDetail = (order as unknown as { order_type_detail?: string }).order_type_detail
  const isDelivery = orderDetail === 'delivery' || order.order_type === 'delivery'
  const isTakeaway = orderDetail === 'takeaway' || (order.order_type === 'takeaway' && !isDelivery)
  const accentBorder = isDelivery ? '4px solid #F4705A' : isTakeaway ? '4px solid #EF9F27' : undefined

  return (
    <div
      className={`rounded-lg border-2 bg-gray-800 ${borderClass} transition-all hover:shadow-lg`}
      style={accentBorder ? { borderLeft: accentBorder } : undefined}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isDelivery ? (
              <>
                <span className="text-2xl">🛵</span>
                <div className="min-w-0">
                  <span className="text-white font-bold text-lg truncate max-w-[120px] block">
                    {order.customer_name}
                  </span>
                  {order.customer_address && (
                    <span className="block text-xs truncate max-w-[130px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {order.customer_address}
                    </span>
                  )}
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#F4705A', letterSpacing: '0.04em' }}>DELIVERY</span>
                </div>
              </>
            ) : isTakeaway ? (
              <>
                <span className="text-2xl">🥡</span>
                <div>
                  <span className="text-white font-bold text-lg truncate max-w-[120px] block">
                    {order.customer_name}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#EF9F27', letterSpacing: '0.04em' }}>PARA LLEVAR</span>
                </div>
              </>
            ) : order.order_type === 'dine_in' ? (
              <>
                <span className="text-2xl">🍽️</span>
                <span className="text-white font-bold text-lg">
                  Mesa {order.table_number}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl">📦</span>
                <span className="text-white font-bold text-lg truncate max-w-[120px]">
                  {order.customer_name}
                </span>
              </>
            )}
          </div>

          <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-bold ${textClass}`}>
            <Clock className="w-4 h-4" />
            <span>{minutes}m</span>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          {formatOrderTime(order.created_at)}
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
        {order.items.map((item) => (
          <div key={item.id} className="text-white">
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-400 flex-shrink-0">
                {item.quantity}x
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{item.menu_item_name}</div>
                {item.notes && (
                  <div className="text-sm text-yellow-400 mt-1 bg-yellow-400/10 px-2 py-1 rounded">
                    ⚠️ {item.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-gray-700 flex gap-2">
        {!isFirst && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const prev = getPrevStatus()
              if (prev) onStatusChange(order.id, prev)
            }}
            className="flex-1 text-white border border-gray-600 hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
        )}

        {!isLast && (
          <Button
            size="sm"
            onClick={() => {
              const next = getNextStatus()
              if (next) onStatusChange(order.id, next)
            }}
            className="flex-1"
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
