import { describe, expect, it } from 'vitest'
import {
  balances, cleanPerson, emptyDraft, ME, parseAmount, personKey, personSuggestions, planSplit, settlementIncome, splitEqual,
  type SharedDraft, type Split,
} from '../../src/modules/life/lib/splits'

const draft = (p: Partial<SharedDraft>): SharedDraft => ({ ...emptyDraft(), ...p })
let n = 0
const split = (p: Partial<Split>): Split => ({
  id: `s${++n}`, transaction_id: null, person: 'Juan', direction: 'owed_to_me', amount: 1, currency: 'ARS', note: null,
  settled_at: null, settlement_transaction_id: null, created_at: `2026-10-0${(n % 9) + 1}T12:00:00Z`, ...p,
})

describe('splitEqual', () => {
  it('reparte en centavos que suman exacto', () => {
    expect(splitEqual(100000, 2)).toEqual([50000, 50000])
    expect(splitEqual(100, 3)).toEqual([34, 33, 33])
    expect(splitEqual(1001, 4)).toEqual([251, 250, 250, 250])
    for (const [total, k] of [[99999, 7], [1, 3], [123457, 12]]) {
      expect(splitEqual(total, k).reduce((a, b) => a + b, 0)).toBe(total)
    }
  })
  it('sin partes o sin total, nada', () => {
    expect(splitEqual(100, 0)).toEqual([])
    expect(splitEqual(0, 3)).toEqual([])
  })
})

describe('planSplit', () => {
  it('pagué yo 1000 con Juan a medias: el gasto es el total y Juan me debe 500', () => {
    const plan = planSplit(1000, draft({ people: ['Juan'] }))
    expect(plan).toMatchObject({ ok: true, expense: 1000, myShare: 500, debts: [{ person: 'Juan', direction: 'owed_to_me', amount: 500 }] })
  })

  it('pagó Ana una cena de 3: registro mi parte y se la debo a Ana (lo de Luis no es asunto mío)', () => {
    const plan = planSplit(3000, draft({ payer: 'Ana', people: ['Ana', 'Luis'] }))
    expect(plan).toMatchObject({ ok: true, expense: 1000, myShare: 1000, debts: [{ person: 'Ana', direction: 'i_owe', amount: 1000 }] })
  })

  it('centavos: 100 entre 3, yo pongo el centavo que sobra', () => {
    const plan = planSplit(100, draft({ people: ['Juan', 'Ana'] }))
    expect(plan.ok && plan.debts.map(d => d.amount)).toEqual([33.33, 33.33])
    expect(plan.ok && plan.myShare).toBe(33.34)
  })

  it('montos a mano tienen que cerrar con el total', () => {
    const ok = planSplit(1000, draft({ people: ['Juan'], mode: 'manual', manual: { [ME]: '300', Juan: '700' } }))
    expect(ok).toMatchObject({ ok: true, debts: [{ person: 'Juan', amount: 700 }] })
    expect(planSplit(1000, draft({ people: ['Juan'], mode: 'manual', manual: { [ME]: '300', Juan: '600' } })))
      .toEqual({ ok: false, reason: 'manualMismatch', diff: 100 })
    expect(planSplit(1000, draft({ people: ['Juan'], mode: 'manual', manual: { [ME]: '300', Juan: '800' } })))
      .toEqual({ ok: false, reason: 'manualMismatch', diff: -100 })
    expect(planSplit(10.5, draft({ people: ['Juan'], mode: 'manual', manual: { [ME]: '5,25', Juan: '5.25' } })).ok).toBe(true)
  })

  it('casos que no se pueden guardar', () => {
    expect(planSplit(1000, draft({ people: [] }))).toEqual({ ok: false, reason: 'noPeople' })
    expect(planSplit(0, draft({ people: ['Juan'] }))).toEqual({ ok: false, reason: 'noAmount' })
    expect(planSplit(NaN, draft({ people: ['Juan'] }))).toEqual({ ok: false, reason: 'noAmount' })
    expect(planSplit(1000, draft({ payer: 'Pedro', people: ['Juan'] }))).toEqual({ ok: false, reason: 'payerMissing' })
    expect(planSplit(1000, draft({ people: ['Juan'], mode: 'manual', manual: { [ME]: '1000' } }))).toEqual({ ok: false, reason: 'nothingShared' })
    expect(planSplit(1000, draft({ payer: 'Juan', people: ['Juan'], mode: 'manual', manual: { Juan: '1000' } }))).toEqual({ ok: false, reason: 'nothingShared' })
  })

  it('personas repetidas o con espacios cuentan una vez', () => {
    const plan = planSplit(900, draft({ people: ['  Juan ', 'juan', 'Martín', 'martin'] }))
    expect(plan.ok && plan.debts.map(d => d.person)).toEqual(['Juan', 'Martín'])
  })
})

