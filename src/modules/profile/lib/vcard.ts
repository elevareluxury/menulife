import { saveFile } from '@/lib/nativeFiles'
import type { ContactCard } from './profileApi'

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

/** Línea de vCard plegada a 75 caracteres (la foto en base64 es larga; RFC 2425) */
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts = [line.slice(0, 75)]
  for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74))
  return parts.join('\r\n')
}

export interface VCardExtras {
  /** Foto JPEG en base64 (sin el prefijo data:) */
  photo?: string | null
  /** Links públicos del perfil (web, redes, tienda…) */
  urls?: string[]
}

/** vCard 3.0 sólo con los datos que el dueño autorizó (get_profile_contact_card), su foto y sus links públicos. */
export function buildVCard(card: ContactCard, profileUrl: string, extras: VCardExtras = {}): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  const name = card.name?.trim() || card.username
  lines.push(`FN:${esc(name)}`)
  lines.push(`N:${esc(name)};;;;`)
  if (card.organization) lines.push(`ORG:${esc(card.organization)}`)
  if (card.title) lines.push(`TITLE:${esc(card.title)}`)
  if (card.phone) lines.push(`TEL;TYPE=CELL:${esc(card.phone)}`)
  if (card.whatsapp && card.whatsapp !== card.phone) lines.push(`TEL;TYPE=CELL,WHATSAPP:${esc(card.whatsapp)}`)
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(card.email)}`)
  if (card.website) lines.push(`URL:${esc(card.website)}`)
  lines.push(`URL;TYPE=Mycen:${esc(profileUrl)}`)
  const seen = new Set([card.website, profileUrl])
  for (const url of extras.urls ?? []) {
    if (seen.has(url) || seen.size > 12) continue
    seen.add(url)
    lines.push(`URL:${esc(url)}`)
  }
  if (extras.photo) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${extras.photo}`)
  lines.push('END:VCARD')
  return lines.map(fold).join('\r\n')
}

/** Foto del perfil achicada a 256 px en JPEG (base64) para la tarjeta; si no se puede leer, sin foto */
export async function vcardPhoto(src: string | null | undefined): Promise<string | null> {
  if (!src || typeof createImageBitmap === 'undefined') return null
  try {
    const res = await fetch(src, { mode: 'cors' })
    if (!res.ok) return null
    const bitmap = await createImageBitmap(await res.blob())
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const side = Math.min(bitmap.width, bitmap.height)
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? null
  } catch { return null }
}

export function downloadVCard(card: ContactCard, profileUrl: string, extras: VCardExtras = {}) {
  const blob = new Blob([buildVCard(card, profileUrl, extras)], { type: 'text/vcard;charset=utf-8' })
  void saveFile(blob, `${(card.handle ?? card.username).replace('/', '-')}.vcf`)
}
