import type { BrowserContext } from '@playwright/test'

// El servidor de Vite no corre las funciones de api/: los E2E responden /api/youtube-latest ("Último video") acá.

export const LATEST_CHANNEL = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
export const LATEST_VIDEOS = [
  { id: 'aaaaaaaaaa1', title: 'Cómo hago mis tazas', published: '2026-10-12T09:30:00.000Z' },
  { id: 'bbbbbbbbbb2', title: 'Visita al taller', published: '2026-10-05T09:30:00.000Z' },
  { id: 'cccccccccc3', title: 'Esmaltes nuevos', published: '2026-09-28T09:30:00.000Z' },
]

/** `videos: null` = el canal no existe (404). Devuelve las consultas que llegaron. */
export async function installYoutubeLatestMock(context: BrowserContext, videos: typeof LATEST_VIDEOS | null = LATEST_VIDEOS) {
  const calls: string[] = []
  await context.route('**/api/youtube-latest?**', route => {
    calls.push(new URL(route.request().url()).search)
    return videos
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ channel_id: LATEST_CHANNEL, videos }) })
      : route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not_found"}' })
  })
  return calls
}
