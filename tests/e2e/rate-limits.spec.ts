import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// Escala: topes por cuenta y por hora (20261205000001). Si la base frena con 429, Studio lo explica.

test('publicar muchas veces seguidas: Studio dice que espere unos minutos', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await context.route(/\/rest\/v1\/rpc\/publish_space/, route => route.fulfill({
    status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ code: 'PT429', message: 'RATE_LIMITED', details: null, hint: null }) }))
  await page.goto('/studio/identity')
  const name = page.getByRole('textbox', { name: 'Nombre' })
  await expect(name).toHaveValue('Ana Pérez')
  await name.fill('Ana Pérez Gómez')
  await expect.poll(() => state.tables.profiles[0].display_name).toBe('Ana Pérez Gómez')
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText('Hiciste muchos cambios seguidos. Esperá unos minutos y probá de nuevo.')).toBeVisible()
})
