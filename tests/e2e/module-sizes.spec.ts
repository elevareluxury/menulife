import { expect, test, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'
import { installTestImages } from './support/testImages'

// Tamaños de los módulos (mejoras-clase-mundial §B): cuadrado de a dos, ancho, destacado (Bento), barra de Spotify y
// video vertical; Bento en la compu con la identidad al costado y 4 columnas; el orden del dueño siempre se respeta.

const SPOTIFY = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'
const TIKTOK = 'https://www.tiktok.com/@ana/video/7231234567890123456'

function modules() {
  return [
    moduleRow({ id: 'm-a', title: 'Tienda', position: 10, config: { size: 'square' } }),
    moduleRow({ id: 'm-b', title: 'Behance', position: 20, content: { url: 'https://behance.net/ana', link_type: 'website' }, config: { size: 'square' } }),
    moduleRow({ id: 'm-c', type: 'image', title: null, position: 30, content: { url: 'https://cdn.example.com/taller.jpg', caption: 'Mi taller' }, config: { size: 'square' } }),
    moduleRow({ id: 'm-d', type: 'product', title: null, position: 40, config: { size: 'square' },
      content: { name: 'Logo express', price: 150, currency: 'USD', cta_text: 'Pedir', cta_url: 'https://wa.me/5493415550000' } }),
    moduleRow({ id: 'm-e', type: 'media', title: 'Mi tema', position: 50, content: { url: SPOTIFY, provider: 'spotify', kind: 'music' }, config: { size: 'bar' } }),
    moduleRow({ id: 'm-f', type: 'link', title: 'Último', position: 60, config: { size: 'square' } }),
    moduleRow({ id: 'm-g', type: 'media', title: 'Detrás de escena', position: 70, content: { url: TIKTOK, provider: 'tiktok', kind: 'video' }, config: { size: 'vertical' } }),
  ]
}

const tiles = (page: Page) => page.locator('.mp-modules > .mp-tile')

async function rects(page: Page) {
  return tiles(page).evaluateAll(els => els.map(el => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), size: (el as HTMLElement).dataset.size }
  }))
}

test('celular: cuadrados de a dos en el orden del dueño, sin huecos, barra de 80 px y vertical', async ({ page, context }) => {
  await installTestImages(context)
  await installSupabaseMock(context, createState({ profiles: [profileRow({ theme: { layout: 'clasica', mode: 'universo' } })], profile_modules: modules() }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/ana')
  await expect(tiles(page)).toHaveCount(7)
  const r = await rects(page)
  // Fila 1: Tienda y Behance; fila 2: foto y producto (mismo alto, uno al lado del otro)
  expect(r[0].y).toBe(r[1].y)
  expect(r[1].x).toBeGreaterThan(r[0].x + r[0].w - 1)
  expect(Math.abs(r[0].w - r[1].w)).toBeLessThanOrEqual(1)
  expect(r[0].h).toBeGreaterThanOrEqual(r[0].w - 1)
  expect(r[2].y).toBe(r[3].y)
  expect(r[2].h).toBe(r[3].h)
  // La barra va a lo ancho y mide 80 px como el reproductor compacto de Spotify
  expect(r[4].w).toBeGreaterThan(r[0].w * 2)
  await expect(page.locator('.mp-media-bar .mp-media-facade')).toHaveCSS('height', '80px')
  // "Último" (cuadrado) y el video vertical comparten fila; el vertical es más alto
  expect(r[5].y).toBe(r[6].y)
  const facade = (await page.locator('.mp-media-video .mp-media-facade').boundingBox())!
  expect(facade.height / facade.width).toBeGreaterThan(1.7)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  // Al tocar "Reproducir", el reproductor pasa a toda la fila (y nada de terceros antes)
  await page.locator('.mp-media-video .mp-media-facade').click()
  await expect(page.locator('.mp-media-video iframe')).toHaveCount(1)
  const playing = await rects(page)
  expect(playing[6].w).toBeGreaterThan(r[0].w * 2)
})

test('un cuadrado solo en su fila se estira (nunca queda un hueco) y sin elegir todo sigue a lo ancho', async ({ page, context }) => {
  const rows = [
    moduleRow({ id: 'm-1', title: 'Uno', position: 10, config: { size: 'square' } }),
    moduleRow({ id: 'm-2', type: 'text', title: 'Sobre mí', position: 20, content: { body: 'Hola' } }),
    moduleRow({ id: 'm-3', title: 'Tres', position: 30 }),
  ]
  await installSupabaseMock(context, createState({ profiles: [profileRow({ theme: { layout: 'credencial' } })], profile_modules: rows }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/ana')
  await expect(tiles(page)).toHaveCount(3)
  const r = await rects(page)
  expect(new Set(r.map(t => t.w)).size).toBe(1)
  await expect(tiles(page).first()).toHaveClass(/mp-s-wide/)
  await expect(tiles(page).first()).toHaveAttribute('data-size', 'square')
})

test('Bento en la compu: identidad al costado y módulos en 4 columnas; en el celular, 2', async ({ page, context }) => {
  await installTestImages(context)
  await installSupabaseMock(context, createState({ profiles: [profileRow({ theme: { layout: 'bento', mode: 'amanecer' } })], profile_modules: modules() }))
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/ana')
  await expect(tiles(page)).toHaveCount(7)
  await expect(page.locator('.mp-bento-grid')).toHaveAttribute('data-cols', '4')
  const side = (await page.locator('.mp-bento-side').boundingBox())!
  const grid = (await page.locator('.mp-bento-grid').boundingBox())!
  expect(grid.x).toBeGreaterThan(side.x + side.width)
  const r = await rects(page)
  // Cuatro cuadrados en la primera fila
  expect(new Set(r.slice(0, 4).map(t => t.y)).size).toBe(1)
  expect(r[0].w).toBeLessThan(grid.width / 3)
  const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.mp-bento-grid')).toHaveAttribute('data-cols', '2')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('Studio: el editor ofrece los tamaños del tipo y guarda el elegido en config.size', async ({ page, browser, context }) => {
  const state = createState({ profiles: [profileRow({ theme: { layout: 'clasica' } })] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /^Link\b/ }).first().click()
  const sheet = page.getByRole('dialog').last()
  const sizes = sheet.getByRole('group', { name: 'Tamaño' })
  // Fuera de Bento no hay "Destacado"
  await expect(sizes.getByRole('button')).toHaveText(['Automático', 'Cuadrado', 'Ancho'])
  await expect(sizes.getByRole('button', { name: 'Automático' })).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByRole('textbox', { name: /^Título/ }).fill('Mi tienda')
  await sheet.getByRole('textbox', { name: /^URL/ }).fill('https://mitienda.com')
  await sizes.getByRole('button', { name: 'Cuadrado' }).click()
  await expect(sizes.getByRole('button', { name: 'Cuadrado' })).toHaveAttribute('aria-pressed', 'true')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body)
    .toMatchObject({ type: 'link', config: { size: 'square' } })
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText(/Publicado · versión 2/)).toBeVisible()

  const visitor = await browser.newContext()
  await installSupabaseMock(visitor, state)
  const v = await visitor.newPage()
  await v.goto('/ana')
  await expect(v.locator('.mp-tile[data-size="square"]')).toHaveCount(1)
  await visitor.close()
})
