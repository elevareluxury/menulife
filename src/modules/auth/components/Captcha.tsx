import { useEffect, useRef, useState } from 'react'
import type { AuthDict } from '@/i18n/app/auth'
import { useAppLang } from '@/i18n/app/store'
import { loadTurnstile, turnstileLanguage, turnstileTheme } from '@/lib/turnstile'
import type { Captcha } from '@/modules/auth/lib/useCaptcha'

/** El recuadro de Turnstile + el aviso si falla, vence o no carga (con "Reintentar" de 44 px) */
export function CaptchaField({ captcha, t }: { captcha: Captcha; t: AuthDict['captcha'] }) {
  const box = useRef<HTMLDivElement>(null)
  const lang = useAppLang(s => s.lang)
  const [light, setLight] = useState(false)
  const { siteKey, generation, onToken, onStatus, reset } = captcha

  useEffect(() => {
    const el = box.current
    if (!siteKey || !el) return
    let cancelled = false
    let widget: string | undefined
    let api: Awaited<ReturnType<typeof loadTurnstile>> | undefined
    const theme = turnstileTheme(el)
    setLight(theme === 'light')
    loadTurnstile().then(ts => {
      if (cancelled) return
      api = ts
      widget = ts.render(el, {
        sitekey: siteKey,
        theme,
        language: turnstileLanguage(lang),
        // El widget "flexible" mide al menos 300 px: en pantallas angostas va el compacto
        size: el.clientWidth >= 300 ? 'flexible' : 'compact',
        callback: onToken,
        'error-callback': () => { onStatus('failed'); return true },
        // Vence a los 5 minutos: Turnstile lo renueva solo y mientras tanto se avisa
        'expired-callback': () => onStatus('expired'),
        'timeout-callback': () => onStatus('failed'),
        'refresh-expired': 'auto',
        retry: 'auto',
      })
    }).catch(() => { if (!cancelled) onStatus('unavailable') })
    return () => {
      cancelled = true
      if (api && widget) api.remove(widget)
    }
  }, [siteKey, generation, lang, onToken, onStatus])

  if (!siteKey) return null
  const { status, nudged } = captcha
  const message =
    status === 'unavailable' ? t.unavailable
    : status === 'failed' ? t.failed
    : status === 'expired' ? t.expired
    : nudged && status !== 'solved' ? t.pending
    : ''
  const canRetry = status === 'unavailable' || status === 'failed'

  return (
    <div role="group" aria-label={t.label} data-testid="captcha" data-status={status}>
      {/* Lugar reservado (65 px = alto del widget) para que el formulario no salte cuando aparece */}
      <div ref={box} style={{ minHeight: status === 'unavailable' ? 0 : 65, display: 'flex', justifyContent: 'center' }} />
      <div aria-live="polite" style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', lineHeight: 1.5 }}>
        {message && <p style={{ margin: '6px 0 0', color: light ? '#B42318' : '#FFB4A6' }}>{message}</p>}
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '8px', minHeight: 44, minWidth: 44, padding: '0 16px', borderRadius: '10px',
            border: `1px solid ${light ? 'rgba(26,21,48,0.3)' : 'rgba(255,255,255,0.3)'}`, background: 'transparent',
            color: light ? '#1A1530' : '#fff', fontFamily: 'var(--font-jakarta)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t.retry}
        </button>
      )}
    </div>
  )
}
