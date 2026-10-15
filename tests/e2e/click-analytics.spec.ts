import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Analítica → "Lo que más tocan": cada botón del perfil manda módulo + clave corta (nada del visitante) y Studio
// muestra el ranking con los nombres del contenido actual, el % sobre visitas y los totales por módulo.

const LINKS = moduleRow({
  id: 'm-links', type: 'link_group', title: 'Mis links', position: 10,
  content: { items: [{ title: 'Web', url: 'https://ana.example.com' }, { title: 'Tienda', url: 'https://shop.example.com' }] },
})
const SUPPORT = moduleRow({
  id: 'm-support', type: 'support', title: null, position: 20,
  content: { methods: [{ kind: 'mercadopago', value: 'https://link.mercadopago.com.ar/anaperez' }, { kind: 'alias', value: 'ana.perez.mp' }] },
})

test('un visitante toca un link y un medio de "Apoyame"; la dueña lo ve en Analítica', async ({ page, context, browser }) => {
  const state = createState({ profiles: [profileRow()], profile_modules: [structuredClone(LINKS), structuredClone(SUPPORT)] })
  // Un toque viejo en un link que ya se borró del grupo
  state.tables.profile_events = [{ profile_id: 'p-ana', event_type: 'module_click', module_id: 'm-links', item_key: 'u:gone1' }]

  const visitor = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  // Los links externos no se abren (el toque igual llega a React y se registra)
  await visitor.addInitScript(() => document.addEventListener('click', e => {
    if ((e.target as Element | null)?.closest?.('a[target="_blank"]')) e.preventDefault()
  }, true))
  await installSupabaseMock(visitor, state)
  const pub = await visitor.newPage()
  await pub.goto('/ana')
  await expect.poll(() => state.rpcCalls.some(c => c.fn === 'track_profile_event' && c.args.p_event_type === 'view')).toBe(true)

  await pub.getByRole('link', { name: /Tienda/ }).click()
  await pub.getByRole('button', { name: 'Copiar Alias, CVU o CBU' }).click()
  await expect.poll(() => state.rpcCalls.filter(c => c.fn === 'track_profile_event' && c.args.p_event_type === 'module_click').length).toBe(2)

  const clicks = state.rpcCalls.filter(c => c.fn === 'track_profile_event' && c.args.p_event_type === 'module_click').map(c => c.args)
  expect(clicks[0]).toMatchObject({ p_module_id: 'm-links', p_item_key: expect.stringMatching(/^u:[a-z0-9]+$/) })
  expect(clicks[1]).toMatchObject({ p_module_id: 'm-support', p_item_key: expect.stringMatching(/^alias:[a-z0-9]+$/) })
  // Sólo módulo y clave: nada del visitante
  for (const c of clicks) expect(Object.keys(c).sort()).toEqual(['p_event_type', 'p_item_key', 'p_module_id', 'p_profile_id', 'p_referrer', 'p_source'])
  await visitor.close()

  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/analytics')

  const ranking = page.getByRole('region', { name: 'Lo que más tocan' })
  const rows = ranking.getByRole('listitem')
  await expect(rows).toHaveCount(3)
  await expect(rows.filter({ hasText: 'Tienda' })).toContainText('1 toque')
  await expect(rows.filter({ hasText: 'Tienda' })).toContainText('en Mis links')
  await expect(rows.filter({ hasText: 'Tienda' })).toContainText(/100\s?% de las visitas/)
  await expect(rows.filter({ hasText: 'Alias, CVU o CBU' })).toContainText('1 toque')
  await expect(rows.filter({ hasText: 'Link que ya no está' })).toContainText('en Mis links')

  const perModule = page.getByRole('region', { name: 'Módulos con más clicks' })
  await expect(perModule.getByRole('listitem').first()).toContainText('Mis links')
  await expect(perModule.getByRole('listitem').first()).toContainText('2 toques')

  for (const scheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
  }
})

test('la vista previa de Studio no registra toques', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()], profile_modules: [structuredClone(LINKS)] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/editor')
  await expect(page.getByText('Tienda').first()).toBeVisible()
  await page.getByText('Tienda').first().click()
  await page.waitForTimeout(300)
  expect(state.rpcCalls.some(c => c.fn === 'track_profile_event')).toBe(false)
})
