import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow, spaceRow, type MockState } from './support/mockSupabase'

// Mis Spaces (Identity Fase 10): varios Spaces por cuenta, el principal en /ana y los demás en /ana/{slug}.

function seed(extra: Partial<MockState['tables']> = {}, history: Record<string, string> = {}): MockState {
  return createState({
    profiles: [profileRow(), spaceRow('estudio', { display_name: 'Estudio Ana', descriptor: 'Branding' })],
    profile_modules: [
      moduleRow({ id: 'm-main', title: 'Mi portfolio' }),
      moduleRow({ id: 'm-st', profile_id: 'p-estudio', title: 'Reservá una sesión', content: { url: 'https://cal.com/ana' } }),
    ],
    ...extra,
  }, history)
}

test('un Space secundario se ve en /ana/estudio, con su contenido y su analítica', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state)
  await page.goto('/ana/estudio?src=ig')

  await expect(page.getByRole('heading', { level: 1, name: 'Estudio Ana' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Reservá una sesión/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Mi portfolio/ })).toHaveCount(0)
  await expect.poll(() => state.rpcCalls.find(c => c.fn === 'track_profile_event')?.args)
    .toMatchObject({ p_profile_id: 'p-estudio', p_event_type: 'view', p_source: 'ig' })

  // El principal sigue igual
  await page.goto('/ana')
  await expect(page.getByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeVisible()

  // Un Space que no existe, o una dirección reservada
  await page.goto('/ana/nada')
  await expect(page.getByRole('heading', { name: 'Este perfil no existe' })).toBeVisible()
})

test('con el username viejo del principal, /ana-old/estudio redirige a /ana/estudio', async ({ page, context }) => {
  await installSupabaseMock(context, seed({}, { 'ana-old': 'p-ana' }))
  await page.goto('/ana-old/estudio?src=qr')
  await expect(page).toHaveURL(/\/ana\/estudio\?src=qr$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Estudio Ana' })).toBeVisible()
})

test('un Space en borrador no lo ve nadie más que su dueño', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow(), spaceRow('estudio', { status: 'draft' })] })
  await installSupabaseMock(context, state)
  await page.goto('/ana/estudio')
  await expect(page.getByRole('heading', { name: 'Este perfil no está disponible' })).toBeVisible()
})

test('crear un Space desde Studio, editarlo y volver al principal', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/spaces')

  await expect(page.getByRole('status').filter({ hasText: '1 de 5 Spaces' })).toBeVisible()
  await page.getByRole('button', { name: 'Nuevo Space' }).click()
  const drawer = page.getByRole('dialog', { name: 'Nuevo Space' })
  await drawer.getByRole('textbox', { name: 'Nombre' }).fill('Café Luna Estudio')
  // La dirección sale del nombre, y se avisa si está reservada
  await expect(drawer.getByRole('textbox', { name: 'Dirección' })).toHaveValue('cafe-luna-estudio')
  await drawer.getByRole('textbox', { name: 'Dirección' }).fill('projects')
  await expect(drawer.getByText('Esa dirección está reservada.')).toBeVisible()
  await drawer.getByRole('textbox', { name: 'Dirección' }).fill('cafe-luna')
  await drawer.getByRole('combobox', { name: 'Tipo' }).selectOption('brand')
  await drawer.getByRole('button', { name: 'Crear Space' }).click()

  await expect(page).toHaveURL(/\/studio\/identity$/)
  const created = state.tables.profiles.find(p => p.space_slug === 'cafe-luna')
  expect(created).toMatchObject({ username: null, is_primary: false, display_name: 'Café Luna Estudio', purpose: 'brand', status: 'draft' })

  // Studio queda editando el Space nuevo, con su dirección
  const switcher = page.getByRole('combobox', { name: 'Space que estás editando' })
  await expect(switcher).toHaveValue(String(created!.id))
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Café Luna')
  await expect.poll(() => state.tables.profiles.find(p => p.id === created!.id)?.display_name).toBe('Café Luna')
  expect(state.tables.profiles.find(p => p.id === 'p-ana')?.display_name).toBe('Ana Pérez')
  await page.goto('/studio/exchange')
  await expect(page.locator('.st-url').first()).toHaveText(/\/ana\/cafe-luna$/)

  // Volver al principal
  await page.getByRole('combobox', { name: 'Space que estás editando' }).selectOption('p-ana')
  await expect(page.locator('.st-url').first()).toHaveText(/\/ana$/)
})

