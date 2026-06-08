import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Copy, MessageCircle, Smartphone, CheckCircle, XCircle, BarChart2, Users } from 'lucide-react'
import bcrypt from 'bcryptjs'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useDrivers } from '../hooks/useDrivers'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { DeliveryDriver } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface DriverDayStat {
  day: string
  driver_id: string
  first_name: string
  last_name: string
  total_deliveries: number
  total_revenue: number
  avg_time: number | null
}

interface DriverDayStatRaw extends DriverDayStat {
  _durations: number[]
}

function DriverHistorial({ restaurantId }: { restaurantId: string }) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(weekAgo)
  const [dateTo, setDateTo] = useState(today)
  const [stats, setStats] = useState<DriverDayStat[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchStats() }, [dateFrom, dateTo, restaurantId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const [driversRes, ordersRes] = await Promise.all([
        db.from('delivery_drivers').select('id, first_name, last_name').eq('restaurant_id', restaurantId),
        db.from('orders')
          .select('id, delivery_driver_id, total, completed_at, duration_minutes')
          .eq('restaurant_id', restaurantId)
          .eq('status', 'completed')
          .eq('order_type', 'delivery')
          .gte('completed_at', `${dateFrom}T00:00:00`)
          .lte('completed_at', `${dateTo}T23:59:59`),
      ])

      const driversMap: Record<string, { first_name: string; last_name: string }> = {}
      ;(driversRes.data ?? []).forEach((d: { id: string; first_name: string; last_name: string }) => {
        driversMap[d.id] = { first_name: d.first_name, last_name: d.last_name }
      })

      const grouped: Record<string, Record<string, DriverDayStatRaw>> = {}
      ;(ordersRes.data ?? []).forEach((o: { delivery_driver_id?: string; completed_at?: string; total?: number; duration_minutes?: number }) => {
        if (!o.delivery_driver_id || !o.completed_at) return
        const day = o.completed_at.slice(0, 10)
        const did = o.delivery_driver_id
        if (!grouped[day]) grouped[day] = {}
        if (!grouped[day][did]) {
          const d = driversMap[did] ?? { first_name: 'Desconocido', last_name: '' }
          grouped[day][did] = { day, driver_id: did, ...d, total_deliveries: 0, total_revenue: 0, avg_time: null, _durations: [] }
        }
        grouped[day][did].total_deliveries++
        grouped[day][did].total_revenue += o.total ?? 0
        if (o.duration_minutes) grouped[day][did]._durations.push(o.duration_minutes)
      })

      const result: DriverDayStat[] = []
      Object.keys(grouped).sort().reverse().forEach(day => {
        Object.values(grouped[day])
          .sort((a, b) => b.total_deliveries - a.total_deliveries)
          .forEach(({ _durations, ...stat }) => {
            result.push({
              ...stat,
              avg_time: _durations.length > 0
                ? Math.round(_durations.reduce((s, v) => s + v, 0) / _durations.length)
                : null,
            })
          })
      })

      setStats(result)
    } finally {
      setLoading(false)
    }
  }

  const byDay: Record<string, DriverDayStat[]> = {}
  stats.forEach(s => { if (!byDay[s.day]) byDay[s.day] = []; byDay[s.day].push(s) })
  const days = Object.keys(byDay).sort().reverse()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Desde</label>
        <input
          type="date" value={dateFrom} max={dateTo}
          onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <label className="text-sm font-medium text-gray-700">Hasta</label>
        <input
          type="date" value={dateTo} min={dateFrom} max={today}
          onChange={e => setDateTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : days.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-500">No hay entregas registradas en el rango seleccionado</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {days.map(day => (
            <div key={day}>
              <p className="text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">
                {new Date(day + 'T12:00:00').toLocaleDateString('es-AR', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {byDay[day].map(stat => (
                  <Card key={`${stat.day}-${stat.driver_id}`} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-700">
                        {stat.first_name[0]}{stat.last_name[0]}
                      </div>
                      <p className="font-semibold text-sm">{stat.first_name} {stat.last_name}</p>
                    </div>
                    <div className={`grid gap-2 text-xs ${stat.avg_time !== null ? 'grid-cols-2' : 'grid-cols-2'}`}>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-gray-500">Entregas</p>
                        <p className="font-bold text-lg text-gray-800">{stat.total_deliveries}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-gray-500">Facturado</p>
                        <p className="font-bold text-base text-gray-800">
                          ${stat.total_revenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      {stat.avg_time !== null && (
                        <div className="bg-gray-50 rounded-lg p-2 text-center col-span-2">
                          <p className="text-gray-500">Tiempo promedio</p>
                          <p className="font-bold text-base text-gray-800">{stat.avg_time} min</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DriverLinkBanner({ slug }: { slug: string }) {
  const url = `${window.location.origin}/delivery/${slug}/login`

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado')
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Link para repartidores - MenuLife: ${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <Card className="mb-6 border-2" style={{ borderColor: '#F77F00', backgroundColor: '#fff7ed' }}>
      <div className="flex items-start gap-3 p-1">
        <Smartphone className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ea580c' }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1" style={{ color: '#9a3412' }}>
            Link para tus repartidores
          </p>
          <p className="text-xs mb-3" style={{ color: '#c2410c' }}>
            Pasales este link para que ingresen. Cada uno selecciona su nombre e ingresa su PIN.
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-orange-200">
            <span className="text-xs text-gray-700 truncate flex-1 font-mono">{url}</span>
            <button
              onClick={copy}
              className="shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copiar
            </button>
          </div>
          <button
            onClick={shareWhatsApp}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Compartir por WhatsApp
          </button>
        </div>
      </div>
    </Card>
  )
}

// ─── Delivery Orders Section ────────────────────────────────────────────────

interface DeliveryOrder {
  id: string
  customer_name: string | null
  customer_address: string | null
  status: string
  delivery_driver_id: string | null
  created_at: string
  total: number
  currency: string
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  return `Hace ${Math.floor(mins / 60)} h`
}

const DELIVERY_STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',         color: '#F59E0B' },
  preparing:  { label: 'Preparando',        color: '#3B82F6' },
  ready:      { label: 'Listo para enviar', color: '#22C55E' },
  in_transit: { label: 'En camino',         color: '#F4705A' },
}

function DeliveryOrdersSection({ restaurantId, drivers }: { restaurantId: string; drivers: DeliveryDriver[] }) {
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    const { data } = await db.from('orders')
      .select('id, customer_name, customer_address, status, delivery_driver_id, created_at, total, currency')
      .eq('restaurant_id', restaurantId)
      .eq('order_type', 'delivery')
      .in('status', ['pending', 'preparing', 'ready', 'in_transit'])
      .order('created_at', { ascending: true })
    setOrders(data ?? [])
    setLoadingOrders(false)
  }, [restaurantId])

  useEffect(() => {
    fetchOrders()
    const ch = supabase
      .channel(`delivery_mgmt_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, fetchOrders)
      .subscribe()
    return () => { ch.unsubscribe() }
  }, [restaurantId, fetchOrders])

  const assignDriver = async (orderId: string, driverId: string) => {
    setAssigningId(orderId)
    try {
      await Promise.all([
        db.from('orders').update({ delivery_driver_id: driverId, delivery_status: 'assigned' }).eq('id', orderId),
        db.from('delivery_drivers').update({ is_available: false }).eq('id', driverId),
      ])
      toast.success('Repartidor asignado')
      fetchOrders()
    } catch { toast.error('Error al asignar') }
    finally { setAssigningId(null) }
  }

  const changeStatus = async (order: DeliveryOrder, newStatus: string) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'in_transit') updates.delivery_status = 'picked_up'
      if (newStatus === 'completed') {
        updates.delivery_status = 'delivered'
        updates.delivered_at = new Date().toISOString()
        if (order.delivery_driver_id) {
          await db.from('delivery_drivers').update({ is_available: true }).eq('id', order.delivery_driver_id)
        }
      }
      await db.from('orders').update(updates).eq('id', order.id)
      toast.success(newStatus === 'completed' ? 'Pedido entregado ✓' : 'Estado actualizado')
      fetchOrders()
    } catch { toast.error('Error al actualizar') }
  }

  const availableDrivers = drivers.filter(d => d.is_active && d.is_available)

  if (loadingOrders) return null

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Pedidos de delivery</h2>
        <span className="text-sm text-gray-400">{orders.length} activos</span>
      </div>
      {orders.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🛵</p>
            <p className="text-gray-500 text-sm">Sin pedidos de delivery activos</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg = DELIVERY_STATUS_CFG[order.status] ?? { label: order.status, color: '#888' }
            const assignedDriver = drivers.find(d => d.id === order.delivery_driver_id)
            return (
              <Card key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">#{order.id.slice(-4).toUpperCase()}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}18`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{order.customer_name ?? '—'}</p>
                    {order.customer_address && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">📍 {order.customer_address}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">${order.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-400">{relativeTime(order.created_at)}</p>
                  </div>
                </div>

                {!order.delivery_driver_id ? (
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    defaultValue=""
                    onChange={e => { if (e.target.value) assignDriver(order.id, e.target.value) }}
                    disabled={assigningId === order.id}
                  >
                    <option value="">— Asignar repartidor —</option>
                    {availableDrivers.map(d => (
                      <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
                        {assignedDriver?.first_name?.[0]}{assignedDriver?.last_name?.[0]}
                      </span>
                      {assignedDriver ? `${assignedDriver.first_name} ${assignedDriver.last_name}` : 'Repartidor asignado'}
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'ready' && (
                        <button onClick={() => changeStatus(order, 'in_transit')} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: '#F4705A' }}>
                          Enviar
                        </button>
                      )}
                      {order.status === 'in_transit' && (
                        <button onClick={() => changeStatus(order, 'completed')} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-green-600">
                          Entregado
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DriversManagement() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { drivers, loading: driversLoading, refetch } = useDrivers(restaurant?.id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'historial'>('list')

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este repartidor?')) return
    try {
      const { error } = await db.from('delivery_drivers').delete().eq('id', id)
      if (error) throw error
      toast.success('Repartidor eliminado')
      refetch()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const toggleAvailable = async (driver: DeliveryDriver) => {
    try {
      const { error } = await db
        .from('delivery_drivers')
        .update({ is_available: !driver.is_available })
        .eq('id', driver.id)
      if (error) throw error
      toast.success(driver.is_available ? 'Marcado como no disponible' : 'Marcado como disponible')
      refetch()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error')
    }
  }

  if (restaurantLoading || driversLoading) {
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
          <h1 className="text-3xl font-bold mb-1">Repartidores</h1>
          <p className="text-gray-400 text-sm">Gestiona tu equipo de delivery</p>
        </div>
        {activeTab === 'list' && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Repartidor
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'list' ? 'bg-orange-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Users className="w-4 h-4" />
          Repartidores
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'historial' ? 'bg-orange-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <BarChart2 className="w-4 h-4" />
          Historial
        </button>
      </div>

      {activeTab === 'historial' ? (
        <DriverHistorial restaurantId={restaurant?.id ?? ''} />
      ) : (
        <>
          {restaurant?.slug && <DriverLinkBanner slug={restaurant.slug} />}

          {drivers.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🛵</p>
                <p className="text-gray-600 mb-4">Aún no tenés repartidores registrados</p>
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar primer repartidor
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map((driver) => (
                <Card key={driver.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {driver.first_name} {driver.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">PIN: ••••</p>
                      {driver.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          📱 {driver.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingDriver(driver); setIsModalOpen(true) }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(driver.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {driver.is_available
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <XCircle className="w-4 h-4 text-gray-400" />
                    }
                    <Toggle
                      checked={driver.is_available}
                      onChange={() => toggleAvailable(driver)}
                      label={driver.is_available ? 'Disponible' : 'No disponible'}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {restaurant?.id && (
            <DeliveryOrdersSection restaurantId={restaurant.id} drivers={drivers} />
          )}
        </>
      )}

      <DriverModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingDriver(null) }}
        restaurantId={restaurant?.id ?? ''}
        driver={editingDriver}
        onSaved={refetch}
      />
    </div>
  )
}

interface DriverModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  driver: DeliveryDriver | null
  onSaved: () => void
}

function DriverModal({ isOpen, onClose, restaurantId, driver, onSaved }: DriverModalProps) {
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '', pin: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (driver) {
      setFormData({ first_name: driver.first_name, last_name: driver.last_name, phone: driver.phone ?? '', pin: '' })
    } else {
      setFormData({ first_name: '', last_name: '', phone: '', pin: '' })
    }
  }, [driver])

  const generatePIN = () => {
    setFormData(prev => ({ ...prev, pin: Math.floor(1000 + Math.random() * 9000).toString() }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isEditing = !!driver
    const pinChanged = formData.pin.length > 0

    if (!isEditing && (formData.pin.length < 4 || formData.pin.length > 10)) {
      toast.error('El PIN debe tener entre 4 y 10 dígitos')
      return
    }
    if (isEditing && pinChanged && (formData.pin.length < 4 || formData.pin.length > 10)) {
      toast.error('El PIN debe tener entre 4 y 10 dígitos')
      return
    }

    setLoading(true)
    try {
      if (isEditing) {
        const updates: Record<string, string> = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        }
        if (pinChanged) {
          updates.pin = await bcrypt.hash(formData.pin, 10)
        }
        const { error } = await db.from('delivery_drivers').update(updates).eq('id', driver.id)
        if (error) throw error
        toast.success('Repartidor actualizado')
      } else {
        const hashedPin = await bcrypt.hash(formData.pin, 10)
        const { error } = await db.from('delivery_drivers').insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          pin: hashedPin,
          restaurant_id: restaurantId,
          is_active: true,
          is_available: false,
        })
        if (error) throw error
        toast.success(`Repartidor creado. PIN: ${formData.pin} — guardalo en un lugar seguro.`, { duration: 8000 })
      }
      onSaved()
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={driver ? 'Editar Repartidor' : 'Nuevo Repartidor'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          placeholder="Carlos"
          value={formData.first_name}
          onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
          required
        />
        <Input
          label="Apellido"
          placeholder="Rodríguez"
          value={formData.last_name}
          onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
          required
        />
        <Input
          label="Teléfono / WhatsApp"
          type="tel"
          placeholder="+54 9 11 1234-5678"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PIN (4–10 dígitos){driver ? <span className="text-gray-400 font-normal ml-1">— dejar vacío para no cambiar</span> : null}
          </label>
          <div className="flex gap-2">
            <Input
              placeholder={driver ? '••••••' : '123456'}
              value={formData.pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                setFormData(prev => ({ ...prev, pin: v }))
              }}
              maxLength={10}
              required={!driver}
            />
            <Button type="button" variant="secondary" onClick={generatePIN}>
              Generar
            </Button>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>{driver ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
