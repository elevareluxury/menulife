import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, moduleRow, profileRow, type MockState } from './support/mockSupabase'

// Módulos de bio (V1.1): "Apoyame" (support) y "Escuchá en" (listen_on). Son links comunes y textos para copiar:
// Mycen no cobra ni procesa pagos y el perfil no carga nada de las plataformas.

const THIRD_PARTY = /spotify|apple\.com|youtube|deezer|tidal|soundcloud|amazon|mercadopago|mpago|paypal|ko-fi|buymeacoffee/i

const SUPPORT = moduleRow({
  id: 'm-support', type: 'support', title: null, position: 10,
  content: {
    message: 'Si te sirve lo que hago, invitame un café.',
    amounts: '$2.000 · $5.000',
    methods: [
      { kind: 'mercadopago', value: 'https://link.mercadopago.com.ar/anaperez' },
      { kind: 'alias', value: 'ana.perez.mp' },
      { kind: 'paypal', value: 'https://paypal.me/anaperez', label: 'PayPal (exterior)' },
      { kind: 'pix', value: 'ana@example.com' },
    ],
  },
})

const LISTEN = moduleRow({
  id: 'm-listen', type: 'listen_on', title: 'Amanecer', position: 20,
  content: {
    artist: 'Ana Pérez',
    links: [
      { platform: 'spotify', url: 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC' },
      { platform: 'apple_music', url: 'https://music.apple.com/ar/album/amanecer/123' },
      { platform: 'youtube_music', url: 'https://music.youtube.com/playlist?list=OLAK5uy_x' },
    ],
  },
})

const seeded = (theme: Record<string, unknown> = {}) =>
  createState({ profiles: [profileRow({ theme })], profile_modules: [structuredClone(SUPPORT), structuredClone(LISTEN)] })

async function noThirdParty(context: BrowserContext) {
  const hits: string[] = []
  await context.route(THIRD_PARTY, route => { hits.push(route.request().url()); return route.fulfill({ status: 204, body: '' }) })
  return hits
}

/** Espera a que terminen las animaciones de entrada (las infinitas no cuentan): axe mide el contraste final */
async function settled(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
    .map(a => a.finished.catch(() => undefined))))
}

async function axe(page: Page) {
  await settled(page)
  const results = await (await settledAxe(page))
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('img')
    .analyze()
  expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
}

async function visitorPage(context: BrowserContext, state: MockState) {
  const visitor = await context.browser()!.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  await installSupabaseMock(visitor, state)
  return { visitor, page: await visitor.newPage() }
}

test('Studio: crear "Apoyame", publicarlo y usarlo en la página pública', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Apoyame/ }).click()
  await page.getByRole('textbox', { name: /Mensaje/ }).fill('Gracias por bancar lo que hago.')

  const first = page.getByRole('group', { name: 'Medio 1' })
  await first.getByRole('combobox', { name: 'Tipo' }).selectOption('mercadopago')
  const link = first.getByRole('textbox', { name: 'Link' })
  await link.fill('https://paypal.me/anaperez')
  await expect(first.getByText('Ese link no es de Mercado Pago. Copialo desde tu cuenta de Mercado Pago.')).toBeVisible()
  await link.fill('link.mercadopago.com.ar/anaperez')

  await page.getByRole('button', { name: 'Agregar medio' }).click()
  const second = page.getByRole('group', { name: 'Medio 2' })
  await second.getByRole('combobox', { name: 'Tipo' }).selectOption('alias')
  await second.getByRole('textbox', { name: 'Alias, CVU o CBU' }).fill('ana.perez.mp')
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()

  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body).toMatchObject({
    type: 'support', title: null,
    content: {
      message: 'Gracias por bancar lo que hago.',
      methods: [
        { kind: 'mercadopago', value: 'https://link.mercadopago.com.ar/anaperez' },
        { kind: 'alias', value: 'ana.perez.mp' },
      ],
    },
  })
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText(/Publicado · versión 2/)).toBeVisible()

  const { visitor, page: pub } = await visitorPage(context, state)
  const hits = await noThirdParty(visitor)
  await pub.goto('/ana')
  const card = pub.getByRole('region', { name: 'Apoyame' })
  await expect(card).toBeVisible()
  const mp = card.getByRole('link', { name: 'Mercado Pago' })
  await expect(mp).toHaveAttribute('href', 'https://link.mercadopago.com.ar/anaperez')
  await expect(mp).toHaveAttribute('target', '_blank')
  await expect(mp).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(card.getByText('Mycen no cobra ni procesa pagos.', { exact: false })).toBeVisible()

  await card.getByRole('button', { name: 'Copiar Alias, CVU o CBU' }).click()
  await expect(card.getByRole('status')).toHaveText('Copiado')
  expect(await pub.evaluate(() => navigator.clipboard.readText())).toBe('ana.perez.mp')
  // El toque cuenta como clic en el módulo (sin datos del visitante)
  await expect.poll(() => state.rpcCalls.some(c => c.fn === 'track_profile_event' && c.args.p_module_id)).toBe(true)
  expect(hits).toEqual([])
  await axe(pub)
  await visitor.close()
})

