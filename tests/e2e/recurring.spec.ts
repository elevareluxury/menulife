import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Life OS · Dinero: gastos e ingresos fijos que se repiten cada mes.

const pad = (n: number) => String(n).padStart(2, '0')
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const now = new Date()
const firstOfMonth = key(new Date(now.getFullYear(), now.getMonth(), 1))
const twoMonthsAgo = key(new Date(now.getFullYear(), now.getMonth() - 2, 1))

function seed(): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_transactions = []
  state.tables.life_recurring_transactions = []
  state.tables.life_goals = []
  return state
}

test.use({ viewport: { width: 390, height: 844 } })

test('un gasto que se repite: se crea, se carga solo y aparece en Fijos del mes', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await sheet.getByRole('textbox', { name: 'Monto' }).fill('250000')
  await sheet.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Alquiler')
  await sheet.getByLabel('Fecha').fill(firstOfMonth)
  await sheet.getByRole('checkbox', { name: /Repetir todos los meses/ }).check()
  await expect(sheet.getByText('Se carga solo el día 1 de cada mes.')).toBeVisible()
  await sheet.getByRole('button', { name: 'Registrar movimiento' }).click()

  await expect.poll(() => state.tables.life_recurring_transactions.length).toBe(1)
  const fixed = state.tables.life_recurring_transactions[0]
  expect(fixed).toMatchObject({ amount: 250000, day_of_month: 1, starts_on: firstOfMonth, description: 'Alquiler', active: true })
  // El de este mes ya venció: se cargó enseguida, marcado como generado
  await expect.poll(() => state.tables.life_transactions.filter(t => t.recurring_id === fixed.id).length).toBe(1)

  const card = page.getByRole('region', { name: 'Fijos del mes' })
  await expect(card.getByText('Alquiler')).toBeVisible()
  await expect(card.getByText(/Todos los meses, el día 1 · Próximo:/)).toBeVisible()
})

test('lo vencido se carga al abrir, sin duplicar; pausar, reanudar y editar', async ({ page, context }) => {
  const state = seed()
  state.tables.life_recurring_transactions = [{
    id: 'rec-1', user_id: OWNER_ID, type: 'expense', amount: 9.99, category: 'Suscripciones', description: 'Música',
    currency: 'ARS', goal_id: null, day_of_month: 1, starts_on: twoMonthsAgo, last_period: null, active: true,
  }]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  // Dos meses atrás, el anterior y este (el día 1 ya pasó)
  await expect.poll(() => state.tables.life_transactions.length).toBe(3)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Fijos del mes' })).toBeVisible()
  expect(state.tables.life_transactions.length).toBe(3)

  const card = page.getByRole('region', { name: 'Fijos del mes' })
  await card.getByRole('button', { name: /Opciones del fijo: Música/ }).click()
  await page.getByRole('menuitem', { name: 'Pausar' }).click()
  await expect(card.getByText('En pausa')).toBeVisible()
  expect(state.tables.life_recurring_transactions[0].active).toBe(false)

  await card.getByRole('button', { name: /Opciones del fijo: Música/ }).click()
  await page.getByRole('menuitem', { name: 'Reanudar' }).click()
  await expect(card.getByText(/Todos los meses, el día 1/)).toBeVisible()
  // Al reanudar no se recargan los meses en pausa: sigue desde el próximo
  expect(state.tables.life_recurring_transactions[0].last_period).toBe(firstOfMonth.slice(0, 7))

  await card.getByRole('button', { name: /Opciones del fijo: Música/ }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  const sheet = page.getByRole('dialog', { name: 'Editar fijo' })
  await expect(sheet.getByText(/valen de acá en adelante/)).toBeVisible()
  await sheet.getByRole('textbox', { name: 'Monto' }).fill('12,50')
  await sheet.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect.poll(() => Number(state.tables.life_recurring_transactions[0].amount)).toBe(12.5)
  // Lo ya cargado no cambia
  expect(state.tables.life_transactions.every(t => Number(t.amount) === 9.99)).toBe(true)
  await expect(card.getByText('-$ 12,50')).toBeVisible()
})
