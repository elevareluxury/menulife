import { expect, test, type Locator, type Page } from '@playwright/test'
import { createState, installSupabaseMock, profileRow, publishProjectRow, type MockState } from './support/mockSupabase'
import { PROJECT_FIXTURE } from './support/moduleFixtures'
import { installYoutubeLatestMock } from './support/mockYoutubeLatest'
import { installTestImages, testPng } from './support/testImages'

// Auditoría de módulos de punta a punta: cada tipo que se puede agregar se crea desde Studio como lo haría una
// persona (links pegados sin https://, con comillas o un punto final, @usuario, WhatsApp con espacios), se guarda,
// se publica y en la página pública cada botón lleva al lugar correcto. Si algo no se puede escribir así, Studio
// lo explica antes de guardar (nunca queda un botón que no abre nada).

interface Case {
  type: string
  /** Nombre del tipo en la biblioteca de Studio */
  label: string
  fill: (sheet: Locator, page: Page) => Promise<void>
  /** Lo que se guarda (parcial) */
  saved: Record<string, unknown>
  /** Qué se ve y adónde llevan los links en la página pública */
  check: (main: Locator) => Promise<void>
}

const field = (sheet: Locator, name: string | RegExp) => sheet.getByRole('textbox', { name, exact: typeof name === 'string' })
const photo = async (sheet: Locator, n = 0) => sheet.locator('input[type="file"]').nth(n)
  .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: testPng(900, 1200) })
/** Escribe y sale del campo (los campos de link se completan al salir) */
async function type(input: Locator, value: string) {
  await input.fill(value)
  await input.blur()
}
async function expectError(sheet: Locator, message: string) {
  await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect(sheet.getByText(message, { exact: true }).first()).toBeVisible()
}

