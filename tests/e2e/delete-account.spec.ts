import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow } from './support/mockSupabase'

// App Store 5.1.1(v): "Eliminar mi cuenta" también desde Life OS → Ajustes → Cuenta, con palabra de confirmación.

test.use({ viewport: { width: 390, height: 844 } })

test('eliminar la cuenta desde Life OS: pide la palabra, borra y sale', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/settings')

  await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
  const dialog = page.getByRole('alertdialog', { name: '¿Eliminar tu cuenta para siempre?' })
  const confirm = dialog.getByRole('button', { name: 'Eliminar mi cuenta' })
  await expect(confirm).toBeDisabled()

  const word = dialog.getByRole('textbox', { name: 'Confirmación' })
  await word.fill('ELIMINA')
  await expect(confirm).toBeDisabled()
  // Sin importar mayúsculas ni espacios de más
  await word.fill(' eliminar ')
  await expect(confirm).toBeEnabled()

  await confirm.click()
  await expect(page).toHaveURL(/\/$/)
  expect(state.rpcCalls.filter(c => c.fn === 'delete_my_account')).toHaveLength(1)
  expect(state.tables.profiles.filter(p => p.user_id === OWNER_ID)).toHaveLength(0)
  expect(await page.evaluate(() => localStorage.getItem('sb-mock-auth-token'))).toBeNull()
})

test('cancelar no borra nada', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/settings')

  await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
  const dialog = page.getByRole('alertdialog', { name: '¿Eliminar tu cuenta para siempre?' })
  await dialog.getByRole('textbox', { name: 'Confirmación' }).fill('ELIMINAR')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toHaveCount(0)

  // Al volver a abrir, la palabra arranca vacía
  await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
  await expect(dialog.getByRole('textbox', { name: 'Confirmación' })).toHaveValue('')
  expect(state.rpcCalls.some(c => c.fn === 'delete_my_account')).toBe(false)
})

test('con un negocio en Business no se elimina y explica por qué', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow()],
    restaurants: [{ id: 'r1', owner_id: OWNER_ID, plan: 'pro', name: 'Café', slug: 'cafe' }],
  })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/settings')

  await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
  const dialog = page.getByRole('alertdialog', { name: '¿Eliminar tu cuenta para siempre?' })
  await dialog.getByRole('textbox', { name: 'Confirmación' }).fill('ELIMINAR')
  await dialog.getByRole('button', { name: 'Eliminar mi cuenta' }).click()

  await expect(page.getByText('Tu cuenta tiene un negocio en Mycen Business.', { exact: false })).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await expect(page).toHaveURL(/\/life\/settings$/)
  expect(state.tables.profiles).toHaveLength(1)
})
