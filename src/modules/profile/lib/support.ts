// Módulo "Apoyame" (support, V1.1): la persona muestra cómo apoyarla o pagarle. Mycen nunca procesa pagos ni cobra
// montos: los links llevan a la cuenta de la persona en cada plataforma y el alias o la clave Pix se copian.
// Reglas puras (sin DOM): las usan el editor de Studio, la página pública y los tests.

export const SUPPORT_KINDS = ['mercadopago', 'paypal', 'kofi', 'buymeacoffee', 'pix', 'alias', 'link'] as const
export type SupportKind = typeof SUPPORT_KINDS[number]

/** Tipos que se muestran como texto para copiar (el resto son links) */
export const SUPPORT_COPY_KINDS: readonly SupportKind[] = ['pix', 'alias']

export const SUPPORT_MAX_METHODS = 6
export const SUPPORT_MESSAGE_MAX = 140
export const SUPPORT_AMOUNTS_MAX = 80
export const SUPPORT_LABEL_MAX = 40
/** Alias, CVU o CBU */
export const SUPPORT_ALIAS_MAX = 60
/** Clave Pix (email, teléfono, CPF/CNPJ o clave aleatoria) */
export const SUPPORT_PIX_MAX = 80
export const SUPPORT_URL_MAX = 300

/** Nombre de marca de cada plataforma (no se traduce); null = lo nombra la interfaz */
export const SUPPORT_BRAND: Record<SupportKind, string | null> = {
  mercadopago: 'Mercado Pago', paypal: 'PayPal', kofi: 'Ko-fi', buymeacoffee: 'Buy Me a Coffee', pix: 'Pix', alias: null, link: null,
}

/** Dominios aceptados por plataforma ('link' acepta cualquier https) */
const HOSTS: Record<Exclude<SupportKind, 'pix' | 'alias' | 'link'>, (host: string) => boolean> = {
  mercadopago: h => h === 'mpago.la' || /^(www\.|link\.)?mercadopago\.com(\.[a-z]{2})?$/.test(h),
  paypal: h => /^(www\.)?paypal\.(me|com)$/.test(h),
  kofi: h => /^(www\.)?ko-fi\.com$/.test(h),
  buymeacoffee: h => /^(www\.)?buymeacoffee\.com$/.test(h),
}

export interface SupportMethod {
  kind: SupportKind
  value: string
  label?: string
}

export type SupportError = 'empty' | 'bad_url' | 'wrong_domain' | 'too_long' | 'bad_text'

export function isSupportKind(v: unknown): v is SupportKind {
  return typeof v === 'string' && (SUPPORT_KINDS as readonly string[]).includes(v)
}

export function isCopyKind(kind: SupportKind): boolean {
  return SUPPORT_COPY_KINDS.includes(kind)
}

// Caracteres de control o saltos de línea: el alias y la clave son una sola línea
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/

/** Lee un link: https (o sin protocolo, se completa), sin usuario/contraseña. null si no sirve. */
function asHttpsUrl(raw: string): URL | null {
  const v = raw.trim()
  if (!v || /\s/.test(v) || v.length > SUPPORT_URL_MAX) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return null
    return url
  } catch {
    return null
  }
}

/** Motivo por el que un medio no sirve, o null si está bien. */
export function checkSupportMethod(m: { kind: SupportKind; value?: string; label?: string }): SupportError | null {
  const value = (m.value ?? '').trim()
  if (!value) return 'empty'
  if ((m.label ?? '').trim().length > SUPPORT_LABEL_MAX) return 'too_long'
  if (m.kind === 'alias' || m.kind === 'pix') {
    if (value.length > (m.kind === 'alias' ? SUPPORT_ALIAS_MAX : SUPPORT_PIX_MAX)) return 'too_long'
    return CONTROL.test(value) ? 'bad_text' : null
  }
  const url = asHttpsUrl(value)
  if (!url) return 'bad_url'
  if (m.kind === 'link') return null
  return HOSTS[m.kind](url.hostname.toLowerCase()) ? null : 'wrong_domain'
}

/** URL lista para el href (https, dominio de la plataforma), o null. */
export function supportHref(kind: SupportKind, value: unknown): string | null {
  if (typeof value !== 'string' || isCopyKind(kind)) return null
  if (checkSupportMethod({ kind, value })) return null
  return asHttpsUrl(value)!.href
}

/** Medio normalizado para guardar (link con https completo, textos sin espacios de más), o null si no sirve. */
export function normalizeSupportMethod(m: { kind: SupportKind; value?: string; label?: string }): SupportMethod | null {
  if (checkSupportMethod(m)) return null
  const value = isCopyKind(m.kind) ? m.value!.trim() : supportHref(m.kind, m.value)!
  const label = (m.label ?? '').trim()
  return label ? { kind: m.kind, value, label } : { kind: m.kind, value }
}

/** Lo guardado en `content.methods`, sólo lo válido y hasta 6 (la página pública no confía en lo guardado). */
export function readSupportMethods(raw: unknown): SupportMethod[] {
  if (!Array.isArray(raw)) return []
  const out: SupportMethod[] = []
  for (const item of raw) {
    if (out.length >= SUPPORT_MAX_METHODS) break
    if (!item || typeof item !== 'object') continue
    const { kind, value, label } = item as Record<string, unknown>
    if (!isSupportKind(kind) || typeof value !== 'string') continue
    const m = normalizeSupportMethod({ kind, value, label: typeof label === 'string' ? label : undefined })
    if (m) out.push(m)
  }
  return out
}
