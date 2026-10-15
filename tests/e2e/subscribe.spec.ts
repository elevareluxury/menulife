import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Módulos de bio (V1.1): "Suscribirse". El visitante deja su email con consentimiento; la dueña ve la lista en
// Studio → Suscriptores, la busca, borra y exporta CSV. Mycen no le manda nada a la lista.

async function noSerious(page: Page, where: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map(v => `${where} · ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
}

test('la dueña agrega "Suscribirse", publica, un visitante se suscribe y ella lo ve y exporta', async ({ page, context, browser }) => {
  const state = createState({ profiles: [profileRow({ theme: { layout: 'credencial' } })] })
  await installSupabaseMock(context, state, { signedIn: true })

  // ── Studio: agregar el módulo y publicar ──
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Suscribirse/ }).click()
  await page.getByRole('textbox', { name: 'Título de la sección' }).fill('Novedades del taller')
  await page.getByRole('textbox', { name: 'Texto (opcional)' }).fill('Un mail por mes, nada más.')
  await page.getByRole('combobox', { name: /Pedir el nombre/ }).selectOption('yes')
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body).toMatchObject({
    type: 'subscribe', title: 'Novedades del taller', content: { text: 'Un mail por mes, nada más.', ask_name: true },
  })
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText('Publicado · versión 2')).toBeVisible()

  // ── Visitante sin cuenta ──
  const visitor = await browser.newContext()
  await installSupabaseMock(visitor, state)
  const v = await visitor.newPage()
  await v.clock.install()
  await v.goto('/ana')
  const box = v.getByRole('region', { name: 'Novedades del taller' })
  await expect(box.getByText('Un mail por mes, nada más.')).toBeVisible()
  const email = box.getByRole('textbox', { name: 'Tu email' })
  await expect(email).toHaveAttribute('type', 'email')
  await expect(email).toHaveAttribute('autocomplete', 'email')
  await expect(box.getByRole('link', { name: 'Cómo cuida Mycen tus datos' })).toHaveAttribute('href', '/privacidad#datos')
  await noSerious(v, 'perfil con Suscribirse')

  await email.fill('Juan@Mail.com')
  await box.getByRole('textbox', { name: 'Tu nombre (opcional)' }).fill('Juan')
  await v.clock.fastForward(5000)
  // Sin la casilla no se envía
  await box.getByRole('button', { name: 'Suscribirme' }).click()
  await expect(box.getByRole('alert')).toHaveText('Para suscribirte, marcá la casilla.')
  expect(state.rpcCalls.some(c => c.fn === 'subscribe_profile')).toBe(false)

  await box.getByRole('checkbox', { name: 'Acepto que Ana Pérez reciba mi email y me pueda escribir.' }).check()
  await box.getByRole('button', { name: 'Suscribirme' }).click()
  await expect(box.getByRole('status')).toHaveText('¡Listo! Ya estás en la lista.')
  await noSerious(v, 'suscripto')
  const subs = state.tables.profile_subscribers
  expect(subs).toHaveLength(1)
  expect(subs[0]).toMatchObject({ email: 'juan@mail.com', name: 'Juan', locale: 'es' })
  const call = state.rpcCalls.find(c => c.fn === 'subscribe_profile')!.args
  expect(call).toMatchObject({ p_consent: true, p_hp: null })
  await visitor.close()

  // ── Studio → Suscriptores ──
  await page.goto('/studio/more')
  await page.getByRole('link', { name: 'Suscriptores' }).click()
  await expect(page).toHaveURL(/\/studio\/subscribers$/)
  await expect(page.getByText('juan@mail.com')).toBeVisible()
  await expect(page.getByText('1 en total')).toBeVisible()
  await noSerious(page, 'Studio → Suscriptores')

  await page.getByRole('searchbox', { name: 'Buscar por email o nombre' }).fill('nadie')
  await expect(page.getByText('Nada coincide con la búsqueda.')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar por email o nombre' }).fill('JUAN')
  await expect(page.getByText('juan@mail.com')).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^mycen-ana-subscribers-\d{4}-\d{2}-\d{2}\.csv$/)
  const csv = await readFile((await download.path())!, 'utf8')
  expect(csv.replace(String.fromCharCode(0xfeff), '').split('\r\n').slice(0, 2)).toEqual([
    'email,name,date,locale',
    `juan@mail.com,Juan,${subs[0].created_at},es`,
  ])

  await page.getByRole('button', { name: 'Borrar juan@mail.com' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Borrar' }).click()
  await expect.poll(() => state.tables.profile_subscribers.length).toBe(0)
  await expect(page.getByText('Todavía no tenés suscriptores.')).toBeVisible()
})

test('un bot que lo completa en menos de 3 segundos ve "listo" pero no se guarda nada', async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow()],
    profile_modules: [moduleRow({ id: 'm-sub', type: 'subscribe', title: 'Novedades', position: 10, content: { ask_name: false } })],
  })
  await installSupabaseMock(context, state)
  await page.goto('/ana')
  const box = page.getByRole('region', { name: 'Novedades' })
  await expect(box.getByRole('textbox', { name: 'Tu nombre (opcional)' })).toHaveCount(0)
  await box.getByRole('textbox', { name: 'Tu email' }).fill('bot@spam.com')
  await box.getByRole('checkbox').check()
  await box.getByRole('button', { name: 'Suscribirme' }).click()
  await expect(box.getByRole('status')).toHaveText('¡Listo! Ya estás en la lista.')
  expect(state.tables.profile_subscribers).toHaveLength(0)
})
