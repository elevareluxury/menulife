import { describe, expect, it } from 'vitest'
import { parseDump, splitDump, DUMP_MAX_ITEMS } from '../../src/modules/life/lib/brainDump'
import { whyValue } from '../../src/modules/life/lib/why'

// "Vaciar la cabeza": separar el texto en cosas y clasificarlas con las reglas del dictado.
// "Hoy" fijo: miércoles 14/10/2026 a la tarde (igual que voiceParse.test.ts).
const NOW = new Date(2026, 9, 14, 15, 0)
const strip = <T extends { id: string }>(items: T[]) => items.map(i => { const rest: Partial<T> = { ...i }; delete rest.id; return rest })

describe('splitDump', () => {
  it('una cosa por línea, sin viñetas ni líneas vacías', () => {
    expect(splitDump('- comprar pan\n\n• llamar a Juan\n1. pagar la luz\n2) idea: app\n[ ] regar\n   \n---')).toEqual([
      'comprar pan', 'llamar a Juan', 'pagar la luz', 'idea: app', 'regar',
    ])
  })

  it('por oraciones dentro de una línea, sin romper números ni "p.m."', () => {
    expect(splitDump('Gasté 3.500 en el súper. Mañana a las 10.30 dentista! ¿Idea? una app')).toEqual([
      'Gasté 3.500 en el súper', 'Mañana a las 10.30 dentista', '¿Idea', 'una app',
    ])
    expect(splitDump('call mom at 7 p.m. tomorrow')).toEqual(['call mom at 7 p.m. tomorrow'])
    expect(splitDump('café 4.50')).toEqual(['café 4.50'])
  })

  it('por comas sólo si es una lista de 3 o más', () => {
    expect(splitDump('pan, leche y huevos')).toEqual(['pan, leche y huevos'])
    expect(splitDump('mañana a las 10, llamar al médico')).toEqual(['mañana a las 10, llamar al médico'])
    expect(splitDump('comprar pan, llamar a Juan, gasté 3500 en nafta')).toEqual(['comprar pan', 'llamar a Juan', 'gasté 3500 en nafta'])
    // La coma decimal no corta
    expect(splitDump('pagué 12,50 de café, 3,20 de pan')).toEqual(['pagué 12,50 de café, 3,20 de pan'])
  })

  it('puntuación de otros alfabetos', () => {
    expect(splitDump('明天买牛奶。花了30元')).toEqual(['明天买牛奶', '花了30元'])
    expect(splitDump('牛奶、面包、鸡蛋')).toEqual(['牛奶', '面包', '鸡蛋'])
    expect(splitDump('कल डॉक्टर। 500 खर्च किए')).toEqual(['कल डॉक्टर', '500 खर्च किए'])
  })

  it('tiene un tope', () => {
    expect(splitDump(Array.from({ length: 100 }, (_, i) => `cosa ${i}`).join('\n'))).toHaveLength(DUMP_MAX_ITEMS)
  })
})

describe('parseDump', () => {
  it('clasifica cosas mezcladas en español', () => {
    const items = parseDump('mañana a las 10 llamar al médico\ngasté 3500 en el súper\nidea: app para regar plantas\ncobré 20 mil del freelance', 'es', NOW)
    expect(strip(items)).toEqual([
      { kind: 'task', text: 'Llamar al médico', amount: null, date: '2026-10-15', time: '10:00' },
      { kind: 'expense', text: 'Súper', amount: 3500, date: null, time: null },
      { kind: 'idea', text: 'App para regar plantas', amount: null, date: null, time: null },
      { kind: 'income', text: 'Freelance', amount: 20000, date: null, time: null },
    ])
    expect(new Set(items.map(i => i.id)).size).toBe(4)
  })

  it('otros idiomas', () => {
    expect(strip(parseDump('remind me to call mom tomorrow at 7 pm. I spent 4.50 on coffee', 'en', NOW))).toEqual([
      { kind: 'task', text: 'Call mom', amount: null, date: '2026-10-15', time: '19:00' },
      { kind: 'expense', text: 'Coffee', amount: 4.5, date: null, time: null },
    ])
    expect(parseDump('gastei 30 reais no mercado\namanhã dentista', 'pt', NOW).map(i => i.kind)).toEqual(['expense', 'task'])
    expect(parseDump('morgen um 9 Zahnarzt\nIdee: Garten', 'de', NOW).map(i => [i.kind, i.text])).toEqual([['task', 'Zahnarzt'], ['idea', 'Garten']])
    expect(parseDump('明天 提醒我 买牛奶。咖啡花了30元', 'zh', NOW).map(i => i.kind)).toEqual(['task', 'expense'])
    expect(parseDump('завтра напомни купить хлеб\nпотратил 500 на такси', 'ru', NOW).map(i => [i.kind, i.amount])).toEqual([['task', null], ['expense', 500]])
  })

  it('si no queda texto, usa la línea', () => {
    expect(parseDump('gasté 500', 'es', NOW)[0]).toMatchObject({ kind: 'expense', amount: 500, text: 'gasté 500' })
  })
})

describe('whyValue', () => {
  it('limpia espacios, corta en 200 y deja null si queda vacío', () => {
    expect(whyValue('  Para   dormir mejor \n')).toBe('Para dormir mejor')
    expect(whyValue('   ')).toBeNull()
    expect(whyValue(null)).toBeNull()
    expect(whyValue('á'.repeat(250))).toHaveLength(200)
  })
})
