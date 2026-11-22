import { expect, test } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Corea del Sur y China: en el registro (y antes de entrar, si la cuenta no lo dio) se pide un permiso aparte para
// guardar los datos fuera del país, con qué datos, adónde, a quién, para qué y por cuánto tiempo. src/lib/crossBorder.ts

test.describe('desde China (zona horaria)', () => {
  test.use({ timezoneId: 'Asia/Shanghai' })

  test('el registro pide el permiso aparte, no deja seguir sin él y lo guarda en la cuenta', async ({ page, context }) => {
    await installSupabaseMock(context, createState({}))
    let body: { data?: Record<string, unknown> } | null = null
    await page.route('**/auth/v1/signup**', route => {
      body = route.request().postDataJSON()
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ id: OWNER_ID, email: 'ana@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: {} }) })
    })
    await page.goto('/register')
    const group = page.getByRole('group', { name: 'Tus datos fuera de China' })
    await expect(group).toBeVisible()
    await expect(group).toContainText('Estados Unidos y en la Unión Europea')
    const axe = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(axe.violations.map(v => v.id)).toEqual([])

    await page.getByLabel('Tu nombre').fill('Ana Pérez')
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByLabel('Contraseña').fill('secreta123')
    await page.getByRole('checkbox', { name: /Acepto los/ }).check()
    await page.getByRole('button', { name: 'Crear mi cuenta gratis' }).click()
    await expect(page.getByRole('alert')).toContainText('aceptá que tus datos se guarden fuera de China')
    expect(body).toBeNull()

    await group.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Crear mi cuenta gratis' }).click()
    await expect.poll(() => body?.data?.xborder_region).toBe('cn')
    expect(typeof body!.data!.xborder_consent_at).toBe('string')
    expect(typeof body!.data!.terms_accepted_at).toBe('string')
  })

  test('con Google: sin el permiso no se va a Google; con el permiso queda anotado para la vuelta', async ({ page, context }) => {
    await installSupabaseMock(context, createState({}))
    let authorized = false
    await page.route('**/auth/v1/authorize**', route => {
      authorized = true
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' })
    })
    await page.goto('/register')
    await page.getByRole('checkbox', { name: /Acepto los/ }).check()
    await page.getByRole('button', { name: 'Continuar con Google' }).click()
    await expect(page.getByRole('alert')).toContainText('fuera de China')
    expect(authorized).toBe(false)

    await page.getByRole('group', { name: 'Tus datos fuera de China' }).getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Continuar con Google' }).click()
    await expect.poll(() => authorized).toBe(true)
    await page.goto('/login')
    const pending = JSON.parse(await page.evaluate(() => localStorage.getItem('mycen_oauth_pending') ?? 'null'))
    expect(pending).toMatchObject({ terms: true, xborder: 'cn' })
  })
})

test.describe('desde Corea (cuenta que ya existía)', () => {
  test.use({ timezoneId: 'Asia/Seoul' })

  test('antes de entrar pide sólo el permiso que falta y después deja usar la app', async ({ page, context }) => {
    await installSupabaseMock(context, createState({}), { signedIn: true })
    const saved: { data?: Record<string, unknown> } = {}
    await page.route('**/auth/v1/user**', route => {
      if (route.request().method() === 'PUT') Object.assign(saved, route.request().postDataJSON())
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ id: OWNER_ID, email: 'ana@example.com', aud: 'authenticated', role: 'authenticated',
          app_metadata: { provider: 'email' }, user_metadata: { locale: 'es', terms_accepted_at: '2026-01-01T00:00:00Z', ...saved.data } }) })
    })
    await page.goto('/life')
    await expect(page).toHaveURL(/\/auth\/terms$/)
    await expect(page.getByText('necesitamos tu permiso para guardar tus datos fuera de Corea del Sur')).toBeVisible()
    // La casilla de Términos no se repite: ya los había aceptado
    await expect(page.getByRole('checkbox')).toHaveCount(1)
    const axe = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(axe.violations.map(v => v.id)).toEqual([])

    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await expect(page).not.toHaveURL(/\/auth\/terms/)
    expect(saved.data).toMatchObject({ xborder_region: 'kr' })
    expect(saved.data).not.toHaveProperty('terms_accepted_at')
  })
})
