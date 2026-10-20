import { expect, test, type BrowserContext } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Tarjetas · diseño Flyers: flyers en formato historia que se deslizan de a uno, con talón de entrada (fecha, hora,
// lugar y botón "Entradas"). En Studio, cada subida de imagen dice el tamaño recomendado en px.

const flyer = (from: string, to: string, text: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#g)"/>
  <text x="80" y="1600" font-family="sans-serif" font-weight="800" font-size="150" fill="#fff">${text}</text>
</svg>`

const FLYERS_MODULE = () => moduleRow({
  id: 'm-flyers', type: 'cards', title: 'Próximas fechas', position: 5,
  content: {
    layout: 'tickets',
    items: [
      { image_url: 'https://cdn.example.com/flyer-1.svg', title: 'Noche Universo', subtitle: 'Niceto Club · Palermo', date: '2026-11-14', time: '23:30', url: 'https://tickets.example.com/universo' },
      { image_url: 'https://cdn.example.com/flyer-2.svg', title: 'Sunset Sessions', subtitle: 'Terraza Mirador', date: '2026-11-22', time: '18:00', url: 'https://tickets.example.com/sunset' },
      { title: 'Fiesta de fin de año', subtitle: 'Lugar a confirmar', date: '2026-12-31' },
    ],
  },
})

async function serveFlyers(context: BrowserContext) {
  const art: Record<string, string> = {
    'flyer-1.svg': flyer('#7C3AED', '#0B0B14', 'UNIVERSO'),
    'flyer-2.svg': flyer('#F97316', '#831843', 'SUNSET'),
  }
  await context.route('https://cdn.example.com/flyer-*', route => {
    const name = new URL(route.request().url()).pathname.slice(1)
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: art[name] ?? '' })
  })
}

test('perfil público: los flyers se deslizan como entradas, con fecha, hora y botón Entradas', async ({ page, context }) => {
  await serveFlyers(context)
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: [FLYERS_MODULE()] }))
  await page.goto('/ana')

  await expect(page.getByRole('region', { name: 'Próximas fechas', exact: true })).toBeVisible()
  const cards = page.locator('.mp-tix-card')
  await expect(cards).toHaveCount(3)
  await expect(cards.first()).toHaveClass(/is-active/)
  await expect(cards.first()).toContainText('23:30')
  await expect(cards.first()).toContainText('Niceto Club')

  const ticket = page.getByRole('link', { name: /Noche Universo/ })
  await expect(ticket).toHaveAttribute('href', 'https://tickets.example.com/universo')
  await expect(ticket).toContainText('Entradas')
  // Sin link: tarjeta sin botón; sin imagen: el título sobre el color de acento
  await expect(cards.nth(2)).not.toContainText('Entradas')
  await expect(cards.nth(2).locator('.mp-tix-blank')).toHaveText('Fiesta de fin de año')

  // Los puntos llevan a cada flyer
  await page.getByRole('button', { name: /^2 \/ 3/ }).click()
  await expect(cards.nth(1)).toHaveClass(/is-active/)
  await expect(page.getByRole('button', { name: /^2 \/ 3/ })).toHaveAttribute('aria-current', 'true')
})

test('Studio: el diseño Flyers pide el flyer en formato historia y muestra el tamaño recomendado', async ({ page, context }) => {
  await serveFlyers(context)
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: [FLYERS_MODULE()] }), { signedIn: true })
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Editar Próximas fechas', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('select').first()).toHaveValue('tickets')
  await expect(dialog.getByText('Recomendado: 1080 × 1920 px').first()).toBeVisible()
  await expect(dialog.getByLabel('Hora (opcional)').first()).toHaveValue('23:30')
  await expect(dialog.getByLabel('Link de entradas (opcional)').first()).toHaveValue('https://tickets.example.com/universo')
})