describe('balances', () => {
  it('neto por persona y moneda, sin mezclar monedas ni contar lo saldado', () => {
    const rows = balances([
      split({ person: 'Juan', amount: 500 }),
      split({ person: 'juan', direction: 'i_owe', amount: 200 }),
      split({ person: 'Juan', amount: 10, currency: 'USD' }),
      split({ person: 'Ana', direction: 'i_owe', amount: 1000 }),
      split({ person: 'Juan', amount: 999, settled_at: '2026-10-10T00:00:00Z' }),
    ])
    const juanArs = rows.find(r => personKey(r.person) === 'juan' && r.currency === 'ARS')!
    expect(juanArs).toMatchObject({ net: 300, owedToMe: 500, iOwe: 200 })
    expect(juanArs.items).toHaveLength(2)
    expect(rows.find(r => r.currency === 'USD')!.net).toBe(10)
    expect(rows.find(r => r.person === 'Ana')!.net).toBe(-1000)
    expect(rows[0].person).toBe('Ana')
  })

  it('centavos sin errores de coma flotante', () => {
    const [r] = balances([split({ amount: 0.1 }), split({ amount: 0.2 })])
    expect(r.net).toBe(0.3)
  })
})

describe('settlementIncome', () => {
  it('se registra lo que te debían; lo que debías ya estaba en tus gastos', () => {
    expect(settlementIncome({ owedToMe: 500 })).toBe(500)
    expect(settlementIncome({ owedToMe: 0 })).toBe(0)
  })
})

describe('nombres', () => {
  it('cleanPerson y personKey', () => {
    expect(cleanPerson('  Juan   Pablo ')).toBe('Juan Pablo')
    expect(cleanPerson('x'.repeat(50))).toHaveLength(40)
    expect(personKey('Martín')).toBe(personKey('martin'))
  })
  it('sugerencias: las más recientes primero, sin repetir ni los ya elegidos', () => {
    const list = [
      { person: 'Juan', created_at: '2026-10-01' }, { person: 'Ana', created_at: '2026-10-05' },
      { person: 'juan', created_at: '2026-10-03' }, { person: 'Mariana', created_at: '2026-10-02' },
    ]
    expect(personSuggestions(list, '')).toEqual(['Ana', 'juan', 'Mariana'])
    // Primero los que empiezan con lo escrito, después los que lo contienen
    expect(personSuggestions(list, 'an')).toEqual(['Ana', 'juan', 'Mariana'])
    expect(personSuggestions(list, 'ma')).toEqual(['Mariana'])
    expect(personSuggestions(list, '', ['ANA'])).toEqual(['juan', 'Mariana'])
  })
  it('parseAmount', () => {
    expect(parseAmount('1.234,50')).toBe(1234.5)
    expect(parseAmount('1,234.50')).toBe(1234.5)
    expect(parseAmount('12,5')).toBe(12.5)
    expect(Number.isNaN(parseAmount(''))).toBe(true)
  })
})
