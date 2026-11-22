import { expect, test, type BrowserContext } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Tarjetas · diseño "Flyers" retirado: ahora es el módulo Eventos. Lo ya publicado con ese diseño se ve como Eventos
// hasta volver a publicar (la migración 20261128000001 pasa lo guardado a `events`), y Studio ya no lo ofrece.

// Un flyer de ejemplo; `h` = alto (1920 = formato historia)
const flyer = (from: string, to: string, text: string, h = 1920) => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="1080" height="${h}" fill="url(#g)"/>
  <text x="80" y="${h - 320}" font-family="sans-serif" font-weight="800" font-size="150" fill="#fff">${text}</text>
</svg>`

const FLYERS_MODULE = () => moduleRow({
  id: 'm-flyers', type: 'cards', title: 'Próximas fechas', position: 5,
  content: {
    layout: 'tickets',
    items: [
      { image_url: 'https://cdn.example.com/flyer-1.svg', title: 'Noche Universo', subtitle: 'Niceto Club · Palermo', date: '2099-11-14', time: '23:30', url: 'https://tickets.example.com/universo' },
      { image_url: 'https://cdn.example.com/flyer-2.svg', title: 'Sunset Sessions', subtitle: 'Terraza Mirador', date: '2099-11-22', time: '18:00', url: 'https://tickets.example.com/sunset' },
      { title: 'Fiesta de fin de año', subtitle: 'Lugar a confirmar', date: '2099-12-31' },
    ],
  },
})

async function serveFlyers(context: BrowserContext) {
  const art: Record<string, string> = {
    'flyer-1.svg': flyer('#7C3AED', '#0B0B14', 'UNIVERSO'),
    'flyer-2.svg': flyer('#F97316', '#831843', 'SUNSET', 1350),
  }
  await context.route('https://cdn.example.com/flyer-*', route => {
    const name = new URL(route.request().url()).pathname.slice(1)
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: art[name] ?? '' })
  })
}

test('perfil público: las tarjetas con el diseño Flyers retirado se ven como Eventos', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: [FLYERS_MODULE()] }))
  await serveFlyers(context) // después del mock: si no, el mock responde sus propias imágenes de cdn.example.com
  await page.goto('/ana')

  const section = page.getByRole('region', { name: 'Próximas fechas', exact: true })
  await expect(section).toBeVisible()
  await expect(page.locator('.mp-ev-card')).toHaveCount(3)
  await expect(page.locator('.mp-tix-card')).toHaveCount(0)
  const buy = section.getByRole('link', { name: /Entradas: Noche Universo/ })
  await expect(buy).toHaveAttribute('href', 'https://tickets.example.com/universo')
  // El subtítulo era el lugar: aparece en la ficha del evento
  await section.getByRole('button', { name: /^Ver evento: Noche Universo/ }).click()
  const detail = page.getByRole('dialog', { name: 'Noche Universo' })
  await expect(detail).toContainText('Niceto Club · Palermo')
  await expect(page).toHaveURL(/evento=flyer0$/)
})

test('Studio: Tarjetas ya no ofrece el diseño Flyers (lo que quedaba así se edita como carrusel)', async ({ page, context }) => {
  await serveFlyers(context)
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: [FLYERS_MODULE()] }), { signedIn: true })
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Editar Próximas fechas', exact: true }).click()

  const dialog = page.getByRole('dialog')
  const layout = dialog.getByRole('combobox', { name: /Cómo se muestran/ })
  await expect(layout).toHaveValue('carousel')
  await expect(layout.locator('option[value="tickets"]')).toHaveCount(0)
  await expect(dialog.getByLabel('Hora (opcional)')).toHaveCount(0)
})
