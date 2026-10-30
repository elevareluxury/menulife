import { expect, test, type Page } from '@playwright/test'
import { installSupabaseMock } from './support/mockSupabase'
import { installTestImages } from './support/testImages'
import { imageStressState } from './support/imageStress'
import { layoutProblems } from './support/layoutAudit'

// Fotos de verdad en todos los módulos (muy altas, muy anchas, chiquitas, con transparencia y una que ya no existe),
// en las 5 estructuras y los 2 temas: nada roto a la vista, nada gigante, nada pixelado y nada que se salga.

async function scrollThrough(page: Page) {
  // Las fotos se cargan al acercarse (lazy): se recorre la página para que carguen todas
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 500) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(40) }
  await page.waitForTimeout(600)
}

/** Fotos rotas a la vista: cargaron mal (naturalWidth 0) y se siguen viendo */
const brokenImages = (page: Page) => page.evaluate(() => [...document.querySelectorAll('main img')]
  .filter(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0 && i.getBoundingClientRect().width > 0)
  .map(i => (i as HTMLImageElement).src))

test.describe('fotos en el perfil público', () => {
  test.describe.configure({ mode: 'parallel' })
  for (const mode of ['universo', 'amanecer']) for (const layout of ['credencial', 'portada', 'editorial', 'bento', 'clasica']) {
    test(`${layout} · ${mode}: sin fotos rotas, gigantes ni pixeladas, y nada se sale`, async ({ page, context }) => {
      await installTestImages(context)
      await installSupabaseMock(context, imageStressState({ layout, mode }))
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/ana')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await scrollThrough(page)

      expect(await brokenImages(page)).toEqual([])
      // Una foto que ya no existe no deja su epígrafe solo
      await expect(page.getByText('Esta foto ya no existe')).toHaveCount(0)

      // Foto muy alta (1:4): recortada a 4:5, no ocupa varias pantallas
      const tall = page.getByRole('img', { name: 'Foto vertical' })
      const box = await tall.boundingBox()
      expect(box!.height).toBeLessThanOrEqual(box!.width * 1.26)

      // Foto chiquita (48 px): se ve a su tamaño, no estirada
      const small = await page.getByRole('img', { name: 'Ícono chiquito' }).boundingBox()
      expect(small!.width).toBeLessThanOrEqual(48)

      // Galería: la foto rota no ocupa lugar (7 cargadas, 1 rota → 6)
      await expect(page.getByRole('region', { name: 'Galería mezclada' }).or(page.locator('.mp-gallery')).locator('button')).toHaveCount(6)

      expect(await layoutProblems(page)).toEqual([])
    })
  }
})

test('el visor de la galería se usa con botones en el celular, cuenta las fotos y deja quieta la página', async ({ page, context }) => {
  await installTestImages(context)
  await installSupabaseMock(context, imageStressState({ layout: 'clasica' }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/ana')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await scrollThrough(page)
  await page.locator('.mp-gallery button').first().click()
  const viewer = page.getByRole('dialog')
  await expect(viewer).toHaveAccessibleName('1 / 6')
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
  await viewer.getByRole('button', { name: 'Foto siguiente' }).click()
  await expect(viewer).toHaveAccessibleName('2 / 6')
  await viewer.getByRole('button', { name: 'Foto anterior' }).click()
  await viewer.getByRole('button', { name: 'Foto anterior' }).click()
  await expect(viewer).toHaveAccessibleName('6 / 6')
  await page.keyboard.press('Escape')
  await expect(viewer).toHaveCount(0)
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
})

test('Studio avisa cuando una foto guardada ya no carga, en la galería y en el campo de imagen', async ({ page, context }) => {
  await installTestImages(context)
  await installSupabaseMock(context, imageStressState(), { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Editar Galería mezclada', exact: true }).first().click()
  let sheet = page.getByRole('dialog').last()
  await expect(sheet.getByText('Foto 5 · Esta imagen ya no carga: cambiala o quitala.')).toBeVisible()
  await sheet.getByRole('button', { name: 'Cancelar' }).click()

  await page.getByRole('button', { name: 'Editar Link con miniatura rota', exact: true }).first().click()
  sheet = page.getByRole('dialog').last()
  await expect(sheet.getByText('Esta imagen ya no carga: cambiala o quitala.')).toBeVisible()
})
