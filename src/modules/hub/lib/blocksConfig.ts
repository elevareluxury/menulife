import { z } from 'zod'

export type BlockType =
  | 'hero' | 'links' | 'gallery' | 'reviews' | 'featured'
  | 'featured_products' | 'stories'
  | 'video' | 'schedule' | 'services' | 'map' | 'contact_form'
  | 'social_links' | 'bio' | 'stats'

export type BlockDataSource = 'table' | 'jsonb'

export interface BlockDef {
  type: BlockType
  label: string
  labelEn: string
  description: string
  icon: string
  dataSource: BlockDataSource
  legacyTable?: string
  configSchema?: z.ZodTypeAny
  alwaysActive?: boolean
  defaultOrder: number
}

// ── Schemas Zod para bloques nuevos (Zod v4) ─────────────────────────────────

export const VideoBlockConfigSchema = z.object({
  url: z.string().min(1, 'URL requerida').url('URL inválida'),
  title: z.string().max(120).optional(),
  autoplay: z.boolean().default(false),
})

export const BioBlockConfigSchema = z.object({
  content: z.string().max(1000, 'Máximo 1000 caracteres'),
  format: z.enum(['html', 'markdown']).default('html'),
})

export const StatsBlockConfigSchema = z.object({
  items: z.array(z.object({
    value: z.string().min(1).max(20),
    label: z.string().min(1).max(60),
    icon: z.string().max(30).optional(),
  })).min(1).max(4),
})

// Schemas placeholder para sub-prompts posteriores
export const ScheduleBlockConfigSchema = z.object({
  showDays: z.record(z.string(), z.boolean()).optional(),
  showClosedDays: z.boolean().default(true),
})

export const ServicesBlockConfigSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    duration: z.string().optional(),
    price: z.number().optional(),
  })).optional(),
})

export const MapBlockConfigSchema = z.object({
  address: z.string().min(1),
  provider: z.enum(['google', 'apple']).default('google'),
})

export const ContactFormBlockConfigSchema = z.object({
  title: z.string().max(80).default('Contáctame'),
  showPhoneField: z.boolean().default(false),
  emailNotifications: z.boolean().default(true),
})

export const SocialLinksBlockConfigSchema = z.object({
  showPlatforms: z.array(z.enum([
    'instagram', 'facebook', 'whatsapp', 'tiktok',
    'twitter', 'linkedin', 'youtube',
  ])).default([]),
})

// ── Registro de bloques ───────────────────────────────────────────────────────

export const BLOCK_DEFINITIONS: Record<BlockType, BlockDef> = {
  hero: {
    type: 'hero', label: 'Portada', labelEn: 'Hero',
    description: 'Foto de perfil, nombre y botón principal',
    icon: 'Sparkles', dataSource: 'table',
    alwaysActive: true, defaultOrder: 0,
  },
  links: {
    type: 'links', label: 'Links', labelEn: 'Links',
    description: 'Smart links con íconos',
    icon: 'Link2', dataSource: 'table',
    legacyTable: 'hub_links', defaultOrder: 10,
  },
  gallery: {
    type: 'gallery', label: 'Galería', labelEn: 'Gallery',
    description: 'Fotos y videos en grilla',
    icon: 'Image', dataSource: 'table',
    legacyTable: 'hub_gallery', defaultOrder: 30,
  },
  reviews: {
    type: 'reviews', label: 'Testimonios', labelEn: 'Testimonials',
    description: 'Reseñas de tus clientes',
    icon: 'MessageSquare', dataSource: 'table',
    legacyTable: 'hub_reviews', defaultOrder: 40,
  },
  featured: {
    type: 'featured', label: 'Destacado', labelEn: 'Featured',
    description: 'Contenido destacado con CTA',
    icon: 'Star', dataSource: 'table',
    legacyTable: 'hub_featured', defaultOrder: 20,
  },
  featured_products: {
    type: 'featured_products', label: 'Productos Destacados', labelEn: 'Featured Products',
    description: 'Grilla de productos favoritos',
    icon: 'Package', dataSource: 'table',
    legacyTable: 'hub_featured_product', defaultOrder: 25,
  },
  stories: {
    type: 'stories', label: 'Novedades', labelEn: 'News',
    description: 'Historias y novedades',
    icon: 'BookOpen', dataSource: 'table',
    legacyTable: 'hub_stories', defaultOrder: 15,
  },
  video: {
    type: 'video', label: 'Video', labelEn: 'Video',
    description: 'YouTube, Vimeo, TikTok, Instagram',
    icon: 'Video', dataSource: 'jsonb',
    configSchema: VideoBlockConfigSchema, defaultOrder: 50,
  },
  bio: {
    type: 'bio', label: 'Bio Extendida', labelEn: 'Extended Bio',
    description: 'Contá tu historia con formato',
    icon: 'FileText', dataSource: 'jsonb',
    configSchema: BioBlockConfigSchema, defaultOrder: 5,
  },
  stats: {
    type: 'stats', label: 'Estadísticas', labelEn: 'Stats',
    description: 'Números destacados (años, clientes, etc.)',
    icon: 'BarChart3', dataSource: 'jsonb',
    configSchema: StatsBlockConfigSchema, defaultOrder: 45,
  },
  schedule: {
    type: 'schedule', label: 'Horarios', labelEn: 'Schedule',
    description: 'Días y horarios de atención',
    icon: 'Clock', dataSource: 'jsonb',
    configSchema: ScheduleBlockConfigSchema, defaultOrder: 60,
  },
  services: {
    type: 'services', label: 'Servicios', labelEn: 'Services',
    description: 'Servicios con duración y precio',
    icon: 'Briefcase', dataSource: 'jsonb',
    configSchema: ServicesBlockConfigSchema, defaultOrder: 35,
  },
  map: {
    type: 'map', label: 'Mapa', labelEn: 'Map',
    description: 'Ubicación con mapa embed',
    icon: 'MapPin', dataSource: 'jsonb',
    configSchema: MapBlockConfigSchema, defaultOrder: 70,
  },
  contact_form: {
    type: 'contact_form', label: 'Formulario de Contacto', labelEn: 'Contact Form',
    description: 'Recibí mensajes por email',
    icon: 'Mail', dataSource: 'jsonb',
    configSchema: ContactFormBlockConfigSchema, defaultOrder: 80,
  },
  social_links: {
    type: 'social_links', label: 'Redes Sociales', labelEn: 'Social Links',
    description: 'Íconos de tus redes',
    icon: 'Share2', dataSource: 'jsonb',
    configSchema: SocialLinksBlockConfigSchema, defaultOrder: 90,
  },
}

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface HubBlock {
  id: string
  restaurant_id: string
  block_type: BlockType
  sort_order: number
  is_active: boolean
  config: Record<string, any>
  created_at: string
  updated_at: string
}

export function isLegacyBlock(type: BlockType): boolean {
  return BLOCK_DEFINITIONS[type].dataSource === 'table'
}

export function validateBlockConfig(
  type: BlockType,
  config: any,
): { success: boolean; data?: any; error?: string } {
  const def = BLOCK_DEFINITIONS[type]
  if (!def.configSchema) return { success: true, data: config }
  const result = def.configSchema.safeParse(config)
  if (result.success) return { success: true, data: result.data }
  // Zod v4: errors in result.error.issues
  const issues = result.error?.issues ?? []
  return {
    success: false,
    error: issues.map((e: any) => e.message).join(', '),
  }
}
