import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow } from './support/mockSupabase'

// Business queda oculto en Life OS y en Studio hasta que el equipo prenda el interruptor del sitio "business"
// (panel → interruptores), aunque la cuenta tenga un negocio con plan os_*.

const withBusiness = (business: boolean) => {
  const state = createState({
    profiles: [profileRow({ restaurant_id: 'r1' })],
    restaurants: [{ id: 'r1', owner_id: OWNER_ID, plan: 'os_full', name: 'Café', slug: 'cafe', is_active: true }],
  })
  state.siteFlags = { business }
  return state
}

test.use({ viewport: { width: 390, height: 844 } })

test('con Business apagado no aparece "Mi negocio" ni el link a Business', async ({ page, context }) => {
  await installSupabaseMock(context, withBusiness(false), { signedIn: true })
  await page.goto('/life')
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mi negocio' })).toHaveCount(0)

  await page.goto('/studio/more')
  await expect(page.getByRole('heading', { level: 1, name: 'Más' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Mycen Business/ })).toHaveCount(0)
})

test('con Business prendido vuelven a aparecer', async ({ page, context }) => {
  await installSupabaseMock(context, withBusiness(true), { signedIn: true })
  await page.goto('/life')
  await expect(page.getByRole('button', { name: 'Mi negocio' })).toBeVisible()
  await page.goto('/studio/more')
  await expect(page.getByRole('link', { name: /Mycen Business/ })).toBeVisible()
})
