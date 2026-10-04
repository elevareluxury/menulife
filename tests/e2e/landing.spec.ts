import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock } from './support/mockSupabase'

// Lanzamiento L3a: la landing en 12 idiomas, sin prueba social inventada.

test.beforeEach(async ({ context }) => {
  await installSupabaseMock(context, createState({}))
})

test('?lang=en muestra la landing en inglés, con título, idioma y hreflang', async ({ page }) => {
  await page.goto('/?lang=en')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your digital identity')
  await expect(page).toHaveTitle('Mycen — Your digital identity, all in one place')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Create your digital identity/)

  const alternates = page.locator('link[rel="alternate"][hreflang]')
  await expect(alternates).toHaveCount(13)
  await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', 'https://mycen.id/')
  await expect(page.locator('link[hreflang="ja"]')).toHaveAttribute('href', 'https://mycen.id/?lang=ja')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://mycen.id/?lang=en')

  // Pie con los legales y preguntas frecuentes con su ancla
  await expect(page.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terminos')
  await expect(page.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacidad')
  await expect(page.locator('#faq')).toContainText('Which languages is Mycen available in?')
})

test('árabe se ve de derecha a izquierda', async ({ page }) => {
  await page.goto('/?lang=ar')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('هويتك الرقمية')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('el selector cambia el idioma y la URL lo acompaña', async ({ page }) => {
  await page.goto('/?lang=en')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your digital identity')
  // En el celular el selector está dentro del menú
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('pt')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sua identidade digital')
  await expect(page).toHaveURL(/\?lang=pt$/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('sin prueba social inventada: ni banda de marcas ni testimonios de ejemplo', async ({ page }) => {
  await page.goto('/?lang=es')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu identidad digital')
  await expect(page.getByText('Trattoria Bella')).toHaveCount(0)
  await expect(page.getByText('Lo que dicen quienes')).toHaveCount(0)
  // El teléfono del hero muestra una identidad de ejemplo, no un restaurante
  await expect(page.getByText('Disponible para proyectos')).toBeVisible()
  // "Ya tengo cuenta" lleva a iniciar sesión
  await expect(page.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute('href', '/login')
})

test('la landing pasa axe (WCAG AA)', async ({ page }) => {
  await page.goto('/?lang=es')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
})

test.describe('animaciones', () => {
  test('la barra de progreso avanza, la cinta de idiomas corre y el precio cuenta hasta el valor nuevo', async ({ page }) => {
    await page.goto('/?lang=es')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu identidad digital')
    // Cinta: los 12 idiomas para lectores de pantalla, y la pista visual animada
    await expect(page.getByRole('region', { name: 'Mycen habla 12 idiomas' })).toContainText('العربية')
    await expect.poll(() => page.locator('.ml-marquee-track').evaluate(el => getComputedStyle(el).animationName)).toBe('ml-marquee')
    // Títulos por palabra: el lector de pantalla recibe la frase entera
    await expect(page.getByRole('heading', { name: 'Hoy tu vida digital está fragmentada.' })).toBeAttached()

    const progress = () => page.locator('.ml-progress').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)
    expect(await progress()).toBeLessThan(0.05)
    await page.locator('#pricing').scrollIntoViewIfNeeded()
    await expect.poll(progress).toBeGreaterThan(0.3)

    const price = page.locator('#pricing').getByText(/^US\$\d+$/).first()
    await expect(price).toHaveText('US$70')
    await page.getByRole('button', { name: /6 meses/ }).click()
    await expect(price).toHaveText('US$63')
  })

  test('con "reducir movimiento" no se mueve nada y todo se ve', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    await installSupabaseMock(context, createState({}))
    const page = await context.newPage()
    await page.goto('/?lang=es')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu identidad digital')
    expect(await page.locator('.ml-marquee-track').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
    // Las palabras de los títulos quedan en su lugar, sin esperar el scroll
    const hidden = await page.locator('[data-word]').evaluateAll(els => els.filter(el => getComputedStyle(el).opacity !== '1' || getComputedStyle(el).transform !== 'none').length)
    expect(hidden).toBe(0)
    await page.locator('#pricing').scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: /Anual/ }).click()
    await expect(page.locator('#pricing').getByText(/^US\$\d+$/).first()).toHaveText('US$56')
    await context.close()
  })
})
