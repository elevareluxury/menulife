import { describe, expect, it } from 'vitest'
import { coverRequestFor, isAllowedCoverUrl } from '../../src/modules/profile/lib/mediaCover'

describe('portada automática de videos y canciones', () => {
  it('YouTube: la imagen grande y, si no existe, la de alta calidad', () => {
    const r = coverRequestFor('https://www.youtube.com/watch?v=dQw4w9WgXcQ')!
    expect(r.source).toEqual({ kind: 'image', urls: ['https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'] })
  })

  it('Spotify, Vimeo, SoundCloud y TikTok: oEmbed del proveedor armado sólo con lo validado', () => {
    expect(coverRequestFor('https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC?si=abc')!.source)
      .toEqual({ kind: 'oembed', endpoint: 'https://open.spotify.com/oembed?url=' + encodeURIComponent('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC') })
    expect(coverRequestFor('https://vimeo.com/76979871')!.source).toMatchObject({ kind: 'oembed', endpoint: expect.stringMatching(/^https:\/\/vimeo\.com\/api\/oembed\.json\?/) })
    expect(coverRequestFor('https://soundcloud.com/artista/tema')!.source).toMatchObject({ kind: 'oembed', endpoint: expect.stringMatching(/^https:\/\/soundcloud\.com\/oembed\?/) })
    expect(coverRequestFor('https://www.tiktok.com/@ana.p/video/7234567890123456789')!.source)
      .toEqual({ kind: 'oembed', endpoint: 'https://www.tiktok.com/oembed?url=' + encodeURIComponent('https://www.tiktok.com/@ana.p/video/7234567890123456789') })
  })

  it('links que el módulo no acepta no piden nada', () => {
    expect(coverRequestFor('https://evil.example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(coverRequestFor('https://spotify.link/abc')).toBeNull()
    expect(coverRequestFor('javascript:alert(1)')).toBeNull()
  })

  it('sólo imágenes de los servidores de cada proveedor, por https', () => {
    for (const ok of ['https://i.ytimg.com/vi/x/hqdefault.jpg', 'https://i.scdn.co/image/ab67', 'https://image-cdn-ak.spotifycdn.com/image/ab',
      'https://i.vimeocdn.com/video/1.jpg', 'https://i1.sndcdn.com/artworks-1.jpg', 'https://p16-sign-va.tiktokcdn.com/x.jpeg']) {
      expect(isAllowedCoverUrl(ok)).toBe(true)
    }
    for (const bad of ['http://i.ytimg.com/vi/x.jpg', 'https://i.ytimg.com.evil.com/x.jpg', 'https://evil.com/i.scdn.co', 'https://user:pw@i.scdn.co/x',
      'https://i.scdn.co:8443/x', 'https://169.254.169.254/latest', 42, null]) {
      expect(isAllowedCoverUrl(bad)).toBe(false)
    }
  })
})
