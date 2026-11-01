import { registerNamespace, useAppLang } from '@/i18n/app/store'
import type { ProfileLang, Translations } from './profileTypes'

/**
 * Texto en el idioma pedido. El contenido original está en el idioma del perfil
 * (default_locale); si hay una traducción guardada para `lang` se usa esa.
 */
export function tr(original: string | null | undefined, translations: Translations | undefined, field: string, lang: ProfileLang): string {
  const value = translations?.[lang]?.[field]
  if (typeof value === 'string' && value.trim()) return value
  return original ?? ''
}

/** Motivos de denuncia (mismos valores que el check de profile_reports.reason) */
export const REPORT_REASONS = ['spam', 'scam', 'impersonation', 'hate', 'violence', 'sexual', 'illegal', 'other'] as const
export type ReportReason = typeof REPORT_REASONS[number]

type Days = { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; saturday: string; sunday: string }

export interface UiStrings {
  openNow: string
  closedNow: string
  share: string
  linkCopied: string
  saveContact: string
  contact: string
  location: string
  howToGet: string
  hours: string
  closed: string
  gallery: string
  reviews: string
  seeOnGoogle: string
  reviewsCount: string
  notFoundTitle: string
  notFoundText: string
  unavailableTitle: string
  unavailableText: string
  errorTitle: string
  errorText: string
  retry: string
  createYours: string
  draftBanner: string
  footer: string
  /** Perfil vivo (V1): la persona está disponible */
  available: string
  /** Tilde de cuenta verificada (nombre accesible) */
  verified: string
  /** Portada: señal de que hay más abajo */
  moreAboutMe: string
  /** "Creá tu identidad" (vista previa y textos de referidos) */
  createIdentity: string
  /** Botón del pie de todos los perfiles, con la huella de Mycen */
  createFree: string
  /** Contacto: botones "Llamar" y "Email" (WhatsApp va con su nombre) */
  call: string
  emailLabel: string
  /** Hoja "Compartir" y botón para volver arriba */
  copyLink: string
  qrCode: string
  moreOptions: string
  backToTop: string
  /** Video y música: el reproductor del proveedor se carga al tocar ({provider} = YouTube, Spotify…) */
  playOn: string
  days: Days
  languageLabel: string
  socials: string
  close: string
  /** Visor de la galería */
  prevPhoto: string
  nextPhoto: string
  cards: string
  swipeHint: string
  /** Botón de una tarjeta de evento con link (diseño Flyers) */
  tickets: string
  tags: string
  projects: string
  viewProject: string
  credits: string
  backToProfile: string
  projectNotFoundTitle: string
  projectNotFoundText: string
  projectUnavailableTitle: string
  projectUnavailableText: string
  projectDraftBanner: string
  video: string
  links: string
  report: string
  reportTitle: string
  reportProjectTitle: string
  reportIntro: string
  reportReason: string
  reportDetails: string
  reportSend: string
  reportSending: string
  reportThanks: string
  reportDuplicate: string
  reportLimit: string
  reportError: string
  cancel: string
  rules: string
  reportReasons: Record<ReportReason, string>
}