test('duplicar, archivar y restaurar, con el tope de 5 Spaces', async ({ page, context }) => {
  const state = seed({
    profiles: [profileRow(), spaceRow('estudio'), spaceRow('tienda'), spaceRow('evento'), spaceRow('prensa', { display_name: 'Prensa' })],
  })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/spaces')

  await expect(page.getByRole('status').filter({ hasText: '5 de 5 Spaces' })).toContainText('Archivá uno para crear otro')
  await expect(page.getByRole('button', { name: 'Nuevo Space' })).toBeDisabled()

  // Archivar "Prensa" libera un lugar
  const prensa = page.getByRole('listitem', { name: 'Prensa' })
  await prensa.getByRole('button', { name: 'Acciones de Prensa' }).click()
  await page.getByRole('menuitem', { name: 'Archivar' }).click()
  await expect(page.getByRole('alertdialog', { name: '¿Archivar Prensa?' })).toContainText('/ana/prensa deja de verse')
  await page.getByRole('button', { name: 'Archivar' }).click()
  await expect(page.getByRole('list', { name: 'Archivados' }).getByRole('listitem', { name: 'Prensa' })).toBeVisible()
  expect(state.tables.profiles.find(p => p.id === 'p-prensa')?.status).toBe('archived')
  await expect(page.getByRole('status').filter({ hasText: '4 de 5 Spaces' })).toBeVisible()

  // El principal no se archiva (su menú sólo duplica)
  await page.getByRole('listitem', { name: 'Ana Pérez' }).getByRole('button', { name: 'Acciones de Ana Pérez' }).click()
  await expect(page.getByRole('menuitem', { name: 'Archivar' })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Duplicar' }).click()
  const drawer = page.getByRole('dialog', { name: 'Duplicar Ana Pérez' })
  await expect(drawer.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Ana Pérez (copia)')
  await expect(drawer.getByRole('textbox', { name: 'Dirección' })).toHaveValue('ana-perez-copia')
  await drawer.getByRole('button', { name: 'Duplicar' }).click()
  await expect(page).toHaveURL(/\/studio\/identity$/)

  const copy = state.tables.profiles.find(p => p.space_slug === 'ana-perez-copia')
  expect(copy).toMatchObject({ status: 'draft', is_primary: false, username: null })
  expect(state.tables.profile_modules.filter(m => m.profile_id === copy!.id)).toHaveLength(1)

  // Con el tope lleno no se puede restaurar
  await page.goto('/studio/spaces')
  await expect(page.getByRole('list', { name: 'Archivados' }).getByRole('button', { name: 'Restaurar' })).toBeDisabled()
})

test('cambiar la dirección de un Space secundario desde Ajustes', async ({ page, context }) => {
  const state = seed()
  // Visitas sólo del Space (la analítica de cada Space va por separado)
  state.tables.profile_stats_daily.push({
    profile_id: 'p-estudio', day: new Date().toISOString().slice(0, 10), event_type: 'view', module_id: null, events: 3, visitors: 2,
  })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/spaces')
  await page.getByRole('listitem', { name: 'Estudio Ana' }).getByRole('button', { name: 'Abrir en Studio' }).click()
  await expect(page.getByRole('combobox', { name: 'Space que estás editando' })).toHaveValue('p-estudio')

  await page.goto('/studio/settings')
  await expect(page.getByRole('heading', { name: 'Nombre de usuario' })).toHaveCount(0)
  const address = page.getByRole('textbox', { name: 'Dirección' })
  await expect(address).toHaveValue('estudio')
  await address.fill('Mi Estudio')
  await expect(address).toHaveValue('mi-estudio')
  await page.getByRole('button', { name: 'Cambiar dirección' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('deja de funcionar')
  await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
  await expect(page.getByText('Listo, la dirección cambió.')).toBeVisible()
  expect(state.tables.profiles.find(p => p.id === 'p-estudio')?.space_slug).toBe('mi-estudio')

  // La analítica es la del Space abierto
  await page.goto('/studio/analytics')
  await expect.poll(() => state.rpcCalls.filter(c => c.fn === 'profile_traffic_sources').pop()?.args.p_profile_id).toBe('p-estudio')
})
