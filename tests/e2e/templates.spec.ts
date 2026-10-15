import { expect, test, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Plantillas de Identity: suman módulos VACÍOS y OCULTOS ("Completá esto"). Nada inventado llega a la página:
// sólo se muestra lo que la persona completó y guardó. Nunca borra ni repite los únicos que ya están.

async function noSerious(page: Page, where: string) {
  const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
  const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map(v => `${where} · ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
}

for (const scheme of ['dark', 'light'] as const) {
  test(`plantilla Músico/a en Studio → completar uno → publicar → sólo se ve lo completo (${scheme})`, async ({ page, context, browser }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    const state = createState({
      profiles: [profileRow({ theme: { layout: 'credencial', mode: 'universo', accent: 'plasma' } })],
      profile_modules: [
        moduleRow({ id: 'm-link', position: 10 }),
        moduleRow({ id: 'm-form', type: 'contact_form', title: 'Escribime', content: {}, position: 20 }),
      ],
    })
    await installSupabaseMock(context, state, { signedIn: true })
    await page.goto('/studio/modules')

    // ── Elegir la plantilla ──
    await page.getByRole('button', { name: 'Usar una plantilla' }).click()
    const picker = page.getByRole('dialog', { name: 'Elegí una plantilla' })
    for (const name of ['Músico/a', 'Creador/a de contenido', 'Profesional / freelance', 'Negocio local', 'Personal']) {
      await expect(picker.getByRole('button', { name: `Ver la plantilla ${name}` })).toBeVisible()
    }
    await noSerious(page, 'plantillas')
    await picker.getByRole('button', { name: 'Ver la plantilla Músico/a' }).click()

    const detail = page.getByRole('dialog', { name: 'Músico/a' })
    const willAdd = detail.getByRole('region', { name: 'Se van a agregar' })
    await expect(willAdd.getByText('Escuchá en')).toBeVisible()
    await expect(willAdd.getByText('Red social')).toBeVisible()
    // El formulario ya estaba: no se repite
    await expect(detail.getByRole('region', { name: 'Ya los tenés (no se repiten)' }).getByText('Formulario de contacto')).toBeVisible()
    await expect(willAdd.getByText('Formulario de contacto')).toHaveCount(0)
    await detail.getByRole('switch', { name: 'Usar también su estructura y su acento' }).click()
    await noSerious(page, 'detalle de la plantilla')
    await detail.getByRole('button', { name: 'Agregar 6 módulos' }).click()
    await expect(detail).toHaveCount(0)

    // ── Se agregaron vacíos, ocultos y marcados; nada se borró ──
    const added = state.tables.profile_modules.filter(m => (m.config as { template?: string }).template === 'musician')
    expect(added.map(m => m.type)).toEqual(['listen_on', 'latest_video', 'social', 'cards', 'support', 'subscribe'])
    for (const m of added) expect(m).toMatchObject({ visibility: 'hidden', title: null, content: {} })
    expect(state.tables.profile_modules.filter(m => m.type === 'contact_form')).toHaveLength(1)
    expect(state.tables.profile_modules.find(m => m.id === 'm-link')).toMatchObject({ visibility: 'active', deleted_at: null })
    await expect.poll(() => state.tables.profiles[0].theme).toMatchObject({ layout: 'portada', accent: 'nebulosa' })

    await expect(page.getByText('Completá tus módulos')).toBeVisible()
    await expect(page.getByText(/Te quedan 6 módulos de la plantilla/)).toBeVisible()
    await expect(page.getByText('Completá esto')).toHaveCount(6)
    await expect(page.getByRole('status').filter({ hasText: 'Se agregaron 6 módulos para completar' })).toBeAttached()
    await noSerious(page, 'módulos con pendientes')

    // Aplicar otra vez no apila vacíos
    await page.getByRole('button', { name: 'Usar una plantilla' }).click()
    await page.getByRole('button', { name: 'Ver la plantilla Músico/a' }).click()
    await expect(page.getByText('Ya tenés todos los módulos de esta plantilla.')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()

    // ── Completar uno: la red social ──
    await page.getByRole('button', { name: 'Completar Red social' }).click()
    const editor = page.getByRole('dialog', { name: 'Editar red social' })
    await expect(editor.getByText('Este módulo vino de una plantilla.', { exact: false })).toBeVisible()
    await editor.getByRole('combobox', { name: 'Red' }).selectOption('instagram')
    await editor.getByRole('textbox', { name: 'Usuario o URL' }).fill('@ana.musica')
    await editor.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(editor).toHaveCount(0)
    const social = state.tables.profile_modules.find(m => m.type === 'social')!
    expect(social).toMatchObject({ visibility: 'active', content: { network: 'instagram', url: 'https://instagram.com/ana.musica' } })
    expect((social.config as Record<string, unknown>).template).toBeUndefined()
    await expect(page.getByText(/Te quedan 5 módulos de la plantilla/)).toBeVisible()

    // Un pendiente no se puede mostrar vacío: el ojo abre el editor
    await page.getByRole('button', { name: 'Completar Escuchá en' }).click()
    await expect(page.getByRole('dialog', { name: 'Editar escuchá en' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    expect(state.tables.profile_modules.find(m => m.type === 'listen_on')).toMatchObject({ visibility: 'hidden' })

    // ── Publicar ──
    await page.getByRole('button', { name: 'Publicar cambios' }).click()
    await expect(page.getByText(/Publicado · versión/)).toBeVisible()

    // ── Visitante: sólo lo completo ──
    const visitor = await browser.newContext({ colorScheme: scheme, reducedMotion: 'reduce' })
    await installSupabaseMock(visitor, state)
    const vPage = await visitor.newPage()
    await vPage.goto('/ana')
    await expect(vPage.locator('main.mp-root')).toHaveClass(/mp-layout-portada/)
    await expect(vPage.locator('a[href="https://instagram.com/ana.musica"]').first()).toBeVisible()
    await expect(vPage.locator('a[href="https://ana.design"]').first()).toBeVisible()
    for (const hidden of ['Escuchá en', 'Apoyame', 'Suscribite']) await expect(vPage.getByText(hidden, { exact: true })).toHaveCount(0)
    const published = state.tables.profile_versions[state.tables.profile_versions.length - 1].snapshot as { modules: { type: string }[] }
    expect(published.modules.map(m => m.type).sort()).toEqual(['contact_form', 'link', 'social'])
    await noSerious(vPage, 'perfil público')
    await visitor.close()
  })
}

test('onboarding: el propósito suma los módulos de su plantilla, ocultos, sin repetir lo cargado', async ({ page, context }) => {
  const state = createState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio')
  const heading = page.locator('h1.st-title, h1.ob-huella-title')
  const next = page.getByRole('button', { name: 'Continuar', exact: true })
  await page.getByRole('textbox', { name: 'Nombre visible' }).fill('Bruno Díaz'); await next.click()
  await expect(page.getByText(/disponible/i).first()).toBeVisible(); await next.click()
  await page.getByRole('radio', { name: /Negocio/ }).click(); await next.click()
  await page.getByRole('button', { name: 'Saltar' }).click()
  await page.getByRole('textbox', { name: 'Instagram' }).fill('@bruno.cafe')
  await next.click()
  await expect(heading).toHaveText('Esta es tu huella Mycen')

  const mods = state.tables.profile_modules
  // Lo que cargó la persona, visible; el resto de la plantilla Negocio local, oculto y sin repetir la red social
  expect(mods.filter(m => m.type === 'social')).toHaveLength(1)
  expect(mods.find(m => m.type === 'social')).toMatchObject({ visibility: 'active' })
  expect(mods.find(m => m.type === 'contact_form')).toMatchObject({ visibility: 'active' })
  const pending = mods.filter(m => (m.config as { template?: string }).template === 'business')
  expect(pending.map(m => m.type)).toEqual(['featured_action', 'hours', 'location', 'contact', 'gallery', 'testimonials'])
  for (const m of pending) expect(m).toMatchObject({ visibility: 'hidden', content: {} })

  await next.click()
  await expect(heading).toHaveText('Así se ve tu perfil')
  await page.getByRole('button', { name: 'Publicar perfil' }).click()
  await expect(heading).toHaveText('Perfil publicado')
  await expect(page.getByText('En Studio te esperan 6 módulos más para completar.', { exact: false })).toBeVisible()
  const snap = state.tables.profile_versions[state.tables.profile_versions.length - 1].snapshot as { modules: { type: string }[] }
  expect(snap.modules.map(m => m.type).sort()).toEqual(['contact_form', 'social'])
})
