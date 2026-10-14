import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, OWNER_ID, profileRow } from './support/mockSupabase'

// Verificación de cuenta: se pide desde Studio → Ajustes y, aprobada, el perfil muestra el tilde junto al nombre.

test('pedir la verificación desde Ajustes: valida el link y queda en revisión', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  state.tables.identities = [{ id: 'i1', user_id: OWNER_ID, verified_at: null }]
  state.tables.verification_requests = []
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio/settings')

  const section = page.getByRole('region', { name: 'Verificación' })
  await expect(section).toBeVisible()
  const send = section.getByRole('button', { name: 'Pedir verificación' })
  await expect(send).toBeDisabled()

  await section.getByLabel(/Contanos quién sos/).fill('Soy Ana Pérez, diseñadora en Rosario')
  await section.getByLabel(/Un link donde se te vea/).fill('http://instagram.com/ana')
  await send.click()
  await expect(section.getByRole('status')).toHaveText(/que el link empiece con https/)

  await section.getByLabel(/Un link donde se te vea/).fill('https://instagram.com/ana')
  await send.click()
  await expect(section.getByText('Tu pedido está en revisión. Te avisamos acá cuando lo veamos.')).toBeVisible()
  await expect(section.getByRole('button', { name: 'Pedir verificación' })).toHaveCount(0)
  expect(state.rpcCalls.filter(c => c.fn === 'request_verification')).toHaveLength(2)

  const axe = await new AxeBuilder({ page }).include('#st-verification-title').analyze()
  expect(axe.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})

test('un perfil verificado muestra el tilde en las 5 estructuras', async ({ page, context }) => {
  for (const layout of ['credencial', 'portada', 'editorial', 'bento', 'clasica']) {
    await installSupabaseMock(context, createState({ profiles: [profileRow({ verified: true, theme: { layout, mode: 'universo', accent: 'plasma' } })] }))
    await page.goto('/ana')
    const heading = page.getByRole('heading', { level: 1, name: /Ana Pérez/ })
    await expect(heading.getByRole('img', { name: 'Cuenta verificada' }), layout).toBeVisible()
  }
})

test('sin verificar, no hay tilde', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }))
  await page.goto('/ana')
  await expect(page.getByRole('heading', { level: 1, name: /Ana Pérez/ })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Cuenta verificada' })).toHaveCount(0)
})
