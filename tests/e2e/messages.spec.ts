import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, moduleRow, profileRow } from './support/mockSupabase'

// V1 · etapa 05: formulario de contacto → bandeja de Studio. No se manda ningún email.

const seed = () => createState({
  profiles: [profileRow({ theme: { layout: 'credencial' } })],
  profile_modules: [moduleRow({ id: 'm-form', type: 'contact_form', title: 'Contame tu proyecto', position: 10,
    content: { intro: 'Respondo en el día.' } })],
})

test('un visitante sin cuenta envía un mensaje y la dueña lo ve en Studio con el contador de no leídos', async ({ page, context, browser }) => {
  const state = seed()
  await installSupabaseMock(context, state)
  await page.clock.install()
  await page.goto('/ana')

  const form = page.getByRole('region', { name: 'Contame tu proyecto' })
  await expect(form.getByText('Respondo en el día.')).toBeVisible()
  await form.getByRole('textbox', { name: 'Tu nombre' }).fill('Juan Pérez')
  await form.getByRole('textbox', { name: 'Email o WhatsApp' }).fill('juan@mail.com')
  await form.getByRole('textbox', { name: 'Mensaje' }).fill('Hola Ana, ¿hacés logos para cafeterías?')
  // Una persona tarda más de 3 segundos en completarlo
  await page.clock.fastForward(5000)
  await form.getByRole('button', { name: 'Enviar mensaje' }).click()
  await expect(form.getByRole('status')).toHaveText('Mensaje enviado. Te van a responder pronto.')
  expect(state.tables.profile_messages).toHaveLength(1)
  expect(state.tables.profile_messages[0]).toMatchObject({ name: 'Juan Pérez', contact: 'juan@mail.com', read_at: null })
  // El campo trampa no lo ve nadie y no se completó
  expect((state.rpcCalls.find(c => c.fn === 'submit_profile_message')!.args).p_trap).toBeNull()

  // La dueña, en otra sesión
  const owner = await browser.newContext()
  await installSupabaseMock(owner, state, { signedIn: true })
  const studio = await owner.newPage()
  await studio.goto('/studio')
  await expect(studio.getByText('Tenés 1 mensajes sin leer')).toBeVisible()
  await studio.getByRole('link', { name: 'Mensajes' }).first().click()
  await expect(studio).toHaveURL(/\/studio\/messages$/)

  const item = studio.getByRole('button', { name: /Juan Pérez/ })
  await expect(item).toHaveAttribute('aria-expanded', 'false')
  await item.click()
  await expect(studio.getByText('Hola Ana, ¿hacés logos para cafeterías?').last()).toBeVisible()
  await expect(studio.getByRole('link', { name: 'Responder por email' })).toHaveAttribute('href', 'mailto:juan@mail.com')
  // Abrirlo lo marca como leído
  await expect.poll(() => state.tables.profile_messages[0].read_at).not.toBeNull()

  await studio.getByRole('button', { name: 'Borrar' }).click()
  await studio.getByRole('alertdialog').getByRole('button', { name: 'Borrar' }).click()
  await expect.poll(() => state.tables.profile_messages.length).toBe(0)
  await expect(studio.getByText('Todavía no recibiste mensajes.')).toBeVisible()
  await owner.close()
})

test('validación de los campos y límite de links', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state)
  await page.clock.install()
  await page.goto('/ana')
  const form = page.getByRole('region', { name: 'Contame tu proyecto' })

  await form.getByRole('button', { name: 'Enviar mensaje' }).click()
  await expect(form.getByRole('alert')).toHaveText('Completá tu nombre, cómo contactarte y el mensaje.')

  await form.getByRole('textbox', { name: 'Tu nombre' }).fill('Spam')
  await form.getByRole('textbox', { name: 'Email o WhatsApp' }).fill('+54 9 11 5555 0000')
  await form.getByRole('textbox', { name: 'Mensaje' }).fill('https://a.com https://b.com https://c.com https://d.com')
  await page.clock.fastForward(5000)
  await form.getByRole('button', { name: 'Enviar mensaje' }).click()
  await expect(form.getByRole('alert')).toHaveText('El mensaje tiene demasiados links: dejá como mucho 3.')
  expect(state.tables.profile_messages).toHaveLength(0)
})

test('un bot que completa el formulario en menos de 3 segundos ve "enviado" pero no se guarda nada', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state)
  await page.goto('/ana')
  const form = page.getByRole('region', { name: 'Contame tu proyecto' })
  await form.getByRole('textbox', { name: 'Tu nombre' }).fill('Bot')
  await form.getByRole('textbox', { name: 'Email o WhatsApp' }).fill('bot@spam.com')
  await form.getByRole('textbox', { name: 'Mensaje' }).fill('compre ya')
  await form.getByRole('button', { name: 'Enviar mensaje' }).click()
  await expect(form.getByRole('status')).toHaveText('Mensaje enviado. Te van a responder pronto.')
  expect(state.tables.profile_messages).toHaveLength(0)
})

test('Studio: en el celular el contador de no leídos está en "Más" y la WhatsApp se responde por wa.me', async ({ page, context }) => {
  const state = seed()
  state.tables.profile_messages.push({ id: 'msg-1', profile_id: 'p-ana', name: 'Sofi', contact: '+54 9 341 555-0000',
    message: 'Consulta', sender_hash: 'h', created_at: new Date().toISOString(), read_at: null })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio/more')
  await expect(page.getByRole('link', { name: /Más, 1 sin leer/ })).toBeVisible()
  await page.getByRole('link', { name: /Mensajes/ }).click()
  await page.getByRole('button', { name: /Sofi/ }).click()
  await expect(page.getByRole('link', { name: 'Responder por WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5493415550000')
})
