import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Table } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const OCCASIONS = ['Ninguna', 'Cumpleaños', 'Aniversario', 'Cena de negocios', 'Otro']
const SOURCES = [
  { value: 'phone',  label: 'Teléfono' },
  { value: 'manual', label: 'Manual' },
  { value: 'web',    label: 'Web' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  tables: Table[]
  onCreated: () => void
}

export function NewReservationModal({ isOpen, onClose, restaurantId, tables, onCreated }: Props) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    reservation_date: '', reservation_time: '',
    party_size: 2, occasion: 'Ninguna', notes: '',
    table_id: '', source: 'phone',
  })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.phone || !form.reservation_date || !form.reservation_time) {
      toast.error('Completá los campos obligatorios')
      return
    }
    setSaving(true)
    try {
      const { error } = await db.from('reservations').insert({
        restaurant_id: restaurantId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        party_size: form.party_size,
        reservation_date: form.reservation_date,
        reservation_time: form.reservation_time,
        occasion: form.occasion === 'Ninguna' ? null : form.occasion,
        notes: form.notes.trim() || null,
        guests_data: [],
        collect_guests: false,
        source: form.source,
        status: 'confirmed',
        table_id: form.table_id || null,
      })
      if (error) throw error
      toast.success('Reserva creada')
      onCreated()
      onClose()
      setForm({ first_name: '', last_name: '', phone: '', email: '', reservation_date: '', reservation_time: '', party_size: 2, occasion: 'Ninguna', notes: '', table_id: '', source: 'phone' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="+ Nueva reserva manual">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre *" value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
          <Input label="Apellido" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Teléfono *" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha *" type="date" value={form.reservation_date} onChange={e => set('reservation_date', e.target.value)} required />
          <Input label="Hora *" type="time" value={form.reservation_time} onChange={e => set('reservation_time', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Personas *"
            type="number"
            min={1} max={100}
            value={form.party_size}
            onChange={e => set('party_size', Number(e.target.value))}
            required
          />
          <Select
            label="Mesa"
            value={form.table_id}
            onChange={e => set('table_id', e.target.value)}
            options={[
              { value: '', label: 'Sin asignar' },
              ...tables.filter(t => t.is_active).map(t => ({ value: t.id, label: `Mesa ${t.table_number}` })),
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Ocasión"
            value={form.occasion}
            onChange={e => set('occasion', e.target.value)}
            options={OCCASIONS.map(o => ({ value: o, label: o }))}
          />
          <Select
            label="Fuente"
            value={form.source}
            onChange={e => set('source', e.target.value)}
            options={SOURCES}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B7A] resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: saving ? 'rgba(255,107,122,0.5)' : '#FF6B7A' }}
          >
            {saving ? 'Creando...' : 'Crear reserva'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
