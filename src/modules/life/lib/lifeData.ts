import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Las tablas de Life OS todavía no están en database.types.ts
const db = supabase as unknown as SupabaseClient

// Hijas antes que madres (aunque las FK borran en cascada, así no depende de eso)
const LIFE_TABLES = [
  'life_habit_logs', 'life_goal_milestones', 'life_brain_items', 'life_transactions',
  'life_habits', 'life_goals', 'life_tasks', 'life_achievements', 'life_score', 'life_snapshots',
] as const

const PAGE = 1000

async function readAll(table: string, userId: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select('*').eq('user_id', userId).range(from, from + PAGE - 1)
    if (error) {
      // Tablas legado que pueden no existir en todas las bases: se omiten
      if (error.code === '42P01' || error.code === 'PGRST205') return rows
      throw error
    }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

/** Todos los datos de Life OS del usuario en un JSON. */
export async function exportLifeJson(userId: string): Promise<Blob> {
  const tables: Record<string, unknown[]> = {}
  for (const table of LIFE_TABLES) tables[table] = await readAll(table, userId)
  return new Blob([JSON.stringify({ exported_at: new Date().toISOString(), life_os: tables }, null, 2)], { type: 'application/json' })
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Movimientos de dinero en CSV (para abrir en una planilla). Cada fila con su moneda. */
export async function exportMoneyCsv(userId: string): Promise<Blob> {
  const rows = await readAll('life_transactions', userId)
  rows.sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))
  const cols = ['occurred_at', 'type', 'amount', 'currency', 'category', 'description'] as const
  const lines = [cols.join(','), ...rows.map(r => cols.map(c => csvCell(c === 'occurred_at' ? String(r[c]).slice(0, 10) : r[c])).join(','))]
  // BOM para que Excel lea bien los acentos
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
}

/** Borra todos los datos de Life OS (la cuenta, el perfil y los ajustes quedan). */
export async function deleteLifeData(userId: string): Promise<void> {
  for (const table of LIFE_TABLES) {
    const { error } = await db.from(table).delete().eq('user_id', userId)
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') throw error
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
