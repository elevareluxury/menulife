import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, mockAccessToken, moduleRow, OWNER_ID, profileRow } from './support/mockSupabase'

// PR C: interruptores de emergencia, verificación en dos pasos del equipo, abuso sexual infantil en Denuncias y texto
// alternativo de las fotos. La base frena de verdad (tests/db/emergency_mfa_csam.test.sql); acá, lo que ve cada persona.

const withForm = () => createState({
  profiles: [profileRow({ theme: { layout: 'credencial' } })],
  profile_modules: [moduleRow({ id: 'm-form', type: 'contact_form', title: 'Contame tu proyecto', position: 10, content: {} })],
})

test('mensajes en pausa: el formulario lo explica y no guarda nada; tiene el link a privacidad', async ({ page, context }) => {
  const state = Object.assign(withForm(), { siteFlags: { business: false, messages: false } })
  await installSupabaseMock(context, state)
  await page.clock.install()
  await page.goto('/ana')
  const form = page.getByRole('region', { name: 'Contame tu proyecto' })
  await expect(form.getByRole('link', { name: 'Cómo cuida Mycen tus datos' })).toHaveAttribute('href', '/privacidad#datos')
  await form.getByRole('textbox', { name: 'Tu nombre' }).fill('Juan')
  await form.getByRole('textbox', { name: 'Email o WhatsApp' }).fill('juan@mail.com')
  await form.getByRole('textbox', { name: 'Mensaje' }).fill('Hola Ana')
  await page.clock.fastForward(5000)
  await form.getByRole('button', { name: 'Enviar mensaje' }).click()
  await expect(form.getByRole('alert')).toHaveText('Por ahora no se pueden enviar mensajes. Probá de nuevo en un rato.')
  expect(state.tables.profile_messages).toHaveLength(0)
})

test('registros en pausa: el registro lo avisa, no muestra Google y no intenta crear la cuenta', async ({ page, context }) => {
  await installSupabaseMock(context, Object.assign(createState({}), { siteFlags: { business: false, signups: false } }))
  let signups = 0
  await page.route('**/auth/v1/signup**', route => { signups++; return route.fulfill({ status: 500, body: '{}' }) })
  await page.goto('/register')
  const paused = 'Los registros nuevos están en pausa por unos minutos. Probá de nuevo en un rato.'
  await expect(page.getByRole('status').filter({ hasText: paused })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toHaveCount(0)
  await page.getByLabel('Tu nombre').fill('Ana')
  await page.getByLabel('Email').fill('ana@mail.com')
  await page.getByLabel('Contraseña').fill('clave1234')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear mi cuenta gratis' }).click()
  await expect(page.getByRole('alert')).toHaveText(paused)
  expect(signups).toBe(0)
})

async function asAdmin(page: Page, state: ReturnType<typeof createState>) {
  state.tables.super_admins.push({ id: 'sa-1', user_id: OWNER_ID })
  await installSupabaseMock(page.context(), state, { signedIn: true })
}

test('el equipo pausa y reanuda una parte desde Estado (queda en la actividad)', async ({ page }) => {
  const state = createState({})
  await asAdmin(page, state)
  page.on('dialog', d => { void d.accept() })
  await page.goto('/super-admin/estado')
  const row = page.getByTestId('switch-messages')
  await expect(row).toContainText('Funcionando')
  await row.getByRole('button', { name: 'Pausar: Mensajes y colaboraciones' }).click()
  await expect(row).toContainText('En pausa')
  expect(state.siteFlags?.messages).toBe(false)
  await row.getByRole('button', { name: 'Reanudar: Mensajes y colaboraciones' }).click()
  await expect(row).toContainText('Funcionando')
  expect(state.siteFlags?.messages).toBe(true)
})

test('el panel pide activar la verificación en dos pasos a quien entra sólo con contraseña', async ({ page, context }) => {
  const state = createState({ super_admins: [{ id: 'sa-1', user_id: OWNER_ID }] })
  await installSupabaseMock(context, state, { signedIn: true, aal: 'aal1' })
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
  let verified = ''
  await page.route('**/auth/v1/factors**', async route => {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/factors')) {
      return json({ id: 'f1', type: 'totp', friendly_name: 'Mycen', totp: { qr_code: svg, secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Mycen' } })
    }
    if (url.pathname.endsWith('/challenge')) return json({ id: 'c1', type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 300 })
    if (url.pathname.endsWith('/verify')) {
      verified = (route.request().postDataJSON() as { code: string }).code
      return json({ access_token: mockAccessToken('aal2'), refresh_token: 'mock-refresh-2', token_type: 'bearer', expires_in: 3600,
        user: { id: OWNER_ID, email: 'ana@example.com', aud: 'authenticated', role: 'authenticated' } })
    }
    return route.fallback()
  })

  await page.goto('/super-admin')
  await expect(page.getByRole('heading', { name: 'El panel del equipo pide la verificación en dos pasos' })).toBeVisible()
  await expect(page.getByText('JBSWY3DPEHPK3PXP')).toBeVisible()
  await page.getByRole('textbox', { name: 'Código de 6 números' }).fill('123 456')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible()
  expect(verified).toBe('123456')
})

test('Denuncias: "Abuso sexual infantil" suspende, retiene la evidencia y muestra los pasos', async ({ page }) => {
  const state = createState({
    profiles: [profileRow({})],
    profile_reports: [{ id: 'r1', profile_id: 'p1', reason: 'sexual', details: null, status: 'open', created_at: new Date().toISOString(),
      reporter_hash: 'x' }],
  })
  state.tables.profiles[0].id = 'p1'
  await asAdmin(page, state)
  page.on('dialog', d => { void d.accept() })
  await page.goto('/super-admin/denuncias')
  await page.getByRole('button', { name: 'Abuso sexual infantil' }).click()
  const steps = page.getByTestId('csam-steps')
  await expect(steps).toContainText('la evidencia, guardada')
  await expect(steps.getByRole('listitem')).toHaveCount(5)
  expect(state.tables.profiles[0].suspended_at).toBeTruthy()
  expect(state.tables.mycen_legal_holds).toHaveLength(1)
  expect(state.tables.profile_reports[0].status).toBe('actioned')
})

test('las fotos de la galería se nombran con su texto alternativo', async ({ page, context }) => {
  await installSupabaseMock(context, createState({
    profiles: [profileRow({ theme: { layout: 'credencial' } })],
    profile_modules: [moduleRow({ id: 'm-g', type: 'gallery', title: 'Mis fotos', position: 10, content: { items: [
      { url: 'https://cdn.example.com/a.png', type: 'image', alt: 'Ana pintando un mural en Rosario' },
      { url: 'https://cdn.example.com/b.png', type: 'image' },
    ] } })],
  }))
  await page.goto('/ana')
  await expect(page.getByRole('button', { name: 'Ana pintando un mural en Rosario' })).toBeVisible()
  await page.getByRole('button', { name: 'Ana pintando un mural en Rosario' }).click()
  await expect(page.getByRole('img', { name: 'Ana pintando un mural en Rosario' })).toBeVisible()
})
