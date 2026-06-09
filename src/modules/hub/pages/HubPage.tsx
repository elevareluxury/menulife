import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Globe, Plus, Trash2, Eye, EyeOff, ExternalLink,
  ImageIcon, X, Star, GripVertical, Save, Download, Link2,
  BarChart2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
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
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import toast from 'react-hot-toast'

const db = supabase as any
const ACC = '#F59E0B'

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

type Tab = 'general' | 'links' | 'novedad' | 'destacado' | 'galeria' | 'resenas' | 'analytics' | 'preview'

const TABS: { id: Tab; label: string }[] = [
  { id: 'general',   label: 'General'      },
  { id: 'links',     label: 'Links'        },
  { id: 'novedad',   label: 'Novedad'      },
  { id: 'destacado', label: 'Destacado'    },
  { id: 'galeria',   label: 'Galería'      },
  { id: 'resenas',   label: 'Reseñas'      },
  { id: 'analytics', label: 'Analytics'   },
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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0F1115', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: ACC }}>{sub}</p>}
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
          className="w-full h-24 rounded-xl border-dashed border-2 border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-amber-400 hover:border-amber-500/50 transition-all">
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
  const qrRef = useRef<HTMLDivElement>(null)
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
    hub_cover_url: '',
    hub_category: '',
    hub_main_cta_text: '',
    hub_main_cta_url: '',
    google_rating: '',
    google_review_count: '',
    google_review_url: '',
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    db.from('restaurants').select(
      'hub_about,hub_about_en,hub_category_tags,hub_category_tags_en,hub_enabled,hub_bottom_nav,hub_cover_url,hub_category,hub_main_cta_text,hub_main_cta_url,google_rating,google_review_count,google_review_url'
    ).eq('id', restaurantId).maybeSingle()
      .then(({ data }: { data: Record<string, unknown> | null }) => {
        if (data) {
          setForm({
            hub_about: (data.hub_about as string) ?? '',
            hub_about_en: (data.hub_about_en as string) ?? '',
            hub_category_tags: (data.hub_category_tags as string[]) ?? [],
            hub_category_tags_en: (data.hub_category_tags_en as string[]) ?? [],
            hub_enabled: data.hub_enabled !== false,
            hub_bottom_nav: data.hub_bottom_nav !== false,
            hub_cover_url: (data.hub_cover_url as string) ?? '',
            hub_category: (data.hub_category as string) ?? '',
            hub_main_cta_text: (data.hub_main_cta_text as string) ?? '',
            hub_main_cta_url: (data.hub_main_cta_url as string) ?? '',
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
      toast.success('Configuración guardada')
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
                      style={{ background: 'rgba(245,158,11,0.15)', color: ACC }}>
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

      <button type="button" onClick={handleSave} disabled={saving || uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: ACC }}>
        <Save className="w-4 h-4" />
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>

      {/* QR Section */}
      {slug && (
        <Card className="space-y-4">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Tu QR del Hub</h3>
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
              style={{ background: 'rgba(245,158,11,0.12)', color: ACC, border: `1px solid rgba(245,158,11,0.25)` }}>
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
  link, onToggle, onDelete,
}: {
  link: HubLink
  onToggle: (id: string, val: boolean) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id })
  const lt = LINK_TYPES.find(t => t.type === link.type)

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
      {link.image_url ? (
        <img src={link.image_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <span className="text-lg flex-shrink-0 w-7 text-center">{link.icon ?? lt?.icon ?? '🔗'}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{link.label}</p>
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

interface LinkFormState { type: string; label: string; url: string; image_url: string }

function getLabelPlaceholder(type: string): string {
  const map: Record<string, string> = {
    whatsapp: 'Ej. Contactanos por WhatsApp',
    instagram: 'Ej. Seguinos en Instagram',
    tiktok: 'Ej. Mirá nuestros videos',
    facebook: 'Ej. Página de Facebook',
    youtube: 'Ej. Canal de YouTube',
    linkedin: 'Ej. Perfil de LinkedIn',
    maps: 'Ej. Cómo llegar',
    website: 'Ej. Nuestro sitio web',
    email: 'Ej. Escribinos por email',
    phone: 'Ej. Llamanos',
    custom: 'Ej. Más información',
  }
  return map[type] ?? 'Ej. Descripción del link'
}

function AddLinkModal({ restaurantId, count, onClose, onSaved }: {
  restaurantId: string; count: number
  onClose: () => void; onSaved: () => void
}) {
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [form, setForm] = useState<LinkFormState>({ type: '', label: '', url: '', image_url: '' })
  const [saving, setSaving] = useState(false)
  const { uploadImage, uploading: uploadingImg } = useImageUpload()
  const imgInputRef = useRef<HTMLInputElement>(null)

  const selectedType = LINK_TYPES.find(t => t.type === form.type)

  async function handleSave() {
    if (!form.type || !form.label.trim() || !form.url.trim()) {
      toast.error('Completá todos los campos')
      return
    }
    setSaving(true)
    try {
      const { error } = await db.from('hub_links').insert({
        restaurant_id: restaurantId,
        type: form.type,
        label: form.label.trim(),
        url: form.url.trim(),
        icon: selectedType?.icon ?? '🔗',
        image_url: form.image_url || null,
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
          <div className="flex items-center gap-2">
            {step === 'form' && (
              <button type="button" onClick={() => setStep('type')} className="text-gray-400 hover:text-white transition-all">
                ←
              </button>
            )}
            <h3 className="text-white font-semibold">
              {step === 'type' ? 'Elegir tipo de link' : `Agregar ${selectedType?.label}`}
            </h3>
          </div>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5">
          {step === 'type' ? (
            <div className="grid grid-cols-3 gap-2">
              {LINK_TYPES.map(lt => (
                <button
                  key={lt.type}
                  type="button"
                  onClick={() => {
                    setForm(p => ({ ...p, type: lt.type, label: '' }))
                    setStep('form')
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid rgba(255,255,255,0.08)`,
                  }}
                >
                  <span className="text-2xl">{lt.icon}</span>
                  <span className="text-xs text-gray-300 font-medium text-center leading-tight">{lt.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Optional photo */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Foto del link (opcional)</label>
                <div className="flex items-center gap-3">
                  {form.image_url ? (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img src={form.image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      <button type="button" onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#EF4444' }}>
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => imgInputRef.current?.click()} disabled={uploadingImg}
                      className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center flex-shrink-0 hover:border-amber-500/50 transition-all">
                      {uploadingImg ? (
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACC, borderTopColor: 'transparent' }} />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  )}
                  <p className="text-xs text-gray-600">Foto redonda que reemplaza el ícono del link</p>
                </div>
                <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                  onChange={async e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const r = await uploadImage(f, 'hub-assets')
                    if (r.success) setForm(p => ({ ...p, image_url: r.url }))
                    e.target.value = ''
                  }} />
              </div>

              <Field label="Nombre del link *" value={form.label}
                onChange={v => setForm(p => ({ ...p, label: v }))}
                placeholder={getLabelPlaceholder(form.type)} />
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">URL *</label>
                <input
                  className={inputCls}
                  value={form.url}
                  onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder={selectedType?.placeholder}
                />
                {selectedType && (
                  <p className="text-xs text-gray-600 mt-1">Ej: {selectedType.placeholder}</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-gray-700 hover:border-gray-500 transition-all">
                  Cancelar
                </button>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ background: ACC }}>
                  {saving ? 'Guardando…' : 'Guardar link'}
                </button>
              </div>
            </div>
          )}
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
                <SortableLinkItem key={link.id} link={link} onToggle={handleToggle} onDelete={handleDelete} />
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
            <p className="text-sm text-white font-medium">Visible en Hub</p>
            <p className="text-xs text-gray-500">Muestra este banner en el Hub Público</p>
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
            <p className="text-sm text-white font-medium">Visible en Hub</p>
            <p className="text-xs text-gray-500">Muestra este destacado en el Hub Público</p>
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
            className="w-full h-32 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-amber-400 transition-all">
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

interface AnalyticsEvent { event_type: string; link_id: string | null; created_at: string; user_agent: string | null }
interface LinkLabel { id: string; label: string }

function TabAnalytics({ restaurantId }: { restaurantId: string }) {
  const [loading, setLoading] = useState(true)
  const [profileViews, setProfileViews] = useState(0)
  const [linkClicks, setLinkClicks] = useState(0)
  const [topLink, setTopLink] = useState<string | null>(null)
  const [uniqueVisitors, setUniqueVisitors] = useState(0)
  const [chartData, setChartData] = useState<{ day: string; visitas: number }[]>([])

  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [{ data: events }, { data: linkRows }] = await Promise.all([
        db.from('hub_analytics')
          .select('event_type, link_id, created_at, user_agent')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        db.from('hub_links').select('id, label').eq('restaurant_id', restaurantId),
      ])

      const evts = (events ?? []) as AnalyticsEvent[]
      const links = (linkRows ?? []) as LinkLabel[]

      const views = evts.filter(e => e.event_type === 'profile_view').length
      const clicks = evts.filter(e => e.event_type === 'link_click').length
      setProfileViews(views)
      setLinkClicks(clicks)

      // Unique visitors: unique user_agent+date combos
      const uniqSet = new Set(evts.map(e => `${(e.user_agent ?? '').slice(0, 30)}_${e.created_at?.slice(0, 10)}`))
      setUniqueVisitors(uniqSet.size)

      // Top link
      const linkCounts: Record<string, number> = {}
      evts.filter(e => e.event_type === 'link_click' && e.link_id).forEach(e => {
        linkCounts[e.link_id!] = (linkCounts[e.link_id!] ?? 0) + 1
      })
      const topId = Object.entries(linkCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      const topLabel = links.find(l => l.id === topId)?.label ?? null
      setTopLink(topLabel)

      // Chart: last 14 days profile views
      const chart: { day: string; visitas: number }[] = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        chart.push({
          day: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
          visitas: evts.filter(e => e.event_type === 'profile_view' && e.created_at?.startsWith(key)).length,
        })
      }
      setChartData(chart)
      setLoading(false)
    }
    load()
  }, [restaurantId])

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400">Últimos 30 días</p>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Visitas al perfil" value={profileViews} sub="profile views" />
        <StatCard label="Clicks en links" value={linkClicks} sub="link clicks" />
        <StatCard label="Link más clickeado" value={topLink ?? '—'} />
        <StatCard label="Visitantes únicos" value={uniqueVisitors} sub="aprox." />
      </div>

      <Card className="space-y-3">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
          Visitas últimos 14 días
        </h3>
        {chartData.every(d => d.visitas === 0) ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <BarChart2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#374151' }} />
              <p className="text-sm text-gray-500">Sin datos aún</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: -28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9CA3AF' }}
                itemStyle={{ color: ACC }}
                formatter={(v) => [v, 'visitas']}
              />
              <Line type="monotone" dataKey="visitas" stroke={ACC} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: ACC }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}

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
        <iframe src={`/${slug}`} className="w-full h-full" title="Hub preview" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
              <a href={`/${restaurant.slug}`} target="_blank" rel="noreferrer"
                className="text-xs font-mono px-2 py-0.5 rounded-md inline-block mt-0.5 hover:opacity-80 transition-all"
                style={{ background: 'rgba(245,158,11,0.12)', color: ACC }}>
                menulife.digital/{restaurant.slug}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
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
          {restaurant?.slug && (
            <button type="button" onClick={() => window.open(`/${restaurant.slug}`, '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(245,158,11,0.15)', color: ACC }}>
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Hub
            </button>
          )}
        </div>
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
