import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Copy, MessageCircle, Smartphone, CheckCircle, XCircle } from 'lucide-react'
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

export function DriversManagement() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { drivers, loading: driversLoading, refetch } = useDrivers(restaurant?.id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null)

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
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Repartidor
        </Button>
      </div>

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
