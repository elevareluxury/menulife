import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, OWNER_ID, profileRow, publishProjectRow, type MockState } from './support/mockSupabase'
import { API_MODULE_FIXTURES, MODULE_FIXTURES, PROJECT_FIXTURE } from './support/moduleFixtures'
import { installYoutubeLatestMock } from './support/mockYoutubeLatest'
import { rich } from './support/richState'
import { SPANISH, userStrings } from './support/spanish'
import studioEn from '../../src/i18n/app/studio/en'
import lifeEn from '../../src/i18n/app/life/en'

// Auditoría de pantallas (v2): con la app en inglés no puede quedar español a la vista (ni en aria-label, placeholder,
// title o alt). Se recorren las pantallas principales de Studio, Life OS, el perfil público con todos los módulos
// (también los de bio) y algunas hojas. Lo que escribió la persona (los datos de prueba están en español) no cuenta.
// Los diccionarios se bajan aparte: se espera hasta 10 s a que llegue el inglés antes de dar algo por faltante.

const BIO = [
  moduleRow({ id: 'm-support', type: 'support', title: null, position: 200, content: { message: 'Invitame un café.', amounts: '$2.000', methods: [
    { kind: 'mercadopago', value: 'https://link.mercadopago.com.ar/anaperez' }, { kind: 'alias', value: 'ana.perez.mp' }, { kind: 'pix', value: 'ana@example.com' }] } }),
  moduleRow({ id: 'm-listen', type: 'listen_on', title: 'Amanecer', position: 210, content: { artist: 'Ana Pérez', links: [
    { platform: 'spotify', url: 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC' }, { platform: 'apple_music', url: 'https://music.apple.com/ar/album/amanecer/123' }] } }),
  moduleRow({ id: 'm-sub', type: 'subscribe', title: 'Novedades', position: 220, content: { ask_name: true } }),
  moduleRow({ id: 'm-collab', type: 'collab', title: 'Colaboraciones', position: 230, content: {} }),
  moduleRow({ id: 'm-form', type: 'contact_form', title: 'Escribime', position: 240, content: {} }),
  // Pendiente de una plantilla: oculto, sólo se ve en Studio ("Completá esto")
  moduleRow({ id: 'm-pend', type: 'link', title: null, position: 250, content: {}, visibility: 'hidden', config: { template: 'musician' } }),
]


/** Textos visibles y atributos accesibles que parecen español, sin lo que cargó la persona. */
async function spanishOnScreen(page: Page, scope: string, strings: string[]): Promise<string[]> {
  return page.evaluate(({ scope, strings, source }) => {
    const re = new RegExp(source, 'iu')
    const root = document.querySelector(scope) ?? document.body
    // Lo que va marcado en otro idioma (selector de idiomas, contenido del perfil) no cuenta
    const foreign = (el: Element | null) => {
      if (!el || el.closest('select, script, style, [aria-hidden="true"]')) return true
      const holder = el.closest('[lang]')
      return !!holder && holder !== document.documentElement && holder.getAttribute('lang')?.slice(0, 2) !== 'en'
    }
    const pieces: string[] = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || foreign(el) || !el.checkVisibility()) continue
      pieces.push(n.textContent ?? '')
    }
    for (const el of Array.from(root.querySelectorAll('[aria-label], [placeholder], [title], img[alt]'))) {
      if (foreign(el)) continue
      for (const a of ['aria-label', 'placeholder', 'title', 'alt']) { const v = el.getAttribute(a); if (v) pieces.push(v) }
    }
    const hits = new Set<string>()
    for (let p of pieces) {
      for (const s of strings) p = p.split(s).join(' ')
      p = p.replace(/\b[A-Z][a-z]+\/[A-Za-z_/ ]+/g, ' ')   // zonas horarias (America/La_Paz)
      if (re.test(p)) hits.add(p.trim().slice(0, 100))
    }
    return [...hits]
  }, { scope, strings, source: SPANISH.source })
}

async function expectEnglish(page: Page, where: string, strings: string[], scope = 'body') {
  // <html lang> también: con "es" un lector de pantalla lee el inglés con voz en español
  await expect(page.locator('html'), where).toHaveAttribute('lang', 'en')
  await expect.poll(async () => (await spanishOnScreen(page, scope, strings)).map(s => `${where}: ${s}`), { timeout: 10_000 }).toEqual([])
}

async function signedInEnglish(context: import('@playwright/test').BrowserContext, state: MockState) {
  state.tables.user_settings = [{ user_id: OWNER_ID, language: 'en', currency: 'ARS', extra_currencies: ['USD'], week_start: 1 }]
  await context.addInitScript(() => { try { localStorage.setItem('mycen_lang', 'en') } catch { /* bloqueado */ } })
  await installSupabaseMock(context, state, { signedIn: true, userMetadata: { locale: 'en' } })
  await installYoutubeLatestMock(context)
}

test('Studio en inglés: sin textos en español', async ({ page, context }) => {
  test.setTimeout(120_000)
  const state = rich()
  state.tables.profile_modules.push(...BIO)
  await signedInEnglish(context, state)
  const strings = userStrings(state)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const r of ['/studio', '/studio/identity', '/studio/modules', '/studio/appearance', '/studio/exchange', '/studio/everywhere',
    '/studio/analytics', '/studio/messages', '/studio/subscribers', '/studio/settings', '/studio/spaces', '/studio/projects', '/studio/editor']) {
    await page.goto(r)
    await expectEnglish(page, r, strings)
  }
  // Hojas: plantillas y biblioteca de módulos
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: studioEn.templates.use }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectEnglish(page, 'plantillas', strings, '[role="dialog"]')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: studioEn.modules.add, exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectEnglish(page, 'agregar módulo', strings, '[role="dialog"]')
})

test('Life OS en inglés: sin textos en español', async ({ page, context }) => {
  test.setTimeout(120_000)
  const state = rich()
  await signedInEnglish(context, state)
  const strings = userStrings(state)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const r of ['/life', '/life/money', '/life/habits', '/life/goals', '/life/brain', '/life/brain?vista=tareas', '/life/journal',
    '/life/insights', '/life/replay', '/life/settings']) {
    await page.goto(r)
    await expectEnglish(page, r, strings)
  }
  await page.goto('/life/money')
  await page.getByRole('button', { name: lifeEn.budgets.newTitle }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectEnglish(page, 'nuevo presupuesto', strings, '[role="dialog"]')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: lifeEn.capture.open }).click()
  await expectEnglish(page, 'capturar', strings)
})

