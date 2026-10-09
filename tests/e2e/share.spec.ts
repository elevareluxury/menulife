import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// V1 · etapa 08: "Tu semana" en el Inicio con datos reales y "Poné tu Mycen en todos lados".

test('Inicio: la semana con visitas, toques, contactos, mensajes y de dónde llegaron', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  const today = new Date().toISOString().slice(0, 10)
  state.tables.profile_stats_daily.push(
    { profile_id: 'p-ana', day: today, event_type: 'view', module_id: null, events: 30, visitors: 25 },
    { profile_id: 'p-ana', day: today, event_type: 'primary_action_click', module_id: null, events: 6, visitors: 6 },
    { profile_id: 'p-ana', day: today, event_type: 'vcard_download', module_id: null, events: 2, visitors: 2 },
  )
  state.trafficSources = [
    { source: 'ig', referrer_host: null, visits: 23, visitors: 20 },
    { source: null, referrer_host: null, visits: 7, visitors: 5 },
  ]
  state.tables.profile_messages = [{ id: 'msg-1', profile_id: 'p-ana', name: 'Juan', contact: 'juan@mail.com', message: 'Hola', created_at: new Date().toISOString(), read_at: null }]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio')

  const week = page.getByRole('region', { name: 'Tu semana' })
  await expect(week.getByText('Tu link de Instagram trajo 23 visitas esta semana.')).toBeVisible()
  await expect(week.getByRole('definition')).toHaveText(['30', '6', '2', '1'])
  await expect(week.getByRole('listitem')).toHaveCount(2)
})

test('Inicio sin visitas: invita a poner el link en las redes, sin inventar números', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/studio')
  const week = page.getByRole('region', { name: 'Tu semana' })
  await expect(week.getByText(/Todavía no hubo visitas esta semana/)).toBeVisible()
  await expect(week.getByRole('definition')).toHaveText(['0', '0', '0', '0'])

  await week.getByRole('link', { name: 'Poné tu Mycen en todos lados' }).click()
  await expect(page).toHaveURL(/\/studio\/everywhere$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Poné tu Mycen en todos lados' })).toBeVisible()
  const platforms = page.getByRole('list', { name: 'Poné tu Mycen en todos lados' })
  await expect(platforms.getByRole('heading', { level: 2 })).toHaveText(['Instagram', 'TikTok', 'LinkedIn', 'WhatsApp Business', 'WhatsApp', 'Firma de email'])

  // Cada plataforma copia su link con ?src=, así se mide de dónde llegan
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copiar link para Instagram' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/ana\?src=ig$/)
})

test('el QR con huella se descarga en SVG, con la huella y el usuario debajo', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/studio/exchange')
  await expect(page.getByRole('img', { name: 'QR de Ana Pérez' })).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'SVG (imprenta)' }).click(),
  ])
  const svg = await (await download.createReadStream()).toArray().then(c => Buffer.concat(c).toString('utf8'))
  expect(download.suggestedFilename()).toBe('mycen-ana-qr.svg')
  // Huella (gradiente propio) + QR + el usuario debajo
  expect(svg).toContain('linearGradient')
  expect(svg).toMatch(/\/ana<\/text>/)
})
