import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Entrar con Google (V1.1): el botón manda a Google por Supabase y, al volver, la cuenta queda con el idioma,
// la aceptación de los términos y el referido, como en el registro con email. axe de /login y /register: auth.spec.ts.

test('el registro manda a Google con la vuelta a /auth/callback y anota idioma y referido', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  let authorize: URL | null = null
  await page.route('**/auth/v1/authorize**', route => {
    authorize = new URL(route.request().url())
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' })
  })
  await page.goto('/register?ref=ana&tipo=creador')
  // Sin aceptar los Términos y la Privacidad no se va a Google
  await page.getByRole('button', { name: 'Continuar con Google' }).click()
  await expect(page.getByRole('alert')).toHaveText('Para crear tu cuenta, aceptá los Términos y la Política de privacidad.')
  expect(authorize).toBeNull()

  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continuar con Google' }).click()
  await expect.poll(() => authorize?.searchParams.get('provider')).toBe('google')
  expect(authorize!.searchParams.get('redirect_to')).toMatch(/\/auth\/callback$/)
  // El navegador ya está en Google (otro origen): lo anotado se lee de vuelta en Mycen
  await page.goto('/login')
  const pending = JSON.parse(await page.evaluate(() => localStorage.getItem('mycen_oauth_pending') ?? 'null'))
  expect(pending).toMatchObject({ locale: 'es', ref: 'ana', ref_purpose: 'creador' })
})

test('el login ofrece Google sin casilla: quien ya tiene cuenta entra directo', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('mycen_lang', 'en'))
  await installSupabaseMock(context, createState({}))
  let authorized = false
  await page.route('**/auth/v1/authorize**', route => {
    authorized = true
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' })
  })
  await page.goto('/login')
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect.poll(() => authorized).toBe(true)
  await page.goto('/login')
  const pending = JSON.parse(await page.evaluate(() => localStorage.getItem('mycen_oauth_pending') ?? 'null'))
  expect(pending).toMatchObject({ locale: 'en', terms: false })
})

/** /auth/v1/user de una cuenta de Google: guarda lo que manda updateUser y lo devuelve después */
async function googleUser(page: import('@playwright/test').Page, meta: Record<string, unknown>) {
  const saved: { data?: Record<string, unknown> } = {}
  await page.route('**/auth/v1/user**', route => {
    if (route.request().method() === 'PUT') Object.assign(saved, route.request().postDataJSON())
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ id: OWNER_ID, email: 'ana@example.com', aud: 'authenticated', role: 'authenticated',
        app_metadata: { provider: 'google' }, user_metadata: { ...meta, ...saved.data } }) })
  })
  return saved
}

test('al volver de Google desde el registro se completa la cuenta y se entra', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}), { signedIn: true, appMetadata: { provider: 'google' } })
  await context.addInitScript(() => localStorage.setItem('mycen_oauth_pending',
    JSON.stringify({ at: new Date().toISOString(), locale: 'pt', ref: 'ana', ref_purpose: null, terms: true })))
  const saved = await googleUser(page, {})
  await page.goto('/auth/callback')
  await expect(page).toHaveURL(/\/studio/)
  expect(saved.data).toMatchObject({ locale: 'pt', ref: 'ana' })
  expect(typeof saved.data?.terms_accepted_at).toBe('string')
  expect(await page.evaluate(() => localStorage.getItem('mycen_oauth_pending'))).toBeNull()
})

test('una cuenta nueva con Google desde el login acepta los términos una sola vez', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}), { signedIn: true, appMetadata: { provider: 'google' } })
  await context.addInitScript(() => localStorage.setItem('mycen_oauth_pending',
    JSON.stringify({ at: new Date().toISOString(), locale: 'es', terms: false })))
  const saved = await googleUser(page, {})
  await page.goto('/auth/callback')
  await expect(page).toHaveURL(/\/auth\/terms$/)
  await expect(page.getByRole('heading', { name: 'Un paso más' })).toBeVisible()
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.map(v => v.id)).toEqual([])

  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Para crear tu cuenta, aceptá los Términos y la Política de privacidad.')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page).toHaveURL(/\/studio/)
  expect(typeof saved.data?.terms_accepted_at).toBe('string')
})

test('sin aceptar, una cuenta de Google no puede usar la app', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}), { signedIn: true, appMetadata: { provider: 'google' } })
  await googleUser(page, {})
  await page.goto('/life')
  await expect(page).toHaveURL(/\/auth\/terms$/)
  await page.getByRole('button', { name: 'Cancelar y salir' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
