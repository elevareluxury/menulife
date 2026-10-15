import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Life OS · Dinero: categorías propias. Se crean desde el formulario, se ven en "En qué se fue" y en la búsqueda, se
// cambian en Ajustes y, archivadas, los movimientos viejos siguen mostrando su nombre.

const noon = new Date(new Date().getFullYear(), new Date().getMonth(), Math.min(new Date().getDate(), 28), 12).toISOString()

function seed(): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_transactions = [
    { id: 't1', user_id: OWNER_ID, type: 'expense', amount: 300, category: 'Comida', description: 'Carrefour', currency: 'ARS', occurred_at: noon, goal_id: null, recurring_id: null },
  ]
  state.tables.life_recurring_transactions = []
  state.tables.life_goals = []
  state.tables.life_categories = []
  return state
}

test.use({ viewport: { width: 390, height: 844 } })

test('crear una categoría propia desde el movimiento, usarla, cambiarla en Ajustes y archivarla', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/money')

  // 1. Desde el formulario: "+ Nueva" → nombre y color → queda elegida
  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await sheet.getByRole('textbox', { name: 'Monto' }).fill('1500')
  await sheet.getByRole('button', { name: 'Nueva categoría' }).click()
  // Mismo nombre que una fija: no
  await sheet.getByRole('textbox', { name: 'Nombre de la categoría' }).fill('comida')
  await sheet.getByRole('button', { name: 'Crear', exact: true }).click()
  await expect(sheet.getByRole('alert')).toHaveText('Ya tenés una categoría con ese nombre.')
  await sheet.getByRole('textbox', { name: 'Nombre de la categoría' }).fill('Mascotas')
  await sheet.getByRole('radio', { name: 'Azul' }).click()
  await expect(sheet.getByRole('radio', { name: 'Azul' })).toHaveAttribute('aria-checked', 'true')

  const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(x => x.target.join(' ')).join(', ')}`)).toEqual([])

  await sheet.getByRole('button', { name: 'Crear', exact: true }).click()
  await expect(sheet.getByRole('button', { name: 'Mascotas' })).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByRole('textbox', { name: 'Descripción (opcional)' }).fill('Veterinaria')
  await sheet.getByRole('button', { name: 'Registrar movimiento' }).click()
  await expect(sheet).toHaveCount(0)

  const cat = state.tables.life_categories[0]
  expect(cat).toMatchObject({ type: 'expense', name: 'Mascotas', color: '#3B82F6', user_id: OWNER_ID })
  expect(state.tables.life_transactions.find(t => t.description === 'Veterinaria')?.category).toBe(`c:${cat.id}`)

  // 2. En la lista y en "En qué se fue", con su nombre (nunca el id)
  await expect(page.getByText('Veterinaria')).toBeVisible()
  const card = page.getByRole('region', { name: 'En qué se fue · ARS' })
  await expect(card.getByRole('button', { name: /Ver sólo Mascotas: .*1\.500.*, 83 %/ })).toBeVisible()
  await expect(page.getByText(/c:/)).toHaveCount(0)

  // 3. La búsqueda la encuentra por su nombre
  await page.getByRole('searchbox').fill('mascotas')
  await expect(page.getByRole('status').filter({ hasText: 'resultado' })).toHaveText('1 resultado en todos tus movimientos')
  await expect(page.getByText('Veterinaria')).toBeVisible()
  await expect(page.getByText('Carrefour')).toHaveCount(0)

  // 4. Ajustes → Tus categorías: cambiar el nombre
  await page.goto('/life/settings')
  const section = page.getByRole('region', { name: 'Tus categorías' })
  await section.getByRole('button', { name: 'Opciones de Mascotas' }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  await section.getByRole('textbox', { name: 'Nombre de la categoría' }).fill('Mascotas y vet')
  await section.getByRole('button', { name: 'Guardar' }).click()
  await expect(section.getByText('Mascotas y vet')).toBeVisible()
  await expect.poll(() => state.tables.life_categories[0].name).toBe('Mascotas y vet')

  // 5. Archivar (con "Deshacer"): pasa a "Archivadas" y se guarda a los 5 s
  await section.getByRole('button', { name: 'Opciones de Mascotas y vet' }).click()
  await page.getByRole('menuitem', { name: 'Archivar' }).click()
  await expect(page.getByText('Archivaste "Mascotas y vet"')).toBeVisible()
  await expect(section.getByRole('button', { name: 'Archivadas (1)' })).toBeVisible()
  await expect.poll(() => state.tables.life_categories[0].archived_at, { timeout: 10_000 }).not.toBeNull()

  // 6. El movimiento viejo sigue mostrando el nombre; para uno nuevo ya no se ofrece
  await page.goto('/life/money')
  await expect(page.getByRole('paragraph').filter({ hasText: /^Mascotas y vet$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ver sólo Mascotas y vet/ })).toBeVisible()
  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Nuevo movimiento' }).getByRole('button', { name: 'Mascotas y vet' })).toHaveCount(0)
})

test('Ajustes: restaurar una archivada', async ({ page, context }) => {
  const state = seed()
  state.tables.life_categories = [
    { id: 'c-1', user_id: OWNER_ID, type: 'income', name: 'Alquileres', color: '#22C55E', icon: null, archived_at: '2026-10-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z' },
  ]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/settings')
  const section = page.getByRole('region', { name: 'Tus categorías' })
  await expect(section.getByText('Todavía no creaste categorías propias.')).toBeVisible()
  await section.getByRole('button', { name: 'Archivadas (1)' }).click()
  await section.getByRole('button', { name: 'Restaurar Alquileres' }).click()
  await expect(section.getByRole('button', { name: 'Opciones de Alquileres' })).toBeVisible()
  await expect.poll(() => state.tables.life_categories[0].archived_at).toBeNull()

  const axe = await new AxeBuilder({ page }).include('#life-categories-title').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(axe.violations).toEqual([])
})
