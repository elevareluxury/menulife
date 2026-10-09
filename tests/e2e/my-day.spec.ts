import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Life OS · V1 etapa 11 — "Mi día": 3 prioridades, completar una, cerrar el día y ver primero lo logrado.

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = dateKey(new Date())
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return dateKey(d) })()

function task(id: string, title: string) {
  return {
    id, user_id: OWNER_ID, type: 'task', title, content: null, due_date: today, due_time: null, remind_minutes: null,
    reminded_at: null, completed_at: null, is_completed: false, is_archived: false, goal_id: null, is_focus: false,
    created_at: new Date().toISOString(), recurrence: null, subtasks: [], next_occurrence_id: null,
  }
}

test('elegir 3 prioridades, completar una, cerrar el día y ver lo logrado primero', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = [
    task('10000000-0000-4000-8000-000000000001', 'Enviar el presupuesto'),
    task('10000000-0000-4000-8000-000000000002', 'Ir al banco'),
    task('10000000-0000-4000-8000-000000000003', 'Pagar la luz'),
  ]
  state.tables.life_habits = []
  state.tables.life_habit_logs = []
  state.tables.life_daily_reviews = []
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life')

  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  const priorities = page.getByRole('region', { name: 'Tus 3 prioridades' })

  // Dos de las tareas y una escrita al vuelo
  for (const name of ['Enviar el presupuesto', 'Ir al banco']) {
    await priorities.getByRole('button', { name: 'Elegir de tus tareas' }).click()
    await page.getByRole('dialog', { name: 'Elegí una tarea' }).getByRole('button', { name }).click()
  }
  await priorities.getByRole('textbox', { name: 'O escribí una…' }).fill('Llamar a mamá')
  await priorities.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(priorities.getByRole('list').getByRole('listitem')).toHaveCount(3)

  // Una cuarta: se explica por qué son 3
  await priorities.getByRole('button', { name: 'Elegir de tus tareas' }).click()
  await expect(priorities.getByText(/Son 3 a propósito/)).toBeVisible()
  await expect.poll(() => (state.tables.life_daily_reviews[0]?.priorities as unknown[] | undefined)?.length).toBe(3)

  // Completar una
  await priorities.getByRole('checkbox', { name: 'Hecha: Enviar el presupuesto' }).click()
  await expect.poll(() => state.tables.life_brain_items.find(r => r.title === 'Enviar el presupuesto')?.is_completed).toBe(true)

  // Cerrar el día: primero lo logrado
  await page.getByRole('region', { name: 'Cerrar el día' }).getByRole('button', { name: 'Cerrar el día' }).click()
  const sheet = page.getByRole('dialog', { name: 'Así fue tu día' })
  await expect(sheet.getByRole('heading', { name: 'Lo que lograste' })).toBeVisible()
  await expect(sheet.getByText('¡Bien! Hoy lograste 1 cosa.')).toBeVisible()
  await expect(sheet.getByRole('list', { name: 'Lo que lograste' }).getByRole('listitem')).toHaveText([/Enviar el presupuesto.*Prioridad/])
  await sheet.getByRole('button', { name: 'Seguir' }).click()

  // Después lo que quedó: pasar a mañana, soltar
  const pending = sheet.getByRole('list', { name: 'Lo que quedó' })
  await expect(pending.getByRole('listitem')).toHaveCount(3)
  await pending.getByRole('listitem', { name: 'Ir al banco' }).getByRole('button', { name: 'Pasar a mañana' }).click()
  await expect.poll(() => state.tables.life_brain_items.find(r => r.title === 'Ir al banco')?.due_date).toBe(tomorrow)
  await pending.getByRole('listitem', { name: 'Llamar a mamá' }).getByRole('button', { name: 'Pasar a mañana' }).click()
  await expect.poll(() => state.tables.life_brain_items.find(r => r.title === 'Llamar a mamá')?.due_date).toBe(tomorrow)
  await expect(pending.getByRole('listitem')).toHaveCount(1)

  await sheet.getByLabel('¿Cómo te fue hoy? (opcional)').fill('Corto pero bien')
  await sheet.getByRole('button', { name: 'Cerrar el día' }).click()
  await expect.poll(() => state.tables.life_daily_reviews[0]?.closed_at).toBeTruthy()
  expect(state.tables.life_daily_reviews[0]).toMatchObject({ date: today, reflection: 'Corto pero bien' })
  await expect(page.getByText('Día cerrado')).toBeVisible()
})

test('el primer día sin datos invita a crear un hábito o una tarea', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = []
  state.tables.life_habits = []
  state.tables.life_habit_logs = []
  state.tables.life_daily_reviews = []
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')
  const empty = page.getByRole('region', { name: 'Empezá tu día' })
  await expect(empty.getByText(/Tomar agua/)).toBeVisible()
  await empty.getByRole('button', { name: 'Crear un hábito' }).click()
  await expect(page).toHaveURL(/\/life\/habits$/)
})

test('con muchos datos (50 tareas y 15 hábitos) Mi día carga y responde rápido', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = Array.from({ length: 50 }, (_, i) => task(`20000000-0000-4000-8000-${String(i).padStart(12, '0')}`, `Tarea ${i + 1}`))
  state.tables.life_habits = Array.from({ length: 15 }, (_, i) => ({
    id: `h-${i}`, user_id: OWNER_ID, name: `Hábito ${i + 1}`, icon: 'Star', color: '#F4705A',
    frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] }, is_active: true, sort_order: i, created_at: new Date().toISOString(),
    goal_id: null, target_value: i % 3 === 0 ? 8 : null, unit: null, anchor: null, reminder_time: null, reminder_enabled: false,
  }))
  state.tables.life_habit_logs = []
  state.tables.life_daily_reviews = []
  await installSupabaseMock(context, state, { signedIn: true })
  const started = Date.now()
  await page.goto('/life')
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  const priorities = page.getByRole('region', { name: 'Tus 3 prioridades' })
  await priorities.getByRole('button', { name: 'Elegir de tus tareas' }).click()
  await expect(page.getByRole('dialog', { name: 'Elegí una tarea' }).getByRole('button')).toHaveCount(51) // 50 tareas + cerrar
  expect(Date.now() - started).toBeLessThan(10_000)
})
