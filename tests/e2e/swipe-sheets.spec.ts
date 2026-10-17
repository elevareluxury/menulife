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

test('con una hoja abierta lo de atrás queda quieto, y al cerrarla vuelve a moverse', async ({ page, context }) => {
  await installSupabaseMock(context, rich(), { signedIn: true })
  await page.goto('/life/goals')
  const root = page.locator('[data-scroll-root]').first()
  await expect.poll(() => root.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto')
  await page.getByRole('button', { name: 'Nueva meta', exact: true }).first().click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  expect(await root.evaluate(el => getComputedStyle(el).overflowY)).toBe('hidden')
  // La hoja sólo se mueve para arriba y abajo y no rebota
  expect(await sheet.evaluate(el => getComputedStyle(el).touchAction)).toMatch(/pan-y/)
  const wide = await sheet.evaluate(el => [...el.querySelectorAll('*')].filter(c => c.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).length)
  expect(wide).toBe(0)
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await expect.poll(() => root.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto')
})

test('en un celular chico (320 px) nada se sale de las hojas de Life OS', async ({ page, context }) => {
  test.setTimeout(120_000)
  await installSupabaseMock(context, rich(), { signedIn: true })
  await page.setViewportSize({ width: 320, height: 640 })
  const sheets: [string, RegExp | string][] = [
    ['/life/goals', 'Nueva meta'], ['/life/habits', /Nuevo hábito/], ['/life/money', /Nuevo movimiento|Agregar movimiento/],
    ['/life/brain?vista=tareas', /Nueva tarea|Agregar tarea/],
  ]
  for (const [route, name] of sheets) {
    await page.goto(route)
    await page.getByRole('button', { name }).first().click()
    const sheet = page.getByRole('dialog').last()
    await expect(sheet).toBeVisible()
    await page.waitForTimeout(500)
    const out = await sheet.evaluate(el => {
      const box = el.getBoundingClientRect()
      return [...el.querySelectorAll('*')].filter(c => {
        if (c.closest('svg') && c.tagName !== 'svg') return false
        const b = c.getBoundingClientRect()
        return b.width > 0 && (b.right > box.right + 1 || b.left < box.left - 1)
      }).map(c => c.getAttribute('aria-label') ?? c.textContent?.slice(0, 20) ?? c.tagName)
    })
    expect(out, route).toEqual([])
    await page.keyboard.press('Escape')
  }
})

test('fecha y hora vacías se ven como campos para tocar (ícono de calendario y reloj)', async ({ page, context }) => {
  await installSupabaseMock(context, rich(), { signedIn: true })
  await page.goto('/life/brain?vista=tareas')
  await page.getByRole('button', { name: /Nueva tarea|Agregar tarea/ }).first().click()
  for (const id of ['#task-date', '#task-time']) {
    const input = page.locator(id)
    await expect(input).toHaveValue('')
    const icon = page.locator(`.my-picker:has(${id}) .my-picker-icon`)
    await expect(icon).toBeVisible()
    const [a, b] = [(await input.boundingBox())!, (await icon.boundingBox())!]
    expect(b.x).toBeGreaterThan(a.x)
    expect(b.x + b.width).toBeLessThanOrEqual(a.x + a.width)
  }
  // Tocar la fecha la deja elegir; la hora se habilita después
  await page.locator('#task-date').fill('2026-10-20')
  await expect(page.locator('#task-time')).toBeEnabled()
})
