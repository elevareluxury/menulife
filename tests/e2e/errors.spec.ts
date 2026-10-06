import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, type MockState } from './support/mockSupabase'

// Lanzamiento L5: registro de errores propio, visible para el super-admin.

const errors = (state: MockState) => state.tables.app_errors ?? []

test('un error sin atrapar se registra (y el ruido de extensiones o ResizeObserver no)', async ({ page, context }) => {
  const state = createState({})
  await installSupabaseMock(context, state)
  await page.goto('/?lang=es')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.evaluate(() => {
    setTimeout(() => { throw new Error('ResizeObserver loop completed with undelivered notifications.') })
    setTimeout(() => { throw new Error('Algo se rompió en la landing') })
    void Promise.reject(new TypeError('Falló una promesa'))
  })
  await expect.poll(() => errors(state).map(e => e.message).sort()).toEqual(['Error: Algo se rompió en la landing', 'TypeError: Falló una promesa'])
  const e = errors(state)[0]
  expect(e.area).toBe('landing')
  expect(e.path).toBe('/')
  expect(String(e.browser)).toMatch(/Chrome \d+ · Android/)
  expect(String(e.stack)).toContain('Algo se rompió')
})

test('el super-admin ve los errores, los resuelve y se reabren si vuelven a pasar', async ({ page, context }) => {
  const state = createState({ super_admins: [{ id: 'sa-1', user_id: OWNER_ID }] })
  const now = new Date().toISOString()
  state.tables.app_errors = [{
    id: 'err-1', area: 'studio', message: 'TypeError: x is undefined', stack: 'at f (Studio.js:1:1)', path: '/studio/modules',
    release: 'abc1234', browser: 'Safari 18 · iOS', count: 7, first_seen: now, last_seen: now, status: 'open', note: null,
    resolved_at: null, reopened: false, affected: 3, affected_today: 2,
  }]
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/super-admin')
  await page.getByRole('button', { name: /1 error abierto/ }).click()
  await expect(page).toHaveURL(/\/super-admin\/errores$/)

  const item = page.getByRole('listitem', { name: 'TypeError: x is undefined' })
  await expect(item).toContainText('7 veces · 3 personas (2 hoy)')
  await expect(item).toContainText('/studio/modules · Safari 18 · iOS · versión abc1234')
  await item.getByText('Ver detalle técnico').click()
  await expect(item).toContainText('at f (Studio.js:1:1)')

  await item.getByRole('textbox').fill('Arreglado en el PR del editor')
  await item.getByRole('button', { name: 'Marcar resuelto' }).click()
  await expect(page.getByText('No hay errores abiertos.')).toBeVisible()
  expect(errors(state)[0]).toMatchObject({ status: 'resolved', note: 'Arreglado en el PR del editor' })

  // Vuelve a pasar en el navegador de alguien → se reabre solo
  await page.evaluate(() => setTimeout(() => { throw new TypeError('x is undefined') }))
  await expect.poll(() => errors(state).find(e => e.message === 'TypeError: x is undefined' && e.area === 'admin')).toBeTruthy()
  state.tables.app_errors![0].status = 'open'
  state.tables.app_errors![0].reopened = true
  await page.getByRole('button', { name: 'Todos' }).click()
  await page.getByRole('button', { name: 'Abiertos' }).click()
  await expect(page.getByRole('listitem', { name: 'TypeError: x is undefined' }).first()).toContainText('Volvió a pasar')
})
