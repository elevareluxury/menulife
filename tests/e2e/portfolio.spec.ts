import { expect, test, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
import { testPng } from './support/testImages'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Portfolio profesional (modelos, actores, influencers, músicos y creativos): medidas, audiencia, marcas, prensa,
// créditos y representación; galería "book" sin recortes; visibilidad "sólo con el link"; plantillas y tipos de
// talento en el onboarding. Lo que no se cargó no se muestra y nada se inventa.

const recent = () => new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10)

const PORTFOLIO = () => [
  moduleRow({ id: 'm-measures', type: 'measurements', title: null, position: 10, content: { height: 178, waist: 61, hips: 89, shoe: '38', eyes: 'Marrones' } }),
  moduleRow({ id: 'm-audience', type: 'audience', title: null, position: 20, content: { as_of: recent(), items: [
    { platform: 'instagram', handle: 'lunaoficial', followers: 1250000, engagement: 3.4, url: 'https://instagram.com/lunaoficial' },
    { platform: 'tiktok', followers: 860000, avg_views: 240000 },
  ] } }),
  moduleRow({ id: 'm-brands', type: 'brands', title: null, position: 30, content: { items: [
    { name: 'Marca Uno', url: 'https://marcauno.example.com', year: '2025' }, { name: 'Estudio Dos' }, { name: 'Casa Tres con un nombre largo' },
  ] } }),
  moduleRow({ id: 'm-press', type: 'press', title: null, position: 40, content: { items: [
    { quote: 'Una de las caras nuevas de la temporada.', outlet: 'Revista Moda', url: 'https://revista.example.com/nota', date: '2026-03-10' },
  ] } }),
  moduleRow({ id: 'm-credits', type: 'credits', title: null, position: 50, content: { items: [
    { title: 'Campaña de invierno', role: 'Modelo principal', company: 'Marca Uno', year: '2025' }, { title: 'Desfile Semana de la Moda', year: '2024' },
  ] } }),
  moduleRow({ id: 'm-rep', type: 'representation', title: null, position: 60, content: { items: [
    { role: 'agency', name: 'Agencia Sur', city: 'Buenos Aires', email: 'booking@agenciasur.example.com', phone: '+54 11 5555-5555', url: 'https://agenciasur.example.com' },
  ] } }),
]

async function axe(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))))
  const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('img').analyze()
  expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
}

for (const mode of ['universo', 'amanecer'] as const) {
  for (const layout of ['credencial', 'portada', 'editorial', 'bento', 'clasica'] as const) {
    test(`los 6 módulos se ven y pasan axe en ${layout} · ${mode}`, async ({ page, context }) => {
      await installSupabaseMock(context, createState({ profiles: [profileRow({ theme: { layout, mode, accent: 'plasma' } })], profile_modules: PORTFOLIO() }))
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/ana')
      for (const name of ['Medidas', 'Audiencia', 'Marcas con las que trabajé', 'Prensa', 'Créditos', 'Representación']) {
        await expect(page.getByRole('region', { name })).toBeVisible()
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await axe(page)
    })
  }
}

test('cada módulo muestra lo cargado, en cm y pulgadas, con la fecha de los números y contactos que funcionan', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ theme: { layout: 'credencial' } })], profile_modules: PORTFOLIO() })
  await installSupabaseMock(context, state)
  await page.goto('/ana')
  const measures = page.getByRole('region', { name: 'Medidas' })
  await expect(measures).toContainText('Altura')
  await expect(measures).toContainText('178 cm')
  await expect(measures).toContainText(`5'10"`)
  await expect(measures).toContainText('Marrones')
  // Lo que no se cargó no aparece
  await expect(measures).not.toContainText('Busto')

  const audience = page.getByRole('region', { name: 'Audiencia' })
  await expect(audience).toContainText('Instagram')
  await expect(audience).toContainText('@lunaoficial')
  await expect(audience).toContainText('seguidores')
  await expect(audience).toContainText(/Números informados por Ana Pérez el/)
  await expect(audience).not.toContainText('Pueden estar desactualizados')
  await expect(audience.getByRole('link', { name: /Instagram/ })).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc')

  const press = page.getByRole('region', { name: 'Prensa' })
  await expect(press).toContainText('Una de las caras nuevas de la temporada.')
  await expect(press.getByRole('link', { name: /Revista Moda/ })).toHaveAttribute('href', 'https://revista.example.com/nota')

  const credits = page.getByRole('region', { name: 'Créditos' })
  await expect(credits).toContainText('Modelo principal · Marca Uno · 2025')

  const rep = page.getByRole('region', { name: 'Representación' })
  await expect(rep).toContainText('Agencia')
  await expect(rep).toContainText('Agencia Sur')
  await expect(rep.getByRole('link', { name: 'Escribir' })).toHaveAttribute('href', 'mailto:booking@agenciasur.example.com')
  await expect(rep.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:+541155555555')
  await rep.getByRole('link', { name: 'Escribir' }).evaluate(a => a.addEventListener('click', e => e.preventDefault()))
  await rep.getByRole('link', { name: 'Escribir' }).click()
  await expect.poll(() => state.rpcCalls.some(c => c.fn === 'track_profile_event' && c.args.p_module_id === 'm-rep' && c.args.p_item_key === 'email')).toBe(true)
})