test('Studio: crear "Escuchá en" con la plataforma detectada, publicarlo y ver los links', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Escuchá en/ }).click()
  await page.getByRole('textbox', { name: /Canción o disco/ }).fill('Amanecer')
  await page.getByRole('textbox', { name: /Artista/ }).fill('Ana Pérez')

  const first = page.getByRole('group', { name: 'Plataforma 1' }).getByRole('textbox', { name: 'Link' })
  await first.fill('https://bandcamp.com/album/x')
  await expect(page.getByText('Ese link no es de ninguna de las plataformas de la lista.')).toBeVisible()
  await first.fill('https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC')
  await expect(page.getByText('Detectamos Spotify')).toBeVisible()

  await page.getByRole('button', { name: 'Agregar plataforma' }).click()
  const second = page.getByRole('group', { name: 'Plataforma 2' }).getByRole('textbox', { name: 'Link' })
  await second.fill('https://open.spotify.com/album/otro')
  await expect(page.getByText('Ya hay un link de Spotify.')).toBeVisible()
  await second.fill('https://music.youtube.com/playlist?list=OLAK5uy_x')
  await expect(page.getByText('Detectamos YouTube Music')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()

  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body).toMatchObject({
    type: 'listen_on', title: 'Amanecer',
    content: {
      artist: 'Ana Pérez',
      links: [
        { platform: 'spotify', url: 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC' },
        { platform: 'youtube_music', url: 'https://music.youtube.com/playlist?list=OLAK5uy_x' },
      ],
    },
  })
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText(/Publicado · versión 2/)).toBeVisible()

  const { visitor, page: pub } = await visitorPage(context, state)
  const hits = await noThirdParty(visitor)
  await pub.goto('/ana')
  const card = pub.getByRole('region', { name: 'Amanecer' })
  await expect(card.getByText('Ana Pérez', { exact: true })).toBeVisible()
  await expect(card.getByRole('link', { name: 'Escuchá en Spotify' })).toHaveAttribute('href', 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC')
  const ytm = card.getByRole('link', { name: 'Escuchá en YouTube Music' })
  await expect(ytm).toHaveAttribute('href', 'https://music.youtube.com/playlist?list=OLAK5uy_x')
  await expect(ytm).toHaveAttribute('rel', 'noopener noreferrer')
  await pub.waitForLoadState('networkidle')
  expect(hits).toEqual([])
  await axe(pub)
  await visitor.close()
})

for (const mode of ['universo', 'amanecer'] as const) {
  for (const layout of ['credencial', 'portada', 'editorial', 'bento', 'clasica'] as const) {
    test(`se ven y pasan axe en ${layout} · ${mode}`, async ({ page, context }) => {
      const state = seeded({ layout, mode, accent: 'plasma' })
      await installSupabaseMock(context, state)
      await page.goto('/ana')
      await expect(page.getByRole('region', { name: 'Apoyame' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Escuchá en Apple Music' })).toBeVisible()
      // Sin scroll de costado
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      if (layout === 'bento') {
        await expect(page.locator('.mp-s-wide .mp-support')).toBeVisible()
        await expect(page.locator('.mp-s-wide .mp-listen')).toBeVisible()
      }
      await axe(page)
    })
  }
}

test('la página pública descarta links de otros dominios guardados a mano', async ({ page, context }) => {
  const bad = structuredClone(SUPPORT)
  ;(bad.content as { methods: unknown[] }).methods = [
    { kind: 'paypal', value: 'https://evil.example.com/paypal' },
    { kind: 'link', value: 'javascript:alert(1)' },
    { kind: 'kofi', value: 'https://ko-fi.com/ana' },
  ]
  const listen = structuredClone(LISTEN)
  ;(listen.content as { links: unknown[] }).links = [
    { platform: 'spotify', url: 'https://evil.example.com/album/1' },
    { platform: 'deezer', url: 'https://www.deezer.com/album/302127' },
  ]
  const state = createState({ profiles: [profileRow()], profile_modules: [bad, listen] })
  await installSupabaseMock(context, state)
  await page.goto('/ana')
  const support = page.getByRole('region', { name: 'Apoyame' })
  await expect(support.getByRole('link')).toHaveCount(1)
  await expect(support.getByRole('link', { name: 'Ko-fi' })).toHaveAttribute('href', 'https://ko-fi.com/ana')
  const music = page.getByRole('region', { name: 'Amanecer' })
  await expect(music.getByRole('link')).toHaveCount(1)
  await expect(music.getByRole('link', { name: 'Escuchá en Deezer' })).toBeVisible()
})

for (const row of [SUPPORT, LISTEN]) {
  test(`abrir y guardar ${row.type} no cambia su contenido`, async ({ page, context }) => {
    const state = seeded()
    await installSupabaseMock(context, state, { signedIn: true })
    await page.goto('/studio/modules')
    await page.getByRole('button', { name: `Editar ${row.type === 'support' ? 'Apoyame' : 'Amanecer'}`, exact: true }).click()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect.poll(() => state.writes.find(w => w.method === 'PATCH' && w.table === 'profile_modules')?.body).toBeTruthy()
    const body = state.writes.find(w => w.method === 'PATCH' && w.table === 'profile_modules')!.body as Record<string, unknown>
    expect(body.title).toEqual(row.title)
    expect(body.content).toEqual(row.content)
  })
}
