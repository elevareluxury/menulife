import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import { safeHref } from '@/modules/profile/lib/safeUrl'
import type { StudioDict } from '@/i18n/app/studio'

export type FieldKind = 'text' | 'textarea' | 'url' | 'email' | 'tel' | 'number' | 'select' | 'image'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  required?: boolean
  placeholder?: string
  /** Se puede cargar también en inglés */
  translatable?: boolean
  options?: { value: string; label: string }[]
  maxLength?: number
  /** El campo vive en `title` del módulo en vez de `content` */
  isTitle?: boolean
}

export interface ModuleDef {
  type: ModuleType
  label: string
  description: string
  /** Se ofrece en la biblioteca para agregar */
  addable: boolean
  fields: FieldDef[]
  /** Validación extra además de los requeridos. Devuelve el mensaje de error o null. */
  validate?: (values: Record<string, string>) => string | null
}

export const SOCIAL_NETWORKS = [
  { value: 'instagram', label: 'Instagram', base: 'https://instagram.com/' },
  { value: 'tiktok',    label: 'TikTok',    base: 'https://tiktok.com/@' },
  { value: 'youtube',   label: 'YouTube',   base: 'https://youtube.com/@' },
  { value: 'facebook',  label: 'Facebook',  base: 'https://facebook.com/' },
  { value: 'linkedin',  label: 'LinkedIn',  base: 'https://linkedin.com/in/' },
  { value: 'x',         label: 'X',         base: 'https://x.com/' },
  { value: 'whatsapp',  label: 'WhatsApp',  base: 'https://wa.me/' },
]

/** "@usuario" o URL completa → URL de la red. */
export function socialUrl(network: string, handle: string): string | null {
  const v = handle.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return safeHref(v)
  const net = SOCIAL_NETWORKS.find(n => n.value === network)
  if (!net) return safeHref(v)
  const clean = network === 'whatsapp' ? v.replace(/\D/g, '') : v.replace(/^@/, '')
  return clean ? net.base + clean : null
}

const urlOk = (v: string | undefined) => !v || !!safeHref(v)

const catalogCache = new WeakMap<StudioDict, ModuleDef[]>()

