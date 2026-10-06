import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock } from './support/mockSupabase'

// Lanzamiento L4: términos y privacidad en el idioma de la persona, con el español como referencia.

test('términos en español con índice, reglas y contacto', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/terminos#reglas')
  await expect(page.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Reglas de contenido' })).toBeInViewport()
  await expect(page.getByRole('navigation', { name: 'Contenido' }).getByRole('link')).toHaveCount(12)
  await expect(page.getByText('Mycen es un servicio operado por')).toContainText('Resilio')
  await expect(page.getByText('La versión en español es la de referencia')).toHaveCount(0)
  await expect(page).toHaveTitle('Términos y condiciones · Mycen')
})

test('privacidad en inglés avisa que manda el español; en árabe va de derecha a izquierda', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('mycen_lang', 'en'))
  await installSupabaseMock(context, createState({}))
  await page.goto('/privacidad')
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible()
  await expect(page.getByText('The Spanish version is the reference version.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Who we share it with' })).toBeVisible()
  await expect(page.getByText('Mercado Pago:')).toBeVisible()

  await page.getByRole('combobox', { name: 'Language' }).selectOption('ar')
  await expect(page.getByRole('heading', { level: 1, name: 'سياسة الخصوصية' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('las páginas legales pasan axe (WCAG AA)', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  for (const path of ['/terminos', '/privacidad']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`), path).toEqual([])
  }
})
