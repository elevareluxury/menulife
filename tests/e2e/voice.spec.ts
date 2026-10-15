import { expect, test, type BrowserContext } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// V1.1 · Cargar con la voz (beta: ?beta=1). El reconocimiento del navegador se simula: "dice" la frase de window.__say.

async function fakeSpeech(context: BrowserContext) {
  await context.addInitScript(() => {
    class FakeRecognition {
      lang = ''; interimResults = false; continuous = false; maxAlternatives = 1
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      start() {
        const say = (window as unknown as { __say?: string }).__say ?? ''
        setTimeout(() => {
          if (say) this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: say }], { isFinal: true })] })
          else this.onerror?.({ error: 'no-speech' })
          this.onend?.()
        }, 50)
      }
      stop() {}
      abort() {}
    }
    const w = window as unknown as { webkitSpeechRecognition: unknown; SpeechRecognition: unknown }
    w.webkitSpeechRecognition = FakeRecognition
    w.SpeechRecognition = FakeRecognition
  })
}

function seed() {
  const state = createState({ profiles: [profileRow()] })
  for (const t of ['life_transactions', 'life_brain_items', 'life_habits', 'life_habit_logs', 'life_goals', 'life_daily_reviews', 'life_recurring_transactions']) state.tables[t] = []
  return state
}

const pad = (n: number) => String(n).padStart(2, '0')
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` })()

test.use({ viewport: { width: 390, height: 844 } })

test('dictar un gasto: se confirma y se guarda', async ({ page, context }) => {
  await fakeSpeech(context)
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life?beta=1')
  await page.evaluate(() => { (window as unknown as { __say: string }).__say = 'gasté 3500 en el súper' })

  await page.getByRole('button', { name: 'Capturar' }).click()
  await page.getByRole('button', { name: 'Dictar' }).click()
  const sheet = page.getByRole('dialog', { name: 'Dictá' })
  await expect(sheet.getByText('Escuché: “gasté 3500 en el súper”')).toBeVisible()
  await expect(sheet.getByRole('radio', { name: 'Gasto' })).toHaveAttribute('aria-checked', 'true')
  await expect(sheet.getByLabel('Texto')).toHaveValue('Súper')
  await expect(sheet.getByLabel('Monto')).toHaveValue('3500')
  await sheet.getByRole('button', { name: 'Guardar' }).click()

  await expect.poll(() => state.tables.life_transactions.length).toBe(1)
  expect(state.tables.life_transactions[0]).toMatchObject({ type: 'expense', amount: 3500, description: 'Súper', category: 'Otros' })
})

test('dictar una tarea para mañana y cambiarla antes de guardar', async ({ page, context }) => {
  await fakeSpeech(context)
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life?beta=1')
  await page.evaluate(() => { (window as unknown as { __say: string }).__say = 'mañana a las 10 llamar al médico' })

  await page.getByRole('button', { name: 'Capturar' }).click()
  await page.getByRole('button', { name: 'Dictar' }).click()
  const sheet = page.getByRole('dialog', { name: 'Dictá' })
  await expect(sheet.getByRole('radio', { name: 'Tarea' })).toHaveAttribute('aria-checked', 'true')
  await expect(sheet.getByLabel('Fecha')).toHaveValue(tomorrow)
  await expect(sheet.getByLabel('Hora')).toHaveValue('10:00')
  await sheet.getByLabel('Texto').fill('Llamar al médico de cabecera')
  await sheet.getByRole('button', { name: 'Guardar' }).click()

  await expect.poll(() => state.tables.life_brain_items.length).toBe(1)
  expect(state.tables.life_brain_items[0]).toMatchObject({ type: 'task', title: 'Llamar al médico de cabecera', due_date: tomorrow, due_time: '10:00' })
})

test('si no se escucha nada, lo dice; sin beta no aparece', async ({ page, context }) => {
  await fakeSpeech(context)
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life')
  await page.getByRole('button', { name: 'Capturar' }).click()
  await expect(page.getByRole('button', { name: 'Dictar' })).toHaveCount(0)

  await page.goto('/life?beta=1')
  await page.getByRole('button', { name: 'Capturar' }).click()
  await page.getByRole('button', { name: 'Dictar' }).click()
  await expect(page.getByRole('dialog', { name: 'Dictá' }).getByRole('status')).toHaveText('No te escuché. Probá de nuevo.')
})
