import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCheckedRedirects, MAX_REDIRECTS } from '../../src/lib/checkedFetch'
import { inspectFeedUrl } from '../../src/modules/profile/lib/podcast'

// Pedidos del servidor a links de un perfil (podcast, portadas): cada redirección se valida antes de seguirla.
afterEach(() => vi.unstubAllGlobals())

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } })
const allowHttpsExample = (u: string) => u.startsWith('https://') && new URL(u).hostname.endsWith('example.com')

describe('fetchCheckedRedirects', () => {
  it('sigue redirecciones permitidas (también relativas) y devuelve la última respuesta', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redirect('https://cdn.example.com/feed'))
      .mockResolvedValueOnce(redirect('/feed.xml'))
      .mockResolvedValueOnce(new Response('<rss/>', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await fetchCheckedRedirects('https://example.com/a', {}, allowHttpsExample)
    expect(await res.text()).toBe('<rss/>')
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual(['https://example.com/a', 'https://cdn.example.com/feed', 'https://cdn.example.com/feed.xml'])
    expect(fetchMock.mock.calls.every(c => (c[1] as RequestInit).redirect === 'manual')).toBe(true)
  })

  it('no pide la dirección siguiente si no está permitida', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect('http://169.254.169.254/latest/meta-data'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchCheckedRedirects('https://example.com/a', {}, allowHttpsExample)).rejects.toThrow('redirect_blocked')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it(`corta después de ${MAX_REDIRECTS} redirecciones`, async () => {
    vi.stubGlobal('fetch', vi.fn(async () => redirect('https://example.com/loop')))
    await expect(fetchCheckedRedirects('https://example.com/a', {}, allowHttpsExample)).rejects.toThrow('too_many_redirects')
  })
})

describe('inspectFeedUrl', () => {
  it('rechaza dominios que apuntan a la máquina local o a una IP escrita en el nombre', () => {
    for (const u of ['https://127.0.0.1.nip.io/feed', 'https://10.0.0.1.sslip.io/x', 'https://app.localtest.me/f', 'https://db.internal/f']) {
      expect(inspectFeedUrl(u)).toEqual({ error: 'bad_host' })
    }
    expect(inspectFeedUrl('https://anchor.fm/s/abc/podcast/rss')).toEqual({ url: 'https://anchor.fm/s/abc/podcast/rss' })
  })
})
