import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// "Elegí tu nombre": el campo mycen.id/<nombre> de la landing (arriba y al cierre) y del perfil que no existe. Consulta
// en el momento si está libre, ofrece alternativas y lleva al registro con el nombre; el onboarding no lo vuelve a pedir.

test('landing: elegir un nombre libre lleva al registro, que lo muestra y lo guarda con la cuenta', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/')
  const hero = page.locator('.ch-claim')
  await hero.getByRole('textbox', { name: 'Elegí tu nombre en Mycen' }).fill('Lucía Gómez')
  await expect(hero.getByRole('textbox')).toHaveValue('lucia-gomez')
  await expect(hero.getByText('Está libre')).toBeVisible()

  let body: { data?: { claimed_username?: string; claim_from?: string } } = {}
  await page.route('**/auth/v1/signup**', route => {
    body = route.request().postDataJSON()
    return route.fulfill({ status: 422, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ code: 422, msg: 'User already registered', error_code: 'user_already_exists' }) })
  })
  await hero.getByRole('button', { name: 'Crear mi Mycen' }).click()
  await expect(page).toHaveURL(/\/register\?u=lucia-gomez&desde=hero$/)
  await expect(page.getByText('Tu dirección va a ser')).toBeVisible()
  await expect(page.getByText(/\/lucia-gomez$/)).toBeVisible()

  await page.getByLabel('Tu nombre', { exact: true }).fill('Lucía Gómez')
  await page.getByLabel('Email').fill('lucia@example.com')
  await page.getByLabel('Contraseña').fill('secreta123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear mi cuenta gratis' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(body.data).toMatchObject({ claimed_username: 'lucia-gomez', claim_from: 'hero' })
})

test('landing: un nombre tomado ofrece alternativas libres y no deja seguir con el tomado', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }))
  await page.goto('/')
  const hero = page.locator('.ch-claim')
  const input = hero.getByRole('textbox', { name: 'Elegí tu nombre en Mycen' })
  await input.fill('ana')
  await expect(hero.getByText('Ya está tomado.')).toBeVisible()
  await hero.getByRole('button', { name: 'Crear mi Mycen' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(input).toBeFocused()

  await hero.getByRole('button', { name: 'ana-id' }).click()
  await expect(input).toHaveValue('ana-id')
  await expect(hero.getByText('Está libre')).toBeVisible()
})

test('landing: el cierre también tiene el campo y lo marca como "cierre"', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/')
  const fields = page.getByRole('textbox', { name: 'Elegí tu nombre en Mycen' })
  await expect(fields).toHaveCount(2, { timeout: 15_000 })
  const last = page.locator('form.my-claim').last()
  await last.scrollIntoViewIfNeeded()
  await last.getByRole('textbox').fill('pedro')
  await expect(last.getByText('Está libre')).toBeVisible()
  await last.getByRole('button', { name: 'Crear mi Mycen' }).click()
  await expect(page).toHaveURL(/\/register\?u=pedro&desde=cierre$/)
})

test('un perfil que no existe y cuyo nombre está libre invita a tomarlo', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/juanito')
  await expect(page.getByRole('heading', { name: /\/juanito está libre/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Elegí tu nombre en Mycen' })).toHaveValue('juanito')
  await expect(page.getByText('Está libre')).toBeVisible()
  await page.getByRole('button', { name: 'Crear mi Mycen' }).click()
  await expect(page).toHaveURL(/\/register\?u=juanito&desde=perfil$/)
})

test('una dirección sin perfil pero con un nombre reservado no se ofrece como libre', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/linktree')
  await expect(page.getByRole('heading', { name: 'Este perfil no existe' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Elegí tu nombre en Mycen' })).toHaveCount(0)
})

test('onboarding: con el nombre ya elegido y libre, se saltea el paso de la dirección', async ({ page, context }) => {
  const state = createState()
  await installSupabaseMock(context, state, { signedIn: true, userMetadata: { claimed_username: 'lucia-gomez', claim_from: 'hero' } })
  await page.goto('/studio')
  const heading = page.locator('h1.st-title, h1.ob-huella-title')
  await page.getByRole('textbox', { name: 'Nombre visible' }).fill('Lucía')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(heading).toHaveText('¿Para qué es tu perfil?')
  await page.getByRole('radio', { name: /Artista o creador/ }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(heading).toHaveText('Tu foto')
  expect(state.tables.profiles[0]).toMatchObject({ username: 'lucia-gomez', display_name: 'Lucía' })
})

test('onboarding: si alguien tomó el nombre mientras tanto, lo vuelve a pedir', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ id: 'p-otra', user_id: 'otra-cuenta', username: 'lucia-gomez' })] })
  await installSupabaseMock(context, state, { signedIn: true, userMetadata: { claimed_username: 'lucia-gomez', claim_from: 'hero' } })
  await page.goto('/studio')
  const heading = page.locator('h1.st-title, h1.ob-huella-title')
  await page.getByRole('textbox', { name: 'Nombre visible' }).fill('Lucía')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(heading).toHaveText('Elegí tu dirección')
  await expect(page.getByRole('textbox', { name: /username/i })).toHaveValue('lucia-gomez')
})
