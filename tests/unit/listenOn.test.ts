import { describe, expect, it } from 'vitest'
import {
  checkListenLink, detectListenPlatform, listenHref, LISTEN_MAX_LINKS, LISTEN_PLATFORMS, readListenLinks,
} from '@/modules/profile/lib/listenOn'

const SAMPLES: Record<(typeof LISTEN_PLATFORMS)[number], string[]> = {
  spotify: ['https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC'],
  apple_music: ['https://music.apple.com/ar/album/x/123', 'https://geo.music.apple.com/us/album/x/1'],
  youtube_music: ['https://music.youtube.com/playlist?list=OLAK5uy_x'],
  youtube: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=x'],
  deezer: ['https://www.deezer.com/album/302127', 'https://link.deezer.com/s/abc'],
  tidal: ['https://tidal.com/browse/album/1', 'https://listen.tidal.com/album/1'],
  soundcloud: ['https://soundcloud.com/ana/tema', 'https://on.soundcloud.com/AbCd'],
  amazon_music: ['https://music.amazon.com/albums/B0X', 'https://music.amazon.co.uk/albums/B0X', 'https://music.amazon.de/albums/B0X', 'https://music.amazon.com.br/albums/B0X'],
}

describe('Escuchá en: plataformas', () => {
  it('detecta cada plataforma por su dominio', () => {
    for (const p of LISTEN_PLATFORMS) {
      for (const url of SAMPLES[p]) {
        expect(detectListenPlatform(url), url).toBe(p)
        expect(checkListenLink(url, p), url).toBeNull()
      }
    }
  })

  it('YouTube Music no es YouTube (y al revés)', () => {
    expect(checkListenLink('https://music.youtube.com/watch?v=x', 'youtube')).toBe('wrong_platform')
    expect(checkListenLink('https://www.youtube.com/watch?v=x', 'youtube_music')).toBe('wrong_platform')
  })

  it('rechaza dominios parecidos o de otra plataforma', () => {
    expect(checkListenLink('https://open.spotify.com.evil.com/x', 'spotify')).toBe('wrong_platform')
    expect(checkListenLink('https://spotify.com/album/x', 'spotify')).toBe('wrong_platform')
    expect(checkListenLink('https://apple.com/music/x', 'apple_music')).toBe('wrong_platform')
    expect(checkListenLink('https://music.amazon.evil.com/x', 'amazon_music')).toBe('wrong_platform')
    expect(checkListenLink('https://example.com/song')).toBe('unknown_platform')
    expect(detectListenPlatform('https://bandcamp.com/x')).toBeNull()
  })

  it('exige https y algo después del dominio', () => {
    expect(checkListenLink('http://open.spotify.com/album/x', 'spotify')).toBe('bad_url')
    expect(checkListenLink('https://open.spotify.com/', 'spotify')).toBe('bad_url')
    expect(checkListenLink('javascript:alert(1)')).toBe('bad_url')
    expect(checkListenLink('https://u:p@open.spotify.com/album/x')).toBe('bad_url')
    expect(checkListenLink('')).toBe('empty')
    expect(checkListenLink(undefined)).toBe('empty')
  })

  it('completa https:// cuando falta', () => {
    expect(listenHref('spotify', 'open.spotify.com/track/1')).toBe('https://open.spotify.com/track/1')
  })
})

describe('Escuchá en: lectura de lo guardado', () => {
  it('sólo lo válido, una vez por plataforma y hasta 8', () => {
    const raw = [
      { platform: 'spotify', url: 'https://open.spotify.com/album/1' },
      { platform: 'spotify', url: 'https://open.spotify.com/album/2' },
      { platform: 'deezer', url: 'https://evil.com/album/1' },
      { platform: 'napster', url: 'https://napster.com/x' },
      null,
      ...LISTEN_PLATFORMS.filter(p => p !== 'spotify').map(p => ({ platform: p, url: SAMPLES[p][0] })),
    ]
    const links = readListenLinks(raw)
    expect(links).toHaveLength(LISTEN_MAX_LINKS)
    expect(links[0]).toEqual({ platform: 'spotify', url: 'https://open.spotify.com/album/1' })
    expect(new Set(links.map(l => l.platform)).size).toBe(LISTEN_MAX_LINKS)
  })

  it('sin lista, nada', () => {
    expect(readListenLinks(null)).toEqual([])
  })
})
