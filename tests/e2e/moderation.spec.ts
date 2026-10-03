import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Moderación (Identity Fase 8): una denuncia llega y se puede resolver.

function seed(extra: Partial<MockState['tables']> = {}): MockState {
  return createState({ profiles: [profileRow()], ...extra })
}

test('un visitante denuncia un perfil sin cuenta (y no puede repetir)', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state)
  await page.goto('/ana')

  const open = page.getByRole('button', { name: 'Denunciar' })
  await open.click()
  const dialog = page.getByRole('dialog', { name: 'Denunciar este perfil' })
  await expect(dialog.getByRole('link', { name: 'Reglas de contenido' })).toHaveAttribute('href', '/terminos#reglas')
  // Hasta elegir un motivo no se puede enviar
  await expect(dialog.getByRole('button', { name: 'Enviar denuncia' })).toBeDisabled()
  await dialog.getByRole('radio', { name: 'Estafa o fraude' }).check()
  await dialog.getByRole('textbox', { name: 'Detalles (opcional)' }).fill('Pide plata por adelantado')
  await dialog.getByRole('button', { name: 'Enviar denuncia' }).click()
  await expect(dialog.getByRole('status')).toHaveText('Gracias. Recibimos tu denuncia y la vamos a revisar.')
  expect(state.tables.profile_reports).toMatchObject([{ reason: 'scam', details: 'Pide plata por adelantado', status: 'open' }])

  // Escape cierra y el foco vuelve al botón
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(open).toBeFocused()

  await open.click()
  await page.getByRole('radio', { name: 'Otro motivo' }).check()
  await page.getByRole('button', { name: 'Enviar denuncia' }).click()
  await expect(page.getByRole('status')).toHaveText(/Ya recibimos tu denuncia/)
  expect(state.tables.profile_reports).toHaveLength(1)
})

test('el dueño no ve "Denunciar" en su propio perfil', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/ana')
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Denunciar' })).toHaveCount(0)
})

test('el admin revisa la denuncia, suspende el perfil y después levanta la suspensión', async ({ page, context }) => {
  const state = seed({ super_admins: [{ id: 'sa-1', user_id: OWNER_ID }] })
  state.tables.profile_reports.push({
    id: 'rep-1', profile_id: 'p-ana', content_object_id: null, reason: 'impersonation', details: 'No es Ana',
    reporter_hash: 'x', status: 'open', resolution_note: null, resolved_at: null, created_at: new Date().toISOString(),
  })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/super-admin/denuncias')

  const report = page.getByRole('listitem', { name: 'Denuncia a Ana Pérez' })
  await expect(report).toContainText('Suplantación de identidad')
  await expect(report).toContainText('No es Ana')
  await expect(report).toContainText('1 denuncia abierta sobre este perfil')
  await report.getByRole('textbox').fill('Suplanta a otra diseñadora')
  await report.getByRole('button', { name: 'Suspender perfil' }).click()

  await expect(page.getByText('No hay denuncias abiertas.')).toBeVisible()
  const suspended = page.getByRole('list', { name: 'Perfiles suspendidos' })
  await expect(suspended).toContainText('Suplanta a otra diseñadora')
  expect(state.tables.profiles[0].suspended_at).toBeTruthy()
  expect(state.tables.profile_reports[0].status).toBe('actioned')

  // Nadie ve el perfil suspendido
  const visitor = await context.browser()!.newContext()
  await installSupabaseMock(visitor, state)
  const vPage = await visitor.newPage()
  await vPage.goto('/ana')
  await expect(vPage.getByRole('heading', { name: 'Este perfil no está disponible' })).toBeVisible()

  await page.getByRole('button', { name: 'Resueltas' }).click()
  await expect(page.getByRole('listitem', { name: 'Denuncia a Ana Pérez' })).toContainText('Perfil suspendido')

  await suspended.getByRole('button', { name: 'Levantar suspensión' }).click()
  await expect(page.getByText('No hay perfiles suspendidos.')).toBeVisible()
  await vPage.reload()
  await expect(vPage.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await visitor.close()
})

test('el dueño de un perfil suspendido ve el aviso y el motivo en Studio', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ suspended_at: new Date().toISOString(), suspension_reason: 'Estafa confirmada' })] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio')
  const alert = page.getByRole('alert').filter({ hasText: 'Tu perfil está suspendido' })
  await expect(alert).toContainText('Motivo: Estafa confirmada')
  await expect(alert.getByRole('link', { name: 'Ver las reglas de contenido' })).toHaveAttribute('href', '/terminos#reglas')
})

test('las reglas de contenido están en /terminos', async ({ page }) => {
  await page.goto('/terminos#reglas')
  await expect(page.getByRole('heading', { name: 'Reglas de contenido' })).toBeVisible()
})
