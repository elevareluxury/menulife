import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow, projectRow, publishProjectRow } from './support/mockSupabase'

// Proyectos y Portfolio (Identity Fase 5): cada proyecto se publica por su cuenta y tiene su URL.

function seed() {
  const state = createState({
    profiles: [profileRow()],
    profile_modules: [moduleRow({ id: 'm-portfolio', type: 'portfolio', title: 'Trabajos', content: {} })],
  })
  const luna = projectRow({ id: 'pr-luna', title: 'Marca Café Luna', slug: 'cafe-luna', summary: 'Identidad 2025' })
  state.tables.content_objects.push(luna, projectRow({ id: 'pr-draft', title: 'Borrador secreto', slug: 'borrador' }))
  state.tables.content_blocks.push(
    { id: 'b1', content_object_id: 'pr-luna', type: 'heading', position: 10, data: { text: 'El desafío' } },
    { id: 'b2', content_object_id: 'pr-luna', type: 'paragraph', position: 20, data: { text: 'Una marca para un café de barrio.' } },
    { id: 'b3', content_object_id: 'pr-luna', type: 'video', position: 30, data: { url: 'https://youtu.be/dQw4w9WgXcQ' } },
    { id: 'b4', content_object_id: 'pr-luna', type: 'credits', position: 40, data: { items: [{ role: 'Fotografía', name: 'Juan' }] } },
  )
  publishProjectRow(state, luna)
  return state
}

test('el portfolio lleva a la página del proyecto publicado', async ({ page, context }) => {
  await installSupabaseMock(context, seed())
  await page.goto('/ana')

  const portfolio = page.getByRole('region', { name: 'Trabajos' })
  await expect(portfolio.getByRole('link')).toHaveCount(1)
  await expect(portfolio.getByText('Borrador secreto')).toHaveCount(0)
  await portfolio.getByRole('link', { name: /Marca Café Luna/ }).click()

  await expect(page).toHaveURL(/\/ana\/projects\/cafe-luna$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Marca Café Luna' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'El desafío' })).toBeVisible()
  await expect(page.getByText('Una marca para un café de barrio.')).toBeVisible()
  // Video embebido sólo desde YouTube sin cookies, armado con el id
  await expect(page.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  await expect(page.getByRole('region', { name: 'Créditos' })).toContainText('Juan')
  await expect(page).toHaveTitle('Marca Café Luna · Ana Pérez')

  await page.getByRole('link', { name: /Volver al perfil/ }).click()
  await expect(page).toHaveURL(/\/ana$/)
})

test('un proyecto sin publicar no lo ve nadie más que su dueño', async ({ page, context }) => {
  await installSupabaseMock(context, seed())
  await page.goto('/ana/projects/borrador')
  await expect(page.getByRole('heading', { name: 'Este proyecto no está disponible' })).toBeVisible()

  await page.goto('/ana/projects/no-existe')
  await expect(page.getByRole('heading', { name: 'Este proyecto no existe' })).toBeVisible()
})

test('crear un proyecto en Studio, escribirlo y publicarlo', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/studio/projects')
  await page.getByRole('button', { name: 'Nuevo proyecto' }).first().click()
  await page.getByRole('textbox', { name: 'Nombre del proyecto' }).fill('Packaging Miel Sur')
  await page.getByRole('button', { name: 'Crear', exact: true }).click()

  await expect(page).toHaveURL(/\/studio\/projects\/.+/)
  const created = state.tables.content_objects.find(o => o.title === 'Packaging Miel Sur')!
  expect(created.slug).toBe('packaging-miel-sur')
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Agregar bloque' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Texto' }).click()
  await page.getByRole('textbox', { name: 'Texto' }).fill('Etiquetas para frascos de miel.')
  await expect.poll(() => state.tables.content_blocks.find(b => b.content_object_id === created.id)?.data)
    .toEqual({ text: 'Etiquetas para frascos de miel.' })

  // Guardar no publica
  const visitor = await context.browser()!.newContext()
  await installSupabaseMock(visitor, state)
  const vPage = await visitor.newPage()
  await vPage.goto('/ana/projects/packaging-miel-sur')
  await expect(vPage.getByRole('heading', { name: 'Este proyecto no está disponible' })).toBeVisible()

  await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(page.getByText('Proyecto publicado.')).toBeVisible()
  await expect(page.getByText('Publicado', { exact: true })).toBeVisible()

  await vPage.reload()
  await expect(vPage.getByRole('heading', { level: 1, name: 'Packaging Miel Sur' })).toBeVisible()
  await expect(vPage.getByText('Etiquetas para frascos de miel.')).toBeVisible()
  // El portfolio lo suma sin volver a publicar el perfil
  await vPage.goto('/ana')
  await expect(vPage.getByRole('region', { name: 'Trabajos' }).getByRole('link')).toHaveCount(2)
  await visitor.close()
})
