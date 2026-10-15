import { expect, test } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Life OS · Dinero: presupuestos amables (life_budgets). Lo gastado sale de los movimientos del mes en la misma moneda;
// el tono es sin culpa: "te quedan…" y, si se pasó, "fue $X más de lo previsto".

const now = new Date()
const noon = new Date(now.getFullYear(), now.getMonth(), Math.min(now.getDate(), 28), 12).toISOString()
const lastMonthNoon = new Date(now.getFullYear(), now.getMonth() - 1, 10, 12).toISOString()
const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1
const money = (n: string) => `\\$\\s?${n.replace('.', '\\.')}`
/** "Te quedan $ 700 para 17 días: unos $ 41,17 por día" (o "para hoy" el último día del mes) */
const leftText = (x: string) => new RegExp(daysLeft === 1 ? `Te quedan ${money(x)} para hoy` : `Te quedan ${money(x)} para ${daysLeft} días: unos \\$`)

const tx = (over: Record<string, unknown>) => ({
  user_id: OWNER_ID, type: 'expense', category: 'Comida', description: null, currency: 'ARS', occurred_at: noon,
  goal_id: null, recurring_id: null, ...over,
})
const budget = (over: Record<string, unknown>) => ({
  user_id: OWNER_ID, category: 'Comida', currency: 'ARS', created_at: '2026-10-01T00:00:00Z', ...over,
})

function seed(): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_transactions = [
    tx({ id: 't1', amount: 300, description: 'Carrefour' }),
    tx({ id: 't2', amount: 50, category: 'Ocio', description: 'Cine' }),
    tx({ id: 't3', amount: 999, currency: 'USD', description: 'En dólares' }),
  ]
  state.tables.life_recurring_transactions = []
  state.tables.life_installment_plans = []
  state.tables.life_goals = []
  state.tables.life_categories = []
  state.tables.life_budgets = []
  return state
}

test.use({ viewport: { width: 390, height: 844 } })

test('crear un presupuesto, ver lo que queda, editarlo y borrarlo con deshacer', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  const card = page.getByRole('region', { name: 'Presupuestos' })
  await expect(card.getByText(/Elegí cuánto querés gastar por mes/)).toBeVisible()
  await card.getByRole('button', { name: 'Nuevo presupuesto' }).click()

  const sheet = page.getByRole('dialog', { name: 'Nuevo presupuesto' })
  await sheet.getByRole('radio', { name: 'Comida' }).click()
  await expect(sheet.getByRole('radio', { name: 'Comida' })).toHaveAttribute('aria-checked', 'true')
  // Monto inválido: aviso amable
  await sheet.getByRole('textbox', { name: 'Por mes (ARS)' }).fill('0')
  await sheet.getByRole('button', { name: 'Guardar presupuesto' }).click()
  await expect(sheet.getByRole('alert')).toHaveText('Escribí un monto mayor a 0.')
  await sheet.getByRole('textbox', { name: 'Por mes (ARS)' }).fill('1.000')

  // Sin el mouse encima del botón (LifeButton baja la opacidad al pasar el mouse)
  await page.mouse.move(0, 0)
  const axe = await (await settledAxe(page)).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(x => x.target.join(' ')).join(', ')}`)).toEqual([])

  await sheet.getByRole('button', { name: 'Guardar presupuesto' }).click()
  await expect(sheet).toHaveCount(0)
  await expect.poll(() => state.tables.life_budgets.length).toBe(1)
  expect(state.tables.life_budgets[0]).toMatchObject({ user_id: OWNER_ID, category: 'Comida', currency: 'ARS', amount: 1000 })

  // Sólo cuentan los gastos de Comida en ARS (los dólares no se suman)
  await expect(card.getByText(new RegExp(`^${money('300')} de ${money('1.000')}$`))).toBeVisible()
  await expect(card.getByText(leftText('700'))).toBeVisible()

  // Editar el monto
  await card.getByRole('button', { name: 'Opciones del presupuesto de Comida' }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  const edit = page.getByRole('dialog', { name: 'Presupuesto de Comida' })
  await expect(edit.getByRole('textbox', { name: 'Por mes (ARS)' })).toHaveValue('1000')
  await edit.getByRole('textbox', { name: 'Por mes (ARS)' }).fill('500')
  await edit.getByRole('button', { name: 'Guardar presupuesto' }).click()
  await expect(edit).toHaveCount(0)
  await expect.poll(() => Number(state.tables.life_budgets[0].amount)).toBe(500)
  await expect(card.getByText(leftText('200'))).toBeVisible()

  const pageAxe = await (await settledAxe(page)).include('#budgets-title').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(pageAxe.violations).toEqual([])

  // Borrar con "Deshacer": vuelve
  await card.getByRole('button', { name: 'Opciones del presupuesto de Comida' }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  // "Deshacer" dura 5 s: se toca enseguida (lo de la tarjeta vacía se mira después)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('Eliminaste el presupuesto de Comida')).toHaveCount(0)
  await expect(card.getByText(leftText('200'))).toBeVisible()
  await page.waitForTimeout(5500)
  expect(state.tables.life_budgets).toHaveLength(1)

  // Borrar de verdad
  await card.getByRole('button', { name: 'Opciones del presupuesto de Comida' }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect.poll(() => state.tables.life_budgets.length, { timeout: 10_000 }).toBe(0)
})

test('pasarse: tono amable en Dinero y una línea en Mi día; el mes pasado muestra sólo el resultado', async ({ page, context }) => {
  const state = seed()
  state.tables.life_transactions.push(tx({ id: 't4', amount: 120, occurred_at: lastMonthNoon, description: 'Mes pasado' }))
  state.tables.life_budgets = [
    budget({ id: 'b-comida', amount: 200 }),
    budget({ id: 'b-ocio', category: 'Ocio', amount: 55 }),
  ]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  const card = page.getByRole('region', { name: 'Presupuestos' })
  await expect(card.getByText(new RegExp(`^Este mes Comida fue ${money('100')} más de lo previsto$`))).toBeVisible()
  await expect(card.getByText('Pasa. Si este monto no te sirve, lo podés ajustar.')).toBeVisible()
  // Ocio está cerca (50 de 55 = 91 %)
  await expect(card.getByText(/Ya usaste el 91 %/)).toBeVisible()
  await expect(page.getByText(/te pasaste/i)).toHaveCount(0)
  // Lo más pasado arriba
  await expect(card.getByRole('listitem').first()).toContainText('Comida')

  const axe = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(x => x.target.join(' ')).join(', ')}`)).toEqual([])

  // Mes anterior: sólo el resultado
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(card.getByText(new RegExp(`^Quedaron ${money('80')} sin usar$`))).toBeVisible()
  await expect(card.getByText(/Te quedan/)).toHaveCount(0)

  // Mi día: una sola línea, la más relevante
  await page.goto('/life')
  const line = page.getByTestId('budget-nudge')
  await expect(line).toHaveCount(1)
  await expect(line).toHaveText(new RegExp(`^Este mes Comida fue ${money('100')} más de lo previsto$`))
})

