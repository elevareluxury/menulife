import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { publicRpc } from '@/lib/publicRpc'

// RPC públicas sin el cliente de Supabase: POST a /rest/v1/rpc, token de la sesión si hay y reintento anónimo si venció.

const store = new Map<string, string>()
const calls: { url: string; auth: string; body: string }[] = []
let replies: { status: number; body: string }[] = []

beforeEach(() => {
  store.clear(); calls.length = 0; replies = []
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null })
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, auth: (init.headers as Record<string, string>).Authorization, body: String(init.body) })
    const r = replies.shift() ?? { status: 200, body: 'null' }
    return new Response(r.body || null, { status: r.status })
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('publicRpc', () => {
  it('sin sesión va con la clave anónima a /rest/v1/rpc/<función>', async () => {
    replies = [{ status: 200, body: '{"ok":true}' }]
    const res = await publicRpc('get_public_profile', { p_username: 'ana' })
    expect(res).toEqual({ data: { ok: true }, error: null })
    expect(calls[0].url).toBe('https://test.supabase.co/rest/v1/rpc/get_public_profile')
    expect(calls[0].auth).toBe('Bearer test')
    expect(JSON.parse(calls[0].body)).toEqual({ p_username: 'ana' })
  })

  it('con sesión manda su token; si venció (401), reintenta anónimo', async () => {
    store.set('sb-test-auth-token', JSON.stringify({ access_token: 'tok', expires_at: Date.now() / 1000 + 3600 }))
    replies = [{ status: 401, body: '{"message":"JWT expired"}' }, { status: 200, body: '"ok"' }]
    const res = await publicRpc('report_profile', {})
    expect(calls.map(c => c.auth)).toEqual(['Bearer tok', 'Bearer test'])
    expect(res.data).toBe('ok')
  })

  it('una sesión vencida en el dispositivo no se manda', async () => {
    store.set('sb-test-auth-token', JSON.stringify({ access_token: 'viejo', expires_at: 1 }))
    await publicRpc('track_profile_event', {})
    expect(calls[0].auth).toBe('Bearer test')
  })

  it('errores de la base y sin red vuelven como error, nunca tiran', async () => {
    replies = [{ status: 400, body: '{"message":"invalid","code":"22023"}' }]
    expect(await publicRpc('subscribe_profile', {})).toEqual({ data: null, error: { message: 'invalid', code: '22023' } })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect((await publicRpc('x', {})).error?.message).toBe('Failed to fetch')
  })

  it('respuesta vacía (204) es data null sin error', async () => {
    replies = [{ status: 204, body: '' }]
    expect(await publicRpc('track_profile_event', {})).toEqual({ data: null, error: null })
  })
})
