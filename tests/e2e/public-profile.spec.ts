import { expect, test } from '@playwright/test'
import { readFile } from 'fs/promises'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Flujos públicos que la migración de Identity no puede romper (docs/identity/03, R1–R3).

test('un perfil publicado se ve sin cuenta y registra la visita con su fuente', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow()],
    profile_modules: [moduleRow({ title: 'Mi portfolio' })],
  })
  await installSupabaseMock(context, state)

  await page.goto('/ana?src=qr')

  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(page.getByText('Diseñadora')).toBeVisible()
  await expect(page.getByRole('link', { name: /Mi portfolio/ })).toHaveAttribute('href', 'https://ana.design')

  await expect.poll(() => state.rpcCalls.find(c => c.fn === 'track_profile_event')?.args).toMatchObject({
    p_profile_id: 'p-ana', p_event_type: 'view', p_source: 'qr',
  })
})

test('un username anterior redirige al actual (URLs y QR viejos siguen funcionando)', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ username: 'ana-studio' })] }, { ana: 'p-ana' })
  await installSupabaseMock(context, state)

  await page.goto('/ana?src=qr')

  await expect(page).toHaveURL(/\/ana-studio\?src=qr$/)
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
})

test('un perfil sin publicar no se muestra a visitantes', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ status: 'draft' })], profile_modules: [moduleRow()] })
  await installSupabaseMock(context, state)

  await page.goto('/ana')

  await expect(page.getByText('Este perfil no está disponible')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toHaveCount(0)
  expect(state.rpcCalls.some(c => c.fn === 'track_profile_event')).toBe(false)
})

test('los módulos ocultos o borrados no llegan al visitante', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow()],
    profile_modules: [
      moduleRow({ title: 'Visible', position: 0 }),
      moduleRow({ title: 'Oculto', position: 1, visibility: 'hidden' }),
      moduleRow({ title: 'Borrado', position: 2, deleted_at: new Date().toISOString() }),
    ],
  })
  await installSupabaseMock(context, state)

  await page.goto('/ana')

  await expect(page.getByRole('link', { name: /Visible/ })).toBeVisible()
  await expect(page.getByText('Oculto')).toHaveCount(0)
  await expect(page.getByText('Borrado')).toHaveCount(0)
})

test('el visitante guarda el contacto (vCard) sólo con los datos autorizados', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow({
      contact_card: { enabled: true, name: 'Ana Pérez', title: 'Diseñadora', email: 'ana@example.com', phone: '+54 9 341 555 0000' },
    })],
  })
  await installSupabaseMock(context, state)

  await page.goto('/ana')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Guardar contacto/ }).first().click(),
  ])

  expect(download.suggestedFilename()).toBe('ana.vcf')
  const vcf = await readFile(await download.path(), 'utf8')
  expect(vcf).toContain('BEGIN:VCARD')
  expect(vcf).toContain('FN:Ana Pérez')
  expect(vcf).toContain('EMAIL;TYPE=INTERNET:ana@example.com')
  expect(vcf).toContain('URL;TYPE=Mycen:')
  expect(vcf).not.toContain('enabled')
})
