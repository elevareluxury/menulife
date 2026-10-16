import { expect, test } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Life OS · Dinero: gastos compartidos y quién le debe a quién.

const today = new Date()
const noon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).toISOString()

function seed(withJuan = false): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_transactions = []
  state.tables.life_recurring_transactions = []
  state.tables.life_goals = []
  state.tables.life_splits = []
  if (withJuan) {
    state.tables.life_transactions.push({
      id: 'tx-cena', user_id: OWNER_ID, type: 'expense', amount: 1000, category: 'Comida', description: 'Cena',
      currency: 'ARS', goal_id: null, recurring_id: null, occurred_at: noon,
    })
    state.tables.life_splits.push({
      id: 'split-juan', user_id: OWNER_ID, transaction_id: 'tx-cena', person: 'Juan', direction: 'owed_to_me', amount: 500,
      currency: 'ARS', note: 'Cena', settled_at: null, settlement_transaction_id: null, created_at: noon,
    })
  }
  return state
}

test.use({ viewport: { width: 390, height: 844 } })

async function openShared(page: import('@playwright/test').Page, amount: string, description: string) {
  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await sheet.getByRole('textbox', { name: 'Monto' }).fill(amount)
  await sheet.getByRole('textbox', { name: 'Descripción (opcional)' }).fill(description)
  await sheet.getByRole('checkbox', { name: /Compartido/ }).check()
  return sheet
}

async function addPerson(sheet: import('@playwright/test').Locator, name: string) {
  await sheet.getByRole('textbox', { name: 'Con quién' }).fill(name)
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).click()
}

test('pagué yo 1000 con Juan a medias: el gasto es el total y "Juan te debe $ 500"', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  const sheet = await openShared(page, '1000', 'Cena')
  await addPerson(sheet, 'Juan')
  await expect(sheet.getByRole('status')).toContainText(/Juan te debe \$\s?500/)
  await expect(sheet.getByRole('status')).toContainText(/Se registra el gasto de \$\s?1\.000 que pagaste/)
  // No se combina con "Repetir todos los meses"
  await expect(sheet.getByRole('checkbox', { name: /Repetir todos los meses/ })).toHaveCount(0)
  const axe = await (await settledAxe(page)).include('[role="dialog"]').analyze()
  expect(axe.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  await sheet.getByRole('button', { name: 'Registrar movimiento' }).click()

  await expect.poll(() => state.tables.life_splits.length).toBe(1)
  const tx = state.tables.life_transactions[0]
  expect(tx).toMatchObject({ type: 'expense', amount: 1000, description: 'Cena' })
  expect(state.tables.life_splits[0]).toMatchObject({ transaction_id: tx.id, person: 'Juan', direction: 'owed_to_me', amount: 500, currency: 'ARS', note: 'Cena' })

  const card = page.getByRole('region', { name: 'Cuentas compartidas' })
  await expect(card.getByText('Juan')).toBeVisible()
  await expect(card.getByText('Te debe')).toBeVisible()
  await expect(card.getByLabel(/Juan te debe \$\s?500/)).toBeVisible()
  // La fila del movimiento lleva el ícono de compartido
  await expect(page.locator('svg[aria-label="Compartido"]')).toHaveCount(1)
})

test('pagó Ana una cena de 3: registro mi parte y "Le debés"', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  const sheet = await openShared(page, '3000', 'Cena en lo de Ana')
  await sheet.getByRole('radio', { name: 'Otra persona' }).click()
  await addPerson(sheet, 'Ana')
  await addPerson(sheet, 'Luis')
  await expect(sheet.getByRole('radio', { name: 'Ana' })).toHaveAttribute('aria-checked', 'true')
  await expect(sheet.getByRole('status')).toContainText(/Le debés \$\s?1\.000 a Ana/)
  await expect(sheet.getByRole('status')).toContainText(/tu parte \(\$\s?1\.000\)/)
  await sheet.getByRole('button', { name: 'Registrar movimiento' }).click()

  await expect.poll(() => state.tables.life_splits.length).toBe(1)
  expect(state.tables.life_transactions[0]).toMatchObject({ type: 'expense', amount: 1000 })
  expect(state.tables.life_splits[0]).toMatchObject({ person: 'Ana', direction: 'i_owe', amount: 1000 })

  const card = page.getByRole('region', { name: 'Cuentas compartidas' })
  await expect(card.getByText('Le debés')).toBeVisible()
  await expect(card.getByLabel(/Le debés \$\s?1\.000 a Ana/)).toBeVisible()
})

