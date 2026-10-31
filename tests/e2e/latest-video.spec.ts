import { expect, test } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'
import { installYoutubeLatestMock } from './support/mockYoutubeLatest'

// "Último video" (módulo de bio): el video más nuevo de un canal aparece solo. Los datos vienen de la función de Mycen
// (/api/youtube-latest, mismo origen); nada de YouTube (ni miniaturas de ytimg) hasta que se toca "Reproducir".

const YOUTUBE = /youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|googlevideo\.com|ggpht\.com/i

test('Studio: se pega el @ del canal, se prueba, se guarda y se publica; el visitante no carga YouTube hasta tocar', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  const api = await installYoutubeLatestMock(context)
  const thirdParty: string[] = []
  await context.route(YOUTUBE, route => { thirdParty.push(route.request().url()); return route.fulfill({ status: 204, body: '' }) })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Último video/ }).click()
  const url = page.getByRole('textbox', { name: /Link del canal de YouTube/ })

  // Validación en el dispositivo
  await url.fill('https://youtu.be/dQw4w9WgXcQ')
  await expect(page.getByText(/Ese es el link de un video/)).toBeVisible()
  await url.fill('https://www.youtube.com/c/AnaPerez')
  await expect(page.getByText(/Ese formato de link es viejo/)).toBeVisible()

  await url.fill('https://www.youtube.com/@anaperez/videos')
  await expect(page.getByText('Canal @anaperez')).toBeVisible()
  await page.getByRole('button', { name: 'Probar' }).click()
  await expect(page.getByText('Último video: Cómo hago mis tazas')).toBeVisible()
  expect(api).toContain('?handle=%40anaperez')

  await page.getByRole('combobox', { name: 'Cuántos videos' }).selectOption('3')
  await page.getByRole('textbox', { name: 'Título de la sección' }).fill('Mi canal')
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()

  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body).toMatchObject({
    type: 'latest_video', title: 'Mi canal',
    content: { url: 'https://www.youtube.com/@anaperez/videos', handle: '@anaperez', show_title: true, count: 3 },
  })
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText(/Publicado · versión 2/)).toBeVisible()
  expect(thirdParty).toEqual([])

  // El visitante
  const visitor = await context.browser()!.newContext()
  await installSupabaseMock(visitor, state)
  await installYoutubeLatestMock(visitor)
  const seen: string[] = []
  await visitor.route(YOUTUBE, route => { seen.push(route.request().url()); return route.fulfill({ status: 204, body: '' }) })
  const v = await visitor.newPage()
  await v.goto('/ana')

  const region = v.getByRole('region', { name: 'Mi canal' })
  const play = region.getByRole('button', { name: /Cómo hago mis tazas.*Reproducir en YouTube/ })
  await expect(play).toBeVisible()
  await expect(region.locator('.mp-media-art svg').first()).toBeVisible()
  await expect(region.getByRole('button', { name: 'Visita al taller' })).toBeVisible()
  await expect(region.getByRole('button', { name: 'Esmaltes nuevos' })).toBeVisible()
  await v.waitForLoadState('networkidle')
  await expect(v.locator('iframe')).toHaveCount(0)
  await expect(v.locator('img[src*="ytimg"]')).toHaveCount(0)
  expect(seen).toEqual([])

  const axe = await (await settledAxe(v)).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('img').analyze()
  expect(axe.violations.map(x => `${x.id}: ${x.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])

  await play.click()
  const frame = region.locator('iframe[title="Cómo hago mis tazas (YouTube)"]')
  await expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/aaaaaaaaaa1?autoplay=1&rel=0')
  await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  await expect.poll(() => seen.some(u => u.startsWith('https://www.youtube-nocookie.com/embed/aaaaaaaaaa1'))).toBe(true)
  await expect(v.locator('iframe')).toHaveCount(1)

  // Tocar otro cambia el reproductor (uno por vez)
  await region.getByRole('button', { name: 'Visita al taller' }).click()
  await expect(region.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/bbbbbbbbbb2?autoplay=1&rel=0')
  await expect(v.locator('iframe')).toHaveCount(1)
  await visitor.close()
})

test('sin título del video y con un canal que no responde: en público no se muestra, en Studio se avisa', async ({ page, context }) => {
  // Abre la página pública y después el editor de escritorio de Studio
  test.slow()
  const state = createState({
    profiles: [profileRow({ theme: { layout: 'bento' } })],
    profile_modules: [
      moduleRow({ id: 'm-lv', type: 'latest_video', title: null, position: 10,
        content: { url: 'https://www.youtube.com/@anaperez', handle: '@anaperez', show_title: false, count: 1 } }),
      moduleRow({ id: 'm-lv2', type: 'latest_video', title: 'Otro canal', position: 20,
        content: { url: 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw', channel_id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', show_title: true, count: 1 } }),
    ],
  })
  await installSupabaseMock(context, state)
  // El primero responde; el segundo canal no existe (404)
  await context.route('**/api/youtube-latest?**', route => (route.request().url().includes('handle=')
    ? route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ channel_id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', videos: [{ id: 'aaaaaaaaaa1', title: 'Cómo hago mis tazas', published: '' }] }) })
    : route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not_found"}' })))
  await page.goto('/ana')

  const region = page.getByRole('region', { name: 'Último video' })
  // Sin título: el botón dice el nombre del módulo, no el del video
  await expect(region.getByRole('button', { name: /^Último video.*Reproducir en YouTube/ })).toBeVisible()
  await expect(page.getByText('Cómo hago mis tazas')).toHaveCount(0)
  // Bento: tamaño grande
  await expect(page.locator('.mp-s-featured .mp-latest')).toHaveCount(1)
  // El canal que no responde no deja nada (ni el esqueleto de carga)
  await expect(page.getByRole('region', { name: 'Otro canal' })).toHaveCount(0)

  // En la vista previa de Studio, el dueño ve por qué no aparece
  const owner = await context.browser()!.newContext()
  await installSupabaseMock(owner, state, { signedIn: true })
  await owner.route('**/api/youtube-latest?**', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not_found"}' }))
  const studio = await owner.newPage()
  await studio.setViewportSize({ width: 1400, height: 900 })
  await studio.goto('/studio/editor')
  await expect(studio.getByText(/Todavía no encontramos videos de este canal/).first()).toBeVisible()
  await owner.close()
})
