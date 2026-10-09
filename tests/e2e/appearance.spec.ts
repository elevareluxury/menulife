import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'
import { MODULE_FIXTURES } from './support/moduleFixtures'

// Apariencia (Identity Fase 9): los perfiles guardados con las opciones de antes siguen siendo legibles (V1).

const rows = () => MODULE_FIXTURES.map(f => structuredClone(f.row))

/** Combinaciones que se revisan con axe (WCAG 2 A/AA, incluye contraste de color) */
const THEMES = [
  { mode: 'dark' },
  { mode: 'light' },
  { mode: 'dark', background: 'glow', card_style: 'outline', corners: 'round', accent: '#F4705A' },
  { mode: 'light', background: 'tint', card_style: 'flat', corners: 'sharp', accent: '#3B82F6' },
  { mode: 'light', background: 'glow', card_style: 'outline', accent: '#22C55E' },
  { mode: 'dark', background: 'tint', card_style: 'filled', accent: '#A78BFA' },
] as const

for (const theme of THEMES) {
  test(`la página pública pasa axe (WCAG AA) con ${JSON.stringify(theme)}`, async ({ page, context }) => {
    const state = createState({ profiles: [profileRow({ theme, contact_card: { enabled: true, email: 'hola@ana.com' } })], profile_modules: rows() })
    await installSupabaseMock(context, state)
    await page.goto('/ana')
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Imágenes de prueba sin conexión (no son parte del tema)
      .exclude('img')
      .analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
}

// V1 (etapa 03): el modo automático, las esquinas, el fondo y las tarjetas dejaron de cambiar la página pública
// (ahora son estructura, tema Universo / Amanecer y acento). Los perfiles con esos valores se siguen viendo bien:
// lo verifican el axe de arriba y "perfiles de antes" en profile-layouts.spec.ts. Studio → Apariencia cambia en la 06.

test('Studio: estructura, tema, acento y huella se ven en la vista previa, se guardan y se publican', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/studio/appearance')
  const preview = page.locator('.st-preview-pane main.mp-root')

  await page.getByRole('radiogroup', { name: 'Estructura' }).getByRole('radio', { name: /Portada/ }).click()
  await expect(preview).toHaveClass(/mp-layout-portada/)
  await page.getByRole('radiogroup', { name: 'Tema' }).getByRole('radio', { name: /Amanecer/ }).click()
  await expect(preview).toHaveAttribute('data-mycen-theme', 'amanecer')
  await page.getByRole('radiogroup', { name: 'Acento' }).getByRole('radio', { name: 'Aurora' }).click()
  await expect(preview).toHaveAttribute('data-mycen-accent', 'aurora')
  await page.getByRole('radiogroup', { name: 'Huella' }).getByRole('radio', { name: 'Pulso' }).click()
  await expect.poll(() => state.tables.profiles[0].theme)
    .toMatchObject({ layout: 'portada', mode: 'amanecer', accent: 'aurora', huella_variant: 'pulso' })

  // "Generar otra" cambia la sal; se puede volver a la anterior mientras no se publique
  await page.getByRole('button', { name: 'Generar otra' }).click()
  await expect.poll(() => state.tables.profiles[0].huella_salt).toMatch(/^[A-Za-z0-9]{9}$/)
  await page.getByRole('button', { name: 'Volver a la anterior' }).click()
  await expect.poll(() => state.tables.profiles[0].huella_salt).toBeNull()
  await page.getByRole('button', { name: 'Generar otra' }).click()
  await expect.poll(() => state.tables.profiles[0].huella_salt).toMatch(/^[A-Za-z0-9]{9}$/)
  const salt = state.tables.profiles[0].huella_salt

  // Perfil vivo
  await page.getByRole('textbox', { name: 'Estado actual' }).fill('De gira por Chile')
  await page.getByRole('switch', { name: /Disponible/ }).click()
  await expect.poll(() => state.tables.profiles[0].status_text).toBe('De gira por Chile')
  await expect.poll(() => state.tables.profiles[0].available).toBe(true)

  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect.poll(() => state.tables.profile_versions.length).toBeGreaterThan(1)

  // El perfil público muestra lo publicado
  const visitor = await page.context().browser()!.newContext()
  await installSupabaseMock(visitor, state)
  const pub = await visitor.newPage()
  await pub.goto('/ana')
  const root = pub.locator('main.mp-root')
  await expect(root).toHaveClass(/mp-layout-portada/)
  await expect(root).toHaveAttribute('data-mycen-theme', 'amanecer')
  await expect(root).toHaveAttribute('data-mycen-accent', 'aurora')
  await expect(pub.getByText('De gira por Chile')).toBeVisible()
  const published = state.tables.profile_versions.find(v => v.id === state.tables.profiles[0].published_version_id)!
  expect((published.snapshot as { huella_salt: string }).huella_salt).toBe(salt)
  await visitor.close()
})

test('Studio: en pantallas angostas la vista previa en vivo está en la misma página', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio/appearance')
  const preview = page.getByRole('region', { name: 'Vista previa' }).locator('main.mp-root')
  await page.getByRole('radiogroup', { name: 'Estructura' }).getByRole('radio', { name: /Bento/ }).click()
  await expect(preview).toHaveClass(/mp-layout-bento/)
})
