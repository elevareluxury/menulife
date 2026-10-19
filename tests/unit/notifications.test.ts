import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Avisos del sistema (src/lib/notifications.ts): en el celular `new Notification()` tira error y sólo se pueden mostrar
// desde el service worker. Antes el recordatorio quedaba marcado como enviado y no aparecía nada.

type Shown = { title: string; opts: NotificationOptions }

function setup({ permission = 'granted', sw = true, ctorThrows = false } = {}) {
  const shown: Shown[] = []
  const built: string[] = []
  const reg = { showNotification: vi.fn(async (title: string, opts: NotificationOptions) => { shown.push({ title, opts }) }) }
  const Notif = function (this: unknown, title: string) {
    if (ctorThrows) throw new TypeError('Illegal constructor')
    built.push(title)
  } as unknown as typeof Notification
  Object.defineProperty(Notif, 'permission', { value: permission })
  vi.stubGlobal('Notification', Notif)
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
  vi.stubGlobal('navigator', sw
    ? { serviceWorker: { register: vi.fn(async () => reg), ready: Promise.resolve(reg) } }
    : {})
  return { shown, built, reg }
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('showSystemNotification', () => {
  it('con service worker, el aviso sale desde ahí con su pantalla de destino', async () => {
    const { shown, built } = setup({ ctorThrows: true })
    const { showSystemNotification } = await import('@/lib/notifications')
    expect(await showSystemNotification('Pagar la luz', { body: 'Hoy', tag: 't1', url: '/life/brain?vista=tareas' })).toBe(true)
    expect(shown).toHaveLength(1)
    expect(shown[0].title).toBe('Pagar la luz')
    expect(shown[0].opts).toMatchObject({ body: 'Hoy', tag: 't1', data: { url: '/life/brain?vista=tareas' } })
    expect(built).toHaveLength(0)
  })

  it('sin service worker (computadora), usa el aviso del navegador', async () => {
    const { built } = setup({ sw: false })
    const { showSystemNotification } = await import('@/lib/notifications')
    expect(await showSystemNotification('Meditar')).toBe(true)
    expect(built).toEqual(['Meditar'])
  })

  it('si el teléfono no deja mostrarlo, avisa que no salió (para mostrarlo en pantalla)', async () => {
    setup({ sw: false, ctorThrows: true })
    const { showSystemNotification } = await import('@/lib/notifications')
    expect(await showSystemNotification('Meditar')).toBe(false)
  })

  it('sin permiso no muestra nada', async () => {
    const { shown, built } = setup({ permission: 'default' })
    const { showSystemNotification } = await import('@/lib/notifications')
    expect(await showSystemNotification('Meditar')).toBe(false)
    expect(shown).toHaveLength(0)
    expect(built).toHaveLength(0)
  })

  it('registra el service worker una sola vez por carga', async () => {
    setup()
    const { appServiceWorker } = await import('@/lib/notifications')
    await Promise.all([appServiceWorker(), appServiceWorker()])
    expect((navigator as unknown as { serviceWorker: { register: ReturnType<typeof vi.fn> } }).serviceWorker.register).toHaveBeenCalledTimes(1)
  })
})
