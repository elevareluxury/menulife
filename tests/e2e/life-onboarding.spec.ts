import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, type MockState } from './support/mockSupabase'
import { layoutProblems } from './support/layoutAudit'
import { settledAxe } from './support/settle'

// Onboarding de Life OS: la primera vez (sin metas, hábitos ni tareas) se elige qué mejorar, se edita la propuesta y
// "Listo" deja Mi día con la tarea como prioridad y el hábito para tildar. Se puede saltear y no vuelve a aparecer.

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = dateKey(new Date())
const todayName = new Date().toLocaleDateString('es-AR', { weekday: 'long' })

/** Cuenta nueva: nunca vio el onboarding y no tiene nada en Life OS. */
function newAccount(): MockState {
  const state = createState()
  state.lifeOnboarding = 'pending'
  for (const t of ['life_goals', 'life_goal_milestones', 'life_habits', 'life_habit_logs', 'life_brain_items', 'life_daily_reviews', 'product_events']) {
    state.tables[t] = []
  }
  return state
}

const events = (state: MockState) => state.tables.product_events.map(e => e.event)

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
}

test('elegir, editar, "Listo" y ver Mi día con la tarea como prioridad y el hábito para tildar (celular de 320 px)', async ({ page, context }) => {
  const state = newAccount()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/life')

  // 1 · ¿Qué querés mejorar?
  const onboarding = page.getByRole('region', { name: 'Primeros pasos en Life OS' })
  await expect(onboarding.getByRole('heading', { level: 1, name: '¿Qué querés mejorar?' })).toBeVisible()
  await expect(onboarding.getByText('Paso 1 de 2')).toBeVisible()
  for (const name of ['Salud', 'Dinero', 'Aprender algo', 'Orden', 'Trabajo o proyecto', 'Relaciones', 'Descanso', 'Otra']) {
    await expect(onboarding.getByRole('button', { name, exact: true })).toBeVisible()
  }
  await noSideScroll(page)
  await expect.poll(() => events(state)).toContain('life_onboarding_started')
  await onboarding.getByRole('button', { name: 'Salud', exact: true }).click()

  // 2 · La propuesta ya armada, editable
  await expect(onboarding.getByRole('heading', { level: 1, name: 'Tu primer plan' })).toBeFocused()
  await expect(onboarding.getByLabel('Meta')).toHaveValue('Sentirme con más energía')
  await expect(onboarding.getByLabel('Hábito chico')).toHaveValue('Caminar 15 minutos')
  await expect(onboarding.getByLabel('Primera tarea, para hoy')).toHaveValue('Elegir a qué hora salgo a caminar')
  // Días sugeridos (lunes, miércoles y viernes) y siempre hoy, para tildarlo en Mi día
  const days = onboarding.getByRole('group', { name: 'Días' })
  await expect(days.getByRole('button', { name: todayName })).toHaveAttribute('aria-pressed', 'true')
  await expect(days.getByRole('button', { name: 'miércoles' })).toHaveAttribute('aria-pressed', 'true')
  await noSideScroll(page)

  await onboarding.getByLabel('Meta').fill('Tener energía para jugar con mis hijos')
  await onboarding.getByLabel('Hábito chico').fill('Caminar 20 minutos')
  await onboarding.getByLabel('Primera tarea, para hoy').fill('Sacar las zapatillas del placard')
  await onboarding.getByRole('button', { name: 'Listo' }).click()

  // 3 · Mi día: celebración, la tarea como prioridad y el hábito para tildar
  await expect(page.getByRole('status').filter({ hasText: '¡Listo! Tu día ya tiene un plan.' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(onboarding).toHaveCount(0)
  const priorities = page.getByRole('region', { name: 'Tus 3 prioridades' })
  await expect(priorities.getByRole('checkbox', { name: 'Hecha: Sacar las zapatillas del placard' })).toBeVisible()
  const habits = page.getByRole('region', { name: 'Hábitos de hoy' })
  const habit = habits.getByRole('checkbox', { name: 'Marcar Caminar 20 minutos como hecho hoy' })
  await expect(habit).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tu meta en foco' }).getByText('Tener energía para jugar con mis hijos')).toBeVisible()
  await noSideScroll(page)

  // Todo quedó unido a la meta
  const [goal] = state.tables.life_goals
  expect(goal).toMatchObject({ user_id: OWNER_ID, name: 'Tener energía para jugar con mis hijos', status: 'in_progress', progress: 0 })
  expect(state.tables.life_habits).toHaveLength(1)
  expect(state.tables.life_habits[0]).toMatchObject({ name: 'Caminar 20 minutos', goal_id: goal.id, icon: 'Dumbbell', is_active: true })
  expect(state.tables.life_brain_items).toHaveLength(1)
  expect(state.tables.life_brain_items[0]).toMatchObject({
    type: 'task', title: 'Sacar las zapatillas del placard', goal_id: goal.id, due_date: today, is_focus: true, is_completed: false,
  })
  expect(state.tables.life_daily_reviews[0]).toMatchObject({ date: today, priorities: [{ kind: 'task', task_id: state.tables.life_brain_items[0].id }] })

  // El hábito se tilda desde Mi día
  await habit.click()
  await expect.poll(() => state.tables.life_habit_logs.length).toBe(1)
  expect(state.tables.life_habit_logs[0]).toMatchObject({ habit_id: state.tables.life_habits[0].id, completed_date: today })

  // Métricas: terminó, con la opción elegida (sin textos de la persona); la marca queda en la cuenta
  await expect.poll(() => state.tables.product_events.find(e => e.event === 'life_onboarding_completed')?.props).toEqual({ tipo: 'health', count: 3 })
  expect(JSON.stringify(state.tables.product_events)).not.toContain('zapatillas')
  await expect.poll(() => state.tables.user_settings?.[0]?.life_onboarding_at).toBeTruthy()

  // No vuelve a aparecer
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Qué querés mejorar?' })).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: '¡Listo! Tu día ya tiene un plan.' })).toHaveCount(0)
})

test('"Lo armo yo": se saltea, queda Mi día vacío y no vuelve a aparecer (ni en otro dispositivo)', async ({ page, context }) => {
  const state = newAccount()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/life')

  await expect(page.getByRole('heading', { level: 1, name: '¿Qué querés mejorar?' })).toBeVisible()
  await page.getByRole('button', { name: 'Lo armo yo' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Empezá tu día' })).toBeVisible()
  await expect(page.getByText('¡Listo! Tu día ya tiene un plan.')).toHaveCount(0)
  await expect.poll(() => state.tables.user_settings?.[0]?.life_onboarding_at).toBeTruthy()
  await expect.poll(() => state.tables.product_events.find(e => e.event === 'life_onboarding_skipped')?.props).toEqual({ step: 1 })
  expect(events(state)).not.toContain('life_onboarding_completed')
  expect(state.tables.life_goals).toHaveLength(0)
  expect(state.tables.life_habits).toHaveLength(0)
  expect(state.tables.life_brain_items).toHaveLength(0)

  // Otro dispositivo (sin la marca local): la marca de la cuenta alcanza
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mycen.lifeOnboarding.')) localStorage.removeItem(k) })
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Qué querés mejorar?' })).toHaveCount(0)
})

test('"Otra" con texto propio, sin hábito y con "reducir movimiento"', async ({ page, context }) => {
  const state = newAccount()
  await installSupabaseMock(context, state, { signedIn: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/life')
  const onboarding = page.getByRole('region', { name: 'Primeros pasos en Life OS' })

  await page.getByRole('button', { name: 'Otra', exact: true }).click()
  await page.getByLabel('Escribí qué querés mejorar').fill('Escribir mi libro')
  await page.getByRole('button', { name: 'Seguir' }).click()
  await expect(onboarding.getByLabel('Meta')).toHaveValue('Escribir mi libro')
  await page.getByLabel('Sumar este hábito').uncheck()
  await expect(page.getByLabel('Hábito chico')).toHaveCount(0)

  // Sin texto en la tarea no se puede terminar: avisa y lleva el foco al campo
  await page.getByLabel('Primera tarea, para hoy').fill('')
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByRole('alert')).toHaveText('Escribí la tarea o sacala.')
  await expect(page.getByLabel('Primera tarea, para hoy')).toBeFocused()
  await page.getByLabel('Primera tarea, para hoy').fill('Escribir el índice')
  await page.getByRole('button', { name: 'Listo' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tus 3 prioridades' }).getByRole('checkbox', { name: 'Hecha: Escribir el índice' })).toBeVisible()
  expect(state.tables.life_goals.map(g => g.name)).toEqual(['Escribir mi libro'])
  expect(state.tables.life_habits).toHaveLength(0)
  await expect.poll(() => state.tables.product_events.find(e => e.event === 'life_onboarding_completed')?.props).toEqual({ tipo: 'other', count: 2 })
})

test('una cuenta que ya tiene algo en Life OS no ve el onboarding', async ({ page, context }) => {
  const state = newAccount()
  state.tables.life_habits = [{ id: 'h1', user_id: OWNER_ID, name: 'Leer', icon: 'BookOpen', color: '#3B82F6', frequency: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] }, is_active: true, sort_order: 0 }]
  await installSupabaseMock(context, state, { signedIn: true })
  await page.goto('/life')
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Qué querés mejorar?' })).toHaveCount(0)
  expect(events(state)).not.toContain('life_onboarding_started')
})

// Misma auditoría de diseño que layout-audit.spec.ts (320 px, español y ruso por las palabras largas), en los dos pasos
for (const lang of ['es', 'ru'] as const) {
  test(`320 px (${lang}): el onboarding no se sale, no se corta ni se pisa`, async ({ page, context }) => {
    const state = newAccount()
    state.tables.user_settings = [{ user_id: OWNER_ID, language: lang, currency: 'ARS', extra_currencies: [], week_start: 1, life_onboarding_at: null }]
    await installSupabaseMock(context, state, { signedIn: true })
    await page.setViewportSize({ width: 320, height: 760 })
    await page.goto('/life')
    const options = page.locator('section ul button')
    await expect(options).toHaveCount(8)
    await page.waitForTimeout(700)
    expect(await layoutProblems(page)).toEqual([])
    await options.first().click()
    await expect(page.locator('#life-ob-goal')).toBeVisible()
    await page.waitForTimeout(700)
    expect(await layoutProblems(page)).toEqual([])
  })
}

// Accesibilidad automática (como a11y.spec.ts): cero violaciones serias o críticas en los dos pasos y en los dos temas
for (const scheme of ['dark', 'light'] as const) {
  test(`onboarding de Life (${scheme}): los dos pasos pasan axe`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await installSupabaseMock(context, newAccount(), { signedIn: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/life')
    await expect(page.getByRole('heading', { level: 1, name: '¿Qué querés mejorar?' })).toBeVisible()
    await noSerious(page, 'elegir')
    await page.getByRole('button', { name: 'Descanso', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Tu primer plan' })).toBeVisible()
    await noSerious(page, 'propuesta')
  })
}

async function noSerious(page: Page, where: string) {
  const results = await (await settledAxe(page)).withTags(['wcag2a', 'wcag2aa']).analyze()
  const bad = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map(v => `${where} · ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
}
