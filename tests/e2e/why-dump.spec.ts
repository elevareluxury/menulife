import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'
import { settle, settledAxe } from './support/settle'

// Life OS · "¿Por qué lo hago?" (frase propia en hábitos y metas, vuelve antes de soltar) y "Vaciar la cabeza"
// (muchas cosas juntas → revisar → guardar todo; sin conexión queda en la cola del dispositivo).

const pad = (n: number) => String(n).padStart(2, '0')
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return key(d) })()

function lifeState() {
  const state = createState()
  for (const t of ['life_transactions', 'life_brain_items', 'life_habits', 'life_habit_logs', 'life_goals', 'life_goal_milestones', 'life_daily_reviews', 'life_recurring_transactions', 'life_categories']) state.tables[t] = []
  return state
}

async function axe(page: Page) {
  await settle(page)
  const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => `${n.html} — ${n.failureSummary}`).join(' | ')}`)).toEqual([])
}

test.use({ viewport: { width: 390, height: 844 } })
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }) })

test('hábito con su "por qué": se guarda, se ve en la tarjeta y vuelve antes de desactivarlo', async ({ page, context }) => {
  const state = lifeState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/habits')

  await page.getByRole('button', { name: 'Nuevo hábito' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo hábito' })
  await sheet.getByLabel('Nombre').fill('Caminar')
  await sheet.getByLabel('¿Por qué es importante para vos?').fill('  Quiero   llegar con energía a la noche  ')
  await sheet.getByRole('button', { name: 'Crear hábito' }).click()
  await expect.poll(() => state.tables.life_habits.length).toBe(1)
  expect(state.tables.life_habits[0]).toMatchObject({ name: 'Caminar', why: 'Quiero llegar con energía a la noche' })
  await expect(page.getByText('“Quiero llegar con energía a la noche”')).toBeVisible()

  // Desactivar: primero aparece su frase, sin culpa
  await page.getByRole('button', { name: 'Opciones del hábito' }).click()
  await page.getByRole('menuitem', { name: 'Desactivar' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Antes de soltarlo' })
  await expect(dialog.getByText('Lo empezaste porque:')).toBeVisible()
  await expect(dialog.getByText('“Quiero llegar con energía a la noche”')).toBeVisible()
  await expect(dialog.getByText('Soltar también está bien')).toBeVisible()
  await axe(page)
  await dialog.getByRole('button', { name: 'Seguir intentando' }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.tables.life_habits[0].is_active).not.toBe(false)

  // "Soltar igual" lo desactiva
  await page.getByRole('button', { name: 'Opciones del hábito' }).click()
  await page.getByRole('menuitem', { name: 'Desactivar' }).click()
  await page.getByRole('alertdialog', { name: 'Antes de soltarlo' }).getByRole('button', { name: 'Soltar igual' }).click()
  await expect.poll(() => state.tables.life_habits[0].is_active).toBe(false)
})

test('hábito sin "por qué": se desactiva directo, como siempre', async ({ page, context }) => {
  const state = lifeState()
  state.tables.life_habits = [{
    id: 'h-1', user_id: OWNER_ID, name: 'Leer', icon: 'Star', color: '#F4705A', frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
    is_active: true, sort_order: 0, created_at: new Date().toISOString(), goal_id: null, target_value: null, unit: null,
    anchor: null, reminder_time: null, reminder_enabled: false, why: null,
  }]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/habits')
  await page.getByRole('button', { name: 'Opciones del hábito' }).click()
  await page.getByRole('menuitem', { name: 'Desactivar' }).click()
  await expect.poll(() => state.tables.life_habits[0].is_active).toBe(false)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
})

test('meta con su "por qué": se ve en la ficha y vuelve antes de borrarla', async ({ page, context }) => {
  const state = lifeState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/goals')
  await page.getByRole('button', { name: 'Nueva meta' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nueva meta' })
  await sheet.getByLabel('Meta', { exact: true }).fill('Correr 10 km')
  await sheet.getByLabel('¿Por qué es importante para vos?').fill('Para sentirme fuerte')
  await sheet.getByRole('button', { name: 'Crear meta' }).click()
  await expect.poll(() => state.tables.life_goals.length).toBe(1)
  expect(state.tables.life_goals[0]).toMatchObject({ name: 'Correr 10 km', why: 'Para sentirme fuerte' })

  await page.getByRole('button', { name: /Correr 10 km/ }).first().click()
  const detail = page.getByRole('dialog', { name: 'Correr 10 km' })
  await expect(detail.getByText('“Para sentirme fuerte”')).toBeVisible()
  await detail.getByRole('button', { name: 'Eliminar meta' }).click()
  const dialog = page.getByRole('alertdialog', { name: '¿Eliminar meta?' })
  await expect(dialog.getByText('“Para sentirme fuerte”')).toBeVisible()
  await dialog.getByRole('button', { name: 'Seguir intentando' }).click()
  expect(state.tables.life_goals).toHaveLength(1)
})

test('vaciar la cabeza: 4 cosas mezcladas → revisar → guardar crea tareas, gasto e idea', async ({ page, context }) => {
  const state = lifeState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')

  await page.getByRole('button', { name: 'Capturar' }).click()
  await page.getByRole('button', { name: 'Vaciar la cabeza' }).click()
  const sheet = page.getByRole('dialog', { name: 'Vaciar la cabeza' })
  await sheet.getByLabel('Lo que tenés en la cabeza').fill([
    'mañana a las 10 llamar al médico',
    'gasté 3500 en el súper',
    'idea: app para regar plantas',
    'comprar pan',
  ].join('\n'))
  await sheet.getByRole('button', { name: 'Revisar' }).click()

  await expect(sheet.getByRole('heading', { name: 'Encontramos 4 cosas' })).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Tipo de "Llamar al médico": Tarea. Tocá para cambiarlo' })).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Tipo de "Súper": Gasto. Tocá para cambiarlo' })).toBeVisible()
  await expect(sheet.getByLabel('Monto de "Súper"')).toHaveValue('3500')
  await expect(sheet.getByRole('button', { name: 'Tipo de "App para regar plantas": Idea. Tocá para cambiarlo' })).toBeVisible()
  // "Comprar pan" llegó como idea: un toque la pasa a tarea
  await sheet.getByRole('button', { name: 'Tipo de "Comprar pan": Idea. Tocá para cambiarlo' }).click()
  await expect(sheet.getByRole('button', { name: 'Tipo de "Comprar pan": Tarea. Tocá para cambiarlo' })).toBeVisible()
  await axe(page)

  await sheet.getByRole('button', { name: 'Guardar todo (4)' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByText('Guardaste 4 cosas')).toBeVisible()

  const brain = state.tables.life_brain_items
  expect(brain).toHaveLength(3)
  expect(brain.find(b => b.title === 'Llamar al médico')).toMatchObject({ type: 'task', due_date: tomorrow, due_time: '10:00' })
  expect(brain.find(b => b.title === 'Comprar pan')).toMatchObject({ type: 'task', due_date: null })
  expect(brain.find(b => b.title === 'App para regar plantas')).toMatchObject({ type: 'idea' })
  expect(state.tables.life_transactions).toHaveLength(1)
  expect(state.tables.life_transactions[0]).toMatchObject({ type: 'expense', amount: 3500, description: 'Súper', category: 'Otros' })
})

test('vaciar la cabeza: se puede quitar una cosa y sin conexión queda en la cola', async ({ page, context }) => {
  const state = lifeState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')

  await page.getByRole('button', { name: 'Capturar' }).click()
  await page.getByRole('button', { name: 'Vaciar la cabeza' }).click()
  const sheet = page.getByRole('dialog', { name: 'Vaciar la cabeza' })
  await sheet.getByLabel('Lo que tenés en la cabeza').fill('Pagar la luz el lunes. Cobré 2000 del freelance. Algo que no va')
  await sheet.getByRole('button', { name: 'Revisar' }).click()
  await expect(sheet.getByRole('heading', { name: 'Encontramos 3 cosas' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Quitar "Algo que no va"' }).click()
  await expect(sheet.getByRole('heading', { name: 'Encontramos 2 cosas' })).toBeVisible()

  // Sin red: las llamadas a la base fallan como en un celular sin señal
  const LIFE_ROWS = /\/rest\/v1\/life_(brain_items|transactions)/
  await page.route(LIFE_ROWS, route => route.abort('internetdisconnected'))
  await sheet.getByRole('button', { name: 'Guardar todo (2)' }).click()
  await expect(sheet).toHaveCount(0)
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem('mycen_life_outbox') ?? '[]') as { table: string }[])
  expect(queued.map(q => q.table).sort()).toEqual(['life_brain_items', 'life_transactions'])

  // Al volver la conexión se sube sola
  await page.unroute(LIFE_ROWS)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect.poll(() => state.tables.life_brain_items.length + state.tables.life_transactions.length).toBe(2)
  expect(state.tables.life_transactions[0]).toMatchObject({ type: 'income', amount: 2000 })
})
