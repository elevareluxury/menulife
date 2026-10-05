import { useState, useEffect, useRef, useCallback } from 'react'
import { ThemeSelector } from '../components/ThemeSelector'
import type { HubTheme } from '../lib/themeConfig'
import { THEME_META } from '../lib/themeConfig'
import { HubBlockEditor } from '../components/HubBlockEditor'
import type { BlockType } from '../lib/blocksConfig'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Globe, Plus, Trash2, Eye, EyeOff, ExternalLink,
  ImageIcon, X, Star, GripVertical, Save, Download, Link2,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useRestaurantStore } from '@/store/restaurantStore'
import type { Restaurant } from '@/types/restaurant'
import { useImageUpload } from '@/modules/menu/hooks/useImageUpload'
import { QRCodeSVG } from 'qrcode.react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TabAnalytics } from '../components/analytics/TabAnalytics'
import toast from 'react-hot-toast'

const db = supabase as any
const ACC = '#F4705A'

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface HubLink {
  id: string; restaurant_id: string
  type: string; label: string; url: string
  icon: string | null; image_url: string | null; is_active: boolean
  sort_order: number; click_count: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LINK_TYPES = [
  { type: 'whatsapp',  icon: '💬', label: 'WhatsApp',    color: '#25D366', placeholder: 'https://wa.me/5493413000000' },
  { type: 'instagram', icon: '📸', label: 'Instagram',   color: '#E1306C', placeholder: 'https://instagram.com/tunegocio' },
  { type: 'tiktok',    icon: '🎵', label: 'TikTok',      color: '#F8F8F8', placeholder: 'https://tiktok.com/@tunegocio' },
  { type: 'facebook',  icon: '👥', label: 'Facebook',    color: '#3B82F6', placeholder: 'https://facebook.com/tunegocio' },
  { type: 'youtube',   icon: '▶',  label: 'YouTube',     color: '#EF4444', placeholder: 'https://youtube.com/@tunegocio' },
  { type: 'linkedin',  icon: '💼', label: 'LinkedIn',    color: '#0A66C2', placeholder: 'https://linkedin.com/in/tunegocio' },
  { type: 'maps',      icon: '📍', label: 'Google Maps', color: '#F59E0B', placeholder: 'https://maps.google.com/?q=...' },
  { type: 'website',   icon: '🌐', label: 'Sitio Web',   color: '#9CA3AF', placeholder: 'https://tunegocio.com' },
  { type: 'email',     icon: '✉',  label: 'Email',       color: '#6366F1', placeholder: 'mailto:hola@tunegocio.com' },
  { type: 'phone',     icon: '📞', label: 'Teléfono',    color: '#10B981', placeholder: 'tel:+5493413000000' },
  { type: 'custom',    icon: '🔗', label: 'URL',         color: '#9CA3AF', placeholder: 'https://...' },
]

const HUB_CATEGORIES = [
  'Restaurante', 'Bar', 'Café', 'Panadería', 'Heladería',
  'Delivery', 'Ropa', 'Accesorios', 'Tecnología', 'Servicios', 'Otro',
]

type Tab = 'general' | 'blocks' | 'links' | 'novedad' | 'destacado' | 'galeria' | 'resenas' | 'analytics' | 'preview'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',   label: 'General'      },
  { id: 'blocks',    label: 'Bloques'      },
  { id: 'links',     label: 'Links'        },
  { id: 'novedad',   label: 'Novedad'      },
  { id: 'destacado', label: 'Destacado'    },
  { id: 'galeria',   label: 'Galería'      },
  { id: 'resenas',   label: 'Reseñas'      },
  { id: 'analytics', label: 'Estadísticas' },
  { id: 'preview',   label: 'Vista previa' },
]

const REVIEW_COLORS = ['#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#EF4444']

// ─── Helpers ────────────────────────────────────────────────────────────────

function svgToCanvas(svg: SVGElement, size: number): Promise<HTMLCanvasElement> {
  return new Promise(resolve => {
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      resolve(canvas)
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  })
}

// ─── Shared UI ──────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 bg-[#0F1115] border border-gray-800 focus:outline-none transition-all resize-none focus:border-[#F4705A]'

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

function FieldSelect({
  label, value, onChange, options,
}: {
  label: string; value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">{label}</label>
      <select
        className={inputCls}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none' }}
      >
        <option value="">Seleccionar…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
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
          <button type="button" onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className="w-full h-24 rounded-xl border-dashed border-2 border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#F4705A] hover:border-[#F4705A]/50 transition-all">
          <ImageIcon className="w-6 h-6" />
          <span className="text-xs">{uploading ? 'Subiendo…' : 'Subir imagen'}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
    </div>
  )
}

