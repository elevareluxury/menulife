import { useCallback, useState } from 'react'
import { captchaSiteKey } from '@/lib/turnstile'

// Turnstile en registro, acceso y "olvidé mi contraseña" (src/lib/turnstile.ts; el recuadro es `CaptchaField`). Sin
// clave, `enabled` es false, no se dibuja nada y `token` queda null: los formularios mandan lo mismo que antes.

export type CaptchaStatus = 'off' | 'loading' | 'solved' | 'expired' | 'failed' | 'unavailable'

export interface Captcha {
  enabled: boolean
  siteKey: string | null
  token: string | null
  status: CaptchaStatus
  /** La persona quiso enviar sin token: se muestra por qué (en el recuadro, con aria-live) */
  nudged: boolean
  generation: number
  /** ¿Se puede enviar? Si falta el token, avisa en el recuadro y devuelve false */
  check: () => boolean
  /** Los tokens son de un solo uso: después de cada intento se pide uno nuevo */
  reset: () => void
  onToken: (token: string) => void
  onStatus: (status: CaptchaStatus) => void
}

export function useCaptcha(): Captcha {
  const [siteKey] = useState(() => captchaSiteKey())
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<CaptchaStatus>(siteKey ? 'loading' : 'off')
  const [nudged, setNudged] = useState(false)
  const [generation, setGeneration] = useState(0)

  const reset = useCallback(() => {
    if (!siteKey) return
    setToken(null)
    setStatus('loading')
    setNudged(false)
    setGeneration(g => g + 1)
  }, [siteKey])

  const check = useCallback(() => {
    if (!siteKey || token) return true
    setNudged(true)
    return false
  }, [siteKey, token])

  const onToken = useCallback((t: string) => { setToken(t); setStatus('solved'); setNudged(false) }, [])
  const onStatus = useCallback((s: CaptchaStatus) => { setToken(null); setStatus(s) }, [])

  return { enabled: !!siteKey, siteKey, token, status, nudged, generation, check, reset, onToken, onStatus }
}
