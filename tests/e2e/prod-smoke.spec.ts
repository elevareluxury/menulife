import { expect, test } from '@playwright/test'
import { installSupabaseMock } from './support/mockSupabase'
import { rich } from './support/richState'

// Humo del build de producción (npm run test:e2e:prod, playwright.prod.config.ts): cada pantalla que se carga aparte
// abre sin "Algo salió mal" ni errores. Con el servidor de desarrollo pasa siempre; acá se ve si el empaquetado rompe
// algo (Analítica: "t is not a function" en el bloque de recharts con rolldown 1.0).

const PUBLIC = ['/', '/ana', '/soporte', '/eliminar-cuenta', '/terminos', '/privacidad', '/login', '/register']
const SIGNED_IN = [
  '/studio', '/studio/identity', '/studio/modules', '/studio/appearance', '/studio/exchange', '/studio/analytics',
  '/studio/messages', '/studio/subscribers', '/studio/settings', '/studio/spaces', '/studio/everywhere', '/studio/more',
  '/life', '/life/brain', '/life/habits', '/life/goals', '/life/money', '/life/insights', '/life/replay', '/life/settings',
  '/super-admin', '/super-admin/denuncias', '/super-admin/producto',
]

for (const [paths, signedIn] of [[PUBLIC, false], [SIGNED_IN, true]] as const) {
  for (const path of paths) {
    test(`${path} abre en el build de producción`, async ({ page, context }) => {
      const state = rich()
      const today = new Date().toISOString().slice(0, 10)
      state.tables.profile_stats_daily.push({ profile_id: 'p-ana', day: today, event_type: 'view', module_id: null, events: 9, visitors: 7 })
      await installSupabaseMock(context, state, { signedIn })
      const errors: string[] = []
      page.on('pageerror', e => errors.push(e.message))
      await page.goto(path)
      await expect(page.locator('#root')).not.toBeEmpty()
      await page.waitForTimeout(800)
      await expect(page.getByText('Algo salió mal')).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }
}
