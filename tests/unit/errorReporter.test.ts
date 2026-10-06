import { describe, expect, it } from 'vitest'
import { areaFromPath, browserLabel, isNoise } from '../../src/lib/errorReporter'

// Lanzamiento L5: cómo se clasifica un error antes de mandarlo (sin datos personales).

describe('errorReporter', () => {
  it('saca la zona de la ruta', () => {
    expect(areaFromPath('/')).toBe('landing')
    expect(areaFromPath('/studio/modules')).toBe('studio')
    expect(areaFromPath('/life/brain')).toBe('life')
    expect(areaFromPath('/dashboard/menu')).toBe('business')
    expect(areaFromPath('/register')).toBe('auth')
    expect(areaFromPath('/super-admin/errores')).toBe('admin')
    expect(areaFromPath('/ana')).toBe('profile')
    expect(areaFromPath('/ana/projects/cafe')).toBe('profile')
  })

  it('el navegador queda en familia, versión mayor y sistema', () => {
    expect(browserLabel('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36'))
      .toBe('Chrome 128 · Android')
    expect(browserLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'))
      .toBe('Safari 18 · iOS')
    expect(browserLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0'))
      .toBe('Edge 129 · Windows')
    expect(browserLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0')).toBe('Firefox 131 · macOS')
  })

  it('descarta el ruido', () => {
    expect(isNoise('Script error.')).toBe(true)
    expect(isNoise('ResizeObserver loop limit exceeded')).toBe(true)
    expect(isNoise('AbortError: The user aborted a request.')).toBe(true)
    expect(isNoise('TypeError: x', 'at f (chrome-extension://abc/content.js:1:1)')).toBe(true)
    expect(isNoise('TypeError: x is undefined', 'at f (https://mycen.id/assets/index.js:1:1)')).toBe(false)
  })
})
