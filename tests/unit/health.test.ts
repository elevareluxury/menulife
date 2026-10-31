import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/health'

// /api/health: lo que mira el monitor externo para avisar si la web o la base se caen.
beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test'
})
afterEach(() => vi.unstubAllGlobals())

describe('api/health', () => {
  it('200 cuando la base responde, sin caché', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handler()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toMatchObject({ ok: true, db: 'ok' })
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('/rpc/get_site_flags')
  })

  it('503 cuando la base falla o no contesta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })))
    expect((await handler()).status).toBe(503)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout') }))
    const res = await handler()
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ ok: false, db: 'down' })
  })
})
