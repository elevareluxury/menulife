import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow, type MockState } from './support/mockSupabase'

// Links avanzados y Connect (Identity Fase 7).

const hour = 3_600_000
const iso = (ms: number) => new Date(Date.now() + ms).toISOString()

function seed(): MockState {
  return createState({
    profiles: [profileRow()],
    profile_modules: [
      moduleRow({ id: 'm-hl', title: 'Comprá mi curso', position: 10, content: { url: 'https://ana.design/curso', style: 'highlight' } }),
      moduleRow({ id: 'm-group', type: 'link_group', title: 'Tiendas', position: 20, content: { items: [
        { title: 'Etsy', url: 'https://etsy.com/ana' }, { title: 'Behance', url: 'https://behance.net/ana', subtitle: 'Portfolio' },
      ] } }),
      moduleRow({ id: 'm-soon', title: 'Lanzamiento', position: 30, config: { show_from: iso(24 * hour) } }),
      moduleRow({ id: 'm-old', title: 'Promo vencida', position: 40, config: { show_until: iso(-hour) } }),
      moduleRow({ id: 'm-now', title: 'Sólo hoy', position: 50, config: { show_from: iso(-hour), show_until: iso(hour) } }),
    ],
  })
}

test('la página muestra el link destacado, el grupo de links y sólo lo que está en horario', async ({ page, context }) => {
  await installSupabaseMock(context, seed())
  await page.goto('/ana')

  await expect(page.getByRole('link', { name: /Comprá mi curso/ })).toHaveClass(/is-highlight/)
  const group = page.getByRole('region', { name: 'Tiendas' })
  await expect(group.getByRole('link')).toHaveCount(2)
  await expect(group.getByRole('link', { name: /Behance.*Portfolio/ })).toHaveAttribute('href', 'https://behance.net/ana')

  await expect(page.getByRole('link', { name: /Sólo hoy/ })).toBeVisible()
  await expect(page.getByText('Lanzamiento')).toHaveCount(0)
  await expect(page.getByText('Promo vencida')).toHaveCount(0)
})

test('crear un grupo de links y programar un módulo desde Studio', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  // Los programados muestran cuándo aparecen o que ya terminaron
  await expect(page.getByRole('button', { name: 'Editar Lanzamiento' })).toContainText('Desde')
  await expect(page.getByRole('button', { name: 'Editar Promo vencida' })).toContainText('Terminó')
  await expect(page.getByRole('button', { name: 'Editar Sólo hoy' })).toContainText('Hasta')

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Grupo de links/ }).click()
  await page.getByRole('textbox', { name: 'Título de la sección' }).fill('Prensa')
  await page.getByRole('textbox', { name: 'Texto del link' }).fill('Entrevista en Clarín')
  await page.getByRole('textbox', { name: 'URL' }).fill('https://clarin.com/ana')
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body).toMatchObject({
    type: 'link_group', title: 'Prensa', content: { items: [{ title: 'Entrevista en Clarín', url: 'https://clarin.com/ana' }] },
  })

  // Programar: "Mostrar desde" queda guardado en config con zona horaria
  await page.getByRole('button', { name: 'Editar Comprá mi curso', exact: true }).click()
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click() // abre "Programar"
  await page.getByLabel('Mostrar desde').fill('2030-01-15T09:30')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect.poll(() => (state.writes.filter(w => w.method === 'PATCH' && w.table === 'profile_modules').pop()?.body as { config?: { show_from?: string } })?.config?.show_from)
    .toBe(new Date('2030-01-15T09:30').toISOString())
  await expect(page.getByRole('button', { name: 'Editar Comprá mi curso' })).toContainText('Desde')
})

test('Connect: tarjeta de identidad clara/oscura y presentación corta', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/studio/exchange')

  const card = page.getByRole('img', { name: 'Tarjeta de identidad de Ana Pérez' })
  await expect(card).toBeVisible()
  const [dark] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar PNG' }).click()])
  expect(dark.suggestedFilename()).toBe('mycen-ana-oscura.png')

  await page.getByRole('button', { name: 'Clara' }).click()
  await expect(card).toBeVisible()
  const [light] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar PNG' }).click()])
  expect(light.suggestedFilename()).toBe('mycen-ana-clara.png')

  const intro = page.getByRole('textbox', { name: 'Texto de presentación' })
  await expect(intro).toHaveValue(/^Hola, soy Ana Pérez \(Diseñadora\)\.\n\nAcá está todo lo mío: http.+\/ana$/)
  await page.getByRole('button', { name: 'Con tu bio' }).click()
  await expect(intro).toHaveValue(/Hago marcas\./)
  await intro.fill('Hola! Te paso mi perfil')
  await expect(page.getByRole('link', { name: 'Enviar por WhatsApp' }))
    .toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent('Hola! Te paso mi perfil')}`)
})

test('Analítica muestra de dónde vienen las visitas', async ({ page, context }) => {
  const state = seed()
  const today = new Date().toISOString().slice(0, 10)
  state.tables.profile_stats_daily.push({ profile_id: 'p-ana', day: today, event_type: 'view', module_id: null, events: 9, visitors: 7 })
  state.trafficSources = [
    { source: 'qr', referrer_host: null, visits: 4, visitors: 3 },
    { source: null, referrer_host: 'l.instagram.com', visits: 2, visitors: 2 },
    { source: 'ig', referrer_host: null, visits: 1, visitors: 1 },
    { source: null, referrer_host: null, visits: 1, visitors: 1 },
  ]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/analytics')

  const sources = page.getByRole('region', { name: 'De dónde vienen' })
  await expect(sources.getByRole('listitem')).toHaveCount(3)
  await expect(sources.getByRole('listitem').nth(0)).toContainText('Código QR')
  await expect(sources.getByRole('listitem').nth(0)).toContainText('4 visitas')
  await expect(sources.getByRole('listitem').nth(1)).toContainText('Instagram')
  await expect(sources.getByRole('listitem').nth(2)).toContainText('Directo')
})
