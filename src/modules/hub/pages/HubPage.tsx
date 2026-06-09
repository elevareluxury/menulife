import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Globe, Plus, Trash2, Eye, EyeOff, ExternalLink,
  ImageIcon, X, Star, GripVertical, Save,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useImageUpload } from '@/modules/menu/hooks/useImageUpload'
import toast from 'react-hot-toast'

const db = supabase as any
const ACC = '#F59E0B'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface HubStory {
  id: string; restaurant_id: string
  image_url: string | null; title: string | null; title_en: string | null
  description: string | null; description_en: string | null; is_active: boolean
}

interface HubFeaturedProduct {
  id: string; restaurant_id: string
  name: string; description: string | null
  price: number | null; image_url: string | null
  tag: string | null; cta_text: string | null; cta_url: string | null
  is_active: boolean
}

interface HubGalleryItem {
  id: string; restaurant_id: string
  url: string; type: 'image' | 'video'
  caption: string | null; sort_order: number; is_active: boolean
}

interface HubReview {
  id: string; restaurant_id: string
  author_name: string; author_initial: string | null
  profile_color: string; rating: number
  text: string; relative_time: string | null; sort_order: number
}

type Tab = 'general' | 'novedad' | 'destacado' | 'galeria' | 'resenas' | 'preview'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',   label: 'General'      },
  { id: 'novedad',   label: 'Novedad'      },
  { id: 'destacado', label: 'Destacado'    },
  { id: 'galeria',   label: 'Galería'      },
  { id: 'resenas',   label: 'Reseñas'      },
  { id: 'preview',   label: 'Vista previa' },
]

const REVIEW_COLORS = ['#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#EF4444']

// ─── Shared UI ─────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 bg-[#0F1115] border border-gray-800 focus:outline-none transition-all resize-none focus:border-amber-500'

function Field({
  label, value, onChange, placeholder, textarea, type = 'text',
}: {
  label: string; value: string | number
  onChange: (v: string) => void
  placeholder?: string; textarea?: boolean; type?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea className={inputCls} rows={3} value={value as string}
          onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={inputCls} type={type} value={value}
          onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
      style={{ background: value ? ACC : '#374151' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: ACC, borderTopColor: 'transparent' }} />
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: '#161A24', border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  )
}

