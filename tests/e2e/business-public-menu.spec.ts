import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock } from './support/mockSupabase'

// Menú público de Mycen Business sin cuenta: la base deja leer sólo las columnas públicas de `restaurants`
// (20261108000001; el mock responde "permission denied" a `select=*` o a una columna privada, igual que la base).
// Las pantallas siguen andando y nada privado del negocio llega al navegador.

const PRIVATE = { email: 'duena@cafe.example', phone: '+54 9 11 4444 0000', address: 'Calle Secreta 123', notes: 'debe dos meses',
  owner_id: 'u-duena', plan: 'os_full', subscription_status: 'past_due', daily_sales_goal: 50000 }

function seed() {
  return createState({
    restaurants: [{
      id: 'r-cafe', slug: 'cafe', name: 'Café Luna', is_active: true, business_type: 'gastronomy', logo_url: null,
      cover_image_url: null, description: 'Café de especialidad', default_language: 'ES', allow_language_switch: true,
      social_links: { whatsapp: '+54 9 11 5555 0000' }, menu_accent_color: '#F4705A', reservations_enabled: true,
      reservations_time_slots: ['20:00'], ...PRIVATE,
    }],
    menu_sections: [{ id: 's-1', restaurant_id: 'r-cafe', name: 'Cafetería', name_en: null, description: null,
      description_en: null, sort_order: 0, is_active: true }],
    menu_items: [{ id: 'i-1', restaurant_id: 'r-cafe', section_id: 's-1', name: 'Flat white', name_en: null,
      description: 'Doble shot', description_en: null, price_ars: 4500, price_usd: 4, image_url: '', video_url: null,
      is_available: true, sort_order: 0, allergens: [], tags: [] }],
    product_categories: [], products: [],
  })
}

test('el menú /r/:slug carga sin cuenta y no recibe datos privados del negocio', async ({ page, context }) => {
  await installSupabaseMock(context, seed())
  const restaurantResponses: string[] = []
  page.on('response', async res => {
    if (res.url().includes('/rest/v1/restaurants')) restaurantResponses.push(`${res.status()} ${await res.text()}`)
  })

  await page.goto('/r/cafe')

  await expect(page.getByText('Café Luna').first()).toBeVisible()
  await expect(page.getByText('Flat white').first()).toBeVisible()
  expect(restaurantResponses.length).toBeGreaterThan(0)
  for (const body of restaurantResponses) {
    expect(body.startsWith('200 ')).toBe(true)
    for (const value of Object.values(PRIVATE)) expect(body).not.toContain(String(value))
  }
})

test('reservas y catálogo también cargan sin cuenta', async ({ page, context }) => {
  await installSupabaseMock(context, seed())

  await page.goto('/r/cafe/reservar')
  await expect(page.getByText('Café Luna').first()).toBeVisible()

  await page.goto('/catalogo/cafe')
  await expect(page.getByText('Café Luna').first()).toBeVisible()
  await expect(page.getByText(PRIVATE.email)).toHaveCount(0)
})
