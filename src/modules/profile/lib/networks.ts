export const NETWORK_LABELS: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook',
  whatsapp: 'WhatsApp', linkedin: 'LinkedIn', x: 'X', twitter: 'X',
}

/** Red (o tipo) a partir del link, para el ícono de un link o de una fila de un grupo. Sin coincidencia: '' (inicial). */
const HOST_NETWORK: Array<[RegExp, string]> = [
  [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)(facebook\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'whatsapp'], [/(^|\.)linkedin\.com$/, 'linkedin'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)(maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/, 'maps'],
]
export function networkFromUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (/^mailto:/i.test(url)) return 'email'
  if (/^tel:/i.test(url)) return 'phone'
  try {
    const host = new URL(url).hostname.toLowerCase()
    return HOST_NETWORK.find(([re]) => re.test(host))?.[1] ?? ''
  } catch { return '' }
}
