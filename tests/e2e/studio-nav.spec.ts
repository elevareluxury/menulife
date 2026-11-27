import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Studio en el celular: la barra de abajo trae 5 botones que entran sin deslizarse (lo demás está en "Más"), Life OS es
// la huella redonda en el medio de la barra (asoma un poco por arriba), y deslizar la página pasa a la sección de al lado.

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

test('la barra de abajo trae 5 botones que entran (también en 320 px), Life OS en el medio y lo demás en "Más"', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/studio')
  const nav = page.getByRole('navigation', { name: 'Studio' }).last()
  for (const name of ['Inicio', 'Editar', 'Mis Spaces', 'Compartir', 'Más']) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(1)
  }
  await expect(nav.getByRole('link', { name: 'Módulos', exact: true })).toHaveCount(0)

  // La cápsula de luz marca la sección y viaja al botón que se toca
  const indicator = page.locator('.st-nav-indicator')
  const x0 = await indicator.evaluate(el => el.getBoundingClientRect().x)
  await nav.getByRole('link', { name: 'Mis Spaces', exact: true }).click()
  await expect(page).toHaveURL(/\/studio\/spaces$/)
  const target = (await nav.getByRole('link', { name: 'Mis Spaces', exact: true }).boundingBox())!
  await expect.poll(async () => Math.round(await indicator.evaluate(el => el.getBoundingClientRect().x))).toBe(Math.round(target.x))
  expect(Math.round(target.x)).not.toBe(Math.round(x0))

  // Life OS: la huella en la barra, entre Editar y Mis Spaces, asomando por arriba (menos de la mitad de su alto)
  const life = nav.getByRole('link', { name: 'Life OS' })
  await expect(life).toHaveAttribute('href', '/life')
  const fab = (await life.boundingBox())!
  const bar = (await nav.boundingBox())!
  const edit = (await nav.getByRole('link', { name: 'Editar', exact: true }).boundingBox())!
  expect(fab.y).toBeLessThan(bar.y)
  expect(bar.y - fab.y).toBeLessThan(fab.height / 2)
  expect(fab.x).toBeGreaterThan(edit.x + edit.width - 1)
  expect(fab.x + fab.width).toBeLessThanOrEqual(target.x + 1)

  // Lo que salió de la barra sigue en "Más"
  await nav.getByRole('link', { name: 'Más', exact: true }).click()
  for (const name of ['Módulos', 'Apariencia', 'Proyectos', 'Mensajes', 'Suscriptores', 'Analítica', 'Ajustes', 'Vista previa']) {
    await expect(page.getByRole('main').getByRole('link', { name, exact: true })).toHaveCount(1)
  }

  // En 320 px entran todos, sin deslizarse, con 44 px cada uno
  await page.setViewportSize({ width: 320, height: 640 })
  await expect.poll(() => nav.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  const boxes = await nav.locator('a').evaluateAll(els => els.map(el => el.getBoundingClientRect()).map(r => ({ l: r.left, r: r.right, w: r.width, h: r.height })))
  expect(boxes).toHaveLength(6)
  for (const b of boxes) {
    expect(b.w).toBeGreaterThanOrEqual(44)
    expect(b.h).toBeGreaterThanOrEqual(44)
    expect(b.l).toBeGreaterThanOrEqual(0)
    expect(b.r).toBeLessThanOrEqual(320)
  }
  await page.screenshot({ path: 'test-results/studio-nav-huella.png' })
})

test('deslizar la página pasa a la sección de al lado; dentro de un editor abierto, no', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: [moduleRow({ id: 'm-1', title: 'Mi portfolio' })] }), { signedIn: true })
  await page.goto('/studio')
  await expect(page.locator('h1.st-title').first()).toBeVisible()

  await swipe(page, 320, 60)
  await expect(page).toHaveURL(/\/studio\/identity$/)
  await swipe(page, 320, 60)
  await expect(page).toHaveURL(/\/studio\/spaces$/)
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
