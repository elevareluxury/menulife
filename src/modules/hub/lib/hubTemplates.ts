import type { BlockType } from './blocksConfig'

export type HubTemplateId =
  | 'restaurant'
  | 'services_pro'
  | 'retail'
  | 'artist'
  | 'coach'
  | 'gym'
  | 'individual'

export interface HubTemplate {
  id: HubTemplateId
  label: string
  description: string
  icon: string   // nombre de lucide-react
  emoji: string  // fallback
  blocks: BlockType[]
}

export const DEFAULT_BLOCK_CONFIG: Partial<Record<BlockType, Record<string, any>>> = {
  bio: {
    content: 'Contá tu historia acá. Podés usar negrita, cursiva y listas para destacar lo importante.',
    format: 'html',
  },
  video: {
    url: '',
    title: 'Video destacado',
  },
  stats: {
    items: [
      { value: '10+', label: 'años de experiencia' },
      { value: '500+', label: 'clientes' },
      { value: '4.9',  label: 'valoración' },
    ],
  },
  services: {
    items: [
      { name: 'Servicio principal', duration: '60 min', price: 0 },
    ],
  },
  schedule: {
    showClosedDays: true,
  },
  map: {
    address: '',
    provider: 'google',
  },
  contact_form: {
    title: 'Escribinos',
    showPhoneField: false,
    emailNotifications: true,
  },
  social_links: {
    showPlatforms: [],
  },
}

export const HUB_TEMPLATES: Record<HubTemplateId, HubTemplate> = {
  restaurant: {
    id: 'restaurant',
    label: 'Restaurante',
    description: 'Menú, productos destacados, horarios y mapa',
    icon: 'UtensilsCrossed',
    emoji: '🍽️',
    blocks: ['hero', 'featured_products', 'schedule', 'links', 'gallery', 'map', 'social_links'],
  },
  services_pro: {
    id: 'services_pro',
    label: 'Profesional de Servicios',
    description: 'Médicos, psicólogos, abogados, contadores',
    icon: 'Briefcase',
    emoji: '👔',
    blocks: ['hero', 'bio', 'services', 'reviews', 'contact_form', 'schedule'],
  },
  retail: {
    id: 'retail',
    label: 'Comercio Retail',
    description: 'Tienda física con catálogo online',
    icon: 'ShoppingBag',
    emoji: '🛍️',
    blocks: ['hero', 'featured_products', 'schedule', 'map', 'links', 'social_links'],
  },
  artist: {
    id: 'artist',
    label: 'Artista / Creador',
    description: 'Músicos, diseñadores, fotógrafos, cineastas',
    icon: 'Palette',
    emoji: '🎨',
    blocks: ['hero', 'video', 'gallery', 'bio', 'links', 'stats', 'social_links'],
  },
  coach: {
    id: 'coach',
    label: 'Coach / Consultor',
    description: 'Coaching, mentoría, consultoría personalizada',
    icon: 'Target',
    emoji: '🎯',
    blocks: ['hero', 'bio', 'services', 'stats', 'reviews', 'contact_form', 'links'],
  },
  gym: {
    id: 'gym',
    label: 'Gimnasio / Estudio',
    description: 'Gyms, yoga, pilates, crossfit, artes marciales',
    icon: 'Dumbbell',
    emoji: '💪',
    blocks: ['hero', 'services', 'schedule', 'reviews', 'gallery', 'contact_form', 'social_links'],
  },
  individual: {
    id: 'individual',
    label: 'Persona Individual',
    description: 'Perfil personal con links y redes',
    icon: 'User',
    emoji: '👤',
    blocks: ['hero', 'bio', 'links', 'social_links'],
  },
}

export function getTemplateBlockPlan(templateId: HubTemplateId) {
  const template = HUB_TEMPLATES[templateId]
  if (!template) throw new Error(`Template ${templateId} not found`)
  return template.blocks.map((blockType, index) => ({
    block_type: blockType,
    sort_order: (index + 1) * 10,
    is_active: true,
    config: DEFAULT_BLOCK_CONFIG[blockType] ?? {},
  }))
}
