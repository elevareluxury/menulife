import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Recordatorios de Life OS en la web: cuando llega la hora, avisan una vez. En el celular `new Notification()` tira
// error (sólo se puede desde el service worker): antes la tarea quedaba marcada como avisada y no aparecía nada.

const pad = (n: number) => String(n).padStart(2, '0')

function dueTask(now: Date) {
  const due = new Date(now.getTime() - 60_000)
  return {
    id: 't-luz', user_id: OWNER_ID, type: 'task', title: 'Pagar la luz', content: null,
    due_date: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
    due_time: `${pad(due.getHours())}:${pad(due.getMinutes())}:00`,
    remind_minutes: 0, reminded_at: null, is_completed: false, is_archived: false,
    created_at: now.toISOString(), updated_at: now.toISOString(),
  }
}

test.use({ viewport: { width: 390, height: 844 } })

test('si el teléfono no deja mostrar el aviso del sistema, el recordatorio sale en pantalla (y una sola vez)', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = [dueTask(new Date())]
  await installSupabaseMock(context, state, { signedIn: true })
  await context.grantPermissions(['notifications'])
  // Como Chrome en Android: permiso dado, pero el constructor tira error
  await context.addInitScript(() => {
    const Original = window.Notification
    const Phone = function () { throw new TypeError('Illegal constructor') } as unknown as typeof Notification
    Object.defineProperty(Phone, 'permission', { get: () => Original.permission })
    Phone.requestPermission = Original.requestPermission.bind(Original)
    window.Notification = Phone
  })

  await page.goto('/life')
  await expect(page.getByText('⏰ Pagar la luz', { exact: false })).toBeVisible()
  await expect.poll(() => state.tables.life_brain_items[0].reminded_at).not.toBeNull()
})

test('con el aviso del navegador disponible, sale como aviso del sistema (y no en pantalla)', async ({ page, context }) => {
  const state = createState()
  state.tables.life_brain_items = [dueTask(new Date())]
  await installSupabaseMock(context, state, { signedIn: true })
  await context.grantPermissions(['notifications'])
  await context.addInitScript(() => {
    const w = window as unknown as { __shown: string[] }
    w.__shown = []
    const Spy = function (title: string) { w.__shown.push(title) } as unknown as typeof Notification
    Object.defineProperty(Spy, 'permission', { get: () => 'granted' })
    Spy.requestPermission = async () => 'granted'
    window.Notification = Spy
  })

  await page.goto('/life')
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shown: string[] }).__shown)).toEqual(['Pagar la luz'])
  await expect(page.getByText('⏰ Pagar la luz', { exact: false })).toHaveCount(0)
})
