import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Panel del equipo (auditoría del panel): resumen de Mycen, buscar personas y su ficha, contadores de pendientes,
// actividad del equipo, menú agrupado con Business y barra de abajo en el celular.

function adminState(): MockState {
  const state = createState({
    super_admins: [{ id: 'sa-1', user_id: OWNER_ID }],
    profiles: [profileRow(), profileRow({ id: 'p-beto', user_id: 'u-beto', identity_id: 'id-beto', username: 'beto', display_name: 'Beto Gómez' })],
  })
  state.tables.profile_reports.push({
    id: 'rep-1', profile_id: 'p-beto', content_object_id: null, reason: 'spam', details: null, reporter_hash: 'x',
    status: 'open', resolution_note: null, resolved_at: null, created_at: new Date().toISOString(),
  })
  return state
}

test('resumen de Mycen: cuentas, publicados y lo pendiente con su link', async ({ page, context }) => {
  await installSupabaseMock(context, adminState(), { signedIn: true })
  await page.goto('/super-admin')
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()
  await expect(page.getByText('Cuentas', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Denuncias sin revisar: 1/ })).toHaveAttribute('href', '/super-admin/denuncias')
  // Business apagado: no aparece el panel de negocios, sólo el aviso
  await expect(page.getByText(/Business está apagado/)).toBeVisible()
  await expect(page.getByText('Total negocios')).toHaveCount(0)
  // Contador de pendientes en el menú
  await expect(page.getByRole('navigation').getByLabel('1 pendientes').first()).toBeVisible()
})

test('buscar una persona, ver su ficha y suspender su Space (queda en la actividad del equipo)', async ({ page, context }) => {
  const state = adminState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/super-admin/personas')
  await page.getByRole('searchbox').fill('beto')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/q=beto/)
  await page.getByRole('button', { name: /Beto Gómez/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Beto Gómez' })).toBeVisible()
  await expect(page.getByText('Denuncias abiertas: 1')).toBeVisible()
  await expect(page.getByText(/nunca se muestra acá/)).toBeVisible()

  await page.getByRole('textbox', { name: /Motivo/ }).fill('Spam repetido')
  await page.getByRole('button', { name: 'Suspender' }).click()
  await expect(page.getByRole('button', { name: 'Levantar suspensión' })).toBeVisible()
  expect(state.tables.profiles.find(p => p.id === 'p-beto')!.suspension_reason).toBe('Spam repetido')

  await page.goto('/super-admin/actividad')
  await expect(page.getByText('Suspendió un Space')).toBeVisible()
  await expect(page.getByText(/\/beto · Spam repetido/)).toBeVisible()

  // Volver atrás conserva la búsqueda
  await page.goto('/super-admin/personas?q=beto')
  await expect(page.getByRole('button', { name: /Beto Gómez/ })).toBeVisible()
})

test('menú: Business agrupado y plegable; en el celular, barra de abajo sin hamburguesa', async ({ page, context }) => {
  await installSupabaseMock(context, adminState(), { signedIn: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/super-admin')
  const nav = page.getByRole('navigation', { name: 'Panel interno' }).first()
  await expect(nav.getByRole('link', { name: 'Negocios' })).toHaveCount(0)
  await nav.getByRole('button', { name: /Business/ }).click()
  await expect(nav.getByRole('link', { name: 'Negocios' })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/super-admin')
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveCount(0)
  const bar = page.locator('nav.fixed')
  await expect(bar.getByRole('link', { name: 'Estado' })).toBeVisible()
  await bar.getByRole('button', { name: 'Más' }).click()
  await expect(page.getByRole('link', { name: 'Actividad del equipo' })).toBeVisible()
})

test('quien no es del equipo no entra', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/super-admin/personas')
  await expect(page).not.toHaveURL(/super-admin/)
})
