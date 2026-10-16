import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'
import { MODULE_FIXTURES } from './support/moduleFixtures'
import { rich } from './support/richState'

// Guía del proyecto (auditoría v2, #22): en el celular todo lo que se toca mide al menos 44 × 44 px. Se mide la caja de
// cada botón, link, campo y [role=button|link|checkbox|radio|tab|switch] visible en las pantallas principales a 390 px.
// Un área táctil agrandada con un ::before absoluto (el dibujo queda chico) también vale.
//
// Excepciones (documentadas, WCAG 2.5.8 las exime):
// - links dentro de un párrafo o una línea de texto (el texto alrededor es más largo que el link);
// - elementos de 1 px o menos (sólo para lectores de pantalla) y los deshabilitados;
// - grupos densos marcados `data-touch-dense` (con el motivo en el código): hoy sólo los 7 puntos de la semana de
//   Hábitos, de 32 × 36 px con el ::after de 44 (WCAG 2.5.8 los admite por espaciado; no entran siete de 44 en la fila).

const MIN = 44

async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((min) => {
    const sel = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="switch"], [role="menuitem"]'
    const out: string[] = []
    const name = (el: Element) => (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('placeholder') || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      if (!el.checkVisibility({ opacityProperty: false, visibilityProperty: true })) continue
      if (el.closest('[aria-hidden="true"], [inert], [data-touch-exempt], [data-touch-dense]')) continue
      if (el.matches(':disabled, [aria-disabled="true"]')) continue
      // Un control nativo tapado (casilla dentro de su <label>, select invisible encima del botón): se mide lo que se toca
      let target: HTMLElement = el
      if (el.matches('input[type="checkbox"], input[type="radio"], input[type="file"], select') && el.closest('label')) target = el.closest('label')!
      let r = target.getBoundingClientRect()
      if (r.width <= 1 || r.height <= 1) continue
      if (r.width >= min && r.height >= min) continue
      // Al centro de la pantalla, para que no lo tape la barra de abajo ni el botón +
      target.scrollIntoView({ block: 'center', inline: 'nearest' })
      r = target.getBoundingClientRect()
      // Área agrandada con ::before / ::after absolutos
      const pseudo = ['::before', '::after'].some(p => {
        const cs = getComputedStyle(target, p)
        return cs.content !== 'none' && cs.position === 'absolute' && parseFloat(cs.width) >= min && parseFloat(cs.height) >= min
      })
      // …y que de verdad se pueda tocar: los bordes de la zona de 44 px caen en el elemento (no los recorta un
      // overflow ni los tapa otra cosa)
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, h = min / 2 - 2
      const reach = (x: number, y: number) => {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return true
        const hit = document.elementFromPoint(x, y)
        return !!hit && (target.contains(hit) || hit === target)
      }
      if (pseudo && reach(cx - h, cy) && reach(cx + h, cy) && reach(cx, cy - h) && reach(cx, cy + h)) continue
      // Link en medio de un texto: lo exime WCAG
      if (el.tagName === 'A') {
        const block = el.closest('p, li, span, label, small, div')
        const txt = (block?.textContent ?? '').trim().length
        if (block && block !== el && txt > (el.textContent ?? '').trim().length + 3 && getComputedStyle(el).display === 'inline') continue
      }
      out.push(`${name(el)} (${Math.round(r.width)}×${Math.round(r.height)})`)
    }
    return [...new Set(out)]
  }, MIN)
}

async function check(page: Page, routes: string[]) {
  const found: string[] = []
  for (const r of routes) {
    await page.goto(r)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    for (const s of await smallTargets(page)) found.push(`${r}: ${s}`)
  }
  expect(found).toEqual([])
}

test.use({ viewport: { width: 390, height: 844 } })

test('Life OS: todo lo que se toca mide 44 px o más', async ({ page, context }) => {
  test.setTimeout(120_000)
  await installSupabaseMock(context, rich(), { signedIn: true })
  await check(page, ['/life', '/life/money', '/life/habits', '/life/goals', '/life/brain', '/life/brain?vista=tareas', '/life/journal',
    '/life/insights', '/life/replay', '/life/settings'])
})

test('Studio: todo lo que se toca mide 44 px o más', async ({ page, context }) => {
  test.setTimeout(120_000)
  await installSupabaseMock(context, rich(), { signedIn: true })
  await check(page, ['/studio', '/studio/identity', '/studio/modules', '/studio/appearance', '/studio/everywhere', '/studio/analytics',
    '/studio/messages', '/studio/subscribers', '/studio/settings', '/studio/spaces', '/studio/projects', '/studio/more'])
})

test('acceso, legales y perfil público: todo lo que se toca mide 44 px o más', async ({ page, context }) => {
  test.setTimeout(90_000)
  const state = createState({ profiles: [profileRow({ status_text: 'Disponible', available: true })], profile_modules: MODULE_FIXTURES.map(f => f.row) })
  await installSupabaseMock(context, state)
  await check(page, ['/login', '/register', '/forgot-password', '/terminos', '/privacidad', '/ana'])
})
