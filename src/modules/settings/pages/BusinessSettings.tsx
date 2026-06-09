import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  ChevronLeft, Store, MapPin, Clock, Share2, Palette,
  Globe, MessageCircle, X, Upload, Image as ImageIcon, Trash2, Truck, Plus, CalendarDays, Plug, Star,
  Users, History, CreditCard, UtensilsCrossed, ShoppingBag, Warehouse,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { useImageUpload } from '@/modules/menu/hooks/useImageUpload'
import { useLanguage } from '@/hooks/useLanguage'
import { TeamTab } from '@/modules/admin/components/TeamTab'
import { AuditTab } from '@/modules/admin/components/AuditTab'
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

// ─── Column safety ────────────────────────────────────────────────────────────
const VALID_COLUMNS = new Set([
  'id','user_id','name','slug','description','phone','email','website',
  'address','address_extra','city','province','country','postal_code','directions',
  'logo_url','cover_image_url','menu_accent_color','menu_card_style',
  'show_prices','show_descriptions','show_calories',
  'schedule','business_hours','social_links',
  'delivery_enabled','delivery_time_estimate','delivery_min_order',
  'delivery_fee_type','delivery_fee_value','delivery_zones',
  'takeaway_enabled','takeaway_time_estimate',
  'default_language','allow_language_switch',
  'reservations_enabled','reservations_collect_guests','reservations_advance_days',
  'reservations_min_hours','reservations_max_party','reservations_time_slots','reservations_message',
  'onboarding_completed','is_active','plan','subscription_status',
  'trial_ends_at','features','created_at','updated_at',
  'tax_enabled','tax_percentage','suggested_tip_percentages','enabled_payment_methods','daily_sales_goal',
  'business_type','banner_url',
  'short_description','short_description_en','setup_completed','setup_step',
  'hub_about','hub_about_en','hub_category_tags','hub_category_tags_en',
  'hub_enabled','hub_bottom_nav','google_rating','google_review_count','google_review_url',
])
function sanitize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([k]) => VALID_COLUMNS.has(k)))
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'general' | 'location' | 'hours' | 'social' | 'appearance' | 'delivery' | 'language' | 'reservations' | 'integrations' | 'pos' | 'team' | 'audit'

interface DeliveryZone {
  name: string
  max_km: number
  fee: number
}

interface DeliveryForm {
  delivery_enabled: boolean
  delivery_time_estimate: number
  delivery_min_order: number
  delivery_fee_type: 'fixed' | 'percentage' | 'zone'
  delivery_fee_value: number
  delivery_zones: DeliveryZone[]
  takeaway_enabled: boolean
  takeaway_time_estimate: number
}
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
  google_review: string
}

interface SettingsForm {
  logo_url: string
  cover_image_url: string
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
  banner_url: string
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
  instagram: '', facebook: '', tiktok: '', whatsapp: '', google_maps: '', google_review: '',
}

