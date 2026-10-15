import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { matchesSearch, searchTerm } from '../lib/moneyInsights'
import type { Transaction } from './useMoney'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const LIMIT = 300

/**
 * Busca en todos los movimientos (no sólo el mes que se ve): descripción o categoría, y también el nombre traducido de
 * la categoría (`labelOf`). La base trae candidatos y el dispositivo confirma cada palabra.
 */
export function useMoneySearch(query: string, labelOf: (category: string) => string, categories: readonly string[]) {
  const { user } = useAuthStore()
  const [results, setResults] = useState<Transaction[] | null>(null)
  const [searching, setSearching] = useState(false)
  const term = searchTerm(query)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sin búsqueda no hay resultados */
    if (!user || !term) { setResults(null); setSearching(false); return }
    setSearching(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    let alive = true
    const id = window.setTimeout(async () => {
      const words = term.split(' ')
      // Categorías cuyo nombre (en el idioma de la persona) contiene lo buscado
      const cats = categories.filter(c => words.some(w => labelOf(c).toLowerCase().includes(w.toLowerCase())))
      const ors = words.flatMap(w => [`description.ilike.*${w}*`, `category.ilike.*${w}*`])
      if (cats.length) ors.push(`category.in.(${cats.map(c => `"${c}"`).join(',')})`)
      const { data } = await db.from('life_transactions').select('*').eq('user_id', user.id)
        .or(ors.join(',')).order('occurred_at', { ascending: false }).limit(LIMIT)
      if (!alive) return
      setResults(((data ?? []) as Transaction[]).filter(tx => matchesSearch(tx, term, labelOf(tx.category))))
      setSearching(false)
    }, 250)
    return () => { alive = false; window.clearTimeout(id) }
  }, [user, term, labelOf, categories])

  return { results, searching, limited: (results?.length ?? 0) >= LIMIT }
}
