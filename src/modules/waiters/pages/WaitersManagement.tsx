import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useWaiters } from '../hooks/useWaiters'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Waiter } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function WaitersManagement() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { waiters, loading: waitersLoading } = useWaiters(restaurant?.id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este mozo?')) return
    try {
      const { error } = await db.from('waiters').delete().eq('id', id)
      if (error) throw error
      toast.success('Mozo eliminado')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const toggleShift = async (waiter: Waiter) => {
    try {
      const { error } = await db
        .from('waiters')
        .update({ is_on_shift: !waiter.is_on_shift })
        .eq('id', waiter.id)
      if (error) throw error
      toast.success(waiter.is_on_shift ? 'Mozo fuera de turno' : 'Mozo en turno')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error')
    }
  }

  if (restaurantLoading || waitersLoading) {
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
          <h1 className="text-3xl font-bold mb-1">Mozos</h1>
          <p className="text-gray-400 text-sm">Gestiona tu equipo de mozos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Mozo
        </Button>
      </div>

      {waiters.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Aún no tienes mozos registrados</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar primer mozo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {waiters.map((waiter) => (
            <Card key={waiter.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {waiter.first_name} {waiter.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">PIN: {waiter.pin}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingWaiter(waiter)
                      setIsModalOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(waiter.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {waiter.is_on_shift
                  ? <UserCheck className="w-4 h-4 text-green-600" />
                  : <UserX className="w-4 h-4 text-gray-400" />
                }
                <Toggle
                  checked={waiter.is_on_shift}
                  onChange={() => toggleShift(waiter)}
                  label={waiter.is_on_shift ? 'En turno' : 'Fuera de turno'}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <WaiterModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingWaiter(null)
        }}
        restaurantId={restaurant?.id ?? ''}
        waiter={editingWaiter}
      />
    </div>
  )
}

interface WaiterModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  waiter: Waiter | null
}

function WaiterModal({ isOpen, onClose, restaurantId, waiter }: WaiterModalProps) {
  const [formData, setFormData] = useState({ first_name: '', last_name: '', pin: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (waiter) {
      setFormData({ first_name: waiter.first_name, last_name: waiter.last_name, pin: waiter.pin })
    } else {
      setFormData({ first_name: '', last_name: '', pin: '' })
    }
  }, [waiter])

  const generatePIN = () => {
    setFormData(prev => ({ ...prev, pin: Math.floor(100000 + Math.random() * 900000).toString() }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.pin.length !== 6) {
      toast.error('El PIN debe tener 6 dígitos')
      return
    }
    setLoading(true)
    try {
      if (waiter) {
        const { error } = await db.from('waiters').update(formData).eq('id', waiter.id)
        if (error) throw error
        toast.success('Mozo actualizado')
      } else {
        const { error } = await db.from('waiters').insert({ ...formData, restaurant_id: restaurantId })
        if (error) throw error
        toast.success('Mozo creado')
      }
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={waiter ? 'Editar Mozo' : 'Nuevo Mozo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          placeholder="Juan"
          value={formData.first_name}
          onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
          required
        />
        <Input
          label="Apellido"
          placeholder="Pérez"
          value={formData.last_name}
          onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PIN (6 dígitos)</label>
          <div className="flex gap-2">
            <Input
              placeholder="123456"
              value={formData.pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                setFormData(prev => ({ ...prev, pin: v }))
              }}
              maxLength={6}
              required
            />
            <Button type="button" variant="secondary" onClick={generatePIN}>
              Generar
            </Button>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>{waiter ? 'Actualizar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
