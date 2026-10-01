import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import { safeHref } from '@/modules/profile/lib/safeUrl'

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

export const MODULE_CATALOG: ModuleDef[] = [
  {
    type: 'link', label: 'Link', description: 'Un botón a tu web, tienda, portfolio o lo que quieras.', addable: true,
    fields: [
      { key: 'title', label: 'Título', kind: 'text', required: true, translatable: true, isTitle: true, maxLength: 120, placeholder: 'Mi portfolio' },
      { key: 'url', label: 'URL', kind: 'url', required: true, placeholder: 'https://…' },
      { key: 'subtitle', label: 'Subtítulo (opcional)', kind: 'text', translatable: true, maxLength: 120 },
      { key: 'image_url', label: 'Imagen (opcional)', kind: 'image' },
      { key: 'style', label: 'Cómo se ve', kind: 'select', required: true, options: [
        { value: 'button', label: 'Botón (ícono o miniatura a la izquierda)' },
        { value: 'card', label: 'Tarjeta con foto grande' },
      ] },
    ],
    validate: v => {
      if (!urlOk(v.url)) return 'La URL no es válida.'
      if (v.style === 'card' && !v.image_url) return 'Para verse como tarjeta, subí una imagen.'
      return null
    },
  },
  {
    type: 'social', label: 'Red social', description: 'Instagram, TikTok, LinkedIn… se muestran como íconos.', addable: true,
    fields: [
      { key: 'network', label: 'Red', kind: 'select', required: true, options: SOCIAL_NETWORKS.map(n => ({ value: n.value, label: n.label })) },
      { key: 'handle', label: 'Usuario o URL', kind: 'text', required: true, placeholder: '@tuusuario' },
    ],
    validate: v => (socialUrl(v.network, v.handle ?? '') ? null : 'Revisá el usuario o la URL.'),
  },
  {
    type: 'contact', label: 'Contacto', description: 'WhatsApp, teléfono y email para que te escriban.', addable: true,
    fields: [
      { key: 'title', label: 'Título', kind: 'text', isTitle: true, translatable: true, placeholder: 'Contacto' },
      { key: 'whatsapp', label: 'WhatsApp', kind: 'tel', placeholder: '+54 9 341 000 0000' },
      { key: 'phone', label: 'Teléfono', kind: 'tel' },
      { key: 'email', label: 'Email', kind: 'email' },
    ],
    validate: v => {
      if (!v.whatsapp && !v.phone && !v.email) return 'Completá al menos un dato de contacto.'
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return 'El email no es válido.'
      return null
    },
  },
  {
    type: 'location', label: 'Ubicación', description: 'Dirección y botón "Cómo llegar".', addable: true,
    fields: [
      { key: 'title', label: 'Título', kind: 'text', isTitle: true, translatable: true, placeholder: 'Ubicación' },
      { key: 'address', label: 'Dirección', kind: 'text', placeholder: 'San Martín 123' },
      { key: 'city', label: 'Ciudad', kind: 'text' },
      { key: 'maps_url', label: 'Link de Google Maps (opcional)', kind: 'url' },
    ],
    validate: v => {
      if (!v.address && !v.maps_url) return 'Completá la dirección o el link de Maps.'
      return urlOk(v.maps_url) ? null : 'El link de Maps no es válido.'
    },
  },
  {
    type: 'text', label: 'Texto', description: 'Una novedad, una historia o un anuncio breve.', addable: true,
    fields: [
      { key: 'title', label: 'Título', kind: 'text', isTitle: true, translatable: true, maxLength: 120 },
      { key: 'body', label: 'Texto', kind: 'textarea', required: true, translatable: true, maxLength: 2000 },
      { key: 'image_url', label: 'Imagen (opcional)', kind: 'image' },
    ],
  },
  {
    type: 'image', label: 'Imagen', description: 'Una foto destacada.', addable: true,
    fields: [
      { key: 'url', label: 'Imagen', kind: 'image', required: true },
      { key: 'caption', label: 'Epígrafe (opcional)', kind: 'text', translatable: true, maxLength: 200 },
      { key: 'alt', label: 'Descripción para accesibilidad', kind: 'text', maxLength: 200 },
    ],
  },
  {
    type: 'featured_action', label: 'Botón destacado', description: 'Un llamado a la acción secundario.', addable: true,
    fields: [
      { key: 'label', label: 'Texto del botón', kind: 'text', required: true, translatable: true, maxLength: 60, placeholder: 'Comprar entradas' },
      { key: 'url', label: 'URL', kind: 'url', required: true },
    ],
    validate: v => (urlOk(v.url) ? null : 'La URL no es válida.'),
  },
  {
    type: 'product', label: 'Producto destacado', description: 'Un producto o servicio con foto y precio.', addable: true,
    fields: [
      { key: 'name', label: 'Nombre', kind: 'text', required: true, translatable: true, maxLength: 120 },
      { key: 'description', label: 'Descripción', kind: 'textarea', translatable: true, maxLength: 500 },
      { key: 'price', label: 'Precio (opcional)', kind: 'number' },
      { key: 'tag', label: 'Etiqueta (opcional)', kind: 'text', translatable: true, maxLength: 30, placeholder: 'Nuevo' },
      { key: 'image_url', label: 'Imagen', kind: 'image' },
      { key: 'cta_text', label: 'Texto del botón (opcional)', kind: 'text', translatable: true, maxLength: 40 },
      { key: 'cta_url', label: 'URL del botón (opcional)', kind: 'url' },
    ],
    validate: v => (urlOk(v.cta_url) ? null : 'La URL del botón no es válida.'),
  },
  {
    type: 'hours', label: 'Horarios', description: 'Horario semanal y estado "Abierto ahora".', addable: true,
    fields: [],
  },
  {
    type: 'gallery', label: 'Galería', description: 'Varias fotos en grilla.', addable: true,
    fields: [],
  },
  {
    type: 'cards', label: 'Tarjetas', description: 'Eventos, productos o novedades con foto: deslizables o una abajo de la otra.', addable: true,
    fields: [
      { key: 'title', label: 'Título de la sección (opcional)', kind: 'text', isTitle: true, translatable: true, maxLength: 80, placeholder: 'Próximos eventos' },
      { key: 'layout', label: 'Cómo se muestran', kind: 'select', required: true, options: [
        { value: 'carousel', label: 'Deslizables (carrusel)' },
        { value: 'stack', label: 'Una abajo de la otra' },
      ] },
    ],
  },
  {
    type: 'testimonials', label: 'Reseñas', description: 'Opiniones de clientes y tu puntaje de Google.', addable: true,
    fields: [
      { key: 'title', label: 'Título', kind: 'text', isTitle: true, translatable: true, placeholder: 'Reseñas' },
    ],
  },
  {
    type: 'contact_card', label: 'Tarjeta de contacto', description: 'Se configura en Compartir.', addable: false,
    fields: [],
  },
]

