import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// Colaboraciones (V1.1): una marca propone una colaboración desde el perfil y llega a Studio → Mensajes, separada de
// los mensajes del formulario de contacto. Sin emails.

const axeViolations = async (page: import('@playwright/test').Page) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  return results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
}

/** Fecha local dentro de N días, AAAA-MM-DD */
const inDays = (n: number) => {
  const d = new Date(Date.now() + n * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('la dueña agrega Colaboraciones, publica, una marca propone y la dueña la ve en el filtro con sus detalles', async ({ page, context, browser }) => {
  const state = createState({ profiles: [profileRow({ theme: { layout: 'credencial' } })] })
  // Un mensaje común del formulario de contacto, para ver que el filtro los separa
  state.tables.profile_messages.push({ id: 'msg-juan', profile_id: 'p-ana', kind: 'message', name: 'Juan', contact: 'juan@mail.com',
    message: '¿Hacés logos?', details: null, sender_hash: 'h', created_at: new Date(Date.now() - 3_600_000).toISOString(), read_at: null })
  await installSupabaseMock(context, state, { signedIn: true })

  // ── Studio: agregar el módulo ──
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: /Colaboraciones/ }).click()
  await page.getByRole('textbox', { name: 'Título de la sección' }).fill('Trabajemos juntos')
  await page.getByRole('textbox', { name: 'Texto de invitación (opcional)' }).fill('Hago reels para marcas de café.')
  await page.getByRole('textbox', { name: 'Tarifas (opcional)' }).fill('Tarifas desde USD 300')
  await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()
  await expect.poll(() => state.writes.find(w => w.method === 'POST' && w.table === 'profile_modules')?.body).toMatchObject({
    type: 'collab', title: 'Trabajemos juntos', content: { intro: 'Hago reels para marcas de café.', rates: 'Tarifas desde USD 300' },
  })
  await page.getByRole('button', { name: 'Publicar cambios' }).click()
  await expect(page.getByText('Publicado · versión 2')).toBeVisible()

  // ── Visitante sin cuenta ──
  const visitor = await browser.newContext()
  await installSupabaseMock(visitor, state)
  const vPage = await visitor.newPage()
  await vPage.clock.install()
  await vPage.goto('/ana')
  const form = vPage.getByRole('region', { name: 'Trabajemos juntos' })
  await expect(form.getByText('Hago reels para marcas de café.')).toBeVisible()
  await expect(form.getByText('Tarifas desde USD 300')).toBeVisible()
  expect(await axeViolations(vPage)).toEqual([])

  await form.getByRole('textbox', { name: 'Tu nombre' }).fill('Sofía')
  await form.getByRole('textbox', { name: 'Email de contacto' }).fill('sofi@cafeluna.com')
  await form.getByRole('textbox', { name: 'Empresa o marca' }).fill('Café Luna')
  await form.getByRole('textbox', { name: 'Sitio web (opcional)' }).fill('cafeluna.com')
  await form.getByRole('combobox', { name: 'Qué buscan' }).selectOption({ label: 'Video' })
  await form.getByRole('textbox', { name: 'Presupuesto (opcional)' }).fill('USD 500')
  const deadline = inDays(30)
  await form.getByLabel('Fecha límite (opcional)').fill(deadline)
  await form.getByRole('textbox', { name: 'Contanos la propuesta' }).fill('Queremos un reel para el lanzamiento de otoño.')
  await vPage.clock.fastForward(5000)

  // La web tiene que ser https
  await form.getByRole('button', { name: 'Enviar propuesta' }).click()
  await expect(form.getByRole('alert')).toHaveText('El sitio web tiene que empezar con https://')
  await form.getByRole('textbox', { name: 'Sitio web (opcional)' }).fill('https://cafeluna.com')
  await form.getByRole('button', { name: 'Enviar propuesta' }).click()
  await expect(form.getByRole('status')).toHaveText('Propuesta enviada. Te van a responder pronto.')
  expect(state.tables.profile_messages.find(m => m.kind === 'collab')).toMatchObject({
    name: 'Sofía', contact: 'sofi@cafeluna.com', message: 'Queremos un reel para el lanzamiento de otoño.', read_at: null,
    details: { company: 'Café Luna', website: 'https://cafeluna.com', deliverable: 'video', budget: 'USD 500', deadline },
  })
  expect(state.rpcCalls.find(c => c.fn === 'submit_profile_collab')!.args.p_trap).toBeNull()
  await visitor.close()

  // ── La dueña: filtro y detalles ──
  await page.goto('/studio/messages')
  await expect(page.getByRole('button', { name: /Juan/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Sofía/ })).toBeVisible()
  await page.getByRole('button', { name: 'Colaboraciones', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Colaboraciones', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Juan/ })).toHaveCount(0)
  const item = page.getByRole('button', { name: /Sofía/ })
  await expect(item).toContainText('Colaboración')
  await expect(item).toContainText('Café Luna')
  await item.click()
  const body = page.locator('.st-message-body')
  await expect(body.getByText('Video', { exact: true })).toBeVisible()
  await expect(body.getByText('USD 500')).toBeVisible()
  const site = body.getByRole('link', { name: 'cafeluna.com' })
  await expect(site).toHaveAttribute('href', 'https://cafeluna.com')
  await expect(site).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  await expect(body.getByRole('link', { name: 'Responder por email' })).toHaveAttribute('href', 'mailto:sofi@cafeluna.com')
  await expect(body.locator(`time[datetime="${deadline}"]`)).toBeVisible()
  await expect.poll(() => state.tables.profile_messages.find(m => m.kind === 'collab')!.read_at).not.toBeNull()
  expect(await axeViolations(page)).toEqual([])

  await page.getByRole('button', { name: 'Mensajes', exact: true }).click()
  await expect(page.getByRole('button', { name: /Juan/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Sofía/ })).toHaveCount(0)
})

test('validación, un bot ve "enviada" sin guardar y el formulario de contacto no recibe en un perfil sólo con Colaboraciones',async ({ page, context }) => {
  const state = createState({
    profiles: [profileRow({ theme: { layout: 'credencial' } })],
    profile_modules: [moduleRow({ id: 'm-collab', type: 'collab', title: 'Colaboraciones', position: 10, content: {} })],
  })
  // La versión publicada se arma con los módulos sembrados
  state.tables.profile_versions = []
  state.tables.profiles[0].published_version_id = null
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/modules')
  await page.getByRole('button', { name: 'Publicar' }).first().click()
  await expect(page.getByText('Publicado · versión 1')).toBeVisible()

  const visitor = await context.browser()!.newContext()
  await installSupabaseMock(visitor, state)
  const vPage = await visitor.newPage()
  await vPage.goto('/ana')
  const form = vPage.getByRole('region', { name: 'Colaboraciones' })
  await form.getByRole('button', { name: 'Enviar propuesta' }).click()
  await expect(form.getByRole('alert')).toHaveText('Completá tu nombre, un email válido, la empresa, qué buscan y la propuesta.')

  // Completado en menos de 3 segundos: la base responde "ok" sin guardar
  await form.getByRole('textbox', { name: 'Tu nombre' }).fill('Bot')
  await form.getByRole('textbox', { name: 'Email de contacto' }).fill('bot@spam.com')
  await form.getByRole('textbox', { name: 'Empresa o marca' }).fill('Spam')
  await form.getByRole('combobox', { name: 'Qué buscan' }).selectOption('post')
  await form.getByRole('textbox', { name: 'Contanos la propuesta' }).fill('compre ya')
  await form.getByRole('button', { name: 'Enviar propuesta' }).click()
  await expect(form.getByRole('status')).toHaveText('Propuesta enviada. Te van a responder pronto.')
  expect(state.tables.profile_messages).toHaveLength(0)
  await visitor.close()

  // El formulario de contacto no acepta el envío a un perfil que sólo tiene colaboraciones (y viceversa en la base)
  const r = await page.evaluate(async () => {
    const res = await fetch('https://mock.supabase.co/rest/v1/rpc/submit_profile_message', {
      method: 'POST', headers: { 'content-type': 'application/json', apikey: 'test-anon-key' },
      body: JSON.stringify({ p_handle: 'ana', p_name: 'X', p_contact: 'x@x.com', p_message: 'x', p_trap: null, p_elapsed_ms: 5000 }),
    })
    return res.json()
  })
  expect(r).toBe('not_found')
})

test('Studio → Mensajes con una propuesta abierta pasa axe en Amanecer', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  state.tables.profile_messages.push({ id: 'msg-collab', profile_id: 'p-ana', kind: 'collab', name: 'Sofía', contact: 'sofi@cafeluna.com',
    message: 'Un reel', sender_hash: 'h', created_at: new Date().toISOString(), read_at: null,
    details: { company: 'Café Luna', website: 'https://cafeluna.com/marca', deliverable: 'ugc', budget: 'USD 500', deadline: inDays(10) } })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/studio/messages')
  await expect(page.locator('.st-root')).toHaveAttribute('data-mycen-theme', 'amanecer')
  await page.getByRole('button', { name: /Sofía/ }).click()
  await expect(page.getByText('Contenido para la marca (UGC)')).toBeVisible()
  await expect(page.getByRole('link', { name: 'cafeluna.com/marca' })).toBeVisible()
  expect(await axeViolations(page)).toEqual([])
})
