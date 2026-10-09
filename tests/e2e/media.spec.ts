import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// V1 · etapa 04: video y música integrados con fachada. Abrir un perfil no le pide nada a YouTube, Spotify, etc.;
// el reproductor se carga recién al tocar "Reproducir".

const PROVIDERS = /youtube|youtu\.be|ytimg|vimeo|spotify|scdn|soundcloud|sndcdn|tiktok/i

const MEDIA = [
  moduleRow({ id: 'm-yt', type: 'media', title: 'Videoclip', position: 10, content: { url: 'https://youtu.be/dQw4w9WgXcQ' } }),
  moduleRow({ id: 'm-sp', type: 'media', title: 'Mi disco', position: 20, content: { url: 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC' } }),
  moduleRow({ id: 'm-tt', type: 'media', title: null, position: 30, content: { url: 'https://www.tiktok.com/@ana/video/7234567890123456789' } }),
]

test('el perfil con 3 videos y canciones no carga nada de terceros hasta que se toca Reproducir', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ theme: { layout: 'bento' } })], profile_modules: MEDIA.map(m => structuredClone(m)) })
  await installSupabaseMock(context, state)
  const thirdParty: string[] = []
  // Nada sale a la red real: se registra y se responde vacío
  await context.route(PROVIDERS, route => { thirdParty.push(route.request().url()); return route.fulfill({ status: 204, body: '' }) })

  await page.goto('/ana')
  const play = page.getByRole('button', { name: /Videoclip.*Reproducir en YouTube/ })
  await expect(play).toBeVisible()
  await expect(page.getByRole('button', { name: /Mi disco.*Reproducir en Spotify/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /TikTok.*Reproducir en TikTok/ })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(thirdParty).toEqual([])

  // Bento: video grande (L), música mediana (M)
  await expect(page.locator('.mp-b-L .mp-media-video').first()).toBeVisible()
  await expect(page.locator('.mp-b-M .mp-media-music')).toBeVisible()

  await play.click()
  const frame = page.locator('iframe[title="Videoclip (YouTube)"]')
  await expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0')
  await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  await expect.poll(() => thirdParty.some(u => u.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'))).toBe(true)
  // Los otros siguen sin cargar
  await expect(page.locator('iframe')).toHaveCount(1)
  // Se registra como toque en el módulo
  await expect.poll(() => state.rpcCalls.some(c => c.fn === 'track_profile_event' && c.args.p_module_id === 'm-yt')).toBe(true)
})

test('Studio: se pega el link, se detecta el proveedor, se ve la fachada y se guarda', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  const thirdParty: string[] = []
  await context.route(PROVIDERS, route => { thirdParty.push(route.request().url()); return route.fulfill({ status: 204, body: '' }) })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Video o música/ }).click()
  const url = page.getByRole('textbox', { name: /Link del video o la canción/ })

  await url.fill('https://www.dailymotion.com/video/x8abc')
  await expect(page.getByText(/sólo se pueden integrar YouTube, Vimeo, TikTok, Spotify y SoundCloud/)).toBeVisible()
  await url.fill('https://on.soundcloud.com/AbCd')
  await expect(page.getByText(/Ese es un link corto/)).toBeVisible()

  await url.fill('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x')
  await expect(page.getByText('Detectamos Spotify · Música')).toBeVisible()
  await expect(page.locator('.st-media-preview .mp-media-facade')).toBeVisible()
  await page.getByRole('textbox', { name: 'Título de la sección' }).fill('Mi tema nuevo')
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()

  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body).toMatchObject({
    type: 'media', title: 'Mi tema nuevo',
    content: { url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x', provider: 'spotify', kind: 'music' },
  })
  // La vista previa tampoco cargó el reproductor
  expect(thirdParty).toEqual([])
})
