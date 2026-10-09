import { expect, test, type BrowserContext } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow } from './support/mockSupabase'

// V1 · etapa 15: después del login cada persona va a su lugar, y quien no tiene negocio nunca pasa por Business.

/** El login real: supabase-js pide un token y después lee el usuario */
async function allowLogin(context: BrowserContext) {
  const user = { id: OWNER_ID, email: 'ana@example.com', aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() }
  await context.route(/\/auth\/v1\/token/, route => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({
      access_token: 'test-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test-refresh', user,
    }),
  }))
  await context.route(/\/auth\/v1\/user/, route => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(user),
  }))
}

const CASES: Array<{ who: string; tables: Record<string, Record<string, unknown>[]>; to: RegExp; business: boolean }> = [
  { who: 'cuenta nueva (sin perfil ni negocio) → onboarding en Studio', tables: {}, to: /\/studio$/, business: false },
  { who: 'con perfil y sin negocio → Mi día', tables: { profiles: [profileRow()] }, to: /\/life$/, business: false },
  { who: 'negocio con plan gratis de identidad → Studio',
    tables: { restaurants: [{ id: 'r1', owner_id: OWNER_ID, plan: 'hub_free', name: 'Café', slug: 'cafe' }] }, to: /\/studio$/, business: false },
  { who: 'negocio con plan pago → Business', tables: { restaurants: [{ id: 'r1', owner_id: OWNER_ID, plan: 'pro', name: 'Café', slug: 'cafe' }] },
    to: /\/dashboard/, business: true },
  { who: 'super-admin → panel de super-admin', tables: { super_admins: [{ id: 'sa', user_id: OWNER_ID }] }, to: /\/super-admin$/, business: false },
]

for (const c of CASES) {
  test(`login: ${c.who}`, async ({ page, context }) => {
    await installSupabaseMock(context, createState(c.tables))
    await allowLogin(context)
    const visited: string[] = []
    page.on('framenavigated', f => { if (f === page.mainFrame()) visited.push(new URL(f.url()).pathname) })
    await page.goto('/login')
    await page.getByLabel('Email').fill('ana@example.com')
    await page.getByLabel('Contraseña').fill('una-clave-1')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(c.to)
    if (!c.business) expect(visited.some(p => p.startsWith('/dashboard'))).toBe(false)
  })
}
