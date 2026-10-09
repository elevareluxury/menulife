import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// "Creá tu identidad" (V1 · etapa 08): el pie de cada perfil lleva al registro con ?ref y ?tipo; la cuenta nueva
// queda atribuida al crear su perfil y el onboarding arranca con el mismo tipo elegido.

test('el pie del perfil lleva al registro con el perfil y su tipo, y el registro los guarda', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }))
  await page.goto('/ana')
  const link = page.getByRole('link', { name: 'Creá tu identidad' })
  await expect(link).toHaveAttribute('href', '/register?ref=ana&tipo=professional')

  let body: { data?: { ref?: string; ref_purpose?: string } } = {}
  await page.route('**/auth/v1/signup**', route => {
    body = route.request().postDataJSON()
    return route.fulfill({ status: 422, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ code: 422, msg: 'User already registered', error_code: 'user_already_exists' }) })
  })
  await link.click()
  await expect(page).toHaveURL(/\/register\?ref=ana&tipo=professional$/)
  await page.getByLabel('Tu nombre').fill('Lucía Gómez')
  await page.getByLabel('Email').fill('lucia@example.com')
  await page.getByLabel('Contraseña').fill('secreta123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear mi cuenta gratis' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(body.data).toMatchObject({ ref: 'ana', ref_purpose: 'professional' })
})

test('una cuenta que llegó desde un perfil arranca con su tipo y queda atribuida al crear el perfil', async ({ page, context }) => {
  // El perfil que la trajo es de otra persona
  const state = createState({ profiles: [profileRow({ id: 'p-beto', user_id: 'otro-usuario', username: 'beto', display_name: 'Beto', purpose: 'artist' })] })
  await installSupabaseMock(context, state, { signedIn: true, userMetadata: { ref: 'beto', ref_purpose: 'artist' } })
  await page.goto('/studio')

  const heading = page.locator('h1.st-title, h1.ob-huella-title')
  await page.getByRole('textbox', { name: 'Nombre visible' }).fill('Lucía Gómez')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(heading).toHaveText('Elegí tu dirección')
  await expect(page.getByText(/disponible/i).first()).toBeVisible()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()

  // "artist" del perfil de Beto → Artista o creador, ya elegido
  await expect(heading).toHaveText('¿Para qué es tu perfil?')
  await expect(page.getByRole('radio', { name: /Artista o creador/ })).toBeChecked()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(heading).toHaveText('Tu foto')
  await expect.poll(() => state.tables.referrals).toEqual([{ user_id: expect.any(String), referred_by: 'p-beto', purpose: 'artist' }])
})
