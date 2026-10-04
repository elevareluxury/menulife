import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, profileRow, type MockState } from './support/mockSupabase'
import { MODULE_FIXTURES } from './support/moduleFixtures'

// Editor de escritorio de 3 paneles (Identity Fase 11): Capas | vista previa con selección directa | Propiedades.

test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })

async function open(page: Page, context: Parameters<typeof installSupabaseMock>[0]): Promise<MockState> {
  const state = createState({ profiles: [profileRow()], profile_modules: MODULE_FIXTURES.map(f => structuredClone(f.row)) })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/editor')
  await expect(page.getByRole('navigation', { name: 'Capas' })).toBeVisible()
  return state
}

const canvas = (page: Page) => page.getByRole('region', { name: 'Vista previa del editor' })
const inspector = (page: Page) => page.getByRole('complementary', { name: 'Propiedades' })
const layers = (page: Page) => page.getByRole('navigation', { name: 'Capas' })

test('un clic en la vista previa elige el módulo, sin abrir el link, y se edita al costado', async ({ page, context }) => {
  const state = await open(page, context)
  await expect(inspector(page)).toContainText('Elegí un bloque')

  await canvas(page).getByRole('link', { name: /Mi portfolio/ }).click()
  await expect(page).toHaveURL(/\/studio\/editor$/)
  const form = inspector(page).getByRole('region', { name: 'Editar link' })
  await expect(form.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue('Mi portfolio')
  // Lo elegido se marca también en Capas
  await expect(layers(page).getByRole('button', { name: /^Mi portfolio/ })).toHaveAttribute('aria-current', 'true')

  await form.getByRole('textbox', { name: 'Título', exact: true }).fill('Mi web')
  await form.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(form.getByRole('status')).toHaveText('Guardado')
  await expect.poll(() => state.tables.profile_modules.find(m => m.id === 'm-link')?.title).toBe('Mi web')
  await expect(canvas(page).getByRole('link', { name: /Mi web/ })).toBeVisible()
})

test('el encabezado se edita desde la vista previa y se ve al instante', async ({ page, context }) => {
  const state = await open(page, context)
  await canvas(page).getByRole('heading', { level: 1, name: 'Ana Pérez' }).click()
  const form = inspector(page).getByRole('region', { name: 'Identidad' })
  await form.getByRole('textbox', { name: 'Nombre' }).fill('Ana P. Estudio')
  await expect(canvas(page).getByRole('heading', { level: 1, name: 'Ana P. Estudio' })).toBeVisible()
  await expect.poll(() => state.tables.profiles[0].display_name).toBe('Ana P. Estudio')
})

test('en la fila de redes, el ícono tocado elige su propio módulo', async ({ page, context }) => {
  await open(page, context)
  await canvas(page).getByRole('link', { name: 'Instagram' }).click()
  await expect(inspector(page).getByRole('region', { name: 'Editar red social' })).toBeVisible()
})

test('todo se puede hacer con el teclado desde Capas: elegir, ocultar y agregar', async ({ page, context }) => {
  const state = await open(page, context)

  await layers(page).getByRole('button', { name: /^Sobre mí/ }).focus()
  await page.keyboard.press('Enter')
  await expect(inspector(page).getByRole('region', { name: 'Editar texto' })).toBeVisible()

  // Ocultar desde Capas: deja de verse en la vista previa
  await expect(canvas(page).getByText('Sobre mí')).toBeVisible()
  await layers(page).getByRole('button', { name: 'Ocultar Sobre mí' }).press('Enter')
  await expect(canvas(page).getByText('Sobre mí')).toHaveCount(0)
  await expect.poll(() => state.tables.profile_modules.find(m => m.id === 'm-text')?.visibility).toBe('hidden')

  // Agregar un módulo: se edita en Propiedades y queda elegido
  await layers(page).getByRole('button', { name: 'Agregar módulo' }).press('Enter')
  await page.getByRole('dialog').getByRole('button', { name: /^Texto/ }).press('Enter')
  const form = inspector(page).getByRole('region', { name: 'Agregar texto' })
  await form.getByRole('textbox', { name: 'Título', exact: true }).fill('Novedades')
  await form.getByRole('textbox', { name: 'Texto', exact: true }).fill('Abrimos el estudio en marzo.')
  await form.getByRole('button', { name: 'Agregar', exact: true }).last().press('Enter')
  await expect(inspector(page).getByRole('region', { name: 'Editar texto' })).toBeVisible()
  await expect(layers(page).getByRole('button', { name: /^Novedades/ })).toHaveAttribute('aria-current', 'true')
  await expect(canvas(page).getByText('Abrimos el estudio en marzo.')).toBeVisible()
  await expect.poll(() => state.tables.profile_modules.some(m => m.title === 'Novedades')).toBe(true)
})
