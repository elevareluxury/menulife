import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  ChevronLeft, Store, MapPin, Clock, Share2, Palette,
  Globe, MessageCircle, X, Upload,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useImageUpload } from '@/modules/menu/hooks/useImageUpload'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { ACCEPTED_IMAGE_TYPES } from '@/lib/constants'
import toast from 'react-hot-toast'
import type { Restaurant } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'general' | 'location' | 'hours' | 'social' | 'appearance'
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

interface DaySchedule {
  open: boolean
  from: string | null
  to: string | null
}

type BusinessHours = Record<DayKey, DaySchedule>

interface SocialLinks {
  instagram: string
  facebook: string
  tiktok: string
  whatsapp: string
  google_maps: string
}

interface SettingsForm {
  logo_url: string
  name: string
  description: string
  phone: string
  email: string
  website: string
  country: string
  province: string
  city: string
  address: string
  address_extra: string
  postal_code: string
  directions: string
  schedule: BusinessHours
  social_links: SocialLinks
  menu_accent_color: string
  menu_card_style: 'classic' | 'compact' | 'text_only'
  show_prices: boolean
  show_descriptions: boolean
  show_calories: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SCHEDULE: BusinessHours = {
  monday:    { open: true,  from: '09:00', to: '23:00' },
  tuesday:   { open: true,  from: '09:00', to: '23:00' },
  wednesday: { open: true,  from: '09:00', to: '23:00' },
  thursday:  { open: true,  from: '09:00', to: '23:00' },
  friday:    { open: true,  from: '09:00', to: '02:00' },
  saturday:  { open: true,  from: '10:00', to: '03:00' },
  sunday:    { open: false, from: null,    to: null     },
}

const DEFAULT_SOCIAL: SocialLinks = {
  instagram: '', facebook: '', tiktok: '', whatsapp: '', google_maps: '',
}

const DEFAULT_FORM: SettingsForm = {
  logo_url: '', name: '', description: '', phone: '', email: '', website: '',
  country: 'Argentina', province: '', city: '', address: '',
  address_extra: '', postal_code: '', directions: '',
  schedule: DEFAULT_SCHEDULE,
  social_links: DEFAULT_SOCIAL,
  menu_accent_color: '#FF6B7A',
  menu_card_style: 'classic',
  show_prices: true,
  show_descriptions: true,
  show_calories: false,
}

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
]

const SECTIONS: Array<{ id: Section; label: string; icon: React.ReactNode }> = [
  { id: 'general',    label: 'Información general', icon: <Store    className="w-4 h-4" /> },
  { id: 'location',   label: 'Ubicación',           icon: <MapPin   className="w-4 h-4" /> },
  { id: 'hours',      label: 'Horarios',             icon: <Clock    className="w-4 h-4" /> },
  { id: 'social',     label: 'Redes sociales',       icon: <Share2   className="w-4 h-4" /> },
  { id: 'appearance', label: 'Apariencia del menú',  icon: <Palette  className="w-4 h-4" /> },
]

const COUNTRIES = [
  'Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Cuba','Ecuador',
  'El Salvador','España','Estados Unidos','Guatemala','Honduras','México',
  'Nicaragua','Panamá','Paraguay','Perú','Puerto Rico',
  'República Dominicana','Uruguay','Venezuela','Otro',
].map(c => ({ value: c, label: c }))

const ARGENTINA_PROVINCES = [
  'Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes',
  'Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones',
  'Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe',
  'Santiago del Estero','Tierra del Fuego','Tucumán',
].map(p => ({ value: p, label: p }))

