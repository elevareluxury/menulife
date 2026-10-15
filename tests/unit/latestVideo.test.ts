import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/youtube-latest'
import {
  channelQuery, cleanTitle, decodeXml, extractChannelId, inspectChannelUrl, parseYoutubeFeed, sanitizeLatestResponse, TITLE_MAX,
} from '../../src/modules/profile/lib/latestVideo'

// "Último video": link del canal (Studio), feed público de YouTube (función Edge) y respuesta (navegador).

const CH = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=${CH}"/>
 <id>yt:channel:x5XG1OV2P6uZZ5FSM9Ttw</id>
 <yt:channelId>x5XG1OV2P6uZZ5FSM9Ttw</yt:channelId>
 <title>Canal de Ana</title>
 <entry>
  <id>yt:video:aaaaaaaaaa1</id>
  <yt:videoId>aaaaaaaaaa1</yt:videoId>
  <title>Pan &amp; café &#8212; parte 2 &lt;b&gt;</title>
  <published>2026-10-10T12:00:00+00:00</published>
  <media:group><media:title>Otro título</media:title></media:group>
 </entry>
 <entry>
  <id>yt:video:bbbbbbbbbb2</id>
  <yt:videoId>bbbbbbbbbb2</yt:videoId>
  <title>Más nuevo &#x1F600;</title>
  <published>2026-10-12T09:30:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>"><script>x</script></yt:videoId>
  <title>Malicioso</title>
 </entry>
 <entry>
  <yt:videoId>ccccccccc-3</yt:videoId>
  <title><![CDATA[Con <cdata> & cosas]]></title>
  <published>no es fecha</published>
 </entry>
 <entry>
  <yt:videoId>aaaaaaaaaa1</yt:videoId>
  <title>Repetido</title>
  <published>2026-10-11T00:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>dddddddddd4</yt:videoId>
  <title>Viejo</title>
  <published>2026-01-01T00:00:00+00:00</published>
 </entry>
</feed>`

describe('link del canal', () => {
  it.each([
    ['https://www.youtube.com/@anaperez', { handle: '@anaperez' }],
    ['https://youtube.com/@ana.perez_1/videos', { handle: '@ana.perez_1' }],
    ['https://m.youtube.com/@ana-perez/featured?si=abc', { handle: '@ana-perez' }],
    ['youtube.com/@anaperez', { handle: '@anaperez' }],
    ['@anaperez', { handle: '@anaperez' }],
    [`https://www.youtube.com/channel/${CH}`, { channel_id: CH }],
    [`https://www.youtube.com/channel/${CH}/streams`, { channel_id: CH }],
    [CH, { channel_id: CH }],
  ])('%s → canal', (url, ref) => {
    expect(inspectChannelUrl(url)).toEqual({ ref })
  })

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['https://youtu.be/dQw4w9WgXcQ', 'not_channel'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'not_channel'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'not_channel'],
    ['https://www.youtube.com/c/AnaPerez', 'legacy'],
    ['https://www.youtube.com/user/anaperez', 'legacy'],
    ['https://www.youtube.com/@ab', 'invalid'],
    ['https://www.youtube.com/@ana/videos/extra', 'invalid'],
    ['https://www.youtube.com/@ana%22onload', 'invalid'],
    ['https://www.youtube.com/channel/UC123', 'invalid'],
    ['https://evil.com/@anaperez', 'invalid'],
    ['https://www.youtube.com.evil.com/@anaperez', 'invalid'],
    ['javascript:alert(1)//youtube.com/@anaperez', 'invalid'],
    ['https://www.youtube.com/@anaperez/secret', 'invalid'],
  ])('%s → %s', (url, error) => {
    expect(inspectChannelUrl(url)).toEqual({ error })
  })

  it('la consulta al servidor se arma sólo con lo validado', () => {
    expect(channelQuery({ channel_id: CH, handle: '@ana' })).toBe(`channel=${CH}`)
    expect(channelQuery({ handle: '@ana.perez' })).toBe('handle=%40ana.perez')
    expect(channelQuery({ handle: '@ana&channel=x' })).toBeNull()
    expect(channelQuery({ channel_id: 'UCnope' })).toBeNull()
    expect(channelQuery({})).toBeNull()
    expect(channelQuery(null)).toBeNull()
  })
})

