import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'
import { MODULE_FIXTURES } from './support/moduleFixtures'

// Caracterización de los 13 tipos de módulo (Fase 4). Si cambia cómo se ve o se guarda un tipo,
// estos tests fallan: el cambio tiene que ser deliberado.

const rows = () => MODULE_FIXTURES.map(f => structuredClone(f.row))

test('la página pública muestra cada tipo de módulo', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ contact_card: { enabled: true, email: 'hola@ana.com' } })], profile_modules: rows() })
  await installSupabaseMock(context, state)
  // Domingo al mediodía: "Cerrado ahora" no depende del día en que corre el test
  await page.clock.setFixedTime(new Date('2026-10-04T12:00:00Z'))
  await page.goto('/ana')
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(page.locator('main')).toMatchAriaSnapshot({ name: 'public-modules.aria.yml' })
})

for (const fixture of MODULE_FIXTURES) {
  test(`abrir y guardar "${fixture.label}" (${fixture.row.type}) no cambia su contenido`, async ({ page, context }) => {
    const state = createState({ profiles: [profileRow()], profile_modules: rows() })
    await installSupabaseMock(context, state, { signedIn: true })
    await page.goto('/studio/modules')

    await page.getByRole('button', { name: `Editar ${fixture.label}`, exact: true }).click()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect.poll(() => state.writes.find(w => w.method === 'PATCH' && w.table === 'profile_modules')?.body)
      .toBeTruthy()
    const body = state.writes.find(w => w.method === 'PATCH' && w.table === 'profile_modules')!.body as Record<string, unknown>
    expect(body.title).toEqual(fixture.row.title)
    expect(body.content).toEqual(fixture.row.content)
  })
}
