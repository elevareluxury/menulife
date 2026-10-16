import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// El Hub viejo (`/{username}?v=1`) se retiró: los links y QR impresos con `?v=1` caen en
// la página de Mycen Identity, sin `v` y con el resto de los parámetros.

test('?v=1 lleva a la página de Identity y conserva la fuente del QR', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow()],
    profile_modules: [moduleRow({ title: 'Mi portfolio' })],
  })
  await installSupabaseMock(context, state)

  await page.goto('/ana?v=1&src=qr')

  await expect(page).toHaveURL(/\/ana\?src=qr$/)
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Mi portfolio/ })).toHaveAttribute('href', 'https://ana.design')
  await expect.poll(() => state.rpcCalls.find(c => c.fn === 'track_profile_event')?.args).toMatchObject({
    p_profile_id: 'p-ana', p_event_type: 'view', p_source: 'qr',
  })
  // La página vieja leía tablas directo; Identity usa sólo las RPC públicas.
  expect(state.rpcCalls.some(c => c.fn === 'get_public_profile')).toBe(true)
})

test('?v=1 solo termina en /{username} sin parámetros', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }))

  await page.goto('/ana?v=1')

  await expect(page).toHaveURL(/\/ana$/)
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
})

test('?v=1 con un username anterior también llega al actual', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow({ username: 'ana-studio' })] }, { ana: 'p-ana' })
  await installSupabaseMock(context, state)

  await page.goto('/ana?v=1&src=qr')

  await expect(page).toHaveURL(/\/ana-studio\?src=qr$/)
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
})
