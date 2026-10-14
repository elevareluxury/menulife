import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow } from './support/mockSupabase'

// Insights y "Tu mes" (Replay), prendidos antes del freeze de la V1.

const day = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)

function seed() {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_brain_items = []
  state.tables.life_goals = []
  state.tables.life_goal_milestones = []
  state.tables.life_transactions = []
  state.tables.life_achievements = []
  state.tables.life_daily_reviews = []
  state.tables.life_habits = [{
    id: '20000000-0000-4000-8000-000000000001', user_id: OWNER_ID, name: 'Leer', icon: 'book-open', color: '#8B5CF6',
    frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] }, is_active: true, sort_order: 0, goal_id: null, target_value: null,
    unit: null, anchor: null, reminder_time: null, reminder_enabled: false, created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  }]
  state.tables.life_habit_logs = Array.from({ length: 30 }, (_, i) => ({
    id: `l${i}`, habit_id: '20000000-0000-4000-8000-000000000001', user_id: OWNER_ID, completed_date: day(i), value: 1,
  }))
  return state
}

test.use({ viewport: { width: 390, height: 844 } })

test('Insights muestra patrones con los datos reales', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life/insights')
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible()
  await expect(page.getByText('Tu hábito más constante')).toBeVisible()
  await expect(page.getByText(/Leer: cumpliste el 100%/)).toBeVisible()
})

test('"Tu mes" se abre desde Mi día y no muestra un 0 de logros', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life')
  await page.getByRole('button', { name: /Ver recap del mes/ }).click()
  await expect(page).toHaveURL(/\/life\/replay$/)
  await expect(page.getByText('Tu mes en resumen', { exact: false })).toBeVisible()
  await expect(page.getByText('logros desbloqueados')).toHaveCount(0)
})
