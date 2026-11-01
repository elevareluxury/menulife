import { expect, test, type BrowserContext } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Entrega 2: Encuesta, Descargables, Cupón, Galería de videos y Podcast. Nada de terceros antes de tocar; la encuesta
// guarda el voto por la RPC y muestra los resultados; el cupón vencido no se muestra.

const POLL = { options: [{ id: 'rock1', label: 'Rock' }, { id: 'jazz2', label: 'Jazz' }, { id: 'pop3', label: 'Pop' }] }
const FEED = 'https://anchor.fm/s/abc/podcast/rss'
const EPISODES = {
  title: 'Charlas de taller', image: null,
  episodes: [
    { title: 'Ep. 2 · Esmaltes', date: '2026-10-20T10:00:00.000Z', audio: 'https://cdn.example.com/ep2.mp3', duration: '32:10', link: null },
    { title: 'Ep. 1 · Arranque', date: '2026-10-01T10:00:00.000Z', audio: 'https://cdn.example.com/ep1.mp3', duration: '28:05', link: null },
  ],
}

function rows() {
  return [
    moduleRow({ id: 'm-poll', type: 'poll', title: '¿Qué disco sigue?', position: 10, content: POLL }),
    moduleRow({ id: 'm-files', type: 'downloads', title: 'Para bajar', position: 20,
      content: { items: [{ title: 'Press kit 2026', url: 'https://x.supabase.co/storage/v1/object/public/profile-files/o/kit.pdf', size: 2_400_000 }] } }),
    moduleRow({ id: 'm-coupon', type: 'coupon', title: '10% en la tienda', position: 30, content: { code: 'OLIVIA10', text: 'En toda la tienda', expires: '2099-12-31', url: 'https://shop.ana.com' } }),
    moduleRow({ id: 'm-old', type: 'coupon', title: 'Vencido', position: 31, content: { code: 'VIEJO', expires: '2020-01-01' } }),
    moduleRow({ id: 'm-vg', type: 'video_gallery', title: 'Mis videos', position: 40,
      content: { items: [{ url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Videoclip' }, { url: 'https://vimeo.com/76979871', title: 'Detrás de escena' }] } }),
    moduleRow({ id: 'm-pod', type: 'podcast', title: null, position: 50, content: { feed: FEED, count: 3 } }),
  ]
}

async function mockPodcast(context: BrowserContext) {
  const calls: string[] = []
  await context.route('**/api/podcast-latest?**', route => {
    calls.push(new URL(route.request().url()).searchParams.get('feed') ?? '')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EPISODES) })
  })
  return calls
}

test('página pública: los cinco módulos nuevos, sin terceros hasta tocar', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()], profile_modules: rows() })
  await installSupabaseMock(context, state)
  const feeds = await mockPodcast(context)
  const third: string[] = []
  page.on('request', r => { if (/youtube|vimeo|cdn\.example\.com\/ep/.test(r.url())) third.push(r.url()) })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/ana')

  // Encuesta: votar muestra los resultados y queda marcado "Tu voto"
  const poll = page.getByRole('region', { name: '¿Qué disco sigue?' })
  await poll.getByRole('button', { name: 'Jazz' }).click()
  await expect(poll.getByRole('button', { name: /Jazz/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(poll.getByText('1 voto')).toBeVisible()
  await expect(poll.getByText('100%')).toBeVisible()
  expect(state.rpcCalls.find(c => c.fn === 'vote_profile_poll')?.args).toMatchObject({ p_handle: 'ana', p_module_id: 'm-poll', p_option: 'jazz2' })
  // Cambiar de opinión: sigue siendo un voto
  await poll.getByRole('button', { name: /Rock/ }).click()
  await expect(poll.getByRole('button', { name: /Rock/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(poll.getByText('1 voto')).toBeVisible()

  // Descargables
  const file = page.getByRole('link', { name: /Press kit 2026/ })
  await expect(file).toHaveAttribute('href', /profile-files\/o\/kit\.pdf$/)
  await expect(file).toContainText('PDF · 2,3 MB')

  // Cupón: se copia; el vencido no aparece
  await page.getByRole('button', { name: 'Copiar código' }).click()
  await expect(page.getByRole('button', { name: 'Código copiado' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('OLIVIA10')
  await expect(page.getByText('VIEJO')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Usar el cupón' })).toHaveAttribute('href', 'https://shop.ana.com')

  // Galería de videos y podcast: fachadas; nada de terceros todavía
  await expect(page.getByRole('button', { name: /Videoclip.*Reproducir en YouTube/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escuchar: Ep. 2 · Esmaltes' })).toBeVisible()
  expect(feeds).toEqual([FEED])
  expect(third).toEqual([])

  await page.getByRole('button', { name: /Videoclip.*Reproducir en YouTube/ }).click()
  await expect(page.locator('.mp-vgal iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Escuchar: Ep. 2 · Esmaltes' }).click()
  await expect(page.locator('audio.mp-podcast-audio')).toHaveAttribute('src', 'https://cdn.example.com/ep2.mp3')

  // Al volver, quien votó ve los resultados sin votar otra vez
  await page.reload()
  await expect(page.getByRole('region', { name: '¿Qué disco sigue?' }).getByText('1 voto')).toBeVisible()
})

test('axe y celular angosto: los módulos nuevos en los dos temas, sin scroll de costado', async ({ page, context }) => {
  for (const mode of ['universo', 'amanecer'] as const) {
    await installSupabaseMock(context, createState({ profiles: [profileRow({ theme: { layout: 'clasica', mode } })], profile_modules: rows() }))
    await mockPodcast(context)
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/ana')
    await expect(page.getByRole('button', { name: 'Escuchar: Ep. 2 · Esmaltes' })).toBeVisible()
    const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${mode} · ${v.id}`)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await context.unrouteAll({ behavior: 'ignoreErrors' })
  }
})

test('Studio: crear una encuesta y un cupón, y publicarlos', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /^Encuesta\b/ }).first().click()
  let sheet = page.getByRole('dialog').last()
  await sheet.getByRole('textbox', { name: /^Pregunta/ }).fill('¿Qué disco sigue?')
  await sheet.getByRole('textbox', { name: 'Opción 1' }).fill('Rock')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect(sheet.getByText('Poné al menos 2 opciones.')).toBeVisible()
  await sheet.getByRole('textbox', { name: 'Opción 2' }).fill('Jazz')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body)
    .toMatchObject({ type: 'poll', title: '¿Qué disco sigue?', content: { options: [{ label: 'Rock' }, { label: 'Jazz' }] } })

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /^Cupón\b/ }).first().click()
  sheet = page.getByRole('dialog').last()
  await sheet.getByRole('textbox', { name: /^Código/ }).fill('con espacios')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect(sheet.getByText(/El código va de 2 a 40/)).toBeVisible()
  await sheet.getByRole('textbox', { name: /^Código/ }).fill('OLIVIA10')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => state.writes.filter(w => w.method === 'POST' && w.table === 'profile_modules').length).toBe(2)

  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText(/Publicado · versión 2/)).toBeVisible()
})
