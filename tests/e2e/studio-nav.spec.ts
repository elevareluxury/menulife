import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Studio en el celular: la barra de abajo trae Módulos, Apariencia y Life OS (se desliza de costado si no entra) y
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

test('la barra de abajo trae Módulos, Apariencia y Life OS, y se desliza si no entra', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/studio')
  const nav = page.getByRole('navigation', { name: 'Studio' }).last()
  for (const name of ['Inicio', 'Editar', 'Módulos', 'Apariencia', 'Compartir', 'Mis Spaces', 'Más', 'Life OS']) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(1)
  }
  expect(await nav.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)

  await nav.getByRole('link', { name: 'Módulos', exact: true }).click()
  await expect(page).toHaveURL(/\/studio\/modules$/)
  await expect(nav.getByRole('link', { name: 'Life OS' })).toHaveAttribute('href', '/life')
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
