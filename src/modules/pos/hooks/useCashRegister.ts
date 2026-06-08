import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface CashRegister {
  id: string
  restaurant_id: string
  opened_by_name: string
  initial_amount: number
  notes: string | null
  status: 'open' | 'closed'
  created_at: string
  closed_at: string | null
  final_counted_amount: number | null
  expected_amount: number | null
  difference: number | null
  closed_by_name: string | null
}

export interface CashMovement {
  id: string
  cash_register_id: string
  type: 'income' | 'expense' | 'adjustment'
  amount: number
  description: string
  category: string | null
  created_by_name: string
  created_at: string
}

export interface CashSummary {
  sales: number
  incomes: number
  expenses: number
  tips: number
  adjustments: number
}

export function useCashRegister() {
  const { restaurant } = useRestaurant()
  const [register, setRegister] = useState<CashRegister | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [summary, setSummary] = useState<CashSummary>({ sales: 0, incomes: 0, expenses: 0, tips: 0, adjustments: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!restaurant?.id) return
    setLoading(true)
    try {
      const { data: reg } = await db
        .from('cash_registers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setRegister(reg ?? null)

      if (reg) {
        const [mvRes, ftRes] = await Promise.all([
          db.from('cash_movements')
            .select('*')
            .eq('cash_register_id', reg.id)
            .order('created_at', { ascending: false }),
          db.from('financial_transactions')
            .select('type, amount')
            .eq('cash_register_id', reg.id),
        ])
        setMovements(mvRes.data ?? [])
        const txns: { type: string; amount: number }[] = ftRes.data ?? []
        setSummary({
          sales:       txns.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0),
          incomes:     txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expenses:    txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
          tips:        txns.filter(t => t.type === 'tip').reduce((s, t) => s + t.amount, 0),
          adjustments: txns.filter(t => t.type === 'adjustment').reduce((s, t) => s + t.amount, 0),
        })
      } else {
        setMovements([])
        setSummary({ sales: 0, incomes: 0, expenses: 0, tips: 0, adjustments: 0 })
      }
    } catch (err) {
      console.error('useCashRegister:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id])

  useEffect(() => { load() }, [load])

  /* ── Realtime: refrescar KPIs cuando otro cobro entra a esta caja ── */
  const openRegisterIdRef = useRef<string | null>(null)
  useEffect(() => {
    openRegisterIdRef.current = register?.id ?? null
  }, [register?.id])

  useEffect(() => {
    if (!register?.id) return
    const registerId = register.id

    const channel = supabase.channel(`caja-live-${registerId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'cash_movements',
        filter: `cash_register_id=eq.${registerId}`,
      }, load)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'financial_transactions',
        filter: `cash_register_id=eq.${registerId}`,
      }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [register?.id, load])

  return { register, movements, summary, loading, reload: load, restaurantId: restaurant?.id ?? null }
}
