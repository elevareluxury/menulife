import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow, projectRow, type MockState } from './support/mockSupabase'

// Editor móvil (Identity Fase 6): reordenar arrastrando, con el teclado o desde el menú; duplicar;
// vista previa a pantalla completa. Todo tiene que poder hacerse sin mouse.

function seed(): MockState {
  return createState({
    profiles: [profileRow()],
    profile_modules: [
      moduleRow({ id: 'm-1', title: 'Portfolio', position: 10 }),
      moduleRow({ id: 'm-2', title: 'Tienda', position: 20, content: { url: 'https://tienda.ana.design' } }),
      moduleRow({ id: 'm-3', title: 'Blog', position: 30, content: { url: 'https://blog.ana.design' } }),
    ],
  })
}

const order = (state: MockState) => state.tables.profile_modules
  .filter(m => m.deleted_at == null)
  .sort((a, b) => Number(a.position) - Number(b.position))
  .map(m => m.title)

const titles = (page: Page) => page.locator('.st-module-title').allInnerTexts()

/** Lo que anuncia el lector de pantalla mientras se arrastra (región en vivo de dnd-kit) */
const live = (page: Page) => page.locator('[aria-live="assertive"]')

/** Arrastre con el teclado: espacio toma, cada flecha mueve un lugar, espacio suelta. */
async function keyboardMove(page: Page, handleName: string, key: 'ArrowUp' | 'ArrowDown', steps: number, expectAt: (step: number) => string) {
  const handle = page.getByRole('button', { name: handleName })
  await handle.focus()
  await page.keyboard.press('Space')
  await expect(handle).toHaveAttribute('aria-pressed', 'true')
  for (let i = 1; i <= steps; i++) {
    await page.keyboard.press(key)
    await expect(live(page)).toContainText(expectAt(i))
  }
  await page.keyboard.press('Space')
  await expect(handle).not.toHaveAttribute('aria-pressed', 'true')
}

test('reordenar con el teclado: tomar, mover con las flechas y soltar', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  await keyboardMove(page, 'Mover Blog', 'ArrowUp', 2, step => `Blog en la posición ${3 - step} de 3.`)
  await expect(live(page)).toContainText('Blog quedó en la posición 1 de 3.')

  await expect.poll(() => titles(page)).toEqual(['Blog', 'Portfolio', 'Tienda'])
  await expect.poll(() => order(state)).toEqual(['Blog', 'Portfolio', 'Tienda'])
})

test('Escape cancela el arrastre con el teclado', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  const handle = page.getByRole('button', { name: 'Mover Portfolio' })
  await handle.focus()
  await page.keyboard.press('Space')
  await expect(handle).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(live(page)).toContainText('Portfolio en la posición 2 de 3.')
  await page.keyboard.press('Escape')
  await expect(live(page)).toContainText('Se canceló: Portfolio quedó donde estaba.')
  await expect.poll(() => titles(page)).toEqual(['Portfolio', 'Tienda', 'Blog'])
  expect(state.writes.filter(w => w.table === 'profile_modules')).toHaveLength(0)
})

test('reordenar arrastrando la manija', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  const from = await page.getByRole('button', { name: 'Mover Portfolio' }).boundingBox()
  const to = await page.getByRole('button', { name: 'Mover Blog' }).boundingBox()
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
  await page.mouse.down()
  await page.mouse.move(from!.x + from!.width / 2, to!.y + to!.height / 2 + 10, { steps: 12 })
  await page.mouse.up()

  await expect.poll(() => order(state)).toEqual(['Tienda', 'Blog', 'Portfolio'])
})

test('el menú ⋯ se usa con el teclado: bajar y duplicar', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')

  // Abrir con Enter, recorrer con flechas, elegir con Enter
  await page.getByRole('button', { name: 'Opciones de Portfolio' }).focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Opciones de Portfolio' })
  await expect(menu.getByRole('menuitem', { name: 'Editar' })).toBeFocused()
  await page.keyboard.press('ArrowDown') // Subir (deshabilitado: se saltea)
  await expect(menu.getByRole('menuitem', { name: 'Bajar' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Opciones de Portfolio' })).toBeFocused()
  await expect.poll(() => order(state)).toEqual(['Tienda', 'Portfolio', 'Blog'])

  // Escape cierra sin hacer nada
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)

  // Duplicar: queda justo debajo del original, con el mismo contenido
  await page.keyboard.press('Enter')
  await menu.getByRole('menuitem', { name: 'Duplicar' }).focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => order(state)).toEqual(['Tienda', 'Portfolio', 'Portfolio (copia)', 'Blog'])
  const copy = state.tables.profile_modules.find(m => m.title === 'Portfolio (copia)')!
  expect(copy.content).toEqual(state.tables.profile_modules.find(m => m.id === 'm-1')!.content)
  await expect(page.getByText('Portfolio duplicado')).toBeAttached()
})

test('vista previa a pantalla completa: se abre y se cierra con el teclado', async ({ page, context }) => {
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/studio/preview')

  const open = page.getByRole('button', { name: 'Pantalla completa' })
  await open.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Vista previa' })
  await expect(dialog.getByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Salir de pantalla completa' })).toBeFocused()
  await expect(page.locator('.st-bottom-nav')).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(open).toBeFocused()
})

test('bloques de un proyecto: reordenar con el teclado y duplicar desde el menú', async ({ page, context }) => {
  const state = seed()
  state.tables.content_objects.push(projectRow({ id: 'pr-1', title: 'Café Luna', slug: 'cafe-luna' }))
  state.tables.content_blocks.push(
    { id: 'b-1', content_object_id: 'pr-1', type: 'paragraph', position: 10, data: { text: 'Primero' } },
    { id: 'b-2', content_object_id: 'pr-1', type: 'paragraph', position: 20, data: { text: 'Segundo' } },
  )
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/projects/pr-1')

  await keyboardMove(page, 'Mover Texto: Segundo', 'ArrowUp', 1, () => 'Texto: Segundo en la posición 1 de 2.')

  const saved = () => state.tables.content_blocks
    .filter(b => b.content_object_id === 'pr-1')
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(b => (b.data as { text: string }).text)
  await expect.poll(saved).toEqual(['Segundo', 'Primero'])

  await page.getByRole('button', { name: 'Opciones de Texto · Bloque 2' }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('menuitem', { name: 'Duplicar' }).focus()
  await page.keyboard.press('Enter')
  await expect.poll(saved).toEqual(['Segundo', 'Primero', 'Primero'])
})
