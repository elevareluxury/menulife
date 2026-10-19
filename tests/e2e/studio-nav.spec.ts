import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Studio en el celular: la barra de abajo trae Módulos y Apariencia (se desliza de costado si no entra), Life OS es la
// huella que flota arriba de la barra al medio, y
// deslizar la página pasa a la sección de al lado.

async function swipe(page: Page, from: number, to: number, y = 160) {
  await page.waitForTimeout(500)
  await page.evaluate(({ from, to, y }) => {
    const el = document.elementFromPoint(from, y)!
    const touch = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y })
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(from)], changedTouches: [touch(from)] }))
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [touch(to)] }))
  }, { from, to, y })
}

test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

test('la barra de abajo trae Módulos y Apariencia, se desliza si no entra, y Life OS está en la huella', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/studio')
  const nav = page.getByRole('navigation', { name: 'Studio' }).last()
  for (const name of ['Inicio', 'Editar', 'Módulos', 'Apariencia', 'Compartir', 'Mis Spaces', 'Más']) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(1)
  }
  expect(await nav.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)

  await expect(nav.getByRole('link', { name: 'Life OS' })).toHaveCount(0)

  // La cápsula de luz marca la sección y viaja al botón que se toca
  const indicator = page.locator('.st-nav-indicator')
  const x0 = await indicator.evaluate(el => el.getBoundingClientRect().x)
  await nav.getByRole('link', { name: 'Módulos', exact: true }).click()
  await expect(page).toHaveURL(/\/studio\/modules$/)
  const target = (await nav.getByRole('link', { name: 'Módulos', exact: true }).boundingBox())!
  await expect.poll(async () => Math.round(await indicator.evaluate(el => el.getBoundingClientRect().x))).toBe(Math.round(target.x))
  expect(Math.round(target.x)).not.toBe(Math.round(x0))

  // Life OS: la huella arriba de la barra, al medio
  const life = page.locator('.st-life-fab')
  await expect(life).toHaveAttribute('href', '/life')
  await expect(life).toHaveAccessibleName('Life OS')
  const fab = (await life.boundingBox())!
  const bar = (await nav.boundingBox())!
  expect(fab.y + fab.height).toBeLessThan(bar.y)
  expect(Math.abs(fab.x + fab.width / 2 - 375 / 2)).toBeLessThan(2)
  await page.screenshot({ path: 'test-results/studio-nav-huella.png' })
})

test('deslizar la página pasa a la sección de al lado; dentro de un editor abierto, no', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: [moduleRow({ id: 'm-1', title: 'Mi portfolio' })] }), { signedIn: true })
  await page.goto('/studio')
  await expect(page.locator('h1.st-title').first()).toBeVisible()

  await swipe(page, 320, 60)
  await expect(page).toHaveURL(/\/studio\/identity$/)
  await swipe(page, 320, 60)
  await expect(page).toHaveURL(/\/studio\/modules$/)
  await swipe(page, 60, 320)
  await expect(page).toHaveURL(/\/studio\/identity$/)
  await swipe(page, 60, 320)
  await expect(page).toHaveURL(/\/studio$/)
  // En la primera no pasa nada más
  await swipe(page, 60, 320)
  await expect(page).toHaveURL(/\/studio$/)

  // Con el editor de un módulo abierto, deslizar no cambia de sección por detrás
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Editar Mi portfolio', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const box = await page.getByRole('dialog').boundingBox()
  await swipe(page, 300, 60, Math.round(box!.y + 40))
  await expect(page).toHaveURL(/\/studio\/modules$/)
  await expect(page.getByRole('dialog')).toBeVisible()
})
