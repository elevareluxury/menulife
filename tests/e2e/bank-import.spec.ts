import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// V1.1 · Importar movimientos del banco (beta: se prende con ?beta=1).

function seed(): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_transactions = [{
    id: 't-old', user_id: OWNER_ID, type: 'expense', amount: 15230.5, category: 'Comida', description: 'COMPRA DEBITO SUPERMERCADO',
    currency: 'ARS', occurred_at: '2026-03-02T15:00:00.000Z', goal_id: null,
  }, {
    // Ya ordenado a mano: lo que se parece toma esta categoría al importar
    id: 't-netflix', user_id: OWNER_ID, type: 'expense', amount: 8999, category: 'Suscripciones', description: 'DEBITO AUTOMATICO NETFLIX 0925',
    currency: 'ARS', occurred_at: new Date(Date.now() - 30 * 86_400_000).toISOString(), goal_id: null,
  }]
  state.tables.life_recurring_transactions = []
  state.tables.life_goals = []
  return state
}

// Extracto de un banco argentino en Windows-1252 (como lo bajan muchos home banking), con un movimiento que ya estaba
const CSV = [
  'Cuenta;CA $ 1234/5',
  '',
  'Fecha;Descripción;Débitos;Créditos;Saldo',
  '02/03/2026;COMPRA DEBITO SUPERMERCADO;15.230,50;;100.000,00',
  '05/03/2026;TRANSFERENCIA RECIBIDA;;850.000,00;950.000,00',
  '10/03/2026;DÉBITO AUTOMÁTICO NETFLIX;8.999,00;;941.001,00',
].join('\r\n')
const latin1 = Buffer.from(CSV, 'latin1')

test.use({ viewport: { width: 390, height: 844 } })

test('sin ?beta=1 el botón no aparece', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life/money')
  await expect(page.getByRole('heading', { level: 1, name: 'Dinero' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Importar del banco' })).toHaveCount(0)
})

test('importa un CSV del banco sin duplicar lo que ya estaba', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money?beta=1')
  await page.getByRole('button', { name: 'Importar del banco' }).click()
  const sheet = page.getByRole('dialog', { name: 'Importar del banco' })
  await sheet.getByLabel('Elegir archivo').setInputFiles({ name: 'movimientos.csv', mimeType: 'text/csv', buffer: latin1 })

  await expect(sheet.getByLabel('Débitos', { exact: true })).toHaveValue('2')
  await expect(sheet.getByLabel('Créditos', { exact: true })).toHaveValue('3')
  await expect(sheet.getByRole('status')).toHaveText('2 para importar')
  await expect(sheet.getByText('1 ya estaban (no se repiten)')).toBeVisible()
  await expect(sheet.getByText('DÉBITO AUTOMÁTICO NETFLIX')).toBeVisible()
  await expect(sheet.getByText('1 movimiento toma la categoría que ya usaste antes; el resto entra en Otros.')).toBeVisible()

  await sheet.getByRole('button', { name: 'Importar 2 movimientos' }).click()
  await expect(page.getByText('Listo: 2 movimientos importados.')).toBeVisible()
  const added = state.tables.life_transactions.filter(t => t.id !== 't-old' && t.id !== 't-netflix')
  expect(added.map(t => [t.type, Number(t.amount), t.description, t.currency, t.category])).toEqual([
    ['income', 850000, 'TRANSFERENCIA RECIBIDA', 'ARS', 'Otros'],
    ['expense', 8999, 'DÉBITO AUTOMÁTICO NETFLIX', 'ARS', 'Suscripciones'],
  ])
  // La beta queda recordada en el dispositivo
  await page.goto('/life/money')
  await expect(page.getByRole('button', { name: 'Importar del banco' })).toBeVisible()
})

test('importa un Excel (.xlsx) y avisa con un .xls viejo', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money?beta=1')
  await page.getByRole('button', { name: 'Importar del banco' }).click()
  const sheet = page.getByRole('dialog', { name: 'Importar del banco' })

  await sheet.getByLabel('Elegir archivo').setInputFiles({ name: 'viejo.xls', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) })
  await expect(sheet.getByRole('alert')).toHaveText(/Excel viejo/)

  await sheet.getByLabel('Elegir archivo').setInputFiles('tests/e2e/fixtures/banco.xlsx')
  await expect(sheet.getByRole('status')).toHaveText('3 para importar')
  await sheet.getByRole('button', { name: 'Importar 3 movimientos' }).click()
  await expect.poll(() => state.tables.life_transactions.length).toBe(5)
  const byDesc = Object.fromEntries(state.tables.life_transactions.map(t => [t.description, t]))
  expect(Number(byDesc['Farmacia'].amount)).toBe(12.75)
  expect(byDesc['Sueldo octubre'].type).toBe('income')
  expect(String(byDesc['Panadería Sol'].occurred_at).slice(0, 10)).toBe('2026-03-02')
})
