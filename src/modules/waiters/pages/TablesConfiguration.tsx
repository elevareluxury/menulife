import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useTables } from '../hooks/useTables'
import { useWaiters } from '../hooks/useWaiters'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Table, Waiter } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const STATUS_COLORS: Record<string, string> = {
  free: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
}

const STATUS_BORDERS: Record<string, string> = {
  free: 'border-green-400',
  occupied: 'border-red-400',
  reserved: 'border-yellow-400',
}

export function TablesConfiguration() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { tables, loading: tablesLoading } = useTables(restaurant?.id)
  const { waiters } = useWaiters(restaurant?.id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)

  // Local positions for drag (avoids flicker while dragging)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const dragging = useRef<{ id: string; dx: number; dy: number } | null>(null)

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

  const updateTablePosition = useCallback(async (tableId: string, x: number, y: number) => {
    await db.from('tables').update({ position_x: x, position_y: y }).eq('id', tableId)
  }, [])

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const { id, dx, dy } = dragging.current
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left - dx, rect.width - 110))
    const y = Math.max(0, Math.min(e.clientY - rect.top - dy, rect.height - 110))
    setPositions(prev => ({ ...prev, [id]: { x, y } }))
  }

  const onCanvasMouseUp = () => {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Configuración de Mesas</h1>
          <p className="text-gray-400 text-sm">Arrastra las mesas para organizarlas</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Mesa
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        {Object.entries({ free: 'Libre', occupied: 'Ocupada', reserved: 'Reservada' }).map(([k, label]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[k]}`} />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {tables.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Aún no tienes mesas configuradas</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar primera mesa
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div
            className="table-canvas relative bg-gray-50 select-none"
            style={{ height: '600px' }}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          >
            {tables.map((table) => {
              const pos = positions[table.id] ?? { x: table.position_x, y: table.position_y }
              const waiter = waiters.find(w => w.id === table.waiter_id)
              return (
                <div
                  key={table.id}
                  className={`absolute cursor-grab active:cursor-grabbing bg-white rounded-xl shadow-md border-2 ${STATUS_BORDERS[table.status] ?? 'border-gray-300'} hover:shadow-lg transition-shadow`}
                  style={{ left: pos.x, top: pos.y, width: 110, userSelect: 'none' }}
                  onMouseDown={(e) => onTableMouseDown(e, table.id)}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-gray-900">Mesa {table.table_number}</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[table.status]}`} />
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{table.capacity} pers.</div>
                    {waiter && (
                      <div className="text-xs text-emerald-600 font-medium truncate mb-1">
                        {waiter.first_name}
                      </div>
                    )}
                    <div className="flex gap-1 mt-2">
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onMouseDown={(e) => e.stopPropagation()}
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
