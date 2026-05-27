export const APP_NAME = 'menulife'
export const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  SUPER_ADMIN: '/super-admin',
} as const

export const PLANS = {
  menu: {
    name: 'Menu',
    price: 9,
    features: ['Menú digital', 'QR personalizable', 'Actualización en tiempo real'],
  },
  pro: {
    name: 'Pro',
    price: 19,
    features: ['Todo de Menu', 'Sistema de pedidos', 'KDS', 'Gestión de mozos', 'Mesas'],
  },
  total: {
    name: 'Total',
    price: 32,
    features: ['Todo de Pro', 'Delivery', 'Estadísticas avanzadas', 'Mozo IA'],
  },
} as const

export const ALLERGENS = [
  'gluten',
  'lactosa',
  'frutos_secos',
  'mariscos',
  'huevo',
  'soja',
  'pescado',
] as const

export const TAGS = [
  'vegano',
  'vegetariano',
  'sin_tacc',
  'picante',
  'recomendado',
  'nuevo',
] as const

export const CURRENCIES = ['ARS', 'USD'] as const
export const LANGUAGES = ['ES', 'EN'] as const

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export const ACCEPTED_VIDEO_TYPES = {
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
}

export const ORDER_STATUS = {
  PENDING: 'pending',
  COOKING: 'cooking',
  READY: 'ready',
  DELIVERED: 'delivered',
} as const

export const ORDER_STATUS_LABELS = {
  pending: { es: 'Nuevos', en: 'New' },
  cooking: { es: 'Preparando', en: 'Cooking' },
  ready: { es: 'Listos', en: 'Ready' },
  delivered: { es: 'Entregados', en: 'Delivered' },
} as const

export const KDS_COLUMNS = [
  { id: 'pending', color: 'blue' },
  { id: 'cooking', color: 'yellow' },
  { id: 'ready', color: 'green' },
  { id: 'delivered', color: 'gray' },
] as const
