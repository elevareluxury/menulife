import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock } from './support/mockSupabase'

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

test('el login también ofrece Google, con su propia casilla obligatoria y en el idioma de la persona', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('mycen_lang', 'en'))
  await installSupabaseMock(context, createState({}))
  let authorized = false
  await page.route('**/auth/v1/authorize**', route => {
    authorized = true
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' })
  })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByRole('alert')).toHaveText('To create your account, accept the Terms and the Privacy Policy.')
  expect(authorized).toBe(false)
  await page.getByRole('checkbox', { name: /I accept the Terms/ }).check()
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect.poll(() => authorized).toBe(true)
})

test('al volver de Google se completa la cuenta y se entra', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}), { signedIn: true })
  await context.addInitScript(() => localStorage.setItem('mycen_oauth_pending',
    JSON.stringify({ at: new Date().toISOString(), locale: 'pt', ref: 'ana', ref_purpose: null })))
  const saved: { data?: Record<string, unknown> } = {}
  await page.route('**/auth/v1/user**', route => {
    if (route.request().method() === 'PUT') Object.assign(saved, route.request().postDataJSON())
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ id: 'owner', email: 'ana@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: {} }) })
  })
  await page.goto('/auth/callback')
  await expect(page).toHaveURL(/\/studio/)
  expect(saved.data).toMatchObject({ locale: 'pt', ref: 'ana' })
  expect(typeof saved.data?.terms_accepted_at).toBe('string')
  expect(await page.evaluate(() => localStorage.getItem('mycen_oauth_pending'))).toBeNull()
})
