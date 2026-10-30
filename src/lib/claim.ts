// "Elegí tu nombre": el campo mycen.id/<nombre> de la landing (arriba y al cierre), del perfil que no existe y del pie
// de cada perfil. Lleva al registro con /register?u=<nombre>&desde=<lugar> (más ref y tipo si vino de un perfil); el
// registro guarda el nombre en la cuenta (claimed_username) y el onboarding lo usa sin volver a preguntarlo (si
// mientras tanto alguien lo tomó, lo pide de nuevo). El nombre es de la persona recién cuando crea su perfil.
import { validUsername } from './username'
import type { Referral } from './referral'

export const CLAIM_PLACES = ['hero', 'cierre', 'perfil', 'pie'] as const
export type ClaimPlace = typeof CLAIM_PLACES[number]

export interface Claim { username: string; from: ClaimPlace | null }

const isPlace = (v: unknown): v is ClaimPlace => typeof v === 'string' && (CLAIM_PLACES as readonly string[]).includes(v)

/** Link al registro con el nombre elegido; si vino del pie de un perfil, conserva a quién atribuirlo. */
export function claimLink(username: string, from: ClaimPlace, referral?: Referral | null): string {
  const q = new URLSearchParams({ u: username, desde: from })
  if (referral) {
    q.set('ref', referral.ref)
    if (referral.purpose) q.set('tipo', referral.purpose)
  }
  return `/register?${q.toString()}`
}

/** Lee ?u y ?desde del registro: sólo un nombre con el formato válido. */
export function parseClaim(search: string): Claim | null {
  const q = new URLSearchParams(search)
  const username = (q.get('u') ?? '').trim().toLowerCase()
  if (!validUsername(username)) return null
  const from = q.get('desde')
  return { username, from: isPlace(from) ? from : null }
}

/** Lo que guardó el registro en los datos de la cuenta (user_metadata.claimed_username / claim_from). */
export function claimFromMetadata(meta: Record<string, unknown> | null | undefined): Claim | null {
  const username = typeof meta?.claimed_username === 'string' ? meta.claimed_username : ''
  if (!validUsername(username)) return null
  return { username, from: isPlace(meta?.claim_from) ? meta.claim_from : null }
}

/** Datos de la cuenta que guarda el registro (con email o al volver de Google). */
export function claimMetadata(claim: Claim | null): Record<string, string> {
  if (!claim) return {}
  return { claimed_username: claim.username, ...(claim.from ? { claim_from: claim.from } : {}) }
}

/** Alternativas cuando el nombre ya está tomado: sólo las que cumplen el formato (la base dice cuáles están libres). */
export function claimSuggestions(username: string, year = new Date().getFullYear()): string[] {
  const base = username.replace(/-+$/, '').slice(0, 26)
  if (!base) return []
  return [...new Set([`${base}-id`, `${base}-me`, `${base}${year % 100}`, `hey-${base}`])]
    .filter(s => s !== username && validUsername(s))
}