test('perfil público y acceso en inglés: sin textos del sistema en español', async ({ page, context }) => {
  test.setTimeout(90_000)
  const project = structuredClone(PROJECT_FIXTURE)
  const state = createState({ profiles: [profileRow({ status_text: 'Disponible', available: true })], content_objects: [project],
    profile_modules: [...MODULE_FIXTURES.map(f => f.row), ...API_MODULE_FIXTURES.map(f => f.row), ...BIO] })
  publishProjectRow(state, project)
  await context.addInitScript(() => { try { localStorage.setItem('mycen_lang', 'en') } catch { /* bloqueado */ } })
  await installSupabaseMock(context, state)
  await installYoutubeLatestMock(context)
  const strings = userStrings(state)
  await page.setViewportSize({ width: 390, height: 844 })
  // El contenido del perfil está en su idioma (es); los botones del sistema, en el del visitante
  for (const r of ['/ana', '/ana/projects/cafe-luna', '/login', '/register', '/forgot-password']) {
    await page.goto(r)
    await expectEnglish(page, r, strings)
  }
})

test('panel interno (super-admin) en inglés: sin textos en español', async ({ page, context }) => {
  test.setTimeout(90_000)
  const state = rich()
  await signedInEnglish(context, state)
  const strings = userStrings(state)
  // Las pantallas de Mycen Business (negocios, planes…) siguen en español mientras Business no esté abierto: no se
  // recorren, pero sus nombres en el menú sí están traducidos
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp)
    for (const r of ['/super-admin', '/super-admin/estado', '/super-admin/personas?q=ana', '/super-admin/actividad', '/super-admin/denuncias', '/super-admin/verificaciones', '/super-admin/errores', '/super-admin/producto']) {
      await page.goto(r)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectEnglish(page, `${r} (${vp.width})`, strings)
      // La marca vieja no aparece
      await expect(page.getByText(/MenuLife/)).toHaveCount(0)
    }
  }
})