const withAsOf = (days: number) => PORTFOLIO().map(m => (m.type === 'audience'
  ? { ...m, content: { ...(m.content as Record<string, unknown>), as_of: new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10) } } : m))

test('audiencia: con más de 90 días avisa que puede estar desactualizada', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow({ theme: { layout: 'credencial' } })], profile_modules: withAsOf(200) }))
  await page.goto('/ana')
  await expect(page.getByRole('region', { name: 'Audiencia' })).toContainText('Pueden estar desactualizados.')
})

test('audiencia: con más de un año no se muestra (un número viejo engaña)', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow({ theme: { layout: 'credencial' } })], profile_modules: withAsOf(400) }))
  await page.goto('/ana')
  await expect(page.getByRole('region', { name: 'Medidas' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Audiencia' })).toHaveCount(0)
})

test('Studio: crear "Medidas" y "Representación" (valida email) y publicarlos', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /^Medidas\b/ }).first().click()
  let sheet = page.getByRole('dialog').last()
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect(sheet.getByText('Completá al menos una medida.')).toBeVisible()
  await sheet.getByRole('textbox', { name: 'Altura (cm)' }).fill('300')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect(sheet.getByText('Las medidas van en centímetros, entre 20 y 260.')).toBeVisible()
  await sheet.getByRole('textbox', { name: 'Altura (cm)' }).fill('178,5')
  await sheet.getByRole('textbox', { name: 'Calzado' }).fill('38')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body)
    .toMatchObject({ type: 'measurements', content: { height: 178.5, shoe: '38' } })

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /^Representación\b/ }).first().click()
  sheet = page.getByRole('dialog').last()
  await sheet.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Agencia Sur')
  await sheet.getByRole('textbox', { name: /^Email/ }).fill('booking-agenciasur')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect(sheet.getByText('Hay un email que no es válido.')).toBeVisible()
  await sheet.getByRole('textbox', { name: /^Email/ }).fill('booking@agenciasur.example.com')
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => state.writes.filter(w => w.method === 'POST' && w.table === 'profile_modules')[1]?.body).toMatchObject({
    type: 'representation', content: { items: [{ role: 'agency', name: 'Agencia Sur', email: 'booking@agenciasur.example.com' }] },
  })

  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText(/Publicado · versión 2/)).toBeVisible()
})

