import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Espera a que la pantalla quede quieta antes de medir con axe: sin animaciones corriendo (CSS/WAAPI, que usa
 * framer-motion para los fundidos) y con las opacidades en línea sin cambiar entre dos lecturas. Si se mide a mitad de
 * un fundido, axe ve colores mezclados con el fondo y reporta contraste bajo que no existe.
 */
export async function settle(page: Page) {
  const snapshot = () => page.evaluate(() => {
    // Las animaciones infinitas (huella que gira, pulso) nunca terminan: no se esperan
    const running = document.getAnimations()
      .filter(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length
    const opacities = [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')].map(e => getComputedStyle(e).opacity).join(',')
    return { running, opacities }
  })
  // Hasta 5 s: con el reloj de prueba fijo, alguna animación de salida puede quedar trabada (el elemento ya tiene
  // opacidad 0 y axe no lo mide); en ese caso se sigue igual en vez de fallar.
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    const a = await snapshot()
    await page.waitForTimeout(120)
    const b = await snapshot()
    if (a.running === 0 && b.running === 0 && a.opacities === b.opacities) return
  }
}

/** axe recién cuando la pantalla quedó quieta (ver `settle`). */
export async function settledAxe(page: Page): Promise<AxeBuilder> {
  await settle(page)
  return new AxeBuilder({ page })
}
