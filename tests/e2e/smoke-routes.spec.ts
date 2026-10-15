import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow, publishProjectRow, spaceRow, type MockState } from './support/mockSupabase'
import { MODULE_FIXTURES, PROJECT_FIXTURE } from './support/moduleFixtures'

const iso = (d: number) => new Date(Date.now() + d * 86400000).toISOString()
const day = (d: number) => iso(d).slice(0, 10)

function rich(): MockState {
  const state = createState({ profiles: [profileRow({ status: 'published' }), spaceRow('estudio')], profile_modules: MODULE_FIXTURES.map(f => f.row) })
  state.tables.content_objects = [PROJECT_FIXTURE]
  publishProjectRow(state, PROJECT_FIXTURE)
  for (let i = 0; i < 40; i++) {
    state.tables.profile_stats_daily.push({ profile_id: 'p-ana', day: day(-i), event_type: 'view', module_id: null, events: 3, visitors: 2 })
    state.tables.profile_stats_daily.push({ profile_id: 'p-ana', day: day(-i), event_type: 'module_click', module_id: i % 2 ? 'm-link' : 'gone', events: 1, visitors: 1 })
  }
  state.trafficSources = [{ source: 'qr', referrer_host: null, visits: 3, visitors: 2 }]
  const task = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
    id, user_id: OWNER_ID, type: 'task', title, content: null, due_date: day(0), due_time: '09:30', remind_minutes: 10,
    reminded_at: null, completed_at: null, is_completed: false, is_archived: false, goal_id: 'g1',
    is_focus: true, created_at: iso(-20), recurrence: null, subtasks: [], next_occurrence_id: null, ...extra,
  })
  state.tables.life_brain_items = [
    task('10000000-0000-4000-8000-000000000001', 'Repite', { recurrence: { freq: 'weekly', weekdays: [1, 3] }, subtasks: [{ id: 's1', text: 'a', done: true }, { id: 's2', text: 'b', done: false }] }),
    task('10000000-0000-4000-8000-000000000002', 'Vencida', { due_date: day(-5), due_time: null }),
    task('10000000-0000-4000-8000-000000000003', 'Hecha', { is_completed: true, completed_at: iso(0) }),
    task('10000000-0000-4000-8000-000000000004', 'Sin fecha', { due_date: null, due_time: null, goal_id: null }),
    task('10000000-0000-4000-8000-000000000005', 'Mensual', { recurrence: { freq: 'monthly', monthday: 31 } }),
    { ...task('10000000-0000-4000-8000-000000000006', 'Una idea'), type: 'idea', due_date: null, due_time: null, content: 'texto' },
    { ...task('10000000-0000-4000-8000-000000000007', 'Una nota'), type: 'note', due_date: null, content: null },
  ]
  const habit = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
    id, user_id: OWNER_ID, name, icon: 'book-open', color: '#8B5CF6', frequency: { type: 'daily', days: [1, 2, 3, 4, 5] }, is_active: true, sort_order: 0, goal_id: 'g1',
    target_value: null, unit: null, anchor: 'después del café', reminder_time: '08:00', reminder_enabled: true, created_at: iso(-60), ...extra,
  })
  state.tables.life_habits = [
    habit('20000000-0000-4000-8000-000000000001', 'Leer'),
    habit('20000000-0000-4000-8000-000000000002', 'Agua', { target_value: 8, unit: 'vasos' }),
    habit('20000000-0000-4000-8000-000000000003', 'Gym', { frequency: { type: 'times_per_week', times: 3 } }),
    habit('20000000-0000-4000-8000-000000000004', 'Viejo', { frequency: null, icon: 'nope', color: 'rojo' }),
  ]
  state.tables.life_habit_logs = []
  for (let i = 0; i < 50; i += 2) for (const h of state.tables.life_habits) state.tables.life_habit_logs.push({ id: `l${i}${h.id}`, habit_id: h.id, user_id: OWNER_ID, completed_date: day(-i), value: 5 })
  state.tables.life_daily_reviews = [{ id: 'r1', user_id: OWNER_ID, date: day(0), reflection: null, closed_at: null,
    priorities: [{ id: 'p1', kind: 'task', task_id: '10000000-0000-4000-8000-000000000001' }, { id: 'p2', kind: 'task', task_id: 'borrada' }, { id: 'p3', kind: 'text', text: 'x', done: true }] }]
  state.tables.life_goals = [
    { id: 'g1', user_id: OWNER_ID, name: 'Meta', description: 'd', target_date: day(30), progress: 40, status: 'in_progress', color: '#22C55E', sort_order: 0, created_at: iso(-90) },
    { id: 'g2', user_id: OWNER_ID, name: 'Vieja', description: null, target_date: day(-3), progress: 100, status: 'completed', color: 'raro', sort_order: 1, created_at: iso(-90) },
  ]
  state.tables.life_goal_milestones = [{ id: 'ms1', user_id: OWNER_ID, goal_id: 'g1', title: 'Paso', is_completed: true, completed_at: iso(-1), sort_order: 0 }]
  state.tables.life_goal_checkins = []
  state.tables.life_transactions = [
    { id: 't1', user_id: OWNER_ID, type: 'expense', amount: 1500.5, category: 'Comida', description: 'súper', currency: 'ARS', occurred_at: iso(-1), goal_id: 'g1' },
    { id: 't2', user_id: OWNER_ID, type: 'income', amount: 1000, category: 'Sueldo', description: null, currency: 'USD', occurred_at: iso(-3), goal_id: null },
    { id: 't3', user_id: OWNER_ID, type: 'expense', amount: 20, category: 'CategoríaRara', description: null, currency: 'EUR', occurred_at: iso(-40), goal_id: null },
  ]
  state.tables.life_achievements = []
  state.tables.profile_messages = [{ id: 'msg1', profile_id: 'p-ana', name: 'Juan', contact: 'j@x.com', message: 'Hola https://x.com', created_at: iso(-1), read_at: null }]
  state.tables.profile_subscribers = [
    { id: 'sub1', profile_id: 'p-ana', email: 'un.email.muy.largo.para.ver.si.se.desborda@dominio-larguisimo.example.com', name: '=Juan, "el"', locale: 'es', created_at: iso(-2) },
    { id: 'sub2', profile_id: 'p-ana', email: 'sofi@x.com', name: null, locale: null, created_at: iso(-1) },
  ]
  return state
}

