import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PAGE_ROWS, readAll } from '../../src/lib/readAll'

// Exportar los datos (Studio y Life OS): la API corta cada respuesta en 1000 filas ("Max rows"). readAll pide de a
// 1000 con orden fijo hasta terminar, así una cuenta con 2500 movimientos los recibe todos.

type Row = Record<string, unknown>
interface Call { table: string; columns: string; filters: string[]; order?: string; from?: number; to?: number }

function fakeDb(tables: Record<string, Row[]>, opts: { noId?: string[]; missing?: string[] } = {}) {
  const calls: Call[] = []
  const db = {
    from(table: string) {
      const call: Call = { table, columns: '', filters: [] }
      calls.push(call)
      let rows = tables[table] ?? []
      const q = {
        select(columns: string) { call.columns = columns; return q },
        eq(col: string, v: unknown) { call.filters.push(`${col}=${String(v)}`); rows = rows.filter(r => r[col] === v); return q },
        in(col: string, vs: unknown[]) { call.filters.push(`${col} in`); rows = rows.filter(r => vs.includes(r[col])); return q },
        is(col: string, v: null) { call.filters.push(`${col} is null`); rows = rows.filter(r => r[col] === v); return q },
        order(col: string) { call.order = col; return q },
        async range(from: number, to: number) {
          call.from = from; call.to = to
          if (opts.missing?.includes(table)) return { data: null, error: { code: '42P01' } }
          if (call.order === 'id' && opts.noId?.includes(table)) return { data: null, error: { code: '42703' } }
          const sorted = call.order ? [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id))) : rows
          return { data: sorted.slice(from, Math.min(to + 1, from + PAGE_ROWS)), error: null }
        },
      }
      return q
    },
  }
  return { db: db as unknown as SupabaseClient, calls }
}

const many = (n: number, extra: Row = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: `t${String(i).padStart(5, '0')}`, user_id: 'u1', ...extra }))

describe('readAll', () => {
  it('trae más de 1000 filas en páginas, sin repetir ni saltear', async () => {
    const { db, calls } = fakeDb({ life_transactions: [...many(2500), ...many(3, { user_id: 'otra' })] })
    const rows = await readAll(db, 'life_transactions', '*', q => q.eq('user_id', 'u1'))
    expect(rows).toHaveLength(2500)
    expect(new Set(rows.map(r => r.id)).size).toBe(2500)
    expect(calls.map(c => [c.from, c.order])).toEqual([[0, 'id'], [1000, 'id'], [2000, 'id']])
  })

  it('sin columna id sigue sin orden', async () => {
    const { db } = fakeDb({ life_daily_reviews: many(5) }, { noId: ['life_daily_reviews'] })
    expect(await readAll(db, 'life_daily_reviews', '*', q => q.eq('user_id', 'u1'))).toHaveLength(5)
  })

  it('una tabla legado que no existe devuelve vacío', async () => {
    const { db } = fakeDb({}, { missing: ['life_score'] })
    expect(await readAll(db, 'life_score', '*', q => q.eq('user_id', 'u1'))).toEqual([])
  })

  it('respeta columnas y filtros', async () => {
    const { db, calls } = fakeDb({ profile_modules: [{ id: 'a', profile_id: 'p', deleted_at: null }, { id: 'b', profile_id: 'p', deleted_at: 'x' }] })
    const rows = await readAll(db, 'profile_modules', 'id', q => q.in('profile_id', ['p']).is('deleted_at', null))
    expect(rows.map(r => r.id)).toEqual(['a'])
    expect(calls[0]).toMatchObject({ columns: 'id', filters: ['profile_id in', 'deleted_at is null'] })
  })
})