const DEFAULT_FORM: SettingsForm = {
  logo_url: '', cover_image_url: '', name: '', description: '', phone: '', email: '', website: '',
  country: 'Argentina', province: '', city: '', address: '',
  address_extra: '', postal_code: '', directions: '',
  schedule: DEFAULT_SCHEDULE,
  social_links: DEFAULT_SOCIAL,
  menu_accent_color: '#FF6B7A',
  menu_card_style: 'classic',
  show_prices: true,
  show_descriptions: true,
  show_calories: false,
  banner_url: '',
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

// ─── Integrations data ────────────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    category: 'POS y Gestión',
    items: [
      { name: 'Fudo',       icon: '🟠', desc: 'Sincronizá productos y pedidos'     },
      { name: 'Madi Rest',  icon: '🟢', desc: 'Conectá facturación electrónica'    },
      { name: 'HivePOS',    icon: '🟣', desc: 'Sincronizá mesas y pedidos'         },
      { name: 'Tango Restô',icon: '🔵', desc: 'Integración contable'              },
    ],
  },
  {
    category: 'Delivery',
    items: [
      { name: 'Rappi',      icon: '🟠', desc: 'Recibí pedidos de Rappi'          },
      { name: 'PedidosYa',  icon: '🟡', desc: 'Recibí pedidos de PedidosYa'      },
      { name: 'Uber Eats',  icon: '⚫', desc: 'Recibí pedidos de Uber Eats'      },
    ],
  },
  {
    category: 'Pagos',
    items: [
      { name: 'MercadoPago',icon: '💙', desc: 'Cobros directos desde el menú'    },
      { name: 'Modo',       icon: '💚', desc: 'Pagos con QR desde la mesa'       },
    ],
  },
  {
    category: 'Comunicación',
    items: [
      { name: 'WhatsApp Business', icon: '💬', desc: 'Pedidos y reservas por WhatsApp' },
      { name: 'Instagram',         icon: '📸', desc: 'Publicá tu menú desde MenuLife'  },
    ],
  },
  {
    category: 'Facturación',
    items: [
      { name: 'AFIP',  icon: '🏛️', desc: 'Facturación electrónica automática'   },
      { name: 'Xubio', icon: '📊', desc: 'Sincronizá ventas con tu contador'    },
    ],
  },
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
    logo_url:         r.logo_url         ?? '',
    cover_image_url:  r.cover_image_url  ?? '',
    name:             r.name             ?? '',
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
    banner_url:         (r as unknown as Record<string, unknown>).banner_url as string ?? '',
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
        className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none bg-white placeholder:text-gray-400"
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BusinessSettings() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { uploadImage, uploading: uploadingLogo } = useImageUpload()
  const { t } = useTranslation()
  const { changeLanguage } = useLanguage()
  const setStoreBusinessType = useRestaurantStore(s => s.setBusinessType)

  const SECTIONS = useMemo<Array<{ id: Section; label: string; icon: React.ReactNode }>>(() => [
    { id: 'general',    label: t('dashboard.settings_general'),    icon: <Store    className="w-4 h-4" /> },
    { id: 'location',   label: t('dashboard.settings_location'),   icon: <MapPin   className="w-4 h-4" /> },
    { id: 'hours',      label: t('dashboard.settings_hours'),      icon: <Clock    className="w-4 h-4" /> },
    { id: 'social',     label: t('dashboard.settings_social'),     icon: <Share2   className="w-4 h-4" /> },
    { id: 'appearance', label: t('dashboard.settings_appearance'), icon: <Palette  className="w-4 h-4" /> },
    { id: 'delivery',   label: t('dashboard.settings_delivery'),   icon: <Truck    className="w-4 h-4" /> },
    { id: 'language',      label: t('dashboard.settings_language'),      icon: <Globe        className="w-4 h-4" /> },
    { id: 'reservations',  label: 'Reservas',                            icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'integrations',  label: 'Integraciones',                       icon: <Plug         className="w-4 h-4" /> },
    { id: 'pos',           label: 'POS',                                  icon: <CreditCard   className="w-4 h-4" /> },
    { id: 'team',          label: 'Equipo',                               icon: <Users        className="w-4 h-4" /> },
    { id: 'audit',         label: 'Historial',                            icon: <History      className="w-4 h-4" /> },
  ], [t])

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('general')
  const [businessType, setBusinessType] = useState<'gastronomy' | 'retail'>('gastronomy')
  const [confirmMode, setConfirmMode] = useState<'gastronomy' | 'retail' | null>(null)
  const [savingMode, setSavingMode] = useState(false)
  const [formData, setFormData] = useState<SettingsForm>(DEFAULT_FORM)
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>({
    delivery_enabled: false,
    delivery_time_estimate: 30,
    delivery_min_order: 0,
    delivery_fee_type: 'fixed',
    delivery_fee_value: 0,
    delivery_zones: [],
    takeaway_enabled: false,
    takeaway_time_estimate: 15,
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string>('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [isDraggingCover, setIsDraggingCover] = useState(false)

  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string>('')
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [isDraggingBanner, setIsDraggingBanner] = useState(false)

  // Language settings
  const [panelLang, setPanelLang] = useState<'es' | 'en'>(() =>
    (localStorage.getItem('menulife_lang') as 'es' | 'en') ?? 'es'
  )
  const [menuLang, setMenuLang] = useState<'ES' | 'EN'>('ES')
  const [allowSwitch, setAllowSwitch] = useState(true)

  // POS settings
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxPercentage, setTaxPercentage] = useState(21)
  const [suggestedTips, setSuggestedTips] = useState<number[]>([10, 15, 20])
  const [enabledPayments, setEnabledPayments] = useState<string[]>(['cash', 'debit_card', 'credit_card', 'transfer', 'mercadopago', 'other'])
  const [dailySalesGoal, setDailySalesGoal] = useState(50000)

  // Reservation settings
  const [resEnabled, setResEnabled] = useState(false)
  const [resCollectGuests, setResCollectGuests] = useState(false)
  const [resDays, setResDays] = useState(30)
  const [resMinHours, setResMinHours] = useState(2)
  const [resMaxParty, setResMaxParty] = useState(20)
  const [resTimeSlots, setResTimeSlots] = useState<string[]>(['20:00', '21:00', '22:00'])
  const [resMessage, setResMessage] = useState('¡Gracias por tu reserva! Te esperamos.')
  const [newSlot, setNewSlot] = useState('')

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
          const r = data as Restaurant
          setRestaurant(r)
          setFormData(restaurantToForm(r))
          if (data.logo_url) setLogoPreview(data.logo_url)
          if (data.cover_image_url) setCoverPreview(data.cover_image_url)
          const rAnyData = data as unknown as Record<string, unknown>
          if (rAnyData.banner_url) setBannerPreview(rAnyData.banner_url as string)
          // Load delivery config
          setDeliveryForm({
            delivery_enabled: r.delivery_enabled ?? false,
            delivery_time_estimate: r.delivery_time_estimate ?? 30,
            delivery_min_order: r.delivery_min_order ?? 0,
            delivery_fee_type: (r.delivery_fee_type as DeliveryForm['delivery_fee_type']) ?? 'fixed',
            delivery_fee_value: r.delivery_fee_value ?? 0,
            delivery_zones: Array.isArray(r.delivery_zones) ? (r.delivery_zones as DeliveryZone[]) : [],
            takeaway_enabled: r.takeaway_enabled ?? false,
            takeaway_time_estimate: r.takeaway_time_estimate ?? 15,
          })
          // Load language config
          const storedLang = localStorage.getItem('menulife_lang') as 'es' | 'en' | null
          setPanelLang(storedLang ?? (r.default_language === 'EN' ? 'en' : 'es'))
          setMenuLang(r.default_language ?? 'ES')
          setAllowSwitch(r.allow_language_switch ?? true)
          // Load POS config
          const rAny = r as unknown as Record<string, unknown>
          setTaxEnabled(Boolean(rAny.tax_enabled ?? false))
          setTaxPercentage(Number(rAny.tax_percentage ?? 21))
          setSuggestedTips(Array.isArray(rAny.suggested_tip_percentages) ? rAny.suggested_tip_percentages as number[] : [10, 15, 20])
          setEnabledPayments(Array.isArray(rAny.enabled_payment_methods) && (rAny.enabled_payment_methods as string[]).length > 0
            ? rAny.enabled_payment_methods as string[]
            : ['cash', 'debit_card', 'credit_card', 'transfer', 'mercadopago', 'other'])
          setDailySalesGoal(Number(rAny.daily_sales_goal ?? 50000))
          // Load reservation config
          setResEnabled(r.reservations_enabled ?? false)
          setResCollectGuests(r.reservations_collect_guests ?? false)
          setResDays(r.reservations_advance_days ?? 30)
          setResMinHours(r.reservations_min_hours ?? 2)
          setResMaxParty(r.reservations_max_party ?? 20)
          setResTimeSlots(r.reservations_time_slots ?? ['20:00', '21:00', '22:00'])
          setResMessage(r.reservations_message ?? '¡Gracias por tu reserva! Te esperamos.')
          // Load business type
          setBusinessType(r.business_type ?? 'gastronomy')
        }
        setLoading(false)
      })
  }, [user])

  // Revoke blob URLs on unmount / change
  useEffect(() => {
    return () => {
      if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  useEffect(() => {
    return () => {
      if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  useEffect(() => {
    return () => {
      if (bannerPreview.startsWith('blob:')) URL.revokeObjectURL(bannerPreview)
    }
  }, [bannerPreview])

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

  // Cover dropzone
  const onDropCover = useCallback((accepted: File[], rejected: unknown[]) => {
    if ((rejected as unknown[]).length > 0) {
      toast.error('Imagen inválida. Usá JPG, PNG o WebP de máx. 5MB')
      return
    }
    if (accepted[0]) {
      if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
      setCoverFile(accepted[0])
      setCoverPreview(URL.createObjectURL(accepted[0]))
    }
  }, [coverPreview])

  const {
    getRootProps: getCoverRootProps,
    getInputProps: getCoverInputProps,
    isDragActive: isCoverDragActive,
  } = useDropzone({
    onDrop: onDropCover,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  })

  // Banner dropzone
  const onDropBanner = useCallback((accepted: File[], rejected: unknown[]) => {
    if ((rejected as unknown[]).length > 0) {
      toast.error('Imagen inválida. Usá JPG, PNG o WebP de máx. 5MB')
      return
    }
    if (accepted[0]) {
      if (bannerPreview.startsWith('blob:')) URL.revokeObjectURL(bannerPreview)
      setBannerFile(accepted[0])
      setBannerPreview(URL.createObjectURL(accepted[0]))
    }
  }, [bannerPreview])

  const {
    getRootProps: getBannerRootProps,
    getInputProps: getBannerInputProps,
    isDragActive: isBannerDragActive,
  } = useDropzone({
    onDrop: onDropBanner,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  })

  const removeBanner = () => {
    if (bannerPreview.startsWith('blob:')) URL.revokeObjectURL(bannerPreview)
    setBannerFile(null)
    setBannerPreview('')
    setField('banner_url', '')
  }

  const removeLogo = () => {
    if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    setLogoFile(null)
    setLogoPreview('')
    setField('logo_url', '')
  }

  const removeCover = () => {
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    setCoverFile(null)
    setCoverPreview('')
    setField('cover_image_url', '')
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

      let finalCoverUrl: string | null = formData.cover_image_url || null
      if (coverFile) {
        setUploadingCover(true)
        const ext = coverFile.name.split('.').pop() ?? 'jpg'
        const fileName = `covers/${restaurant.id}-${Date.now()}.${ext}`
        const { error: coverErr } = await supabase.storage
          .from('restaurant-assets')
          .upload(fileName, coverFile, { cacheControl: '3600', upsert: true })
        setUploadingCover(false)
        if (coverErr) {
          toast.error(`Error al subir la portada: ${coverErr.message}`)
          setSaving(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage
          .from('restaurant-assets')
          .getPublicUrl(fileName)
        finalCoverUrl = publicUrl
        setField('cover_image_url', publicUrl)
        setCoverFile(null)
      }

      let finalBannerUrl: string | null = formData.banner_url || null
      if (bannerFile) {
        setUploadingBanner(true)
        const ext = bannerFile.name.split('.').pop() ?? 'jpg'
        const fileName = `banners/${restaurant.id}-${Date.now()}.${ext}`
        const { error: bannerErr } = await supabase.storage
          .from('restaurant-assets')
          .upload(fileName, bannerFile, { cacheControl: '3600', upsert: true })
        setUploadingBanner(false)
        if (bannerErr) {
          toast.error(`Error al subir el banner: ${bannerErr.message}`)
          setSaving(false)
          return
        }
        const { data: { publicUrl: bannerPublicUrl } } = supabase.storage
          .from('restaurant-assets')
          .getPublicUrl(fileName)
        finalBannerUrl = bannerPublicUrl
        setField('banner_url', bannerPublicUrl)
        setBannerFile(null)
      }

      const updatePayload = {
        logo_url:               finalLogoUrl,
        cover_image_url:        finalCoverUrl,
        banner_url:             finalBannerUrl,
        name:                   formData.name.trim(),
        description:            formData.description.trim() || null,
        phone:                  formData.phone.trim() || null,
        email:                  formData.email.trim() || null,
        website:                formData.website.trim() || null,
        country:                formData.country || null,
        province:               formData.province || null,
        city:                   formData.city.trim() || null,
        address:                formData.address.trim() || null,
        address_extra:          formData.address_extra.trim() || null,
        postal_code:            formData.postal_code.trim() || null,
        directions:             formData.directions.trim() || null,
        schedule:               formData.schedule,
        social_links:           formData.social_links,
        menu_accent_color:      formData.menu_accent_color,
        menu_card_style:        formData.menu_card_style,
        show_prices:            formData.show_prices,
        show_descriptions:      formData.show_descriptions,
        show_calories:          formData.show_calories,
        // Delivery & Takeaway
        delivery_enabled:       deliveryForm.delivery_enabled,
        delivery_time_estimate: deliveryForm.delivery_time_estimate,
        delivery_min_order:     deliveryForm.delivery_min_order,
        delivery_fee_type:      deliveryForm.delivery_fee_type,
        delivery_fee_value:     deliveryForm.delivery_fee_value,
        delivery_zones:         deliveryForm.delivery_zones,
        takeaway_enabled:       deliveryForm.takeaway_enabled,
        takeaway_time_estimate: deliveryForm.takeaway_time_estimate,
        // Language
        default_language:       menuLang,
        allow_language_switch:  allowSwitch,
        // Reservations
        reservations_enabled:        resEnabled,
        reservations_collect_guests: resCollectGuests,
        reservations_advance_days:   resDays,
        reservations_min_hours:      resMinHours,
        reservations_max_party:      resMaxParty,
        reservations_time_slots:     resTimeSlots,
        reservations_message:        resMessage,
        // POS
        tax_enabled:                  taxEnabled,
        tax_percentage:               taxPercentage,
        suggested_tip_percentages:    suggestedTips,
        enabled_payment_methods:      enabledPayments,
        daily_sales_goal:             dailySalesGoal,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error } = await (supabase as any)
        .from('restaurants')
        .update(sanitize(updatePayload))
        .eq('id', restaurant.id)
        .select('id')

      if (error) throw error

      if (!updated || updated.length === 0) {
        throw new Error('No se pudo guardar: sin permisos. Ejecutá la migración SQL en Supabase Dashboard.')
      }

      // Sync in-memory restaurant state so Cancel reverts to saved values
      setRestaurant(prev => prev ? { ...prev, ...updatePayload } as Restaurant : prev)

      toast.success(t('dashboard.settings_saved'))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? t('dashboard.settings_error')
      toast.error(msg)
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
      setCoverFile(null)
      if (!restaurant.cover_image_url && coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
      setCoverPreview(restaurant.cover_image_url ?? '')
      setBannerFile(null)
      const savedBanner = (restaurant as unknown as Record<string, unknown>).banner_url as string ?? ''
      if (!savedBanner && bannerPreview.startsWith('blob:')) URL.revokeObjectURL(bannerPreview)
      setBannerPreview(savedBanner)
    }
    toast('Cambios descartados', { icon: '↩️' })
  }

  const saveBusinessType = async (mode: 'gastronomy' | 'retail') => {
    if (!restaurant) return
    setSavingMode(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('restaurants')
        .update({ business_type: mode })
        .eq('id', restaurant.id)
      if (error) throw error
      setBusinessType(mode)
      setStoreBusinessType(mode)
      setRestaurant(prev => prev ? { ...prev, business_type: mode } : prev)
      const label = mode === 'gastronomy' ? 'Gastronomía' : 'Retail'
      toast.success(`✅ Modo actualizado a ${label}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar el tipo de negocio'
      toast.error(msg)
    } finally {
      setSavingMode(false)
      setConfirmMode(null)
    }
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
      {/* Tipo de Negocio */}
      <SectionCard title="Tipo de Negocio" description="Seleccioná el tipo para personalizar tu panel.">
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              mode: 'gastronomy' as const,
              icon: UtensilsCrossed,
              label: 'Gastronomía',
              desc: 'Restaurantes, bares, cafeterías, dark kitchens',
            },
            {
              mode: 'retail' as const,
              icon: ShoppingBag,
              label: 'Retail',
              desc: 'Tiendas, comercios, showrooms',
            },
          ]).map(({ mode, icon: Icon, label, desc }) => (
            <button
              key={mode}
              type="button"
              onClick={() => { if (businessType !== mode) setConfirmMode(mode) }}
              className={cn(
                'flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                businessType === mode
                  ? 'border-[#F4705A] bg-[#F4705A]/10'
                  : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-500'
              )}
            >
              <Icon className="w-6 h-6 flex-shrink-0" style={{ color: '#F4705A' }} />
              <div>
                <p className="font-bold text-white text-sm">{label}</p>
                <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

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

      {/* Cover image */}
      <SectionCard title="Imagen de portada" description="Aparece como banner en el menú digital que ven tus clientes.">
        {/* 16:9 preview area */}
        <div
          className="relative w-full rounded-xl overflow-hidden mb-4"
          style={{ paddingBottom: '56.25%' }}
        >
          <div className="absolute inset-0">
            {uploadingCover ? (
              <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Subiendo portada...</span>
              </div>
            ) : coverPreview ? (
              <img
                src={coverPreview}
                alt="Portada"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                {...getCoverRootProps()}
                className={cn(
                  'w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                  isCoverDragActive || isDraggingCover
                    ? 'bg-orange-50 border-2 border-dashed border-[#F4705A]'
                    : 'bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400',
                )}
                onDragEnter={() => setIsDraggingCover(true)}
                onDragLeave={() => setIsDraggingCover(false)}
                onDrop={() => setIsDraggingCover(false)}
              >
                <input {...getCoverInputProps()} />
                <ImageIcon className={cn('w-10 h-10', isCoverDragActive ? 'text-[#F4705A]' : 'text-gray-300')} />
                <p className={cn('text-sm font-medium', isCoverDragActive ? 'text-[#F4705A]' : 'text-gray-500')}>
                  {isCoverDragActive ? 'Soltá la imagen aquí' : 'Arrastrá tu portada aquí'}
                </p>
                <p className="text-xs text-gray-400">o usá el botón de abajo para subir</p>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <div {...getCoverRootProps()} className="contents">
            <input {...getCoverInputProps()} />
            <button
              type="button"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {coverPreview ? 'Cambiar portada' : 'Subir portada'}
            </button>
          </div>
          {coverPreview && (
            <button
              type="button"
              onClick={removeCover}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          JPG, PNG o WEBP · Recomendado: 1200×630 px · Máximo 5 MB
        </p>
        <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1.5">
          <span className="text-base leading-none">💡</span>
          Esta imagen aparece como banner en el header del menú que ven tus clientes.
        </p>
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
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-gray-400 flex-shrink-0">→</span>
                  <input
                    type="time"
                    value={d.to ?? '23:00'}
                    onChange={e => updateDay(day.key, 'to', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <FieldLabel hint="Los clientes podrán escribirte desde el menú y desde el botón de consulta del catálogo público.">
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
              className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none bg-white placeholder:text-gray-400"
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
              className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none bg-white placeholder:text-gray-400"
            />
          </div>
        </div>

        <div>
          <FieldLabel hint="Los clientes verán un botón para dejarte una reseña al completar su pedido.">
            {t('dashboard.google_review_label', 'Link de reseña en Google')}
          </FieldLabel>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent">
            <div className="flex items-center px-3 bg-gray-50 border-r border-gray-200">
              <Star className="w-4 h-4 text-[#FBBC04]" />
            </div>
            <input
              type="url"
              value={formData.social_links.google_review}
              onChange={e => updateSocial('google_review', e.target.value)}
              placeholder="https://g.page/r/tu-negocio/review"
              className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none bg-white placeholder:text-gray-400"
            />
          </div>
          {formData.social_links.google_review && !formData.social_links.google_review.startsWith('https://') && (
            <p className="mt-1 text-xs text-red-500">El link debe empezar con https://</p>
          )}
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

      {/* Hub banner */}
      <SectionCard title="Banner del Hub Público" description="Imagen de encabezado que aparece en tu página pública (hub) de MenuLife.">
        <div
          className="relative w-full rounded-xl overflow-hidden mb-4"
          style={{ paddingBottom: '33.33%' }}
        >
          <div className="absolute inset-0">
            {uploadingBanner ? (
              <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Subiendo banner...</span>
              </div>
            ) : bannerPreview ? (
              <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div
                {...getBannerRootProps()}
                className={cn(
                  'w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                  isBannerDragActive || isDraggingBanner
                    ? 'bg-orange-50 border-2 border-dashed border-[#F4705A]'
                    : 'bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400',
                )}
                onDragEnter={() => setIsDraggingBanner(true)}
                onDragLeave={() => setIsDraggingBanner(false)}
                onDrop={() => setIsDraggingBanner(false)}
              >
                <input {...getBannerInputProps()} />
                <ImageIcon className={cn('w-10 h-10', isBannerDragActive ? 'text-[#F4705A]' : 'text-gray-300')} />
                <p className={cn('text-sm font-medium', isBannerDragActive ? 'text-[#F4705A]' : 'text-gray-500')}>
                  {isBannerDragActive ? 'Soltá la imagen aquí' : 'Arrastrá tu banner aquí'}
                </p>
                <p className="text-xs text-gray-400">o usá el botón de abajo para subir</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div {...getBannerRootProps()} className="contents">
            <input {...getBannerInputProps()} />
            <button
              type="button"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {bannerPreview ? 'Cambiar banner' : 'Subir banner'}
            </button>
          </div>
          {bannerPreview && (
            <button
              type="button"
              onClick={removeBanner}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          JPG, PNG o WEBP · Recomendado: 1200×400 px · Máximo 5 MB
        </p>
      </SectionCard>
    </div>
  )

  const setDeliveryField = <K extends keyof DeliveryForm>(key: K, value: DeliveryForm[K]) =>
    setDeliveryForm(prev => ({ ...prev, [key]: value }))

  const addZone = () =>
    setDeliveryField('delivery_zones', [...deliveryForm.delivery_zones, { name: `Zona ${deliveryForm.delivery_zones.length + 1}`, max_km: 5, fee: 0 }])

  const updateZone = (idx: number, field: keyof DeliveryZone, value: string | number) =>
    setDeliveryField('delivery_zones', deliveryForm.delivery_zones.map((z, i) => i === idx ? { ...z, [field]: value } : z))

  const removeZone = (idx: number) =>
    setDeliveryField('delivery_zones', deliveryForm.delivery_zones.filter((_, i) => i !== idx))

  const renderDelivery = () => (
    <div className="space-y-5">
      {/* Delivery */}
      <SectionCard title="Delivery" description="Configurá las opciones de entrega a domicilio.">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Activar delivery</span>
            <Toggle
              checked={deliveryForm.delivery_enabled}
              onChange={e => setDeliveryField('delivery_enabled', e.target.checked)}
            />
          </div>

          {deliveryForm.delivery_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo estimado de entrega (minutos)</label>
                <input
                  type="number"
                  min={1}
                  value={deliveryForm.delivery_time_estimate}
                  onChange={e => setDeliveryField('delivery_time_estimate', Number(e.target.value))}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pedido mínimo ($)</label>
                <input
                  type="number"
                  min={0}
                  value={deliveryForm.delivery_min_order}
                  onChange={e => setDeliveryField('delivery_min_order', Number(e.target.value))}
                  className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de costo de envío</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'fixed',      label: '💲 Fijo' },
                    { value: 'percentage', label: '% Porcentaje' },
                    { value: 'zone',       label: '📍 Por zona' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDeliveryField('delivery_fee_type', opt.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-sm font-medium transition-colors text-center',
                        deliveryForm.delivery_fee_type === opt.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {deliveryForm.delivery_fee_type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo de envío fijo ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={deliveryForm.delivery_fee_value}
                    onChange={e => setDeliveryField('delivery_fee_value', Number(e.target.value))}
                    className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {deliveryForm.delivery_fee_type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje sobre el total (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={deliveryForm.delivery_fee_value}
                    onChange={e => setDeliveryField('delivery_fee_value', Number(e.target.value))}
                    className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {deliveryForm.delivery_fee_type === 'zone' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Zonas de entrega</label>
                  <div className="space-y-2">
                    {deliveryForm.delivery_zones.map((zone, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <input
                          type="text"
                          value={zone.name}
                          onChange={e => updateZone(idx, 'name', e.target.value)}
                          placeholder="Nombre"
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="number"
                          min={0}
                          value={zone.max_km}
                          onChange={e => updateZone(idx, 'max_km', Number(e.target.value))}
                          placeholder="km"
                          className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-gray-400">km</span>
                        <input
                          type="number"
                          min={0}
                          value={zone.fee}
                          onChange={e => updateZone(idx, 'fee', Number(e.target.value))}
                          placeholder="$"
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeZone(idx)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addZone}
                      className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar zona
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SectionCard>

      {/* Takeaway */}
      <SectionCard title="Para llevar (Takeaway)" description="Opción para que los clientes retiren en el local.">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Activar para llevar</span>
            <Toggle
              checked={deliveryForm.takeaway_enabled}
              onChange={e => setDeliveryField('takeaway_enabled', e.target.checked)}
            />
          </div>

          {deliveryForm.takeaway_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo estimado de preparación (minutos)</label>
              <input
                type="number"
                min={1}
                value={deliveryForm.takeaway_time_estimate}
                onChange={e => setDeliveryField('takeaway_time_estimate', Number(e.target.value))}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )

  const renderLanguage = () => (
    <div className="space-y-5">
      <SectionCard title={t('dashboard.lang_panel_title')} description={t('dashboard.lang_panel_desc')}>
        <div className="flex gap-3">
          {(['es', 'en'] as const).map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                setPanelLang(lang)
                changeLanguage(lang)
              }}
              className={cn(
                'flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors',
                panelLang === lang
                  ? 'border-[#FF6B7A] bg-[#FF6B7A]/10 text-[#FF6B7A]'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {lang === 'es' ? t('dashboard.lang_es') : t('dashboard.lang_en')}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('dashboard.lang_menu_title')} description={t('dashboard.lang_menu_desc')}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{t('dashboard.lang_menu_default')}</span>
            <div className="flex gap-2">
              {(['ES', 'EN'] as const).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setMenuLang(lang)}
                  className={cn(
                    'px-4 py-2 rounded-xl border text-sm font-semibold transition-colors',
                    menuLang === lang
                      ? 'border-[#FF6B7A] bg-[#FF6B7A]/10 text-[#FF6B7A]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {lang === 'ES' ? t('dashboard.lang_es') : t('dashboard.lang_en')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{t('dashboard.lang_allow_switch')}</span>
            <Toggle
              checked={allowSwitch}
              onChange={e => setAllowSwitch(e.target.checked)}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  )

  const renderReservations = () => {
    const addSlot = () => {
      const v = newSlot.trim()
      if (!v || resTimeSlots.includes(v)) return
      setResTimeSlots(prev => [...prev, v].sort())
      setNewSlot('')
    }
    const removeSlot = (s: string) => setResTimeSlots(prev => prev.filter(x => x !== s))

    return (
      <div className="space-y-5">
        <SectionCard title="📅 Sistema de reservas" description="Configurá cómo los clientes pueden hacer reservas desde el menú QR.">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Activar reservas online</span>
              <p className="text-xs text-gray-400 mt-0.5">Los clientes podrán reservar desde el menú QR</p>
            </div>
            <Toggle checked={resEnabled} onChange={e => setResEnabled(e.target.checked)} />
          </div>
        </SectionCard>

        {resEnabled && (
          <>
            <SectionCard title="Horarios disponibles" description="Los horarios que el cliente puede elegir al reservar.">
              <div className="flex flex-wrap gap-2 mb-3">
                {resTimeSlots.map(s => (
                  <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                    {s}
                    <button type="button" onClick={() => removeSlot(s)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newSlot}
                  onChange={e => setNewSlot(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B7A]"
                />
                <button
                  type="button"
                  onClick={addSlot}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B7A] text-white rounded-lg text-sm font-medium hover:bg-[#e85e6b] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Límites de reserva" description="Controlá la disponibilidad y anticipación.">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Anticipación máxima</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} max={365} value={resDays}
                      onChange={e => setResDays(Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B7A]"
                    />
                    <span className="text-sm text-gray-500">días</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Anticipación mínima</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={72} value={resMinHours}
                      onChange={e => setResMinHours(Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B7A]"
                    />
                    <span className="text-sm text-gray-500">horas antes</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Capacidad máxima por reserva</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} max={100} value={resMaxParty}
                      onChange={e => setResMaxParty(Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B7A]"
                    />
                    <span className="text-sm text-gray-500">personas</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Datos de acompañantes" description="Pedí los datos de todos los comensales de la mesa.">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Pedir datos de todos los comensales</span>
                  <p className="text-xs text-gray-400 mt-0.5">Nombre y apellido de cada persona de la mesa</p>
                </div>
                <Toggle checked={resCollectGuests} onChange={e => setResCollectGuests(e.target.checked)} />
              </div>
            </SectionCard>

            <SectionCard title="Mensaje personalizado" description="Aparece en la confirmación de la reserva.">
              <textarea
                value={resMessage}
                onChange={e => setResMessage(e.target.value)}
                rows={3}
                placeholder="¡Gracias por tu reserva! Te esperamos."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B7A] resize-none"
              />
            </SectionCard>
          </>
        )}
      </div>
    )
  }

  const ALL_PAYMENT_METHODS: Array<{ key: string; label: string }> = [
    { key: 'cash',        label: '💵 Efectivo' },
    { key: 'debit_card',  label: '💳 Débito' },
    { key: 'credit_card', label: '💳 Crédito' },
    { key: 'transfer',    label: '📱 Transferencia' },
    { key: 'mercadopago', label: '🟣 MercadoPago' },
    { key: 'other',       label: '📝 Otro' },
  ]

  const ALL_TIP_PCTS = [5, 10, 15, 20, 25]

  const renderPOS = () => (
    <div className="space-y-5">
      {/* Impuestos */}
      <SectionCard title="Impuestos" description="Si cobrás IVA u otro impuesto, configuralo aquí. Se aplica automáticamente en el checkout.">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Cobrar impuestos</span>
              <p className="text-xs text-gray-400 mt-0.5">Se suma al total del cobro</p>
            </div>
            <Toggle checked={taxEnabled} onChange={e => setTaxEnabled(e.target.checked)} />
          </div>
          {taxEnabled && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Porcentaje (%)</label>
              <input
                type="number" min={0} max={100} value={taxPercentage}
                onChange={e => setTaxPercentage(Number(e.target.value))}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-500">% sobre el subtotal</span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Propina sugerida */}
      <SectionCard title="Propina sugerida" description="Chips de porcentaje rápido que aparecen en el checkout.">
        <div className="flex flex-wrap gap-2">
          {ALL_TIP_PCTS.map(pct => {
            const active = suggestedTips.includes(pct)
            return (
              <button
                key={pct}
                type="button"
                onClick={() => setSuggestedTips(prev => active ? prev.filter(p => p !== pct) : [...prev, pct].sort((a, b) => a - b))}
                className={cn(
                  'px-4 py-2 rounded-xl border text-sm font-semibold transition-colors',
                  active ? 'border-[#FF6B7A] bg-[#FF6B7A]/10 text-[#FF6B7A]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {pct}%
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">Seleccioná los porcentajes que querés mostrar. El cajero también podrá ingresar un monto manual.</p>
      </SectionCard>

      {/* Métodos de pago habilitados */}
      <SectionCard title="Métodos de pago habilitados" description="Solo los métodos seleccionados aparecerán en el checkout.">
        <div className="space-y-2">
          {ALL_PAYMENT_METHODS.map(m => {
            const active = enabledPayments.includes(m.key)
            return (
              <div key={m.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700">{m.label}</span>
                <Toggle
                  checked={active}
                  onChange={e => {
                    if (e.target.checked) {
                      setEnabledPayments(prev => [...prev, m.key])
                    } else {
                      if (enabledPayments.length <= 1) return
                      setEnabledPayments(prev => prev.filter(k => k !== m.key))
                    }
                  }}
                />
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">Al menos un método debe estar habilitado.</p>
      </SectionCard>

      {/* Meta diaria */}
      <SectionCard title="Meta diaria de ventas" description="Aparece en el dashboard como indicador de progreso.">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">$</span>
          <input
            type="number" min={0} step={1000} value={dailySalesGoal}
            onChange={e => setDailySalesGoal(Number(e.target.value))}
            className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">El dashboard mostrará qué porcentaje de la meta alcanzaste hoy.</p>
      </SectionCard>
    </div>
  )

  const renderIntegrations = () => (
    <div className="space-y-5">
      {INTEGRATIONS.map(group => (
        <SectionCard key={group.category} title={group.category} description="">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.items.map(item => (
              <div
                key={item.name}
                className="flex flex-col gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>
                <span
                  className="self-start text-xs rounded-full px-3 py-1"
                  style={{
                    background: 'rgba(0,0,0,0.05)',
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    borderRadius: '999px',
                    padding: '4px 12px',
                  }}
                >
                  Próximamente
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      ))}

      <Card className="p-5 border border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm font-medium text-gray-700 mb-1">¿Necesitás otra integración?</p>
        <p className="text-sm text-gray-500 mb-3">Escribinos y la evaluamos.</p>
        <a
          href="https://wa.me/5491170000000?text=Hola%2C+quiero+sugerir+una+integraci%C3%B3n+para+MenuLife"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Escribinos por WhatsApp →
        </a>
      </Card>
    </div>
  )

  const sectionContent: Record<Section, React.ReactNode> = {
    general:      renderGeneral(),
    location:     renderLocation(),
    hours:        renderHours(),
    social:       renderSocial(),
    appearance:   renderAppearance(),
    delivery:     renderDelivery(),
    language:     renderLanguage(),
    reservations: renderReservations(),
    integrations: renderIntegrations(),
    pos:          renderPOS(),
    team:  restaurant ? (
      <TeamTab
        restaurantId={restaurant.id}
        userName={user?.user_metadata?.full_name ?? user?.email ?? 'Dueño'}
      />
    ) : null,
    audit: restaurant ? (
      <AuditTab restaurantId={restaurant.id} />
    ) : null,
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
          <h1 className="text-xl font-bold text-ink-1">{t('dashboard.settings_title')}</h1>
          <p className="text-sm text-ink-3 mt-0.5">{t('dashboard.settings_general')}</p>
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
        </div>
      </div>

      {/* Save bar — hidden on team/audit tabs */}
      <div
        className={cn(
          'fixed left-0 right-0 z-20 border-t px-4 py-3 flex gap-3 lg:static lg:bg-transparent lg:border-0 lg:px-0 lg:mt-5',
          (activeSection === 'team' || activeSection === 'audit') && 'hidden lg:hidden'
        )}
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))', background: '#16181F', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <Button variant="ghost" onClick={handleCancel} disabled={saving} className="flex-1 lg:flex-none">
          {t('dashboard.btn_cancel')}
        </Button>
        <Button
          onClick={handleSave}
          isLoading={saving || uploadingLogo || uploadingCover || uploadingBanner}
          className="flex-1 lg:flex-none bg-[#FF6B7A] hover:bg-[#e85e6b] text-white focus:ring-[#FF6B7A]"
        >
          {t('dashboard.settings_save')}
        </Button>
      </div>

      {/* Business type confirmation modal */}
      {confirmMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setConfirmMode(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              {confirmMode === 'gastronomy'
                ? <UtensilsCrossed className="w-6 h-6 flex-shrink-0" style={{ color: '#F4705A' }} />
                : <Warehouse className="w-6 h-6 flex-shrink-0" style={{ color: '#F4705A' }} />
              }
              <h3 className="text-white font-bold text-base">
                ¿Cambiar a {confirmMode === 'gastronomy' ? 'Gastronomía' : 'Retail'}?
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Se reorganizará tu panel de control. Tus datos no se eliminan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmMode(null)}
                disabled={savingMode}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => saveBusinessType(confirmMode)}
                disabled={savingMode}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: '#F4705A' }}
              >
                {savingMode ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
