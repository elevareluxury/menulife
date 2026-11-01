import { expect, test } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, moduleRow, profileRow, spaceRow } from './support/mockSupabase'

// Entrega 2b: sucursales con "Ver la más cerca" (la ubicación no sale del dispositivo), segunda foto de perfil según
// la hora de quien mira, íconos de marca a pedido y "Copiar a otro Space".

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' })

const BRANCHES = {
  address: 'Florida 100', city: 'CABA', name: 'Microcentro',
  maps_url: 'https://www.google.com/maps/place/Microcentro/@-34.6037,-58.3756,17z/data=!3d-34.6037!4d-58.3756',
  branches: [
    { name: 'Palermo', address: 'Honduras 5000', city: 'CABA', maps_url: 'https://www.google.com/maps/@-34.5875,-58.4300,17z' },
    { name: 'Córdoba', address: 'Av. Colón 500', city: 'Córdoba', maps_url: 'https://www.google.com/maps/@-31.4135,-64.1900,17z' },
    { name: 'Rosario', address: 'Córdoba 1200', city: 'Rosario', maps_url: 'https://maps.app.goo.gl/abc' },
  ],
}

function rows() {
  return [
    moduleRow({ id: 'm-loc', type: 'location', title: 'Nuestros locales', position: 10, content: BRANCHES }),
    moduleRow({ id: 'm-spotify', type: 'link', title: 'Mi música', position: 20, content: { url: 'https://open.spotify.com/artist/123' } }),
  ]
}

test('sucursales: "Ver la más cerca" ordena con la ubicación del celular, sin mandarla a ningún lado', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()], profile_modules: rows() })
  await installSupabaseMock(context, state)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: -31.42, longitude: -64.19 }) // en Córdoba
  const sent: string[] = []
  page.on('request', r => { if (/-31\.42|-64\.19/.test(r.url() + (r.postData() ?? ''))) sent.push(r.url()) })
  await page.goto('/ana')

  const card = page.getByRole('region', { name: 'Nuestros locales' })
  const items = card.getByRole('listitem')
  await expect(items).toHaveCount(4)
  await expect(items.first()).toContainText('Microcentro') // el orden del dueño
  await expect(card.getByText('Tu ubicación no sale de tu celular.')).toBeVisible()

  await card.getByRole('button', { name: 'Ver la más cerca' }).click()
  await expect(card.getByRole('status')).toHaveText('Ordenadas por cercanía')
  await expect(items.first()).toContainText('Córdoba')
  await expect(items.first()).toContainText(/\d+ (m|km)/)
  // Sin coordenadas (link corto): al final
  await expect(items.last()).toContainText('Rosario')
  // Cada sucursal con sus apps de mapas
  await expect(card.getByRole('link', { name: 'Cómo llegar (Palermo): Google Maps' })).toHaveAttribute('href', BRANCHES.branches[0].maps_url)
  expect(sent).toEqual([])
})

test('sucursales y el link de Spotify con su ícono, axe en los dos temas a 320 px', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  for (const mode of ['universo', 'amanecer'] as const) {
    const state = createState({ profiles: [profileRow({ theme: { layout: 'clasica', mode } })], profile_modules: rows() })
    await installSupabaseMock(context, state)
    await page.goto('/ana')
    await expect(page.getByRole('region', { name: 'Nuestros locales' })).toBeVisible()
    // El ícono de Spotify llega en su chunk: el link deja de mostrar la inicial
    const spotify = page.getByRole('link', { name: /Mi música/ })
    await expect(spotify.locator('.mp-link-icon svg')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${mode} · ${v.id}`)).toEqual([])
  }
})

test('segunda foto: la de la noche se ve de noche y la de siempre de día (hora de quien mira)', async ({ page, context }) => {
  const theme = { layout: 'credencial', mode: 'universo', avatar_alt: { url: 'https://cdn.example.com/noche.png', when: 'noche' } }
  const state = createState({ profiles: [profileRow({ avatar_url: 'https://cdn.example.com/dia.png', theme })], profile_modules: [] })
  await installSupabaseMock(context, state)

  await page.clock.setFixedTime(new Date('2026-11-02T01:30:00Z')) // 22:30 en Buenos Aires
  await page.goto('/ana')
  await expect(page.getByRole('img', { name: 'Ana Pérez' }).first()).toHaveAttribute('src', /noche/)

  await page.clock.setFixedTime(new Date('2026-11-01T18:00:00Z')) // 15:00
  await page.reload()
  await expect(page.getByRole('img', { name: 'Ana Pérez' }).first()).toHaveAttribute('src', /dia/)
})

test('Studio: copiar un módulo a otro Space lo suma al final de ese Space', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow(), spaceRow('estudio', { display_name: 'Estudio Ana' })],
    profile_modules: [moduleRow({ id: 'm-link', type: 'link', title: 'Mi tienda', position: 10, content: { url: 'https://tienda.ana.com' } })],
  })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Opciones de Mi tienda' }).click()
  await page.getByRole('menuitem', { name: 'Copiar a otro Space' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Estudio Ana/ }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  const estudio = state.tables.profiles.find(p => p.space_slug === 'estudio')!
  await expect.poll(() => state.tables.profile_modules.find(m => m.profile_id === estudio.id)).toBeTruthy()
  const copy = state.tables.profile_modules.find(m => m.profile_id === estudio.id)!
  expect(copy).toMatchObject({ type: 'link', title: 'Mi tienda', content: { url: 'https://tienda.ana.com' } })
  // El original sigue donde estaba
  expect(state.tables.profile_modules.filter(m => m.title === 'Mi tienda')).toHaveLength(2)
})
