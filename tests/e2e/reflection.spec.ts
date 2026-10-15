import { expect, test, type Page } from '@playwright/test'
import { settledAxe } from './support/settle'
import { createState, installSupabaseMock, OWNER_ID, profileRow } from './support/mockSupabase'

// Life OS: ánimo de 5 segundos en el cierre del día (y su insight con datos reales) y la revisión semanal guiada.

test.use({ timezoneId: 'America/Argentina/Buenos_Aires', viewport: { width: 390, height: 844 } })

const THURSDAY = new Date('2026-10-08T10:00:00-03:00')
// Último día de la semana (empieza el lunes). En el pasado: con la hora adelantada, la sesión simulada vence
const SUNDAY = new Date('2026-10-11T10:00:00-03:00')
const HABIT = '20000000-0000-4000-8000-000000000001'

function shift(key: string, n: number) {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function task(id: string, title: string, over: Record<string, unknown> = {}) {
  return {
    id, user_id: OWNER_ID, type: 'task', title, content: null, due_date: null, due_time: null, remind_minutes: null,
    reminded_at: null, completed_at: null, is_completed: false, is_archived: false, goal_id: null, is_focus: false,
    created_at: '2026-10-01T12:00:00.000Z', recurrence: null, subtasks: [], next_occurrence_id: null, ...over,
  }
}

function seed() {
  const state = createState({ profiles: [profileRow()] })
  state.tables.life_brain_items = []
  state.tables.life_goals = []
  state.tables.life_goal_milestones = []
  state.tables.life_transactions = []
  state.tables.life_achievements = []
  state.tables.life_daily_reviews = []
  state.tables.life_weekly_reviews = []
  state.tables.life_habits = [{
    id: HABIT, user_id: OWNER_ID, name: 'Caminar', icon: 'footprints', color: '#8B5CF6',
    frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] }, is_active: true, sort_order: 0, goal_id: null, target_value: null,
    unit: null, anchor: null, reminder_time: null, reminder_enabled: false, created_at: '2026-08-01T12:00:00.000Z',
  }]
  state.tables.life_habit_logs = []
  return state
}

/** Sin "bienvenida" ni "nuevos comienzos" (la visita de hoy ya está anotada). */
async function quiet(page: Page, day: string) {
  await page.addInitScript(([uid, d]) => {
    localStorage.setItem(`mycen.life.seen.${uid}`, d)
    localStorage.setItem(`mycen.life.fresh.${uid}`, d)
    localStorage.setItem('mycen_pwa_installed', 'true')
  }, [OWNER_ID, day])
}

