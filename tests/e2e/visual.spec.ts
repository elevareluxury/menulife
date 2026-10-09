import { expect, test, type Page } from '@playwright/test'
import { createState, installSupabaseMock, OWNER_ID, profileRow } from './support/mockSupabase'
import { MODULE_FIXTURES } from './support/moduleFixtures'

// V1 · etapa 15: capturas de referencia (regresión visual). Fecha y hora fijas, zona horaria fija, sin animaciones.
// Si un cambio de diseño es deliberado: npx playwright test tests/e2e/visual.spec.ts --update-snapshots y revisar el diff.
// Un poco de tolerancia por el suavizado de texto entre versiones de Chromium (local / CI).

const NOW = new Date('2026-10-05T10:00:00-03:00')   // lunes a media mañana (hora de Buenos Aires)
const TODAY = '2026-10-05'
const LAYOUTS = ['credencial', 'portada', 'editorial', 'bento', 'clasica'] as const
const THEMES = ['universo', 'amanecer'] as const
const KEEP = ['m-link', 'm-social', 'm-contact', 'm-text', 'm-featured', 'm-hours', 'm-link-group']
// Sin avisos flotantes (recordatorios, toasts): aparecen o no según el momento exacto
const SHOT = {
  animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.02,
  style: '[data-rht-toaster], .toaster { display: none !important; }',
} as const

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' })

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
    .map(a => a.finished.catch(() => undefined))))
}

for (const width of [390, 1280] as const) {
  for (const theme of THEMES) {
    for (const layout of LAYOUTS) {
      test(`perfil ${layout} · ${theme} · ${width}px`, async ({ page, context }) => {
        await page.clock.setFixedTime(NOW)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
        const rows = MODULE_FIXTURES.map(f => structuredClone(f.row)).filter(r => KEEP.includes(r.id as string))
        await installSupabaseMock(context, createState({
          profiles: [profileRow({
            theme: { layout, mode: theme, accent: 'plasma' }, status_text: 'Abierta a proyectos', available: true,
            primary_action: { kind: 'whatsapp', label: 'Escribime por WhatsApp', url: 'https://wa.me/5493415550000' },
          })],
          profile_modules: rows,
        }))
        await page.goto('/ana')
        await expect(page.getByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeVisible()
        await settle(page)
        await expect(page).toHaveScreenshot(`perfil-${layout}-${theme}-${width}.png`, SHOT)
      })
    }
  }
}

function lifeState() {
  const state = createState({ profiles: [profileRow()] })
  const task = (id: string, title: string, done = false) => ({
    id, user_id: OWNER_ID, type: 'task', title, content: null, due_date: TODAY, due_time: null, remind_minutes: null,
    reminded_at: null, completed_at: done ? NOW.toISOString() : null, is_completed: done, is_archived: false, goal_id: null,
    is_focus: false, created_at: NOW.toISOString(), recurrence: null, subtasks: [], next_occurrence_id: null,
  })
  state.tables.life_brain_items = [task('10000000-0000-4000-8000-000000000001', 'Mandar el presupuesto', true),
    task('10000000-0000-4000-8000-000000000002', 'Llamar al estudio')]
  const habit = (id: string, name: string, icon: string, color: string, extra: Record<string, unknown> = {}) => ({
    id, user_id: OWNER_ID, name, icon, color, frequency: { type: 'daily' }, is_active: true, sort_order: 0, goal_id: null,
    target_value: null, unit: null, anchor: null, reminder_time: null, reminder_enabled: false, created_at: NOW.toISOString(), ...extra,
  })
  state.tables.life_habits = [
    habit('20000000-0000-4000-8000-000000000001', 'Leer 20 minutos', 'book-open', '#8B5CF6'),
    habit('20000000-0000-4000-8000-000000000002', 'Agua', 'droplets', '#3B82F6', { target_value: 8, unit: 'vasos' }),
  ]
  state.tables.life_habit_logs = [{ id: 'l1', habit_id: '20000000-0000-4000-8000-000000000002', user_id: OWNER_ID, completed_date: TODAY, value: 5 }]
  state.tables.life_daily_reviews = [{
    id: 'r1', user_id: OWNER_ID, date: TODAY, reflection: null, closed_at: null,
    priorities: [{ id: 'p1', kind: 'task', task_id: '10000000-0000-4000-8000-000000000001' }, { id: 'p2', kind: 'text', text: 'Terminar la propuesta', done: false }],
  }]
  state.tables.life_goals = []
  state.tables.life_transactions = []
  return state
}

for (const [scheme, theme] of [['dark', 'universo'], ['light', 'amanecer']] as const) {
  for (const [name, path, ready] of [
    ['mi-dia', '/life', 'Mi día'],
    ['habitos', '/life/habits', 'Hábitos'],
    ['studio-inicio', '/studio', null],
  ] as const) {
    test(`${name} · ${theme}`, async ({ page, context }) => {
      await page.clock.setFixedTime(NOW)
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.setViewportSize({ width: 390, height: 844 })
      // Sin "bienvenida" ni "nuevos comienzos": la visita de ayer ya está anotada y el lunes ya se cerró
      await context.addInitScript(([uid, day]) => {
        localStorage.setItem(`mycen.life.seen.${uid}`, day)
        localStorage.setItem(`mycen.life.fresh.${uid}`, day)
      }, [OWNER_ID, TODAY])
      await installSupabaseMock(context, lifeState(), { signedIn: true })
      await page.goto(path)
      if (ready) await expect(page.getByRole('heading', { level: 1, name: ready })).toBeVisible()
      else await expect(page.locator('h1.st-title').first()).toBeVisible()
      await page.waitForLoadState('networkidle')
      await settle(page)
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, SHOT)
    })
  }
}