/** Catálogo de módulos con los textos en el idioma activo. */
export function buildCatalog(t: StudioDict): ModuleDef[] {
  const hit = catalogCache.get(t)
  if (hit) return hit
  const c = t.catalog
  const f = c.fields
  const p = c.placeholders
  const v = c.validation
  const meta = (type: ModuleType) => c.types[type] ?? { label: type, description: '' }
  const list: ModuleDef[] = [
    {
      type: 'link', ...meta('link'), addable: true,
      fields: [
        { key: 'title', label: f.title, kind: 'text', required: true, translatable: true, isTitle: true, maxLength: 120, placeholder: p.linkTitle },
        { key: 'url', label: f.url, kind: 'url', required: true, placeholder: 'https://…' },
        { key: 'subtitle', label: f.subtitle, kind: 'text', translatable: true, maxLength: 120 },
        { key: 'image_url', label: f.imageOptional, kind: 'image' },
        { key: 'style', label: f.style, kind: 'select', required: true, options: [
          { value: 'button', label: c.styleButton },
          { value: 'card', label: c.styleCard },
        ] },
      ],
      validate: x => {
        if (!urlOk(x.url)) return v.badUrl
        if (x.style === 'card' && !x.image_url) return v.cardNeedsImage
        return null
      },
    },
    {
      type: 'social', ...meta('social'), addable: true,
      fields: [
        { key: 'network', label: f.network, kind: 'select', required: true, options: SOCIAL_NETWORKS.map(n => ({ value: n.value, label: n.label })) },
        { key: 'handle', label: f.handle, kind: 'text', required: true, placeholder: p.handle },
      ],
      validate: x => (socialUrl(x.network, x.handle ?? '') ? null : v.badHandle),
    },
    {
      type: 'contact', ...meta('contact'), addable: true,
      fields: [
        { key: 'title', label: f.title, kind: 'text', isTitle: true, translatable: true, placeholder: p.contactTitle },
        { key: 'whatsapp', label: f.whatsapp, kind: 'tel', placeholder: '+54 9 341 000 0000' },
        { key: 'phone', label: f.phone, kind: 'tel' },
        { key: 'email', label: f.email, kind: 'email' },
      ],
      validate: x => {
        if (!x.whatsapp && !x.phone && !x.email) return v.contactEmpty
        if (x.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)) return v.badEmail
        return null
      },
    },
    {
      type: 'location', ...meta('location'), addable: true,
      fields: [
        { key: 'title', label: f.title, kind: 'text', isTitle: true, translatable: true, placeholder: p.locationTitle },
        { key: 'address', label: f.address, kind: 'text', placeholder: p.address },
        { key: 'city', label: f.city, kind: 'text' },
        { key: 'maps_url', label: f.mapsUrl, kind: 'url' },
      ],
      validate: x => {
        if (!x.address && !x.maps_url) return v.locationEmpty
        return urlOk(x.maps_url) ? null : v.badMaps
      },
    },
    {
      type: 'text', ...meta('text'), addable: true,
      fields: [
        { key: 'title', label: f.title, kind: 'text', isTitle: true, translatable: true, maxLength: 120 },
        { key: 'body', label: f.text, kind: 'textarea', required: true, translatable: true, maxLength: 2000 },
        { key: 'image_url', label: f.imageOptional, kind: 'image' },
      ],
    },
    {
      type: 'image', ...meta('image'), addable: true,
      fields: [
        { key: 'url', label: f.image, kind: 'image', required: true },
        { key: 'caption', label: f.caption, kind: 'text', translatable: true, maxLength: 200 },
        { key: 'alt', label: f.alt, kind: 'text', maxLength: 200 },
      ],
    },
    {
      type: 'featured_action', ...meta('featured_action'), addable: true,
      fields: [
        { key: 'label', label: f.buttonText, kind: 'text', required: true, translatable: true, maxLength: 60, placeholder: p.featuredLabel },
        { key: 'url', label: f.url, kind: 'url', required: true },
      ],
      validate: x => (urlOk(x.url) ? null : v.badUrl),
    },
    {
      type: 'product', ...meta('product'), addable: true,
      fields: [
        { key: 'name', label: f.name, kind: 'text', required: true, translatable: true, maxLength: 120 },
        { key: 'description', label: f.description, kind: 'textarea', translatable: true, maxLength: 500 },
        { key: 'price', label: f.price, kind: 'number' },
        { key: 'tag', label: f.tag, kind: 'text', translatable: true, maxLength: 30, placeholder: p.tag },
        { key: 'image_url', label: f.image, kind: 'image' },
        { key: 'cta_text', label: f.ctaText, kind: 'text', translatable: true, maxLength: 40 },
        { key: 'cta_url', label: f.ctaUrl, kind: 'url' },
      ],
      validate: x => (urlOk(x.cta_url) ? null : v.badCta),
    },
    { type: 'hours', ...meta('hours'), addable: true, fields: [] },
    { type: 'gallery', ...meta('gallery'), addable: true, fields: [] },
    {
      type: 'cards', ...meta('cards'), addable: true,
      fields: [
        { key: 'title', label: f.sectionTitle, kind: 'text', isTitle: true, translatable: true, maxLength: 80, placeholder: p.cardsTitle },
        { key: 'layout', label: f.layout, kind: 'select', required: true, options: [
          { value: 'carousel', label: c.layoutCarousel },
          { value: 'stack', label: c.layoutStack },
        ] },
      ],
    },
    {
      type: 'testimonials', ...meta('testimonials'), addable: true,
      fields: [
        { key: 'title', label: f.title, kind: 'text', isTitle: true, translatable: true, placeholder: p.reviewsTitle },
      ],
    },
    { type: 'contact_card', ...meta('contact_card'), addable: false, fields: [] },
  ]
  catalogCache.set(t, list)
  return list
}

export function moduleDef(type: ModuleType, t: StudioDict): ModuleDef {
  const catalog = buildCatalog(t)
  return catalog.find(d => d.type === type) ?? catalog[0]
}

/** Texto corto para listar un módulo en Studio. */
export function moduleSummary(m: { type: ModuleType; title: string | null; content: Record<string, unknown> }, t: StudioDict): string {
  const c = m.content
  const sm = t.catalog.summary
  const count = (v: unknown) => (Array.isArray(v) ? v.length : 0)
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  switch (m.type) {
    case 'link':            return s(c.url)
    case 'social':          return s(c.handle) || s(c.url)
    case 'contact':         return [s(c.whatsapp), s(c.phone), s(c.email)].filter(Boolean).join(' · ')
    case 'location':        return [s(c.address), s(c.city)].filter(Boolean).join(', ') || s(c.maps_url)
    case 'text':            return s(c.body).slice(0, 80)
    case 'image':           return s(c.caption) || sm.image
    case 'featured_action': return s(c.url)
    case 'product':         return typeof c.price === 'number' ? `$ ${c.price}` : s(c.description).slice(0, 60)
    case 'gallery':         return sm.photos(count(c.items))
    case 'testimonials':    return sm.reviews(count(c.items))
    case 'cards':           return sm.cards(count(c.items), c.layout === 'stack')
    case 'hours':           return sm.hours
    default:                return ''
  }
}

export function moduleDisplayTitle(m: { type: ModuleType; title: string | null; content: Record<string, unknown> }, t: StudioDict): string {
  if (m.title) return m.title
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  const sm = t.catalog.summary
  if (m.type === 'social') return SOCIAL_NETWORKS.find(n => n.value === s(m.content.network))?.label ?? sm.social
  if (m.type === 'product') return s(m.content.name) || sm.product
  if (m.type === 'featured_action') return s(m.content.label) || sm.button
  return moduleDef(m.type, t).label
}
