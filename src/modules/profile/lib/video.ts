// Video embebido (P6): sólo YouTube y Vimeo, a partir del link que pega el dueño.
// Nunca se usa la URL tal cual como src del iframe: se arma desde el id validado.

export interface VideoEmbed {
  provider: 'youtube' | 'vimeo'
  id: string
  /** URL del iframe (YouTube sin cookies) */
  src: string
}

export function parseVideoUrl(raw: unknown): VideoEmbed | null {
  if (typeof raw !== 'string') return null
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^www\.|^m\./, '')

  let yt: string | null = null
  if (host === 'youtu.be') yt = url.pathname.slice(1).split('/')[0]
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') yt = url.searchParams.get('v')
    else {
      const m = /^\/(embed|shorts|live)\/([^/]+)/.exec(url.pathname)
      if (m) yt = m[2]
    }
  }
  if (yt !== null) {
    return /^[A-Za-z0-9_-]{11}$/.test(yt)
      ? { provider: 'youtube', id: yt, src: `https://www.youtube-nocookie.com/embed/${yt}` }
      : null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = /^\/(?:video\/)?(\d{6,12})(?:\/|$)/.exec(url.pathname)
    return m ? { provider: 'vimeo', id: m[1], src: `https://player.vimeo.com/video/${m[1]}?dnt=1` } : null
  }
  return null
}
