import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock } from './support/mockSupabase'

// CAPTCHA del acceso (Cloudflare Turnstile). Este archivo corre en el proyecto "captcha" de playwright.config.ts, con la
// app arrancada con VITE_TURNSTILE_SITE_KEY. El script de Cloudflare se reemplaza por uno simulado: dibuja un botón
// "Soy humano" que entrega un token, y deja en window.__ts lo que pidió la app (para vencerlo o hacerlo fallar).

const FAKE_TURNSTILE = `
  (() => {
    const calls = []; let n = 0; const widgets = {}
    window.__ts = { calls, widgets }
    window.turnstile = {
      render(el, o) {
        const id = 'w' + (++n); calls.push({ theme: o.theme, language: o.language, size: o.size, sitekey: o.sitekey })
        const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Soy humano'; b.style.cssText = 'color:#fff;background:#333;min-height:44px'
        b.onclick = () => o.callback('tok-' + id)
        el.appendChild(b); widgets[id] = { o, b }
        return id
      },
      reset() {},
      remove(id) { widgets[id]?.b.remove(); delete widgets[id] },
    }
  })()`

const CORS = { 'access-control-allow-origin': '*' }

async function fakeTurnstile(context: BrowserContext) {
  await context.route('https://challenges.cloudflare.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE_TURNSTILE }))
}

/** El último widget dibujado (vencer, fallar) */
const lastWidget = (page: Page, action: 'expired-callback' | 'error-callback') => page.evaluate(a => {
  const w = (window as unknown as { __ts: { widgets: Record<string, { o: Record<string, () => void> }> } }).__ts.widgets
  const ids = Object.keys(w); w[ids[ids.length - 1]].o[a]()
}, action)

const renders = (page: Page) => page.evaluate(() => (window as unknown as { __ts: { calls: unknown[] } }).__ts.calls.length)

const captchaError = (route: import('@playwright/test').Route) => route.fulfill({
  status: 400, contentType: 'application/json', headers: CORS,
  body: JSON.stringify({ code: 400, error_code: 'captcha_failed', msg: 'captcha verification process failed' }),
})

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('mycen_lang', 'es'))
  await installSupabaseMock(context, createState({}))
})

test('registro: sin resolver no se envía; resuelto, el token viaja a Supabase', async ({ page, context }) => {
  await fakeTurnstile(context)
  let body: { gotrue_meta_security?: { captcha_token?: string } } | null = null
  await page.route('**/auth/v1/signup**', route => {
    body = route.request().postDataJSON()
    return route.fulfill({ status: 422, contentType: 'application/json', headers: CORS,
      body: JSON.stringify({ code: 422, msg: 'User already registered', error_code: 'user_already_exists' }) })
  })
  await page.goto('/register')
  await page.getByLabel('Tu nombre').fill('Ana Pérez')
  await page.getByLabel('Email').fill('ana@example.com')
  await page.getByLabel('Contraseña').fill('secreta123')
  await page.getByRole('checkbox').check()

  const captcha = page.getByRole('group', { name: 'Verificación anti-bots' })
  await expect(captcha.getByRole('button', { name: 'Soy humano' })).toBeVisible()
  // Tema oscuro (pantalla de acceso) e idioma de la persona
  const call = await page.evaluate(() => (window as unknown as { __ts: { calls: Record<string, string>[] } }).__ts.calls[0])
  expect(call).toMatchObject({ theme: 'dark', language: 'es', sitekey: '1x00000000000000000000AA' })

  await page.getByRole('button', { name: 'Crear mi cuenta gratis' }).click()
  await expect(captcha.getByText('Esperá a que termine la verificación anti-bots y volvé a intentar.')).toBeVisible()
  expect(body).toBeNull()

  await captcha.getByRole('button', { name: 'Soy humano' }).click()
  await page.getByRole('button', { name: 'Crear mi cuenta gratis' }).click()
  await expect(page.getByRole('alert')).toHaveText('Ese email ya tiene una cuenta. Iniciá sesión o recuperá tu contraseña.')
  expect(body!.gotrue_meta_security?.captcha_token).toBe('tok-w1')
})

