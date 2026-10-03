import type { ComponentType } from 'react'
import type { ModuleType, WeekSchedule } from '@/modules/profile/lib/profileTypes'
import { WEEK_DAYS } from '@/modules/profile/lib/schedule'
import { safeHref } from '@/modules/profile/lib/safeUrl'
import type { CardItem } from '@/modules/profile/components/ProfileModules'
import type { StudioDict } from '@/i18n/app/studio'
import type { StudioModule } from './studioTypes'
import {
  CardsEditor, GalleryEditor, HoursEditor, PortfolioPicker, ProjectPicker, ReviewsEditor,
  type ExtraEditorProps, type GalleryItem, type ReviewsValue,
} from '../components/moduleExtraEditors'

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

type Content = Record<string, unknown>

/** Contexto que algunos tipos necesitan al guardar */
export interface SaveContext {
  /** Zona horaria del negocio vinculado, si hay */
  businessTimezone?: string | null
}

/**
 * Parte del editor que no son campos simples (horarios, fotos, tarjetas, reseñas): su propio estado,
 * cómo se carga del módulo, cómo se valida y cómo se escribe en `content`.
 */
export interface ModuleExtra<S> {
  init: (module: StudioModule | null) => S
  /** Mensaje de error o null */
  validate: (value: S) => string | null
  apply: (value: S, content: Content, ctx: SaveContext) => void
  Editor: ComponentType<ExtraEditorProps<S>>
}

/**
 * Definición de un tipo de módulo en Studio. Registro único (`Record<ModuleType, …>`): el editor, la
 * lista de módulos, la biblioteca y la analítica leen de acá; no hay `if (type === …)` sueltos.
 * El dibujo público está en `profile/components/moduleRegistry.ts`.
 */
export interface ModuleDef {
  type: ModuleType
  label: string
  description: string
  /** Se ofrece en la biblioteca para agregar */
  addable: boolean
  fields: FieldDef[]
  /** Validación extra además de los requeridos. Devuelve el mensaje de error o null. */
  validate?: (values: Record<string, string>) => string | null
  /** Completa valores iniciales (por defecto o derivados del contenido guardado) */
  prefill?: (values: Record<string, string>, content: Content | null) => void
  /** Ajusta `content` al guardar, con datos derivados de los campos */
  finalize?: (content: Content, values: Record<string, string>) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada tipo tiene su propio estado
  extra?: ModuleExtra<any>
  /** Texto corto para listar el módulo */
  summary: (content: Content) => string
  /** Nombre cuando el módulo no tiene título (por defecto, el nombre del tipo) */
  fallbackTitle?: (content: Content) => string | null
}

type ModuleSpec = Omit<ModuleDef, 'type' | 'label' | 'description'>

const extra = <S,>(def: ModuleExtra<S>) => def
const text = (v: unknown) => (typeof v === 'string' ? v : '')
const count = (v: unknown) => (Array.isArray(v) ? v.length : 0)

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

