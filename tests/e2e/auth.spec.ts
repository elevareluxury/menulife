import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock } from './support/mockSupabase'

// Lanzamiento L3b: registro, inicio de sesión y contraseñas en el idioma de la persona.

const useLang = (lang: string) => async ({ context }: { context: import('@playwright/test').BrowserContext }) => {
  await context.addInitScript(l => localStorage.setItem('mycen_lang', l), lang)
  await installSupabaseMock(context, createState({}))
}

test.describe('en inglés', () => {
  test.beforeEach(useLang('en'))

  test('el registro guarda el idioma para los mails y traduce los errores de Supabase', async ({ page }) => {
    let body: { data?: { locale?: string; name?: string } } = {}
    await page.route('**/auth/v1/signup**', route => {
      body = route.request().postDataJSON()
      return route.fulfill({ status: 422, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ code: 422, msg: 'User already registered', error_code: 'user_already_exists' }) })
    })
    await page.goto('/register')
    await expect(page.getByText('Your digital identity, all in one place')).toBeVisible()
    await page.getByLabel('Your name').fill('Ana Pérez')
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByLabel('Password').fill('secreta123')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Create my free account' }).click()

    await expect(page.getByRole('alert')).toHaveText('That email already has an account. Log in or reset your password.')
    expect(body.data?.locale).toBe('en')
    expect(body.data?.name).toBe('Ana Pérez')
  })

  test('el login muestra el error en inglés y el aviso de contraseña cambiada', async ({ page }) => {
    await page.route('**/auth/v1/token**', route => route.fulfill({
      status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }),
    }))
    await page.goto('/login?message=password_updated')
    await expect(page.getByText('Done, your password was updated. Log in with the new one.')).toBeVisible()
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByLabel('Password').fill('equivocada1')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Wrong email or password.')
  })

  test('un link vencido se explica en el idioma de la persona', async ({ page }) => {
    await page.goto('/forgot-password?error=expired')
    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText('The link has expired. Request a new one.')
  })
})

test.describe('en árabe', () => {
  test.beforeEach(useLang('ar'))

  test('el login se ve de derecha a izquierda', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('سجّل الدخول إلى حسابك')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})

test('el selector de idioma cambia la pantalla de registro', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/register')
  await expect(page.getByRole('button', { name: 'Crear mi cuenta gratis' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('pt')
  await expect(page.getByRole('button', { name: 'Criar minha conta grátis' })).toBeVisible()
})

for (const path of ['/login', '/register', '/forgot-password']) {
  test(`${path} pasa axe (WCAG AA)`, async ({ page, context }) => {
    await installSupabaseMock(context, createState({}))
    await page.goto(path)
    await expect(page.getByRole('combobox', { name: 'Idioma' })).toBeVisible()
    // La tarjeta entra con un fundido (opacity): medir el contraste recién cuando terminó
    await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished)))
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
}
