import { deflateSync } from 'node:zlib'
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
  await expect(page.locator('.mp-s-featured .mp-media-video').first()).toBeVisible()
  await expect(page.locator('.mp-s-wide .mp-media-music')).toBeVisible()

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

// Portada automática: un PNG chico armado acá (sin archivos de prueba)
function tinyPng(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const w = 32, h = 18
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0xc0)])))
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

test('Studio: al pegar un video, la portada se carga sola y se guarda en Mycen', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  const thirdParty: string[] = []
  await context.route(PROVIDERS, route => { thirdParty.push(route.request().url()); return route.fulfill({ status: 204, body: '' }) })
  // Después de la de terceros (la última que se registra manda): el link del video viaja en la consulta
  const asked: string[] = []
  await context.route('**/api/media-cover**', route => {
    asked.push(new URL(route.request().url()).searchParams.get('url') ?? '')
    return route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng() })
  })
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Video o música/ }).click()
  await page.getByRole('textbox', { name: /Link del video o la canción/ }).fill('https://youtu.be/dQw4w9WgXcQ')

  await expect(page.getByText('Pusimos la portada de YouTube. Podés cambiarla o sacarla.')).toBeVisible()
  expect(asked).toEqual(['https://youtu.be/dQw4w9WgXcQ'])
  await expect(page.locator('.st-media-preview .mp-media-cover')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => (state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body as { content?: { cover_url?: string } } | undefined)?.content?.cover_url)
    .toMatch(/^https:\/\/mock\.supabase\.co\/storage\/v1\/object\/public\/profile-media\/.+\.(webp|png|jpe?g)$/)
  // La portada vino del servidor de Mycen: el navegador no habló con YouTube
  expect(thirdParty).toEqual([])
})

test('la portada guardada se ve en el perfil sin pedirle nada al proveedor', async ({ page, context }) => {
  const cover = 'https://mock.supabase.co/storage/v1/object/public/profile-media/u/portada.webp'
  const state = createState({ profiles: [profileRow()], profile_modules: [moduleRow({ id: 'm-yt', type: 'media', title: 'Videoclip', content: { url: 'https://youtu.be/dQw4w9WgXcQ', cover_url: cover } })] })
  await installSupabaseMock(context, state)
  await context.route('**/profile-media/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng() }))
  const thirdParty: string[] = []
  await context.route(PROVIDERS, route => { thirdParty.push(route.request().url()); return route.fulfill({ status: 204, body: '' }) })
  await page.goto('/ana')
  await expect(page.locator('.mp-media-cover')).toHaveAttribute('src', cover)
  await expect(page.getByRole('button', { name: /Videoclip.*Reproducir en YouTube/ })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(thirdParty).toEqual([])
})

test('"Escuchá en": la portada sale sola del link de Spotify', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await context.route(PROVIDERS, route => route.fulfill({ status: 204, body: '' }))
  await context.route('**/api/media-cover**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng() }))
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Escuchá en/ }).click()
  await page.getByRole('textbox', { name: /Canción o disco/ }).fill('Amanecer')
  await page.getByRole('group', { name: 'Plataforma 1' }).getByRole('textbox', { name: 'Link' }).fill('https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC')
  await expect(page.getByText('Pusimos la portada de Spotify. Podés cambiarla o sacarla.')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => (state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body as { content?: { cover_url?: string } } | undefined)?.content?.cover_url)
    .toMatch(/^https:\/\/mock\.supabase\.co\/storage\/v1\/object\/public\/profile-media\//)
})
