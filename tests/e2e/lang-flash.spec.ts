import { expect, test, type BrowserContext } from '@playwright/test'
import { installSupabaseMock, OWNER_ID } from './support/mockSupabase'
import { rich } from './support/richState'
import { SPANISH, userStrings } from './support/spanish'

// Auditoría v2, #3: con la app en otro idioma no se ve español ni un instante mientras baja el diccionario.
// Se registra el texto visible desde el primer cuadro (MutationObserver + cada cuadro) y los diccionarios se demoran
// a propósito (red lenta), así el esqueleto de carga tiene que cubrir la espera.

declare global { interface Window { __seen?: string[] } }

async function watchText(context: BrowserContext) {
  await context.addInitScript(() => {
    try { localStorage.setItem('mycen_lang', 'en') } catch { /* bloqueado */ }
    const seen = new Set<string>()
    window.__seen = []
    const sample = () => {
      const body = document.body
      if (!body) return
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement
        const text = (n.textContent ?? '').trim()
        if (!el || !text || el.closest('script, style, select, [aria-hidden="true"]')) continue
        // Lo marcado en otro idioma (selector de idiomas, contenido de la persona) no cuenta
        const holder = el.closest('[lang]')
        if (holder && holder !== document.documentElement && holder.getAttribute('lang')?.slice(0, 2) !== 'en') continue
        if (!el.checkVisibility() || seen.has(text)) continue
        seen.add(text)
        window.__seen!.push(text)
      }
      for (const el of Array.from(body.querySelectorAll('[aria-label], [placeholder]'))) {
        for (const a of ['aria-label', 'placeholder']) {
          const v = el.getAttribute(a)
          if (v && !seen.has(v)) { seen.add(v); window.__seen!.push(v) }
        }
      }
    }
    let queued = false
    const observer = new MutationObserver(() => {
      if (queued) return
      queued = true
      // Antes de pintar: lo que se agrega en este cuadro es lo que la persona vería
      queueMicrotask(() => { queued = false; sample() })
    })
    const start = () => observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'placeholder', 'style', 'class', 'hidden'] })
    if (document.documentElement) start()
    else document.addEventListener('readystatechange', start, { once: true })
    const tick = () => { sample(); requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  // Red lenta para los diccionarios (inglés de Life OS, Studio, acceso…): sin esqueleto, se vería el español
  await context.route(/\/src\/i18n\/app\/[a-z]+\/en\.ts/, async route => {
    await new Promise(r => setTimeout(r, 1200))
    await route.continue()
  })
}

for (const [route, ready] of [
  ['/life', /My day/i],
  ['/studio', /Edit identity|Open profile/i],
  ['/login', /Log in/i],
] as const) {
  test(`${route} en inglés: nunca aparece español mientras carga`, async ({ page, context }) => {
    const state = rich()
    state.tables.user_settings = [{ user_id: OWNER_ID, language: 'en', currency: 'ARS', extra_currencies: [], week_start: 1 }]
    await watchText(context)
    await installSupabaseMock(context, state, { signedIn: route !== '/login', userMetadata: { locale: 'en' } })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(route)
    await expect(page.getByText(ready).first()).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(500)
    const strings = userStrings(state)
    const seen = await page.evaluate(() => window.__seen ?? [])
    expect(seen.length).toBeGreaterThan(3)
    const spanish = seen
      .map(t => strings.reduce((acc, s) => acc.split(s).join(' '), t))
      .map(t => t.replace(/\b[A-Z][a-z]+\/[A-Za-z_/ ]+/g, ' '))
      .filter(t => SPANISH.test(t))
    expect(spanish).toEqual([])
  })
}
