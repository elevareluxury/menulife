import type { ProfileLang, Translations } from './profileTypes'

const LANG_KEY = 'mycen_profile_lang'

/** Texto en el idioma pedido, con fallback al original (español). */
export function tr(original: string | null | undefined, translations: Translations | undefined, field: string, lang: ProfileLang): string {
  if (lang !== 'es') {
    const value = translations?.[lang]?.[field]
    if (typeof value === 'string' && value.trim()) return value
  }
  return original ?? ''
}

export function initialLang(defaultLocale: string): ProfileLang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'es' || saved === 'en') return saved
  } catch { /* storage bloqueado */ }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) return 'en'
  return defaultLocale?.toLowerCase().startsWith('en') ? 'en' : 'es'
}

export function saveLang(lang: ProfileLang) {
  try { localStorage.setItem(LANG_KEY, lang) } catch { /* storage bloqueado */ }
}

const UI = {
  es: {
    openNow: 'Abierto ahora',
    closedNow: 'Cerrado ahora',
    share: 'Compartir',
    linkCopied: 'Link copiado',
    saveContact: 'Guardar contacto',
    contact: 'Contacto',
    location: 'Ubicación',
    howToGet: 'Cómo llegar',
    hours: 'Horarios',
    closed: 'Cerrado',
    gallery: 'Galería',
    reviews: 'Reseñas',
    seeOnGoogle: 'Ver en Google',
    reviewsCount: 'reseñas',
    notFoundTitle: 'Este perfil no existe',
    notFoundText: 'Revisá el link o creá tu propia identidad en Mycen.',
    unavailableTitle: 'Este perfil no está disponible',
    unavailableText: 'Su dueño todavía no lo publicó o lo pausó por ahora.',
    errorTitle: 'No pudimos cargar el perfil',
    errorText: 'Revisá tu conexión e intentá de nuevo.',
    retry: 'Reintentar',
    createYours: 'Creá tu Mycen',
    draftBanner: 'Vista previa: este perfil todavía no es público.',
    footer: 'Una identidad Mycen',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' },
    languageLabel: 'Idioma',
  },
  en: {
    openNow: 'Open now',
    closedNow: 'Closed now',
    share: 'Share',
    linkCopied: 'Link copied',
    saveContact: 'Save contact',
    contact: 'Contact',
    location: 'Location',
    howToGet: 'Get directions',
    hours: 'Hours',
    closed: 'Closed',
    gallery: 'Gallery',
    reviews: 'Reviews',
    seeOnGoogle: 'See on Google',
    reviewsCount: 'reviews',
    notFoundTitle: 'This profile does not exist',
    notFoundText: 'Check the link or create your own identity on Mycen.',
    unavailableTitle: 'This profile is not available',
    unavailableText: 'Its owner has not published it yet or paused it for now.',
    errorTitle: 'We could not load this profile',
    errorText: 'Check your connection and try again.',
    retry: 'Try again',
    createYours: 'Create your Mycen',
    draftBanner: 'Preview: this profile is not public yet.',
    footer: 'A Mycen identity',
    days: { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' },
    languageLabel: 'Language',
  },
} as const

export type UiStrings = (typeof UI)['es']

export function ui(lang: ProfileLang): UiStrings {
  return UI[lang] as UiStrings
}

/** Etiquetas conocidas de la acción principal / títulos importados, traducidas. */
const KNOWN_LABELS: Record<string, string> = {
  'Ver menú': 'View menu',
  'Ver catálogo': 'View catalog',
  'Contactar': 'Contact',
  'Reservar': 'Book a table',
  'Ver más': 'See more',
  'Contacto': 'Contact',
  'Ubicación': 'Location',
  'Horarios': 'Hours',
  'Galería': 'Gallery',
  'Reseñas': 'Reviews',
}

export function trLabel(label: string | null | undefined, lang: ProfileLang): string {
  if (!label) return ''
  return lang === 'en' ? KNOWN_LABELS[label] ?? label : label
}
