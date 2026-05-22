import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { MenuSection } from '@/types'

interface SectionModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  section?: MenuSection | null
}

const empty = { name: '', name_en: '', description: '', description_en: '', is_active: true }

export function SectionModal({ isOpen, onClose, restaurantId, section }: SectionModalProps) {
  const isEditing = !!section
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (section) {
      setForm({
        name: section.name,
        name_en: section.name_en ?? '',
        description: section.description ?? '',
        description_en: section.description_en ?? '',
        is_active: section.is_active,
      })
    } else {
      setForm(empty)
    }
  }, [section, isOpen])

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        description: form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        is_active: form.is_active,
      }

      if (isEditing) {
        const { error } = await supabase
          .from('menu_sections')
          .update(payload)
          .eq('id', section!.id)
        if (error) throw error
        toast.success('Sección actualizada')
      } else {
        const { data: maxData } = await supabase
          .from('menu_sections')
          .select('sort_order')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()

        const { error } = await supabase
          .from('menu_sections')
          .insert({ ...payload, restaurant_id: restaurantId, sort_order: ((maxData?.sort_order ?? -1) + 1) })
        if (error) throw error
        toast.success('Sección creada')
      }

      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar sección')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar sección' : 'Nueva sección'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre (ES)" value={form.name} onChange={set('name')} required placeholder="Entradas" />
          <Input label="Nombre (EN)" value={form.name_en} onChange={set('name_en')} placeholder="Starters" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Textarea label="Descripción (ES)" value={form.description} onChange={set('description')} rows={2} />
          <Textarea label="Descripción (EN)" value={form.description_en} onChange={set('description_en')} rows={2} />
        </div>
        <Toggle
          label="Sección activa"
          checked={form.is_active}
          onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>{isEditing ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
