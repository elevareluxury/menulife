import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, OWNER_ID, profileRow, publishProjectRow } from './support/mockSupabase'
import { API_MODULE_FIXTURES, MODULE_FIXTURES, PROJECT_FIXTURE } from './support/moduleFixtures'
import { installYoutubeLatestMock } from './support/mockYoutubeLatest'
import { rich } from './support/richState'
import { layoutProblems } from './support/layoutAudit'

// Auditoría de diseño en el celular (320 px, el más chico que se usa): en cada pantalla, en cada editor de módulo y
// en el perfil público con todos los módulos, nada se sale de la pantalla ni de su recuadro, los botones y campos no
// se pisan y ningún texto de botón queda cortado. En español y en ruso (palabras largas). Detector en
// support/layoutAudit.ts.

const ROUTES = ['/studio', '/studio/identity', '/studio/modules', '/studio/projects', '/studio/projects/pr-luna', '/studio/appearance',
  '/studio/exchange', '/studio/analytics', '/studio/settings', '/studio/preview', '/studio/editor', '/studio/spaces', '/studio/messages',
  '/studio/subscribers', '/studio/everywhere', '/studio/more',
  '/life', '/life/money', '/life/goals', '/life/habits', '/life/brain', '/life/brain?vista=tareas', '/life/brain?vista=archivo',
  '/life/replay', '/life/insights', '/life/settings', '/life/journal',
  '/ana', '/ana/projects/cafe-luna', '/login', '/register', '/forgot-password', '/auth/terms', '/terminos',
  '/super-admin', '/super-admin/estado', '/super-admin/personas?q=ana', '/super-admin/denuncias', '/super-admin/errores', '/super-admin/verificaciones', '/super-admin/landing']

for (const [lang, scheme] of [['es', 'dark'], ['ru', 'light']] as const) {
  test(`320 px (${lang}): ninguna pantalla se sale, se corta ni se pisa`, async ({ page, context }) => {
    test.setTimeout(240_000)
    await page.emulateMedia({ colorScheme: scheme })
    await page.setViewportSize({ width: 320, height: 760 })
    const state = rich()
    state.tables.user_settings = [{ user_id: OWNER_ID, language: lang, currency: 'ARS', extra_currencies: ['USD'], week_start: 1 }]
    await installSupabaseMock(context, state, { signedIn: true })
    const found: string[] = []
    for (const r of ROUTES) {
      await page.goto(r)
      await page.waitForTimeout(700)
      for (const p of await layoutProblems(page)) found.push(`[${r}] ${p}`)
    }
    expect(found).toEqual([])
  })
}

const BIO = [
  moduleRow({ id: 'm-support', type: 'support', title: 'Apoyame', position: 200, content: { message: 'Si te sirve lo que hago, invitame un café.',
    methods: [{ kind: 'mercadopago', value: 'https://link.mercadopago.com.ar/anaperez' }, { kind: 'alias', value: 'ana.perez.mp.alias.largo' }] } }),
  moduleRow({ id: 'm-listen', type: 'listen_on', title: 'Amanecer en la ciudad (versión extendida)', position: 210, content: { artist: 'Ana Pérez y la Orquesta del Barrio',
    links: [{ platform: 'spotify', url: 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC' }, { platform: 'apple_music', url: 'https://music.apple.com/ar/album/amanecer/123' }] } }),
  moduleRow({ id: 'm-form', type: 'contact_form', title: 'Formulario', position: 220, content: {} }),
  moduleRow({ id: 'm-collab', type: 'collab', title: 'Colaboraciones', position: 230, content: { intro: 'Hago reels para marcas de café.', rates: 'Tarifas desde USD 300' } }),
  moduleRow({ id: 'm-sub', type: 'subscribe', title: 'Novedades', position: 240, content: { ask_name: true } }),
]
const ALL = [...MODULE_FIXTURES, ...API_MODULE_FIXTURES].map(f => ({ label: f.label, row: f.row })).concat(BIO.map(r => ({ label: r.title as string, row: r })))
function identityState() {
  const s = createState({ profiles: [profileRow({ status_text: 'Grabando el disco nuevo en el estudio', available: true,
    primary_action: { kind: 'whatsapp', label: 'Escribime por WhatsApp ahora mismo', url: 'https://wa.me/5493415550000' },
    contact_card: { enabled: true, email: 'hola@ana.com' } })], profile_modules: ALL.map(a => structuredClone(a.row)) })
  const pr = structuredClone(PROJECT_FIXTURE); s.tables.content_objects.push(pr); publishProjectRow(s, pr)
  return s
}

test('320 px: el perfil público con todos los módulos entra en las 5 estructuras y los 2 temas', async ({ page, context }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 320, height: 800 })
  const found: string[] = []
  for (const mode of ['universo', 'amanecer']) for (const layout of ['credencial', 'portada', 'editorial', 'bento', 'clasica']) {
    const s = identityState(); s.tables.profiles[0].theme = { layout, mode, accent: 'plasma' }
    await context.unrouteAll({ behavior: 'ignoreErrors' })
    await installYoutubeLatestMock(context)
    await installSupabaseMock(context, s)
    await page.goto('/ana')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForTimeout(800)
    for (const p of await layoutProblems(page)) found.push(`[${layout} ${mode}] ${p}`)
  }
  expect(found).toEqual([])
})

test.describe('320 px: cada editor de módulo entra en la hoja', () => {
  test.describe.configure({ mode: 'parallel' })
  for (const { label } of ALL) {
    test(label, async ({ page, context }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.setViewportSize({ width: 320, height: 700 })
      await installYoutubeLatestMock(context)
      await installSupabaseMock(context, identityState(), { signedIn: true })
      await page.goto('/studio/modules')
      await page.getByRole('button', { name: `Editar ${label}`, exact: true }).first().click()
      const sheet = page.getByRole('dialog').last()
      await expect(sheet).toBeVisible()
      // "Programar" abierto, para ver también esos campos
      await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
      await page.waitForTimeout(400)
      expect(await layoutProblems(page, sheet)).toEqual([])
    })
  }
})