test('con una categoría propia, desde "En qué se fue"', async ({ page, context }) => {
  const state = seed()
  state.tables.life_categories = [
    { id: 'cat-mascotas', user_id: OWNER_ID, type: 'expense', name: 'Mascotas', color: '#3B82F6', icon: null, archived_at: null, created_at: '2026-09-01T00:00:00Z' },
  ]
  state.tables.life_transactions.push(tx({ id: 't5', amount: 900, category: 'c:cat-mascotas', description: 'Veterinaria' }))
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  const byCategory = page.getByRole('region', { name: 'En qué se fue · ARS' })
  await byCategory.getByRole('button', { name: /^Ver sólo Mascotas/ }).click()
  await byCategory.getByRole('button', { name: 'Poner un presupuesto' }).click()

  const sheet = page.getByRole('dialog', { name: 'Nuevo presupuesto' })
  await expect(sheet.getByRole('radio', { name: 'Mascotas' })).toHaveAttribute('aria-checked', 'true')
  await sheet.getByRole('textbox', { name: 'Por mes (ARS)' }).fill('1000')
  await sheet.getByRole('button', { name: 'Guardar presupuesto' }).click()
  await expect(sheet).toHaveCount(0)
  await expect.poll(() => state.tables.life_budgets[0]?.category).toBe('c:cat-mascotas')

  const card = page.getByRole('region', { name: 'Presupuestos' })
  await expect(card.getByText('Mascotas', { exact: true })).toBeVisible()
  await expect(card.getByText(/Ya usaste el 90 %/)).toBeVisible()
  await expect(page.getByText(/c:cat/)).toHaveCount(0)

  // Desde "En qué se fue" ahora se edita el mismo
  await expect(byCategory.getByRole('button', { name: 'Editar presupuesto' })).toBeVisible()

  // Mi día: está cerca
  await page.goto('/life')
  await expect(page.getByTestId('budget-nudge')).toHaveText(
    new RegExp(daysLeft === 1 ? `^Mascotas: te quedan ${money('100')} para hoy$` : `^Mascotas: te quedan ${money('100')} para ${daysLeft} días$`),
  )
})