const ACCENT_COLORS = [
  { hex: '#FF6B7A', name: 'Coral'     },
  { hex: '#10B981', name: 'Esmeralda' },
  { hex: '#3B82F6', name: 'Azul'      },
  { hex: '#8B5CF6', name: 'Violeta'   },
  { hex: '#F59E0B', name: 'Ámbar'     },
  { hex: '#EC4899', name: 'Rosa'      },
  { hex: '#14B8A6', name: 'Teal'      },
  { hex: '#F97316', name: 'Naranja'   },
  { hex: '#1E293B', name: 'Oscuro'    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSchedule(raw: unknown): BusinessHours {
  if (raw && typeof raw === 'object') {
    return { ...DEFAULT_SCHEDULE, ...(raw as BusinessHours) }
  }
  return DEFAULT_SCHEDULE
}

function parseSocialLinks(raw: unknown): SocialLinks {
  if (raw && typeof raw === 'object') {
    return { ...DEFAULT_SOCIAL, ...(raw as SocialLinks) }
  }
  return DEFAULT_SOCIAL
}

function restaurantToForm(r: Restaurant): SettingsForm {
  return {
    logo_url:       r.logo_url       ?? '',
    name:           r.name           ?? '',
    description:    r.description    ?? '',
    phone:          r.phone          ?? '',
    email:          r.email          ?? '',
    website:        r.website        ?? '',
    country:        r.country        ?? 'Argentina',
    province:       r.province       ?? '',
    city:           r.city           ?? '',
    address:        r.address        ?? '',
    address_extra:  r.address_extra  ?? '',
    postal_code:    r.postal_code    ?? '',
    directions:     r.directions     ?? '',
    schedule:       parseSchedule(r.schedule),
    social_links:   parseSocialLinks(r.social_links),
    menu_accent_color: r.menu_accent_color ?? '#FF6B7A',
    menu_card_style:   (r.menu_card_style as SettingsForm['menu_card_style']) ?? 'classic',
    show_prices:        r.show_prices       ?? true,
    show_descriptions:  r.show_descriptions ?? true,
    show_calories:      r.show_calories     ?? false,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-0.5">{title}</h2>
      <p className="text-sm text-gray-500 mb-5">{description}</p>
      {children}
    </Card>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1">
      <label className="block text-sm font-medium text-gray-700">{children}</label>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function SocialInput({ icon, prefix, value, placeholder, onChange }: {
  icon: React.ReactNode
  prefix: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-shadow">
      <div className="flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 text-gray-400 text-xs whitespace-nowrap select-none">
        {icon}
        <span>{prefix}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 text-sm outline-none bg-white"
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BusinessSettings() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { uploadImage, uploading: uploadingLogo } = useImageUpload()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('general')
  const [formData, setFormData] = useState<SettingsForm>(DEFAULT_FORM)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')

  // Fetch restaurant
  useEffect(() => {
    if (!user) return
    supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setRestaurant(data as Restaurant)
          setFormData(restaurantToForm(data as Restaurant))
          if (data.logo_url) setLogoPreview(data.logo_url)
        }
        setLoading(false)
      })
  }, [user])

  // Revoke blob URL on unmount / change
  useEffect(() => {
    return () => {
      if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  // Helpers to update form fields
  const setField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setFormData(prev => ({ ...prev, [key]: value }))

  const updateDay = (day: DayKey, field: keyof DaySchedule, value: boolean | string | null) =>
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value },
      },
    }))

  const updateSocial = (key: keyof SocialLinks, value: string) =>
    setFormData(prev => ({
      ...prev,
      social_links: { ...prev.social_links, [key]: value },
    }))

  const copyHoursToAll = () => {
    const firstOpen = DAYS.find(d => formData.schedule[d.key].open)
    if (!firstOpen) return
    const source = formData.schedule[firstOpen.key]
    const newSchedule = { ...formData.schedule }
    DAYS.forEach(d => { newSchedule[d.key] = { ...source } })
    setField('schedule', newSchedule)
    toast.success('Horario copiado a todos los días')
  }

  // Logo dropzone
  const onDrop = useCallback((accepted: File[], rejected: unknown[]) => {
    if ((rejected as unknown[]).length > 0) {
      toast.error('Imagen inválida. Usá JPG, PNG o WebP de máx. 2MB')
      return
    }
    if (accepted[0]) {
      if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
      setLogoFile(accepted[0])
      setLogoPreview(URL.createObjectURL(accepted[0]))
    }
  }, [logoPreview])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: 2 * 1024 * 1024,
    multiple: false,
  })

  const removeLogo = () => {
    if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    setLogoFile(null)
    setLogoPreview('')
    setField('logo_url', '')
  }

  // Save handler
  const handleSave = async () => {
    if (!restaurant) return
    if (!formData.name.trim()) {
      toast.error('El nombre del negocio es requerido')
      return
    }

    setSaving(true)
    try {
      let finalLogoUrl: string | null = formData.logo_url || null
      if (logoFile) {
        const result = await uploadImage(logoFile, 'restaurant-logos')
        if (!result.success) { setSaving(false); return }
        finalLogoUrl = result.url
        setField('logo_url', result.url)
        setLogoFile(null)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('restaurants')
        .update({
          logo_url:          finalLogoUrl,
          name:              formData.name.trim(),
          description:       formData.description.trim() || null,
          phone:             formData.phone.trim() || null,
          email:             formData.email.trim() || null,
          website:           formData.website.trim() || null,
          country:           formData.country || null,
          province:          formData.province || null,
          city:              formData.city.trim() || null,
          address:           formData.address.trim() || null,
          address_extra:     formData.address_extra.trim() || null,
          postal_code:       formData.postal_code.trim() || null,
          directions:        formData.directions.trim() || null,
          schedule:          formData.schedule,
          social_links:      formData.social_links,
          menu_accent_color: formData.menu_accent_color,
          menu_card_style:   formData.menu_card_style,
          show_prices:       formData.show_prices,
          show_descriptions: formData.show_descriptions,
          show_calories:     formData.show_calories,
        })
        .eq('id', restaurant.id)

      if (error) throw error
      toast.success('Cambios guardados correctamente')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (restaurant) {
      setFormData(restaurantToForm(restaurant))
      setLogoFile(null)
      if (!restaurant.logo_url && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
      setLogoPreview(restaurant.logo_url ?? '')
    }
    toast('Cambios descartados', { icon: '↩️' })
  }

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  // ─── Section content ────────────────────────────────────────────────────────

  const renderGeneral = () => (
    <div className="space-y-5">
      {/* Logo */}
      <SectionCard title="Logo del negocio" description="Aparece en el menú QR que ven tus clientes.">
        <div className="flex gap-5 items-start">
          {/* Preview */}
          <div className="relative flex-shrink-0">
            {logoPreview ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200">
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                <button
                  onClick={removeLogo}
                  className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50"
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-300">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
            )}
          </div>

          {/* Dropzone */}
          <div className="flex-1">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50',
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">
                {isDragActive ? 'Soltá aquí' : 'Subir logo'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP · Máx. 2MB</p>
            </div>
            {uploadingLogo && (
              <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600">
                <Spinner size="sm" /> Subiendo...
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Info fields */}
      <SectionCard title="Datos del local" description="Información básica de tu negocio.">
        <div className="space-y-4">
          <div>
            <div className="flex items-end justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Nombre del negocio *</label>
              <span className="text-xs text-gray-400">{formData.name.length}/60</span>
            </div>
            <Input
              value={formData.name}
              onChange={e => setField('name', e.target.value.slice(0, 60))}
              placeholder="Ej: Forest Café"
              maxLength={60}
            />
          </div>

          <div>
            <div className="flex items-end justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Descripción</label>
              <span className="text-xs text-gray-400">{formData.description.length}/280</span>
            </div>
            <Textarea
              value={formData.description}
              onChange={e => setField('description', e.target.value.slice(0, 280))}
              placeholder="Contale a tus clientes qué hace especial a tu negocio..."
              rows={3}
              maxLength={280}
            />
            <p className="text-xs text-gray-400 mt-1">Aparece en el menú que ven tus clientes.</p>
          </div>

          <Input
            label="Teléfono / WhatsApp"
            type="tel"
            value={formData.phone}
            onChange={e => setField('phone', e.target.value)}
            placeholder="+54 9 11 1234-5678"
          />
          <p className="text-xs text-gray-400 -mt-2">Los clientes podrán contactarte desde el menú.</p>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={e => setField('email', e.target.value)}
            placeholder="contacto@forestcafe.com"
          />

          <Input
            label="Sitio web"
            type="url"
            value={formData.website}
            onChange={e => setField('website', e.target.value)}
            placeholder="https://www.forestcafe.com"
          />
        </div>
      </SectionCard>
    </div>
  )

  const renderLocation = () => (
    <SectionCard title="Ubicación" description="Ayudá a tus clientes a encontrarte.">
      <div className="space-y-4">
        <Select
          label="País"
          value={formData.country}
          onChange={e => setField('country', e.target.value)}
          options={COUNTRIES}
        />

        {formData.country === 'Argentina' ? (
          <Select
            label="Provincia"
            value={formData.province}
            onChange={e => setField('province', e.target.value)}
            options={[{ value: '', label: 'Seleccioná una provincia' }, ...ARGENTINA_PROVINCES]}
          />
        ) : (
          <Input
            label="Provincia / Estado"
            value={formData.province}
            onChange={e => setField('province', e.target.value)}
            placeholder="Ej: Madrid"
          />
        )}

        <Input
          label="Ciudad"
          value={formData.city}
          onChange={e => setField('city', e.target.value)}
          placeholder="Buenos Aires"
        />

        <Input
          label="Dirección"
          value={formData.address}
          onChange={e => setField('address', e.target.value)}
          placeholder="Av. Corrientes 1234"
        />

        <Input
          label="Piso / Depto (opcional)"
          value={formData.address_extra}
          onChange={e => setField('address_extra', e.target.value)}
          placeholder="Piso 2, Of. B"
        />

        <Input
          label="Código postal"
          value={formData.postal_code}
          onChange={e => setField('postal_code', e.target.value)}
          placeholder="1043"
        />

        <div>
          <Textarea
            label="Cómo llegar"
            value={formData.directions}
            onChange={e => setField('directions', e.target.value)}
            placeholder="Entre Callao y Rodríguez Peña, frente al Banco Nación"
            rows={2}
          />
          <p className="text-xs text-gray-400 mt-1">Aparece en el menú para ayudar a los clientes.</p>
        </div>
      </div>
    </SectionCard>
  )

  const renderHours = () => (
    <SectionCard title="Horarios" description="Configurá los días y horarios de atención.">
      <div className="mb-4 flex justify-end">
        <button
          onClick={copyHoursToAll}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Copiar horario del primer día a todos
        </button>
      </div>

      <div className="space-y-1">
        {DAYS.map(day => {
          const d = formData.schedule[day.key]
          return (
            <div
              key={day.key}
              className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0"
            >
              <span className="w-[90px] text-sm font-medium text-gray-700 flex-shrink-0">
                {day.label}
              </span>

              <Toggle
                checked={d.open}
                onChange={e => {
                  updateDay(day.key, 'open', e.target.checked)
                  if (!e.target.checked) {
                    updateDay(day.key, 'from', null)
                    updateDay(day.key, 'to', null)
                  } else {
                    updateDay(day.key, 'from', '09:00')
                    updateDay(day.key, 'to', '23:00')
                  }
                }}
              />

              {d.open ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="time"
                    value={d.from ?? '09:00'}
                    onChange={e => updateDay(day.key, 'from', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-gray-400 flex-shrink-0">→</span>
                  <input
                    type="time"
                    value={d.to ?? '23:00'}
                    onChange={e => updateDay(day.key, 'to', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Cerrado</span>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Si el cierre es menor a la apertura, se asume que es el día siguiente (ej: 22:00 → 03:00).
      </p>
    </SectionCard>
  )

  const renderSocial = () => (
    <SectionCard title="Redes sociales" description="Links que aparecerán en tu menú QR. Todos opcionales.">
      <div className="space-y-4">
        <div>
          <FieldLabel>Instagram</FieldLabel>
          <SocialInput
            icon={<span className="text-xs font-bold text-[#E1306C]">IG</span>}
            prefix="instagram.com/"
            value={formData.social_links.instagram}
            placeholder="forestcafe"
            onChange={v => updateSocial('instagram', v.replace('@', ''))}
          />
        </div>

        <div>
          <FieldLabel>Facebook</FieldLabel>
          <SocialInput
            icon={<span className="text-xs font-bold text-[#1877F2]">fb</span>}
            prefix="facebook.com/"
            value={formData.social_links.facebook}
            placeholder="forestcafe"
            onChange={v => updateSocial('facebook', v)}
          />
        </div>

        <div>
          <FieldLabel>TikTok</FieldLabel>
          <SocialInput
            icon={<span className="text-xs font-bold text-gray-700">TT</span>}
            prefix="tiktok.com/@"
            value={formData.social_links.tiktok}
            placeholder="forestcafe"
            onChange={v => updateSocial('tiktok', v.replace('@', ''))}
          />
        </div>

        <div>
          <FieldLabel hint="Los clientes podrán escribirte directo desde el menú.">
            WhatsApp de atención
          </FieldLabel>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent">
            <div className="flex items-center px-3 bg-gray-50 border-r border-gray-200">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
            </div>
            <input
              type="tel"
              value={formData.social_links.whatsapp}
              onChange={e => updateSocial('whatsapp', e.target.value)}
              placeholder="+54 9 11 1234-5678"
              className="flex-1 px-3 py-2 text-sm outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <FieldLabel hint="Pegá el link de tu negocio en Google Maps.">
            Google Maps
          </FieldLabel>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent">
            <div className="flex items-center px-3 bg-gray-50 border-r border-gray-200">
              <Globe className="w-4 h-4 text-[#4285F4]" />
            </div>
            <input
              type="url"
              value={formData.social_links.google_maps}
              onChange={e => updateSocial('google_maps', e.target.value)}
              placeholder="https://maps.google.com/..."
              className="flex-1 px-3 py-2 text-sm outline-none bg-white"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  )

  const renderAppearance = () => (
    <div className="space-y-5">
      {/* Accent color */}
      <SectionCard title="Color de acento del menú" description="Define el color principal que ven tus clientes.">
        <div className="flex flex-wrap gap-3 mb-4">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.hex}
              title={c.name}
              onClick={() => setField('menu_accent_color', c.hex)}
              className={cn(
                'w-10 h-10 rounded-full transition-all duration-150',
                formData.menu_accent_color === c.hex
                  ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                  : 'hover:scale-105 opacity-90 hover:opacity-100'
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0"
            style={{ backgroundColor: formData.menu_accent_color }}
          />
          <input
            type="text"
            value={formData.menu_accent_color}
            onChange={e => {
              const v = e.target.value
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setField('menu_accent_color', v)
            }}
            placeholder="#FF6B7A"
            className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-500">Color personalizado (hex)</span>
        </div>
      </SectionCard>

      {/* Card style */}
      <SectionCard title="Estilo de tarjetas de productos" description="Cómo se muestran los ítems del menú.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { value: 'classic',   label: 'Clásico',    desc: 'Imagen arriba, texto abajo' },
            { value: 'compact',   label: 'Compacto',   desc: 'Imagen izquierda, texto derecha' },
            { value: 'text_only', label: 'Sin imagen', desc: 'Solo texto y precio' },
          ] as const).map(style => (
            <button
              key={style.value}
              onClick={() => setField('menu_card_style', style.value)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-colors',
                formData.menu_card_style === style.value
                  ? 'border-[#FF6B7A] bg-[#FF6B7A]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <p className={cn(
                'text-sm font-medium mb-0.5',
                formData.menu_card_style === style.value ? 'text-[#FF6B7A]' : 'text-gray-800'
              )}>
                {style.label}
              </p>
              <p className="text-xs text-gray-500">{style.desc}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Visibility toggles */}
      <SectionCard title="Vista del menú" description="Controlá qué información ven los clientes.">
        <div className="space-y-4">
          {([
            { key: 'show_prices',       label: 'Mostrar precios' },
            { key: 'show_descriptions', label: 'Mostrar descripciones' },
            { key: 'show_calories',     label: 'Mostrar calorías (si están cargadas)' },
          ] as const).map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <Toggle
                checked={formData[item.key]}
                onChange={e => setField(item.key, e.target.checked)}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )

  const sectionContent: Record<Section, React.ReactNode> = {
    general:    renderGeneral(),
    location:   renderLocation(),
    hours:      renderHours(),
    social:     renderSocial(),
    appearance: renderAppearance(),
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-4">
      {/* Page header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mt-0.5 p-2 rounded-xl hover:bg-surface-4 transition-colors text-ink-3 hover:text-ink-1 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-ink-1">Configuración del negocio</h1>
          <p className="text-sm text-ink-3 mt-0.5">Administrá la información de tu local</p>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-6 lg:items-start">

        {/* ── Mobile tabs ── */}
        <div className="flex gap-2 overflow-x-auto pb-3 lg:hidden">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors',
                activeSection === s.id
                  ? 'bg-[#FF6B7A] text-white'
                  : 'bg-surface-3 text-ink-2 hover:bg-surface-4'
              )}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Desktop sidebar ── */}
        <nav className="hidden lg:block space-y-1 sticky top-4">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors',
                activeSection === s.id
                  ? 'bg-[#FF6B7A]/10 text-[#FF6B7A]'
                  : 'text-ink-2 hover:bg-surface-3 hover:text-ink-1'
              )}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>

        {/* ── Section content ── */}
        <div>
          {sectionContent[activeSection]}

          {/* Action buttons */}
          <div className="flex gap-3 mt-5">
            <Button
              onClick={handleSave}
              isLoading={saving || uploadingLogo}
              className="bg-[#FF6B7A] hover:bg-[#e85e6b] text-white focus:ring-[#FF6B7A]"
            >
              Guardar cambios
            </Button>
            <Button variant="ghost" onClick={handleCancel} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sticky save bar */}
      <div
        className="lg:hidden fixed left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex gap-3"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        <Button variant="ghost" onClick={handleCancel} disabled={saving} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          isLoading={saving || uploadingLogo}
          className="flex-1 bg-[#FF6B7A] hover:bg-[#e85e6b] text-white focus:ring-[#FF6B7A]"
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
