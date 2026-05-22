import { useState, useEffect, useRef } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useKitchenOrders } from '@/modules/kitchen/hooks/useKitchenOrders'
import { useOrderStats } from '@/modules/dashboard/hooks/useOrderStats'
import { OrdersList } from '../components/OrdersList'
import { requestNotificationPermission, notifyNewOrder, notifyDelayedOrder } from '@/lib/notifications'
import { formatPrice } from '@/lib/utils'

export function OrdersManagement() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { orders, loading: ordersLoading } = useKitchenOrders(restaurant?.id ?? '')
  const { stats, loading: statsLoading } = useOrderStats(restaurant?.id)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const lastPendingCountRef = useRef(0)
  // Track which order IDs we've already sent delayed notifications for
  const notifiedDelayedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    requestNotificationPermission().then(granted => setNotificationsEnabled(granted))
  }, [])

  // New order notification
  useEffect(() => {
    if (!notificationsEnabled) return

    const pendingOrders = orders.filter(o => o.status === 'pending')

    if (pendingOrders.length > lastPendingCountRef.current && lastPendingCountRef.current > 0) {
      const newest = pendingOrders[pendingOrders.length - 1]
      notifyNewOrder(
        newest.order_type,
        newest.order_type === 'dine_in'
          ? newest.table_number ?? ''
          : newest.customer_name ?? ''
      )
    }

    lastPendingCountRef.current = pendingOrders.length
  }, [orders, notificationsEnabled])

  // Delayed order notification (fire once per order)
  useEffect(() => {
    if (!notificationsEnabled) return

    const now = new Date()
    orders.forEach(order => {
      if (order.status !== 'pending' && order.status !== 'cooking') return
      if (notifiedDelayedRef.current.has(order.id)) return

      const minutes = Math.floor((now.getTime() - new Date(order.created_at).getTime()) / 60000)
      if (minutes > 15) {
        const label = order.order_type === 'dine_in'
          ? `Mesa ${order.table_number}`
          : order.customer_name ?? 'Para llevar'
        notifyDelayedOrder(label, minutes)
        notifiedDelayedRef.current.add(order.id)
      }
    })
  }, [orders, notificationsEnabled])

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission()
      setNotificationsEnabled(granted)
    } else {
      setNotificationsEnabled(false)
    }
  }

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
  const filteredOrders = filterStatus ? orders.filter(o => o.status === filterStatus) : activeOrders

  if (restaurantLoading || ordersLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Pedidos</h1>
          <p className="text-gray-600 text-sm">Gestiona los pedidos de tu restaurante</p>
        </div>

        <Button
          variant={notificationsEnabled ? 'primary' : 'secondary'}
          onClick={toggleNotifications}
        >
          {notificationsEnabled ? (
            <><Bell className="w-4 h-4 mr-2" />Notificaciones ON</>
          ) : (
            <><BellOff className="w-4 h-4 mr-2" />Notificaciones OFF</>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Ventas Hoy</div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatPrice(stats.today.total, 'ARS')}
          </div>
          <div className="text-xs text-gray-500 mt-1">{stats.today.count} pedidos</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Ventas Semana</div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatPrice(stats.week.total, 'ARS')}
          </div>
          <div className="text-xs text-gray-500 mt-1">{stats.week.count} pedidos</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Pedidos Activos</div>
          <div className="text-2xl font-bold">
            {stats.today.pending + stats.today.cooking + stats.today.ready}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.today.pending} nuevos · {stats.today.cooking} cocinando
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Plato Más Pedido</div>
          <div className="text-lg font-bold truncate">
            {stats.topItems[0]?.name ?? '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.topItems[0]?.count ?? 0} veces esta semana
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-wrap">
        <Button
          size="sm"
          variant={filterStatus === null ? 'primary' : 'secondary'}
          onClick={() => setFilterStatus(null)}
        >
          Activos ({activeOrders.length})
        </Button>
        <Button
          size="sm"
          variant={filterStatus === 'pending' ? 'primary' : 'secondary'}
          onClick={() => setFilterStatus('pending')}
        >
          Nuevos ({stats.today.pending})
        </Button>
        <Button
          size="sm"
          variant={filterStatus === 'cooking' ? 'primary' : 'secondary'}
          onClick={() => setFilterStatus('cooking')}
        >
          Preparando ({stats.today.cooking})
        </Button>
        <Button
          size="sm"
          variant={filterStatus === 'ready' ? 'primary' : 'secondary'}
          onClick={() => setFilterStatus('ready')}
        >
          Listos ({stats.today.ready})
        </Button>
        <Button
          size="sm"
          variant={filterStatus === 'delivered' ? 'primary' : 'secondary'}
          onClick={() => setFilterStatus('delivered')}
        >
          Entregados
        </Button>
      </div>

      <OrdersList orders={filteredOrders} />
    </div>
  )
}
