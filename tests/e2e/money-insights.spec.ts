import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Life OS · Dinero: meses anteriores, en qué se fue, buscar y filtrar, y categorías que se ordenan solas.

const now = new Date()
const day = (monthsBack: number, d: number) => new Date(now.getFullYear(), now.getMonth() - monthsBack, d, 12).toISOString()
const thisDay = Math.min(now.getDate(), 28)
const monthName = (monthsBack: number) => new Date(now.getFullYear(), now.getMonth() - monthsBack, 1).toLocaleDateString('es-AR', { month: 'long' })

let n = 0
const row = (p: Record<string, unknown>) => ({
  id: `t${++n}`, user_id: OWNER_ID, type: 'expense', currency: 'ARS', goal_id: null, recurring_id: null, ...p,
})

function seed(): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_transactions = [
    row({ amount: 600, category: 'Comida', description: 'Carrefour', occurred_at: day(0, thisDay) }),
    row({ amount: 400, category: 'Ocio', description: 'Cine', occurred_at: day(0, 1) }),
    row({ type: 'income', amount: 5000, category: 'Sueldo', description: 'Sueldo', occurred_at: day(0, 1) }),
    row({ amount: 400, category: 'Comida', description: 'Verdulería', occurred_at: day(1, 10) }),
    row({ amount: 120, category: 'Transporte', description: 'UBER *TRIP 4821', occurred_at: day(1, 12) }),
    row({ amount: 5990, category: 'Suscripciones', description: 'Netflix', occurred_at: day(3, 5) }),
  ]
  state.tables.life_recurring_transactions = []
  state.tables.life_goals = []
  return state
}

test.use({ viewport: { width: 390, height: 844 } })

test('en qué se fue: gastos por categoría, comparados con el mes anterior, y filtrar tocando una', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life/money')

  const card = page.getByRole('region', { name: 'En qué se fue · ARS' })
  await expect(card.getByRole('button', { name: /Ver sólo Comida: .*600.*, 60 %/ })).toBeVisible()
  await expect(card.getByText(`50 % más que en ${monthName(1)}`)).toBeVisible()
  await expect(card.getByRole('button', { name: /Ver sólo Ocio/ })).toBeVisible()

  await card.getByRole('button', { name: /Ver sólo Comida/ }).click()
  await expect(page.getByText('Carrefour')).toBeVisible()
  await expect(page.getByText('Cine')).toHaveCount(0)
  await page.getByRole('button', { name: 'Quitar el filtro Comida' }).click()
  await expect(page.getByText('Cine')).toBeVisible()

  // La lista entra con un fundido (opacity): medir el contraste recién cuando todo terminó de aparecer
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')]
    .filter(e => e.tagName !== 'BUTTON').every(e => getComputedStyle(e).opacity === '1'))).toBe(true)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(x => x.target.join(' ')).join(', ')}`)).toEqual([])
})

test('meses anteriores: se pasa con las flechas y el siguiente no va más allá de hoy', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life/money')
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled()

  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(page.getByRole('heading', { level: 2, name: new RegExp(monthName(1), 'i') })).toBeVisible()
  await expect(page.getByText('Verdulería')).toBeVisible()
  await expect(page.getByText('Carrefour')).toHaveCount(0)

  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(page.getByText(`No hay movimientos en ${monthName(2)}.`)).toBeVisible()
  await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await expect(page.getByText('Carrefour')).toBeVisible()
})

test('buscar encuentra en todos los meses y se filtra por tipo', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life/money')

  await page.getByRole('searchbox').fill('netflix')
  await expect(page.getByRole('status').filter({ hasText: 'resultado' })).toHaveText('1 resultado en todos tus movimientos')
  await expect(page.getByText('Netflix')).toBeVisible()
  await page.getByRole('searchbox').fill('spotify')
  await expect(page.getByText('No encontramos movimientos con eso.')).toBeVisible()
  await page.getByRole('searchbox').fill('')

  await page.getByRole('button', { name: 'Ingresos', exact: true }).click()
  await expect(page.getByText('Sueldo').first()).toBeVisible()
  await expect(page.getByText('Carrefour')).toHaveCount(0)
})

test('un movimiento nuevo toma la categoría que ya usaste para algo parecido', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life/money')
  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await sheet.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Uber trip 0099')
  await expect(sheet.getByRole('button', { name: 'Transporte' })).toHaveAttribute('aria-pressed', 'true')
  // Elegir a mano manda: no se vuelve a cambiar
  await sheet.getByRole('button', { name: 'Comida' }).click()
  await sheet.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Uber trip 0100')
  await expect(sheet.getByRole('button', { name: 'Comida' })).toHaveAttribute('aria-pressed', 'true')
})
