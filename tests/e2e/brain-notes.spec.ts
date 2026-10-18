import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Life OS → Brain: tocar una nota o idea la abre en la hoja con el texto entero, sin abrir el teclado encima.

test.use({ viewport: { width: 390, height: 844 } })

const LONG = ['Primera línea de la nota.', 'Segunda línea con más detalle para que no entre en la tarjeta.',
  'Tercera línea: lo que se tapaba.', 'Cuarta.', 'Quinta.', 'Sexta.', 'Séptima.', 'Octava.'].join('\n')

function item(id: string, type: 'idea' | 'note', title: string, content: string | null, extra: Record<string, unknown> = {}) {
  return {
    id, user_id: OWNER_ID, type, title, content, due_date: null, due_time: null, remind_minutes: null, reminded_at: null,
    completed_at: null, is_completed: false, is_archived: false, goal_id: null, is_focus: false,
    created_at: new Date().toISOString(), recurrence: null, subtasks: [], next_occurrence_id: null, occurrence_of: null,
    ...extra,
  }
}

test('tocar una nota la abre entera en la hoja, sin el teclado encima', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = [item('20000000-0000-4000-8000-000000000001', 'note', 'Ideas para el viaje', LONG)]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/brain')

  await page.getByTestId('brain-open').filter({ hasText: 'Ideas para el viaje' }).click()
  const sheet = page.getByRole('dialog', { name: 'Editar' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByLabel('Contenido')).toHaveValue(LONG)
  // El título no queda con el foco: en el celular abriría el teclado y taparía la nota
  await expect(sheet.getByLabel('Título')).not.toBeFocused()
  // El cuadro crece con el texto (más filas que las 6 de una nota vacía)
  expect(Number(await sheet.getByLabel('Contenido').getAttribute('rows'))).toBeGreaterThan(6)

  // Se puede editar y guardar desde ahí
  await sheet.getByLabel('Contenido').fill('Nota cambiada')
  await sheet.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(sheet).toHaveCount(0)
  await expect.poll(() => state.tables.life_brain_items[0].content).toBe('Nota cambiada')
})

test('una idea también se abre al tocarla', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = [item('20000000-0000-4000-8000-000000000002', 'idea', 'Pintar la terraza', null)]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/brain')

  await page.getByTestId('brain-open').filter({ hasText: 'Pintar la terraza' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar' }).getByLabel('Idea')).toHaveValue('Pintar la terraza')
})

test('archivadas: no se abren al tocar (sólo se restauran o borran)', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = [item('20000000-0000-4000-8000-000000000003', 'note', 'Vieja', 'Texto', { is_archived: true })]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/brain?vista=archivo')

  await expect(page.getByText('Vieja')).toBeVisible()
  await expect(page.getByTestId('brain-open')).toHaveCount(0)
})
