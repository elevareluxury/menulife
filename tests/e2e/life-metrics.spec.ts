import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, type MockState } from './support/mockSupabase'

// Métricas de Life OS (¿cumple su promesa?): cada evento sale una vez, en el momento en que pasa, y sin textos de la
// persona. El mock guarda las llamadas a track_product_event en state.tables.product_events.

function lifeState() {
  const state = createState()
  for (const t of ['life_transactions', 'life_brain_items', 'life_habits', 'life_habit_logs', 'life_goals', 'life_goal_milestones',
    'life_daily_reviews', 'life_recurring_transactions', 'life_categories', 'product_events']) state.tables[t] = []
  return state
}

const GOAL = {
  id: '30000000-0000-4000-8000-000000000001', user_id: OWNER_ID, name: 'Viaje a Japón', description: null, target_date: null,
  progress: 0, status: 'in_progress', color: '#F4705A', sort_order: 0, why: null, created_at: new Date().toISOString(),
}

const events = (state: MockState, name: string) => state.tables.product_events.filter(e => e.event === name)

test.use({ viewport: { width: 390, height: 844 } })
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }) })

test('meta nueva y una tarea desde la meta: goal_created e item_linked_to_goal una vez cada uno', async ({ page, context }) => {
  const state = lifeState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/goals')
  await page.getByRole('button', { name: 'Nueva meta' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nueva meta' })
  await sheet.getByLabel('Meta', { exact: true }).fill('Correr 10 km')
  await sheet.getByRole('button', { name: 'Crear meta' }).click()
  await expect.poll(() => state.tables.life_goals.length).toBe(1)
  await expect.poll(() => events(state, 'goal_created').map(e => e.props)).toEqual([{}])
  expect(events(state, 'item_linked_to_goal')).toEqual([])

  await page.getByRole('button', { name: /Correr 10 km/ }).first().click()
  const detail = page.getByRole('dialog', { name: 'Correr 10 km' })
  await detail.getByLabel('Agregar una tarea…').fill('Comprar zapatillas')
  await detail.getByLabel('Agregar una tarea…').press('Enter')
  await expect(detail.getByText('Comprar zapatillas')).toBeVisible()
  await expect.poll(() => events(state, 'item_linked_to_goal').map(e => e.props)).toEqual([{ tipo: 'task' }])

  // Una sola vez cada uno, y nada de lo escrito viaja en los eventos
  await page.waitForTimeout(300)
  expect(events(state, 'goal_created')).toHaveLength(1)
  expect(events(state, 'item_linked_to_goal')).toHaveLength(1)
  const raw = JSON.stringify(state.tables.product_events)
  expect(raw).not.toContain('Correr 10 km')
  expect(raw).not.toContain('Comprar zapatillas')
})

test('hábito vinculado a una meta: item_linked_to_goal {habit}; sin meta no se manda', async ({ page, context }) => {
  const state = lifeState()
  state.tables.life_goals = [GOAL]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/habits')

  await page.getByRole('button', { name: 'Nuevo hábito' }).first().click()
  let sheet = page.getByRole('dialog', { name: 'Nuevo hábito' })
  await sheet.getByLabel('Nombre').fill('Estudiar japonés')
  await sheet.getByLabel('Meta (opcional)').selectOption({ label: 'Viaje a Japón' })
  await sheet.getByRole('button', { name: 'Crear hábito' }).click()
  await expect.poll(() => state.tables.life_habits.length).toBe(1)
  await expect.poll(() => events(state, 'item_linked_to_goal').map(e => e.props)).toEqual([{ tipo: 'habit' }])

  await page.getByRole('button', { name: 'Nuevo hábito' }).first().click()
  sheet = page.getByRole('dialog', { name: 'Nuevo hábito' })
  await sheet.getByLabel('Nombre').fill('Caminar')
  await sheet.getByRole('button', { name: 'Crear hábito' }).click()
  await expect.poll(() => state.tables.life_habits.length).toBe(2)
  await page.waitForTimeout(300)
  expect(events(state, 'item_linked_to_goal')).toHaveLength(1)
})

test('captura rápida de una idea con meta: capture_used {quick, idea} e item_linked_to_goal {note}', async ({ page, context }) => {
  const state = lifeState()
  state.tables.life_goals = [GOAL]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')

  await page.getByRole('button', { name: 'Capturar' }).click()
  await page.getByRole('button', { name: 'Idea', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo pensamiento' })
  await sheet.getByLabel('Idea', { exact: true }).fill('Pasaje en temporada baja')
  await sheet.getByLabel('Meta (opcional)').selectOption({ label: 'Viaje a Japón' })
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect.poll(() => state.tables.life_brain_items.length).toBe(1)
  await expect.poll(() => events(state, 'capture_used').map(e => e.props)).toEqual([{ tipo: 'quick', dest: 'idea' }])
  await expect.poll(() => events(state, 'item_linked_to_goal').map(e => e.props)).toEqual([{ tipo: 'note' }])
  await page.waitForTimeout(300)
  expect(events(state, 'capture_used')).toHaveLength(1)
  expect(JSON.stringify(state.tables.product_events)).not.toContain('temporada')
})

test('vaciar la cabeza: un capture_used por destino, con cuántas cosas fueron ahí', async ({ page, context }) => {
  const state = lifeState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')

  await page.getByRole('button', { name: 'Capturar' }).click()
  await page.getByRole('button', { name: 'Vaciar la cabeza' }).click()
  const sheet = page.getByRole('dialog', { name: 'Vaciar la cabeza' })
  await sheet.getByLabel('Lo que tenés en la cabeza').fill([
    'mañana a las 10 llamar al médico',
    'pagar la luz el lunes',
    'gasté 3500 en el súper',
    'idea: app para regar plantas',
  ].join('\n'))
  await sheet.getByRole('button', { name: 'Revisar' }).click()
  await expect(sheet.getByRole('heading', { name: 'Encontramos 4 cosas' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Guardar todo (4)' }).click()
  await expect(page.getByText('Guardaste 4 cosas')).toBeVisible()

  await expect.poll(() => events(state, 'capture_used').map(e => e.props)
    .sort((a, b) => String(a.dest).localeCompare(String(b.dest)))).toEqual([
    { tipo: 'dump', dest: 'idea' },
    { tipo: 'dump', dest: 'money' },
    { tipo: 'dump', dest: 'task', count: 2 },
  ])
  expect(JSON.stringify(state.tables.product_events)).not.toContain('médico')
})

test('tocar un recordatorio: reminder_opened una vez y la dirección queda limpia', async ({ page, context }) => {
  const state = lifeState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/habits?aviso=habit.push')
  await expect(page).toHaveURL(/\/life\/habits$/)
  await expect.poll(() => events(state, 'reminder_opened').map(e => e.props)).toEqual([{ kind: 'habit', channel: 'push' }])

  // Con otros parámetros, sólo se saca el del aviso
  await page.goto('/life/brain?vista=tareas&aviso=task.app')
  await expect(page).toHaveURL(/\/life\/brain\?vista=tareas$/)
  await expect.poll(() => events(state, 'reminder_opened').map(e => e.props))
    .toEqual([{ kind: 'habit', channel: 'push' }, { kind: 'task', channel: 'app' }])

  // Una marca desconocida se limpia sin registrar nada
  await page.goto('/life?aviso=lo-que-sea')
  await expect(page).toHaveURL(/\/life$/)
  await page.waitForTimeout(300)
  expect(events(state, 'reminder_opened')).toHaveLength(2)
})
