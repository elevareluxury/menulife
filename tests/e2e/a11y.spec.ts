import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock } from './support/mockSupabase'

// V1 · etapa 15: accesibilidad automática del onboarding (cada pantalla) en los dos temas del celular.
// Perfil público, Studio y "Mi día" ya pasan axe en profile-layouts, appearance, studio-theme y life-theme.
// Se exige cero violaciones serias o críticas.

async function noSerious(page: Page, where: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map(v => `${where} · ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
}

for (const scheme of ['dark', 'light'] as const) {
  test(`onboarding (${scheme}): cada pantalla pasa axe`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await installSupabaseMock(context, createState(), { signedIn: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/studio')
    const heading = page.locator('h1.st-title, h1.ob-huella-title')
    const next = page.getByRole('button', { name: 'Continuar', exact: true })

    await expect(heading).toHaveText('¿Cómo te llamás?'); await noSerious(page, 'nombre')
    await page.getByRole('textbox', { name: 'Nombre visible' }).fill('Lucía Gómez'); await next.click()
    await expect(heading).toHaveText('Elegí tu dirección')
    await expect(page.getByText(/disponible/i).first()).toBeVisible(); await noSerious(page, 'dirección')
    await next.click()
    await expect(heading).toHaveText('¿Para qué es tu perfil?'); await noSerious(page, 'para qué')
    await page.getByRole('radio', { name: /Artista o creador/ }).click(); await next.click()
    await expect(heading).toHaveText('Tu foto'); await noSerious(page, 'foto')
    await page.getByRole('button', { name: 'Saltar' }).click()
    await expect(heading).toHaveText('¿Cómo te contactan?'); await noSerious(page, 'contacto')
    await next.click()
    await expect(heading).toHaveText('Esta es tu huella Mycen'); await noSerious(page, 'huella')
    await next.click()
    await expect(heading).toHaveText('Así se ve tu perfil'); await noSerious(page, 'vista previa')
    await page.getByRole('button', { name: 'Publicar perfil' }).click()
    await expect(heading).toHaveText('Perfil publicado'); await noSerious(page, 'publicado')
  })
}
