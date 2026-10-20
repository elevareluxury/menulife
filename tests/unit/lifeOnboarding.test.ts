// Onboarding de Life OS: la propuesta ya armada de cada opción (meta + hábito chico + primera tarea), en los 12 idiomas.
import { describe, expect, it } from 'vitest'
import {
  frequencyFor, isOnboardingArea, MAX_GOAL, MAX_HABIT, MAX_TASK, ONBOARDING_AREAS, planProblem, proposalFor, suggestedDays,
  type OnboardingArea,
} from '../../src/modules/life/lib/lifeOnboarding'
import { HABIT_ICONS, LIFE_COLORS } from '../../src/modules/life/lib/lifePalette'
import { isScheduledOn } from '../../src/modules/life/lib/habitStreak'
import es from '../../src/i18n/app/life/es'
import en from '../../src/i18n/app/life/en'
import pt from '../../src/i18n/app/life/pt'
import fr from '../../src/i18n/app/life/fr'
import de from '../../src/i18n/app/life/de'
import it_ from '../../src/i18n/app/life/it'
import zh from '../../src/i18n/app/life/zh'
import ja from '../../src/i18n/app/life/ja'
import ko from '../../src/i18n/app/life/ko'
import hi from '../../src/i18n/app/life/hi'
import ar from '../../src/i18n/app/life/ar'
import ru from '../../src/i18n/app/life/ru'

const DICTS = { es, en, pt, fr, de, it: it_, zh, ja, ko, hi, ar, ru }
const MONDAY = 1
const SUNDAY = 0

describe('opciones', () => {
  it('7 áreas y "otra", todas reconocidas', () => {
    expect(ONBOARDING_AREAS).toEqual(['health', 'money', 'learn', 'order', 'work', 'relationships', 'rest', 'other'])
    for (const a of ONBOARDING_AREAS) expect(isOnboardingArea(a)).toBe(true)
    expect(isOnboardingArea('salud')).toBe(false)
    expect(isOnboardingArea(undefined)).toBe(false)
  })
})