async function axe(page: Page) {
  const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => `${n.html} — ${n.failureSummary}`).join(' | ')}`)).toEqual([])
}

test('el ánimo se elige con un toque en el cierre del día y se guarda', async ({ page, context }) => {
  await page.clock.setFixedTime(THURSDAY)
  await quiet(page, '2026-10-08')
  const state = seed()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')

  await page.getByRole('region', { name: 'Cerrar el día' }).getByRole('button', { name: 'Cerrar el día' }).click()
  const sheet = page.getByRole('dialog', { name: 'Así fue tu día' })
  await sheet.getByRole('button', { name: 'Seguir' }).click()

  const moods = sheet.getByRole('group', { name: '¿Cómo te sentiste hoy?' })
  await expect(moods.getByRole('button')).toHaveCount(5)
  await moods.getByRole('button', { name: 'Bien', exact: true }).click()
  await expect(moods.getByRole('button', { name: 'Bien', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => state.tables.life_daily_reviews[0]?.mood).toBe(4)
  // Tocar la misma otra vez la saca (es opcional)
  await moods.getByRole('button', { name: 'Bien', exact: true }).click()
  await expect.poll(() => state.tables.life_daily_reviews[0]?.mood).toBeNull()
  await moods.getByRole('button', { name: 'Muy bien' }).click()
  await expect(moods.getByRole('button', { name: 'Muy bien' })).toHaveAttribute('aria-pressed', 'true')
  await axe(page)

  await sheet.getByRole('button', { name: 'Cerrar el día' }).click()
  await expect.poll(() => state.tables.life_daily_reviews[0]?.closed_at).toBeTruthy()
  expect(state.tables.life_daily_reviews[0]).toMatchObject({ date: '2026-10-08', mood: 5 })
})

test('con 14 días o más de ánimo, Insights muestra una coincidencia amable con los hábitos', async ({ page, context }) => {
  await page.clock.setFixedTime(THURSDAY)
  const state = seed()
  // 20 días con ánimo: los 10 con el hábito hecho, 4 o 5; los otros, 2 o 3
  for (let i = 0; i < 20; i++) {
    const date = shift('2026-10-08', -i)
    state.tables.life_daily_reviews.push({ id: `r${i}`, user_id: OWNER_ID, date, priorities: [], reflection: null, closed_at: null, mood: i < 10 ? 4 + (i % 2) : 2 + (i % 2) })
    if (i < 10) state.tables.life_habit_logs.push({ id: `l${i}`, habit_id: HABIT, user_id: OWNER_ID, completed_date: date, value: 1 })
  }
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/insights')
  await expect(page.getByText('Tus hábitos y tu ánimo')).toBeVisible()
  await expect(page.getByText(/tu ánimo suele ser más alto \(4,5 contra 2,5, de 5\).*no quiere decir que una cosa cause la otra/)).toBeVisible()

  // Con menos de 14 días, no se dice nada
  state.tables.life_daily_reviews = state.tables.life_daily_reviews.slice(0, 13)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible()
  await expect(page.getByText('Tus hábitos y tu ánimo')).toHaveCount(0)
})

test('"Tu mes" muestra cómo te sentiste sólo si lo anotaste', async ({ page, context }) => {
  await page.clock.setFixedTime(THURSDAY)
  const state = seed()
  state.tables.life_habit_logs.push({ id: 'l1', habit_id: HABIT, user_id: OWNER_ID, completed_date: '2026-10-07', value: 1 })
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life/replay')
  await expect(page.getByText('Tu mes en resumen', { exact: false })).toBeVisible()
  await expect(page.getByText('Cómo te sentiste')).toHaveCount(0)

  state.tables.life_daily_reviews.push(
    { id: 'r1', user_id: OWNER_ID, date: '2026-10-06', priorities: [], mood: 4 },
    { id: 'r2', user_id: OWNER_ID, date: '2026-10-07', priorities: [], mood: 4 },
    { id: 'r3', user_id: OWNER_ID, date: '2026-10-08', priorities: [], mood: 2 },
  )
  await page.reload()
  const mood = page.getByRole('list', { name: 'Cómo te sentiste' })
  await mood.scrollIntoViewIfNeeded()
  await expect(mood.getByRole('listitem', { name: 'Bien: 2 días' })).toBeVisible()
  await expect(mood.getByRole('listitem', { name: 'Mal: 1 día' })).toBeVisible()
  await expect(page.getByText('en promedio, en 3 días anotados')).toBeVisible()
})

test('revisión semanal completa: lo que salió bien, qué soltar y 3 cosas para la semana que viene', async ({ page, context }) => {
  test.setTimeout(90_000) // tres pasadas de axe
  await page.clock.setFixedTime(SUNDAY)
  await quiet(page, '2026-10-11')
  const state = seed()
  state.tables.life_brain_items = [
    task('10000000-0000-4000-8000-000000000001', 'Enviar el informe', { is_completed: true, completed_at: '2026-10-07T15:00:00.000Z', due_date: '2026-10-07' }),
    task('10000000-0000-4000-8000-000000000002', 'Pagar la luz', { due_date: '2026-10-06' }),
  ]
  state.tables.life_habit_logs = ['2026-10-05', '2026-10-06', '2026-10-08'].map((d, i) => ({ id: `l${i}`, habit_id: HABIT, user_id: OWNER_ID, completed_date: d, value: 1 }))
  state.tables.life_daily_reviews = [
    { id: 'r1', user_id: OWNER_ID, date: '2026-10-06', priorities: [], mood: 4 },
    { id: 'r2', user_id: OWNER_ID, date: '2026-10-09', priorities: [], mood: 4 },
  ]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')

  const card = page.getByRole('region', { name: 'Tu semana en 5 minutos' })
  await card.getByRole('button', { name: 'Empezar' }).click()
  const sheet = page.getByRole('dialog', { name: 'Tu semana en 5 minutos' })

  // 1 · Lo que salió bien, con datos reales
  await expect(sheet.getByText('Paso 1 de 3')).toBeVisible()
  await expect(sheet.getByRole('list', { name: 'Lo que salió bien' }).getByRole('listitem')).toHaveText([
    '1 tarea hecha', '3 veces cumpliste un hábito', 'Tu ánimo, en promedio: Bien (2 días)',
  ])
  await axe(page)
  await sheet.getByLabel('¿Qué más salió bien? (opcional)').fill('Terminé el informe a tiempo')
  await sheet.getByRole('button', { name: 'Seguir' }).click()

  // 2 · Qué soltar: la atrasada pasa al lunes
  await expect(sheet.getByText('Paso 2 de 3')).toBeVisible()
  const overdue = sheet.getByRole('list', { name: 'Tareas atrasadas' })
  await overdue.getByRole('listitem', { name: 'Pagar la luz' }).getByRole('button', { name: 'Pasar a la semana que viene' }).click()
  await expect.poll(() => state.tables.life_brain_items.find(r => r.title === 'Pagar la luz')?.due_date).toBe('2026-10-12')
  await expect(sheet.getByText('No tenés tareas atrasadas.')).toBeVisible()
  await sheet.getByLabel('¿Algo más que quieras soltar? (opcional)').fill('El curso que no empecé')
  await sheet.getByRole('button', { name: 'Seguir' }).click()

  // 3 · 3 cosas para la semana que viene (una como tarea con fecha el lunes)
  await expect(sheet.getByText('Paso 3 de 3')).toBeVisible()
  const field = sheet.getByRole('textbox', { name: 'Escribí una…' })
  await field.fill('Caminar tres veces')
  await sheet.getByRole('button', { name: 'Anotar' }).click()
  await field.fill('Llamar a Ana')
  await sheet.getByRole('button', { name: 'Crear como tarea' }).click()
  await expect.poll(() => state.tables.life_brain_items.find(r => r.title === 'Llamar a Ana')?.due_date).toBe('2026-10-12')
  await field.fill('Ordenar el escritorio')
  await sheet.getByRole('button', { name: 'Anotar' }).click()
  await expect(sheet.getByRole('list', { name: '3 cosas para la semana que viene' }).getByRole('listitem')).toHaveCount(3)
  await field.fill('Una cuarta')
  await expect(sheet.getByText(/Son 3 a propósito/)).toBeVisible()
  await axe(page)
  await sheet.getByRole('button', { name: 'Terminar' }).click()

  await expect.poll(() => state.tables.life_weekly_reviews[0]?.closed_at).toBeTruthy()
  const saved = state.tables.life_weekly_reviews[0]
  expect(saved).toMatchObject({ week_start: '2026-10-05', wins: 'Terminé el informe a tiempo', let_go: 'El curso que no empecé' })
  expect((saved.next_focus as { kind: string; text: string }[]).map(f => [f.kind, f.text])).toEqual([
    ['text', 'Caminar tres veces'], ['task', 'Llamar a Ana'], ['text', 'Ordenar el escritorio'],
  ])
  await expect(card).toHaveCount(0)

  // Las semanas anteriores se ven en Insights
  await page.goto('/life/insights')
  const history = page.getByRole('region', { name: 'Tus semanas' })
  await expect(history.getByRole('listitem').first()).toContainText('Terminé el informe a tiempo')
  await expect(history.getByText('Llamar a Ana')).toBeVisible()
  await axe(page)
})

test('"Ahora no" esconde la tarjeta de la semana', async ({ page, context }) => {
  await page.clock.setFixedTime(SUNDAY)
  await quiet(page, '2026-10-11')
  await installSupabaseMock(context, seed(), { signedIn: true })
  await page.goto('/life')
  const card = page.getByRole('region', { name: 'Tu semana en 5 minutos' })
  await card.getByRole('button', { name: 'Ahora no' }).click()
  await expect(card).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tu semana en 5 minutos' })).toHaveCount(0)
})
