import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { supabase } from '@/lib/supabase'
import { useImageUpload } from '../hooks/useImageUpload'
import { ALLERGENS, TAGS } from '@/lib/constants'
import toast from 'react-hot-toast'
import type { MenuItem } from '@/types'

interface MenuItemModalProps {
  isOpen: boolean
  onClose: () => void
  restaurantId: string
  sectionId: string
  item?: MenuItem | null
}

const empty = {
  name: '', name_en: '', description: '', description_en: '',
  price_ars: '', price_usd: '', video_url: '', is_available: true,
  allergens: [] as string[], tags: [] as string[],
}

export function MenuItemModal({ isOpen, onClose, restaurantId, sectionId, item }: MenuItemModalProps) {
  const isEditing = !!item
  const [form, setForm] = useState(empty)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const { uploadImage, uploading } = useImageUpload()

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        name_en: item.name_en ?? '',
        description: item.description ?? '',
        description_en: item.description_en ?? '',
        price_ars: String(item.price_ars),
        price_usd: String(item.price_usd),
        video_url: item.video_url ?? '',
        is_available: item.is_available,
        allergens: item.allergens,
        tags: item.tags,
      })
      setImagePreview(item.image_url)
    } else {
      setForm(empty)
      setImagePreview('')
    }
    setImageFile(null)
  }, [item, isOpen])

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  function toggleArray(field: 'allergens' | 'tags', value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }))
  }

  function handleImageChange(file: File) {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleImageRemove() {
    setImageFile(null)
    setImagePreview('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!imagePreview && !imageFile) {
      toast.error('La imagen es obligatoria')
      return
    }

    setLoading(true)
    try {
      let finalImageUrl = imagePreview

      if (imageFile) {
        const result = await uploadImage(imageFile, 'menu-items')
        if (!result.success) throw new Error('Error al subir imagen')
        finalImageUrl = result.url
      }

      const payload = {
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        description: form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        price_ars: parseFloat(form.price_ars) || 0,
        price_usd: parseFloat(form.price_usd) || 0,
        image_url: finalImageUrl,
        video_url: form.video_url.trim() || null,
        is_available: form.is_available,
        allergens: form.allergens,
        tags: form.tags,
      }

      if (isEditing) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', item!.id)
        if (error) throw error
        toast.success('Plato actualizado')
      } else {
        const { data: maxData } = await supabase
          .from('menu_items')
          .select('sort_order')
          .eq('section_id', sectionId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle()

        const { error } = await supabase.from('menu_items').insert({
          ...payload,
          restaurant_id: restaurantId,
          section_id: sectionId,
          sort_order: (maxData?.sort_order ?? -1) + 1,
        })
        if (error) throw error
        toast.success('Plato creado')
      }

      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar plato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar plato' : 'Nuevo plato'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Imagen <span className="text-red-500">*</span>
          </label>
          <ImageUpload
            value={imagePreview}
            onChange={handleImageChange}
            onRemove={handleImageRemove}
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Video (opcional)</label>
          <Input
            type="url"
            placeholder="https://youtube.com/... o URL de video MP4"
            value={form.video_url}
            onChange={set('video_url')}
          />
          <p className="text-xs text-gray-500 mt-1">YouTube, Vimeo o video MP4 directo</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre (ES)" value={form.name} onChange={set('name')} required placeholder="Milanesa napolitana" />
          <Input label="Nombre (EN)" value={form.name_en} onChange={set('name_en')} placeholder="Chicken milanese" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Textarea label="Descripción (ES)" value={form.description} onChange={set('description')} rows={2} />
          <Textarea label="Descripción (EN)" value={form.description_en} onChange={set('description_en')} rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Precio ARS" type="number" min="0" step="0.01" value={form.price_ars} onChange={set('price_ars')} required placeholder="1500" />
          <Input label="Precio USD" type="number" min="0" step="0.01" value={form.price_usd} onChange={set('price_usd')} required placeholder="2.50" />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Alérgenos</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleArray('allergens', a)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.allergens.includes(a)
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Etiquetas</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleArray('tags', t)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.tags.includes(t)
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          label="Plato disponible"
          checked={form.is_available}
          onChange={(e) => setForm((prev) => ({ ...prev, is_available: e.target.checked }))}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading || uploading}>{isEditing ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
