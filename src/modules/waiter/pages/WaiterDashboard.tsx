import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LogOut, Bell, Clock, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { InstallBanner } from '@/components/ui/InstallBanner'
import { supabase } from '@/lib/supabase'
import { useWaiterAuthStore } from '@/store/waiterAuthStore'
import { getTimeSince } from '@/lib/utils'
import { useWaiterNotifications } from '../hooks/useWaiterNotifications'
import { NotificationBanner } from '../components/NotificationBanner'
import type { Table } from '@/types'

interface OrderWithItems {
  id: string
  table_number: string | null
  status: string
  created_at: string
  items: { id: string; menu_item_name: string; quantity: number }[]
}

interface CallWithTable {
  id: string
  created_at: string
  table: { table_number: string }
  type: 'call' | 'bill_request'
}

const TABLE_STATUS_STYLES: Record<string, string> = {
  free: 'bg-green-50 border-green-400',
  occupied: 'bg-red-50 border-red-400',
  reserved: 'bg-yellow-50 border-yellow-400',
}

export function WaiterDashboard() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { waiter, logout, isAuthenticated } = useWaiterAuthStore()
  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [calls, setCalls] = useState<CallWithTable[]>([])
  const [loading, setLoading] = useState(true)

  const { banners, dismissBanner } = useWaiterNotifications(orders, calls)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate(`/waiter/${slug}/login`, { replace: true })
    }
  }, [isAuthenticated, navigate, slug])

  useEffect(() => {
    if (!waiter) return

    async function fetchData() {
      try {
        const { data: tablesData } = await supabase
          .from('tables')
          .select('*')
          .eq('waiter_id', waiter!.id)
          .eq('is_active', true)

        const fetchedTables: Table[] = tablesData ?? []
        setTables(fetchedTables)

        const tableNumbers = fetchedTables.map(t => t.table_number)
        if (tableNumbers.length > 0) {
          const { data: ordersData } = await supabase
            .from('orders')
            .select('id, table_number, status, created_at')
            .eq('restaurant_id', waiter!.restaurant_id)
            .in('table_number', tableNumbers)
            .in('status', ['pending', 'cooking', 'ready', 'bill_requested'])

          const orders: OrderWithItems[] = await Promise.all(
            (ordersData ?? []).map(async (order) => {
              const { data: items } = await supabase
                .from('order_items')
                .select('id, menu_item_name, quantity')
                .eq('order_id', order.id)
              return { ...order, items: items ?? [] }
            })
          )
          setOrders(orders)
        } else {
          setOrders([])
        }

        const { data: callsData } = await supabase
          .from('waiter_calls')
          .select('id, created_at, table_id, type')
          .eq('waiter_id', waiter!.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        const resolvedCalls: CallWithTable[] = (callsData ?? []).map(c => ({
          id: c.id,
          created_at: c.created_at,
          type: (c.type ?? 'call') as 'call' | 'bill_request',
          table: { table_number: fetchedTables.find(t => t.id === c.table_id)?.table_number ?? '' },
        }))
        setCalls(resolvedCalls)
      } catch (error) {
        console.error('Error fetching waiter data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    const ordersChannel = supabase
      .channel(`waiter_orders_${waiter.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${waiter.restaurant_id}` }, fetchData)
      .subscribe()

    const callsChannel = supabase
      .channel(`waiter_calls_${waiter.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls' }, fetchData)
      .subscribe()

    const tablesChannel = supabase
      .channel(`waiter_tables_${waiter.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `waiter_id=eq.${waiter.id}` }, fetchData)
      .subscribe()

    return () => {
      ordersChannel.unsubscribe()
      callsChannel.unsubscribe()
      tablesChannel.unsubscribe()
    }
  }, [waiter])

  const attendCall = async (callId: string) => {
    await supabase
      .from('waiter_calls')
      .update({ status: 'attended', attended_at: new Date().toISOString() })
      .eq('id', callId)
  }

  const getTableOrder = (tableNumber: string) =>
    orders.find(o => o.table_number === tableNumber)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  }

  const regularCalls  = calls.filter(c => c.type !== 'bill_request')
  const billRequests  = calls.filter(c => c.type === 'bill_request')
  const readyOrders   = orders.filter(o => o.status === 'ready')
  const billOrders    = orders.filter(o => o.status === 'bill_requested')

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationBanner banners={banners} onDismiss={dismissBanner} />
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Hola, {waiter?.first_name}</h1>
            <p className="text-sm text-gray-500">{tables.length} mesas asignadas</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate(`/waiter/${slug}/login`) }}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-lg">

        {/* ── Install PWA prompt ─────────────────────────────────────────────── */}
        <InstallBanner />

        {/* ── Solicitudes de cuenta (dorado) ─────────────────────────────────── */}
        {(billRequests.length > 0 || billOrders.length > 0) && (
          <Card className="p-4 border-2" style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }}>
            <div className="flex items-start gap-3">
              <Receipt className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
              <div className="flex-1">
                <h3 className="font-semibold mb-3" style={{ color: '#92400E' }}>
                  {billRequests.length + billOrders.length}{' '}
                  {billRequests.length + billOrders.length === 1 ? 'solicitud de cuenta' : 'solicitudes de cuenta'}
                </h3>
                <div className="space-y-2">
                  {/* bill_request calls */}
                  {billRequests.map(call => (
                    <div key={call.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                      <div>
                        <p className="font-semibold text-gray-900">Mesa {call.table?.table_number}</p>
                        <p className="text-xs text-gray-500">{getTimeSince(call.created_at).minutes}m atrás</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          attendCall(call.id)
                          navigate(`/waiter/${slug}/table/${call.table.table_number}`)
                        }}
                        style={{ backgroundColor: '#F59E0B', color: '#fff', border: 'none' }}
                      >
                        Cobrar
                      </Button>
                    </div>
                  ))}
                  {/* bill_requested orders (customer requested via status change) */}
                  {billOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                      <div>
                        <p className="font-semibold text-gray-900">Mesa {order.table_number}</p>
                        <p className="text-xs text-gray-500">{order.items.length} items · {getTimeSince(order.created_at).minutes}m</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/waiter/${slug}/table/${order.table_number}`)}
                        style={{ backgroundColor: '#F59E0B', color: '#fff', border: 'none' }}
                      >
                        Cobrar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Llamadas regulares (rojo) ───────────────────────────────────────── */}
        {regularCalls.length > 0 && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <Bell className="w-6 h-6 text-red-600 animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-3">
                  {regularCalls.length} {regularCalls.length === 1 ? 'llamada pendiente' : 'llamadas pendientes'}
                </h3>
                <div className="space-y-2">
                  {regularCalls.map(call => (
                    <div key={call.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                      <div>
                        <p className="font-semibold">Mesa {call.table?.table_number}</p>
                        <p className="text-xs text-gray-500">{getTimeSince(call.created_at).minutes}m atrás</p>
                      </div>
                      <Button size="sm" onClick={() => attendCall(call.id)}>Atender</Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Pedidos listos ─────────────────────────────────────────────────── */}
        {readyOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-green-700">🟢 Pedidos Listos para entregar</h2>
            <div className="space-y-2">
              {readyOrders.map(order => (
                <Card key={order.id} className="p-4 bg-green-50 border-green-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Mesa {order.table_number}</p>
                      <p className="text-sm text-gray-600">{order.items?.length ?? 0} items</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-700">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold text-sm">{getTimeSince(order.created_at).minutes}m</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Mis mesas ──────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Mis Mesas</h2>
          {tables.length === 0 ? (
            <Card><p className="text-center py-8 text-gray-500">No tienes mesas asignadas</p></Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {tables.map(table => {
                const order = getTableOrder(table.table_number)
                const styleClass = TABLE_STATUS_STYLES[table.status] ?? 'bg-gray-50 border-gray-300'
                const isBillReq = order?.status === 'bill_requested'
                return (
                  <Card
                    key={table.id}
                    className={`p-4 border-2 cursor-pointer transition-all hover:shadow-md ${isBillReq ? 'border-amber-400 bg-amber-50' : styleClass}`}
                    onClick={() => order && navigate(`/waiter/${slug}/table/${table.table_number}`)}
                  >
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-1">Mesa {table.table_number}</h3>
                      <p className="text-xs text-gray-500">{table.capacity} personas</p>
                      {order ? (
                        <div className="mt-3">
                          <span
                            className="inline-block px-2 py-1 rounded-lg text-xs font-medium shadow-sm"
                            style={isBillReq ? { backgroundColor: '#FEF3C7', color: '#92400E' } : { backgroundColor: '#fff', color: '#065F46' }}
                          >
                            {isBillReq
                              ? '💰 Pide cuenta'
                              : order.status === 'ready'
                              ? '✓ Listo'
                              : order.status === 'cooking'
                              ? '🔥 Cocina'
                              : `⏳ ${order.items?.length ?? 0} items`}
                          </span>
                          <Button size="sm" className="w-full mt-2">Ver Cuenta</Button>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-400">Libre</p>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
