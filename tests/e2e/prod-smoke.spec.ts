import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'
import { rich } from './support/richState'

// Humo del build de producción (npm run test:e2e:prod, playwright.prod.config.ts): cada pantalla que se carga aparte
// abre sin "Algo salió mal" ni errores. Con el servidor de desarrollo pasa siempre; acá se ve si el empaquetado rompe
// algo (Analítica: "t is not a function" en el bloque de recharts con rolldown 1.0).
// `vite preview` manda la CSP de vercel.json (vite.config.ts): nada de lo que abre cada pantalla puede violarla.

const PUBLIC = ['/', '/ana', '/soporte', '/eliminar-cuenta', '/terminos', '/privacidad', '/login', '/register']
const SIGNED_IN = [
  '/studio', '/studio/identity', '/studio/modules', '/studio/appearance', '/studio/exchange', '/studio/analytics',
  '/studio/messages', '/studio/subscribers', '/studio/settings', '/studio/spaces', '/studio/everywhere', '/studio/more',
  '/life', '/life/brain', '/life/habits', '/life/goals', '/life/money', '/life/insights', '/life/replay', '/life/settings',
  '/super-admin', '/super-admin/denuncias', '/super-admin/producto',
]

/** Errores de la página y violaciones de la CSP (Chromium las avisa en la consola: "Refused to …") */
function watch(page: Page): { errors: string[]; csp: string[] } {
  const seen = { errors: [] as string[], csp: [] as string[] }
  page.on('pageerror', e => seen.errors.push(e.message))
  page.on('console', m => { if (/Content Security Policy/i.test(m.text())) seen.csp.push(m.text()) })
  return seen
}

test('vite preview manda la CSP de producción', async ({ request }) => {
  const res = await request.get('/')
  const csp = res.headers()['content-security-policy'] ?? ''
  expect(csp).toMatch(/script-src 'self' 'sha256-/)
  expect(csp).not.toContain("'unsafe-inline' 'sha256")
})

for (const [paths, signedIn] of [[PUBLIC, false], [SIGNED_IN, true]] as const) {
  for (const path of paths) {
    test(`${path} abre en el build de producción`, async ({ page, context }) => {
      const state = rich()
      const today = new Date().toISOString().slice(0, 10)
      state.tables.profile_stats_daily.push({ profile_id: 'p-ana', day: today, event_type: 'view', module_id: null, events: 9, visitors: 7 })
      await installSupabaseMock(context, state, { signedIn })
      const seen = watch(page)
      await page.goto(path)
      await expect(page.locator('#root')).not.toBeEmpty()
      await page.waitForTimeout(800)
      await expect(page.getByText('Algo salió mal')).toHaveCount(0)
      expect(seen.errors).toEqual([])
      expect(seen.csp).toEqual([])
    })
  }
}

test('la landing pinta el esqueleto del hero con la CSP (script en línea con hash)', async ({ page }) => {
  const seen = watch(page)
  // Sin la app: sólo el HTML, para ver el esqueleto antes de que React lo saque
  await page.route(/\/assets\/index-[\w-]+\.js$/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await page.goto('/?lang=en')
  await expect(page.locator('#boot-hero .ch-line1')).not.toBeEmpty()
  expect(seen.csp).toEqual([])
})

test('los reproductores integrados (YouTube, Spotify, Vimeo, SoundCloud, TikTok) cargan con la CSP', async ({ page, context }) => {
  const urls = [
    'https://youtu.be/dQw4w9WgXcQ', 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC', 'https://vimeo.com/76979871',
    'https://soundcloud.com/ana/tema', 'https://www.tiktok.com/@ana/video/7234567890123456789',
  ]
  const state = createState({
    profiles: [profileRow()],
    profile_modules: urls.map((url, i) => moduleRow({ id: `m-${i}`, type: 'media', title: `Media ${i}`, position: i * 10, content: { url } })),
  })
  await installSupabaseMock(context, state)
  // Nada sale a la red real
  await context.route(/youtube|ytimg|vimeo|spotify|scdn|soundcloud|sndcdn|tiktok/i, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><p>ok' }))
  const seen = watch(page)
  await page.goto('/ana')
  for (let i = 0; i < urls.length; i++) {
    await page.getByRole('button', { name: new RegExp(`Media ${i}.*Reproducir`) }).click()
  }
  await expect(page.locator('iframe')).toHaveCount(urls.length)
  await page.waitForTimeout(800)
  expect(seen.errors).toEqual([])
  expect(seen.csp).toEqual([])
})
