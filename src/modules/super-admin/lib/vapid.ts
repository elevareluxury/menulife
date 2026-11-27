// Avisos push (panel → Estado → "Avisos push"): claves VAPID y la clave del cron, generadas EN ESTE NAVEGADOR con
// WebCrypto. No se mandan a ningún lado ni se guardan. Mismo formato que `npx web-push generate-vapid-keys`, el que
// lee la función life-reminders (npm:web-push): clave pública = punto P-256 sin comprimir (65 bytes, empieza con 0x04)
// en base64url sin relleno (87 caracteres); privada = el escalar `d` (32 bytes) en base64url (43 caracteres).
// Tests: tests/unit/vapid.test.ts (se vuelven a importar y firman/verifican).

export interface VapidKeys { publicKey: string; privateKey: string }

const B64URL = /^[A-Za-z0-9_-]+$/

export function toBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  const clean = text.trim().replace(/=+$/, '')
  if (!clean || !B64URL.test(clean)) return null
  try {
    const raw = atob(clean.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (clean.length % 4)) % 4))
    const out = new Uint8Array(new ArrayBuffer(raw.length))
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

/** Clave pública VAPID con el formato que acepta el navegador (pushManager.subscribe) y web-push */
export function vapidPublicKeyValid(key: string | null | undefined): boolean {
  const bytes = key ? fromBase64Url(key) : null
  return !!bytes && bytes.length === 65 && bytes[0] === 0x04
}

export function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.getRandomValues === 'function'
}

/** Un par nuevo de claves VAPID (ECDSA P-256). La privada sale del JWK (`d`), que ya viene en base64url de 32 bytes. */
export async function generateVapidKeys(subtle: SubtleCrypto = crypto.subtle): Promise<VapidKeys> {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const raw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey))
  const jwk = await subtle.exportKey('jwk', pair.privateKey)
  const d = jwk.d ? fromBase64Url(jwk.d) : null
  if (raw.length !== 65 || raw[0] !== 0x04 || !d || d.length !== 32) throw new Error('unexpected key format')
  return { publicKey: toBase64Url(raw), privateKey: toBase64Url(d) }
}

/** Clave larga al azar para REMINDERS_CRON_SECRET (letras y números: se pega sin problemas en el SQL y en Supabase) */
export function generateCronSecret(length = 40): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const out: string[] = []
  // Sin sesgo: se descartan los bytes que no entran parejo en 62
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
    for (const b of bytes) {
      if (b < 248 && out.length < length) out.push(chars[b % 62])
    }
  }
  return out.join('')
}
