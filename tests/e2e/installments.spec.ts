import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Life OS · Dinero: compras en cuotas.

const pad = (n: number) => String(n).padStart(2, '0')
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const now = new Date()
const twoMonthsAgo = key(new Date(now.getFullYear(), now.getMonth() - 2, 1))
const lastMonth = key(new Date(now.getFullYear(), now.getMonth() - 1, 1))

function seed(): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_transactions = []
  state.tables.life_recurring_transactions = []
  state.tables.life_installment_plans = []
  state.tables.life_goals = []
  return state
}

const plan = (over: Record<string, unknown>) => ({
  user_id: OWNER_ID, category: 'Otros', currency: 'ARS', goal_id: null, last_no: 0, cancelled_at: null, ...over,
})

test.use({ viewport: { width: 390, height: 844 } })

test('una compra en 3 cuotas: se cargan las vencidas, la última ajusta los centavos y la fila dice "2 de 3"', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await sheet.getByRole('textbox', { name: 'Monto' }).fill('100')
  await sheet.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Heladera')
  await sheet.getByLabel('Fecha').fill(twoMonthsAgo)

  // "En cuotas" y "Repetir todos los meses" se excluyen
  await sheet.getByRole('checkbox', { name: /Repetir todos los meses/ }).check()
  await sheet.getByRole('checkbox', { name: 'En cuotas' }).check()
  await expect(sheet.getByRole('checkbox', { name: /Repetir todos los meses/ })).not.toBeChecked()
  await sheet.getByRole('spinbutton', { name: 'Cantidad de cuotas' }).fill('3')
  await expect(sheet.getByText(/^3 cuotas de \$\s?33,33$/)).toBeVisible()
  await sheet.getByRole('button', { name: 'Registrar movimiento' }).click()

  await expect.poll(() => state.tables.life_installment_plans.length).toBe(1)
  const p = state.tables.life_installment_plans[0]
  expect(p).toMatchObject({ total_amount: 100, installments: 3, first_date: twoMonthsAgo, description: 'Heladera' })
  expect(state.tables.life_recurring_transactions).toHaveLength(0)
  await expect.poll(() => state.tables.life_transactions.filter(t => t.installment_plan_id === p.id).length).toBe(3)
  const amounts = state.tables.life_transactions
    .filter(t => t.installment_plan_id === p.id)
    .sort((a, b) => Number(a.installment_no) - Number(b.installment_no))
    .map(t => Number(t.amount))
  expect(amounts).toEqual([33.33, 33.33, 33.34])

  await expect(page.getByLabel('Cuota 2 de 3')).toHaveText('2 de 3')
  const card = page.getByRole('region', { name: 'Cuotas en curso' })
  await expect(card.getByText('Heladera', { exact: true })).toBeVisible()
  await expect(card.getByText(/Cuota 3 de 3 · Última cuota cargada/)).toBeVisible()

  // Al volver a abrir no se duplica nada
  await page.reload()
  await expect(page.getByRole('region', { name: 'Cuotas en curso' })).toBeVisible()
  expect(state.tables.life_transactions).toHaveLength(3)
})

test('cancelar las que faltan y eliminar con deshacer', async ({ page, context }) => {
  const state = seed()
  state.tables.life_installment_plans = [
    plan({ id: 'plan-bici', description: 'Bici', total_amount: 600, installments: 6, first_date: lastMonth }),
    plan({ id: 'plan-curso', description: 'Curso', total_amount: 300, installments: 3, first_date: lastMonth, currency: 'USD' }),
  ]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  // El mes pasado y este (el día 1 ya pasó)
  await expect.poll(() => state.tables.life_transactions.length).toBe(4)
  const card = page.getByRole('region', { name: 'Cuotas en curso' })
  await expect(card.getByText(/Cuota 2 de 6/)).toBeVisible()
  await expect(card.getByRole('progressbar', { name: /Bici/ })).toHaveAttribute('aria-valuenow', '2')
  // Lo que falta, cada moneda por su lado
  await expect(card.getByText(/Faltan \$\s?400/)).toBeVisible()
  await expect(card.getByText(/Faltan US\$\s?100/)).toBeVisible()

  await card.getByRole('button', { name: 'Opciones de la compra: Bici' }).click()
  await page.getByRole('menuitem', { name: 'Cancelar las que faltan' }).click()
  await expect.poll(() => state.tables.life_installment_plans.find(x => x.id === 'plan-bici')?.cancelled_at).toBeTruthy()
  await expect(card.getByText('Bici', { exact: true })).toHaveCount(0)
  expect(state.tables.life_transactions.filter(t => t.installment_plan_id === 'plan-bici')).toHaveLength(2)

  // Eliminar: se esconde la compra y sus cuotas; "Deshacer" la trae de vuelta
  await card.getByRole('button', { name: 'Opciones de la compra: Curso' }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect(page.getByRole('region', { name: 'Cuotas en curso' })).toHaveCount(0)
  await expect(page.getByLabel('Cuota 1 de 3')).toHaveCount(0)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(card.getByText('Curso', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Cuota 1 de 3')).toBeVisible()
  expect(state.tables.life_installment_plans).toHaveLength(2)

  // Ahora sí: a los 5 s se borra la compra con sus cuotas
  await card.getByRole('button', { name: 'Opciones de la compra: Curso' }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect.poll(() => state.tables.life_installment_plans.length, { timeout: 10_000 }).toBe(1)
  expect(state.tables.life_transactions.filter(t => t.installment_plan_id === 'plan-curso')).toHaveLength(0)
  expect(state.tables.life_transactions.filter(t => t.installment_plan_id === 'plan-bici')).toHaveLength(2)
})
