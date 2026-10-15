import { expect, type Page } from '@playwright/test'

/**
 * Espera a que la pantalla quede quieta antes de medir con axe: sin animaciones corriendo (CSS/WAAPI, que usa
 * framer-motion para los fundidos) y con las opacidades en línea sin cambiar entre dos lecturas. Si se mide a mitad de
 * un fundido, axe ve colores mezclados con el fondo y reporta contraste bajo que no existe.
 */
export async function settle(page: Page) {
  const snapshot = () => page.evaluate(() => {
    const running = document.getAnimations().filter(a => a.playState === 'running').length
    const opacities = [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')].map(e => getComputedStyle(e).opacity).join(',')
    return { running, opacities }
  })
  await expect.poll(async () => {
    const a = await snapshot()
    await page.waitForTimeout(120)
    const b = await snapshot()
    return a.running === 0 && b.running === 0 && a.opacities === b.opacities
  }, { timeout: 8_000 }).toBe(true)
}
