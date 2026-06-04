import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, UserCheck, UserX, Copy, MessageCircle, Smartphone, BarChart2, Users } from 'lucide-react'
import bcrypt from 'bcryptjs'
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

function WaiterLinkBanner({ slug }: { slug: string }) {
  const url = `${window.location.origin}/mozo/${slug}`

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado')
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Ingresá a MenuLife: ${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <Card className="mb-6 border-2" style={{ borderColor: '#6366f1', backgroundColor: '#eef2ff' }}>
      <div className="flex items-start gap-3 p-1">
        <Smartphone className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#4f46e5' }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1" style={{ color: '#3730a3' }}>
            Link para tus mozos
          </p>
          <p className="text-xs mb-3" style={{ color: '#4338ca' }}>
            Pasales este link para que ingresen. Cada uno selecciona su nombre e ingresa su PIN.
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-indigo-200">
            <span className="text-xs text-gray-700 truncate flex-1 font-mono">{url}</span>
            <button
              onClick={copy}
              className="shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
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

/* ── Historial tab ────────────────────────────────────────────────────── */
interface DailySummary {
  fecha: string
  waiter_id: string
  waiter_name?: string
  first_name?: string
  last_name?: string
  total_orders?: number
  total_sales?: number
  total_tips?: number
  tables_served?: number
  calls_attended?: number
  avg_service_minutes?: number
  shift_start?: string
  shift_end?: string
  [key: string]: unknown
}

function WaiterHistorial({ restaurantId }: { restaurantId: string }) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const [from, setFrom] = useState(weekAgo)
  const [to, setTo]   = useState(today)
  const [rows, setRows] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    let isMounted = true
    setLoading(true)
    db.from('view_waiter_daily_summary')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('fecha', from)
      .lte('fecha', to)
      .order('fecha', { ascending: false })
      .then(({ data }: { data: DailySummary[] | null }) => {
        if (isMounted) { setRows(data ?? []); setLoading(false) }
      })
      .catch(() => { if (isMounted) setLoading(false) })
    return () => { isMounted = false }
  }, [restaurantId, from, to])

  const grouped: Record<string, DailySummary[]> = {}
  for (const r of rows) {
    grouped[r.fecha] = [...(grouped[r.fecha] ?? []), r]
  }

  const fmt = (n: number | undefined) => n ? '$' + Number(n).toLocaleString('es-AR') : '—'
  const name = (r: DailySummary) => r.waiter_name ?? (`${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.waiter_id?.slice(0, 8))
  const time = (s: string | undefined) => s ? new Date(s).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div>
      {/* Date range picker */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : rows.length === 0 ? (
        <Card><p className="text-center py-12 text-gray-500">Sin datos para el período seleccionado</p></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([fecha, items]) => (
            <div key={fecha}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <div className="space-y-3">
                {items.map((r, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                          {String(name(r)).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{name(r)}</p>
                          <p className="text-xs text-gray-400">Entrada: {time(r.shift_start)} · Salida: {time(r.shift_end)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Pedidos',    value: r.total_orders ?? 0 },
                        { label: 'Ventas',     value: fmt(r.total_sales) },
                        { label: 'Propinas',   value: fmt(r.total_tips) },
                        { label: 'Mesas',      value: r.tables_served ?? 0 },
                        { label: 'Llamadas',   value: r.calls_attended ?? 0 },
                        { label: 'T. promedio', value: r.avg_service_minutes ? `${Math.round(Number(r.avg_service_minutes))} min` : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                          <p className="font-semibold text-gray-800 text-sm">{value}</p>
                        </div>
                      ))}
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

/* ── Main ─────────────────────────────────────────────────────────────── */
export function WaitersManagement() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const { waiters, loading: waitersLoading } = useWaiters(restaurant?.id)
  const [activeTab, setActiveTab] = useState<'list' | 'historial'>('list')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este mozo?')) return
    try {
      const { error } = await db.from('waiters').delete().eq('id', id)
      if (error) {
        console.error('ERROR waiter delete:', JSON.stringify(error, null, 2))
        throw error
      }
      toast.success('Mozo eliminado')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'Error al eliminar'
      toast.error(msg)
    }
  }

  const toggleShift = async (waiter: Waiter) => {
    try {
      const { error } = await db
        .from('waiters')
        .update({ is_on_shift: !waiter.is_on_shift })
        .eq('id', waiter.id)
      if (error) {
        console.error('ERROR waiter toggleShift:', JSON.stringify(error, null, 2))
        throw error
      }
      toast.success(waiter.is_on_shift ? 'Mozo fuera de turno' : 'Mozo en turno')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'Error'
      toast.error(msg)
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
        {activeTab === 'list' && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Mozo
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        {([
          { id: 'list' as const,      icon: Users,      label: 'Lista de mozos' },
          { id: 'historial' as const, icon: BarChart2,  label: 'Historial' },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Historial tab */}
      {activeTab === 'historial' && restaurant?.id && (
        <WaiterHistorial restaurantId={restaurant.id} />
      )}

      {/* Lista tab */}
      {activeTab === 'list' && (
        <>
          {/* Banner con link para mozos */}
          {restaurant?.slug && <WaiterLinkBanner slug={restaurant.slug} />}

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
                      <p className="text-sm text-gray-500">PIN: ••••••</p>
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
        </>
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
      setFormData({ first_name: waiter.first_name, last_name: waiter.last_name, pin: '' })
    } else {
      setFormData({ first_name: '', last_name: '', pin: '' })
    }
  }, [waiter])

  const generatePIN = () => {
    setFormData(prev => ({ ...prev, pin: Math.floor(100000 + Math.random() * 900000).toString() }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isEditing = !!waiter
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
        }
        if (pinChanged) {
          updates.pin = await bcrypt.hash(formData.pin, 10)
        }
        const { error } = await db.from('waiters').update(updates).eq('id', waiter.id)
        if (error) {
          console.error('ERROR COMPLETO waiter update:', JSON.stringify(error, null, 2))
          throw error
        }
        toast.success('Mozo actualizado')
      } else {
        const hashedPin = await bcrypt.hash(formData.pin, 10)
        const { error } = await db.from('waiters').insert({
          first_name:    formData.first_name,
          last_name:     formData.last_name,
          pin:           hashedPin,
          restaurant_id: restaurantId,
          is_active:     true,
          is_on_shift:   false,
        })
        if (error) {
          console.error('ERROR COMPLETO waiter insert:', JSON.stringify(error, null, 2))
          throw error
        }
        toast.success(`Mozo creado. PIN: ${formData.pin} — guardalo en un lugar seguro.`, { duration: 8000 })
      }
      onClose()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'Error al guardar mozo'
      toast.error(msg)
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PIN (4–10 dígitos){waiter ? <span className="text-gray-400 font-normal ml-1">— dejar vacío para no cambiar</span> : null}
          </label>
          <div className="flex gap-2">
            <Input
              placeholder={waiter ? '••••••' : '123456'}
              value={formData.pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                setFormData(prev => ({ ...prev, pin: v }))
              }}
              maxLength={10}
              required={!waiter}
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
