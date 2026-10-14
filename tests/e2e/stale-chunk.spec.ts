import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// Después de publicar una versión nueva, una pestaña abierta pide partes que ya no existen. Abrir una pantalla
// que no se había cargado (Analítica) recarga la página sola, en vez de mostrar "Algo salió mal".

const CHUNK = '**/src/modules/studio/pages/AnalyticsPage.tsx*'

test.use({ viewport: { width: 1280, height: 900 } })

test('una pantalla de la versión anterior recarga la página y abre', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow({ status: 'published' })] }), { signedIn: true })
  await page.goto('/studio')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

  let failed = 0
  await page.route(CHUNK, route => { if (failed++ === 0) return route.abort(); return route.continue() })
  const reloaded = page.waitForEvent('load')
  await page.getByRole('link', { name: 'Analítica' }).first().click()
  await reloaded

  await expect(page).toHaveURL(/\/studio\/analytics$/)
  await expect(page.getByRole('heading', { name: 'Analítica' })).toBeVisible()
  await expect(page.getByText('Algo salió mal')).toHaveCount(0)
})

test('si vuelve a fallar enseguida, muestra el aviso (no recarga sin fin)', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow({ status: 'published' })] }), { signedIn: true })
  await page.goto('/studio')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

  await page.route(CHUNK, route => route.abort())
  await page.getByRole('link', { name: 'Analítica' }).first().click()
  await expect(page.getByText('Algo salió mal')).toBeVisible()
  await expect(page).toHaveURL(/\/studio\/analytics$/)
})
