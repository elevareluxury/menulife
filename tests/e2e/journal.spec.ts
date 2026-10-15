import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, OWNER_ID, profileRow, type MockState } from './support/mockSupabase'

// Life OS · Diario privado: escribir, editar, borrar con "Deshacer", buscar; bloqueo con PIN (en el dispositivo) que
// vuelve a pedir el PIN al volver al diario o al pasar a segundo plano, con espera después de varios errores.
// La huella/cara (WebAuthn) no está disponible en Chromium sin interfaz: se prueba sólo el PIN.

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = dateKey(new Date())

function seed(): MockState {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_brain_items = []
  state.tables.life_journal_entries = [
    { id: 'j-old', user_id: OWNER_ID, entry_date: today, body: 'Caminé por el parque y pensé en mamá.', created_at: new Date(Date.now() - 3_600_000).toISOString(), updated_at: new Date().toISOString() },
  ]
  return state
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(r.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
}

test.use({ viewport: { width: 390, height: 844 } })

test('escribir, editar, buscar y borrar con "Deshacer"', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/life/brain')

  // Se entra desde Brain (la barra de abajo sigue con 5 ítems)
  await page.getByRole('link', { name: 'Diario' }).click()
  await expect(page).toHaveURL(/\/life\/journal$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Diario' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Life OS' }).getByRole('link')).toHaveCount(5)
  await expect(page.getByText('Caminé por el parque y pensé en mamá.')).toBeVisible()
  await expect(page.getByText(/No tienen cifrado de extremo a extremo/)).toBeVisible()
  await axe(page)

  // Escribir
  const box = page.getByRole('textbox', { name: 'Entrada del diario' })
  await box.fill('Hoy tuve miedo de hablar en la reunión.\nAl final salió bien.')
  await page.getByRole('button', { name: 'Guardar en el diario' }).click()
  await expect(page.getByText('Guardado en tu diario')).toBeVisible()
  await expect(box).toHaveValue('')
  expect(state.tables.life_journal_entries).toHaveLength(2)
  const created = state.tables.life_journal_entries.find(e => e.id !== 'j-old')!
  expect(created).toMatchObject({ user_id: OWNER_ID, entry_date: today, body: 'Hoy tuve miedo de hablar en la reunión.\nAl final salió bien.' })
  await expect(page.getByText(/Hoy tuve miedo de hablar/)).toBeVisible()

  // Editar (el menú de esa entrada: con las dos del mismo día, el orden no se da por sentado)
  const optionsOf = (text: string | RegExp) =>
    page.getByText(text).locator('xpath=../..').getByRole('button', { name: 'Opciones de la entrada' })
  await optionsOf(/Hoy tuve miedo de hablar/).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  const edit = page.getByRole('textbox', { name: 'Entrada del diario' }).nth(1)
  await edit.fill('Hoy hablé en la reunión. Salió bien.')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Hoy hablé en la reunión. Salió bien.')).toBeVisible()
  await expect.poll(() => state.tables.life_journal_entries.find(e => e.id === created.id)?.body).toBe('Hoy hablé en la reunión. Salió bien.')

  // Buscar (sin acentos ni mayúsculas)
  await page.getByRole('button', { name: 'Buscar en el diario' }).click()
  await page.getByRole('searchbox', { name: 'Buscar en el diario' }).fill('MAMA')
  await expect(page.getByText('Caminé por el parque y pensé en mamá.')).toBeVisible()
  await expect(page.getByText('Hoy hablé en la reunión. Salió bien.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cerrar la búsqueda' }).click()

  // Borrar con "Deshacer": vuelve y no se borra
  const card = page.getByText('Hoy hablé en la reunión. Salió bien.')
  await optionsOf('Hoy hablé en la reunión. Salió bien.').click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect(card).toHaveCount(0)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(card).toBeVisible()
  await page.waitForTimeout(5_500)
  expect(state.tables.life_journal_entries).toHaveLength(2)

  // Borrar de verdad
  await optionsOf('Hoy hablé en la reunión. Salió bien.').click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await expect(card).toHaveCount(0)
  await expect.poll(() => state.tables.life_journal_entries.length, { timeout: 8_000 }).toBe(1)
})

