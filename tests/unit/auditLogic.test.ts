import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Auditoría V2 de lógica y datos (docs/auditoria/auditoria-v2-logica.md): cada bloque reproduce un error que se
// arregló. La cola sin conexión necesita localStorage y window, que acá se simulan.

const upserts: { table: string; row: Record<string, unknown> }[] = []
let upsertError: unknown = null
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: async (row: Record<string, unknown>) => { upserts.push({ table, row }); return { error: upsertError } },
    }),
  },
}))
vi.mock('react-hot-toast', () => ({ default: Object.assign(() => {}, { error: () => {} }) }))

const store = new Map<string, string>()
let storageFull = false
const g = globalThis as unknown as Record<string, unknown>
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { if (storageFull) throw new Error('QuotaExceededError'); store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
}
if (!g.window) g.window = Object.assign(new EventTarget(), { localStorage: g.localStorage })
if (!g.CustomEvent) g.CustomEvent = class extends Event { detail: unknown; constructor(t: string, o?: { detail?: unknown }) { super(t); this.detail = o?.detail } }

const { enqueue, flushOutbox, pendingFor, isAuthError } = await import('@/modules/life/lib/outbox')
const { localDateOf } = await import('@/modules/life/lib/moneyFuture')
const { moneyCsvLines } = await import('@/modules/life/lib/lifeData')

const row = (id: string, user: string) => ({ table: 'life_brain_items' as const, module: 'brain' as const, row: { id, user_id: user, title: `t-${id}` } })

describe('cola sin conexión (lib/outbox.ts)', () => {
  beforeEach(() => { store.clear(); upserts.length = 0; upsertError = null; storageFull = false })

  it('con la sesión de otra cuenta no sube ni cuenta lo pendiente de la primera (antes se descartaba y se mostraba su título)', async () => {
    enqueue(row('a1', 'ana'))
    enqueue(row('b1', 'beto'))
    expect(pendingFor('beto')).toBe(1)
    await flushOutbox('beto')
    expect(upserts.map(u => u.row.id)).toEqual(['b1'])
    // Lo de Ana sigue en el dispositivo para cuando vuelva
    expect(pendingFor('ana')).toBe(1)
    await flushOutbox('ana')
    expect(upserts.map(u => u.row.id)).toEqual(['b1', 'a1'])
    expect(pendingFor('ana')).toBe(0)
  })

  it('un error de sesión (token vencido) no descarta la fila: se reintenta', async () => {
    enqueue(row('a1', 'ana'))
    upsertError = { code: 'PGRST301', message: 'JWT expired' }
    await flushOutbox('ana')
    expect(pendingFor('ana')).toBe(1)
    expect(isAuthError({ status: 401 })).toBe(true)
    expect(isAuthError({ code: '23505', message: 'duplicate' })).toBe(false)
  })

  it('un dato inválido sí se saca de la cola (no se reintenta para siempre)', async () => {
    enqueue(row('a1', 'ana'))
    upsertError = { code: '23514', message: 'check violation' }
    await flushOutbox('ana')
    expect(pendingFor('ana')).toBe(0)
  })

  it('sin lugar en el dispositivo, enqueue avisa que no se guardó', () => {
    storageFull = true
    expect(enqueue(row('a1', 'ana'))).toBe(false)
    storageFull = false
    expect(enqueue(row('a2', 'ana'))).toBe(true)
  })
})

describe('fechas locales de un movimiento', () => {
  const tz = process.env.TZ
  beforeAll(() => { process.env.TZ = 'America/Argentina/Buenos_Aires' })
  afterAll(() => { process.env.TZ = tz })

  it('editar un movimiento de las 22 h no lo pasa al día siguiente (antes se cortaba el ISO en la "T")', () => {
    // 22:30 del 15 en Buenos Aires = 01:30 UTC del 16
    expect(localDateOf('2026-10-16T01:30:00+00:00')).toBe('2026-10-15')
    // Una fecha sola (un fijo) queda igual: no se corre un día al interpretarla como UTC
    expect(localDateOf('2026-10-05')).toBe('2026-10-05')
  })

  it('el CSV de Dinero usa la fecha local, nombra las categorías propias y neutraliza fórmulas', () => {
    const lines = moneyCsvLines([
      { occurred_at: '2026-10-16T01:30:00+00:00', type: 'income', amount: 1500, currency: 'ARS', category: 'Otros', description: 'Juan te devolvió' },
      { occurred_at: '2026-10-01T15:00:00+00:00', type: 'expense', amount: 10, currency: 'USD', category: 'c:1', description: '=HYPERLINK("x")' },
    ], new Map([['c:1', 'Viajes']]))
    expect(lines[0]).toBe('occurred_at,type,amount,currency,category,description')
    expect(lines[1]).toBe('2026-10-01,expense,10,USD,Viajes,"\'=HYPERLINK(""x"")"')
    expect(lines[2]).toBe('2026-10-15,income,1500,ARS,Otros,Juan te devolvió')
  })
})