describe('proposalFor: una propuesta por opción', () => {
  const expected: Record<Exclude<OnboardingArea, 'other'>, { goal: string; habit: string; task: string; icon: string; days: number[] }> = {
    health: { goal: 'Sentirme con más energía', habit: 'Caminar 15 minutos', task: 'Elegir a qué hora salgo a caminar', icon: 'Dumbbell', days: [1, 3, 5] },
    money: { goal: 'Ordenar mi plata', habit: 'Anotar lo que gasté', task: 'Anotar mis gastos fijos del mes', icon: 'PenLine', days: [0, 1, 2, 3, 4, 5, 6] },
    learn: { goal: 'Aprender algo nuevo', habit: 'Practicar 15 minutos', task: 'Elegir qué voy a aprender y con qué', icon: 'BookOpen', days: [1, 2, 3, 4, 5] },
    order: { goal: 'Tener mi casa en orden', habit: 'Ordenar 10 minutos', task: 'Ordenar un cajón', icon: 'Leaf', days: [0, 1, 2, 3, 4, 5, 6] },
    work: { goal: 'Avanzar con mi proyecto', habit: 'Una hora de trabajo enfocado', task: 'Anotar el próximo paso del proyecto', icon: 'Zap', days: [1, 2, 3, 4, 5] },
    relationships: { goal: 'Estar más cerca de los míos', habit: 'Escribirle a alguien que quiero', task: 'Llamar a alguien que extraño', icon: 'Heart', days: [1, 2, 4, 6] },
    rest: { goal: 'Dormir mejor', habit: 'Sin pantallas 30 minutos antes de dormir', task: 'Elegir mi hora de ir a dormir', icon: 'Moon', days: [0, 1, 2, 3, 4, 5, 6] },
  }

  for (const [area, e] of Object.entries(expected) as [Exclude<OnboardingArea, 'other'>, typeof expected.health][]) {
    it(`${area}: meta, hábito con días sugeridos y tarea para hoy`, () => {
      const p = proposalFor(area, es, MONDAY)
      expect(p.area).toBe(area)
      expect(p.goal.name).toBe(e.goal)
      expect(p.habit).toMatchObject({ name: e.habit, icon: e.icon, color: p.goal.color })
      // Un lunes: los sugeridos, más el lunes si no estaba (relaciones: martes, jueves y sábado → suma el lunes)
      expect(p.habit?.days).toEqual(e.days)
      expect(p.task).toEqual({ title: e.task })
    })
  }

  it('"otra": la meta es lo que escribió la persona, con un hábito y una tarea genéricos', () => {
    const p = proposalFor('other', es, MONDAY, '  Escribir mi libro  ')
    expect(p.goal.name).toBe('Escribir mi libro')
    expect(p.habit?.name).toBe('Dedicarle 10 minutos')
    expect(p.task?.title).toBe('Escribir el primer paso')
    expect(p.habit?.days).toEqual([0, 1, 2, 3, 4, 5, 6])
    // Sin texto, queda la palabra de la opción (y se puede editar después)
    expect(proposalFor('other', es, MONDAY).goal.name).toBe('Otra')
    // El texto se corta al tope de la hoja de metas
    expect(proposalFor('other', es, MONDAY, 'x'.repeat(200)).goal.name).toHaveLength(MAX_GOAL)
  })

  it('cada opción tiene un color de la paleta y un ícono de hábito que existe', () => {
    for (const a of ONBOARDING_AREAS) {
      const p = proposalFor(a, es, MONDAY, 'Algo')
      expect(LIFE_COLORS as readonly string[]).toContain(p.goal.color)
      expect(HABIT_ICONS.map(i => i.name)).toContain(p.habit?.icon)
    }
  })

  it('el hábito siempre está programado hoy (para tildarlo en Mi día), sea el día que sea', () => {
    // 2026-10-18 fue domingo: del 18 al 24, un día de cada uno
    for (let i = 0; i < 7; i++) {
      const date = `2026-10-${18 + i}`
      for (const a of ONBOARDING_AREAS) {
        const p = proposalFor(a, es, i)
        expect(isScheduledOn(frequencyFor(p.habit!.days), date), `${a} el día ${i}`).toBe(true)
      }
    }
  })

  it('en los 12 idiomas: textos cargados, distintos del español y dentro de los topes', () => {
    for (const [lang, dict] of Object.entries(DICTS)) {
      for (const a of ONBOARDING_AREAS) {
        const p = proposalFor(a, dict, SUNDAY, 'X')
        expect(p.goal.name.trim(), `${lang} ${a} meta`).not.toBe('')
        expect(p.habit!.name.trim(), `${lang} ${a} hábito`).not.toBe('')
        expect(p.task!.title.trim(), `${lang} ${a} tarea`).not.toBe('')
        // Sin cortar: los textos propuestos ya entran en los topes de las hojas
        expect(dict.onboarding.proposals[a].goal.length, `${lang} ${a}`).toBeLessThanOrEqual(MAX_GOAL)
        expect(dict.onboarding.proposals[a].habit.length, `${lang} ${a}`).toBeLessThanOrEqual(MAX_HABIT)
        expect(dict.onboarding.proposals[a].task.length, `${lang} ${a}`).toBeLessThanOrEqual(MAX_TASK)
        expect(dict.onboarding.areas[a].trim(), `${lang} ${a} opción`).not.toBe('')
        if (lang !== 'es' && a !== 'other') expect(p.goal.name, `${lang} ${a} traducida`).not.toBe(proposalFor(a, es, SUNDAY).goal.name)
      }
      expect(dict.onboarding.step(1, 2), lang).toMatch(/1/)
      expect(dict.onboarding.step(1, 2), lang).toMatch(/2/)
    }
  })
})

describe('suggestedDays y frequencyFor', () => {
  it('suma hoy a los días sugeridos sin repetir', () => {
    expect(suggestedDays('health', 3)).toEqual([1, 3, 5])
    expect(suggestedDays('health', 0)).toEqual([0, 1, 3, 5])
    expect(suggestedDays('rest', 4)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
  it('guarda la frecuencia como HabitSheet: los 7 días = "daily"', () => {
    expect(frequencyFor([5, 1, 3, 3])).toEqual({ type: 'weekly', days: [1, 3, 5] })
    expect(frequencyFor([0, 1, 2, 3, 4, 5, 6])).toEqual({ type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] })
    expect(frequencyFor([7, -1, 2])).toEqual({ type: 'weekly', days: [2] })
  })
})

describe('planProblem', () => {
  const base = proposalFor('health', es, MONDAY)
  it('lista para crear tal cual, y también sin hábito o sin tarea', () => {
    expect(planProblem(base)).toBeNull()
    expect(planProblem({ ...base, habit: null })).toBeNull()
    expect(planProblem({ ...base, task: null })).toBeNull()
    expect(planProblem({ ...base, habit: null, task: null })).toBeNull()
  })
  it('pide la meta, el nombre del hábito, al menos un día y el texto de la tarea', () => {
    expect(planProblem({ ...base, goal: { ...base.goal, name: '   ' } })).toBe('goal')
    expect(planProblem({ ...base, habit: { ...base.habit!, name: '' } })).toBe('habit')
    expect(planProblem({ ...base, habit: { ...base.habit!, days: [] } })).toBe('days')
    expect(planProblem({ ...base, task: { title: ' ' } })).toBe('task')
  })
})
