import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import sharp from 'sharp'
import { createState, installSupabaseMock, OWNER_ID, profileRow } from '../../tests/e2e/support/mockSupabase'
import { MODULE_FIXTURES } from '../../tests/e2e/support/moduleFixtures'

// Imágenes de ejemplo para la landing: perfiles de ejemplo (no personas reales) y "Mi día" con datos inventados
// a propósito para la muestra. Se guardan en WebP, 2× para pantallas densas.

const OUT = join(process.cwd(), 'public/landing')
mkdirSync(OUT, { recursive: true })

const LAYOUTS = ['credencial', 'portada', 'editorial', 'bento', 'clasica'] as const
const THEMES = ['universo', 'amanecer'] as const
const KEEP = ['m-link', 'm-social', 'm-contact', 'm-text', 'm-featured', 'm-hours', 'm-link-group']

test.use({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
    .map(a => a.finished.catch(() => undefined))))
  await page.waitForTimeout(400)
}

async function save(page: Page, name: string) {
  // Sin avisos flotantes (recordatorios, toasts) en la foto
  await page.addStyleTag({ content: '[data-rht-toaster], .toaster, [role="status"][aria-live] { display: none !important; }' })
  const png = await page.screenshot({ type: 'png' })
  await sharp(png).resize({ width: 600 }).webp({ quality: 74 }).toFile(join(OUT, `${name}.webp`))
}

for (const theme of THEMES) {
  for (const layout of LAYOUTS) {
    test(`perfil ${layout} · ${theme}`, async ({ page, context }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const rows = MODULE_FIXTURES.map(f => structuredClone(f.row)).filter(r => KEEP.includes(r.id as string))
      const state = createState({
        profiles: [profileRow({
          theme: { layout, mode: theme, accent: 'plasma' },
          primary_action: { kind: 'whatsapp', label: 'Escribime por WhatsApp', url: 'https://wa.me/5493415550000' },
          status_text: 'Abierta a proyectos', available: true, bio: 'Diseño marcas y sitios para estudios chicos.',
          descriptor: 'Diseñadora · Buenos Aires',
        })],
        profile_modules: rows,
      })
      await installSupabaseMock(context, state)
      await page.goto('/ana')
      await page.getByRole('heading', { level: 1, name: 'Ana Pérez' }).waitFor()
      await settle(page)
      await save(page, `perfil-${layout}-${theme}`)
    })
  }

  test(`Mi día · ${theme}`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: theme === 'amanecer' ? 'light' : 'dark', reducedMotion: 'reduce' })
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const state = createState()
    const task = (id: string, title: string, done = false) => ({
      id, user_id: OWNER_ID, type: 'task', title, content: null, due_date: key, due_time: null, remind_minutes: null,
      reminded_at: null, completed_at: done ? new Date().toISOString() : null, is_completed: done, is_archived: false,
      goal_id: null, is_focus: false, created_at: new Date().toISOString(), recurrence: null, subtasks: [], next_occurrence_id: null,
    })
    state.tables.life_brain_items = [
      task('10000000-0000-4000-8000-000000000001', 'Mandar el presupuesto', true),
      task('10000000-0000-4000-8000-000000000002', 'Llamar al estudio'),
    ]
    const habit = (id: string, name: string, icon: string, color: string) => ({
      id, user_id: OWNER_ID, name, icon, color, frequency: { type: 'daily' }, is_active: true, sort_order: 0, goal_id: null,
      target_value: null, unit: null, anchor: null, reminder_time: null, reminder_enabled: false, created_at: new Date().toISOString(),
    })
    state.tables.life_habits = [
      habit('20000000-0000-4000-8000-000000000001', 'Leer 20 minutos', 'book-open', '#8B5CF6'),
      habit('20000000-0000-4000-8000-000000000002', 'Caminar', 'footprints', '#22C55E'),
    ]
    state.tables.life_habit_logs = [{ id: 'l1', habit_id: '20000000-0000-4000-8000-000000000002', user_id: OWNER_ID, completed_date: key, value: 1 }]
    state.tables.life_daily_reviews = [{
      id: 'r1', user_id: OWNER_ID, date: key, reflection: null, closed_at: null,
      priorities: [
        { id: 'p1', kind: 'task', task_id: '10000000-0000-4000-8000-000000000001' },
        { id: 'p2', kind: 'text', text: 'Terminar la propuesta', done: false },
      ],
    }]
    state.tables.life_goals = []
    state.tables.life_transactions = []
    await installSupabaseMock(context, state, { signedIn: true })
    await page.goto('/life')
    await page.getByRole('heading', { level: 1, name: 'Mi día' }).waitFor()
    await page.getByText('Terminar la propuesta').waitFor()
    await settle(page)
    await save(page, `mi-dia-${theme}`)
  })
}
