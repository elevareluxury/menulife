// Links que escribe o pega la gente: se aceptan como los copia (sin https://, con www, entre comillas, con un punto o
// una coma al final) y se rechaza lo que no abriría nada (dominio sin punto, con espacios, "https://" solo) o lo que
// podría engañar (javascript:, data:, usuario@sitio). La misma regla valida en Studio y dibuja en la página pública.

/** Dominio suelto, con letras de cualquier idioma: "instagram.com/ana", "www.tienda.com.ar?x=1", "añá.com" */
const BARE_DOMAIN = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:\p{L}{2,}|xn--[a-z0-9-]+)(?::\d{1,5})?(?=[/?#]|$)/iu
const EMAIL = /^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]{2,}$/
/** "ana@mail.com" (sin mailto:) */
export const looksLikeEmail = (v: string) => EMAIL.test(v)
const PHONE_DIGITS = (v: string) => v.replace(/\D/g, '').length

/** Saca lo que se pega sin querer alrededor de un link: espacios, comillas, <…> y un punto o coma final */
export function cleanLinkInput(raw: string): string {
  let v = raw.trim()
  for (let prev = ''; prev !== v;) {
    prev = v
    // Pegado encima del "https://" que ya estaba: 'https://"sitio.com"'
    v = v.replace(/^https?:\/\/(?=[<"'“”‘’«])/i, '')
    v = v.replace(/^[<"'“”‘’«]+|[>"'“”‘’»]+$/g, '').replace(/[.,;]+$/, '').trim()
  }
  // "https//sitio.com", "https:/sitio.com" o "https:///sitio.com": se arregla el comienzo
  if (!/^https?:\/\/[^/]/i.test(v)) v = v.replace(/^(https?)(?::\/{0,3}|\/\/)(?=[^/])/i, '$1://')
  return v
}

/** Link pegado sin protocolo ("youtube.com/watch?v=…") → con https://; lo pegado de más alrededor, afuera */
export function withWebScheme(raw: string): string {
  const v = cleanLinkInput(raw)
  return /^[a-z][a-z0-9+.-]*:/i.test(v) || !BARE_DOMAIN.test(v) ? v : `https://${v}`
}

function validWebUrl(url: string): boolean {
  // Nada de "usuario@sitio.com": el navegador iría a sitio.com mostrando otra cosa
  // y nada de espacios en el dominio ("https://ana .com"); en el resto del link el navegador los acepta
  const authority = /^https?:\/\/([^/?#]*)/i.exec(url)?.[1] ?? ''
  if (authority.includes('@') || /\s/.test(authority)) return false
  let u: URL
  try { u = new URL(url) } catch { return false }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  const host = u.hostname.replace(/\.$/, '')
  const labels = host.split('.')
  // Un dominio de verdad: con punto, sin partes vacías y con una terminación (.com, .ar, .design, xn--…)
  return labels.length >= 2 && labels.every(Boolean) && /^([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(labels[labels.length - 1])
}

/**
 * Devuelve una URL segura para usar en href, o null.
 * Bloquea javascript:, data:, vbscript: y similares (protección XSS).
 * Rutas internas (/r/slug) se permiten tal cual.
 */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const url = cleanLinkInput(raw)
  if (!url) return null
  // "/\evil.com" el navegador lo lee como "//evil.com" (otro sitio): no es una ruta interna
  if (url.startsWith('/')) return !url.startsWith('//') && !url.startsWith('/\\') ? url : null
  if (/^mailto:/i.test(url)) return EMAIL.test(decodeSafe(url.slice(7).split('?')[0])) ? url : null
  if (/^(tel|sms):/i.test(url)) return PHONE_DIGITS(url) >= 6 && /^(tel|sms):\+?[\d\s().-]+$/i.test(url) ? url : null
  if (/^https?:\/\//i.test(url)) return validWebUrl(url) ? url : null
  // Un email suelto en un campo de link: "escribime" por mail
  if (EMAIL.test(url)) return `mailto:${url}`
  // "instagram.com/ana" sin protocolo
  if (BARE_DOMAIN.test(url) && validWebUrl(`https://${url}`)) return `https://${url}`
  return null
}

function decodeSafe(v: string): string {
  try { return decodeURIComponent(v) } catch { return v }
}

export function isExternal(href: string): boolean {
  return /^https?:/i.test(href)
}

/** "+54 9 341…" o "0054 9 341…" → dígitos con el código de país; null si no alcanza para un número */
export function whatsappDigits(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  // Link de WhatsApp pegado entero: wa.me/549… o api.whatsapp.com/send?phone=549…
  const fromLink = /(?:wa\.me\/|phone=)\+?(\d[\d\s-]*)/i.exec(v)
  const digits = (fromLink ? fromLink[1] : v).replace(/\D/g, '').replace(/^00/, '')
  return digits.length >= 6 ? digits : null
}

export function whatsappHref(raw: unknown): string | null {
  const digits = whatsappDigits(raw)
  return digits ? `https://wa.me/${digits}` : null
}

/**
 * WhatsApp necesita el número completo con el código de país (wa.me/5493415550000). Un número local
 * ("341 555-0000", "11 5555 0000") abre un chat con otra persona o con nadie, así que Studio lo pide así.
 */
export function whatsappNeedsCountry(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw.trim()) return false
  const v = raw.trim()
  if (/wa\.me\/|phone=/i.test(v) || /^(\+|00)/.test(v)) return (whatsappDigits(v)?.length ?? 0) < 8
  return (whatsappDigits(v)?.length ?? 0) < 11
}

export function telHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const clean = raw.replace(/[^\d+]/g, '')
  return clean.replace(/\D/g, '').length >= 6 ? `tel:${clean}` : null
}