test('registro con el recuadro pasa axe', async ({ page, context }) => {
  await fakeTurnstile(context)
  await page.goto('/register')
  await expect(page.getByRole('group', { name: 'Verificación anti-bots' }).getByRole('button')).toBeVisible()
  // Mismas reglas que auth.spec.ts (WCAG A/AA)
  const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
})

test('acceso: si Supabase rechaza el CAPTCHA se explica y se pide un token nuevo', async ({ page, context }) => {
  await fakeTurnstile(context)
  let token: string | undefined
  await page.route('**/auth/v1/token**', route => {
    token = route.request().postDataJSON()?.gotrue_meta_security?.captcha_token
    return captchaError(route)
  })
  await page.goto('/login')
  await page.getByLabel('Email').fill('ana@example.com')
  await page.getByLabel('Contraseña').fill('secreta123')
  await page.getByRole('button', { name: 'Soy humano' }).click()
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()

  await expect(page.getByRole('alert')).toHaveText('La verificación anti-bots falló o venció. Hacela de nuevo y volvé a intentar.')
  expect(token).toBe('tok-w1')
  // Los tokens son de un solo uso: el widget se vuelve a dibujar y hay que resolverlo otra vez
  await expect.poll(() => renders(page)).toBe(2)
  await page.getByRole('button', { name: 'Soy humano' }).click()
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect.poll(() => token).toBe('tok-w2')
})

test('acceso: si la verificación vence o falla se avisa, con "Reintentar" accesible', async ({ page, context }) => {
  await fakeTurnstile(context)
  await page.goto('/login')
  await page.getByRole('button', { name: 'Soy humano' }).click()
  await lastWidget(page, 'expired-callback')
  await expect(page.getByText('La verificación venció. Se está renovando sola: esperá un momento.')).toBeVisible()

  await lastWidget(page, 'error-callback')
  await expect(page.getByText('No pudimos verificar que sos una persona. Probá de nuevo.')).toBeVisible()
  const retry = page.getByRole('button', { name: 'Reintentar verificación' })
  const box = await retry.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  await retry.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Soy humano' })).toBeVisible()
  await expect(retry).toHaveCount(0)
})

test('si el script de Cloudflare no carga (bloqueador), se explica y se puede reintentar', async ({ page, context }) => {
  await context.route('https://challenges.cloudflare.com/**', route => route.abort())
  await page.goto('/login')
  await expect(page.getByText('No pudimos cargar la verificación anti-bots.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar verificación' })).toBeVisible()
})

test('olvidé mi contraseña: manda el token y, si Supabase lo rechaza, no dice "te escribimos"', async ({ page, context }) => {
  await fakeTurnstile(context)
  let token: string | undefined
  await page.route('**/auth/v1/recover**', route => {
    token = route.request().postDataJSON()?.gotrue_meta_security?.captcha_token
    return captchaError(route)
  })
  await page.goto('/forgot-password')
  await page.getByLabel('Email').fill('ana@example.com')
  await page.getByRole('button', { name: 'Soy humano' }).click()
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByRole('alert')).toHaveText('La verificación anti-bots falló o venció. Hacela de nuevo y volvé a intentar.')
  await expect(page.getByText('¡Listo, te escribimos!')).toHaveCount(0)
  expect(token).toBe('tok-w1')
})

test('en la app (sin VITE_TURNSTILE_IN_APP) no se muestra y, si Supabase lo exige, se ofrece otro camino', async ({ page, context }) => {
  await fakeTurnstile(context)
  await context.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    w.webkit = { messageHandlers: { bridge: { postMessage: () => undefined } } }
    w.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' }
  })
  let withoutToken = false
  await page.route('**/auth/v1/token**', route => {
    withoutToken = !route.request().postDataJSON()?.gotrue_meta_security?.captcha_token
    return captchaError(route)
  })
  await page.goto('/login')
  await page.getByLabel('Email').fill('ana@example.com')
  await expect(page.getByRole('group', { name: 'Verificación anti-bots' })).toHaveCount(0)
  await page.getByLabel('Contraseña').fill('secreta123')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('en la app no se puede entrar con email')
  expect(withoutToken).toBe(true)
})