test('bloqueo con PIN: activar, bloquea al volver y al pasar a segundo plano, PIN incorrecto con espera', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })

  // Ajustes → Bloquear el diario
  await page.goto('/life/settings')
  await page.getByRole('button', { name: 'Activar el bloqueo' }).click()
  await page.getByLabel('PIN nuevo (4 a 8 números)').fill('258')
  await page.getByLabel('Repetí el PIN').fill('258')
  await page.getByRole('button', { name: 'Activar el bloqueo' }).click()
  await expect(page.getByText('El PIN tiene que tener de 4 a 8 números.')).toBeVisible()
  await page.getByLabel('PIN nuevo (4 a 8 números)').fill('2580')
  await page.getByLabel('Repetí el PIN').fill('2581')
  await page.getByRole('button', { name: 'Activar el bloqueo' }).click()
  await expect(page.getByText('Los dos PIN no coinciden.')).toBeVisible()
  await expect(page.getByLabel('PIN nuevo (4 a 8 números)')).toHaveAttribute('inputmode', 'numeric')
  await page.getByLabel('Repetí el PIN').fill('2580')
  await page.getByRole('button', { name: 'Activar el bloqueo' }).click()
  await expect(page.getByText('Activado en este dispositivo con PIN.')).toBeVisible()

  // En el dispositivo queda sólo el hash con sal, nunca el PIN
  const stored = await page.evaluate(id => localStorage.getItem(`mycen_journal_lock:${id}`), OWNER_ID)
  expect(stored).toBeTruthy()
  expect(stored).not.toContain('2580')
  expect(JSON.parse(stored!)).toMatchObject({ v: 1, iterations: 600000, failures: 0 })

  // Al entrar, pide el PIN y no muestra (ni pide) las entradas
  let journalRequests = 0
  page.on('request', r => { if (r.url().includes('life_journal_entries')) journalRequests++ })
  await page.goto('/life/journal')
  await expect(page.getByRole('heading', { name: 'Tu diario está bloqueado' })).toBeVisible()
  await expect(page.getByText('Caminé por el parque')).toHaveCount(0)
  expect(journalRequests).toBe(0)
  await axe(page)
  const pin = page.getByLabel('PIN', { exact: true })
  await expect(pin).toHaveAttribute('inputmode', 'numeric')
  await expect(pin).toBeFocused()

  // Desbloquear
  await pin.fill('2580')
  await page.getByRole('button', { name: 'Desbloquear' }).click()
  await expect(page.getByText('Caminé por el parque y pensé en mamá.')).toBeVisible()

  // Salir del diario y volver: bloqueado otra vez
  await page.getByRole('link', { name: 'Brain' }).click()
  await page.getByRole('link', { name: 'Diario' }).click()
  await expect(page.getByRole('heading', { name: 'Tu diario está bloqueado' })).toBeVisible()
  await page.getByLabel('PIN', { exact: true }).fill('2580')
  await page.getByRole('button', { name: 'Desbloquear' }).click()
  await expect(page.getByText('Caminé por el parque y pensé en mamá.')).toBeVisible()

  // Pasar a segundo plano: bloqueado
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('heading', { name: 'Tu diario está bloqueado' })).toBeVisible()
  await expect(page.getByText('Caminé por el parque')).toHaveCount(0)
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }) })

  // PIN incorrecto: dos avisos y al tercero, espera
  for (let i = 0; i < 2; i++) {
    await page.getByLabel('PIN', { exact: true }).fill('1111')
    await page.getByRole('button', { name: 'Desbloquear' }).click()
    await expect(page.getByText('Ese no es el PIN.')).toBeVisible()
  }
  await page.getByLabel('PIN', { exact: true }).fill('1111')
  await page.getByRole('button', { name: 'Desbloquear' }).click()
  await expect(page.getByText(/Demasiados intentos\. Esperá (30|29|28) s/)).toBeVisible()
  await expect(page.getByLabel('PIN', { exact: true })).toBeDisabled()
  // La espera se recuerda al recargar
  await page.reload()
  await expect(page.getByText(/Demasiados intentos\. Esperá \d+ s/)).toBeVisible()
  await axe(page)

  // "Olvidé mi PIN" explica cómo desactivarlo (volviendo a entrar)
  await page.getByRole('button', { name: 'Olvidé mi PIN' }).click()
  await expect(page.getByText(/volvé a entrar con tu contraseña o con Google/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar' }).click()
})

test('desactivar el bloqueo desde Ajustes pide el PIN', async ({ page, context }) => {
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/settings')
  await page.getByRole('button', { name: 'Activar el bloqueo' }).click()
  await page.getByLabel('PIN nuevo (4 a 8 números)').fill('123456')
  await page.getByLabel('Repetí el PIN').fill('123456')
  await page.getByRole('button', { name: 'Activar el bloqueo' }).click()
  await page.getByRole('button', { name: 'Desactivar el bloqueo' }).click()
  await page.getByLabel('PIN', { exact: true }).fill('654321')
  await page.getByRole('button', { name: 'Desactivar el bloqueo' }).click()
  await expect(page.getByText('Ese no es el PIN.')).toBeVisible()
  await page.getByLabel('PIN', { exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Desactivar el bloqueo' }).click()
  await expect(page.getByText('Desactivaste el bloqueo del diario.')).toBeVisible()
  expect(await page.evaluate(id => localStorage.getItem(`mycen_journal_lock:${id}`), OWNER_ID)).toBeNull()
  await page.goto('/life/journal')
  await expect(page.getByText('Caminé por el parque y pensé en mamá.')).toBeVisible()
})

for (const [scheme, theme] of [['dark', 'universo'], ['light', 'amanecer']] as const) {
  test(`Diario y su bloqueo en ${theme} pasan axe`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await installSupabaseMock(context, seed(), { signedIn: true })
    await page.goto('/life/journal')
    await expect(page.locator('html')).toHaveAttribute('data-mycen-theme', theme)
    await expect(page.getByText('Caminé por el parque y pensé en mamá.')).toBeVisible()
    await axe(page)
    await page.goto('/life/settings')
    await page.getByRole('button', { name: 'Activar el bloqueo' }).click()
    await axe(page)
  })
}
