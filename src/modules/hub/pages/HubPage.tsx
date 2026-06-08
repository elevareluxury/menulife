import { useState, useEffect, useRef } from 'react'
import { Globe, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, ExternalLink, ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useImageUpload } from '@/modules/menu/hooks/useImageUpload'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubFeatured {
  id: string
  restaurant_id: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  image_url: string | null
  cta_text: string | null
  cta_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface HubStory {
  id: string
  restaurant_id: string
  image_url: string | null
  title: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type Tab = 'preview' | 'featured' | 'story' | 'config'

// ─── Featured Modal ────────────────────────────────────────────────────────────

interface FeaturedModalProps {
  restaurantId: string
  item: HubFeatured | null
  onClose: () => void
  onSaved: () => void
}

function FeaturedModal({ restaurantId, item, onClose, onSaved }: FeaturedModalProps) {
  const { uploadImage, uploading } = useImageUpload()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: item?.title ?? '',
    title_en: item?.title_en ?? '',
    description: item?.description ?? '',
    description_en: item?.description_en ?? '',
    image_url: item?.image_url ?? '',
    cta_text: item?.cta_text ?? '',
    cta_url: item?.cta_url ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: keyof typeof form, val: string) {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadImage(file, 'hub-assets')
    if (result.success) setForm((prev) => ({ ...prev, image_url: result.url }))
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('El título es requerido'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        restaurant_id: restaurantId,
        title: form.title.trim(),
        title_en: form.title_en.trim() || null,
        description: form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        image_url: form.image_url.trim() || null,
        cta_text: form.cta_text.trim() || null,
        cta_url: form.cta_url.trim() || null,
        updated_at: new Date().toISOString(),
      }
      let error: unknown
      if (item) {
        ;({ error } = await (supabase as any).from('hub_featured').update(payload).eq('id', item.id))
      } else {
        payload.sort_order = 0
        payload.is_active = true
        ;({ error } = await (supabase as any).from('hub_featured').insert(payload))
      }
      if (error) throw error
      toast.success(item ? 'Destacado actualizado' : 'Destacado creado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Error al guardar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-y-auto max-h-[90vh]"
        style={{ background: '#1a1a1a', border: '1px solid #374151' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold text-lg">
            {item ? 'Editar destacado' : 'Nuevo destacado'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Image */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Imagen</label>
            {form.image_url ? (
              <div className="relative rounded-xl overflow-hidden h-32 mb-2">
                <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setForm((p) => ({ ...p, image_url: '' }))}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 rounded-xl border-dashed border-2 border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-[#F4705A] hover:text-[#F4705A] transition-all"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs">{uploading ? 'Subiendo…' : 'Subir imagen'}</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Title */}
          <Field label="Título *" value={form.title} onChange={(v) => set('title', v)} placeholder="Ej. Promo del mes" />
          <Field label="Título (EN)" value={form.title_en} onChange={(v) => set('title_en', v)} placeholder="Month special" />
          <Field label="Descripción" value={form.description} onChange={(v) => set('description', v)} placeholder="Descripción breve…" textarea />
          <Field label="Descripción (EN)" value={form.description_en} onChange={(v) => set('description_en', v)} placeholder="Short description…" textarea />
          <Field label="Texto del botón (CTA)" value={form.cta_text} onChange={(v) => set('cta_text', v)} placeholder="Ver más" />
          <Field label="URL del botón" value={form.cta_url} onChange={(v) => set('cta_url', v)} placeholder="https://…" />
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
            style={{ background: '#F4705A' }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  textarea?: boolean
}) {
  const cls =
    'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 bg-[#0F1115] border border-gray-800 focus:outline-none focus:border-[#F4705A] transition-all resize-none'
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea className={cls} rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}

// ─── Tab: Preview ──────────────────────────────────────────────────────────────

function TabPreview({ slug }: { slug: string | undefined }) {
  if (!slug) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        No se encontró el restaurante.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <button
        onClick={() => window.open(`/${slug}`)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
        style={{ background: '#F4705A' }}
      >
        <ExternalLink className="w-4 h-4" />
        Abrir en nueva pestaña
      </button>
      <div
        className="border-4 border-gray-700 rounded-[2.5rem] overflow-hidden"
        style={{ width: 280, height: 560 }}
      >
        <iframe
          src={`/${slug}`}
          className="w-full h-full"
          title="Hub preview"
        />
      </div>
    </div>
  )
}

// ─── Tab: Featured ─────────────────────────────────────────────────────────────

function TabFeatured({ restaurantId }: { restaurantId: string }) {
  const [items, setItems] = useState<HubFeatured[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HubFeatured | null>(null)

  async function fetchItems() {
    setLoadingItems(true)
    try {
      const { data } = await (supabase as any)
        .from('hub_featured')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order')
      setItems(data ?? [])
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => { fetchItems() }, [restaurantId])

  async function toggleActive(item: HubFeatured) {
    await (supabase as any)
      .from('hub_featured')
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
  }

  async function moveItem(index: number, dir: -1 | 1) {
    const newItems = [...items]
    const swapIndex = index + dir
    if (swapIndex < 0 || swapIndex >= newItems.length) return
    const a = { ...newItems[index], sort_order: newItems[swapIndex].sort_order }
    const b = { ...newItems[swapIndex], sort_order: newItems[index].sort_order }
    newItems[index] = a
    newItems[swapIndex] = b
    newItems.sort((x, y) => x.sort_order - y.sort_order)
    setItems(newItems)
    await Promise.all([
      (supabase as any).from('hub_featured').update({ sort_order: a.sort_order, updated_at: new Date().toISOString() }).eq('id', a.id),
      (supabase as any).from('hub_featured').update({ sort_order: b.sort_order, updated_at: new Date().toISOString() }).eq('id', b.id),
    ])
  }

  async function deleteItem(id: string) {
    if (!window.confirm('¿Eliminar este destacado?')) return
    await (supabase as any).from('hub_featured').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    toast.success('Destacado eliminado')
  }

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(item: HubFeatured) { setEditing(item); setModalOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Destacados ({items.length})</h3>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#F4705A' }}
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {loadingItems ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#F4705A', borderTopColor: 'transparent' }} />
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center text-gray-500"
          style={{ background: '#1a1a1a', border: '1px solid #374151' }}
        >
          No hay destacados. Agregá el primero.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: '#1a1a1a', border: '1px solid #374151' }}
            >
              {/* Image thumb */}
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: '#0F1115' }}>
                  <ImageIcon className="w-5 h-5 text-gray-600" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(item)}>
                <p className="text-white text-sm font-medium truncate">{item.title}</p>
                {item.description && <p className="text-gray-500 text-xs truncate">{item.description}</p>}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-white disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-white disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleActive(item)}
                  className="w-7 h-7 flex items-center justify-center rounded transition-all"
                  style={{ color: item.is_active ? '#F4705A' : '#6B7280' }}
                  title={item.is_active ? 'Desactivar' : 'Activar'}
                >
                  {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="w-7 h-7 flex items-center justify-center rounded text-gray-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <FeaturedModal
          restaurantId={restaurantId}
          item={editing}
          onClose={() => setModalOpen(false)}
          onSaved={fetchItems}
        />
      )}
    </div>
  )
}

// ─── Tab: Historia ─────────────────────────────────────────────────────────────

function TabStory({ restaurantId }: { restaurantId: string }) {
  const { uploadImage, uploading } = useImageUpload()
  const fileRef = useRef<HTMLInputElement>(null)

  const [story, setStory] = useState<HubStory | null>(null)
  const [loadingStory, setLoadingStory] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    image_url: '',
    title: '',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    async function load() {
      setLoadingStory(true)
      try {
        const { data } = await (supabase as any)
          .from('hub_stories')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .limit(1)
          .single()
        if (data) {
          setStory(data)
          setForm({
            image_url: data.image_url ?? '',
            title: data.title ?? '',
            description: data.description ?? '',
            is_active: data.is_active,
          })
        }
      } finally {
        setLoadingStory(false)
      }
    }
    load()
  }, [restaurantId])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadImage(file, 'hub-assets')
    if (result.success) setForm((prev) => ({ ...prev, image_url: result.url }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        restaurant_id: restaurantId,
        image_url: form.image_url.trim() || null,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }
      let error: unknown
      if (story) {
        ;({ error } = await (supabase as any).from('hub_stories').update(payload).eq('id', story.id))
      } else {
        const { data: inserted, error: insertErr } = await (supabase as any)
          .from('hub_stories')
          .insert(payload)
          .select()
          .single()
        error = insertErr
        if (!insertErr && inserted) setStory(inserted)
      }
      if (error) throw error
      toast.success('Historia guardada')
    } catch (err) {
      toast.error('Error al guardar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loadingStory) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#F4705A', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Historia del local</h3>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            background: story ? 'rgba(244,112,90,0.15)' : 'rgba(107,114,128,0.15)',
            color: story ? '#F4705A' : '#9CA3AF',
          }}
        >
          {story ? 'Activa' : 'Sin historia'}
        </span>
      </div>

      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: '#1a1a1a', border: '1px solid #374151' }}
      >
        {/* Image */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Imagen</label>
          {form.image_url ? (
            <div className="relative rounded-xl overflow-hidden h-36">
              <img src={form.image_url} alt="historia" className="w-full h-full object-cover" />
              <button
                onClick={() => setForm((p) => ({ ...p, image_url: '' }))}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.7)' }}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full h-24 rounded-xl border-dashed border-2 border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-[#F4705A] hover:text-[#F4705A] transition-all"
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-xs">{uploading ? 'Subiendo…' : 'Subir imagen de historia'}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Título</label>
          <input
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 bg-[#0F1115] border border-gray-800 focus:outline-none focus:border-[#F4705A] transition-all"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Ej. Nuestra historia"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Descripción</label>
          <textarea
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 bg-[#0F1115] border border-gray-800 focus:outline-none focus:border-[#F4705A] transition-all resize-none"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Contá la historia de tu local…"
          />
        </div>

        {/* Is Active Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Mostrar en Hub Público</p>
            <p className="text-xs text-gray-500">La historia aparece en la parte superior del Hub</p>
          </div>
          <button
            onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
            className="relative w-11 h-6 rounded-full transition-all duration-200"
            style={{ background: form.is_active ? '#F4705A' : '#374151' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
              style={{ transform: form.is_active ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
          style={{ background: '#F4705A' }}
        >
          {saving ? 'Guardando…' : 'Guardar historia'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Config ───────────────────────────────────────────────────────────────

function TabConfig({ slug }: { slug: string | undefined }) {
  return (
    <div
      className="rounded-2xl p-6 space-y-3"
      style={{ background: '#1a1a1a', border: '1px solid #374151' }}
    >
      <h3 className="text-white font-semibold text-lg">Configuración del Hub Público</h3>
      {slug && (
        <p className="text-sm text-gray-400">
          URL pública: <span className="text-[#F4705A] font-mono">/{slug}</span>
        </p>
      )}
      <p className="text-sm text-gray-500">
        Próximamente: dominio personalizado, SEO, analytics
      </p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HubPage() {
  const { restaurant, loading } = useRestaurant()
  const [activeTab, setActiveTab] = useState<Tab>('preview')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preview', label: 'Vista previa' },
    { id: 'featured', label: 'Destacados' },
    { id: 'story', label: 'Historia' },
    { id: 'config', label: 'Configuración' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#F4705A', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6" style={{ color: '#F4705A' }} />
        <div>
          <h1 className="text-xl font-bold text-white">Hub Público</h1>
          <p className="text-xs text-gray-500">Tu página pública de presentación</p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-xl p-1 mb-6 gap-1"
        style={{ background: '#1a1a1a', border: '1px solid #374151' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? '#F4705A' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#9CA3AF',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'preview' && <TabPreview slug={restaurant?.slug} />}
      {activeTab === 'featured' && restaurant && <TabFeatured restaurantId={restaurant.id} />}
      {activeTab === 'story' && restaurant && <TabStory restaurantId={restaurant.id} />}
      {activeTab === 'config' && <TabConfig slug={restaurant?.slug} />}

      {/* No restaurant fallback for featured/story tabs */}
      {!restaurant && activeTab !== 'preview' && activeTab !== 'config' && (
        <div className="text-center text-gray-500 py-12">No se encontró el restaurante.</div>
      )}
    </div>
  )
}