/** Español: viaja con la página. Los otros 11 idiomas, en lib/ui/<idioma>.ts (se bajan al usarlos). */
const ES: UiStrings = {
    openNow: 'Abierto ahora', closedNow: 'Cerrado ahora', share: 'Compartir', linkCopied: 'Link copiado',
    saveContact: 'Guardar contacto', contact: 'Contacto', location: 'Ubicación', howToGet: 'Cómo llegar',
    hours: 'Horarios', closed: 'Cerrado', gallery: 'Galería', reviews: 'Reseñas', seeOnGoogle: 'Ver en Google',
    reviewsCount: 'reseñas',
    notFoundTitle: 'Este perfil no existe', notFoundText: 'Revisá el link o creá tu propia identidad en Mycen.',
    unavailableTitle: 'Este perfil no está disponible', unavailableText: 'Su dueño todavía no lo publicó o lo pausó por ahora.',
    errorTitle: 'No pudimos cargar el perfil', errorText: 'Revisá tu conexión e intentá de nuevo.',
    retry: 'Reintentar', createYours: 'Creá tu Mycen', draftBanner: 'Vista previa: este perfil todavía no es público.',
    footer: 'Una identidad Mycen',
    verified: 'Cuenta verificada', available: 'Disponible', moreAboutMe: 'Más sobre mí', createIdentity: 'Creá tu identidad', createFree: 'Creá tu Mycen gratis', call: 'Llamar', copyLink: 'Copiar link', qrCode: 'Código QR', moreOptions: 'Más opciones', backToTop: 'Volver arriba', emailLabel: 'Email', playOn: 'Reproducir en {provider}',
    days: { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' },
    languageLabel: 'Idioma', socials: 'Redes sociales', close: 'Cerrar', prevPhoto: 'Foto anterior', nextPhoto: 'Foto siguiente', cards: 'Tarjetas',
    swipeHint: 'deslizá para ver más', tickets: 'Entradas', tags: 'Categorías',
    projects: "Proyectos", viewProject: "Ver proyecto", credits: "Créditos", backToProfile: "Volver al perfil", projectNotFoundTitle: "Este proyecto no existe", projectNotFoundText: "Revisá el link o mirá el perfil completo.", projectUnavailableTitle: "Este proyecto no está disponible", projectUnavailableText: "Su dueño todavía no lo publicó o lo despublicó.", projectDraftBanner: "Vista previa: este proyecto todavía no es público.", video: "Video",
    links: 'Links',
    report: 'Denunciar', reportTitle: 'Denunciar este perfil', reportProjectTitle: 'Denunciar este proyecto', reportIntro: 'Contanos qué pasa. Lo revisa el equipo de Mycen; el dueño no sabe quién denunció.', reportReason: 'Motivo', reportDetails: 'Detalles (opcional)', reportSend: 'Enviar denuncia', reportSending: 'Enviando…', reportThanks: 'Gracias. Recibimos tu denuncia y la vamos a revisar.', reportDuplicate: 'Ya recibimos tu denuncia sobre este perfil. La estamos revisando.', reportLimit: 'Enviaste muchas denuncias hoy. Probá de nuevo mañana.', reportError: 'No pudimos enviar la denuncia. Revisá tu conexión e intentá de nuevo.', cancel: 'Cancelar', rules: 'Reglas de contenido',
    reportReasons: { spam: 'Spam o publicidad engañosa', scam: 'Estafa o fraude', impersonation: 'Se hace pasar por otra persona o marca', hate: 'Odio o acoso', violence: 'Violencia o amenazas', sexual: 'Contenido sexual', illegal: 'Algo ilegal', other: 'Otro motivo' },
}

type Loader = () => Promise<{ default: UiStrings }>
const LOADERS: Record<Exclude<ProfileLang, 'es'>, Loader> = {
  en: () => import('./ui/en'), pt: () => import('./ui/pt'), fr: () => import('./ui/fr'), de: () => import('./ui/de'),
  it: () => import('./ui/it'), zh: () => import('./ui/zh'), ja: () => import('./ui/ja'), ko: () => import('./ui/ko'),
  hi: () => import('./ui/hi'), ar: () => import('./ui/ar'), ru: () => import('./ui/ru'),
}
const cache = new Map<ProfileLang, UiStrings>([['es', ES]])
const pending = new Map<ProfileLang, Promise<UiStrings>>()
// Si una descarga falla (sin red, deploy nuevo): español en vez de quedar esperando; se reintenta en la próxima
const failed = new Set<ProfileLang>()

/** Baja los textos de un idioma (la promesa nunca rechaza: si falla, español) */
export function loadUi(lang: ProfileLang): Promise<UiStrings> {
  const hit = cache.get(lang)
  if (hit) return Promise.resolve(hit)
  let p = pending.get(lang)
  if (!p) {
    const loader = (LOADERS as Record<string, Loader | undefined>)[lang]
    p = loader
      ? loader().then(m => { cache.set(lang, m.default); failed.delete(lang); return m.default })
        .catch(() => { pending.delete(lang); failed.add(lang); return ES })
      : Promise.resolve(ES)
    pending.set(lang, p)
  }
  return p
}

/**
 * Textos del sistema de la página pública en un idioma. Si todavía no bajaron, suspende (se ve el esqueleto de la
 * ruta, nunca el español de golpe); `setLang` espera esta carga antes de cambiar de idioma (registerNamespace).
 * Sólo se llama al dibujar.
 */
export function ui(lang: ProfileLang): UiStrings {
  const hit = cache.get(lang)
  if (hit) return hit
  if (failed.has(lang)) return ES
  throw loadUi(lang)
}

// El idioma de la persona empieza a bajar apenas se carga la página
registerNamespace(lang => loadUi(lang as ProfileLang))
if (useAppLang.getState().lang !== 'es') void loadUi(useAppLang.getState().lang as ProfileLang)

/** Etiquetas conocidas (acción principal, títulos importados del Hub) traducidas. */
const KNOWN_LABELS: Record<string, Partial<Record<ProfileLang, string>>> = {
  'Ver menú':     { en: 'View menu', pt: 'Ver cardápio', fr: 'Voir le menu', de: 'Speisekarte', it: 'Vedi menù', zh: '查看菜单', ja: 'メニューを見る', ko: '메뉴 보기', hi: 'मेनू देखें', ar: 'عرض القائمة', ru: 'Меню' },
  'Ver catálogo': { en: 'View catalog', pt: 'Ver catálogo', fr: 'Voir le catalogue', de: 'Katalog ansehen', it: 'Vedi catalogo', zh: '查看目录', ja: 'カタログを見る', ko: '카탈로그 보기', hi: 'कैटलॉग देखें', ar: 'عرض الكتالوج', ru: 'Каталог' },
  'Contactar':    { en: 'Contact', pt: 'Entrar em contato', fr: 'Contacter', de: 'Kontakt', it: 'Contatta', zh: '联系', ja: '問い合わせ', ko: '문의하기', hi: 'संपर्क करें', ar: 'تواصل', ru: 'Связаться' },
  'Reservar':     { en: 'Book a table', pt: 'Reservar', fr: 'Réserver', de: 'Reservieren', it: 'Prenota', zh: '预订', ja: '予約する', ko: '예약하기', hi: 'बुक करें', ar: 'احجز', ru: 'Забронировать' },
  'Ver más':      { en: 'See more', pt: 'Ver mais', fr: 'Voir plus', de: 'Mehr ansehen', it: 'Vedi di più', zh: '查看更多', ja: 'もっと見る', ko: '더 보기', hi: 'और देखें', ar: 'عرض المزيد', ru: 'Подробнее' },
  'Contacto':     { en: 'Contact', pt: 'Contato', fr: 'Contact', de: 'Kontakt', it: 'Contatti', zh: '联系方式', ja: '連絡先', ko: '연락처', hi: 'संपर्क', ar: 'التواصل', ru: 'Контакты' },
  'Ubicación':    { en: 'Location', pt: 'Localização', fr: 'Adresse', de: 'Standort', it: 'Posizione', zh: '位置', ja: '所在地', ko: '위치', hi: 'पता', ar: 'الموقع', ru: 'Адрес' },
  'Horarios':     { en: 'Hours', pt: 'Horários', fr: 'Horaires', de: 'Öffnungszeiten', it: 'Orari', zh: '营业时间', ja: '営業時間', ko: '영업시간', hi: 'समय', ar: 'ساعات العمل', ru: 'Часы работы' },
  'Galería':      { en: 'Gallery', pt: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria', zh: '相册', ja: 'ギャラリー', ko: '갤러리', hi: 'गैलरी', ar: 'المعرض', ru: 'Галерея' },
  'Reseñas':      { en: 'Reviews', pt: 'Avaliações', fr: 'Avis', de: 'Bewertungen', it: 'Recensioni', zh: '评价', ja: 'レビュー', ko: '리뷰', hi: 'समीक्षाएँ', ar: 'التقييمات', ru: 'Отзывы' },
}

export function trLabel(label: string | null | undefined, lang: ProfileLang): string {
  if (!label) return ''
  return KNOWN_LABELS[label]?.[lang] ?? label
}
