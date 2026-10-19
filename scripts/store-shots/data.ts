import { createState, moduleRow, OWNER_ID, profileRow, type MockState } from '../../tests/e2e/support/mockSupabase'

// Datos de ejemplo de las capturas de las tiendas: una persona inventada (Lucía Ferrer, diseñadora y corredora), sin
// datos reales. Los textos que cargó "ella" van en el idioma de la captura, como los vería alguien que usa la app así.

export type Lang = 'es' | 'en'
export type Theme = 'universo' | 'amanecer'

const DAY = 86400000
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString()
function key(d: number) {
  const x = new Date(Date.now() + d * DAY)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

const T = {
  es: {
    descriptor: 'Diseñadora de marcas · Rosario',
    bio: 'Diseño identidades para cafés, estudios y marcas chicas. Corro los domingos.',
    status: 'Tomando proyectos para enero',
    cta: 'Escribime por WhatsApp',
    portfolio: 'Mi portfolio', portfolioSub: 'Trabajos 2026',
    contact: 'Escribime',
    about: 'Sobre mí', aboutBody: 'Hace diez años que diseño marcas con calma: primero escucho, después dibujo.',
    featured: 'Reservá una llamada de 20 minutos',
    links: 'Encontrame en', shop: 'Láminas y afiches',
    tasks: ['Mandar la propuesta a Café Luna', 'Revisar el logo con Martín', 'Comprar zapatillas nuevas', 'Pagar el alquiler', 'Ordenar el portfolio'],
    priority: 'Cerrar la presentación de Luna',
    habits: ['Correr', 'Leer 20 minutos', 'Tomar agua', 'Meditar', 'Dibujar a mano'],
    water: 'vasos', anchor: 'después del café',
    goal: 'Correr mi primera media maratón', goalDesc: '21 km sin apuro, disfrutando cada salida.',
    goal2: 'Ahorrar para el viaje a Lisboa', goal3: 'Lanzar mi tienda de láminas',
    steps: ['Correr 10 km seguidos', 'Inscribirme en la carrera', 'Correr 15 km', 'Llegar a los 21 km'],
    goalTasks: ['Comprar zapatillas nuevas', 'Armar el plan de entrenamiento', 'Turno con la kinesióloga'],
  },
  en: {
    descriptor: 'Brand designer · Rosario',
    bio: 'I design identities for cafés, studios and small brands. I run on Sundays.',
    status: 'Booking projects for January',
    cta: 'Message me on WhatsApp',
    portfolio: 'My portfolio', portfolioSub: 'Work 2026',
    contact: 'Get in touch',
    about: 'About me', aboutBody: 'I have been designing brands for ten years, slowly: first I listen, then I draw.',
    featured: 'Book a 20-minute call',
    links: 'Find me on', shop: 'Prints and posters',
    tasks: ['Send the proposal to Café Luna', 'Review the logo with Martín', 'Buy new running shoes', 'Pay the rent', 'Tidy up the portfolio'],
    priority: 'Finish the Luna presentation',
    habits: ['Run', 'Read 20 minutes', 'Drink water', 'Meditate', 'Hand drawing'],
    water: 'glasses', anchor: 'after coffee',
    goal: 'Run my first half marathon', goalDesc: '21 km with no rush, enjoying every run.',
    goal2: 'Save for the Lisbon trip', goal3: 'Launch my print shop',
    steps: ['Run 10 km non-stop', 'Sign up for the race', 'Run 15 km', 'Reach 21 km'],
    goalTasks: ['Buy new running shoes', 'Put together the training plan', 'Physio appointment'],
  },
} satisfies Record<Lang, unknown>

export const PERSON = { username: 'lucia', name: 'Lucía Ferrer' }

/** Perfil público de Lucía (credencial), en el tema y el idioma de la captura */
export function profileState(lang: Lang, theme: Theme): MockState {
  const t = T[lang]
  const m = (id: string, type: string, position: number, title: string | null, content: Record<string, unknown>) =>
    moduleRow({ id, type, position, title, content, profile_id: 'p-ana' })
  return createState({
    profiles: [profileRow({
      username: PERSON.username, display_name: PERSON.name, descriptor: t.descriptor, bio: t.bio,
      theme: { layout: 'credencial', mode: theme, accent: 'plasma' }, default_locale: lang,
      primary_action: { kind: 'whatsapp', label: t.cta, url: 'https://wa.me/5493415550000' },
      status_text: t.status, available: true,
    })],
    profile_modules: [
      m('m-link', 'link', 10, t.portfolio, { url: 'https://lucia.design', link_type: 'website', subtitle: t.portfolioSub, style: 'button' }),
      m('m-featured', 'featured_action', 20, null, { label: t.featured, url: 'https://cal.com/lucia' }),
      m('m-social', 'social', 30, null, { network: 'instagram', handle: '@lucia.ferrer', url: 'https://instagram.com/lucia.ferrer' }),
      m('m-group', 'link_group', 40, t.links, { items: [
        { title: 'Behance', url: 'https://behance.net/luciaferrer', subtitle: 'Portfolio' },
        { title: 'Etsy', url: 'https://etsy.com/shop/luciaferrer', subtitle: t.shop },
      ] }),
      m('m-text', 'text', 50, t.about, { body: t.aboutBody }),
      m('m-contact', 'contact', 60, t.contact, { whatsapp: '+54 9 341 555 0000', email: 'hola@lucia.design' }),
    ],
  })
}

const TASK = (n: number) => `10000000-0000-4000-8000-00000000000${n}`
const HABIT = (n: number) => `20000000-0000-4000-8000-00000000000${n}`

/** Life OS de Lucía: el día de hoy, hábitos con varias semanas de historia y metas con pasos, tareas y hábitos */
export function lifeState(lang: Lang): MockState {
  const t = T[lang]
  const state = createState({ profiles: [profileRow({ username: PERSON.username, display_name: PERSON.name })] })
  const task = (n: number, title: string, extra: Record<string, unknown> = {}) => ({
    id: TASK(n), user_id: OWNER_ID, type: 'task', title, content: null, due_date: key(0), due_time: null, remind_minutes: null,
    reminded_at: null, completed_at: null, is_completed: false, is_archived: false, goal_id: null, is_focus: false,
    created_at: iso(-3), recurrence: null, subtasks: [], next_occurrence_id: null, ...extra,
  })
  state.tables.life_brain_items = [
    task(1, t.tasks[0], { due_time: '10:00', remind_minutes: 15, is_focus: true }),
    task(2, t.tasks[1], { due_time: '15:30', is_completed: true, completed_at: iso(0) }),
    task(3, t.tasks[2], { goal_id: 'g1' }),
    task(4, t.tasks[3], { recurrence: { freq: 'monthly', monthday: Number(key(0).slice(8)) } }),
    task(5, t.tasks[4], { due_date: key(2) }),
    task(6, t.goalTasks[1], { goal_id: 'g1', due_date: key(1), is_completed: true, completed_at: iso(-1) }),
    task(7, t.goalTasks[2], { goal_id: 'g1', due_date: key(4), due_time: '18:00' }),
  ]
  const habit = (n: number, name: string, icon: string, color: string, extra: Record<string, unknown> = {}) => ({
    id: HABIT(n), user_id: OWNER_ID, name, icon, color, frequency: { type: 'daily' }, is_active: true, sort_order: n,
    goal_id: null, target_value: null, unit: null, anchor: null, reminder_time: null, reminder_enabled: false,
    created_at: iso(-70), ...extra,
  })
  state.tables.life_habits = [
    habit(1, t.habits[0], 'Zap', '#22C55E', { goal_id: 'g1', frequency: { type: 'times_per_week', times: 3 }, reminder_time: '07:00', reminder_enabled: true }),
    habit(2, t.habits[1], 'BookOpen', '#8B5CF6', { anchor: t.anchor }),
    habit(3, t.habits[2], 'Droplets', '#38BDF8', { target_value: 8, unit: t.water }),
    habit(4, t.habits[3], 'Wind', '#F59E0B'),
    habit(5, t.habits[4], 'PenLine', '#EC4899', { frequency: { type: 'daily', days: [1, 2, 3, 4, 5] } }),
  ]
  // Historia creíble: casi todos los días, con algunos huecos (los hábitos perdonan un día perdido)
  const logs: Record<string, unknown>[] = []
  const skip: Record<number, number[]> = { 1: [1, 2, 4, 5, 8, 9, 11, 12, 15, 16, 18, 19, 22, 23, 25, 26], 2: [3, 10, 17], 3: [6, 13], 4: [2, 5, 9, 14, 20], 5: [0, 6, 7, 13, 14, 20, 21, 27, 28] }
  for (let n = 1; n <= 5; n++) {
    for (let d = 0; d < 42; d++) {
      if (skip[n].includes(d) || (d === 0 && n !== 3 && n !== 2)) continue
      logs.push({ id: `l${n}-${d}`, habit_id: HABIT(n), user_id: OWNER_ID, completed_date: key(-d), value: n === 3 ? (d === 0 ? 5 : 8) : 1 })
    }
  }
  state.tables.life_habit_logs = logs
  state.tables.life_daily_reviews = [{
    id: 'r1', user_id: OWNER_ID, date: key(0), reflection: null, closed_at: null,
    priorities: [
      { id: 'p1', kind: 'task', task_id: TASK(1) },
      { id: 'p2', kind: 'text', text: t.priority, done: false },
      { id: 'p3', kind: 'task', task_id: TASK(2) },
    ],
  }]
  state.tables.life_goals = [
    { id: 'g1', user_id: OWNER_ID, name: t.goal, description: t.goalDesc, target_date: key(150), progress: 50, status: 'in_progress', color: '#22C55E', sort_order: 0, created_at: iso(-60) },
    { id: 'g2', user_id: OWNER_ID, name: t.goal2, description: null, target_date: key(240), progress: 35, status: 'in_progress', color: '#38BDF8', sort_order: 1, created_at: iso(-90) },
    { id: 'g3', user_id: OWNER_ID, name: t.goal3, description: null, target_date: key(90), progress: 70, status: 'in_progress', color: '#EC4899', sort_order: 2, created_at: iso(-120) },
  ]
  state.tables.life_goal_milestones = t.steps.map((title, i) => ({
    id: `ms${i}`, user_id: OWNER_ID, goal_id: 'g1', title, is_completed: i < 2, completed_at: i < 2 ? iso(-20 + i * 10) : null, sort_order: i,
  }))
  state.tables.life_goal_checkins = []
  state.tables.life_transactions = []
  state.tables.life_achievements = []
  return state
}
