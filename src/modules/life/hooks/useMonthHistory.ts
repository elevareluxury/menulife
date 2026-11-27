import { useEffect, useMemo, useState } from 'react'
import { readAllResult } from '@/lib/readAll'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { monthRange } from '../lib/moneyInsights'
import { historyMonths, monthlyTotals, type ChartTx, type MonthHistory } from '../lib/moneyCharts'
import { startOfLocalDayISO } from '../lib/zonedTime'
import { shiftDate } from '../lib/habitStreak'
import { useLifeTimeZone, useToday } from './useToday'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/**
 * "Últimos meses" de Dinero: ingresos y gastos de los `count` meses que terminan en `end`, por moneda.
 * Pide sólo las columnas que hacen falta y sólo hasta hoy (lo programado todavía no cuenta), de a 1000 (readAll):
 * varios meses importados del banco pasan las 1000 filas por pedido. `refreshKey`: cambia cuando Dinero recargó
 * (un movimiento nuevo, editado o borrado) para volver a leer. `null` hasta la primera lectura (o si falló).
 */
export function useMonthHistory(end: string, count: number, mainCurrency: string, refreshKey: unknown): MonthHistory | null {
  const { user } = useAuthStore()
  const tz = useLifeTimeZone()
  const today = useToday()
  const months = useMemo(() => historyMonths(end, count), [end, count])
  const [rows, setRows] = useState<{ months: string[]; data: ChartTx[] } | null>(null)
  const key = `${user?.id}|${months[0]}|${end}|${tz}|${today}`

  useEffect(() => {
    if (!user) return
    let alive = true
    const [from] = monthRange(months[0], tz)
    const [, monthEnd] = monthRange(end, tz)
    const tomorrow = startOfLocalDayISO(shiftDate(today, 1), tz)
    const to = monthEnd < tomorrow ? monthEnd : tomorrow
    void readAllResult<ChartTx>(db, 'life_transactions', 'type,amount,currency,occurred_at',
      q => q.eq('user_id', user.id).gte('occurred_at', from).lt('occurred_at', to),
      { column: 'occurred_at', ascending: true },
    ).then(({ data, error }) => {
      // Sin conexión: se queda lo que había (o nada, y la tarjeta no se muestra)
      if (alive && !error && data) setRows({ months, data })
    })
    return () => { alive = false }
  }, [user, months, end, tz, today, key, refreshKey])

  // Mientras llegan los meses nuevos sigue a la vista la ventana anterior (con sus meses, nunca datos mezclados):
  // así la tarjeta no desaparece un momento al ir a un mes más viejo
  return useMemo(
    () => (rows ? monthlyTotals(rows.data, rows.months, mainCurrency, today, tz) : null),
    [rows, mainCurrency, today, tz],
  )
}
