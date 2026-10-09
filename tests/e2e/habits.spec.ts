import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Life OS · V1 etapa 10: hábito con cantidad, "3 veces por semana" y racha que sobrevive a un día perdido.

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dateKey(d) }

function habit(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id, user_id: OWNER_ID, name, icon: 'Star', color: '#F4705A', frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
    is_active: true, sort_order: 0, created_at: new Date().toISOString(), goal_id: null, target_value: null, unit: null,
    anchor: null, reminder_time: null, reminder_enabled: false, ...extra,
  }
}
const log = (habitId: string, date: string, value = 1) => ({ id: `log-${habitId}-${date}`, habit_id: habitId, user_id: OWNER_ID, completed_date: date, value })

test('hábito con cantidad: se crea con meta, ancla y recordatorio, y "+1" llena el anillo', async ({ page, context }) => {
  const state = createState()
  state.tables.life_habits = []
  state.tables.life_habit_logs = []
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life/habits')

  await page.getByRole('button', { name: /Crear|Nuevo hábito|Agregar/ }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo hábito' })
  await sheet.getByLabel('Nombre').fill('Tomar agua')
  await sheet.getByRole('checkbox', { name: 'Con cantidad' }).check()
  await sheet.getByLabel('Meta por día').fill('3')
  await sheet.getByLabel('Unidad').fill('vasos')
  await sheet.getByLabel('Después de… (opcional)').fill('el café')
  await sheet.getByRole('checkbox', { name: 'Recordatorio' }).check()
  await sheet.getByLabel('Hora').fill('08:30')
  await sheet.getByRole('button', { name: 'Crear hábito' }).click()

  await expect.poll(() => state.tables.life_habits.length).toBe(1)
  expect(state.tables.life_habits[0]).toMatchObject({ name: 'Tomar agua', target_value: 3, unit: 'vasos', anchor: 'el café', reminder_enabled: true, reminder_time: '08:30' })

  const card = page.getByText('Tomar agua', { exact: true }).locator('xpath=ancestor::*[contains(@style, "position: relative")][1]')
  await expect(card.getByText('Después de el café · 0 de 3 vasos')).toBeVisible()
  const plus = card.getByRole('button', { name: /Sumar 1 a Tomar agua/ })
  await plus.click()
  await expect(card.getByText(/1 de 3 vasos/)).toBeVisible()
  await plus.click()
  await plus.click()
  await expect(card.getByText(/3 de 3 vasos/)).toBeVisible()
  // Un solo registro del día, con el valor acumulado
  await expect.poll(() => state.tables.life_habit_logs.map(l => [l.completed_date, l.value])).toEqual([[dateKey(new Date()), 3]])
})

test('"3 veces por semana" muestra el avance semanal y la racha que perdona un día perdido', async ({ page, context }) => {
  const state = createState()
  state.tables.user_settings = [{ user_id: OWNER_ID, language: 'es', week_start: 1 }]
  state.tables.life_habits = [
    habit('h-run', 'Correr', { frequency: { type: 'times_per_week', times: 3 } }),
    // Leer: hecho anteayer y los 3 días anteriores; ayer se perdió y hoy todavía no → la racha sigue en 4
    habit('h-read', 'Leer', { sort_order: 1 }),
  ]
  // Esta semana: los días cumplidos son los de la semana actual hasta hoy
  const monday = (() => { const d = new Date(); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return d })()
  const thisWeek = Array.from({ length: (new Date().getDay() + 6) % 7 + 1 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return dateKey(d) })
  state.tables.life_habit_logs = [
    ...thisWeek.slice(0, 1).map(d => log('h-run', d)),
    log('h-read', daysAgo(2)), log('h-read', daysAgo(3)), log('h-read', daysAgo(4)), log('h-read', daysAgo(5)),
  ]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/habits')

  await expect(page.getByText('1 de 3 esta semana')).toBeVisible()
  // Racha de Leer: 4 días, aunque ayer se perdió (un día perdido no la corta)
  await expect(page.getByTitle('Racha de 4 días')).toBeVisible()
  // Un segundo día perdido sí la corta: sin el registro de anteayer, la racha queda en 0
  state.tables.life_habit_logs = state.tables.life_habit_logs.filter(l => l.completed_date !== daysAgo(2))
  await page.reload()
  await expect(page.getByText('1 de 3 esta semana')).toBeVisible()
  await expect(page.getByTitle(/^Racha de/)).toHaveCount(0)
})
