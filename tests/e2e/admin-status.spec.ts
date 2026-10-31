import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Panel del equipo → Estado del sistema (auditoría del panel, PR 1): semáforo general, una fila por chequeo, el
// autochequeo de seguridad, ajustes que quedan en la actividad del equipo y accesibilidad en el celular y la compu.

function adminState(): MockState {
  return createState({ super_admins: [{ id: 'sa-1', user_id: OWNER_ID }], profiles: [profileRow()] })
}

const ALL_OK = [
  { id: 'og', ok: true, status: 200, ms: 320 }, { id: 'og_image', ok: true, status: 200, ms: 410 },
  { id: 'sitemap', ok: true, status: 200, ms: 90, count: 40 }, { id: 'youtube_latest', ok: true, status: 200, ms: 300 },
  { id: 'media_cover', ok: true, status: 200, ms: 500 }, { id: 'calendar', ok: true, status: 404, ms: 80 },
]

/** El servidor de Vite no corre api/: /api/health se responde acá. Devuelve las consultas que llegaron. */
async function mockHealth(context: BrowserContext, opts: { db?: 'ok' | 'down'; checks?: typeof ALL_OK | null } = {}) {
  const seen: { deep: boolean; auth: string | null; u: string | null }[] = []
  await context.route('**/api/health**', route => {
    const url = new URL(route.request().url())
    const deep = url.searchParams.get('deep') === '1'
    seen.push({ deep, auth: route.request().headers().authorization ?? null, u: url.searchParams.get('u') })
    const db = opts.db ?? 'ok'
    const body: Record<string, unknown> = { ok: db === 'ok', db, ms: 40, release: null }
    if (deep) {
      if (opts.checks === null) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ ...body, deep: 'forbidden' }) })
      body.checks = opts.checks ?? ALL_OK
    }
    return route.fulfill({ status: db === 'ok' ? 200 : 503, contentType: 'application/json', body: JSON.stringify(body) })
  })
  return seen
}

const row = (page: Page, id: string) => page.getByTestId(`status-row-${id}`)

test('todo en verde: semáforo, filas y chequeo profundo con la sesión del equipo', async ({ page, context }) => {
  const state = adminState()
  state.statusSettings = { backup_checked_at: new Date().toISOString() }
  await installSupabaseMock(context, state, { signedIn: true })
  const seen = await mockHealth(context)
  await page.goto('/super-admin/estado')
  await expect(page.getByRole('heading', { level: 1, name: 'Estado del sistema' })).toBeVisible()
  await expect(page.getByTestId('status-overall')).toHaveAttribute('data-level', 'ok')
  await expect(page.getByTestId('status-overall')).toContainText('Todo funciona')
  for (const id of ['database', 'profile', 'preview', 'sitemap', 'media', 'calendar', 'reminders', 'errors', 'signups', 'size', 'slow', 'storage', 'backup']) {
    await expect(row(page, id), id).toHaveAttribute('data-level', 'ok')
  }
  await expect(row(page, 'profile')).toContainText('mycen.id/ana')
  await expect(row(page, 'sitemap')).toContainText('40 direcciones')
  // Sin dato de versión en local: no se marca como problema
  await expect(row(page, 'release')).toHaveAttribute('data-level', 'unknown')
  await expect(page.getByTestId('status-security')).toContainText('Todo cumple las reglas.')
  // El chequeo profundo va con la sesión del super-admin y el perfil de prueba
  const deep = seen.find(s => s.deep)
  expect(deep?.auth).toMatch(/^Bearer /)
  expect(deep?.u).toBe('ana')
})

test('problemas: base caída, vista previa rota, recordatorios atrasados y una tabla sin RLS', async ({ page, context }) => {
  const state = adminState()
  state.systemStatus = {
    cron: [{ name: 'life-reminders', schedule: '* * * * *', active: true, last_start: new Date(Date.now() - 30 * 60_000).toISOString(), last_status: 'succeeded', failed_24h: 0 }],
  }
  state.selfcheck = [
    { rule: 'a', level: 'red', object: 'tabla_nueva' },
    { rule: 'b', level: 'info', object: 'reserved_usernames' },
  ]
  await installSupabaseMock(context, state, { signedIn: true })
  await mockHealth(context, { db: 'down', checks: ALL_OK.map(c => (c.id === 'og_image' ? { ...c, ok: false, status: 500 } : c)) })
  await page.goto('/super-admin/estado')
  await expect(page.getByTestId('status-overall')).toHaveAttribute('data-level', 'bad')
  await expect(page.getByTestId('status-overall')).toContainText('Hay un problema')
  await expect(row(page, 'database')).toHaveAttribute('data-level', 'bad')
  await expect(row(page, 'database')).toContainText('No responde')
  await expect(row(page, 'preview')).toContainText('código 500')
  await expect(row(page, 'reminders')).toHaveAttribute('data-level', 'bad')
  await expect(row(page, 'reminders')).toContainText('hace 30 min')
  // Nunca marcadas como revisadas: amarillo
  await expect(row(page, 'backup')).toHaveAttribute('data-level', 'warn')
  const sec = page.getByTestId('status-security')
  await expect(sec).toHaveAttribute('data-level', 'bad')
  await expect(page.getByTestId('finding-a')).toContainText('Tabla sin RLS')
  await expect(page.getByTestId('finding-a')).toContainText('tabla_nueva')
  // Lo informativo va aparte y plegado
  await expect(sec.getByText('reserved_usernames')).toBeHidden()
  await sec.getByText(/Para saber/).click()
  await expect(sec.getByText('reserved_usernames')).toBeVisible()
})

test('sin chequeo profundo, esas filas quedan "sin datos"; ajustes y backup quedan en la actividad', async ({ page, context }) => {
  const state = adminState()
  await installSupabaseMock(context, state, { signedIn: true })
  await mockHealth(context, { checks: null })
  await page.goto('/super-admin/estado')
  await expect(page.getByText(/no respondieron/)).toBeVisible()
  for (const id of ['preview', 'sitemap', 'media', 'calendar']) await expect(row(page, id)).toHaveAttribute('data-level', 'unknown')

  await row(page, 'backup').getByRole('button', { name: 'Las revisé hoy' }).click()
  await expect(row(page, 'backup')).toHaveAttribute('data-level', 'ok')

  await page.getByLabel('Límite de la base (MB)').fill('abc')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Revisá el valor.')).toBeVisible()
  await page.getByLabel('Límite de la base (MB)').fill('16384')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible()
  await expect(row(page, 'size')).toContainText('16.384 MB')

  await page.goto('/super-admin/actividad')
  await expect(page.getByText('Cambió un ajuste del Estado del sistema').first()).toBeVisible()
})

test('en el celular está en la barra de abajo y pasa axe (celular y compu)', async ({ page, context }) => {
  await installSupabaseMock(context, adminState(), { signedIn: true })
  await mockHealth(context)
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(vp)
    await page.goto('/super-admin')
    if (vp.width < 1000) await page.locator('nav.fixed').getByRole('link', { name: 'Estado' }).click()
    else await page.getByRole('navigation', { name: 'Panel interno' }).first().getByRole('link', { name: 'Estado' }).click()
    await expect(page.getByTestId('status-overall')).toHaveAttribute('data-level', /ok|warn/)
    const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    expect(bad.map(v => `${vp.width} · ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
    // Nada se sale de la pantalla de costado
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})

test('quien no es del equipo no entra', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/super-admin/estado')
  await expect(page).not.toHaveURL(/super-admin/)
})
