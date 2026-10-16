import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Mycen Business se muestra en la landing sólo si el super-admin lo prende (Super-admin → Landing, `get_site_flags`).

test('apagado: la landing no muestra Business, precios ni su pregunta de planes', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/?lang=es')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu identidad digital')
  await expect(page.locator('#faq')).toContainText('¿Puedo usar Mycen para mi negocio?')
  await expect(page.locator('#faq')).toContainText('llegan más adelante con Mycen Business')
  await expect(page.locator('#faq')).not.toContainText('¿Qué pasa si cancelo el plan de negocio?')
  await expect(page.locator('#pricing')).toHaveCount(0)
  await expect(page.getByText('MYCEN BUSINESS', { exact: true })).toHaveCount(0)
  await expect(page.locator('a[href="#pricing"]')).toHaveCount(0)
  await expect(page.getByText('Creá tu identidad digital. Organizá tu vida.', { exact: true })).toBeVisible()
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /Business/)
})

test('prendido: vuelven la sección, los precios y las preguntas de Business', async ({ page, context }) => {
  await installSupabaseMock(context, Object.assign(createState({}), { siteFlags: { business: true } }))
  await page.goto('/?lang=es')
  await expect(page.locator('#pricing')).toBeAttached()
  await expect(page.getByText('MYCEN BUSINESS', { exact: true })).toBeAttached()
  await expect(page.locator('#faq')).toContainText('¿Qué pasa si cancelo el plan de negocio?')
  await expect(page.locator('#faq')).toContainText('gastronomía, comercio y servicios')
})

test('el super-admin lo prende desde Landing', async ({ page, context }) => {
  const state = createState({ super_admins: [{ id: 'sa-1', user_id: OWNER_ID }] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/super-admin/landing')
  const sw = page.getByRole('switch', { name: 'Mostrar Mycen Business en la landing' })
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  expect(state.siteFlags).toEqual({ business: true })
  await page.goto('/?lang=es')
  await expect(page.locator('#pricing')).toBeAttached()
})
