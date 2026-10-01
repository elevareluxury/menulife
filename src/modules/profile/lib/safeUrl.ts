const ALLOWED = /^(https?:|mailto:|tel:|sms:)/i

/**
 * Devuelve una URL segura para usar en href, o null.
 * Bloquea javascript:, data:, vbscript: y similares (protección XSS).
 * Rutas internas (/r/slug) se permiten tal cual.
 */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const url = raw.trim()
  if (!url) return null
  if (url.startsWith('/') && !url.startsWith('//')) return url
  if (ALLOWED.test(url)) return url
  // "instagram.com/x" sin protocolo
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return `https://${url}`
  return null
}

export function isExternal(href: string): boolean {
  return /^https?:/i.test(href)
}

export function whatsappHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 6 ? `https://wa.me/${digits}` : null
}

export function telHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const clean = raw.replace(/[^\d+]/g, '')
  return clean.length >= 6 ? `tel:${clean}` : null
}
