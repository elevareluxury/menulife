import { describe, expect, it } from 'vitest'
import { diffSplits, draftFromSplits, followTotal, ME, planSplit, type Split } from '../../src/modules/life/lib/splits'

// Editar un gasto compartido: la edición parte de las deudas guardadas y las pendientes se recalculan con planSplit.

const at = (i: number) => `2026-10-0${i}T12:00:00.000Z`
function split(p: Partial<Split>): Split {
  return {
    id: p.id ?? Math.random().toString(36).slice(2), transaction_id: 'tx', person: 'Juan', direction: 'owed_to_me', amount: 500,
    currency: 'ARS', note: 'Cena', settled_at: null, settlement_transaction_id: null, created_at: at(1), ...p,
  }
}

describe('draftFromSplits', () => {
  it('sin deudas: no es compartido', () => {
    expect(draftFromSplits(1000, [])).toEqual({ kind: 'none' })
  })

  it('pagué yo a partes iguales: vuelve "Partes iguales" con las personas en orden', () => {
    const r = draftFromSplits(1000, [
      split({ person: 'Ana', amount: 333.33, created_at: at(2) }),
      split({ person: 'Juan', amount: 333.33, created_at: at(1) }),
    ])
    expect(r).toEqual({ kind: 'draft', draft: { payer: ME, people: ['Juan', 'Ana'], mode: 'equal', manual: {} } })
  })

  it('pagué yo con montos a mano: vuelve con cada monto y el mío', () => {
    const r = draftFromSplits(1000, [split({ person: 'Juan', amount: 700 })])
    expect(r).toEqual({ kind: 'draft', draft: { payer: ME, people: ['Juan'], mode: 'manual', manual: { [ME]: '300', Juan: '700' } } })
    // Y planSplit da exactamente lo mismo que estaba guardado
    if (r.kind !== 'draft') throw new Error()
    const plan = planSplit(1000, r.draft)
    expect(plan).toMatchObject({ ok: true, expense: 1000, debts: [{ person: 'Juan', direction: 'owed_to_me', amount: 700 }] })
  })

  it('pagó otra persona: el monto es mi parte, que es lo que le debo', () => {
    const r = draftFromSplits(1000, [split({ person: 'Ana', direction: 'i_owe', amount: 1000 })])
    expect(r).toEqual({ kind: 'draft', draft: { payer: 'Ana', people: ['Ana'], mode: 'manual', manual: { [ME]: '1000' } } })
    if (r.kind !== 'draft') throw new Error()
    expect(planSplit(1000, r.draft)).toMatchObject({ ok: true, expense: 1000, debts: [{ person: 'Ana', direction: 'i_owe', amount: 1000 }] })
    // Si cambio el monto, mi parte lo sigue
    const next = followTotal(r.draft, '1200')
    expect(planSplit(1200, next)).toMatchObject({ ok: true, expense: 1200, debts: [{ person: 'Ana', direction: 'i_owe', amount: 1200 }] })
  })

  it('con algo ya saldado, la parte compartida queda bloqueada', () => {
    expect(draftFromSplits(1000, [split({ settled_at: at(3) }), split({ person: 'Ana' })])).toEqual({ kind: 'locked' })
  })

  it('deudas que no salen de un reparto conocido: bloqueada', () => {
    expect(draftFromSplits(100, [split({ amount: 500 })])).toEqual({ kind: 'locked' })
    expect(draftFromSplits(1000, [split({ direction: 'i_owe' }), split({ person: 'Ana' })])).toEqual({ kind: 'locked' })
  })
})

describe('followTotal', () => {
  it('sólo sigue al monto si nadie más tiene un monto escrito', () => {
    const d = { payer: ME, people: ['Juan'], mode: 'manual' as const, manual: { [ME]: '300', Juan: '700' } }
    expect(followTotal(d, '2000')).toBe(d)
    expect(followTotal({ ...d, mode: 'equal' }, '2000')).toEqual({ ...d, mode: 'equal' })
    expect(followTotal({ ...d, manual: { [ME]: '300' } }, '2000').manual[ME]).toBe('2000')
  })
})

describe('diffSplits', () => {
  const pending = [split({ id: 's-juan', person: 'Juan', amount: 500 }), split({ id: 's-ana', person: 'Ana', amount: 500 })]

  it('nada cambió: nada que hacer', () => {
    expect(diffSplits(pending, [
      { person: 'Juan', direction: 'owed_to_me', amount: 500 }, { person: 'Ana', direction: 'owed_to_me', amount: 500 },
    ], 'ARS', 'Cena')).toEqual({ update: [], insert: [], remove: [] })
  })

  it('cambia el monto y la moneda: se actualizan las mismas filas', () => {
    const r = diffSplits(pending, [
      { person: 'juan', direction: 'owed_to_me', amount: 600 }, { person: 'Ana', direction: 'owed_to_me', amount: 600 },
    ], 'USD', 'Cena')
    expect(r.insert).toEqual([])
    expect(r.remove).toEqual([])
    expect(r.update).toEqual([
      { id: 's-juan', person: 'juan', amount: 600, currency: 'USD', note: 'Cena' },
      { id: 's-ana', person: 'Ana', amount: 600, currency: 'USD', note: 'Cena' },
    ])
  })

  it('cambia la gente: entra la nueva y sale la que ya no está', () => {
    const r = diffSplits(pending, [{ person: 'Juan', direction: 'owed_to_me', amount: 500 }, { person: 'Leo', direction: 'owed_to_me', amount: 500 }], 'ARS', 'Cena')
    expect(r).toEqual({ update: [], insert: [{ person: 'Leo', direction: 'owed_to_me', amount: 500 }], remove: ['s-ana'] })
  })

  it('cambia quién pagó: otra dirección es otra deuda', () => {
    const r = diffSplits(pending, [{ person: 'Juan', direction: 'i_owe', amount: 400 }], 'ARS', 'Cena')
    expect(r.insert).toEqual([{ person: 'Juan', direction: 'i_owe', amount: 400 }])
    expect(r.remove.sort()).toEqual(['s-ana', 's-juan'])
  })

  it('ya no es compartido: se van todas las pendientes; las saldadas nunca se tocan', () => {
    const withSettled = [...pending, split({ id: 's-old', settled_at: at(4) })]
    expect(diffSplits(withSettled, [], 'ARS', null)).toEqual({ update: [], insert: [], remove: ['s-juan', 's-ana'] })
  })

  it('los centavos se comparan exactos', () => {
    const r = diffSplits([split({ id: 'x', amount: 333.33 })], [{ person: 'Juan', direction: 'owed_to_me', amount: 333.330000001 }], 'ARS', 'Cena')
    expect(r.update).toEqual([])
  })
})
