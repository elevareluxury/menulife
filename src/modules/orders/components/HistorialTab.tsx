import { useState } from 'react'
import { ChevronDown, ChevronUp, Package, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DateRangePicker } from './DateRangePicker'
import { useOrderHistory, type HistoryOrder } from '../hooks/useOrderHistory'
import { formatPrice } from '@/lib/utils'

interface HistorialTabProps {
  restaurantId: string
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  delivered: { label: 'Completado', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado',  cls: 'bg-red-100 text-red-800' },
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function OrderCard({ order }: { order: HistoryOrder }) {
  const [expanded, setExpanded] = useState(false)
  const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.delivered
  const num = order.id.slice(-4).toUpperCase()
  const time = new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const label = order.order_type === 'dine_in'
    ? `Mesa ${order.table_number}`
    : order.customer_name ?? 'Para llevar'
  const itemSummary = order.items
    .map(i => `${i.menu_item_name} x${i.quantity}`)
    .join(', ')
    .slice(0, 80)

  return (
    <div
      className="border-b border-gray-100 last:border-0"
      style={{ cursor: 'pointer' }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center gap-3 py-3 px-1">
        {/* Order num */}
        <span className="font-mono text-xs font-bold text-gray-500 w-12 shrink-0">#{num}</span>

        {/* Label + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{itemSummary}</p>
          )}
        </div>

        {/* Time + total */}
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-400">{time}</div>
          <div className="text-sm font-bold text-emerald-600">
            {formatPrice(order.total, order.currency as 'ARS' | 'USD')}
          </div>
        </div>

        <span className="text-gray-300 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {expanded && (
        <div className="pb-4 px-1 space-y-3" onClick={e => e.stopPropagation()}>
          <div className="space-y-1.5">
            {order.items.map(item => (
              <div key={item.id} className="flex items-start justify-between text-sm">
                <span className="text-gray-700">
                  <span className="font-semibold text-emerald-600 mr-2">{item.quantity}x</span>
                  {item.menu_item_name}
                  {item.notes && <span className="text-xs text-gray-400 ml-2">({item.notes})</span>}
                </span>
                <span className="text-gray-600 ml-4 shrink-0">
                  {formatPrice(item.price_snapshot * item.quantity, item.currency as 'ARS' | 'USD')}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-900">
            <span>Total</span>
            <span className="text-emerald-600">{formatPrice(order.total, order.currency as 'ARS' | 'USD')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function groupByDay(orders: HistoryOrder[]): { dateKey: string; label: string; orders: HistoryOrder[] }[] {
  const map: Record<string, HistoryOrder[]> = {}
  orders.forEach(o => {
    const key = o.created_at.slice(0, 10)
    if (!map[key]) map[key] = []
    map[key].push(o)
  })
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, orders]) => ({
      dateKey,
      label: new Date(dateKey + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
      }),
      orders,
    }))
}

export function HistorialTab({ restaurantId }: HistorialTabProps) {
  const today = startOfDay(new Date())
  const [desde, setDesde] = useState(today)
  const [hasta, setHasta] = useState(today)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { orders, summary, loading, hasMore, loadMore } = useOrderHistory(
    restaurantId, desde, hasta, search, statusFilter
  )

  const groups = groupByDay(orders)

  return (
    <div className="space-y-5">
      {/* Date range picker */}
      <DateRangePicker
        desde={desde}
        hasta={hasta}
        onChange={(d, h) => { setDesde(d); setHasta(h) }}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total ventas', value: formatPrice(summary.total, 'ARS'), sub: null },
          { label: 'Pedidos', value: summary.count.toString(), sub: null },
          { label: 'Ticket prom.', value: summary.count > 0 ? formatPrice(summary.avgTicket, 'ARS') : '—', sub: null },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por mesa, número..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm bg-white/8 border border-white/10 text-gray-200 placeholder-gray-500 outline-none focus:border-[#FF6B7A]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-white/8 border border-white/10 text-gray-200 outline-none focus:border-[#FF6B7A]"
        >
          <option value="">Todos los estados</option>
          <option value="delivered">Completados</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-medium text-gray-500">Sin pedidos en este período</p>
            <p className="text-sm text-gray-400 mt-1">Probá con otro rango de fechas</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const dayTotal = group.orders
              .filter(o => o.status === 'delivered')
              .reduce((s, o) => s + o.total, 0)
            return (
              <Card key={group.dateKey} className="p-0 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 capitalize">{group.label}</span>
                  <span className="text-xs text-gray-400">
                    Total: {formatPrice(dayTotal, 'ARS')} · {group.orders.length} pedidos
                  </span>
                </div>
                <div className="px-4 divide-y divide-gray-50">
                  {group.orders.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              </Card>
            )
          })}

          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Mostrando {orders.length} pedidos</span>
            {hasMore && (
              <Button size="sm" variant="secondary" onClick={loadMore}>
                Cargar más
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
