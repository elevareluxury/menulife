import type { ContactCard } from './profileApi'

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

/** vCard 3.0 sólo con los datos que el dueño autorizó (get_profile_contact_card). */
export function buildVCard(card: ContactCard, profileUrl: string): string {
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
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export function downloadVCard(card: ContactCard, profileUrl: string) {
  const blob = new Blob([buildVCard(card, profileUrl)], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(card.handle ?? card.username).replace('/', '-')}.vcf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