export function moduleDef(type: ModuleType): ModuleDef {
  return MODULE_CATALOG.find(d => d.type === type) ?? MODULE_CATALOG[0]
}

/** Texto corto para listar un módulo en Studio. */
export function moduleSummary(m: { type: ModuleType; title: string | null; content: Record<string, unknown> }): string {
  const c = m.content
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  switch (m.type) {
    case 'link':            return s(c.url)
    case 'social':          return s(c.handle) || s(c.url)
    case 'contact':         return [s(c.whatsapp), s(c.phone), s(c.email)].filter(Boolean).join(' · ')
    case 'location':        return [s(c.address), s(c.city)].filter(Boolean).join(', ') || s(c.maps_url)
    case 'text':            return s(c.body).slice(0, 80)
    case 'image':           return s(c.caption) || 'Imagen'
    case 'featured_action': return s(c.url)
    case 'product':         return typeof c.price === 'number' ? `$ ${c.price}` : s(c.description).slice(0, 60)
    case 'gallery':         return `${Array.isArray(c.items) ? c.items.length : 0} fotos`
    case 'testimonials':    return `${Array.isArray(c.items) ? c.items.length : 0} reseñas`
    case 'cards':           return `${Array.isArray(c.items) ? c.items.length : 0} tarjetas · ${c.layout === 'stack' ? 'apiladas' : 'deslizables'}`
    case 'hours':           return 'Horario semanal'
    default:                return ''
  }
}

export function moduleDisplayTitle(m: { type: ModuleType; title: string | null; content: Record<string, unknown> }): string {
  if (m.title) return m.title
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  if (m.type === 'social') return SOCIAL_NETWORKS.find(n => n.value === s(m.content.network))?.label ?? 'Red social'
  if (m.type === 'product') return s(m.content.name) || 'Producto'
  if (m.type === 'featured_action') return s(m.content.label) || 'Botón'
  return moduleDef(m.type).label
}