test('montos a mano y sugerencias de nombres ya usados', async ({ page, context }) => {
  const state = seed(true)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  const sheet = await openShared(page, '1000', 'Súper')
  await sheet.getByRole('group', { name: 'Nombres que ya usaste' }).getByRole('button', { name: '+ Juan' }).click()
  await sheet.getByRole('radio', { name: 'Montos a mano' }).click()
  await sheet.getByRole('textbox', { name: 'Tu parte' }).fill('700')
  await sheet.getByRole('textbox', { name: 'Parte de Juan' }).fill('200')
  await expect(sheet.getByRole('status')).toContainText(/Faltan \$\s?100 para llegar al total/)
  await sheet.getByRole('button', { name: 'Registrar movimiento' }).click()
  // No se guarda a medias
  await expect(sheet.getByText(/Faltan \$\s?100/).first()).toBeVisible()
  expect(state.tables.life_splits.length).toBe(1)
  await sheet.getByRole('textbox', { name: 'Parte de Juan' }).fill('300')
  await sheet.getByRole('button', { name: 'Registrar movimiento' }).click()
  await expect.poll(() => state.tables.life_splits.length).toBe(2)
  // Juan en total: 500 + 300
  await expect(page.getByRole('region', { name: 'Cuentas compartidas' }).getByLabel(/Juan te debe \$\s?800/)).toBeVisible()
})

test('saldar con Juan registra el ingreso, el saldo desaparece y se puede deshacer', async ({ page, context }) => {
  const state = seed(true)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  const card = page.getByRole('region', { name: 'Cuentas compartidas' })
  await card.getByRole('button', { name: 'Saldar con Juan' }).click()
  const sheet = page.getByRole('dialog', { name: 'Saldar con Juan' })
  await expect(sheet.getByText(/Juan te debe \$\s?500/)).toBeVisible()
  await expect(sheet.getByRole('checkbox', { name: /Registrar el ingreso de \$\s?500/ })).toBeChecked()
  await sheet.getByRole('button', { name: 'Saldar', exact: true }).click()

  await expect.poll(() => state.tables.life_transactions.filter(t => t.type === 'income').length).toBe(1)
  const income = state.tables.life_transactions.find(t => t.type === 'income')!
  expect(income).toMatchObject({ amount: 500, category: 'Otros', description: 'Juan te devolvió', currency: 'ARS' })
  await expect.poll(() => state.tables.life_splits[0].settlement_transaction_id).toBe(income.id)
  expect(state.tables.life_splits[0].settled_at).toBeTruthy()
  await expect(card).toHaveCount(0)
  await expect(sheet).toHaveCount(0)
  await expect(page.getByText('Juan te devolvió', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(() => state.tables.life_transactions.filter(t => t.type === 'income').length).toBe(0)
  expect(state.tables.life_splits[0].settled_at).toBeNull()
  await expect(page.getByRole('region', { name: 'Cuentas compartidas' }).getByLabel(/Juan te debe \$\s?500/)).toBeVisible()
})

test('saldar lo que le debés no suma otro gasto (tu parte ya estaba)', async ({ page, context }) => {
  const state = seed()
  state.tables.life_splits.push({
    id: 'split-ana', user_id: OWNER_ID, transaction_id: null, person: 'Ana', direction: 'i_owe', amount: 1000,
    currency: 'ARS', note: 'Cena', settled_at: null, settlement_transaction_id: null, created_at: noon,
  })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  await page.getByRole('region', { name: 'Cuentas compartidas' }).getByRole('button', { name: 'Saldar con Ana' }).click()
  const sheet = page.getByRole('dialog', { name: 'Saldar con Ana' })
  await expect(sheet.getByText(/no se suma otro gasto/)).toBeVisible()
  await expect(sheet.getByRole('checkbox')).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Saldar', exact: true }).click()
  await expect.poll(() => state.tables.life_splits[0].settled_at).toBeTruthy()
  expect(state.tables.life_transactions).toHaveLength(0)
})
