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
  order(column: string): Query
  range(from: number, to: number): PromiseLike<{ data: Row[] | null; error: { code?: string; message?: string } | null }>
}

/**
 * Todas las filas de una tabla que cumplen `filter`, de a PAGE_ROWS y con orden fijo (id): sin orden, Postgres puede
 * repetir o saltear filas entre páginas; sin paginar, una exportación con más de 1000 filas salía cortada sin avisar.
 * Si la tabla no tiene `id`, sigue sin orden. Una tabla legado que no existe en esta base devuelve [].
 */
export async function readAll(
  db: SupabaseClient, table: string, columns: string, filter: (q: Query) => Query,
): Promise<Row[]> {
  const rows: Row[] = []
  let ordered = true
  for (let page = 0, from = 0; page < MAX_PAGES; page++, from += PAGE_ROWS) {
    const base = filter(db.from(table).select(columns) as unknown as Query)
    const { data, error } = await (ordered ? base.order('id') : base).range(from, from + PAGE_ROWS - 1)
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
