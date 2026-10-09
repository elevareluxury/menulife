import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Mycen V1 · etapa 14: métricas de producto propias. Los eventos van en segundo plano, sin contenido, y el panel
// de super-admin muestra el resumen.

test('Life OS registra eventos sin contenido y la interfaz no espera por ellos', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = []
  state.tables.life_habits = [{
    id: '20000000-0000-4000-8000-000000000001', user_id: OWNER_ID, name: 'Leer en secreto', icon: 'flame', color: '#F59E0B',
    frequency: { type: 'daily' }, is_active: true, sort_order: 0, goal_id: null, target_value: null, unit: null, anchor: null,
    reminder_time: null, reminder_enabled: false, created_at: new Date().toISOString(),
  }]
  state.tables.life_habit_logs = []
  state.tables.life_daily_reviews = []
  await installSupabaseMock(context, state, { signedIn: true })
  // Si la RPC de eventos tarda o falla, nada se traba
  await context.route(/\/rest\/v1\/rpc\/track_product_event/, async route => {
    await new Promise(r => setTimeout(r, 3000))
    await route.fulfill({ status: 500, body: '{}' })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life')
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  const habits = page.getByRole('region', { name: 'Hábitos de hoy' })
  await habits.getByRole('checkbox', { name: 'Marcar Leer en secreto como hecho hoy' }).click()
  await expect(habits.getByRole('checkbox', { name: 'Desmarcar Leer en secreto de hoy' })).toBeChecked({ timeout: 1500 })
  const priorities = page.getByRole('region', { name: 'Tus 3 prioridades' })
  await priorities.getByRole('textbox', { name: 'O escribí una…' }).fill('Llamar a mamá')
  await priorities.getByRole('button', { name: 'Agregar' }).click()
  await expect(priorities.getByText('Llamar a mamá')).toBeVisible({ timeout: 1500 })
})

test('los eventos llegan con la lista cerrada y sin textos de la persona', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = []
  state.tables.life_habits = [{
    id: '20000000-0000-4000-8000-000000000001', user_id: OWNER_ID, name: 'Leer en secreto', icon: 'flame', color: '#F59E0B',
    frequency: { type: 'daily' }, is_active: true, sort_order: 0, goal_id: null, target_value: null, unit: null, anchor: null,
    reminder_time: null, reminder_enabled: false, created_at: new Date().toISOString(),
  }]
  state.tables.life_habit_logs = []
  state.tables.life_daily_reviews = []
  state.tables.product_events = []
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life')
  const habits = page.getByRole('region', { name: 'Hábitos de hoy' })
  await habits.getByRole('checkbox', { name: 'Marcar Leer en secreto como hecho hoy' }).click()
  const priorities = page.getByRole('region', { name: 'Tus 3 prioridades' })
  await priorities.getByRole('textbox', { name: 'O escribí una…' }).fill('Llamar a mamá')
  await priorities.getByRole('button', { name: 'Agregar' }).click()
  await expect.poll(() => state.tables.product_events.map(e => e.event).sort())
    .toEqual(['habit_logged', 'life_my_day_opened', 'life_priorities_set'])
  const raw = JSON.stringify(state.tables.product_events)
  expect(raw).not.toContain('Leer en secreto')
  expect(raw).not.toContain('Llamar a mamá')
})

test('el panel de producto muestra las métricas', async ({ page, context }) => {
  const state = createState({ super_admins: [{ id: 'sa-1', user_id: OWNER_ID }] })
  state.tables.product_metrics = [{
    days: 90, events_total: 1234, signups: 40, published: 30, publish_median_seconds: 300,
    retention: [{ week: '2026-09-07', users: 10, d1: 6, d7: 4, d30: null }],
    week_life_users: 20, habit4_users: 5, period_life_users: 25, returned_users: 10, return_median_days: 5,
    referral_signups: 8, referrals: [{ ref: 'ana', signups: 8 }],
  }]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/super-admin/producto')
  await expect(page.getByRole('heading', { level: 1, name: 'Producto' })).toBeVisible()
  await expect(page.getByText('5 min')).toBeVisible()            // mediana hasta publicar
  await expect(page.getByText('75 %')).toBeVisible()             // cuentas publicadas
  await expect(page.getByText('25 %').first()).toBeVisible()     // hábito 4+ días
  const cohort = page.getByRole('row', { name: /10/ })
  await expect(cohort).toContainText('60 %')
  await expect(cohort).toContainText('40 %')
  await expect(cohort).toContainText('…')
  await expect(page.getByRole('cell', { name: '/ana' })).toBeVisible()
})
