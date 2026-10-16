import { expect, test, type BrowserContext } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Auditoría V2 (lógica), puntos 12 y 14: la siguiente de una tarea que se repite se crea una sola vez, y con varias
// pestañas cada recordatorio llega una sola vez.

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

function task(id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    id, user_id: OWNER_ID, type: 'task', title, content: null, due_date: dateKey(new Date()), due_time: null, remind_minutes: null,
    reminded_at: null, completed_at: null, is_completed: false, is_archived: false, goal_id: null, is_focus: false,
    created_at: new Date().toISOString(), recurrence: { freq: 'daily' }, subtasks: [], next_occurrence_id: null, occurrence_of: null,
    ...extra,
  }
}

const ORIGIN = '10000000-0000-4000-8000-000000000001'

test('doble toque al completar una tarea que se repite: una sola siguiente', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = [task(ORIGIN, 'Regar las plantas')]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life/brain?vista=tareas')
  // Cada intento de crear la siguiente (también los que la base rechazaría)
  let inserts = 0
  page.on('request', r => { if (r.method() === 'POST' && r.url().includes('/rest/v1/life_brain_items')) inserts++ })

  const box = page.getByRole('checkbox', { name: /Regar las plantas/ })
  await expect(box).toBeVisible()
  // Dos clics en el mismo instante (antes de que React vuelva a dibujar)
  await box.evaluate((el: HTMLElement) => { el.click(); el.click() })

  await expect.poll(() => state.tables.life_brain_items.find(r => r.id === ORIGIN)?.next_occurrence_id).toBeTruthy()
  await page.waitForTimeout(600)
  const nexts = state.tables.life_brain_items.filter(r => r.id !== ORIGIN)
  expect(nexts).toHaveLength(1)
  expect(nexts[0]).toMatchObject({ occurrence_of: ORIGIN, is_completed: false })
  expect(state.tables.life_brain_items.find(r => r.id === ORIGIN)).toMatchObject({ is_completed: true, next_occurrence_id: nexts[0].id })
  // El segundo toque no llegó a la base (el casillero se bloquea mientras se guarda)
  expect(inserts).toBe(1)
})

test('otro dispositivo ya creó la siguiente: se usa esa, no se crea otra', async ({ page, context }) => {
  const state = createState()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  state.tables.life_brain_items = [
    task(ORIGIN, 'Regar las plantas'),
    // La creó el otro dispositivo; este todavía no se enteró (next_occurrence_id vacío en lo que tiene)
    task('10000000-0000-4000-8000-000000000002', 'Regar las plantas', { due_date: dateKey(tomorrow), occurrence_of: ORIGIN }),
  ]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life/brain?vista=tareas')

  await page.getByRole('checkbox', { name: /Regar las plantas/ }).first().click()
  await expect.poll(() => state.tables.life_brain_items.find(r => r.id === ORIGIN)?.next_occurrence_id)
    .toBe('10000000-0000-4000-8000-000000000002')
  expect(state.tables.life_brain_items).toHaveLength(2)
})

/** Notification simulada: cada aviso se cuenta en Node (las dos pestañas comparten el contador). */
async function countNotifications(context: BrowserContext, opts: { noLocks?: boolean } = {}) {
  const shown: string[] = []
  await context.exposeBinding('__notified', (_src, tag: string) => { shown.push(tag) })
  await context.addInitScript(noLocks => {
    class FakeNotification {
      static permission = 'granted'
      static requestPermission() { return Promise.resolve('granted') }
      constructor(_title: string, options?: { tag?: string }) {
        (window as unknown as { __notified: (t: string) => void }).__notified(options?.tag ?? '')
      }
    }
    Object.defineProperty(window, 'Notification', { value: FakeNotification, configurable: true })
    if (noLocks) Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
  }, !!opts.noLocks)
  return shown
}

for (const noLocks of [false, true]) {
  test(`dos pestañas: cada recordatorio llega una sola vez${noLocks ? ' (sin Web Locks)' : ''}`, async ({ context }) => {
    const now = new Date()
    const state = createState()
    state.tables.life_brain_items = [
      task('20000000-0000-4000-8000-000000000001', 'Pagar la luz', { recurrence: null, due_time: `${hhmm(now)}:00`, remind_minutes: 0 }),
    ]
    state.tables.life_habits = [{
      id: 'h1', user_id: OWNER_ID, name: 'Tomar agua', icon: 'Star', color: '#F4705A', frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
      is_active: true, sort_order: 0, created_at: now.toISOString(), goal_id: null, target_value: null, unit: null,
      anchor: null, reminder_time: `${hhmm(now)}:00`, reminder_enabled: true,
    }]
    state.tables.life_habit_logs = []
    const shown = await countNotifications(context, { noLocks })
    await installSupabaseMock(context, state, { signedIn: true })

    const a = await context.newPage()
    const b = await context.newPage()
    await Promise.all([a.goto('/life'), b.goto('/life')])
    await expect(a.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible({ timeout: 20_000 })
    await expect(b.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible({ timeout: 20_000 })

    await expect.poll(() => shown.length).toBe(2)
    // Volver a cada pestaña relee la base pero no repite avisos
    await a.bringToFront(); await a.evaluate(() => window.dispatchEvent(new Event('focus')))
    await b.bringToFront(); await b.evaluate(() => window.dispatchEvent(new Event('focus')))
    await a.waitForTimeout(1500)
    expect(shown.filter(t => t.startsWith('life-habit-h1-'))).toHaveLength(1)
    expect(shown.filter(t => t === 'life-task-20000000-0000-4000-8000-000000000001')).toHaveLength(1)
    expect(state.tables.life_brain_items[0].reminded_at).toBeTruthy()

    // Sólo la pestaña líder lee la base: con dos pestañas no se lee el doble
    if (!noLocks) {
      const reads = await a.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.includes('/life_habits?') && e.name.includes('reminder_enabled')).length)
        + await b.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.includes('/life_habits?') && e.name.includes('reminder_enabled')).length)
      expect(reads).toBeLessThanOrEqual(4)
    }
  })
}
