export const NETWORK_LABELS: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook',
  whatsapp: 'WhatsApp', linkedin: 'LinkedIn', x: 'X', twitter: 'X',
  // Íconos que se bajan a pedido (brandIcons.ts)
  spotify: 'Spotify', applemusic: 'Apple Music', youtubemusic: 'YouTube Music', soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp', tidal: 'TIDAL', twitch: 'Twitch', kick: 'Kick', discord: 'Discord', telegram: 'Telegram',
  signal: 'Signal', pinterest: 'Pinterest', snapchat: 'Snapchat', threads: 'Threads', bluesky: 'Bluesky',
  mastodon: 'Mastodon', reddit: 'Reddit', github: 'GitHub', behance: 'Behance', dribbble: 'Dribbble', medium: 'Medium',
  substack: 'Substack', patreon: 'Patreon', kofi: 'Ko-fi', paypal: 'PayPal', mercadopago: 'Mercado Pago', etsy: 'Etsy',
  shopify: 'Shopify', tripadvisor: 'Tripadvisor', calendly: 'Calendly', vimeo: 'Vimeo', line: 'LINE',
  kakaotalk: 'KakaoTalk', vk: 'VK', wechat: 'WeChat',
}

/** Redes con ícono en brandIcons.ts (chunk aparte, se baja sólo si el perfil las usa) */
export const LAZY_BRANDS: ReadonlySet<string> = new Set([
  'spotify', 'applemusic', 'youtubemusic', 'soundcloud', 'bandcamp', 'tidal', 'twitch', 'kick', 'discord', 'telegram',
  'signal', 'pinterest', 'snapchat', 'threads', 'bluesky', 'mastodon', 'reddit', 'github', 'behance', 'dribbble',
  'medium', 'substack', 'patreon', 'kofi', 'paypal', 'mercadopago', 'etsy', 'shopify', 'tripadvisor', 'calendly',
  'vimeo', 'line', 'kakaotalk', 'vk', 'wechat',
])

/** Red (o tipo) a partir del link, para el ícono de un link o de una fila de un grupo. Sin coincidencia: '' (inicial). */
const HOST_NETWORK: Array<[RegExp, string]> = [
  // Antes que YouTube: music.youtube.com es YouTube Music
  [/(^|\.)music\.youtube\.com$/, 'youtubemusic'],
  [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)(facebook\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'whatsapp'], [/(^|\.)linkedin\.com$/, 'linkedin'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)(open\.)?spotify\.com$|(^|\.)spoti\.fi$/, 'spotify'], [/(^|\.)music\.apple\.com$/, 'applemusic'],
  [/(^|\.)(soundcloud\.com|on\.soundcloud\.com)$/, 'soundcloud'], [/(^|\.)bandcamp\.com$/, 'bandcamp'],
  [/(^|\.)(tidal\.com|listen\.tidal\.com)$/, 'tidal'], [/(^|\.)twitch\.tv$/, 'twitch'], [/(^|\.)kick\.com$/, 'kick'],
  [/(^|\.)(discord\.gg|discord\.com)$/, 'discord'], [/(^|\.)(t\.me|telegram\.me|telegram\.org)$/, 'telegram'],
  [/(^|\.)signal\.(me|group)$/, 'signal'], [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, 'pinterest'],
  [/(^|\.)snapchat\.com$/, 'snapchat'], [/(^|\.)threads\.(net|com)$/, 'threads'], [/(^|\.)bsky\.app$/, 'bluesky'],
  [/(^|\.)(mastodon\.social|mastodon\.online|mstdn\.social)$/, 'mastodon'], [/(^|\.)(reddit\.com|redd\.it)$/, 'reddit'],
  [/(^|\.)github\.com$/, 'github'], [/(^|\.)behance\.net$/, 'behance'], [/(^|\.)dribbble\.com$/, 'dribbble'],
  [/(^|\.)medium\.com$/, 'medium'], [/(^|\.)substack\.com$/, 'substack'], [/(^|\.)patreon\.com$/, 'patreon'],
  [/(^|\.)ko-fi\.com$/, 'kofi'], [/(^|\.)(paypal\.com|paypal\.me)$/, 'paypal'],
  [/(^|\.)(mercadopago\.com(\.[a-z]{2})?|mpago\.la|mpago\.li|link\.mercadopago\.com(\.[a-z]{2})?)$/, 'mercadopago'],
  [/(^|\.)(etsy\.com|etsy\.me)$/, 'etsy'], [/(^|\.)myshopify\.com$/, 'shopify'],
  [/(^|\.)tripadvisor\.[a-z.]+$/, 'tripadvisor'], [/(^|\.)calendly\.com$/, 'calendly'], [/(^|\.)vimeo\.com$/, 'vimeo'],
  [/(^|\.)(line\.me|lin\.ee)$/, 'line'], [/(^|\.)(open\.kakao\.com|pf\.kakao\.com)$/, 'kakaotalk'],
  [/(^|\.)(vk\.com|vk\.ru)$/, 'vk'], [/(^|\.)weixin\.qq\.com$/, 'wechat'],
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
