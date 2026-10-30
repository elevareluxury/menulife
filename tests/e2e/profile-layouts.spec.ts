import { expect, test, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
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

    // Pie "mycen · Creá tu identidad" (abre "Elegí tu nombre")
    const footer = page.locator('footer.mp-footer')
    await expect(footer.getByRole('button', { name: 'Creá tu identidad' })).toHaveAttribute('aria-expanded', 'false')

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
  // Sólo la flecha: el texto "Más sobre mí" ya no se ve, queda como nombre accesible
  const more = page.getByRole('link', { name: /Más sobre mí/ })
  await expect(more).toBeInViewport()
  await expect(more).toHaveText('')
  const hero = await page.locator('.mp-cover-hero').boundingBox()
  expect(hero!.height).toBeGreaterThan(page.viewportSize()!.height * 0.8)
  await more.click()
  await expect(page.getByText('Diseño marcas desde 2015.')).toBeInViewport()
})

test('portada con foto: la foto cubre toda la tapa (sin franja vacía arriba)', async ({ page, context }) => {
  const url = 'https://mock.supabase.co/storage/v1/object/public/profile-media/u/tapa.webp'
  const state = createState({ profiles: [profile({ layout: 'portada', mode: 'amanecer', accent: 'ion', cover: { type: 'imagen', url } })], profile_modules: rows() })
  await installSupabaseMock(context, state)
  // Una foto apaisada (como una captura): antes quedaba centrada con su alto natural
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"><rect width="1200" height="500" fill="#335"/></svg>'
  await context.route('**/profile-media/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg }))
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(vp)
    await page.goto('/ana')
    const img = page.locator('.mp-cover-art img')
    await expect(img).toBeVisible()
    await expect.poll(() => img.evaluate(el => (el as HTMLImageElement).complete)).toBe(true)
    // La tapa entra con una escala suave: se mide cuando terminó (el lugar final es lo que importa)
    await page.locator('.mp-cover-art').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
    const hero = (await page.locator('.mp-cover-hero').boundingBox())!
    const box = (await img.boundingBox())!
    expect(Math.abs(box.y - hero.y)).toBeLessThan(1)
    expect(Math.abs(box.height - hero.height)).toBeLessThan(1)
    expect(Math.abs(box.width - hero.width)).toBeLessThan(1)
  }
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
      const results = await (await settledAxe(page))
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Imágenes de prueba sin conexión (no son parte del tema)
        .exclude('img')
        .analyze()
      expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
    })
  }
}