function ImageUploadArea({
  url, onUpload, onClear, uploading, height = 'h-32',
}: {
  url: string; onUpload: (f: File) => void; onClear: () => void
  uploading: boolean; height?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      {url ? (
        <div className={`relative rounded-xl overflow-hidden ${height}`}>
          <img src={url} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="w-full h-24 rounded-xl border-dashed border-2 border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-amber-400 hover:border-amber-500/50 transition-all"
        >
          <ImageIcon className="w-6 h-6" />
          <span className="text-xs">{uploading ? 'Subiendo…' : 'Subir imagen'}</span>
        </button>
      )}
      <input
        ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onUpload(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Tab: General ──────────────────────────────────────────────────────────────

function TabGeneral({ restaurantId }: { restaurantId: string }) {
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagInputEn, setTagInputEn] = useState('')
  const [form, setForm] = useState({
    hub_about: '',
    hub_about_en: '',
    hub_category_tags: [] as string[],
    hub_category_tags_en: [] as string[],
    hub_enabled: true,
    hub_bottom_nav: true,
    google_rating: '',
    google_review_count: '',
    google_review_url: '',
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    db.from('restaurants').select(
      'hub_about,hub_about_en,hub_category_tags,hub_category_tags_en,hub_enabled,hub_bottom_nav,google_rating,google_review_count,google_review_url'
    ).eq('id', restaurantId).maybeSingle().then(({ data }: { data: Record<string, unknown> | null }) => {
      if (data) {
        setForm({
          hub_about: (data.hub_about as string) ?? '',
          hub_about_en: (data.hub_about_en as string) ?? '',
          hub_category_tags: (data.hub_category_tags as string[]) ?? [],
          hub_category_tags_en: (data.hub_category_tags_en as string[]) ?? [],
          hub_enabled: data.hub_enabled !== false,
          hub_bottom_nav: data.hub_bottom_nav !== false,
          google_rating: data.google_rating != null ? String(data.google_rating) : '',
          google_review_count: data.google_review_count != null ? String(data.google_review_count) : '',
          google_review_url: (data.google_review_url as string) ?? '',
        })
      }
      setLoaded(true)
    })
  }, [restaurantId])

  function addTag(lang: 'es' | 'en') {
    const val = (lang === 'es' ? tagInput : tagInputEn).trim()
    if (!val) return
    if (lang === 'es') {
      setForm(p => ({ ...p, hub_category_tags: [...p.hub_category_tags, val] }))
      setTagInput('')
    } else {
      setForm(p => ({ ...p, hub_category_tags_en: [...p.hub_category_tags_en, val] }))
      setTagInputEn('')
    }
  }

  function removeTag(lang: 'es' | 'en', i: number) {
    if (lang === 'es') setForm(p => ({ ...p, hub_category_tags: p.hub_category_tags.filter((_, idx) => idx !== i) }))
    else setForm(p => ({ ...p, hub_category_tags_en: p.hub_category_tags_en.filter((_, idx) => idx !== i) }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        hub_about: form.hub_about.trim() || null,
        hub_about_en: form.hub_about_en.trim() || null,
        hub_category_tags: form.hub_category_tags,
        hub_category_tags_en: form.hub_category_tags_en,
        hub_enabled: form.hub_enabled,
        hub_bottom_nav: form.hub_bottom_nav,
        google_rating: form.google_rating ? parseFloat(form.google_rating) : null,
        google_review_count: form.google_review_count ? parseInt(form.google_review_count) : null,
        google_review_url: form.google_review_url.trim() || null,
      }
      const { error } = await db.from('restaurants').update(payload).eq('id', restaurantId)
      if (error) throw error
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error('Error al guardar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <Spinner />

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Descripción del local</h3>
        <Field label="Sobre nosotros (ES)" value={form.hub_about}
          onChange={v => setForm(p => ({ ...p, hub_about: v }))}
          textarea placeholder="Contanos la historia de tu local…" />
        <Field label="About us (EN)" value={form.hub_about_en}
          onChange={v => setForm(p => ({ ...p, hub_about_en: v }))}
          textarea placeholder="Tell us about your place…" />
      </Card>

      <Card className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Etiquetas de categoría</h3>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Tags (ES)</label>
          <div className="flex gap-2 mb-2">
            <input
              className={inputCls}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('es'))}
              placeholder="Ej. Italiano · Enter para agregar"
            />
            <button type="button" onClick={() => addTag('es')}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0"
              style={{ background: ACC }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {form.hub_category_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.hub_category_tags.map((t, i) => (
                <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(245,158,11,0.15)', color: ACC }}>
                  {t}
                  <button type="button" onClick={() => removeTag('es', i)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Tags (EN)</label>
          <div className="flex gap-2 mb-2">
            <input
              className={inputCls}
              value={tagInputEn}
              onChange={e => setTagInputEn(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('en'))}
              placeholder="Eg. Italian · Press Enter"
            />
            <button type="button" onClick={() => addTag('en')}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0"
              style={{ background: ACC }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {form.hub_category_tags_en.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.hub_category_tags_en.map((t, i) => (
                <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(245,158,11,0.15)', color: ACC }}>
                  {t}
                  <button type="button" onClick={() => removeTag('en', i)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Google Reviews</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rating (ej. 4.7)" value={form.google_rating}
            onChange={v => setForm(p => ({ ...p, google_rating: v }))} type="number" placeholder="4.7" />
          <Field label="N° reseñas" value={form.google_review_count}
            onChange={v => setForm(p => ({ ...p, google_review_count: v }))} type="number" placeholder="312" />
        </div>
        <Field label="URL de Google Reviews" value={form.google_review_url}
          onChange={v => setForm(p => ({ ...p, google_review_url: v }))}
          placeholder="https://g.page/r/…/review" />
      </Card>

      <Card className="space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-1">Visibilidad</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Hub activo</p>
            <p className="text-xs text-gray-500">Los clientes pueden ver tu Hub Público</p>
          </div>
          <Toggle value={form.hub_enabled} onChange={v => setForm(p => ({ ...p, hub_enabled: v }))} />
        </div>
        <div className="w-full h-px bg-white/5" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Nav inferior en Hub</p>
            <p className="text-xs text-gray-500">Muestra la barra de navegación con secciones</p>
          </div>
          <Toggle value={form.hub_bottom_nav} onChange={v => setForm(p => ({ ...p, hub_bottom_nav: v }))} />
        </div>
      </Card>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: ACC }}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ─── Tab: Novedad ──────────────────────────────────────────────────────────────

function TabNovedad({ restaurantId }: { restaurantId: string }) {
  const { uploadImage, uploading } = useImageUpload()
  const [story, setStory] = useState<HubStory | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    image_url: '', title: '', title_en: '',
    description: '', description_en: '', is_active: true,
  })

  useEffect(() => {
    db.from('hub_stories').select('*').eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: { data: HubStory | null }) => {
        if (data) {
          setStory(data)
          setForm({
            image_url: data.image_url ?? '',
            title: data.title ?? '',
            title_en: (data as any).title_en ?? '',
            description: data.description ?? '',
            description_en: (data as any).description_en ?? '',
            is_active: data.is_active,
          })
        }
        setLoaded(true)
      })
  }, [restaurantId])

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        restaurant_id: restaurantId,
        image_url: form.image_url.trim() || null,
        title: form.title.trim() || null,
        title_en: form.title_en.trim() || null,
        description: form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }
      let error: unknown
      if (story) {
        ;({ error } = await db.from('hub_stories').update(payload).eq('id', story.id))
      } else {
        const { data: ins, error: ie } = await db.from('hub_stories').insert(payload).select().maybeSingle()
        error = ie
        if (!ie && ins) setStory(ins)
      }
      if (error) throw error
      toast.success('Novedad guardada')
    } catch (err) {
      toast.error('Error al guardar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!story || !window.confirm('¿Eliminar la novedad?')) return
    await db.from('hub_stories').delete().eq('id', story.id)
    setStory(null)
    setForm({ image_url: '', title: '', title_en: '', description: '', description_en: '', is_active: true })
    toast.success('Novedad eliminada')
  }

  if (!loaded) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Novedad destacada en la parte superior del Hub.</p>
        {story && (
          <button type="button" onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300">
            Eliminar
          </button>
        )}
      </div>

      <Card className="space-y-4">
        <ImageUploadArea
          url={form.image_url}
          onUpload={async f => {
            const r = await uploadImage(f, 'hub-assets')
            if (r.success) setForm(p => ({ ...p, image_url: r.url }))
          }}
          onClear={() => setForm(p => ({ ...p, image_url: '' }))}
          uploading={uploading}
          height="h-36"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Título (ES)" value={form.title}
            onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="Ej. Nueva carta de verano" />
          <Field label="Title (EN)" value={form.title_en}
            onChange={v => setForm(p => ({ ...p, title_en: v }))} placeholder="New summer menu" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Descripción (ES)" value={form.description}
            onChange={v => setForm(p => ({ ...p, description: v }))}
            textarea placeholder="Contá la novedad…" />
          <Field label="Description (EN)" value={form.description_en}
            onChange={v => setForm(p => ({ ...p, description_en: v }))}
            textarea placeholder="Share the update…" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-sm text-white font-medium">Visible en Hub</p>
            <p className="text-xs text-gray-500">Muestra este banner en el Hub Público</p>
          </div>
          <Toggle value={form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
        </div>
      </Card>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: ACC }}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Guardando…' : 'Guardar novedad'}
      </button>
    </div>
  )
}

// ─── Tab: Destacado ────────────────────────────────────────────────────────────

function TabDestacado({ restaurantId }: { restaurantId: string }) {
  const { uploadImage, uploading } = useImageUpload()
  const [product, setProduct] = useState<HubFeaturedProduct | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '',
    image_url: '', tag: '', cta_text: '', cta_url: '', is_active: true,
  })

  useEffect(() => {
    db.from('hub_featured_product').select('*').eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: { data: HubFeaturedProduct | null }) => {
        if (data) {
          setProduct(data)
          setForm({
            name: data.name ?? '',
            description: data.description ?? '',
            price: data.price != null ? String(data.price) : '',
            image_url: data.image_url ?? '',
            tag: data.tag ?? '',
            cta_text: data.cta_text ?? '',
            cta_url: data.cta_url ?? '',
            is_active: data.is_active,
          })
        }
        setLoaded(true)
      })
  }, [restaurantId])

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      const payload = {
        restaurant_id: restaurantId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price ? parseFloat(form.price) : null,
        image_url: form.image_url.trim() || null,
        tag: form.tag.trim() || null,
        cta_text: form.cta_text.trim() || null,
        cta_url: form.cta_url.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }
      let error: unknown
      if (product) {
        ;({ error } = await db.from('hub_featured_product').update(payload).eq('id', product.id))
      } else {
        const { data: ins, error: ie } = await db.from('hub_featured_product').insert(payload).select().maybeSingle()
        error = ie
        if (!ie && ins) setProduct(ins)
      }
      if (error) throw error
      toast.success('Destacado guardado')
    } catch (err) {
      toast.error('Error al guardar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!product || !window.confirm('¿Eliminar el producto destacado?')) return
    await db.from('hub_featured_product').delete().eq('id', product.id)
    setProduct(null)
    setForm({ name: '', description: '', price: '', image_url: '', tag: '', cta_text: '', cta_url: '', is_active: true })
    toast.success('Destacado eliminado')
  }

  if (!loaded) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Producto o plato destacado en tu Hub.</p>
        {product && (
          <button type="button" onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300">
            Eliminar
          </button>
        )}
      </div>

      <Card className="space-y-4">
        <ImageUploadArea
          url={form.image_url}
          onUpload={async f => {
            const r = await uploadImage(f, 'hub-assets')
            if (r.success) setForm(p => ({ ...p, image_url: r.url }))
          }}
          onClear={() => setForm(p => ({ ...p, image_url: '' }))}
          uploading={uploading}
          height="h-36"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre *" value={form.name}
            onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Ej. Milanesa napolitana" />
          <Field label="Etiqueta / Badge" value={form.tag}
            onChange={v => setForm(p => ({ ...p, tag: v }))} placeholder="Ej. Más pedido" />
        </div>
        <Field label="Descripción" value={form.description}
          onChange={v => setForm(p => ({ ...p, description: v }))}
          textarea placeholder="Descripción breve del producto…" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Precio" value={form.price}
            onChange={v => setForm(p => ({ ...p, price: v }))} type="number" placeholder="0.00" />
          <Field label="Texto del botón CTA" value={form.cta_text}
            onChange={v => setForm(p => ({ ...p, cta_text: v }))} placeholder="Ver en menú" />
        </div>
        <Field label="URL del botón CTA" value={form.cta_url}
          onChange={v => setForm(p => ({ ...p, cta_url: v }))} placeholder="https://…" />
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-sm text-white font-medium">Visible en Hub</p>
            <p className="text-xs text-gray-500">Muestra este destacado en el Hub Público</p>
          </div>
          <Toggle value={form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
        </div>
      </Card>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: ACC }}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Guardando…' : 'Guardar destacado'}
      </button>
    </div>
  )
}

