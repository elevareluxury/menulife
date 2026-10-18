import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, OWNER_ID, profileRow } from './support/mockSupabase'

// Si el celular descarta la pestaña (o la app) en segundo plano y la recarga al volver, lo que se estaba editando
// sigue abierto y con lo escrito (editDraft.ts). Se simula con una recarga de la página.

test.use({ viewport: { width: 390, height: 844 } })

test('Studio: el módulo que se editaba vuelve abierto y con lo escrito', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()], profile_modules: [moduleRow({ id: 'm-1', title: 'Mi portfolio', content: { url: 'https://ana.design' } })] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Editar Mi portfolio', exact: true }).click()
  const title = page.getByRole('dialog').getByRole('textbox').first()
  await title.fill('Portfolio 2026')
  await page.reload()

  await expect(page.getByRole('dialog').getByRole('textbox').first()).toHaveValue('Portfolio 2026')
  // Cancelar descarta el borrador: al volver a abrir está lo guardado
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Editar Mi portfolio', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('textbox').first()).toHaveValue('Mi portfolio')
})

test('Studio: guardar limpia el borrador', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()], profile_modules: [moduleRow({ id: 'm-1', title: 'Mi portfolio', content: { url: 'https://ana.design' } })] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Editar Mi portfolio', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox').first().fill('Portfolio nuevo')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('mycen_draft:')))).toEqual([])
})

test('Life OS: la nota que se editaba en el Brain vuelve abierta y con lo escrito', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = [{
    id: '20000000-0000-4000-8000-000000000009', user_id: OWNER_ID, type: 'note', title: 'Lista del viaje', content: 'Pasaporte',
    due_date: null, due_time: null, remind_minutes: null, reminded_at: null, completed_at: null, is_completed: false,
    is_archived: false, goal_id: null, is_focus: false, created_at: new Date().toISOString(), recurrence: null, subtasks: [],
    next_occurrence_id: null, occurrence_of: null,
  }]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/brain')

  await page.getByTestId('brain-open').filter({ hasText: 'Lista del viaje' }).click()
  await page.getByRole('dialog', { name: 'Editar' }).getByLabel('Contenido').fill('Pasaporte\nCargador')
  await page.reload()

  const sheet = page.getByRole('dialog', { name: 'Editar' })
  await expect(sheet.getByLabel('Contenido')).toHaveValue('Pasaporte\nCargador')
  // Cerrar sin guardar descarta el borrador
  await sheet.getByRole('button', { name: 'Cerrar' }).click()
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.tables.life_brain_items[0].content).toBe('Pasaporte')
})
