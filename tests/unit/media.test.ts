import { describe, expect, it } from 'vitest'
import { inspectMediaUrl, parseMediaUrl } from '@/modules/profile/lib/media'

// V1 · etapa 04: lista cerrada de proveedores; el iframe se arma con el id validado, nunca con la URL pegada.

const err = (u: unknown) => {
  const r = inspectMediaUrl(u)
  return 'error' in r ? r.error : null
}

describe('parseMediaUrl', () => {
  it('YouTube (sin cookies) en sus formas comunes', () => {
    for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtube.com/shorts/dQw4w9WgXcQ']) {
      const e = parseMediaUrl(u)!
      expect(e.provider).toBe('youtube')
      expect(e.kind).toBe('video')
      expect(e.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0')
    }
    expect(err('https://www.youtube.com/watch?v=corto')).toBe('invalid')
    expect(err('https://www.youtube.com/@canal')).toBe('invalid')
  })

  it('Vimeo', () => {
    expect(parseMediaUrl('https://vimeo.com/76979871')!.src).toBe('https://player.vimeo.com/video/76979871?dnt=1&autoplay=1')
    expect(err('https://vimeo.com/usuario')).toBe('invalid')
  })

  it('Spotify: tema, álbum, playlist y podcast', () => {
    const id = '4uLU6hMCjMI75M1A2tKUQC'
    expect(parseMediaUrl(`https://open.spotify.com/track/${id}?si=abc`)).toMatchObject({
      provider: 'spotify', kind: 'music', src: `https://open.spotify.com/embed/track/${id}`, height: 152 })
    expect(parseMediaUrl(`https://open.spotify.com/intl-es/album/${id}`)!.src).toBe(`https://open.spotify.com/embed/album/${id}`)
    expect(parseMediaUrl(`https://open.spotify.com/playlist/${id}`)!.height).toBe(352)
    expect(parseMediaUrl(`https://open.spotify.com/show/${id}`)!.src).toBe(`https://open.spotify.com/embed/show/${id}`)
    expect(parseMediaUrl(`https://open.spotify.com/episode/${id}`)!.height).toBe(152)
    expect(err(`https://open.spotify.com/artist/${id}`)).toBe('invalid')
    expect(err('https://open.spotify.com/track/corto')).toBe('invalid')
    expect(err('https://spotify.link/abc')).toBe('short_link')
  })

  it('SoundCloud: tema y lista', () => {
    const e = parseMediaUrl('https://soundcloud.com/artista/mi-tema')!
    expect(e.provider).toBe('soundcloud')
    expect(e.src.startsWith('https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartista%2Fmi-tema&')).toBe(true)
    expect(parseMediaUrl('https://soundcloud.com/artista/sets/disco')!.height).toBe(400)
    expect(err('https://on.soundcloud.com/AbCd')).toBe('short_link')
    expect(err('https://soundcloud.com/artista')).toBe('invalid')
  })

  it('TikTok', () => {
    expect(parseMediaUrl('https://www.tiktok.com/@ana.design/video/7234567890123456789')).toMatchObject({
      provider: 'tiktok', kind: 'video', src: 'https://www.tiktok.com/embed/v2/7234567890123456789' })
    expect(err('https://vm.tiktok.com/ZMabc/')).toBe('short_link')
    expect(err('https://www.tiktok.com/@ana.design')).toBe('invalid')
  })

  it('rechaza lo que no es de la lista', () => {
    expect(err('')).toBe('empty')
    expect(err(null)).toBe('empty')
    expect(err('no es un link')).toBe('invalid')
    expect(err('javascript:alert(1)')).toBe('invalid')
    expect(err('ftp://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('invalid')
    expect(err('https://evil.com/watch?v=dQw4w9WgXcQ')).toBe('unsupported')
    expect(err('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBe('unsupported')
    expect(err('https://open.spotify.com.evil.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBe('unsupported')
    expect(err('https://notsoundcloud.com/a/b')).toBe('unsupported')
  })

  it('el src siempre es del dominio del proveedor', () => {
    const allowed = /^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com|open\.spotify\.com|w\.soundcloud\.com|www\.tiktok\.com)\//
    for (const u of ['https://youtu.be/dQw4w9WgXcQ', 'https://vimeo.com/76979871', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      'https://soundcloud.com/a-b/c"><script>', 'https://www.tiktok.com/@a/video/7234567890123456789']) {
      const e = parseMediaUrl(u)
      if (e) expect(e.src).toMatch(allowed)
    }
  })
})
