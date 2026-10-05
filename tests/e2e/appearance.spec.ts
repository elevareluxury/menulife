import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'
import { MODULE_FIXTURES } from './support/moduleFixtures'

// Apariencia (Identity Fase 9): modo automático, esquinas, fondos y tarjetas, siempre legibles.

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

test('modo automático: sigue al dispositivo del visitante', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ theme: { mode: 'auto' } })] })
  await installSupabaseMock(context, state)
  const bg = () => page.locator('.mp-root').evaluate(el => getComputedStyle(el).backgroundColor)

  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/ana')
  await expect.poll(bg).toBe('rgb(241, 240, 233)')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(bg).toBe('rgb(17, 19, 17)')
})

test('esquinas, fondo y tarjetas cambian la página', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow({ theme: { corners: 'round', background: 'glow', card_style: 'outline', accent: '#F4705A' } })],
    profile_modules: [moduleRow({ id: 'm-1', title: 'Portfolio' })],
  })
  await installSupabaseMock(context, state)
  await page.goto('/ana')
  const link = page.getByRole('link', { name: /Portfolio/ })
  await expect(link).toBeVisible()
  // .mp-link: 18px × 1.45 (redondeadas)
  expect(await link.evaluate(el => getComputedStyle(el).borderTopLeftRadius)).toBe('26.1px')
  expect(await link.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  expect(await page.locator('.mp-root').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('radial-gradient')
})

test('Studio: elegir apariencia y ver el contraste verificado', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/appearance')

  await page.getByRole('group', { name: 'Tema' }).getByRole('button', { name: 'Automático' }).click()
  await page.getByRole('group', { name: 'Esquinas' }).getByRole('button', { name: 'Redondeadas' }).click()
  await page.getByRole('group', { name: 'Fondo' }).getByRole('button', { name: 'Teñido' }).click()
  await page.getByRole('group', { name: 'Tarjetas' }).getByRole('button', { name: 'Con borde' }).click()
  await expect.poll(() => state.tables.profiles[0].theme)
    .toMatchObject({ mode: 'auto', corners: 'round', background: 'tint', card_style: 'outline' })

  // Con "automático" se revisan los dos modos, y todo cumple
  const contrast = page.getByRole('region', { name: 'Contraste' })
  await expect(contrast.getByRole('list', { name: 'En modo claro' }).getByRole('listitem')).toHaveCount(4)
  await expect(contrast.getByRole('list', { name: 'En modo oscuro' }).getByRole('listitem')).toHaveCount(4)
  await expect(contrast.getByText('No cumple')).toHaveCount(0)

  // Un acento ilegible se avisa y se reemplaza (el panel sigue cumpliendo)
  await page.locator('input[type="color"]').fill('#151715')
  await expect(page.getByText(/Tu color de acento no se lee bien/)).toBeVisible()
  await expect(contrast.getByText('No cumple')).toHaveCount(0)
})