// ─── Tab: General ────────────────────────────────────────────────────────────

function TabGeneral({ restaurantId, slug }: { restaurantId: string; slug: string | undefined }) {
  const { uploadImage, uploading } = useImageUpload()
  const { user } = useAuthStore()
  const { restaurant: storeRestaurant } = useRestaurant()
  const updateRestaurant = useRestaurantStore(s => s.updateRestaurant)
  const qrRef = useRef<HTMLDivElement>(null)
  const fileAvatarRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    const m = (user as any)?.user_metadata ?? {}
    return (m.avatar_url as string | undefined) ?? (m.picture as string | undefined) ?? ''
  })
  const [tagInput, setTagInput] = useState('')
  const [tagInputEn, setTagInputEn] = useState('')
  const [form, setForm] = useState({
    hub_about: '',
    hub_about_en: '',
    hub_category_tags: [] as string[],
    hub_category_tags_en: [] as string[],
    hub_enabled: true,
    hub_bottom_nav: true,
    hub_cover_url: '',
    hub_category: '',
    hub_main_cta_text: '',
    hub_main_cta_url: '',
    google_rating: '',
    google_review_count: '',
    google_review_url: '',
  })
  const [loaded, setLoaded] = useState(false)
  const [hubConfig, setHubConfig] = useState<Record<string,any>>({
    show_open_status: true,
    show_catalog_banner: true,
    show_locations: true,
    show_contact: true,
    show_schedule: true,
    hub_title: '',
    title_font: 'syne',
    theme: null,
    accent_color: '#F4705A',
  })
  const [scheduleForm, setScheduleForm] = useState<Record<string,any>>({})

  // Initialize hub form fields from store (no Supabase SELECT needed)
  useEffect(() => {
    if (!storeRestaurant) return
    setForm({
      hub_about: storeRestaurant.hub_about ?? '',
      hub_about_en: storeRestaurant.hub_about_en ?? '',
      hub_category_tags: (storeRestaurant.hub_category_tags as string[]) ?? [],
      hub_category_tags_en: (storeRestaurant.hub_category_tags_en as string[]) ?? [],
      hub_enabled: storeRestaurant.hub_enabled !== false,
      hub_bottom_nav: (storeRestaurant.hub_bottom_nav as any) !== false,
      hub_cover_url: storeRestaurant.hub_cover_url ?? '',
      hub_category: storeRestaurant.hub_category ?? '',
      hub_main_cta_text: storeRestaurant.hub_main_cta_text ?? '',
      hub_main_cta_url: storeRestaurant.hub_main_cta_url ?? '',
      google_rating: storeRestaurant.google_rating != null ? String(storeRestaurant.google_rating) : '',
      google_review_count: storeRestaurant.google_review_count != null ? String(storeRestaurant.google_review_count) : '',
      google_review_url: storeRestaurant.google_review_url ?? '',
    })
    if (storeRestaurant.schedule) setScheduleForm(storeRestaurant.schedule as Record<string, any>)
    setLoaded(true)
  }, [storeRestaurant])

  // Fetch hub_config (separate table, not in restaurant store)
  useEffect(() => {
    db.from('hub_config').select('*').eq('restaurant_id', restaurantId).maybeSingle()
      .then(({ data }: { data: Record<string,any> | null }) => {
        if (data) setHubConfig({
          show_open_status:    data.show_open_status    ?? true,
          show_catalog_banner: data.show_catalog_banner ?? true,
          show_locations:      data.show_locations      ?? true,
          show_contact:        data.show_contact        ?? true,
          show_schedule:       data.show_schedule       ?? true,
          hub_title:           data.hub_title           || '',
          title_font:          data.title_font          || 'syne',
          theme:               data.theme               ?? null,
          accent_color:        data.accent_color        || '#F4705A',
        })
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

  async function handleAvatarUpload(file: File) {
    setAvatarUploading(true)
    try {
      const r = await uploadImage(file, 'hub-assets')
      if (r.success) {
        // Guardar en auth.user_metadata (esfera + header de /life)
        // y en restaurants.logo_url (Hub Público /:slug) — misma fuente de verdad
        await Promise.all([
          db.auth.updateUser({ data: { avatar_url: r.url } }),
          db.from('restaurants').update({ logo_url: r.url }).eq('id', restaurantId),
        ])
        setAvatarUrl(r.url)
        updateRestaurant({ logo_url: r.url })
        toast.success('Foto de perfil actualizada')
      } else {
        toast.error('Error al subir la foto')
      }
    } catch (e) {
      toast.error('Error al subir la foto')
      console.error(e)
    } finally {
      setAvatarUploading(false)
    }
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
        hub_cover_url: form.hub_cover_url.trim() || null,
        hub_category: form.hub_category.trim() || null,
        hub_main_cta_text: form.hub_main_cta_text.trim() || null,
        hub_main_cta_url: form.hub_main_cta_url.trim() || null,
        google_rating: form.google_rating ? parseFloat(form.google_rating) : null,
        google_review_count: form.google_review_count ? parseInt(form.google_review_count) : null,
        google_review_url: form.google_review_url.trim() || null,
      }
      console.log('Saving hub payload:', payload)
      const { data, error } = await db
        .from('restaurants')
        .update(payload)
        .eq('id', restaurantId)
        .select()
        .single()
      if (error) {
        console.error('Error guardando hub:', error)
        toast.error(`Error al guardar: ${error.message}`)
        return
      }
      console.log('Hub saved:', data)
      updateRestaurant(payload as Partial<Restaurant>)
      toast.success('Configuración guardada')
      await db.from('hub_config').upsert({
        restaurant_id:       restaurantId,
        accent_color:        hubConfig.accent_color        || '#F4705A',
        theme:               hubConfig.theme               ?? null,
        show_open_status:    hubConfig.show_open_status    ?? true,
        show_catalog_banner: hubConfig.show_catalog_banner ?? true,
        show_locations:      hubConfig.show_locations      ?? true,
        show_contact:        hubConfig.show_contact        ?? true,
        show_schedule:       hubConfig.show_schedule       ?? true,
        hub_title:           hubConfig.hub_title           || null,
        title_font:          hubConfig.title_font          || 'syne',
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'restaurant_id' })
      await db.from('restaurants').update({ schedule: scheduleForm }).eq('id', restaurantId)
      updateRestaurant({ schedule: scheduleForm as Restaurant['schedule'] })
    } catch (err) {
      toast.error(`Error al guardar: ${(err as Error)?.message ?? err}`)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function downloadPNG() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg || !slug) return
    const canvas = await svgToCanvas(svg as SVGElement, 512)
    const a = document.createElement('a')
    a.download = `hub-qr-${slug}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  function downloadSVG() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg || !slug) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hub-qr-${slug}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!loaded) return <Spinner />

  const hubUrl = slug ? `https://menulife.digital/${slug}` : ''

  return (
    <div className="space-y-5">
      {/* Profile photo */}
      <Card className="space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Foto de perfil</h3>
        <p className="text-xs text-gray-500">Aparece en tu ID público, en la esfera de Life y en el saludo.</p>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileAvatarRef.current?.click()}
            disabled={avatarUploading}
            className="relative w-24 h-24 rounded-full overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, rgba(244,112,90,0.85) 0%, rgba(139,92,246,0.85) 100%)',
              border: '2px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold select-none">
                {((user as any)?.email?.[0] ?? '?').toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.55)' }}>
              {avatarUploading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <span className="text-white text-xs font-semibold">Cambiar</span>
              )}
            </div>
          </button>
          <p className="text-xs text-gray-600">Tocá para cambiar · JPG o PNG</p>
        </div>
        <input ref={fileAvatarRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = '' }} />
      </Card>

      {/* Cover image */}
      <Card className="space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Imagen de portada</h3>
        <p className="text-xs text-gray-500">Fondo del hero (recomendado 1200×400 px)</p>
        <ImageUploadArea
          url={form.hub_cover_url}
          onUpload={async f => {
            const r = await uploadImage(f, 'hub-assets')
            console.log('Cover upload result:', r)
            if (r.success) {
              console.log('Cover URL set:', r.url)
              setForm(p => ({ ...p, hub_cover_url: r.url }))
            }
          }}
          onClear={() => setForm(p => ({ ...p, hub_cover_url: '' }))}
          uploading={uploading}
          height="h-28"
        />
      </Card>

      {/* Category + CTA */}
      <Card className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Categoría y CTA</h3>
        <FieldSelect
          label="Categoría del negocio"
          value={form.hub_category}
          onChange={v => setForm(p => ({ ...p, hub_category: v }))}
          options={HUB_CATEGORIES}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Texto del botón principal"
            value={form.hub_main_cta_text}
            onChange={v => setForm(p => ({ ...p, hub_main_cta_text: v }))}
            placeholder="Ver menú, Reservar, Contactar…" />
          <Field label="URL del botón principal"
            value={form.hub_main_cta_url}
            onChange={v => setForm(p => ({ ...p, hub_main_cta_url: v }))}
            placeholder="/r/mi-negocio o https://wa.me/…" />
        </div>
      </Card>

      {/* About */}
      <Card className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Descripción del local</h3>
        <Field label="Sobre nosotros (ES)" value={form.hub_about}
          onChange={v => setForm(p => ({ ...p, hub_about: v }))}
          textarea placeholder="Contanos la historia de tu local…" />
        <Field label="About us (EN)" value={form.hub_about_en}
          onChange={v => setForm(p => ({ ...p, hub_about_en: v }))}
          textarea placeholder="Tell us about your place…" />
      </Card>

      {/* Tags */}
      <Card className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Etiquetas de categoría</h3>
        {(['es', 'en'] as const).map(lang => {
          const tags = lang === 'es' ? form.hub_category_tags : form.hub_category_tags_en
          const inputVal = lang === 'es' ? tagInput : tagInputEn
          const setInput = lang === 'es' ? setTagInput : setTagInputEn
          return (
            <div key={lang}>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">
                Tags ({lang === 'es' ? 'ES' : 'EN'})
              </label>
              <div className="flex gap-2 mb-2">
                <input className={inputCls} value={inputVal}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(lang))}
                  placeholder={lang === 'es' ? 'Ej. Italiano · Enter para agregar' : 'Eg. Italian · Press Enter'} />
                <button type="button" onClick={() => addTag(lang)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0"
                  style={{ background: ACC }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{ background: 'rgba(244,112,90,0.15)', color: ACC }}>
                      {t}
                      <button type="button" onClick={() => removeTag(lang, i)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </Card>

      {/* Google */}
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

      {/* Visibility */}
      <Card className="space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-1">Visibilidad</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">ID activo</p>
            <p className="text-xs text-gray-500">Los clientes pueden ver tu ID Público</p>
          </div>
          <Toggle value={form.hub_enabled} onChange={v => setForm(p => ({ ...p, hub_enabled: v }))} />
        </div>
        <div className="w-full h-px bg-white/5" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Nav inferior en ID</p>
            <p className="text-xs text-gray-500">Muestra la barra de navegación con secciones</p>
          </div>
          <Toggle value={form.hub_bottom_nav} onChange={v => setForm(p => ({ ...p, hub_bottom_nav: v }))} />
        </div>
      </Card>

      {/* Tema visual */}
      <Card className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Apariencia</h3>
        <ThemeSelector
          value={(hubConfig.theme as HubTheme | null) ?? null}
          onChange={(newTheme) => {
            const currentAccent = hubConfig.accent_color
            const oldThemeDefault = hubConfig.theme
              ? THEME_META[hubConfig.theme as HubTheme]?.defaultAccent
              : '#F4705A'
            // Reset accent only if it was the old theme's default
            const newAccent = (currentAccent === oldThemeDefault || !currentAccent)
              ? THEME_META[newTheme].defaultAccent
              : currentAccent
            setHubConfig({ ...hubConfig, theme: newTheme, accent_color: newAccent })
          }}
        />
      </Card>

      {/* Nombre y tipografía */}
      <Card className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Nombre y Tipografía</h3>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Título personalizado</label>
          <input
            className={inputCls}
            style={{ textAlign: 'center' }}
            value={hubConfig.hub_title || ''}
            onChange={e => setHubConfig({ ...hubConfig, hub_title: e.target.value })}
            placeholder="Por defecto usa el nombre del negocio"
          />
        </div>
        <div className="space-y-2">
          {[
            { id: 'syne',          family: 'Syne',            weight: 800, preview: 'Moderno'   },
            { id: 'playfair',      family: 'Playfair Display', weight: 700, preview: 'Elegante'  },
            { id: 'space-grotesk', family: 'Space Grotesk',   weight: 700, preview: 'Técnico'   },
            { id: 'bebas',         family: 'Bebas Neue',      weight: 400, preview: 'Impacto'   },
            { id: 'dm-sans',       family: 'DM Sans',         weight: 700, preview: 'Limpio'    },
            { id: 'inter',         family: 'Inter',           weight: 700, preview: 'Neutral'   },
          ].map(font => (
            <button
              key={font.id}
              type="button"
              onClick={() => setHubConfig({ ...hubConfig, title_font: font.id })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: hubConfig.title_font === font.id
                  ? '1.5px solid rgba(255,255,255,0.7)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: hubConfig.title_font === font.id
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: font.family, fontWeight: font.weight, fontSize: 20, color: 'white' }}>
                {hubConfig.hub_title || 'Tu negocio'}
              </span>
              <span style={{
                fontSize: 11, color: hubConfig.title_font === font.id ? 'white' : 'rgba(255,255,255,0.3)',
                fontFamily: 'DM Sans',
              }}>
                {font.preview}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Visibilidad */}
      <Card className="space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Visibilidad de secciones</h3>
        {[
          { key: 'show_open_status',    label: 'Badge "Abierto ahora"',    desc: 'Estado en tiempo real' },
          { key: 'show_catalog_banner', label: 'Banner menú / catálogo',   desc: '"Ver el menú completo"' },
          { key: 'show_locations',      label: 'Sección Locales',          desc: 'Dirección, Maps y teléfono' },
          { key: 'show_schedule',       label: 'Horarios',                 desc: 'Horarios por día' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-white font-medium">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <Toggle
              value={hubConfig[key] !== false}
              onChange={v => setHubConfig({ ...hubConfig, [key]: v })}
            />
          </div>
        ))}
      </Card>

      {/* Horarios */}
      <Card className="space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Horarios</h3>
        <div className="space-y-0">
          {[
            { key: 'monday',    label: 'Lunes'     },
            { key: 'tuesday',   label: 'Martes'    },
            { key: 'wednesday', label: 'Miércoles' },
            { key: 'thursday',  label: 'Jueves'    },
            { key: 'friday',    label: 'Viernes'   },
            { key: 'saturday',  label: 'Sábado'    },
            { key: 'sunday',    label: 'Domingo'   },
          ].map(day => {
            const s = scheduleForm[day.key] || { open: '09:00', close: '23:00', closed: false }
            return (
              <div key={day.key} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ width: 82, fontSize: 13, color: 'white', fontFamily: 'DM Sans', flexShrink: 0 }}>
                  {day.label}
                </span>
                <Toggle
                  value={!s.closed}
                  onChange={v => setScheduleForm((p: Record<string,any>) => ({ ...p, [day.key]: { ...s, closed: !v } }))}
                />
                {!s.closed ? (
                  <>
                    <input
                      type="time"
                      value={s.open || '09:00'}
                      onChange={e => setScheduleForm((p: Record<string,any>) => ({ ...p, [day.key]: { ...s, open: e.target.value } }))}
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '5px 7px', color: 'white', fontSize: 12,
                        fontFamily: 'DM Mono, monospace', width: 82, flexShrink: 0,
                      }}
                    />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>—</span>
                    <input
                      type="time"
                      value={s.close || '23:00'}
                      onChange={e => setScheduleForm((p: Record<string,any>) => ({ ...p, [day.key]: { ...s, close: e.target.value } }))}
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '5px 7px', color: 'white', fontSize: 12,
                        fontFamily: 'DM Mono, monospace', width: 82, flexShrink: 0,
                      }}
                    />
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans' }}>Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <button type="button" onClick={handleSave} disabled={saving || uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: ACC }}>
        <Save className="w-4 h-4" />
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>

      {/* QR Section */}
      {slug && (
        <Card className="space-y-4">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Tu QR del ID</h3>
          <p className="text-xs text-gray-500">
            Compartí este QR en tu local, menús impresos o redes sociales.
          </p>
          <div className="flex justify-center">
            <div ref={qrRef} className="p-4 rounded-2xl" style={{ background: '#fff' }}>
              <QRCodeSVG
                value={hubUrl}
                size={180}
                fgColor="#000000"
                bgColor="#ffffff"
                level="H"
              />
            </div>
          </div>
          <p className="text-center text-xs font-mono" style={{ color: ACC }}>
            {hubUrl}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={downloadPNG}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-80"
              style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Download className="w-4 h-4" />
              Descargar PNG
            </button>
            <button type="button" onClick={downloadSVG}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(244,112,90,0.12)', color: ACC, border: `1px solid rgba(244,112,90,0.25)` }}>
              <Download className="w-4 h-4" />
              Descargar SVG
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Tab: Links ──────────────────────────────────────────────────────────────

function SortableLinkItem({
  link, onToggle, onDelete, onLabelSave,
}: {
  link: HubLink
  onToggle: (id: string, val: boolean) => void
  onDelete: (id: string) => void
  onLabelSave: (id: string, label: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id })
  const lt = LINK_TYPES.find(t => t.type === link.type)
  const [isEditing, setIsEditing] = useState(false)
  const [editingLabel, setEditingLabel] = useState('')

  const startEdit = () => {
    setEditingLabel(link.label)
    setIsEditing(true)
  }

  const saveEdit = () => {
    if (editingLabel.trim()) onLabelSave(link.id, editingLabel.trim())
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: '#0F1115',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        style={{ color: '#374151' }}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-lg flex-shrink-0 w-7 text-center">{link.icon ?? lt?.icon ?? '🔗'}</span>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            autoFocus
            value={editingLabel}
            onChange={e => setEditingLabel(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') setIsEditing(false)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #F4705A',
              color: 'white',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: 500,
              outline: 'none',
              width: '100%',
            }}
          />
        ) : (
          <span
            onClick={startEdit}
            title="Tocá para editar"
            style={{ cursor: 'text', color: 'white', fontSize: '14px', fontWeight: 500, display: 'block' }}
            className="truncate"
          >
            {link.label}
          </span>
        )}
        <p className="text-xs text-gray-500 truncate">{link.url}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Toggle value={link.is_active} onChange={v => onToggle(link.id, v)} />
        <button type="button" onClick={() => onDelete(link.id)}
          className="text-gray-600 hover:text-red-400 transition-all">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface LinkFormState { label: string; url: string }

function AddLinkModal({ restaurantId, count, onClose, onSaved }: {
  restaurantId: string; count: number
  onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<LinkFormState>({ label: '', url: '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.label.trim() || !form.url.trim()) {
      toast.error('Completá título y URL')
      return
    }
    setSaving(true)
    try {
      const { error } = await db.from('hub_links').insert({
        restaurant_id: restaurantId,
        type: 'custom',
        label: form.label.trim(),
        url: form.url.trim(),
        icon: '🔗',
        image_url: null,
        is_active: true,
        sort_order: count,
        click_count: 0,
      })
      if (error) throw error
      toast.success('Link agregado')
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#161A24', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-semibold">Agregar link</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Título</label>
            <input
              className={inputCls}
              style={{ textAlign: 'center' }}
              value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              placeholder="Ej: Seguinos en Instagram"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">URL</label>
            <input
              type="url"
              className={inputCls}
              value={form.url}
              onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            />
          </div>
          <div className="flex gap-3 pt-1">
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
    </div>
  )
}

function TabLinks({ restaurantId }: { restaurantId: string }) {
  const [links, setLinks] = useState<HubLink[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadLinks = useCallback(async () => {
    const { data } = await db.from('hub_links').select('*')
      .eq('restaurant_id', restaurantId).order('sort_order')
    setLinks(data ?? [])
    setLoaded(true)
  }, [restaurantId])

  useEffect(() => { loadLinks() }, [loadLinks])

  async function handleToggle(id: string, val: boolean) {
    await db.from('hub_links').update({ is_active: val }).eq('id', id)
    setLinks(p => p.map(l => l.id === id ? { ...l, is_active: val } : l))
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este link?')) return
    await db.from('hub_links').delete().eq('id', id)
    setLinks(p => p.filter(l => l.id !== id))
    toast.success('Link eliminado')
  }

  async function handleLabelSave(id: string, label: string) {
    await db.from('hub_links').update({ label }).eq('id', id)
    setLinks(p => p.map(l => l.id === id ? { ...l, label } : l))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLinks(prev => {
      const oldIdx = prev.findIndex(l => l.id === active.id)
      const newIdx = prev.findIndex(l => l.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx).map((l, idx) => ({ ...l, sort_order: idx }))
      reordered.forEach((l, idx) => {
        db.from('hub_links').update({ sort_order: idx }).eq('id', l.id)
      })
      return reordered
    })
  }

  if (!loaded) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{links.length} link{links.length !== 1 ? 's' : ''} configurados</p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
          style={{ background: ACC }}>
          <Plus className="w-4 h-4" />
          Agregar link
        </button>
      </div>

      {links.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <Link2 className="w-8 h-8 mx-auto mb-3" style={{ color: '#374151' }} />
            <p className="text-sm text-gray-500">No hay links. Agregá WhatsApp, Instagram, tu sitio web…</p>
          </div>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {links.map(link => (
                <SortableLinkItem key={link.id} link={link} onToggle={handleToggle} onDelete={handleDelete} onLabelSave={handleLabelSave} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <p className="text-xs text-gray-600 text-center">Arrastrá para reordenar · Toggle para activar/desactivar</p>

      {showModal && (
        <AddLinkModal
          restaurantId={restaurantId}
          count={links.length}
          onClose={() => setShowModal(false)}
          onSaved={loadLinks}
        />
      )}
    </div>
  )
}

// ─── Tab: Novedad ─────────────────────────────────────────────────────────────

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
        <p className="text-sm text-gray-400">Novedad destacada en la parte superior del ID.</p>
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
          uploading={uploading} height="h-36"
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
            <p className="text-sm text-white font-medium">Visible en ID</p>
            <p className="text-xs text-gray-500">Muestra este banner en el ID Público</p>
          </div>
          <Toggle value={form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
        </div>
      </Card>
      <button type="button" onClick={handleSave} disabled={saving || uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: ACC }}>
        <Save className="w-4 h-4" />
        {saving ? 'Guardando…' : 'Guardar novedad'}
      </button>
    </div>
  )
}

// ─── Tab: Destacado ──────────────────────────────────────────────────────────

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
        <p className="text-sm text-gray-400">Producto o plato destacado en tu ID.</p>
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
          uploading={uploading} height="h-36"
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
            <p className="text-sm text-white font-medium">Visible en ID</p>
            <p className="text-xs text-gray-500">Muestra este destacado en el ID Público</p>
          </div>
          <Toggle value={form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
        </div>
      </Card>
      <button type="button" onClick={handleSave} disabled={saving || uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: ACC }}>
        <Save className="w-4 h-4" />
        {saving ? 'Guardando…' : 'Guardar destacado'}
      </button>
    </div>
  )
}

// ─── Tab: Galería ─────────────────────────────────────────────────────────────

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
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: ACC }}>
            <Plus className="w-4 h-4" />
            {uploading ? 'Subiendo…' : 'Agregar fotos'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {items.length === 0 ? (
        <Card>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full h-32 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-[#F4705A] transition-all">
            <ImageIcon className="w-8 h-8" />
            <span className="text-sm">Subí las primeras fotos de tu local</span>
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, i) => (
            <div key={item.id} draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className="relative group rounded-xl overflow-hidden aspect-square cursor-grab active:cursor-grabbing"
              style={{ opacity: dragIdx === i ? 0.5 : 1, border: `1px solid rgba(255,255,255,${item.is_active ? '0.1' : '0.04'})` }}>
              <img src={item.url} alt="" className="w-full h-full object-cover" />
              {!item.is_active && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button type="button" onClick={() => toggleItem(item)}
                  className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                  {item.is_active ? <EyeOff className="w-3.5 h-3.5 text-white" /> : <Eye className="w-3.5 h-3.5 text-[#F4705A]" />}
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
            <input className={inputCls} value={editCaption.val} autoFocus
              onChange={e => setEditCaption(p => p ? { ...p, val: e.target.value } : p)}
              placeholder="Descripción de la foto…" />
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

// ─── Tab: Reseñas ─────────────────────────────────────────────────────────────

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

function ReviewModal({ restaurantId, review, count, onClose, onSaved }: {
  restaurantId: string; review: HubReview | null
  count: number; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<ReviewFormState>(
    review
      ? { author_name: review.author_name, author_initial: review.author_initial ?? '', profile_color: review.profile_color ?? ACC, rating: review.rating, text: review.text, relative_time: review.relative_time ?? 'Hace poco' }
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
      onSaved(); onClose()
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
                  style={{ background: form.rating >= n ? 'rgba(244,112,90,0.2)' : 'transparent' }}>
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
          <button type="button" onClick={() => setModal({ open: true, review: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
            style={{ background: ACC }}>
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
          restaurantId={restaurantId} review={modal.review} count={reviews.length}
          onClose={() => setModal({ open: false, review: null })} onSaved={loadReviews}
        />
      )}
    </div>
  )
}

// ─── Tab: Analytics ──────────────────────────────────────────────────────────

// ─── Tab: Vista previa ────────────────────────────────────────────────────────

function TabPreview({ slug }: { slug: string | undefined }) {
  if (!slug) return (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
      No se encontró el restaurante.
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <button type="button" onClick={() => window.open(`/${slug}`, '_blank')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80"
        style={{ background: ACC }}>
        <ExternalLink className="w-4 h-4" />
        Abrir en nueva pestaña
      </button>
      <div className="rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{ width: 300, height: 600, border: '6px solid rgba(255,255,255,0.1)', boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 40px 80px rgba(0,0,0,0.6)' }}>
        <iframe src={`/${slug}`} className="w-full h-full" title="ID preview" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HubPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { restaurant, loading } = useRestaurant()
  const updateRestaurant = useRestaurantStore(s => s.updateRestaurant)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [hubEnabled, setHubEnabled] = useState<boolean | null>(null)
  const [savingEnabled, setSavingEnabled] = useState(false)

  const isLifeContext = location.pathname.startsWith('/life')

  // Derive hub_enabled from store — no SELECT needed
  useEffect(() => {
    if (restaurant) setHubEnabled(restaurant.hub_enabled !== false)
  }, [restaurant?.hub_enabled])

  async function toggleHubEnabled() {
    if (!restaurant?.id || hubEnabled === null) return
    const next = !hubEnabled
    setSavingEnabled(true)
    const { error } = await db.from('restaurants').update({ hub_enabled: next }).eq('id', restaurant.id)
    setSavingEnabled(false)
    if (!error) {
      setHubEnabled(next)
      updateRestaurant({ hub_enabled: next })
      toast.success(next ? 'Hub activado' : 'Hub desactivado')
    } else toast.error('Error al actualizar')
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
      <div className="mb-6 space-y-3">
        {/* Row 1: title/URL left — Life + toggle right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(244,112,90,0.15)' }}>
              <Globe className="w-5 h-5" style={{ color: ACC }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ID Público</h1>
              {restaurant?.slug && (
                <a href={`/${restaurant.slug}`} target="_blank" rel="noreferrer"
                  className="text-xs font-mono px-2 py-0.5 rounded-md inline-block mt-0.5 hover:opacity-80 transition-all"
                  style={{ background: 'rgba(244,112,90,0.12)', color: ACC }}>
                  menulife.digital/{restaurant.slug}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLifeContext && (
              <button type="button" onClick={() => navigate('/life')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>
                <ArrowLeft className="w-3.5 h-3.5" />
                Life
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 hidden sm:block">{hubEnabled ? 'Activo' : 'Inactivo'}</span>
              <button type="button" onClick={toggleHubEnabled}
                disabled={savingEnabled || hubEnabled === null}
                className="relative w-11 h-6 rounded-full transition-all duration-200 disabled:opacity-50"
                style={{ background: hubEnabled ? ACC : '#374151' }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: hubEnabled ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
            </div>
          </div>
        </div>
        {/* Row 2: Ver perfil — full width below */}
        {restaurant?.slug && (
          <button type="button" onClick={() => window.open(`/${restaurant.slug}`, '_blank')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ border: `1px solid rgba(244,112,90,0.35)`, color: ACC, background: 'rgba(244,112,90,0.06)' }}>
            <ExternalLink className="w-4 h-4" />
            Ver perfil público
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-1 mb-6 gap-1 overflow-x-auto scrollbar-hide"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap"
            style={{
              background: activeTab === tab.id ? ACC : 'transparent',
              color: activeTab === tab.id ? '#0F1115' : 'rgba(248,249,250,0.5)',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {!restaurant ? (
        <div className="text-center text-gray-500 py-12">No se encontró el restaurante.</div>
      ) : (
        <>
          {activeTab === 'general'   && <TabGeneral   restaurantId={restaurant.id} slug={restaurant.slug} />}
          {activeTab === 'blocks'    && (
            <HubBlockEditor
              restaurantId={restaurant.id}
              onEditLegacyBlock={(blockType: BlockType) => {
                // Redirigir al tab del editor legacy correspondiente
                const legacyTabMap: Partial<Record<BlockType, Tab>> = {
                  links:            'links',
                  stories:          'novedad',
                  featured:         'destacado',
                  featured_products:'destacado',
                  gallery:          'galeria',
                  reviews:          'resenas',
                }
                const dest = legacyTabMap[blockType]
                if (dest) setActiveTab(dest)
              }}
            />
          )}
          {activeTab === 'links'     && <TabLinks     restaurantId={restaurant.id} />}
          {activeTab === 'novedad'   && <TabNovedad   restaurantId={restaurant.id} />}
          {activeTab === 'destacado' && <TabDestacado restaurantId={restaurant.id} />}
          {activeTab === 'galeria'   && <TabGaleria   restaurantId={restaurant.id} />}
          {activeTab === 'resenas'   && <TabResenas   restaurantId={restaurant.id} />}
          {activeTab === 'analytics' && <TabAnalytics restaurantId={restaurant.id} />}
          {activeTab === 'preview'   && <TabPreview   slug={restaurant.slug} />}
        </>
      )}
    </div>
  )
}
