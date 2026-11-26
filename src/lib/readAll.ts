import type { SupabaseClient } from '@supabase/supabase-js'

/** Filas por pedido: la API de Supabase corta cada respuesta en "Max rows" (1000 por defecto) */
export const PAGE_ROWS = 1000
/** Tope de páginas por tabla (por las dudas: nunca un bucle sin fin) */
const MAX_PAGES = 2000

type Row = Record<string, unknown>
// El constructor de consultas de supabase-js: se tipa lo justo para filtrar, ordenar y paginar
export interface Query {
  eq(column: string, value: unknown): Query
  in(column: string, values: readonly unknown[]): Query
  is(column: string, value: null): Query
  gte(column: string, value: unknown): Query
  lte(column: string, value: unknown): Query
  lt(column: string, value: unknown): Query
  not(column: string, operator: string, value: unknown): Query
  order(column: string, options?: { ascending?: boolean }): Query
  range(from: number, to: number): PromiseLike<{ data: Row[] | null; error: { code?: string; message?: string } | null }>
}

/**
 * Todas las filas de una tabla que cumplen `filter`, de a PAGE_ROWS y con orden fijo (id): sin orden, Postgres puede
 * repetir o saltear filas entre páginas; sin paginar, una exportación con más de 1000 filas salía cortada sin avisar.
 * Si la tabla no tiene `id`, sigue sin orden. Una tabla legado que no existe en esta base devuelve [].
 */
export async function readAll(
  db: SupabaseClient, table: string, columns: string, filter: (q: Query) => Query,
  orderBy?: { column: string; ascending?: boolean },
): Promise<Row[]> {
  const rows: Row[] = []
  let ordered = true
  for (let page = 0, from = 0; page < MAX_PAGES; page++, from += PAGE_ROWS) {
    const base = filter(db.from(table).select(columns) as unknown as Query)
    // El orden pedido (si hay) y después el id, para que las páginas no se pisen
    const sorted = orderBy ? base.order(orderBy.column, { ascending: orderBy.ascending ?? true }) : base
    const { data, error } = await (ordered ? sorted.order('id') : sorted).range(from, from + PAGE_ROWS - 1)
    if (error && ordered && error.code === '42703' && from === 0) { ordered = false; from -= PAGE_ROWS; page--; continue }
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return rows
      throw error
    }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_ROWS) return rows
  }
  return rows
}

/** readAll con la forma de una respuesta de supabase-js ({ data, error }), para usarla dentro de un Promise.all */
export function readAllResult<T = Row>(
  db: SupabaseClient, table: string, columns: string, filter: (q: Query) => Query,
  orderBy?: { column: string; ascending?: boolean },
): Promise<{ data: T[] | null; error: unknown }> {
  return readAll(db, table, columns, filter, orderBy).then(
    data => ({ data: data as T[], error: null }),
    error => ({ data: null, error: error ?? new Error('readAll') }),
  )
}
