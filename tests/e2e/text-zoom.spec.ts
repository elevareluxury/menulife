import { expect, test } from '@playwright/test'
import { OWNER_ID, installSupabaseMock } from './support/mockSupabase'
import { rich } from './support/richState'
import { layoutProblems } from './support/layoutAudit'
import { TEXT_ZOOM_MAX } from '../../src/lib/textZoom'
const ROUTES = ['/studio', '/studio/identity', '/studio/modules', '/studio/projects', '/studio/appearance', '/studio/exchange', '/studio/analytics',
  '/studio/settings', '/studio/spaces', '/studio/messages', '/studio/subscribers', '/studio/everywhere', '/studio/more',
  '/life', '/life/money', '/life/goals', '/life/habits', '/life/brain', '/life/brain?vista=tareas', '/life/replay', '/life/insights',
  '/life/settings', '/life/journal', '/ana', '/ana/projects/cafe-luna', '/login', '/register']
// Letra grande del celular (app de iOS/Android, NativeBridge + lib/textZoom): la app agranda el texto hasta
// TEXT_ZOOM_MAX. Acá se simula agrandando cada texto en esa proporción (como -webkit-text-size-adjust / textZoom) a
// 390 px: nada se sale de la pantalla ni de su recuadro, ningún botón queda cortado y nada se pisa.
const SCALE = TEXT_ZOOM_MAX
test('letra grande del celular (135 %): ninguna pantalla se sale, se corta ni se pisa', async ({ page, context }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const state = rich()
  state.tables.user_settings = [{ user_id: OWNER_ID, language: 'es', currency: 'ARS', extra_currencies: ['USD'], week_start: 1 }]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const found: string[] = []
  for (const r of ROUTES) {
    await page.goto(r)
    await page.waitForTimeout(900)
    await page.evaluate((k) => {
      const els = [...document.querySelectorAll<HTMLElement>('body *')]
      const sizes = els.map(e => parseFloat(getComputedStyle(e).fontSize))
      els.forEach((e, i) => e.style.setProperty('font-size', `${sizes[i] * k}px`, 'important'))
    }, SCALE)
    await page.waitForTimeout(200)
    for (const p of await layoutProblems(page)) found.push(`[${r}] ${p}`)
  }
  expect(found).toEqual([])
})
