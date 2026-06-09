import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Edit, LayoutGrid, RotateCcw, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useAuthStore } from '@/store/authStore'
import { useTables } from '../hooks/useTables'
import { useWaiters } from '../hooks/useWaiters'
import { useReservations } from '@/modules/reservations/hooks/useReservations'
import { ReservationsPanel } from '@/modules/reservations/components/ReservationsPanel'
import { supabase } from '@/lib/supabase'
import { CheckoutModal } from '@/modules/pos/components/CheckoutModal'
import toast from 'react-hot-toast'
import type { Table, Waiter } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const STATUS_COLORS: Record<string, string> = {
  free: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-purple-500',
}

const STATUS_BORDERS: Record<string, string> = {
  free: 'border-green-400',
  occupied: 'border-red-400',
  reserved: 'border-purple-500',
}

// Returns true if the table was freed within the last 30 minutes
function isRecentlyFreed(table: Table): boolean {
  if (table.status !== 'free') return false
  const diffMs = Date.now() - new Date(table.updated_at).getTime()
  return diffMs < 30 * 60 * 1000
}

export function TablesConfiguration() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { user }                                   = useAuthStore()
  const { tables, loading: tablesLoading }         = useTables(restaurant?.id)
  const { waiters }                                = useWaiters(restaurant?.id)
  const [isModalOpen, setIsModalOpen]              = useState(false)
  const [editingTable, setEditingTable]            = useState<Table | null>(null)
  const [showReservations, setShowReservations]    = useState(false)
  const [isMobile, setIsMobile]                    = useState(() => window.innerWidth < 768)
  const [reopeningId, setReopeningId]              = useState<string | null>(null)
  const [checkoutTableInfo, setCheckoutTableInfo]  = useState<{ orderId: string; tableNumber: string } | null>(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Today's reservations for table indicators
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const { reservations: todayReservations } = useReservations(restaurant?.id, todayStr)

  // Local positions for drag (avoids flicker while dragging)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const dragging = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync positions from DB (only for tables not currently being dragged)
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev }
      tables.forEach(t => {
        if (!(t.id in next)) {
          next[t.id] = { x: t.position_x, y: t.position_y }
        }
      })
      // Remove positions for deleted tables
      Object.keys(next).forEach(id => {
        if (!tables.find(t => t.id === id)) delete next[id]
      })
      return next
    })
  }, [tables])

  const updateTablePosition = useCallback((tableId: string, x: number, y: number) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      db.from('tables').update({ position_x: x, position_y: y }).eq('id', tableId)
    }, 500)
  }, [])

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const { id, dx, dy } = dragging.current
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left - dx, rect.width - 140))
    const y = Math.max(0, Math.min(e.clientY - rect.top - dy, rect.height - 140))
    setPositions(prev => ({ ...prev, [id]: { x, y } }))
  }

  const onCanvasMouseUp = () => {
    if (!dragging.current) return
    const { id } = dragging.current
    const pos = positions[id]
    if (pos) updateTablePosition(id, Math.round(pos.x), Math.round(pos.y))
    dragging.current = null
  }

  const onCanvasTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    e.preventDefault()
    const { id, dx, dy } = dragging.current
    const touch = e.touches[0]
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const x = Math.max(0, Math.min(touch.clientX - rect.left - dx, rect.width - 140))
    const y = Math.max(0, Math.min(touch.clientY - rect.top - dy, rect.height - 140))
    setPositions(prev => ({ ...prev, [id]: { x, y } }))
  }

  const onCanvasTouchEnd = () => {
    if (!dragging.current) return
    const { id } = dragging.current
    const pos = positions[id]
    if (pos) updateTablePosition(id, Math.round(pos.x), Math.round(pos.y))
    dragging.current = null
  }

  const onTableMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault()
    const canvasRect = (e.currentTarget.closest('.table-canvas') as HTMLDivElement).getBoundingClientRect()
    dragging.current = {
      id: tableId,
      dx: e.clientX - canvasRect.left - (positions[tableId]?.x ?? 0),
      dy: e.clientY - canvasRect.top - (positions[tableId]?.y ?? 0),
    }
  }

  const onTableTouchStart = (e: React.TouchEvent, tableId: string) => {
    e.stopPropagation()
    const touch = e.touches[0]
    const canvasRect = (e.currentTarget.closest('.table-canvas') as HTMLDivElement).getBoundingClientRect()
    dragging.current = {
      id: tableId,
      dx: touch.clientX - canvasRect.left - (positions[tableId]?.x ?? 0),
      dy: touch.clientY - canvasRect.top - (positions[tableId]?.y ?? 0),
    }
  }

  const reopenTable = async (table: Table) => {
    if (!restaurant?.id) return
    setReopeningId(table.id)
    try {
      // Restore table to occupied
      const { error: te } = await db.from('tables').update({ status: 'occupied' }).eq('id', table.id)
      if (te) throw te

      // Find the last completed order for this table today
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data: lastOrder } = await db
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', table.table_number)
        .in('status', ['completed', 'paid'])
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastOrder) {
        await db.from('orders').update({ status: 'pending' }).eq('id', lastOrder.id)
      }

      const userName = (user?.user_metadata?.full_name as string | undefined)
        || user?.email?.split('@')[0] || 'Dueño'

      await db.from('audit_logs').insert({
        restaurant_id: restaurant.id,
        user_name:     userName,
        action:        'table_reopen',
        entity_type:   'table',
        entity_id:     table.id,
        details:       { table_number: table.table_number, order_id: lastOrder?.id ?? null },
      })

      toast.success(`Mesa ${table.table_number} reabierta — pedido restaurado`)
    } catch (err) {
      console.error(err)
      toast.error('Error al reabrir la mesa')
    } finally {
      setReopeningId(null)
    }
  }

  const handleCobrarTable = async (table: Table) => {
    if (!restaurant?.id) return
    const { data: activeOrder } = await db
      .from('orders')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .eq('table_number', table.table_number)
      .in('status', ['pending', 'cooking', 'ready'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!activeOrder) { toast.error('No hay pedido activo para esta mesa'); return }
    setCheckoutTableInfo({ orderId: activeOrder.id, tableNumber: table.table_number })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta mesa?')) return
    try {
      const { error } = await db.from('tables').delete().eq('id', id)
      if (error) throw error
      toast.success('Mesa eliminada')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  if (restaurantLoading || tablesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Mesas</h1>
          <p className="text-gray-400 text-sm">Arrastrá las mesas para organizarlas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReservations(false)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${!showReservations ? 'bg-surface-4 text-ink-1' : 'text-ink-3 hover:bg-surface-3'}`}
          >
            <LayoutGrid size={15} /> Plano
          </button>
          <Button onClick={() => setIsModalOpen(true)} className="ml-2">
            <Plus className="w-4 h-4 mr-1.5" />
            Mesa
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        {Object.entries({ free: 'Libre', occupied: 'Ocupada', reserved: 'Reservada' }).map(([k, label]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[k]}`} />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {showReservations ? (
        <Card className="p-0 overflow-hidden" style={{ height: '600px' }}>
          <ReservationsPanel
            restaurantId={restaurant?.id ?? ''}
            restaurantName={restaurant?.name ?? ''}
            tables={tables}
          />
        </Card>
      ) : tables.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Aún no tienes mesas configuradas</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar primera mesa
            </Button>
          </div>
        </Card>
      ) : isMobile ? (
        /* ── Mobile: static 2-column grid ── */
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '4px' }}>
            {tables.map((table) => {
              const waiter = waiters.find(w => w.id === table.waiter_id)
              const nextRes = todayReservations
                .filter(r => r.table_id === table.id && ['confirmed', 'pending', 'seated'].includes(r.status))
                .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))[0]
              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-xl shadow-sm border-2 ${STATUS_BORDERS[table.status] ?? 'border-gray-300'}`}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-base text-gray-900">Mesa {table.table_number}</span>
                      <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[table.status]}`} />
                    </div>
                    <div className="text-sm text-gray-500 mb-2">{table.capacity} pers.</div>
                    {waiter && (
                      <div className="text-sm text-emerald-600 font-semibold truncate mb-1">
                        {waiter.first_name}
                      </div>
                    )}
                    {nextRes && (
                      <div className="text-xs text-blue-500 font-medium truncate mb-1">
                        📅 {nextRes.reservation_time} {nextRes.first_name}
                      </div>
                    )}
                    {table.status === 'occupied' && (
                      <button
                        onClick={() => handleCobrarTable(table)}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                      >
                        <CreditCard className="w-3 h-3" />
                        Cobrar
                      </button>
                    )}
                    {isRecentlyFreed(table) && (
                      <button
                        onClick={() => reopenTable(table)}
                        disabled={reopeningId === table.id}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A', border: '1px solid rgba(244,112,90,0.3)' }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        {reopeningId === table.id ? 'Reabriendo...' : 'Reabrir'}
                      </button>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        className="flex-1 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                        style={{ minHeight: '40px' }}
                        onClick={() => { setEditingTable(table); setIsModalOpen(true) }}
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center hover:bg-red-50 rounded-lg"
                        style={{ minHeight: '40px' }}
                        onClick={() => handleDelete(table.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        /* ── Desktop: drag canvas ── */
        <Card className="p-0 overflow-hidden">
          <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
          <div
            className="table-canvas relative bg-gray-50 select-none"
            style={{ height: '600px', minWidth: '600px', touchAction: 'none' }}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            onTouchMove={onCanvasTouchMove}
            onTouchEnd={onCanvasTouchEnd}
          >
            {tables.map((table) => {
              const pos = positions[table.id] ?? { x: table.position_x, y: table.position_y }
              const waiter = waiters.find(w => w.id === table.waiter_id)
              const nextRes = todayReservations
                .filter(r => r.table_id === table.id && ['confirmed', 'pending', 'seated'].includes(r.status))
                .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))[0]
              return (
                <div
                  key={table.id}
                  className={`absolute cursor-grab active:cursor-grabbing bg-white rounded-xl shadow-md border-2 ${STATUS_BORDERS[table.status] ?? 'border-gray-300'} hover:shadow-lg transition-shadow`}
                  style={{ left: pos.x, top: pos.y, width: 140, minHeight: 120, userSelect: 'none', touchAction: 'none' }}
                  onMouseDown={(e) => onTableMouseDown(e, table.id)}
                  onTouchStart={(e) => onTableTouchStart(e, table.id)}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-base text-gray-900">Mesa {table.table_number}</span>
                      <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[table.status]}`} />
                    </div>
                    <div className="text-sm text-gray-500 mb-2">{table.capacity} pers.</div>
                    {waiter && (
                      <div className="text-sm text-emerald-600 font-semibold truncate mb-1">
                        {waiter.first_name}
                      </div>
                    )}
                    {nextRes && (
                      <div className="text-xs text-blue-500 font-medium truncate mb-1">
                        📅 {nextRes.reservation_time} {nextRes.first_name}
                      </div>
                    )}
                    {table.status === 'occupied' && (
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); handleCobrarTable(table) }}
                        className="w-full mt-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-bold"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                      >
                        <CreditCard className="w-2.5 h-2.5" />
                        Cobrar
                      </button>
                    )}
                    {isRecentlyFreed(table) && (
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); reopenTable(table) }}
                        disabled={reopeningId === table.id}
                        className="w-full mt-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-bold"
                        style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A', border: '1px solid rgba(244,112,90,0.3)' }}
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        {reopeningId === table.id ? '...' : 'Reabrir'}
                      </button>
                    )}
                    <div className="flex gap-1 mt-2">
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTable(table)
                          setIsModalOpen(true)
                        }}
                      >
                        <Edit className="w-3 h-3 text-gray-500" />
                      </button>
                      <button
                        className="p-1 hover:bg-red-50 rounded"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(table.id)
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </Card>
      )}

      <TableModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTable(null)
        }}
        restaurantId={restaurant?.id ?? ''}
        table={editingTable}
        waiters={waiters}
      />

      {checkoutTableInfo && restaurant && (
        <CheckoutModal
          isOpen={true}
          onClose={() => setCheckoutTableInfo(null)}
          onSuccess={() => setCheckoutTableInfo(null)}
          orderId={checkoutTableInfo.orderId}
          tableNumber={checkoutTableInfo.tableNumber}
          restaurantId={restaurant.id}
          cashRegisterId={null}
        />
      )}
    </div>
  )
}

interface TableModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  table: Table | null
  waiters: Waiter[]
}

function TableModal({ isOpen, onClose, restaurantId, table, waiters }: TableModalProps) {
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: 4,
    status: 'free' as 'free' | 'occupied' | 'reserved',
    waiter_id: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (table) {
      setFormData({
        table_number: table.table_number,
        capacity: table.capacity,
        status: table.status,
        waiter_id: table.waiter_id ?? '',
      })
    } else {
      setFormData({ table_number: '', capacity: 4, status: 'free', waiter_id: '' })
    }
  }, [table])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { ...formData, waiter_id: formData.waiter_id || null }

      if (table) {
        const { error } = await db.from('tables').update(data).eq('id', table.id)
        if (error) throw error
        toast.success('Mesa actualizada')
      } else {
        const { error } = await db
          .from('tables')
          .insert({ ...data, restaurant_id: restaurantId, position_x: 50, position_y: 50, is_active: true })
        if (error) throw error
        toast.success('Mesa creada')
      }
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={table ? 'Editar Mesa' : 'Nueva Mesa'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Número de Mesa"
          placeholder="1"
          value={formData.table_number}
          onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
          required
        />
        <Input
          label="Capacidad"
          type="number"
          min={1}
          max={20}
          value={formData.capacity}
          onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
          required
        />
        <Select
          label="Estado"
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'free' | 'occupied' | 'reserved' }))}
          options={[
            { value: 'free', label: 'Libre' },
            { value: 'occupied', label: 'Ocupada' },
            { value: 'reserved', label: 'Reservada' },
          ]}
        />
        <Select
          label="Mozo Asignado"
          value={formData.waiter_id}
          onChange={(e) => setFormData(prev => ({ ...prev, waiter_id: e.target.value }))}
          options={[
            { value: '', label: 'Sin asignar' },
            ...waiters
              .filter(w => w.is_active)
              .map(w => ({ value: w.id, label: `${w.first_name} ${w.last_name}` })),
          ]}
        />
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>{table ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
