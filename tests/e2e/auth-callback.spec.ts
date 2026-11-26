import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// /auth/callback no deja entrar a otra cuenta sin avisar (auditoría de seguridad: login CSRF). Un link con los tokens
// de OTRA cuenta en el # ya no se usa para entrar, y con una sesión abierta un token_hash ajeno no la reemplaza.

test('con sesión abierta, un link con tokens ajenos en el # no cambia de cuenta', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  const touched: string[] = []
  await page.route('**/auth/v1/user', route => { touched.push(route.request().method()); return route.fallback() })
  await page.route('**/auth/v1/verify**', route => { touched.push('verify'); return route.fallback() })
  await page.goto('/auth/callback#access_token=ajeno&refresh_token=ajeno&type=signup')
  await expect(page).toHaveURL(/\/(life|studio)/)
  expect(touched).not.toContain('verify')
  expect(await page.evaluate(() => window.location.hash)).toBe('')
})

test('con sesión abierta, un token_hash de registro ajeno no se canjea', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  let verified = false
  await page.route('**/auth/v1/verify**', route => { verified = true; return route.fallback() })
  await page.goto('/auth/callback?token_hash=ajeno&type=signup')
  await expect(page).toHaveURL(/\/(life|studio)/)
  expect(verified).toBe(false)
})

test('sin sesión, un link viejo con tokens en el # pide entrar de nuevo', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/auth/callback#access_token=viejo&refresh_token=viejo')
  await expect(page).toHaveURL(/\/login\?error=expired/)
})
