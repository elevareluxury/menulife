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

/** Al salir: sólo el prefijo → vacío; "sitio.com" o "www.sitio.com" → "https://…"; lo demás, tal cual */
export function urlOnBlur(value: string): string {
  const v = urlOnChange(value).trim()
  if (!v || /^https?:\/\/$/i.test(v)) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(?=[/?#:]|$)/i.test(v)) return URL_PREFIX + v
  return v
}
