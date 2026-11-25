import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetStoredSession, sessionKeys, signOutDevice } from '../../src/lib/signOutDevice'

// Cerrar sesión sin red: supabase-js devuelve el error y NO borra la sesión guardada (auditoría C6)
class MemoryStorage {
  data = new Map<string, string>()
  getItem(k: string) { return this.data.get(k) ?? null }
  setItem(k: string, v: string) { this.data.set(k, v) }
  removeItem(k: string) { this.data.delete(k) }
}

const KEY = 'sb-demo-auth-token'
let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  for (const k of sessionKeys(KEY)) storage.setItem(k, 'x')
  storage.setItem('otra-cosa', 'queda')
  vi.stubGlobal('window', { localStorage: storage })
})
afterEach(() => { vi.unstubAllGlobals() })

function fakeClient(result: { error: unknown } | Error) {
  const stopAutoRefresh = vi.fn()
  return {
    stopAutoRefresh,
    client: {
      auth: {
        storageKey: KEY,
        stopAutoRefresh,
        signOut: vi.fn(async () => { if (result instanceof Error) throw result; return result }),
      },
    } as never,
  }
}

describe('signOutDevice', () => {
  it('con el servidor respondiendo no toca nada más', async () => {
    const { client, stopAutoRefresh } = fakeClient({ error: null })
    expect(await signOutDevice(client)).toBe(true)
    expect(stopAutoRefresh).not.toHaveBeenCalled()
  })

  it('sin red borra la sesión del dispositivo (sesión, verificador y usuario) y avisa que hay que recargar', async () => {
    const { client, stopAutoRefresh } = fakeClient({ error: { name: 'AuthRetryableFetchError', status: 0 } })
    expect(await signOutDevice(client)).toBe(false)
    expect(stopAutoRefresh).toHaveBeenCalled()
    for (const k of sessionKeys(KEY)) expect(storage.getItem(k)).toBeNull()
    expect(storage.getItem('otra-cosa')).toBe('queda')
  })

  it('si signOut tira una excepción, también', async () => {
    const { client } = fakeClient(new Error('fetch failed'))
    expect(await signOutDevice(client)).toBe(false)
    expect(storage.getItem(KEY)).toBeNull()
  })

  it('forgetStoredSession devuelve las claves borradas', async () => {
    expect(await forgetStoredSession(KEY)).toEqual([KEY, `${KEY}-code-verifier`, `${KEY}-user`])
  })
})
