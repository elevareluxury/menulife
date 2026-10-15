import { describe, expect, it } from 'vitest'
import { parseVoice } from '../../src/modules/life/lib/voiceParse'

// Cargar con la voz (V1.1): del dictado a gasto, ingreso, tarea o idea. "Hoy" fijo: miércoles 14/10/2026 a la tarde.
const NOW = new Date(2026, 9, 14, 15, 0)

describe('parseVoice', () => {
  it('gastos e ingresos en español', () => {
    expect(parseVoice('gasté 3500 en el súper', 'es', NOW)).toEqual({ kind: 'expense', text: 'Súper', amount: 3500, date: null, time: null })
    expect(parseVoice('pagué 12,50 de café', 'es', NOW)).toMatchObject({ kind: 'expense', text: 'Café', amount: 12.5 })
    expect(parseVoice('compré zapatillas por 85.000 pesos', 'es', NOW)).toMatchObject({ kind: 'expense', text: 'Zapatillas', amount: 85000 })
    expect(parseVoice('cobré 3 mil de una changa', 'es', NOW)).toMatchObject({ kind: 'income', text: 'Changa', amount: 3000 })
    expect(parseVoice('me pagaron el sueldo 900.000', 'es', NOW)).toMatchObject({ kind: 'income', text: 'Sueldo', amount: 900000 })
    expect(parseVoice('gasté ayer 200 en nafta', 'es', NOW).amount).toBe(200)
  })

  it('tareas con fecha y hora', () => {
    expect(parseVoice('mañana llamar al médico', 'es', NOW)).toEqual({ kind: 'task', text: 'Llamar al médico', amount: null, date: '2026-10-15', time: null })
    expect(parseVoice('recordame pagar la luz el lunes a las 10', 'es', NOW)).toEqual({ kind: 'task', text: 'Pagar la luz', amount: null, date: '2026-10-19', time: '10:00' })
    expect(parseVoice('tengo que ir al banco pasado mañana a las 9 de la noche', 'es', NOW)).toMatchObject({ kind: 'task', text: 'Ir al banco', date: '2026-10-16', time: '21:00' })
    expect(parseVoice('hoy a las 18:30 gimnasio', 'es', NOW)).toMatchObject({ kind: 'task', text: 'Gimnasio', date: '2026-10-14', time: '18:30' })
    // El mismo día de la semana que hoy es la semana que viene
    expect(parseVoice('el miércoles dentista', 'es', NOW).date).toBe('2026-10-21')
  })

  it('sin palabras clave: con monto es gasto, con fecha es tarea y si no, idea', () => {
    expect(parseVoice('café 4,50', 'es', NOW)).toMatchObject({ kind: 'expense', amount: 4.5, text: 'Café' })
    expect(parseVoice('una app para regar plantas', 'es', NOW)).toMatchObject({ kind: 'idea', text: 'App para regar plantas', amount: null })
  })

  it('otros idiomas', () => {
    expect(parseVoice('I spent 4.50 on coffee', 'en', NOW)).toMatchObject({ kind: 'expense', amount: 4.5, text: 'Coffee' })
    expect(parseVoice('remind me to call mom tomorrow at 7 pm', 'en', NOW)).toEqual({ kind: 'task', text: 'Call mom', amount: null, date: '2026-10-15', time: '19:00' })
    expect(parseVoice('got paid 2,500 from the client', 'en', NOW)).toMatchObject({ kind: 'income', amount: 2500, text: 'Client' })
    expect(parseVoice('gastei 30 reais no mercado', 'pt', NOW)).toMatchObject({ kind: 'expense', amount: 30, text: 'Mercado' })
    expect(parseVoice("j'ai dépensé 12 euros au café", 'fr', NOW)).toMatchObject({ kind: 'expense', amount: 12, text: 'Café' })
    expect(parseVoice('morgen um 9 Zahnarzt', 'de', NOW)).toMatchObject({ kind: 'task', date: '2026-10-15', time: '09:00', text: 'Zahnarzt' })
    expect(parseVoice('明天 提醒我 买牛奶', 'zh', NOW)).toMatchObject({ kind: 'task', date: '2026-10-15', text: '买牛奶' })
    expect(parseVoice('コーヒーに500円使った', 'ja', NOW)).toMatchObject({ kind: 'expense', amount: 500, text: 'コーヒー' })
    expect(parseVoice('завтра напомни купить хлеб', 'ru', NOW)).toMatchObject({ kind: 'task', date: '2026-10-15', text: 'Купить хлеб' })
  })
})
