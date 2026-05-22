export const APP_NAME = 'menulife'
export const APP_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:5173'

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
