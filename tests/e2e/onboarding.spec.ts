import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock } from './support/mockSupabase'

// V1 · etapa 07: una persona nueva publica su perfil en menos de 3 minutos, un paso por pantalla.
// El camino mínimo (saltando lo opcional) no tiene más de 7 pantallas.

test('registro → onboarding completo → perfil publicado (camino mínimo, cronometrado)', async ({ page, context }) => {
  const state = createState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const started = Date.now()
  await page.goto('/studio')

  const screens: string[] = []
  const heading = page.locator('h1.st-title, h1.ob-huella-title')
  const continueBtn = page.getByRole('button', { name: 'Continuar', exact: true })

  // 1. Nombre visible
  await expect(heading).toHaveText('¿Cómo te llamás?'); screens.push(await heading.innerText())
  await page.getByRole('textbox', { name: 'Nombre visible' }).fill('Lucía Gómez')
  await continueBtn.click()

  // 2. Dirección: se sugiere a partir del nombre
  await expect(heading).toHaveText('Elegí tu dirección'); screens.push(await heading.innerText())
  await expect(page.getByRole('textbox', { name: /username/i })).toHaveValue('lucia-gomez')
  await expect(page.getByText(/disponible/i).first()).toBeVisible()
  await continueBtn.click()

  // 3. Para qué es: define la estructura
  await expect(heading).toHaveText('¿Para qué es tu perfil?'); screens.push(await heading.innerText())
  await page.getByRole('radio', { name: /Artista o creador/ }).click()
  await continueBtn.click()
  await expect(heading).toHaveText('Tu foto')
  expect(state.tables.profiles).toHaveLength(1)
  expect(state.tables.profiles[0]).toMatchObject({ username: 'lucia-gomez', display_name: 'Lucía Gómez', purpose: 'creator' })
  expect(state.tables.profiles[0].theme).toMatchObject({ layout: 'portada', mode: 'universo', accent: 'plasma' })
  expect(state.tables.profile_modules.map(m => m.type)).toEqual(['contact_form'])

  // 4. Foto: se saltea
  screens.push(await heading.innerText())
  await page.getByRole('button', { name: 'Saltar' }).click()

  // 5. WhatsApp e Instagram: arman la acción principal y las redes
  await expect(heading).toHaveText('¿Cómo te contactan?'); screens.push(await heading.innerText())
  await page.getByRole('textbox', { name: 'WhatsApp' }).fill('+54 9 11 5555 0000')
  await page.getByRole('textbox', { name: 'Instagram' }).fill('@lucia.gomez')
  await continueBtn.click()
  await expect.poll(() => state.tables.profiles[0].primary_action).toMatchObject({ kind: 'whatsapp', url: 'https://wa.me/5491155550000' })
  expect(state.tables.profile_modules.some(m => m.type === 'social' && (m.content as { url: string }).url === 'https://instagram.com/lucia.gomez')).toBe(true)

  // 6. El momento de la huella
  await expect(heading).toHaveText('Esta es tu huella Mycen'); screens.push(await heading.innerText())
  await expect(page.getByText('Nadie más tiene una igual.')).toBeVisible()
  await expect(page.locator('.ob-huella svg[aria-hidden="true"]')).toBeAttached()
  await continueBtn.click()

  // 7. Vista previa y publicar
  await expect(heading).toHaveText('Así se ve tu perfil'); screens.push(await heading.innerText())
  await expect(page.locator('.st-phone main.mp-root')).toHaveClass(/mp-layout-portada/)
  await page.getByRole('button', { name: 'Publicar perfil' }).click()
  await expect(heading).toHaveText('Perfil publicado')
  await expect.poll(() => state.tables.profiles[0].status).toBe('published')
  expect(state.tables.profiles[0].onboarding_step).toBe(5)
  await expect(page.getByRole('button', { name: 'Copiar link' })).toBeVisible()

  expect(screens).toHaveLength(7)
  expect(Date.now() - started).toBeLessThan(3 * 60 * 1000)

  // Sin nada de Mycen Business en el camino
  await expect(page.getByText(/Business|restaurante|menú digital/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Ir a Studio' }).click()
  await expect(page).toHaveURL(/\/studio/)
  await expect(page.getByRole('heading', { level: 1, name: 'Ir a Studio' })).toHaveCount(0)
})

test('se retoma donde quedó: un perfil creado sin terminar vuelve a la foto', async ({ page, context }) => {
  const { profileRow } = await import('./support/mockSupabase')
  const state = createState({ profiles: [profileRow({ status: 'draft', onboarding_step: 3, theme: { layout: 'bento' } })] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio')
  await expect(page.locator('h1.st-title')).toHaveText('Tu foto')
})
