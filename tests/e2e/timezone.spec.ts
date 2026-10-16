import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, type MockState } from './support/mockSupabase'

// Life OS usa la zona horaria de la cuenta (user_settings.timezone), no la del celular.
// El navegador está en Buenos Aires (UTC−3) y la cuenta en Kiritimati (UTC+14): a las 12:00 UTC del 30 de septiembre
// de 2026, en el celular es miércoles 30 de septiembre (9 h) y para la cuenta ya es jueves 1 de octubre (2 h).

const NOW = new Date('2026-09-30T12:00:00Z')
const ACCOUNT_TZ = 'Pacific/Kiritimati'
const DEVICE_TZ = 'America/Argentina/Buenos_Aires'

test.use({ timezoneId: DEVICE_TZ, viewport: { width: 390, height: 844 } })

const task = (id: string, title: string, due: string) => ({
  id, user_id: OWNER_ID, type: 'task', title, content: null, due_date: due, due_time: null, remind_minutes: null,
  reminded_at: null, completed_at: null, is_completed: false, is_archived: false, goal_id: null, is_focus: false,
  created_at: '2026-09-20T12:00:00Z', recurrence: null, subtasks: [], next_occurrence_id: null,
})

const tx = (id: string, description: string, occurred_at: string) => ({
  id, user_id: OWNER_ID, type: 'expense', amount: 1000, currency: 'ARS', category: 'Comida', description, occurred_at,
  goal_id: null, recurring_id: null,
})

function seed(): MockState {
  const state = createState()
  state.tables.user_settings = [{ user_id: OWNER_ID, language: 'es', currency: 'ARS', extra_currencies: [], week_start: 1, timezone: ACCOUNT_TZ }]
  state.tables.life_brain_items = [
    task('10000000-0000-4000-8000-000000000001', 'Tarea del jueves', '2026-10-01'),
    task('10000000-0000-4000-8000-000000000002', 'Tarea del miércoles', '2026-09-30'),
  ]
  state.tables.life_habits = [{
    id: 'h-read', user_id: OWNER_ID, name: 'Leer', icon: 'Star', color: '#F4705A',
    frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] }, is_active: true, sort_order: 0,
    created_at: '2026-09-01T12:00:00Z', goal_id: null, target_value: null, unit: null, anchor: null,
    reminder_time: null, reminder_enabled: false,
  }]
  state.tables.life_habit_logs = []
  state.tables.life_daily_reviews = []
  state.tables.life_transactions = [
    // 13:00 UTC del 30/9 = 3 h del 1/10 en Kiritimati (10 h del 30/9 en Buenos Aires)
    tx('t-oct', 'Café de octubre', '2026-09-30T13:00:00Z'),
    tx('t-sep', 'Súper de septiembre', '2026-09-29T15:00:00Z'),
  ]
  state.tables.life_recurring_transactions = []
  state.tables.life_installment_plans = []
  state.tables.life_splits = []
  state.tables.life_goals = []
  return state
}

test('Mi día, tareas y hábitos usan el "hoy" de la zona de la cuenta', async ({ page, context }) => {
  const state = seed()
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')

  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  // La fecha de Mi día es la de la cuenta (jueves 1 de octubre), no la del celular (miércoles 30 de septiembre)
  await expect(page.getByText('Jueves, 1 de octubre', { exact: true })).toBeVisible()

  // La tarea de hoy (1/10) está en la tarjeta; la del 30/9 ya está vencida
  const tasks = page.getByRole('region', { name: 'Tareas', exact: true })
  await expect(tasks.getByText('Tarea del jueves', { exact: true })).toBeVisible()
  await expect(tasks.getByText('Tarea del miércoles', { exact: true })).toHaveCount(0)
  await expect(tasks.getByRole('button', { name: /Vencidas · 1/ })).toBeVisible()

  // Tildar el hábito guarda el día de la cuenta
  await page.getByRole('region', { name: 'Hábitos de hoy' }).getByRole('checkbox', { name: 'Marcar Leer como hecho hoy' }).click()
  await expect.poll(() => state.tables.life_habit_logs.map(l => l.completed_date)).toEqual(['2026-10-01'])
})

test('Dinero muestra el mes de la zona de la cuenta', async ({ page, context }) => {
  const state = seed()
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  await expect(page.getByRole('heading', { name: 'octubre' })).toBeVisible()
  await expect(page.getByText('Café de octubre', { exact: true })).toBeVisible()
  await expect(page.getByText('Súper de septiembre', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled()

  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(page.getByRole('heading', { name: 'septiembre' })).toBeVisible()
  await expect(page.getByText('Súper de septiembre', { exact: true })).toBeVisible()
  await expect(page.getByText('Café de octubre', { exact: true })).toHaveCount(0)
})

test('Ajustes avisa que el celular está en otra zona y deja usar la del celular', async ({ page, context }) => {
  const state = seed()
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/settings')

  const note = page.getByTestId('timezone-other')
  // Chromium nombra la zona del celular con su alias canónico (America/Buenos_Aires)
  await expect(note).toContainText(/^Tu celular está en otra zona horaria \(America\/(Argentina\/)?Buenos Aires\)\. Mycen usa la elegida acá\./)
  await expect(page.getByRole('combobox', { name: 'Zona horaria' })).toHaveValue(ACCOUNT_TZ)
  await note.getByRole('button', { name: 'Usar la del celular' }).click()
  await expect.poll(() => state.tables.user_settings[0]?.timezone).toMatch(/^America\/(Argentina\/)?Buenos_Aires$/)
  await expect(note).toHaveCount(0)

  // Con la zona del celular, "hoy" vuelve a ser el miércoles 30 de septiembre
  await page.goto('/life')
  await expect(page.getByText('Miércoles, 30 de septiembre', { exact: true })).toBeVisible()
})

test('sin zona elegida, Life OS sigue al celular y no guarda una zona al cambiar otra preferencia', async ({ page, context }) => {
  const state = seed()
  state.tables.user_settings = [{ user_id: OWNER_ID, language: 'es', currency: 'ARS', extra_currencies: [], week_start: 1, timezone: null }]
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')
  await expect(page.getByText('Miércoles, 30 de septiembre', { exact: true })).toBeVisible()

  await page.goto('/life/settings')
  await expect(page.getByTestId('timezone-other')).toHaveCount(0)
  await page.getByRole('radio', { name: 'Domingo' }).click()
  await expect.poll(() => state.tables.user_settings[0]?.week_start).toBe(0)
  expect(state.tables.user_settings[0]?.timezone).toBeNull()
})
