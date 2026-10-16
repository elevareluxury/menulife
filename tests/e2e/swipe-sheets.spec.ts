import { expect, test, type Page } from '@playwright/test'
import { installSupabaseMock } from './support/mockSupabase'
import { rich } from './support/richState'

// En el celular: Brain se recorre deslizando de costado, y las hojas (nueva tarea) se ven desde arriba, enteras y sin
// moverse de costado.

async function swipe(page: Page, from: number, to: number) {
  // Como una persona: se desliza con la vista ya dibujada (no a mitad de la animación de entrada)
  await page.waitForTimeout(700)
  const y = 420
  await page.evaluate(({ from, to, y }) => {
    const el = document.elementFromPoint(from, y)!
    const touch = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y })
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(from)], changedTouches: [touch(from)] }))
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [touch(to)] }))
  }, { from, to, y })
}

test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

test('Brain: deslizar de costado pasa de Capturas a Tareas y a Archivo, y vuelve', async ({ page, context }) => {
  await installSupabaseMock(context, rich(), { signedIn: true })
  await page.goto('/life/brain')
  const tab = (name: RegExp) => page.getByRole('tab', { name })
  await expect(tab(/Capturas/)).toHaveAttribute('aria-selected', 'true')
  await swipe(page, 300, 80)
  await expect(tab(/Tareas/)).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/vista=tareas/)
  await swipe(page, 300, 80)
  await expect(tab(/Archivo/)).toHaveAttribute('aria-selected', 'true')
  // En la última no pasa nada más
  await swipe(page, 300, 80)
  await expect(tab(/Archivo/)).toHaveAttribute('aria-selected', 'true')
  await swipe(page, 80, 300)
  await expect(tab(/Tareas/)).toHaveAttribute('aria-selected', 'true')
  // Un gesto corto no cambia de vista
  await swipe(page, 200, 170)
  await expect(tab(/Tareas/)).toHaveAttribute('aria-selected', 'true')
})

test('Nueva tarea: la hoja se ve desde arriba, entra en la pantalla y no se mueve de costado', async ({ page, context }) => {
  await installSupabaseMock(context, rich(), { signedIn: true })
  await page.goto('/life/brain?vista=tareas')
  await page.getByRole('button', { name: /Nueva tarea|Agregar tarea/ }).first().click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  await expect(page.locator('#task-title')).toBeFocused()
  await page.waitForTimeout(500)
  const box = (await sheet.boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(376)
  // Título visible arriba, y nada más ancho que la hoja
  await expect(sheet.getByRole('heading')).toBeInViewport()
  const wide = await sheet.evaluate(el => [...el.querySelectorAll('*')].filter(c => c.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).length)
  expect(wide).toBe(0)
  const sideways = await sheet.evaluate(el => [...el.querySelectorAll('*')].some(c => c.scrollWidth > c.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(c).overflowX)))
  expect(sideways).toBe(false)
})

test('con el teclado abierto la hoja queda arriba de él y no más alta que lo visible', async ({ page, context }) => {
  await installSupabaseMock(context, rich(), { signedIn: true })
  await page.goto('/life/brain?vista=tareas')
  await page.getByRole('button', { name: /Nueva tarea|Agregar tarea/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  // Simula lo que hace el iPhone al abrir el teclado (300 px)
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--kb', '300px')
    document.documentElement.style.setProperty('--vvh', '367px')
  })
  await page.waitForTimeout(400)
  const box = (await page.getByRole('dialog').boundingBox())!
  expect(Math.round(box.y + box.height)).toBeLessThanOrEqual(367 + 1)
  expect(box.y).toBeGreaterThanOrEqual(0)
})
