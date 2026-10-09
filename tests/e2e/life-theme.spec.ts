import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, OWNER_ID } from './support/mockSupabase'

// Life OS con el sistema de diseño y tono sin culpa (V1 · etapa 12): sigue el tema del celular, pasa axe en los dos,
// da la bienvenida a quien vuelve (sin rachas) y muestra "nuevos comienzos" una vez por fecha.

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dateKey(d) }
const today = dateKey(new Date())

function habit(id: string, name: string, color: string) {
  return {
    id, user_id: OWNER_ID, name, icon: 'flame', color, frequency: { type: 'daily' }, is_active: true, sort_order: 0,
    goal_id: null, target_value: null, unit: null, anchor: null, reminder_time: null, reminder_enabled: false,
    created_at: new Date().toISOString(),
  }
}
const log = (habitId: string, date: string) => ({ id: `${habitId}-${date}`, habit_id: habitId, user_id: OWNER_ID, completed_date: date, value: 1 })

function lifeState() {
  const state = createState()
  const h1 = '20000000-0000-4000-8000-000000000001'
  const h2 = '20000000-0000-4000-8000-000000000002'
  state.tables.life_habits = [habit(h1, 'Leer', '#F59E0B'), habit(h2, 'Caminar', '#8B5CF6')]
  // Una racha vieja de "Leer" que se cortó hace unos días
  state.tables.life_habit_logs = [5, 6, 7, 8, 9, 10].map(n => log(h1, daysAgo(n))).concat([log(h2, today)])
  state.tables.life_brain_items = []
  state.tables.life_daily_reviews = []
  state.tables.life_goals = []
  state.tables.life_transactions = []
  return state
}

for (const [scheme, theme] of [['dark', 'universo'], ['light', 'amanecer']] as const) {
  for (const path of ['/life', '/life/habits', '/life/goals', '/life/money', '/life/brain', '/life/settings']) {
    test(`Life OS en ${theme} (${path}) pasa axe`, async ({ page, context }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await installSupabaseMock(context, lifeState(), { signedIn: true })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('data-mycen-theme', theme)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      await page.waitForTimeout(300)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => `${n.html} — ${n.failureSummary}`).join(' | ')}`)).toEqual([])
    })
  }
}

test('al volver después de unos días: bienvenida con un solo hábito y sin rachas', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await installSupabaseMock(context, lifeState(), { signedIn: true })
  await context.addInitScript(([uid, seen]) => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      localStorage.setItem(`mycen.life.seen.${uid}`, seen)
      sessionStorage.setItem('e2e-seeded', '1')
    }
  }, [OWNER_ID, daysAgo(4)])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life')

  const welcome = page.getByRole('region', { name: 'Qué bueno verte de vuelta' })
  await expect(welcome).toBeVisible()
  // Un solo hábito sugerido (el que falta hoy) y ninguna racha en pantalla
  await expect(welcome.getByRole('button', { name: 'Marcar Leer como hecho hoy' })).toBeVisible()
  await expect(page.getByText(/racha|seguidos/i)).toHaveCount(0)
  await welcome.getByRole('button', { name: 'Marcar Leer como hecho hoy' }).click()
  await expect(welcome.getByText('Leer')).toBeVisible()
  // La tarjeta de hábitos del día también lo muestra hecho
  await expect(page.getByRole('region', { name: 'Hábitos de hoy' }).getByRole('checkbox', { name: 'Desmarcar Leer de hoy' })).toBeChecked()

  // Se cierra y no vuelve ese día
  await welcome.getByRole('button', { name: 'Entendido' }).click()
  await expect(welcome).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Qué bueno verte de vuelta' })).toHaveCount(0)
})

test('nuevos comienzos: el lunes aparece una vez y se puede cerrar', async ({ page, context }) => {
  // Un lunes ya pasado y cercano (la sesión simulada no acepta fechas futuras), a media mañana. Si cae 1, se usa el
  // anterior: el 1 del mes muestra "mes nuevo".
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(10, 0, 0, 0)
  if (monday > new Date() || monday.getDate() === 1) monday.setDate(monday.getDate() - 7)
  await page.clock.setFixedTime(monday)
  await installSupabaseMock(context, lifeState(), { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life')

  const fresh = page.getByRole('region', { name: 'Empieza una semana nueva' })
  await expect(fresh).toBeVisible()
  await expect(fresh.getByRole('button', { name: 'Ver mis metas' })).toBeVisible()
  await fresh.getByRole('button', { name: 'Cerrar' }).click()
  await expect(fresh).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Empieza una semana nueva' })).toHaveCount(0)
})
