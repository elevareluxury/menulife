import { afterEach, describe, expect, it, vi } from 'vitest'
import { speechSupported } from '@/modules/life/hooks/useSpeech'
import { nativePlatform } from '@/lib/platform'

vi.mock('@/lib/platform', async (orig) => ({ ...(await orig<typeof import('@/lib/platform')>()), nativePlatform: vi.fn(() => 'web') }))

// "Dictar" nunca en la app: iOS no declara permisos de micrófono ni de voz en Info.plist (pedirlos cierra la app)
describe('speechSupported', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('en la web, si el navegador tiene reconocimiento de voz', () => {
    vi.stubGlobal('window', { webkitSpeechRecognition: class {} })
    expect(speechSupported()).toBe(true)
    vi.stubGlobal('window', {})
    expect(speechSupported()).toBe(false)
  })

  it('nunca en la app de iOS ni de Android, aunque el WebView traiga el objeto', () => {
    vi.stubGlobal('window', { SpeechRecognition: class {}, webkitSpeechRecognition: class {} })
    for (const p of ['ios', 'android'] as const) {
      vi.mocked(nativePlatform).mockReturnValue(p)
      expect(speechSupported()).toBe(false)
    }
  })
})
