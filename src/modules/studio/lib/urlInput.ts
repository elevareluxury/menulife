import { cleanLinkInput, looksLikeEmail, safeHref } from '@/modules/profile/lib/safeUrl'

// Campos de link en Studio: arrancan con "https://" ya escrito y se completan solos, para que cada link sea una web.

export const URL_PREFIX = 'https://'

/** Al tocar un campo vacío: queda "https://" listo para seguir escribiendo */
export function urlOnFocus(value: string): string {
  return value.trim() ? value : URL_PREFIX
}

/** Mientras se escribe o se pega: "https://https://sitio.com" (pegar encima del prefijo) → "https://sitio.com" */
export function urlOnChange(value: string): string {
  return value.replace(/^\s*https?:\/\/(?=\s*(https?:\/\/|mailto:|tel:))/i, '').trimStart()
}

/**
 * Al salir: sólo el prefijo → vacío; "sitio.com" o "www.sitio.com" → "https://…"; un email (también escrito después
 * del "https://" que ya estaba) → "mailto:…"; comillas, espacios y el punto final que se pegan con el link, afuera.
 */
export function urlOnBlur(value: string): string {
  const v = cleanLinkInput(urlOnChange(value))
  if (!v || /^https?:\/\/$/i.test(v)) return ''
  const afterPrefix = v.replace(/^https?:\/\//i, '')
  if (looksLikeEmail(afterPrefix)) return `mailto:${afterPrefix}`
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v
  const href = safeHref(v)
  return href && href.startsWith(URL_PREFIX) ? href : v
}
