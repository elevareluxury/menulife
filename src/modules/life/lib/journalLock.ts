// Diario privado · bloqueo en el dispositivo.
//
// Qué protege: que alguien que agarra el celular (con la sesión abierta) lea el diario. No cifra las entradas: siguen
// en la cuenta, protegidas como el resto de Life OS (sólo la dueña las lee). Todo esto vive en el dispositivo.
//
// · PIN de 4–8 dígitos: se guarda sólo un hash con sal (PBKDF2-SHA-256 de WebCrypto, 600.000 vueltas), nunca el PIN.
// · Reintentos: los primeros 2 errores no esperan; desde el 3.º, 30 s que se duplican hasta 15 min. Se recuerda al
//   recargar (va en el mismo registro).
// · Huella o cara (WebAuthn con autenticador del dispositivo): sólo confirma que está la dueña; la credencial queda en
//   el celular y no se verifica en ningún servidor. Siempre hay PIN de respaldo.
// · Se vuelve a bloquear al salir del Diario, al pasar a segundo plano y tras 5 minutos sin uso (IDLE_MS).
//
// Sin DOM salvo las funciones de WebAuthn y el almacenamiento (que se pueden pasar en los tests).

import { isNativeApp } from '@/lib/platform'

export const PIN_MIN = 4
export const PIN_MAX = 8
export const PBKDF2_ITERATIONS = 600_000
export const IDLE_MS = 5 * 60_000
/** Errores seguidos sin espera; el siguiente ya espera. */
export const FREE_ATTEMPTS = 2
const FIRST_WAIT_MS = 30_000
const MAX_WAIT_MS = 15 * 60_000

export interface JournalLock {
  v: 1
  /** Sal y hash del PIN en base64 */
  salt: string
  hash: string
  iterations: number
  /** Id de la credencial de la huella/cara (base64url) o null si sólo hay PIN */
  credentialId: string | null
  /** Errores seguidos y hasta cuándo hay que esperar (ms desde 1970) */
  failures: number
  lockedUntil: number
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin)
}

/** Espera después de `failures` errores seguidos: 0, 0, 30 s, 1 min, 2 min, 4 min, 8 min, 15 min… */
export function waitAfter(failures: number): number {
  if (failures <= FREE_ATTEMPTS) return 0
  return Math.min(FIRST_WAIT_MS * 2 ** (failures - FREE_ATTEMPTS - 1), MAX_WAIT_MS)
}

export function remainingWait(lock: JournalLock, now: number): number {
  return Math.max(0, lock.lockedUntil - now)
}

export function isIdle(lastActivity: number, now: number): boolean {
  return now - lastActivity >= IDLE_MS
}

// ── Hash ─────────────────────────────────────────────────────────────────────

function toB64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export async function hashPin(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256)
  return toB64(new Uint8Array(bits))
}

/** Comparación sin cortar en la primera diferencia */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Arma el registro del bloqueo a partir del PIN (que no se guarda). */
export async function createLock(pin: string, opts: { iterations?: number; credentialId?: string | null } = {}): Promise<JournalLock> {
  if (!isValidPin(pin)) throw new Error('invalid_pin')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iterations = opts.iterations ?? PBKDF2_ITERATIONS
  return { v: 1, salt: toB64(salt), hash: await hashPin(pin, salt, iterations), iterations, credentialId: opts.credentialId ?? null, failures: 0, lockedUntil: 0 }
}

export type PinCheck = { ok: true; lock: JournalLock } | { ok: false; lock: JournalLock; waitMs: number }

/**
 * Prueba un PIN. Si todavía hay que esperar, ni lo mira. Devuelve el registro actualizado (errores y espera) para
 * guardarlo.
 */
export async function checkPin(lock: JournalLock, pin: string, now: number): Promise<PinCheck> {
  const wait = remainingWait(lock, now)
  if (wait > 0) return { ok: false, lock, waitMs: wait }
  const hash = isValidPin(pin) ? await hashPin(pin, fromB64(lock.salt), lock.iterations) : ''
  if (hash && sameText(hash, lock.hash)) return { ok: true, lock: unlocked(lock) }
  const failures = lock.failures + 1
  const waitMs = waitAfter(failures)
  return { ok: false, lock: { ...lock, failures, lockedUntil: waitMs ? now + waitMs : 0 }, waitMs }
}

/** Después de desbloquear (con el PIN o la huella): sin errores ni espera. */
export function unlocked(lock: JournalLock): JournalLock {
  return { ...lock, failures: 0, lockedUntil: 0 }
}

// ── Guardado en el dispositivo ───────────────────────────────────────────────

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const lockKey = (userId: string) => `mycen_journal_lock:${userId}`

function defaultStorage(): KV | null {
  try { return window.localStorage } catch { return null }
}

function parseLock(raw: string | null): JournalLock | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<JournalLock>
    if (v?.v !== 1 || typeof v.salt !== 'string' || typeof v.hash !== 'string' || !Number.isInteger(v.iterations) || (v.iterations ?? 0) < 1) return null
    return {
      v: 1, salt: v.salt, hash: v.hash, iterations: v.iterations as number,
      credentialId: typeof v.credentialId === 'string' ? v.credentialId : null,
      failures: Number.isInteger(v.failures) && (v.failures ?? 0) > 0 ? v.failures as number : 0,
      lockedUntil: typeof v.lockedUntil === 'number' && v.lockedUntil > 0 ? v.lockedUntil : 0,
    }
  } catch { return null }
}

export function readLock(userId: string, storage: KV | null = defaultStorage()): JournalLock | null {
  try { return parseLock(storage?.getItem(lockKey(userId)) ?? null) } catch { return null }
}

export function writeLock(userId: string, lock: JournalLock | null, storage: KV | null = defaultStorage()): void {
  try {
    if (lock) storage?.setItem(lockKey(userId), JSON.stringify(lock))
    else storage?.removeItem(lockKey(userId))
  } catch { /* sin almacenamiento: el bloqueo no se puede activar en este navegador */ }
}

// ── Huella o cara (WebAuthn) ─────────────────────────────────────────────────

function b64url(bytes: ArrayBuffer): string {
  return toB64(new Uint8Array(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return fromB64(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
}

/** ¿El dispositivo tiene huella, cara o bloqueo de pantalla que pueda confirmar quién es? */
export async function deviceUnlockAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !window.isSecureContext) return false
    // En la app (capacitor://localhost) WebAuthn no tiene un dominio propio: queda sólo el PIN
    if (isNativeApp()) return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

/** Crea la credencial en el dispositivo. Devuelve su id o null si la persona cancela o no se puede. */
export async function registerDeviceCredential(displayName: string): Promise<string | null> {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Mycen' },
        // Un id al azar: no hace falta (ni conviene) que sea el de la cuenta
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: displayName, displayName },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        timeout: 60_000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null
    return cred ? b64url(cred.rawId) : null
  } catch { return null }
}

/** Pide la huella o la cara. true si el dispositivo confirmó a la persona. */
export async function verifyDeviceCredential(credentialId: string): Promise<boolean> {
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: fromB64url(credentialId) as BufferSource, transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return !!cred
  } catch { return false }
}
