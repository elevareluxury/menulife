import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Studio con publicación por versiones (Fase 3): guardar ≠ publicar.

async function publicName(page: Page) {
  await page.goto('/ana')
  return page.getByRole('heading', { level: 1 }).innerText()
}

test('el autosave guarda el borrador y no toca lo publicado hasta publicar', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/identity')
  const name = page.getByRole('textbox', { name: 'Nombre', exact: true })
  await expect(name).toHaveValue('Ana Pérez')
  await expect(page.getByText('Publicado · versión 1')).toBeVisible()

  await name.fill('Ana P. Estudio')
  await expect(page.getByText('Guardado').first()).toBeVisible()
  await expect.poll(() => state.writes.find(w => w.method === 'PATCH' && w.table === 'profiles')?.body)
    .toMatchObject({ display_name: 'Ana P. Estudio' })
  await expect(page.getByText('Tenés cambios sin publicar')).toBeVisible()

  // El visitante sigue viendo la versión publicada
  const visitor = await context.browser()!.newContext()
  await installSupabaseMock(visitor, state)
  const vPage = await visitor.newPage()
  expect(await publicName(vPage)).toBe('Ana Pérez')

  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText('Publicado · versión 2')).toBeVisible()
  expect(await publicName(vPage)).toBe('Ana P. Estudio')
  await visitor.close()
})

test('deshacer y rehacer un cambio del perfil', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/identity')
  const name = page.getByRole('textbox', { name: 'Nombre', exact: true })
  await name.fill('Otro nombre')
  await expect(page.getByText('Guardado').first()).toBeVisible()

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(name).toHaveValue('Ana Pérez')
  await expect.poll(() => state.tables.profiles[0].display_name).toBe('Ana Pérez')

  await page.getByRole('button', { name: 'Rehacer' }).click()
  await expect(name).toHaveValue('Otro nombre')
  await expect.poll(() => state.tables.profiles[0].display_name).toBe('Otro nombre')
})

test('restaurar una versión anterior la vuelve a publicar y la trae a Studio', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/identity')
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Ana Nueva')
  await expect(page.getByText('Tenés cambios sin publicar')).toBeVisible()
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText('Publicado · versión 2')).toBeVisible()

  await page.goto('/studio/settings')
  const versions = page.getByRole('region', { name: 'Versiones publicadas' })
  await versions.getByRole('button', { name: 'Restaurar' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Restaurar' }).click()

  await expect(page.getByText('Listo: publicada como versión 3.')).toBeVisible()
  expect(state.tables.profile_versions[state.tables.profile_versions.length - 1]).toMatchObject({ version_number: 3 })
  expect(state.tables.profiles[0].display_name).toBe('Ana Pérez')
  await page.goto('/studio/identity')
  await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('Ana Pérez')
})

test('si otra pestaña guardó antes, no se pisan los cambios', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/identity')
  await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('Ana Pérez')
  // Otra pestaña guarda primero
  state.tables.profiles[0].bio = 'Cambio desde otra pestaña'
  state.tables.profiles[0].revision = 5

  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Ana desde acá')
  await expect(page.getByText(/Hay cambios más nuevos guardados desde otra pestaña/).first()).toBeVisible()
  expect(state.tables.profiles[0].display_name).toBe('Ana Pérez')
  expect(state.tables.profiles[0].bio).toBe('Cambio desde otra pestaña')
})

test('el QR apunta a la URL pública con ?src=qr y se descarga en PNG', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/exchange')
  await expect(page.getByRole('img', { name: 'QR de Ana Pérez' })).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('mycen-ana-qr.png')
})

test('ocultar un módulo se publica recién al publicar', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow()],
    profile_modules: [moduleRow({ id: 'm-portfolio', title: 'Mi portfolio' })],
  })
  // La versión 1 tiene que incluir el módulo: se crea después de sembrar los módulos
  state.tables.profile_versions = []
  state.tables.profiles[0].published_version_id = null
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Publicar' }).first().click()
  await expect(page.getByText('Publicado · versión 1')).toBeVisible()

  await page.getByRole('button', { name: /Ocultar/ }).first().click()
  await expect.poll(() => state.tables.profile_modules[0].visibility).toBe('hidden')
  await expect(page.getByText('Tenés cambios sin publicar')).toBeVisible()

  const visitor = await context.browser()!.newContext()
  await installSupabaseMock(visitor, state)
  const vPage = await visitor.newPage()
  await vPage.goto('/ana')
  await expect(vPage.getByRole('link', { name: /Mi portfolio/ })).toBeVisible()

  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText('Publicado · versión 2')).toBeVisible()
  await vPage.reload()
  await expect(vPage.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(vPage.getByRole('link', { name: /Mi portfolio/ })).toHaveCount(0)
  await visitor.close()
})