// ─── Tab: Galería ──────────────────────────────────────────────────────────────

const MAX_GALLERY = 12

function TabGaleria({ restaurantId }: { restaurantId: string }) {
  const { uploadImage, uploading } = useImageUpload()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<HubGalleryItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [editCaption, setEditCaption] = useState<{ id: string; val: string } | null>(null)

  const loadItems = useCallback(async () => {
    const { data } = await db.from('hub_gallery').select('*')
      .eq('restaurant_id', restaurantId).order('sort_order')
    setItems(data ?? [])
    setLoaded(true)
  }, [restaurantId])

  useEffect(() => { loadItems() }, [loadItems])

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const toUpload = Array.from(files).slice(0, MAX_GALLERY - items.length)
    for (const file of toUpload) {
      const r = await uploadImage(file, 'hub-assets')
      if (!r.success) continue
      const { error } = await db.from('hub_gallery').insert({
        restaurant_id: restaurantId,
        url: r.url,
        type: 'image',
        sort_order: items.length + toUpload.indexOf(file),
        is_active: true,
      })
      if (!error) toast.success('Imagen agregada')
    }
    await loadItems()
  }

  async function toggleItem(item: HubGalleryItem) {
    await db.from('hub_gallery').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id)
    setItems(p => p.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
  }

  async function deleteItem(id: string) {
    if (!window.confirm('¿Eliminar esta imagen?')) return
    await db.from('hub_gallery').delete().eq('id', id)
    setItems(p => p.filter(i => i.id !== id))
    toast.success('Imagen eliminada')
  }

  async function saveCaption(id: string, caption: string) {
    await db.from('hub_gallery').update({ caption: caption.trim() || null, updated_at: new Date().toISOString() }).eq('id', id)
    setItems(p => p.map(i => i.id === id ? { ...i, caption: caption.trim() || null } : i))
    setEditCaption(null)
    toast.success('Caption guardado')
  }

  function handleDragStart(i: number) { setDragIdx(i) }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const newItems = [...items]
    const [moved] = newItems.splice(dragIdx, 1)
    newItems.splice(i, 0, moved)
    newItems.forEach((item, idx) => { item.sort_order = idx })
    setItems(newItems)
    setDragIdx(i)
  }
  async function handleDragEnd() {
    setDragIdx(null)
    await Promise.all(items.map(item =>
      db.from('hub_gallery').update({ sort_order: item.sort_order, updated_at: new Date().toISOString() }).eq('id', item.id)
    ))
  }

  if (!loaded) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{items.length}/{MAX_GALLERY} fotos</p>
        {items.length < MAX_GALLERY && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: ACC }}
          >
            <Plus className="w-4 h-4" />
            {uploading ? 'Subiendo…' : 'Agregar fotos'}
          </button>
        )}
        <input
          ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {items.length === 0 ? (
        <Card>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-amber-400 transition-all"
          >
            <ImageIcon className="w-8 h-8" />
            <span className="text-sm">Subí las primeras fotos de tu local</span>
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, i) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className="relative group rounded-xl overflow-hidden aspect-square cursor-grab active:cursor-grabbing"
              style={{
                opacity: dragIdx === i ? 0.5 : 1,
                border: `1px solid rgba(255,255,255,${item.is_active ? '0.1' : '0.04'})`,
              }}
            >
              <img src={item.url} alt="" className="w-full h-full object-cover" />
              {!item.is_active && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button type="button" onClick={() => toggleItem(item)}
                  className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                  {item.is_active ? <EyeOff className="w-3.5 h-3.5 text-white" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
                </button>
                <button type="button" onClick={() => setEditCaption({ id: item.id, val: item.caption ?? '' })}
                  className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white text-xs font-bold">
                  T
                </button>
                <button type="button" onClick={() => deleteItem(item.id)}
                  className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
              <div className="absolute bottom-1 left-1 opacity-40 group-hover:opacity-70 transition-all">
                <GripVertical className="w-4 h-4 text-white" />
              </div>
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                  <p className="text-white text-[9px] truncate">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editCaption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: '#161A24', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Caption / Descripción</h3>
              <button type="button" onClick={() => setEditCaption(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <input
              className={inputCls}
              value={editCaption.val}
              onChange={e => setEditCaption(p => p ? { ...p, val: e.target.value } : p)}
              placeholder="Descripción de la foto…"
              autoFocus
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditCaption(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-gray-700 hover:border-gray-500 transition-all">
                Cancelar
              </button>
              <button type="button" onClick={() => saveCaption(editCaption.id, editCaption.val)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
                style={{ background: ACC }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Reseñas ──────────────────────────────────────────────────────────────

const MAX_REVIEWS = 5

interface ReviewFormState {
  author_name: string; author_initial: string
  profile_color: string; rating: number
  text: string; relative_time: string
}

const emptyReview = (): ReviewFormState => ({
  author_name: '', author_initial: '', profile_color: ACC,
  rating: 5, text: '', relative_time: 'Hace poco',
})

function ReviewModal({
  restaurantId, review, count, onClose, onSaved,
}: {
  restaurantId: string
  review: HubReview | null
  count: number
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ReviewFormState>(
    review
      ? {
          author_name: review.author_name,
          author_initial: review.author_initial ?? '',
          profile_color: review.profile_color ?? ACC,
          rating: review.rating,
          text: review.text,
          relative_time: review.relative_time ?? 'Hace poco',
        }
      : emptyReview()
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.author_name.trim()) { toast.error('El nombre es requerido'); return }
    if (!form.text.trim()) { toast.error('El texto es requerido'); return }
    setSaving(true)
    try {
      const payload = {
        restaurant_id: restaurantId,
        author_name: form.author_name.trim(),
        author_initial: form.author_initial.trim() || form.author_name.trim()[0]?.toUpperCase() || null,
        profile_color: form.profile_color,
        rating: form.rating,
        text: form.text.trim(),
        relative_time: form.relative_time.trim() || 'Hace poco',
        sort_order: review?.sort_order ?? count,
        updated_at: new Date().toISOString(),
      }
      let error: unknown
      if (review) {
        ;({ error } = await db.from('hub_reviews').update(payload).eq('id', review.id))
      } else {
        ;({ error } = await db.from('hub_reviews').insert(payload))
      }
      if (error) throw error
      toast.success(review ? 'Reseña actualizada' : 'Reseña agregada')
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
      <div className="w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh]"
        style={{ background: '#161A24', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-semibold">{review ? 'Editar reseña' : 'Nueva reseña'}</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *" value={form.author_name}
              onChange={v => setForm(p => ({ ...p, author_name: v }))} placeholder="María G." />
            <Field label="Inicial (auto)" value={form.author_initial}
              onChange={v => setForm(p => ({ ...p, author_initial: v }))} placeholder="M" />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Rating</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setForm(p => ({ ...p, rating: n }))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: form.rating >= n ? 'rgba(245,158,11,0.2)' : 'transparent' }}>
                  <Star className="w-4 h-4" style={{ color: form.rating >= n ? ACC : '#374151', fill: form.rating >= n ? ACC : 'none' }} />
                </button>
              ))}
            </div>
          </div>
          <Field label="Texto de la reseña *" value={form.text}
            onChange={v => setForm(p => ({ ...p, text: v }))}
            textarea placeholder="Excelente servicio y comida…" />
          <Field label="Tiempo relativo" value={form.relative_time}
            onChange={v => setForm(p => ({ ...p, relative_time: v }))} placeholder="Hace 2 semanas" />
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Color del avatar</label>
            <div className="flex gap-2">
              {REVIEW_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, profile_color: c }))}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ background: c, outline: form.profile_color === c ? `2px solid white` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-gray-700 hover:border-gray-500 transition-all">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: ACC }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabResenas({ restaurantId }: { restaurantId: string }) {
  const [reviews, setReviews] = useState<HubReview[]>([])
  const [loaded, setLoaded] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; review: HubReview | null }>({ open: false, review: null })

  const loadReviews = useCallback(async () => {
    const { data } = await db.from('hub_reviews').select('*')
      .eq('restaurant_id', restaurantId).order('sort_order')
    setReviews(data ?? [])
    setLoaded(true)
  }, [restaurantId])

  useEffect(() => { loadReviews() }, [loadReviews])

  async function deleteReview(id: string) {
    if (!window.confirm('¿Eliminar esta reseña?')) return
    await db.from('hub_reviews').delete().eq('id', id)
    setReviews(p => p.filter(r => r.id !== id))
    toast.success('Reseña eliminada')
  }

  if (!loaded) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{reviews.length}/{MAX_REVIEWS} reseñas</p>
        {reviews.length < MAX_REVIEWS && (
          <button
            type="button"
            onClick={() => setModal({ open: true, review: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
            style={{ background: ACC }}
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        )}
      </div>

      {reviews.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-gray-500 py-4">
            No hay reseñas. Agregá hasta {MAX_REVIEWS} reseñas manuales de clientes.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <Card key={r.id} className="flex items-start gap-3 !p-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: r.profile_color }}>
                {r.author_initial ?? r.author_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setModal({ open: true, review: r })}>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm text-white font-medium">{r.author_name}</p>
                  <div className="flex">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className="w-3 h-3" style={{ color: r.rating >= n ? ACC : '#374151', fill: r.rating >= n ? ACC : 'none' }} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{r.text}</p>
                {r.relative_time && <p className="text-xs text-gray-600 mt-0.5">{r.relative_time}</p>}
              </div>
              <button type="button" onClick={() => deleteReview(r.id)}
                className="text-gray-600 hover:text-red-400 transition-all flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {modal.open && (
        <ReviewModal
          restaurantId={restaurantId}
          review={modal.review}
          count={reviews.length}
          onClose={() => setModal({ open: false, review: null })}
          onSaved={loadReviews}
        />
      )}
    </div>
  )
}

// ─── Tab: Vista previa ─────────────────────────────────────────────────────────

function TabPreview({ slug }: { slug: string | undefined }) {
  if (!slug) return (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
      No se encontró el restaurante.
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <button
        type="button"
        onClick={() => window.open(`/${slug}`, '_blank')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
        style={{ background: ACC }}
      >
        <ExternalLink className="w-4 h-4" />
        Abrir en nueva pestaña
      </button>
      <div
        className="rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{
          width: 300, height: 600,
          border: '6px solid rgba(255,255,255,0.1)',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 40px 80px rgba(0,0,0,0.6)`,
        }}
      >
        <iframe src={`/${slug}`} className="w-full h-full" title="Hub preview" />
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HubPage() {
  const { restaurant, loading } = useRestaurant()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [hubEnabled, setHubEnabled] = useState<boolean | null>(null)
  const [savingEnabled, setSavingEnabled] = useState(false)

  useEffect(() => {
    if (restaurant?.id) {
      db.from('restaurants').select('hub_enabled').eq('id', restaurant.id).maybeSingle()
        .then(({ data }: { data: { hub_enabled: boolean } | null }) => {
          setHubEnabled(data?.hub_enabled !== false)
        })
    }
  }, [restaurant?.id])

  async function toggleHubEnabled() {
    if (!restaurant?.id || hubEnabled === null) return
    const next = !hubEnabled
    setSavingEnabled(true)
    const { error } = await db.from('restaurants').update({ hub_enabled: next }).eq('id', restaurant.id)
    setSavingEnabled(false)
    if (!error) { setHubEnabled(next); toast.success(next ? 'Hub activado' : 'Hub desactivado') }
    else toast.error('Error al actualizar')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: ACC, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Globe className="w-5 h-5" style={{ color: ACC }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Hub Público</h1>
            {restaurant?.slug && (
              <a
                href={`/${restaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono px-2 py-0.5 rounded-md inline-block mt-0.5 hover:opacity-80 transition-all"
                style={{ background: 'rgba(245,158,11,0.12)', color: ACC }}
              >
                menulife.digital/{restaurant.slug}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block">{hubEnabled ? 'Activo' : 'Inactivo'}</span>
            <button
              type="button"
              onClick={toggleHubEnabled}
              disabled={savingEnabled || hubEnabled === null}
              className="relative w-11 h-6 rounded-full transition-all duration-200 disabled:opacity-50"
              style={{ background: hubEnabled ? ACC : '#374151' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                style={{ transform: hubEnabled ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
          {restaurant?.slug && (
            <button
              type="button"
              onClick={() => window.open(`/${restaurant.slug}`, '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-80"
              style={{ background: 'rgba(245,158,11,0.15)', color: ACC }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Hub
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-1 mb-6 gap-1 overflow-x-auto scrollbar-none"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap"
            style={{
              background: activeTab === tab.id ? ACC : 'transparent',
              color: activeTab === tab.id ? '#0F1115' : 'rgba(248,249,250,0.5)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {!restaurant ? (
        <div className="text-center text-gray-500 py-12">No se encontró el restaurante.</div>
      ) : (
        <>
          {activeTab === 'general'   && <TabGeneral   restaurantId={restaurant.id} />}
          {activeTab === 'novedad'   && <TabNovedad   restaurantId={restaurant.id} />}
          {activeTab === 'destacado' && <TabDestacado restaurantId={restaurant.id} />}
          {activeTab === 'galeria'   && <TabGaleria   restaurantId={restaurant.id} />}
          {activeTab === 'resenas'   && <TabResenas   restaurantId={restaurant.id} />}
          {activeTab === 'preview'   && <TabPreview   slug={restaurant.slug} />}
        </>
      )}
    </div>
  )
}
