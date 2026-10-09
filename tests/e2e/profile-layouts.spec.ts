import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'
import { MODULE_FIXTURES } from './support/moduleFixtures'

// V1 · etapa 03: las cinco estructuras del perfil, los dos temas y el perfil vivo (sistema de diseño §9).

const LAYOUTS = ['credencial', 'portada', 'editorial', 'bento', 'clasica'] as const
const rows = () => MODULE_FIXTURES.map(f => structuredClone(f.row))
const PRIMARY = { kind: 'whatsapp', label: 'Escribime por WhatsApp', url: 'https://wa.me/5493415550000' }

function profile(theme: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return profileRow({
    theme, primary_action: PRIMARY, status_text: 'Grabando el disco', available: true,
    contact_card: { enabled: true, email: 'hola@ana.com' }, ...extra,
  })
}

/** Espera a que terminen las animaciones de entrada (las infinitas —flotar, girar, latir— no cuentan) */
async function settled(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
    .map(a => a.finished.catch(() => undefined))))
}

for (const layout of LAYOUTS) {
  test(`estructura ${layout}: carga, la acción principal se ve sin scroll y el pie aparece`, async ({ page, context }) => {
    const state = createState({ profiles: [profile({ layout, mode: 'universo', accent: 'plasma' })], profile_modules: rows() })
    await installSupabaseMock(context, state)
    await page.goto('/ana')

    const root = page.locator('main.mp-root')
    await expect(root).toHaveAttribute('data-mycen-theme', 'universo')
    await expect(root).toHaveClass(new RegExp(`mp-layout-${layout}`))
    await expect(page.getByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeVisible()

    // La acción principal, entera dentro de la primera pantalla (sin hacer scroll)
    const primary = page.getByRole('link', { name: 'Escribime por WhatsApp' })
    await expect(primary).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    // Perfil vivo
    await expect(page.getByText('Grabando el disco')).toBeVisible()
    await expect(page.getByText('Disponible', { exact: true })).toBeVisible()

    // La huella es decorativa
    await expect(page.locator('svg[aria-hidden="true"] linearGradient').first()).toBeAttached()

    // Pie "mycen · Creá tu identidad"
    const footer = page.locator('footer.mp-footer')
    await expect(footer.getByRole('link', { name: 'Creá tu identidad' })).toHaveAttribute('href', /^\/register\?ref=/)

    // Sin contenedores con scroll interno (atrapan el gesto en iOS)
    const traps = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => {
      const s = getComputedStyle(el)
      return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1
    }).map(el => el.className))
    expect(traps).toEqual([])
  })
}

test('portada: la tapa ocupa la primera pantalla y avisa que hay más abajo', async ({ page, context }) => {
  const state = createState({ profiles: [profile({ layout: 'portada', mode: 'amanecer', accent: 'ion' })], profile_modules: rows() })
  await installSupabaseMock(context, state)
  await page.goto('/ana')
  const more = page.getByRole('link', { name: /Más sobre mí/ })
  await expect(more).toBeInViewport()
  const hero = await page.locator('.mp-cover-hero').boundingBox()
  expect(hero!.height).toBeGreaterThan(page.viewportSize()!.height * 0.8)
  await more.click()
  await expect(page.getByText('Diseño marcas desde 2015.')).toBeInViewport()
})

test('bento: cada tipo de módulo tiene su tamaño', async ({ page, context }) => {
  const state = createState({ profiles: [profile({ layout: 'bento' })], profile_modules: rows() })
  await installSupabaseMock(context, state)
  await page.goto('/ana')
  await expect(page.locator('.mp-bento-grid > .mp-b-S').first()).toBeVisible()
  await expect(page.locator('.mp-bento-grid > .mp-b-L').first()).toBeVisible()
})

test('perfiles de antes: modo claro y un color libre se ven en Clásica, Amanecer y el acento más cercano', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ theme: { mode: 'light', accent: '#3B82F6', corners: 'round' } })] })
  await installSupabaseMock(context, state)
  await page.goto('/ana')
  const root = page.locator('main.mp-root')
  await expect(root).toHaveClass(/mp-layout-clasica/)
  await expect(root).toHaveAttribute('data-mycen-theme', 'amanecer')
  await expect(root).toHaveAttribute('data-mycen-accent', 'ion')
})

for (const mode of ['universo', 'amanecer'] as const) {
  for (const layout of LAYOUTS) {
    test(`axe (WCAG AA): ${layout} en ${mode}`, async ({ page, context }) => {
      const accent = mode === 'universo' ? 'nebulosa' : 'aurora'
      const state = createState({ profiles: [profile({ layout, mode, accent })], profile_modules: rows() })
      await installSupabaseMock(context, state)
      await page.goto('/ana')
      await expect(page.getByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeVisible()
      await settled(page)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Imágenes de prueba sin conexión (no son parte del tema)
        .exclude('img')
        .analyze()
      expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
    })
  }
}
