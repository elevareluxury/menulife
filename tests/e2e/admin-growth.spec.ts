import { expect, test } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Panel del equipo → Crecimiento: activos, crecimiento, ciclo de vida, retención, embudo, contagio, mundo, uso de
// cada función y visitas; CSV por tabla; accesible en el celular y la compu. Y la app marca "usé Mycen hoy" una vez.

function adminState(): MockState {
  return createState({ super_admins: [{ id: 'sa-1', user_id: OWNER_ID }], profiles: [profileRow()] })
}

test('las métricas de una app mundial, con sus nombres y el embudo marcado', async ({ page, context }) => {
  const state = adminState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/super-admin/crecimiento')
  await expect(page.getByRole('heading', { level: 1, name: 'Crecimiento' })).toBeVisible()
  await expect(page.getByTestId('kpi-dau')).toContainText('12')
  await expect(page.getByTestId('kpi-mau')).toContainText('34')
  await expect(page.getByTestId('kpi-stickiness')).toContainText('35,3 %')
  // 9 registros contra 6 la semana anterior
  await expect(page.getByTestId('kpi-signups')).toContainText('+50 %')
  await expect(page.getByTestId('lifecycle-churned')).toContainText('5')
  // Retención: 4 cohortes, la primera semana al 100 %
  await expect(page.getByRole('table').first().getByRole('row')).toHaveCount(5)
  // Embudo: la caída más grande (de 10 con visita a 3 con mensaje)
  await expect(page.getByTestId('funnel-first_message')).toHaveAttribute('data-worst', 'true')
  await expect(page.getByText('Acá se pierde más gente')).toHaveCount(1)
  // Nombres reales: idioma, plataforma, región, módulo, estructura y ciudad
  for (const text of ['English', 'iPhone', 'América', 'Red social', 'Credencial', 'Buenos Aires', 'Hábitos']) {
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible()
  }
  await expect(page.getByRole('link', { name: '/ana' })).toHaveAttribute('href', '/ana')

  // CSV del embudo
  const download = page.waitForEvent('download')
  await page.getByRole('region', { name: 'Embudo' }).getByRole('button', { name: 'Exportar CSV' }).click()
  expect((await download).suggestedFilename()).toBe('mycen-embudo.csv')

  // Cambiar el período vuelve a pedir los datos
  await page.getByRole('button', { name: '30 días' }).click()
  await expect(page.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => state.rpcCalls.filter(c => c.fn === 'admin_growth_overview').slice(-1)[0]?.args.p_days).toBe(30)
})

test('sin datos para comparar no inventa porcentajes', async ({ page, context }) => {
  const state = adminState()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/super-admin/crecimiento')
  await expect(page.getByTestId('kpi-dau')).toBeVisible()
  state.growth = {
    retention: [],
    overview: {
      today: '2026-10-31', days: 90, accounts: 1, dau: 1, wau: 1, mau: 1, stickiness: null,
      growth: { signups_7d: 1, signups_prev_7d: 0, signups_30d: 1, signups_prev_30d: 0, wau_prev: 0, mau_prev: 0, published_7d: 0, published_prev_7d: 0, published_total: 0 },
      daily: [], monthly: [], lifecycle: { new: 1, retained: 0, resurrected: 0, churned: 0 },
      platforms: [], languages: [], regions: [], timezones: [], areas: { life: 1, studio: 0 }, visits: [],
    },
  }
  await page.getByRole('button', { name: '30 días' }).click()
  await expect(page.getByTestId('kpi-signups')).toContainText('sin período anterior para comparar')
  await expect(page.getByTestId('kpi-stickiness')).toContainText('—')
  await expect(page.locator('section[aria-labelledby="gr-ret"]')).toContainText('Sin datos todavía')
})

test('celular y compu: en el menú y pasa axe, sin scroll de costado', async ({ page, context }) => {
  await installSupabaseMock(context, adminState(), { signedIn: true })
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(vp)
    await page.goto('/super-admin')
    if (vp.width < 1000) {
      await page.locator('nav.fixed').getByRole('button', { name: 'Más' }).click()
      await page.getByRole('link', { name: 'Crecimiento' }).last().click()
    } else {
      await page.getByRole('navigation', { name: 'Panel interno' }).first().getByRole('link', { name: 'Crecimiento' }).click()
    }
    await expect(page.getByTestId('kpi-dau')).toBeVisible()
    const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
    const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    expect(bad.map(v => `${vp.width} · ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})

test('la app marca "usé Mycen hoy" una sola vez por día y zona, sin contenido', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')
  await expect.poll(() => state.rpcCalls.filter(c => c.fn === 'mycen_mark_active').length).toBe(1)
  const call = state.rpcCalls.find(c => c.fn === 'mycen_mark_active')!
  expect(Object.keys(call.args).sort()).toEqual(['p_area', 'p_lang', 'p_platform', 'p_tz'])
  expect(call.args).toMatchObject({ p_area: 'life', p_platform: 'web', p_lang: 'es' })
  await page.reload()
  await page.goto('/studio')
  await expect.poll(() => state.rpcCalls.filter(c => c.fn === 'mycen_mark_active').map(c => c.args.p_area)).toEqual(['life', 'studio'])
})

test('quien no es del equipo no entra', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/super-admin/crecimiento')
  await expect(page).not.toHaveURL(/super-admin/)
})