/** Catálogo de módulos con los textos en el idioma activo (en el orden de la biblioteca). */
export function buildCatalog(t: StudioDict): ModuleDef[] {
  const hit = catalogCache.get(t)
  if (hit) return hit
  const c = t.catalog
  const f = c.fields
  const p = c.placeholders
  const v = c.validation
  const e = t.editor
  const sm = c.summary

  const specs: Record<ModuleType, ModuleSpec> = {
    link: {
      addable: true,
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
      prefill: x => { if (!x.style) x.style = 'button' },
      finalize: content => { if (!content.link_type) content.link_type = 'custom' },
      summary: x => text(x.url),
    },
    social: {
      addable: true,
      fields: [
        { key: 'network', label: f.network, kind: 'select', required: true, options: SOCIAL_NETWORKS.map(n => ({ value: n.value, label: n.label })) },
        { key: 'handle', label: f.handle, kind: 'text', required: true, placeholder: p.handle },
      ],
      validate: x => (socialUrl(x.network, x.handle ?? '') ? null : v.badHandle),
      // Módulos viejos sin handle: se edita a partir de la URL
      prefill: (x, content) => { if (content && !x.handle) x.handle = text(content.url) },
      finalize: (content, x) => { content.url = socialUrl(x.network, x.handle ?? '') },
      summary: x => text(x.handle) || text(x.url),
      fallbackTitle: x => SOCIAL_NETWORKS.find(n => n.value === text(x.network))?.label ?? sm.social,
    },
    contact: {
      addable: true,
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
      summary: x => [text(x.whatsapp), text(x.phone), text(x.email)].filter(Boolean).join(' · '),
    },
    location: {
      addable: true,
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
      summary: x => [text(x.address), text(x.city)].filter(Boolean).join(', ') || text(x.maps_url),
    },
    text: {
      addable: true,
      fields: [
        { key: 'title', label: f.title, kind: 'text', isTitle: true, translatable: true, maxLength: 120 },
        { key: 'body', label: f.text, kind: 'textarea', required: true, translatable: true, maxLength: 2000 },
        { key: 'image_url', label: f.imageOptional, kind: 'image' },
      ],
      summary: x => text(x.body).slice(0, 80),
    },
    image: {
      addable: true,
      fields: [
        { key: 'url', label: f.image, kind: 'image', required: true },
        { key: 'caption', label: f.caption, kind: 'text', translatable: true, maxLength: 200 },
        { key: 'alt', label: f.alt, kind: 'text', maxLength: 200 },
      ],
      summary: x => text(x.caption) || sm.image,
    },
    featured_action: {
      addable: true,
      fields: [
        { key: 'label', label: f.buttonText, kind: 'text', required: true, translatable: true, maxLength: 60, placeholder: p.featuredLabel },
        { key: 'url', label: f.url, kind: 'url', required: true },
      ],
      validate: x => (urlOk(x.url) ? null : v.badUrl),
      summary: x => text(x.url),
      fallbackTitle: x => text(x.label) || sm.button,
    },
    product: {
      addable: true,
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
      summary: x => (typeof x.price === 'number' ? `$ ${x.price}` : text(x.description).slice(0, 60)),
      fallbackTitle: x => text(x.name) || sm.product,
    },
    hours: {
      addable: true,
      fields: [],
      extra: extra<WeekSchedule>({
        init: m => (m?.content.schedule as WeekSchedule) ?? {},
        validate: schedule => (WEEK_DAYS.some(d => schedule[d]) ? null : e.hoursEmpty),
        apply: (schedule, content, ctx) => {
          content.schedule = schedule
          content.timezone = text(content.timezone) || ctx.businessTimezone || 'America/Argentina/Buenos_Aires'
        },
        Editor: HoursEditor,
      }),
      summary: () => sm.hours,
    },
    gallery: {
      addable: true,
      fields: [],
      extra: extra<GalleryItem[]>({
        init: m => (Array.isArray(m?.content.items) ? m.content.items as GalleryItem[] : []),
        validate: items => (items.length ? null : e.galleryEmpty),
        apply: (items, content) => { content.items = items },
        Editor: GalleryEditor,
      }),
      summary: x => sm.photos(count(x.items)),
    },
    cards: {
      addable: true,
      fields: [
        { key: 'title', label: f.sectionTitle, kind: 'text', isTitle: true, translatable: true, maxLength: 80, placeholder: p.cardsTitle },
        { key: 'layout', label: f.layout, kind: 'select', required: true, options: [
          { value: 'carousel', label: c.layoutCarousel },
          { value: 'stack', label: c.layoutStack },
        ] },
      ],
      prefill: x => { if (!x.layout) x.layout = 'carousel' },
      extra: extra<CardItem[]>({
        init: m => (Array.isArray(m?.content.items) ? m.content.items as CardItem[] : [{}]),
        validate: items => {
          const filled = items.filter(i => i.title?.trim() || i.image_url)
          if (!filled.length) return e.cardsEmpty
          if (filled.some(i => i.url?.trim() && !safeHref(i.url))) return e.cardsBadLink
          return null
        },
        apply: (items, content) => {
          content.items = items
            .filter(i => i.title?.trim() || i.image_url)
            .map(i => Object.fromEntries(Object.entries({
              image_url: i.image_url, title: i.title?.trim(), subtitle: i.subtitle?.trim(), date: i.date,
              url: i.url?.trim() ? safeHref(i.url) : undefined,
              en: i.en?.title?.trim() || i.en?.subtitle?.trim() ? { title: i.en?.title?.trim() || undefined, subtitle: i.en?.subtitle?.trim() || undefined } : undefined,
            }).filter(([, val]) => val)))
        },
        Editor: CardsEditor,
      }),
      summary: x => sm.cards(count(x.items), x.layout === 'stack'),
    },
    testimonials: {
      addable: true,
      fields: [
        { key: 'title', label: f.title, kind: 'text', isTitle: true, translatable: true, placeholder: p.reviewsTitle },
      ],
      extra: extra<ReviewsValue>({
        init: m => {
          const g = (m?.content.google ?? {}) as { rating?: number; count?: number; url?: string }
          return {
            items: Array.isArray(m?.content.items) ? m.content.items as ReviewsValue['items'] : [],
            google: { rating: g.rating != null ? String(g.rating) : '', count: g.count != null ? String(g.count) : '', url: g.url ?? '' },
          }
        },
        validate: ({ items, google }) => {
          if (!items.some(r => r.author_name?.trim() && r.text?.trim()) && !google.rating) return e.reviewsEmpty
          const rating = Number(google.rating.replace(',', '.'))
          if (google.rating && (Number.isNaN(rating) || rating < 1 || rating > 5)) return e.googleRange
          if (google.url && !safeHref(google.url)) return e.googleBadLink
          return null
        },
        apply: ({ items, google }, content) => {
          content.items = items
            .filter(r => r.author_name?.trim() && r.text?.trim())
            .map(r => ({ author_name: r.author_name!.trim(), rating: r.rating ?? 5, text: r.text!.trim() }))
          const g: Content = {}
          if (google.rating) g.rating = Number(google.rating.replace(',', '.'))
          if (google.count) g.count = Number(google.count)
          if (google.url) g.url = safeHref(google.url)
          if (Object.keys(g).length) content.google = g
          else delete content.google
        },
        Editor: ReviewsEditor,
      }),
      summary: x => sm.reviews(count(x.items)),
    },
    // Fase 5: guardan sólo ids; la página pública recibe las tarjetas de los proyectos publicados
    project: {
      addable: true,
      fields: [],
      extra: extra<string>({
        init: m => text(m?.content.project_id),
        validate: id => (id ? null : e.projectRequired),
        apply: (id, content) => { content.project_id = id },
        Editor: ProjectPicker,
      }),
      summary: () => sm.project,
    },
    portfolio: {
      addable: true,
      fields: [
        { key: 'title', label: f.sectionTitle, kind: 'text', isTitle: true, translatable: true, maxLength: 80, placeholder: p.portfolioTitle },
      ],
      extra: extra<string[] | null>({
        init: m => (Array.isArray(m?.content.project_ids) && m.content.project_ids.length
          ? (m.content.project_ids as unknown[]).filter((x): x is string => typeof x === 'string') : null),
        validate: ids => (ids && !ids.length ? e.portfolioPickEmpty : null),
        apply: (ids, content) => {
          if (ids) content.project_ids = ids
          else delete content.project_ids
        },
        Editor: PortfolioPicker,
      }),
      summary: x => (Array.isArray(x.project_ids) && x.project_ids.length ? sm.portfolioSome(x.project_ids.length) : sm.portfolioAll),
    },
    // Se edita en Mi identidad → tarjeta de contacto; en la página es el botón "Guardar contacto"
    contact_card: { addable: false, fields: [], summary: () => '' },
  }

  const list = (Object.keys(specs) as ModuleType[]).map(type => ({
    type, ...(c.types[type] ?? { label: type, description: '' }), ...specs[type],
  }))
  catalogCache.set(t, list)
  return list
}

export function moduleDef(type: ModuleType, t: StudioDict): ModuleDef {
  const catalog = buildCatalog(t)
  return catalog.find(d => d.type === type) ?? catalog[0]
}

type ModuleLike = { type: ModuleType; title: string | null; content: Record<string, unknown> }

/** Texto corto para listar un módulo en Studio. */
export function moduleSummary(m: ModuleLike, t: StudioDict): string {
  return buildCatalog(t).find(d => d.type === m.type)?.summary(m.content) ?? ''
}

export function moduleDisplayTitle(m: ModuleLike, t: StudioDict): string {
  if (m.title) return m.title
  const def = moduleDef(m.type, t)
  return def.fallbackTitle?.(m.content) || def.label
}