const CASES: Case[] = [
  {
    type: 'link', label: 'Link',
    fill: async sheet => {
      await type(field(sheet, /^Título/), 'Mi tienda')
      await type(field(sheet, /^URL/), 'https://mi tienda.com')
      await expectError(sheet, 'La URL no es válida.')
      await type(field(sheet, /^URL/), '"www.mitienda.com.ar/ofertas?ref=ig".')
      await expect(field(sheet, /^URL/)).toHaveValue('https://www.mitienda.com.ar/ofertas?ref=ig')
    },
    saved: { title: 'Mi tienda', content: { url: 'https://www.mitienda.com.ar/ofertas?ref=ig', style: 'button' } },
    check: async main => {
      await expect(main.getByRole('link', { name: /Mi tienda/ })).toHaveAttribute('href', 'https://www.mitienda.com.ar/ofertas?ref=ig')
    },
  },
  {
    type: 'link', label: 'Link',
    fill: async sheet => {
      await type(field(sheet, /^Título/), 'Escribime')
      // El "https://" ya estaba escrito y la persona puso su email: queda como mail
      await field(sheet, /^URL/).click()
      await field(sheet, /^URL/).pressSequentially('ana@mail.com')
      await field(sheet, /^URL/).blur()
      await expect(field(sheet, /^URL/)).toHaveValue('mailto:ana@mail.com')
    },
    saved: { title: 'Escribime', content: { url: 'mailto:ana@mail.com' } },
    check: async main => {
      await expect(main.getByRole('link', { name: /Escribime/ })).toHaveAttribute('href', 'mailto:ana@mail.com')
    },
  },
  {
    type: 'social', label: 'Red social',
    fill: async sheet => {
      await sheet.getByRole('combobox', { name: /^Red/ }).selectOption('instagram')
      await type(field(sheet, /^Usuario o URL/), 'ana perez')
      await expectError(sheet, 'Revisá el usuario o la URL.')
      await type(field(sheet, /^Usuario o URL/), 'instagram.com/ana.perez')
    },
    saved: { content: { network: 'instagram', url: 'https://instagram.com/ana.perez' } },
    check: async main => {
      await expect(main.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', 'https://instagram.com/ana.perez')
    },
  },
  {
    type: 'social', label: 'Red social',
    fill: async sheet => {
      await sheet.getByRole('combobox', { name: /^Red/ }).selectOption('tiktok')
      await type(field(sheet, /^Usuario o URL/), ' @ana.perez ')
    },
    saved: { content: { network: 'tiktok', url: 'https://tiktok.com/@ana.perez' } },
    check: async main => {
      await expect(main.getByRole('link', { name: /TikTok/ })).toHaveAttribute('href', 'https://tiktok.com/@ana.perez')
    },
  },
  {
    type: 'contact', label: 'Contacto',
    fill: async sheet => {
      await type(field(sheet, /^WhatsApp/), '341 555-0000')
      await expectError(sheet, 'Para WhatsApp poné el número completo con el código de país, por ejemplo +54 9 341 555 0000.')
      await type(field(sheet, /^WhatsApp/), '+54 9 341 555-0000')
      await type(field(sheet, /^Teléfono/), '12')
      await expectError(sheet, 'El teléfono no es válido.')
      await type(field(sheet, /^Teléfono/), '(0341) 555-0000')
      await type(field(sheet, /^Email/), 'ana@mail.com')
    },
    saved: { content: { whatsapp: '+54 9 341 555-0000', phone: '(0341) 555-0000', email: 'ana@mail.com' } },
    check: async main => {
      await expect(main.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5493415550000')
      await expect(main.getByRole('link', { name: '(0341) 555-0000' })).toHaveAttribute('href', 'tel:03415550000')
      await expect(main.getByRole('link', { name: 'ana@mail.com' })).toHaveAttribute('href', 'mailto:ana@mail.com')
    },
  },
  {
    type: 'location', label: 'Ubicación',
    fill: async sheet => {
      await type(field(sheet, /^Dirección/), 'San Martín 123')
      await type(field(sheet, /^Ciudad/), 'Rosario')
    },
    saved: { content: { address: 'San Martín 123', city: 'Rosario' } },
    check: async main => {
      await expect(main.getByText('San Martín 123, Rosario')).toBeVisible()
      await expect(main.getByRole('link', { name: 'Cómo llegar' }))
        .toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=San%20Mart%C3%ADn%20123%2C%20Rosario')
    },
  },
  {
    type: 'location', label: 'Ubicación',
    fill: async sheet => {
      await type(field(sheet, /^Link de Google Maps/), 'maps.app.goo.gl/AbC123')
    },
    saved: { content: { maps_url: 'https://maps.app.goo.gl/AbC123' } },
    check: async main => {
      await expect(main.getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute('href', 'https://maps.app.goo.gl/AbC123')
    },
  },
  {
    type: 'text', label: 'Texto',
    fill: async (sheet, page) => {
      await type(field(sheet, /^Título/), 'Novedades')
      await type(field(sheet, /^Texto/), 'Abrimos el sábado.')
      const upload = page.waitForRequest(r => r.method() === 'POST' && r.url().includes('/storage/v1/object/'))
      await photo(sheet)
      await upload
    },
    saved: { title: 'Novedades', content: { body: 'Abrimos el sábado.' } },
    check: async main => {
      await expect(main.getByText('Abrimos el sábado.')).toBeVisible()
      await expect(main.locator('.mp-card-media img')).toHaveJSProperty('complete', true)
    },
  },
  {
    type: 'image', label: 'Imagen',
    fill: async (sheet, page) => {
      const upload = page.waitForRequest(r => r.method() === 'POST' && r.url().includes('/storage/v1/object/'))
      await photo(sheet)
      await upload
      await type(field(sheet, /^Descripción para accesibilidad/), 'Vidriera del local')
    },
    saved: { content: { alt: 'Vidriera del local' } },
    check: async main => {
      await expect(main.getByRole('img', { name: 'Vidriera del local' })).toBeVisible()
    },
  },
  {
    type: 'featured_action', label: 'Botón destacado',
    fill: async sheet => {
      await type(field(sheet, /^Texto del botón/), 'Comprar entradas')
      await type(field(sheet, /^URL/), 'entradas.example.com/show.')
    },
    saved: { content: { label: 'Comprar entradas', url: 'https://entradas.example.com/show' } },
    check: async main => {
      await expect(main.getByRole('link', { name: /Comprar entradas/ })).toHaveAttribute('href', 'https://entradas.example.com/show')
    },
  },
  {
    type: 'product', label: 'Producto destacado',
    fill: async sheet => {
      await type(field(sheet, /^Nombre/), 'Taza de cerámica')
      await type(field(sheet, /^Precio/), '12500')
      await type(field(sheet, /^Texto del botón/), 'Pedir')
      await type(field(sheet, /^URL del botón/), 'wa.me/5493415550000')
    },
    saved: { content: { name: 'Taza de cerámica', price: 12500, cta_text: 'Pedir', cta_url: 'https://wa.me/5493415550000' } },
    check: async main => {
      await expect(main.getByText('Taza de cerámica')).toBeVisible()
      await expect(main.getByRole('link', { name: /Pedir/ })).toHaveAttribute('href', 'https://wa.me/5493415550000')
    },
  },
  {
    type: 'hours', label: 'Horarios',
    fill: async sheet => {
      await sheet.getByRole('switch', { name: 'Lunes abierto' }).click()
    },
    saved: { content: { schedule: { monday: { open: '09:00', close: '18:00' } } } },
    check: async main => {
      await expect(main.getByRole('region', { name: 'Horarios' })).toContainText('Lun09:00 – 18:00')
    },
  },
  {
    type: 'gallery', label: 'Galería',
    fill: async (sheet, page) => {
      for (let i = 0; i < 2; i++) {
        await sheet.getByRole('button', { name: 'Agregar foto' }).click()
        const upload = page.waitForRequest(r => r.method() === 'POST' && r.url().includes('/storage/v1/object/'))
        await photo(sheet, 0)
        await upload
        await expect(sheet.getByText(`Foto ${i + 1}`, { exact: true })).toBeAttached()
      }
    },
    saved: {},
    check: async main => {
      await expect(main.locator('.mp-gallery button')).toHaveCount(2)
    },
  },
  {
    type: 'cards', label: 'Tarjetas',
    fill: async sheet => {
      await sheet.getByRole('combobox', { name: /^Cómo se muestran/ }).selectOption('stack')
      await type(field(sheet, 'Título'), 'Taller de cerámica')
      await type(sheet.getByRole('textbox', { name: /^Link \(opcional\)/ }), 'taller')
      await expectError(sheet, 'Revisá el link de alguna tarjeta.')
      await type(sheet.getByRole('textbox', { name: /^Link \(opcional\)/ }), 'ana.design/taller')
    },
    saved: { content: { layout: 'stack', items: [{ title: 'Taller de cerámica', url: 'https://ana.design/taller' }] } },
    check: async main => {
      await expect(main.getByRole('link', { name: /Taller de cerámica/ })).toHaveAttribute('href', 'https://ana.design/taller')
    },
  },
  {
    type: 'testimonials', label: 'Reseñas',
    fill: async sheet => {
      await sheet.getByRole('button', { name: 'Agregar reseña' }).click()
      await type(field(sheet, /^Nombre/), 'Juan')
      await type(field(sheet, /^Reseña/), 'Excelente atención.')
      await type(field(sheet, /^Puntaje/), '4,8')
      await type(field(sheet, /^Link a tus reseñas/), 'g.page/r/abc123/review')
    },
    saved: { content: { items: [{ author_name: 'Juan', rating: 5, text: 'Excelente atención.' }], google: { rating: 4.8, url: 'https://g.page/r/abc123/review' } } },
    check: async main => {
      await expect(main.getByText('Excelente atención.')).toBeVisible()
      await expect(main.locator('a[href="https://g.page/r/abc123/review"]')).toHaveCount(1)
    },
  },
  {
    type: 'project', label: 'Proyecto destacado',
    fill: async sheet => {
      await sheet.getByRole('combobox', { name: /^Proyecto/ }).selectOption({ label: 'Marca Café Luna' })
    },
    saved: { content: { project_id: 'pr-luna' } },
    check: async main => {
      await expect(main.getByRole('link', { name: /Marca Café Luna/ })).toHaveAttribute('href', '/ana/projects/cafe-luna')
    },
  },
  {
    type: 'portfolio', label: 'Portfolio',
    fill: async () => {},
    saved: { type: 'portfolio' },
    check: async main => {
      await expect(main.getByRole('link', { name: /Marca Café Luna/ })).toHaveAttribute('href', '/ana/projects/cafe-luna')
    },
  },
  {
    type: 'link_group', label: 'Grupo de links',
    fill: async sheet => {
      await type(field(sheet, /^Título de la sección/), 'Tiendas')
      await type(field(sheet, /^Texto del link/), 'Mercado Libre')
      await type(field(sheet, /^URL/), 'mercadolibre.com.ar/tienda/ana,')
      await sheet.getByRole('button', { name: 'Agregar link' }).click()
      await type(field(sheet, /^Texto del link/).nth(1), 'Tienda Nube')
      await type(field(sheet, /^URL/).nth(1), 'ana .mitiendanube.com')
      await expectError(sheet, 'Revisá la URL de algún link.')
      await type(field(sheet, /^URL/).nth(1), 'ana.mitiendanube.com')
    },
    saved: { title: 'Tiendas', content: { items: [
      { title: 'Mercado Libre', url: 'https://mercadolibre.com.ar/tienda/ana' },
      { title: 'Tienda Nube', url: 'https://ana.mitiendanube.com' },
    ] } },
    check: async main => {
      await expect(main.getByRole('link', { name: /Mercado Libre/ })).toHaveAttribute('href', 'https://mercadolibre.com.ar/tienda/ana')
      await expect(main.getByRole('link', { name: /Tienda Nube/ })).toHaveAttribute('href', 'https://ana.mitiendanube.com')
    },
  },
  {
    type: 'media', label: 'Video o música',
    fill: async sheet => {
      await type(field(sheet, /^Link del video o la canción/), 'youtube.com/watch?v=dQw4w9WgXcQ.')
    },
    saved: { content: { url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', provider: 'youtube', kind: 'video' } },
    check: async main => {
      await expect(main.getByRole('button', { name: /Reproducir/ })).toBeVisible()
    },
  },
  {
    type: 'contact_form', label: 'Formulario de contacto',
    fill: async () => {},
    saved: { type: 'contact_form' },
    check: async main => {
      await expect(main.getByRole('button', { name: /Enviar/ })).toBeVisible()
    },
  },
  {
    type: 'collab', label: 'Colaboraciones',
    fill: async () => {},
    saved: { type: 'collab' },
    check: async main => {
      await expect(main.getByRole('button', { name: /propuesta|Proponer/i }).first()).toBeVisible()
    },
  },
  {
    type: 'subscribe', label: 'Suscribirse',
    fill: async () => {},
    saved: { type: 'subscribe' },
    check: async main => {
      await expect(main.getByRole('textbox', { name: /Email/i })).toBeVisible()
    },
  },
  {
    type: 'latest_video', label: 'Último video',
    fill: async sheet => {
      await type(field(sheet, /^Link del canal de YouTube/), 'youtube.com/@ana')
    },
    saved: { content: { handle: '@ana' } },
    check: async main => {
      // El video más nuevo del canal (mock de /api/youtube-latest), con la fachada lista para reproducir
      await expect(main.getByRole('region', { name: 'Último video' }).getByRole('button', { name: 'Cómo hago mis tazas' })).toBeVisible()
    },
  },
  {
    type: 'support', label: 'Apoyame',
    fill: async sheet => {
      const first = sheet.getByRole('group', { name: 'Medio 1' })
      await first.getByRole('combobox', { name: 'Tipo' }).selectOption('paypal')
      await type(first.getByRole('textbox', { name: 'Link' }), '"paypal.me/anaperez".')
    },
    saved: { content: { methods: [{ kind: 'paypal', value: 'https://paypal.me/anaperez' }] } },
    check: async main => {
      await expect(main.getByRole('link', { name: /PayPal/ })).toHaveAttribute('href', 'https://paypal.me/anaperez')
    },
  },
  {
    type: 'listen_on', label: 'Escuchá en',
    fill: async sheet => {
      await type(field(sheet, /^Canción o disco|^Título/), 'Disco nuevo')
      await type(sheet.getByRole('textbox', { name: 'Link', exact: true }), 'open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC?si=x.')
    },
    saved: { content: { links: [{ platform: 'spotify', url: 'https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC?si=x' }] } },
    check: async main => {
      await expect(main.getByRole('link', { name: /Spotify/ })).toHaveAttribute('href', /^https:\/\/open\.spotify\.com\/album\/4uLU6hMCjMI75M1A2tKUQC/)
    },
  },
]

function stateWithProject(): MockState {
  const state = createState({ profiles: [profileRow({ theme: { layout: 'clasica' } })] })
  const project = structuredClone(PROJECT_FIXTURE)
  state.tables.content_objects.push(project)
  publishProjectRow(state, project)
  return state
}

test.describe('cada módulo, de Studio a la página pública', () => {
  test.describe.configure({ mode: 'parallel' })
  for (const [n, c] of CASES.entries()) {
    test(`${c.label} (${c.type}) #${n + 1}`, async ({ page, context, browser }) => {
      const state = stateWithProject()
      await installTestImages(context)
      await installSupabaseMock(context, state, { signedIn: true })
      await installYoutubeLatestMock(context)
      await page.goto('/studio/modules')
      await page.getByRole('button', { name: 'Agregar', exact: true }).click()
      await page.getByRole('button', { name: new RegExp(`^${c.label}\\b`) }).first().click()
      const sheet = page.getByRole('dialog').last()
      await c.fill(sheet, page)
      await sheet.getByRole('button', { name: 'Agregar', exact: true }).last().click()

      await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body)
        .toMatchObject({ type: c.type, ...c.saved })
      await page.getByRole('button', { name: 'Publicar cambios' }).click()
      await expect(page.getByText(/Publicado · versión 2/)).toBeVisible()

      const visitor = await browser.newContext()
      await installTestImages(visitor)
      await installSupabaseMock(visitor, state)
      await installYoutubeLatestMock(visitor)
      const v = await visitor.newPage()
      const errors: string[] = []
      v.on('pageerror', e => errors.push(e.message))
      await v.goto('/ana')
      await expect(v.getByRole('heading', { level: 1 })).toBeVisible()
      await c.check(v.locator('main'))
      expect(errors).toEqual([])
      await visitor.close()
    })
  }
})
