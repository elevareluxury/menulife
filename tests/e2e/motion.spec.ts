import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Fase 3 de diseño (movimiento de intensidad media): filas que llegan en cascada, tarjetas que se inclinan con el
// mouse, cupón que se "sella" al copiar y tilde que se dibuja al enviar. Con "reducir movimiento", todo quieto.

function state() {
  return createState({
    profiles: [profileRow({ theme: { layout: 'clasica', mode: 'universo' } })],
    profile_modules: [
      moduleRow({ id: 'm-links', type: 'link_group', title: 'Mis links', position: 10, content: { items: [
        { title: 'Tienda', url: 'https://tienda.example.com' },
        { title: 'Blog', url: 'https://blog.example.com' },
        { title: 'Prensa', url: 'https://prensa.example.com' },
        { title: 'Agenda', url: 'https://agenda.example.com' },
      ] } }),
      moduleRow({ id: 'm-coupon', type: 'coupon', title: '10 % off', position: 20, content: { code: 'MYCEN10' } }),
      moduleRow({ id: 'm-form', type: 'contact_form', title: 'Escribime', position: 30, content: {} }),
    ],
  })
}

const rows = (page: Page) => page.locator('.mp-link-group-rows > *')
const anim = (page: Page) => rows(page).evaluateAll(els => els.map(el => {
  const cs = getComputedStyle(el)
  return { name: cs.animationName, delay: parseFloat(cs.animationDelay) }
}))

test('las filas de un grupo de links llegan una tras otra después de su módulo', async ({ page, context }) => {
  await installSupabaseMock(context, state())
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/ana')
  await expect(rows(page)).toHaveCount(4)
  const a = await anim(page)
  expect(a.every(r => r.name === 'mp-rise')).toBe(true)
  for (let i = 1; i < a.length; i++) expect(a[i].delay).toBeGreaterThan(a[i - 1].delay)
})

test('con "reducir movimiento" las filas quedan quietas y se ven de entrada', async ({ page, context }) => {
  await installSupabaseMock(context, state())
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ana')
  await expect(rows(page)).toHaveCount(4)
  expect((await anim(page)).every(r => r.name === 'none')).toBe(true)
  await expect(rows(page).first()).toHaveCSS('opacity', '1')
})

test('compu: una tarjeta con foto se inclina hacia el mouse y vuelve al salir', async ({ page, context }) => {
  await installSupabaseMock(context, createState({
    profiles: [profileRow({ theme: { layout: 'clasica', mode: 'universo' } })],
    profile_modules: [moduleRow({ id: 'm-card', type: 'link', title: 'Portfolio', position: 10,
      content: { url: 'https://portfolio.example.com', image_url: 'https://cdn.example.com/p.jpg', style: 'card' } })],
  }))
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/ana')
  const card = page.locator('.mp-link-card').first()
  await expect(card).toBeVisible()
  const box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2)
  await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.18)
  await expect(card).toHaveClass(/mp-tilting/)
  expect(await card.evaluate(el => getComputedStyle(el).transform)).not.toBe('none')
  await page.mouse.move(5, 5)
  await expect(card).not.toHaveClass(/mp-tilting/)
})

test('copiar el cupón lo sella y enviar el formulario dibuja el tilde', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await installSupabaseMock(context, state())
  await page.goto('/ana')
  await page.getByRole('button', { name: /Copiar/ }).first().click()
  await expect(page.locator('.mp-coupon')).toHaveClass(/is-copied/)
  expect(await page.locator('.mp-coupon-code').evaluate(el => getComputedStyle(el).animationName)).toBe('mp-stamp')

  const form = page.locator('.mp-form')
  await form.getByLabel(/nombre/i).fill('Juan')
  await form.getByLabel(/WhatsApp/).fill('juan@example.com')
  await form.getByLabel(/Mensaje/).fill('Hola, ¿hacés logos?')
  await form.locator('button[type="submit"]').click()
  await expect(page.locator('.mp-done-mark')).toBeVisible()
  await expect(page.locator('.mp-form-done')).toBeVisible()
})