test('galería "book": fotos enteras, sin recortar, y se elige en Studio', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow({ theme: { layout: 'credencial' } })],
    profile_modules: [moduleRow({ id: 'm-g', type: 'gallery', title: null, position: 10, content: { layout: 'book', items: [
      { url: 'https://cdn.example.com/alta.png?w=600&h=900', type: 'image', alt: 'Retrato' },
      { url: 'https://cdn.example.com/ancha.png?w=900&h=600', type: 'image', alt: 'Campaña' },
      { url: 'https://cdn.example.com/cuadrada.png?w=700&h=700', type: 'image', alt: 'Detalle' },
    ] } })],
  })
  await installSupabaseMock(context, state, { signedIn: true })
  // Cada foto con su forma (el mock general sirve todas de 1200 × 800)
  for (const [name, w, h] of [['alta', 600, 900], ['ancha', 900, 600], ['cuadrada', 700, 700]] as const) {
    await context.route(`https://cdn.example.com/${name}.png**`, route => route.fulfill({ status: 200, contentType: 'image/png', body: testPng(w, h) }))
  }
  await page.goto('/ana')
  const gallery = page.locator('.mp-gallery.is-book')
  await expect(gallery).toBeVisible()
  const img = gallery.getByRole('button', { name: 'Retrato' }).locator('img')
  await expect(img).toBeVisible()
  // La foto alta conserva su forma (más alta que ancha): no se recorta a un cuadrado
  await expect.poll(() => img.evaluate(el => el.getBoundingClientRect().height / el.getBoundingClientRect().width)).toBeGreaterThan(1.3)

  await page.goto('/studio/modules')
  await page.getByRole('button', { name: /^Editar Galería/ }).first().click()
  const sheet = page.getByRole('dialog').last()
  await expect(sheet.getByRole('combobox', { name: /Cómo se muestran/ })).toHaveValue('book')
})

test('Ajustes: "Sólo con el link" se guarda y la página no se indexa', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/settings')
  await page.getByRole('combobox', { name: /Quién lo puede ver/ }).selectOption('unlisted')
  await expect.poll(() => state.tables.profiles[0].visibility).toBe('unlisted')
  await page.goto('/ana')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
})

test('plantilla Modelo: agrega medidas, representación y la galería en book (vacías y ocultas)', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Usar una plantilla' }).click()
  const picker = page.getByRole('dialog', { name: 'Elegí una plantilla' })
  await expect(picker.getByRole('region', { name: 'Talentos' })).toBeVisible()
  await picker.getByRole('button', { name: 'Ver la plantilla Modelo' }).click()
  const detail = page.getByRole('dialog', { name: 'Modelo' })
  await detail.getByRole('button', { name: /^Agregar \d+ módulos$/ }).click()
  await expect(detail).toHaveCount(0)
  const added = state.tables.profile_modules.filter(m => (m.config as Record<string, unknown> | null)?.template === 'model')
  expect(added.map(m => m.type)).toEqual(['gallery', 'measurements', 'representation', 'brands', 'press', 'social', 'contact_form'])
  expect(added.every(m => m.visibility === 'hidden')).toBe(true)
  expect(added.find(m => m.type === 'gallery')!.content).toEqual({ layout: 'book' })
})

test('onboarding: elegir "Modelo" deja el propósito y la estructura de talento', async ({ page, context }) => {
  const state = createState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio')
  const continueBtn = page.getByRole('button', { name: 'Continuar', exact: true })
  await page.getByRole('textbox', { name: 'Nombre visible' }).fill('Luna Díaz')
  await continueBtn.click()
  await expect(page.getByText(/disponible/i).first()).toBeVisible()
  await continueBtn.click()
  await expect(page.getByText('Talento', { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: /^Modelo/ }).click()
  await continueBtn.click()
  await expect(page.locator('h1.st-title, h1.ob-huella-title')).toHaveText('Tu foto')
  expect(state.tables.profiles[0]).toMatchObject({ display_name: 'Luna Díaz', purpose: 'model' })
  expect(state.tables.profiles[0].theme).toMatchObject({ layout: 'portada' })
})