function empty(): MockState {
  const s = createState({ profiles: [profileRow()] })
  for (const t of ['life_brain_items', 'life_habits', 'life_habit_logs', 'life_daily_reviews', 'life_goals', 'life_goal_milestones', 'life_goal_checkins', 'life_transactions', 'life_achievements', 'profile_messages', 'profile_subscribers']) s.tables[t] = []
  return s
}

const ROUTES = ['/studio', '/studio/identity', '/studio/modules', '/studio/projects', '/studio/projects/pr-luna', '/studio/appearance', '/studio/exchange',
  '/studio/analytics', '/studio/settings', '/studio/preview', '/studio/editor', '/studio/spaces', '/studio/messages', '/studio/subscribers', '/studio/everywhere', '/studio/more', '/studio/nada',
  '/life', '/life/money', '/life/goals', '/life/habits', '/life/brain', '/life/brain?vista=tareas', '/life/replay', '/life/insights', '/life/settings', '/life/journal',
  '/ana', '/ana/estudio', '/ana/projects/cafe-luna', '/ana?src=qr', '/noexiste', '/', '/login', '/register', '/terminos', '/privacidad']


// Red de seguridad (auditoría total): cada pantalla de Studio, Life OS, el perfil público y las páginas abiertas se
// abre con datos variados (y raros) y sin datos, en el celular y en la compu. Ninguna puede caer en "Algo salió
// mal", tirar errores de React en la consola ni desplazarse de costado.

for (const [name, make, vp, scheme] of [
  ['con datos', rich, { width: 390, height: 844 }, 'dark'],
  ['vacío', empty, { width: 1280, height: 900 }, 'light'],
] as const) {
  test(`todas las pantallas abren sin errores (${name}, ${vp.width} px)`, async ({ page, context }) => {
    test.setTimeout(180_000)
    await page.emulateMedia({ colorScheme: scheme })
    await page.setViewportSize(vp)
    const found: string[] = []
    let where = ''
    page.on('pageerror', e => found.push(`[${where}] ${e.message}`))
    page.on('console', m => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) found.push(`[${where}] ${m.text().slice(0, 200)}`)
    })
    await installSupabaseMock(context, make(), { signedIn: true })
    for (const r of ROUTES) {
      where = r
      await page.goto(r)
      await page.waitForTimeout(600)
      if (await page.getByText('Algo salió mal').count()) found.push(`[${r}] pantalla de error`)
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (extra > 2) found.push(`[${r}] se desplaza ${extra}px de costado`)
    }
    expect([...new Set(found)]).toEqual([])
  })
}
