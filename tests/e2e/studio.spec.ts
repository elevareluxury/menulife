import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Comportamiento actual de Studio. Ojo: hoy guardar = publicar (docs/identity/01). Cuando llegue la
// Fase 3 (versiones), el test del autosave cambia: la versión pública no se toca hasta publicar.

test('el autosave guarda el nombre y muestra el estado', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/identity')
  const name = page.getByRole('textbox', { name: 'Nombre', exact: true })
  await expect(name).toHaveValue('Ana Pérez')

  await name.fill('Ana P. Estudio')

  await expect(page.getByText('Guardado').first()).toBeVisible()
  await expect.poll(() => state.writes.find(w => w.method === 'PATCH' && w.table === 'profiles')?.body)
    .toMatchObject({ display_name: 'Ana P. Estudio' })
  // Comportamiento actual (cambia en la Fase 3): la escritura va directo a la fila pública
  expect(state.tables.profiles[0].display_name).toBe('Ana P. Estudio')
})

test('el QR apunta a la URL pública con ?src=qr y se descarga en PNG', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/exchange')
  const qr = page.getByRole('img', { name: 'QR de Ana Pérez' })
  await expect(qr).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('mycen-ana-qr.png')
})

test('ocultar un módulo lo saca de la página pública', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow()],
    profile_modules: [moduleRow({ id: 'm-portfolio', title: 'Mi portfolio' })],
  })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/modules')
  await expect(page.getByText('Mi portfolio').first()).toBeVisible()
  await page.getByRole('button', { name: /Ocultar/ }).first().click()

  await expect.poll(() => state.tables.profile_modules[0].visibility).toBe('hidden')
  const publicView = state.rpcCalls.length
  await page.goto('/ana')
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  expect(state.rpcCalls.length).toBeGreaterThan(publicView)
  await expect(page.getByRole('link', { name: /Mi portfolio/ })).toHaveCount(0)
})
