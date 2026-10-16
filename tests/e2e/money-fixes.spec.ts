import { expect, test, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Life OS · Dinero: movimientos con fecha futura, editar un gasto compartido y el + de Dinero sin conexión.

// Fecha fija: 15 de octubre de 2026, 10 de la mañana (hora local)
const NOW = new Date(2026, 9, 15, 10)
const noon = (m: number, d: number) => new Date(2026, m - 1, d, 12).toISOString()

let n = 0
const tx = (p: Record<string, unknown>) => ({
  id: `t${++n}`, user_id: OWNER_ID, type: 'expense', currency: 'ARS', goal_id: null, recurring_id: null, description: null, ...p,
})

function seed(): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_transactions = []
  state.tables.life_recurring_transactions = []
  state.tables.life_installment_plans = []
  state.tables.life_goals = []
  state.tables.life_splits = []
  return state
}

test.use({ viewport: { width: 390, height: 844 } })

async function openEdit(page: Page, name: string) {
  const row = page.getByText(name, { exact: true }).locator('xpath=ancestor::div[.//button[@aria-label="Opciones"]][1]')
  await row.getByRole('button', { name: 'Opciones' }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  return page.getByRole('dialog', { name: 'Editar movimiento' })
}

test('fecha futura: se ve marcada, cuenta en el balance recién ese día, va en "Próximos" y se puede ir al mes que viene', async ({ page, context }) => {
  const state = seed()
  state.tables.life_transactions.push(
    tx({ amount: 1000, category: 'Comida', description: 'Súper', occurred_at: noon(10, 10) }),
    tx({ amount: 3000, category: 'Hogar', description: 'Alquiler', occurred_at: noon(10, 20) }),
    tx({ amount: 500, category: 'Otros', description: 'Seguro', occurred_at: noon(11, 5) }),
  )
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  // En la lista, marcado como programado
  await expect(page.getByText('Alquiler', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Programado, en 5 días')).toBeVisible()
  // El balance sólo cuenta lo que ya pasó
  await expect(page.locator('span').filter({ hasText: /^Gastos\s*\$\s?1\.000$/ })).toHaveCount(1)
  // Lo programado, aparte y por moneda
  const upcoming = page.getByRole('region', { name: 'Próximos' })
  await expect(upcoming).toContainText('1 movimiento')
  await expect(upcoming).toContainText(/-\$\s?3\.000/)

  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')]
    .filter(e => e.tagName !== 'BUTTON').every(e => getComputedStyle(e).opacity === '1'))).toBe(true)
  const axe = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(x => x.target.join(' ')).join(', ')}`)).toEqual([])

  // Hay algo en noviembre: se puede avanzar hasta ahí y no más
  const next = page.getByRole('button', { name: 'Mes siguiente' })
  await expect(next).toBeEnabled()
  await next.click()
  await expect(page.getByRole('heading', { name: 'noviembre' })).toBeVisible()
  await expect(page.getByText('Seguro', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Programado, en 21 días')).toBeVisible()
  await expect(next).toBeDisabled()

  // Buscar también lo encuentra
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await page.getByRole('searchbox').fill('Seguro')
  await expect(page.getByRole('status').filter({ hasText: '1 resultado' })).toBeVisible()
  await expect(page.getByText('Seguro', { exact: true })).toBeVisible()
})

test('sin nada programado más adelante, el mes siguiente sigue cerrado', async ({ page, context }) => {
  const state = seed()
  state.tables.life_transactions.push(tx({ amount: 1000, category: 'Comida', description: 'Súper', occurred_at: noon(10, 10) }))
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')
  await expect(page.getByText('Súper', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled()
  await expect(page.getByRole('region', { name: 'Próximos' })).toHaveCount(0)
})

function sharedSeed(settled = false): MockState {
  const state = seed()
  state.tables.life_transactions.push(tx({ id: 'tx-cena', amount: 1000, category: 'Comida', description: 'Cena', occurred_at: noon(10, 14) }))
  state.tables.life_splits.push({
    id: 'split-juan', user_id: OWNER_ID, transaction_id: 'tx-cena', person: 'Juan', direction: 'owed_to_me', amount: 500,
    currency: 'ARS', note: 'Cena', settled_at: settled ? noon(10, 15) : null, settlement_transaction_id: null, created_at: noon(10, 14),
  })
  return state
}

test('editar un gasto compartido actualiza lo que se debe; sacarle "Compartido" borra lo pendiente con "Deshacer"', async ({ page, context }) => {
  const state = sharedSeed()
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')
  await expect(page.getByRole('region', { name: 'Cuentas compartidas' }).getByLabel(/Juan te debe \$\s?500/)).toBeVisible()

  let sheet = await openEdit(page, 'Cena')
  await expect(sheet.getByRole('checkbox', { name: /Compartido/ })).toBeChecked()
  await sheet.getByRole('textbox', { name: 'Monto' }).fill('1500')
  await expect(sheet.getByRole('status')).toContainText(/Juan te debe \$\s?750/)
  // Se suma Ana: ahora son tres partes
  await sheet.getByRole('textbox', { name: 'Con quién' }).fill('Ana')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(sheet.getByRole('status')).toContainText(/Juan te debe \$\s?500/)
  await expect(sheet.getByRole('status')).toContainText(/Ana te debe \$\s?500/)
  await sheet.getByRole('button', { name: 'Guardar cambios' }).click()

  await expect.poll(() => state.tables.life_splits.length).toBe(2)
  expect(state.tables.life_transactions.find(t => t.id === 'tx-cena')).toMatchObject({ amount: 1500 })
  // Juan conserva su fila (con el monto nuevo); Ana es nueva
  expect(state.tables.life_splits.find(s => s.id === 'split-juan')).toMatchObject({ amount: 500, settled_at: null })
  expect(state.tables.life_splits.find(s => s.person === 'Ana')).toMatchObject({ transaction_id: 'tx-cena', amount: 500, direction: 'owed_to_me', currency: 'ARS' })

  // Ya no es compartido: lo pendiente se va, con "Deshacer"
  sheet = await openEdit(page, 'Cena')
  await sheet.getByRole('checkbox', { name: /Compartido/ }).uncheck()
  await sheet.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect.poll(() => state.tables.life_splits.length).toBe(0)
  await expect(page.getByText('Ya no es compartido: se borró lo pendiente.')).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(() => state.tables.life_splits.length).toBe(2)
  await expect(page.getByRole('region', { name: 'Cuentas compartidas' }).getByLabel(/Ana te debe \$\s?500/)).toBeVisible()
})

test('con algo ya saldado, el monto y el reparto no se tocan (se explica) y lo demás se edita', async ({ page, context }) => {
  const state = sharedSeed(true)
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  const sheet = await openEdit(page, 'Cena')
  await expect(sheet.getByText(/Ya saldaste parte de esta cuenta/)).toBeVisible()
  await expect(sheet.getByRole('textbox', { name: 'Monto' })).toHaveAttribute('readonly', '')
  await expect(sheet.getByRole('checkbox', { name: /Compartido/ })).toHaveCount(0)
  await sheet.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Cena de cumple')
  await sheet.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect.poll(() => state.tables.life_transactions.find(t => t.id === 'tx-cena')?.description).toBe('Cena de cumple')
  expect(state.tables.life_splits).toHaveLength(1)
  expect(state.tables.life_splits[0]).toMatchObject({ amount: 500, settled_at: noon(10, 15) })
  expect(state.writes.filter(w => w.table === 'life_splits')).toHaveLength(0)
})

test('el + de Dinero sin conexión: queda en el dispositivo, se ve y se sube al volver', async ({ page, context }) => {
  const state = seed()
  state.tables.life_transactions.push(tx({ amount: 1000, category: 'Comida', description: 'Súper', occurred_at: noon(10, 10) }))
  await page.clock.setFixedTime(NOW)
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')
  await expect(page.getByText('Súper', { exact: true })).toBeVisible()

  await context.setOffline(true)
  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  // Fijos, cuotas y compartidos no se pueden activar sin conexión (se explica)
  await expect(sheet.getByText(/Sin conexión: los fijos, las cuotas y los gastos compartidos/)).toBeVisible()
  await expect(sheet.getByRole('checkbox', { name: /Compartido/ })).toBeDisabled()
  await expect(sheet.getByRole('checkbox', { name: /Repetir todos los meses/ })).toBeDisabled()
  await expect(sheet.getByRole('checkbox', { name: /En cuotas/ })).toBeDisabled()

  await sheet.getByRole('textbox', { name: 'Monto' }).fill('250')
  await sheet.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Kiosco')
  await sheet.getByRole('button', { name: 'Registrar movimiento' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByText(/Sin conexión: quedó guardado en este dispositivo/)).toBeVisible()
  await expect(page.getByText('Kiosco', { exact: true })).toBeVisible()
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem('mycen_life_outbox') ?? '[]'))
  expect(queued).toHaveLength(1)
  expect(queued[0]).toMatchObject({ table: 'life_transactions', module: 'money', row: { amount: 250, description: 'Kiosco' } })
  expect(state.tables.life_transactions).toHaveLength(1)

  await context.setOffline(false)
  await expect.poll(() => state.tables.life_transactions.length).toBe(2)
  const uploaded = state.tables.life_transactions.find(t => t.description === 'Kiosco')!
  expect(uploaded).toMatchObject({ id: queued[0].row.id, amount: 250, type: 'expense', user_id: OWNER_ID })
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mycen_life_outbox') ?? '[]').length)).toBe(0)
  await expect(page.getByText('Kiosco', { exact: true })).toBeVisible()
})
