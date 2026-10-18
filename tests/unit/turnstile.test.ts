import { describe, expect, it } from 'vitest'
import { captchaMissingInApp, captchaSiteKey, turnstileLanguage, turnstileTheme, withCaptcha } from '../../src/lib/turnstile'
import { authErrorMessage, isCaptchaError } from '../../src/lib/authErrors'
import es from '../../src/i18n/app/auth/es'

// CAPTCHA del acceso (Turnstile): sin clave no cambia nada; con clave se manda el token. En la app sólo si se pidió.
const web = { native: false, platform: 'web' as const }

describe('captchaSiteKey', () => {
  it('sin clave (o vacía) no hay widget', () => {
    expect(captchaSiteKey({ ...web })).toBeNull()
    expect(captchaSiteKey({ ...web, siteKey: '  ' })).toBeNull()
  })
  it('con clave, en la web se muestra', () => {
    expect(captchaSiteKey({ ...web, siteKey: '0x4AAA' })).toBe('0x4AAA')
  })
  it('en la app no se muestra salvo que la plataforma esté en VITE_TURNSTILE_IN_APP', () => {
    const ios = { siteKey: '0x4AAA', native: true, platform: 'ios' as const }
    expect(captchaSiteKey(ios)).toBeNull()
    expect(captchaMissingInApp(ios)).toBe(true)
    expect(captchaSiteKey({ ...ios, inApp: 'android' })).toBeNull()
    expect(captchaSiteKey({ ...ios, inApp: 'android, iOS' })).toBe('0x4AAA')
    expect(captchaMissingInApp({ ...ios, inApp: 'ios' })).toBe(false)
    expect(captchaMissingInApp({ native: true, platform: 'ios' })).toBe(false)
  })
})

describe('withCaptcha', () => {
  it('sin token las opciones de Supabase quedan iguales (sin captchaToken)', () => {
    const opts = { redirectTo: 'https://mycen.id/auth/callback' }
    expect(withCaptcha(opts, null)).toEqual(opts)
    expect('captchaToken' in withCaptcha(opts, undefined)).toBe(false)
    expect('captchaToken' in withCaptcha({}, '')).toBe(false)
  })
  it('con token se agrega captchaToken', () => {
    expect(withCaptcha({ redirectTo: 'x' }, 'tok')).toEqual({ redirectTo: 'x', captchaToken: 'tok' })
  })
})

describe('idioma y tema del widget', () => {
  it('los 12 idiomas van con su código de 2 letras', () => {
    for (const l of ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru']) expect(turnstileLanguage(l)).toBe(l)
    expect(turnstileLanguage('')).toBe('auto')
  })
  it('Amanecer = claro; Universo o sin tema = oscuro', () => {
    const el = (theme: string | null) => ({ closest: () => theme ? { getAttribute: () => theme } : null }) as unknown as Element
    expect(turnstileTheme(el('amanecer'))).toBe('light')
    expect(turnstileTheme(el('universo'))).toBe('dark')
    expect(turnstileTheme(el(null))).toBe('dark')
    expect(turnstileTheme(null)).toBe('dark')
  })
})

describe('error de CAPTCHA de Supabase', () => {
  it('"captcha verification process failed" se explica (no el genérico)', () => {
    const err = { code: 'captcha_failed', message: 'captcha verification process failed', status: 400 }
    expect(isCaptchaError(err)).toBe(true)
    expect(isCaptchaError({ message: 'Invalid login credentials' })).toBe(false)
    expect(isCaptchaError(null)).toBe(false)
    expect(authErrorMessage(err, es.errors, 'x')).toBe(es.errors.captcha)
    expect(authErrorMessage({ message: 'captcha verification process failed' }, es.errors, 'x')).toBe(es.errors.captcha)
  })
})
