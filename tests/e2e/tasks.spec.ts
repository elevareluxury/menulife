import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Life OS · V1 etapa 09: una tarea semanal con subtareas; al completarla aparece la siguiente con las subtareas
// sin hacer, y la completada queda como historial.

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('tarea semanal con subtareas: al completarla aparece la siguiente con las subtareas reiniciadas', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = []
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life/brain?vista=tareas')

  await page.getByRole('button', { name: 'Agregar tarea' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nueva tarea' })
  await sheet.getByRole('textbox', { name: 'Tarea', exact: true }).fill('Regar las plantas')
  // Sin fecha no se puede repetir
  await expect(sheet.getByRole('combobox', { name: 'Repetir' })).toBeDisabled()
  await expect(sheet.getByText('Para que se repita, elegí una fecha.')).toBeVisible()

  const today = new Date()
  const due = dateKey(today)
  await sheet.getByLabel('Fecha', { exact: true }).fill(due)
  const weekday = today.toLocaleDateString('es-AR', { weekday: 'long' })
  await sheet.getByRole('combobox', { name: 'Repetir' }).selectOption({ label: `Cada semana el ${weekday}` })

  // Subtareas: agregar, tildar, reordenar y borrar
  const add = sheet.getByRole('textbox', { name: 'Agregar subtarea' })
  for (const step of ['Llenar la regadera', 'Balcón', 'Living', 'Borrar esta']) {
    await add.fill(step)
    await add.press('Enter')
  }
  await sheet.getByRole('button', { name: 'Borrar Borrar esta' }).click()
  await sheet.getByRole('button', { name: 'Subir Living' }).click()
  await sheet.getByRole('checkbox', { name: 'Hecha: Llenar la regadera' }).click()
  await expect(sheet.getByText('Subtareas · 1 de 3')).toBeVisible()
  await sheet.getByRole('button', { name: 'Agregar tarea' }).click()

  await expect.poll(() => state.tables.life_brain_items.length).toBe(1)
  const created = state.tables.life_brain_items[0]
  expect(created).toMatchObject({ user_id: OWNER_ID, type: 'task', due_date: due, recurrence: { freq: 'weekly', weekdays: [today.getDay()] } })
  expect((created.subtasks as { text: string; done: boolean }[]).map(s => [s.text, s.done]))
    .toEqual([['Llenar la regadera', true], ['Living', false], ['Balcón', false]])

  // En la lista: ícono de repetición y progreso
  const row = page.getByRole('listitem').filter({ hasText: 'Regar las plantas' })
  await expect(row.getByLabel('Se repite')).toBeVisible()
  await expect(row.getByText('1 de 3')).toBeVisible()

  // Completar: se crea la siguiente, una semana después, con las subtareas sin hacer
  await row.getByRole('checkbox', { name: /Regar las plantas/ }).click()
  await expect.poll(() => state.tables.life_brain_items.length).toBe(2)
  const next = state.tables.life_brain_items.find(r => r.id !== created.id)!
  const nextDue = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
  expect(next).toMatchObject({ title: 'Regar las plantas', due_date: dateKey(nextDue), is_completed: false })
  expect((next.subtasks as { done: boolean }[]).every(s => !s.done)).toBe(true)
  await expect.poll(() => state.tables.life_brain_items.find(r => r.id === created.id)?.next_occurrence_id).toBe(next.id)
  await expect(page.getByRole('listitem').filter({ hasText: 'Regar las plantas' }).getByText('0 de 3')).toBeVisible()

  // Destildar la completada borra la siguiente (no queda duplicada)
  await page.getByRole('button', { name: /Ver completadas/ }).click()
  await page.getByRole('checkbox', { name: /Regar las plantas/, checked: true }).click()
  await expect.poll(() => state.tables.life_brain_items.length).toBe(1)
})
