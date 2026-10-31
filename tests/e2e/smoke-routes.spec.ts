import { expect, test } from '@playwright/test'
import { installSupabaseMock } from './support/mockSupabase'
import { empty, rich } from './support/richState'

const ROUTES = ['/studio', '/studio/identity', '/studio/modules', '/studio/projects', '/studio/projects/pr-luna', '/studio/appearance', '/studio/exchange',
  '/studio/analytics', '/studio/settings', '/studio/preview', '/studio/editor', '/studio/spaces', '/studio/messages', '/studio/subscribers', '/studio/everywhere', '/studio/more', '/studio/nada',
  '/life', '/life/money', '/life/goals', '/life/habits', '/life/brain', '/life/brain?vista=tareas', '/life/replay', '/life/insights', '/life/settings', '/life/journal',
  '/ana', '/ana/estudio', '/ana/projects/cafe-luna', '/ana?src=qr', '/noexiste', '/', '/login', '/register', '/terminos', '/privacidad', '/forgot-password', '/auth/terms',
  // Panel interno (auditoría v2: "Verificaciones" caía con una respuesta vacía)
  '/super-admin', '/super-admin/estado', '/super-admin/personas', '/super-admin/personas?q=ana', '/super-admin/actividad', '/super-admin/denuncias', '/super-admin/errores', '/super-admin/producto', '/super-admin/verificaciones']


// Red de seguridad (auditoría total): cada pantalla de Studio, Life OS, el perfil público y las páginas abiertas se
// abre con datos variados (y raros) y sin datos, en el celular y en la compu. Ninguna puede caer en "Algo salió
// mal", tirar errores de React en la consola ni desplazarse de costado.

for (const [name, make, vp, scheme] of [
  ['con datos', rich, { width: 390, height: 844 }, 'dark'],
  ['vacío', empty, { width: 1280, height: 900 }, 'light'],
] as const) {
  test(`todas las pantallas abren sin errores (${name}, ${vp.width} px)`, async ({ page, context }) => {
    test.setTimeout(180_000)
    await page.emulateMedia({ colorScheme: scheme })
    await page.setViewportSize(vp)
    const found: string[] = []
    let where = ''
    page.on('pageerror', e => found.push(`[${where}] ${e.message}`))
    page.on('console', m => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) found.push(`[${where}] ${m.text().slice(0, 200)}`)
    })
    await installSupabaseMock(context, make(), { signedIn: true })
    for (const r of ROUTES) {
      where = r
      await page.goto(r)
      await page.waitForTimeout(600)
      if (await page.getByText('Algo salió mal').count()) found.push(`[${r}] pantalla de error`)
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (extra > 2) found.push(`[${r}] se desplaza ${extra}px de costado`)
    }
    expect([...new Set(found)]).toEqual([])
  })
}
