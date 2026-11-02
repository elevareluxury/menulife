import { expect, test, type BrowserContext } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Módulo "Eventos" (ticketera para productoras): carrusel de entradas grandes; tocar la portada abre la ficha del
// evento (con su link ?evento=<id>, se cierra con atrás), "Entradas" lleva directo al link y lo que ya pasó no se ve.

const flyer = (from: string, to: string, text: string, h: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="1080" height="${h}" fill="url(#g)"/><text x="80" y="${h - 320}" font-family="sans-serif" font-weight="800" font-size="150" fill="#fff">${text}</text>
</svg>`

const EVENTS = () => moduleRow({
  id: 'm-events', type: 'events', title: 'Próximas fechas', position: 5,
  content: {
    items: [
      { id: 'uni001', image_url: 'https://cdn.example.com/ev-1.svg', title: 'Noche Universo', venue: 'Niceto Club · Palermo',
        tag: 'Techno · +18', date: '2099-11-14', time: '23:30', url: 'https://tickets.example.com/universo',
        description: 'La noche más esperada del año.\nLine up: Ana B2B Beto.' },
      { id: 'sun002', image_url: 'https://cdn.example.com/ev-2.svg', title: 'Sunset Sessions', venue: 'Terraza Mirador',
        date: '2099-11-22', time: '18:00', url: 'https://tickets.example.com/sunset' },
      { id: 'old003', title: 'La que ya pasó', date: '2020-01-01', url: 'https://tickets.example.com/old' },
      { id: 'ny0004', title: 'Fiesta de fin de año', venue: 'A confirmar' },
    ],
  },
})

async function serveFlyers(context: BrowserContext) {
  const art: Record<string, string> = {
    'ev-1.svg': flyer('#7C3AED', '#0B0B14', 'UNIVERSO', 1920),
    'ev-2.svg': flyer('#F97316', '#831843', 'SUNSET', 1350),
  }
  await context.route('https://cdn.example.com/ev-*', route => {
    const name = new URL(route.request().url()).pathname.slice(1)
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: art[name] ?? '' })
  })
}

test('página pública: carrusel de entradas, ficha del evento con su link y botón de entradas', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: [EVENTS()] }))
  await serveFlyers(context) // después del mock: si no, el mock responde sus propias imágenes
  await page.goto('/ana?src=qr')

  const section = page.getByRole('region', { name: 'Próximas fechas', exact: true })
  await expect(section).toBeVisible()
  // Lo que ya pasó no se muestra; sin fecha, sí
  await expect(page.locator('.mp-ev-card')).toHaveCount(3)
  await expect(section).not.toContainText('La que ya pasó')
  await expect(section).toContainText('Fiesta de fin de año')

  // La tarjeta toma la forma del flyer (historia 9:16)
  await expect.poll(async () => {
    const box = await page.locator('.mp-ev-card').first().locator('.mp-ev-poster').boundingBox()
    return box ? Math.abs(box.width / box.height - 1080 / 1920) < 0.02 : false
  }).toBe(true)

  // "Entradas" lleva directo al link
  const buy = section.getByRole('link', { name: /Entradas: Noche Universo/ })
  await expect(buy).toHaveAttribute('href', 'https://tickets.example.com/universo')
  await expect(buy).toHaveAttribute('target', '_blank')

  // Tocar la portada abre la ficha, con su propio link
  await section.getByRole('button', { name: /^Ver evento: Noche Universo/ }).click()
  const detail = page.getByRole('dialog', { name: 'Noche Universo' })
  await expect(detail).toBeVisible()
  await expect(page).toHaveURL(/\/ana\?src=qr&evento=uni001$/)
  await expect(detail).toContainText('Niceto Club · Palermo')
  await expect(detail).toContainText('Line up: Ana B2B Beto.')
  await expect(detail.getByRole('link', { name: 'Comprar entradas' })).toHaveAttribute('href', 'https://tickets.example.com/universo')
  await expect(detail.getByRole('button', { name: 'Volver' })).toBeFocused()

  // Atrás (el del celular o el del navegador) la cierra y vuelve a la página
  await page.goBack()
  await expect(detail).toHaveCount(0)
  await expect(page).toHaveURL(/\/ana\?src=qr$/)

  // "Volver" y Escape también
  await section.getByRole('button', { name: /^Ver evento: Sunset Sessions/ }).click()
  await page.getByRole('dialog', { name: 'Sunset Sessions' }).getByRole('button', { name: 'Volver' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await section.getByRole('button', { name: /^Ver evento: Noche Universo/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/ana\?src=qr$/)

  // Los puntos llevan a cada evento
  await section.getByRole('button', { name: /^2 de 3/ }).click()
  await expect(page.locator('.mp-ev-card').nth(1)).toHaveClass(/is-active/)
})

test('el link de un evento abre su ficha; uno que ya pasó o no existe, la página', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: [EVENTS()] }))
  await serveFlyers(context)
  await page.goto('/ana?evento=sun002')
  await expect(page.getByRole('dialog', { name: 'Sunset Sessions' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/ana$/)

  await page.goto('/ana?evento=old003')
  await expect(page.getByRole('region', { name: 'Próximas fechas', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('axe y celular angosto: lista y ficha en los dos temas, sin scroll de costado', async ({ page, context }) => {
  for (const mode of ['universo', 'amanecer'] as const) {
    await installSupabaseMock(context, createState({ profiles: [profileRow({ theme: { layout: 'clasica', mode } })], profile_modules: [EVENTS()] }))
    await serveFlyers(context)
    await page.setViewportSize({ width: 320, height: 760 })
    await page.goto('/ana')
    await expect(page.getByRole('region', { name: 'Próximas fechas', exact: true })).toBeVisible()
    let results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${mode} · lista · ${v.id}`)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.getByRole('button', { name: /^Ver evento: Noche Universo/ }).click()
    await expect(page.getByRole('dialog', { name: 'Noche Universo' })).toBeVisible()
    results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).include('.mp-evd').analyze()
    expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${mode} · ficha · ${v.id}`)).toEqual([])
    expect(await page.locator('.mp-evd').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await context.unrouteAll({ behavior: 'ignoreErrors' })
  }
})

test('Studio: crear un módulo de eventos con su ficha y publicarlo', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /^Eventos\b/ }).first().click()
  const sheet = page.getByRole('dialog').last()
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect(sheet.getByText('Agregá al menos un evento con portada o nombre.')).toBeVisible()

  await sheet.getByRole('textbox', { name: /^Nombre del evento/ }).fill('Noche Universo')
  await sheet.getByLabel('Fecha', { exact: true }).fill('2099-11-14')
  await sheet.getByLabel(/^Hora/).fill('23:30')
  await sheet.getByRole('textbox', { name: /^Lugar/ }).fill('Niceto Club')
  await sheet.getByRole('textbox', { name: /^Descripción/ }).fill('Line up: Ana B2B Beto.')
  await sheet.getByRole('textbox', { name: /^Link de entradas/ }).fill('tickets.example.com/universo')
  await sheet.getByRole('button', { name: 'Agregar evento' }).click()
  await sheet.getByRole('textbox', { name: /^Nombre del evento/ }).last().fill('Sunset Sessions')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()

  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body).toMatchObject({
    type: 'events',
    content: { items: [
      { title: 'Noche Universo', date: '2099-11-14', time: '23:30', venue: 'Niceto Club', description: 'Line up: Ana B2B Beto.', url: 'https://tickets.example.com/universo' },
      { title: 'Sunset Sessions' },
    ] },
  })
  const body = state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')!.body as { content: { items: { id: string }[] } }
  expect(body.content.items.every(i => /^[a-z0-9]{4,16}$/.test(i.id))).toBe(true)

  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText(/Publicado · versión 2/)).toBeVisible()
})