describe('feed de YouTube', () => {
  it('lee id, título y fecha; el más nuevo primero, sin ids inválidos ni repetidos', () => {
    const videos = parseYoutubeFeed(FEED, 3)
    expect(videos).toEqual([
      { id: 'bbbbbbbbbb2', title: 'Más nuevo 😀', published: '2026-10-12T09:30:00.000Z' },
      { id: 'aaaaaaaaaa1', title: 'Pan & café — parte 2 <b>', published: '2026-10-10T12:00:00.000Z' },
      { id: 'dddddddddd4', title: 'Viejo', published: '2026-01-01T00:00:00.000Z' },
    ])
  })

  it('lo que no tiene fecha va al final; nunca más de 3', () => {
    const all = parseYoutubeFeed(FEED, 10)
    expect(all).toHaveLength(3)
    expect(parseYoutubeFeed(FEED, 1).map(v => v.id)).toEqual(['bbbbbbbbbb2'])
    const cdata = parseYoutubeFeed('<feed><entry><yt:videoId>ccccccccc-3</yt:videoId><title><![CDATA[Con <cdata> &amp; cosas]]></title></entry></feed>')
    expect(cdata).toEqual([{ id: 'ccccccccc-3', title: 'Con <cdata> &amp; cosas', published: '' }])
  })

  it('entradas basura o vacías no rompen', () => {
    expect(parseYoutubeFeed('')).toEqual([])
    expect(parseYoutubeFeed('<html>no</html>')).toEqual([])
    expect(parseYoutubeFeed(undefined as unknown as string)).toEqual([])
    expect(parseYoutubeFeed('<entry><yt:videoId>short</yt:videoId></entry>')).toEqual([])
  })

  it('decodifica entidades y descarta las peligrosas', () => {
    expect(decodeXml('&amp;lt; &quot;a&quot; &apos;b&apos; &#65;&#x42;')).toBe('&lt; "a" \'b\' AB')
    expect(decodeXml('&#0;&#xD800;&#x110000;&nbsp;')).toBe('&nbsp;')
  })

  it('limpia controles, direcciones forzadas y corta títulos largos', () => {
    expect(cleanTitle('a\u0000b\u202Ec\n\nd')).toBe('a b c d')
    const long = cleanTitle('x'.repeat(500))
    expect(Array.from(long)).toHaveLength(TITLE_MAX)
    expect(long.endsWith('…')).toBe(true)
    expect(cleanTitle(42)).toBe('')
  })

  it('encuentra el id del canal en la página del @usuario', () => {
    expect(extractChannelId(`<head><link rel="canonical" href="https://www.youtube.com/channel/${CH}"></head>"channelId":"UCaaaaaaaaaaaaaaaaaaaaaa"`)).toBe(CH)
    expect(extractChannelId(`{"externalId":"${CH}"}`)).toBe(CH)
    expect(extractChannelId(`{"channelId":"${CH}"}`)).toBe(CH)
    expect(extractChannelId('<html>consent</html>')).toBeNull()
  })
})

describe('respuesta en el navegador', () => {
  it('sólo acepta ids válidos y textos limpios', () => {
    expect(sanitizeLatestResponse({ channel_id: CH, videos: [
      { id: 'aaaaaaaaaa1', title: 'Hola\u202E', published: '2026-10-10T12:00:00Z' },
      { id: 'javascript:', title: 'x' },
      { id: 'bbbbbbbbbb2', title: { no: 1 }, published: 5 },
    ] })).toEqual({ channel_id: CH, videos: [
      { id: 'aaaaaaaaaa1', title: 'Hola', published: '2026-10-10T12:00:00.000Z' },
      { id: 'bbbbbbbbbb2', title: '', published: '' },
    ] })
    expect(sanitizeLatestResponse({ channel_id: 'x', videos: [] })).toBeNull()
    expect(sanitizeLatestResponse('<html>')).toBeNull()
    expect(sanitizeLatestResponse(null)).toBeNull()
  })
})

describe('api/youtube-latest', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  const call = (qs: string, method = 'GET') => handler(new Request(`https://mycen.id/api/youtube-latest${qs}`, { method }))
  const page = (body: string, status = 200, url = 'https://www.youtube.com/x') => {
    const res = new Response(body, { status })
    Object.defineProperty(res, 'url', { value: url })
    return res
  }

  it('rechaza consultas mal formadas sin repetirlas', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    for (const qs of ['', '?channel=UC123', '?handle=ana', '?handle=@a', `?channel=${CH}&handle=@anaperez`, '?handle=@<script>alert(1)</script>']) {
      const res = await call(qs)
      expect(res.status).toBe(400)
      const text = await res.text()
      expect(text).toBe('{"error":"bad_request"}')
    }
    expect((await call(`?channel=${CH}`, 'POST')).status).toBe(405)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('con el id del canal lee el feed y responde con caché de 30 minutos', async () => {
    const fetchSpy = vi.fn(async (url: string) => page(FEED, 200, url))
    vi.stubGlobal('fetch', fetchSpy)
    const res = await call(`?channel=${CH}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('s-maxage=1800')
    expect(res.headers.get('cache-control')).toContain('stale-while-revalidate=86400')
    const body = await res.json()
    expect(body.channel_id).toBe(CH)
    expect(body.videos.map((v: { id: string }) => v.id)).toEqual(['bbbbbbbbbb2', 'aaaaaaaaaa1', 'dddddddddd4'])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toBe(`https://www.youtube.com/feeds/videos.xml?channel_id=${CH}`)
  })

  it('con un @usuario busca el canal en su página y después el feed', async () => {
    const fetchSpy = vi.fn(async (url: string) => (url.includes('/feeds/')
      ? page(FEED, 200, url)
      : page(`<html><head><link rel="canonical" href="https://www.youtube.com/channel/${CH}"></head>`, 200, url)))
    vi.stubGlobal('fetch', fetchSpy)
    const res = await call('?handle=@anaperez')
    expect(res.status).toBe(200)
    expect((await res.json()).channel_id).toBe(CH)
    expect(fetchSpy.mock.calls[0][0]).toBe('https://www.youtube.com/@anaperez')
  })

  it('canal inexistente → 404; YouTube caído o desvío a otra página → 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => page('', 404, url)))
    expect((await call('?handle=@nadie123')).status).toBe(404)
    vi.stubGlobal('fetch', vi.fn(async (url: string) => page('<html></html>', 200, url)))
    expect((await call('?handle=@sincanal')).status).toBe(404)
    vi.stubGlobal('fetch', vi.fn(async (url: string) => page('oops', 500, url)))
    const down = await call(`?channel=${CH}`)
    expect(down.status).toBe(502)
    expect(down.headers.get('cache-control')).toBe('no-store')
    vi.stubGlobal('fetch', vi.fn(async () => page('<html>', 200, 'https://consent.youtube.com/m?continue=x')))
    expect((await call(`?channel=${CH}`)).status).toBe(502)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout') }))
    expect((await call(`?channel=${CH}`)).status).toBe(502)
  })
})
