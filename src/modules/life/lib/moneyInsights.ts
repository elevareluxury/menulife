// Dinero: meses, "en qué se fue", búsqueda y la memoria de categorías. Todo puro (sin red ni DOM) y en el dispositivo.

export interface MoneyTx {
  type: 'income' | 'expense'
  amount: number | string
  category: string
  description: string | null
  currency: string
  occurred_at: string
}

const pad = (n: number) => String(n).padStart(2, '0')

// ── Meses ('YYYY-MM', en hora local) ─────────────────────────────────────────

export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  return monthKeyOf(new Date(y, m - 1 + delta, 1))
}

/** Primer día del mes y primer día del siguiente (instantes ISO, comparables con occurred_at). */
export function monthRange(key: string): [string, string] {
  const [y, m] = key.split('-').map(Number)
  return [new Date(y, m - 1, 1).toISOString(), new Date(y, m, 1).toISOString()]
}

export function inMonth(iso: string, key: string): boolean {
  return monthKeyOf(new Date(iso)) === key
}

/** Saldo acumulado por día del mes; en el mes actual llega hasta hoy. */
export function monthCurve(txs: MoneyTx[], key: string, today: Date): number[] {
  const [y, m] = key.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const days = monthKeyOf(today) === key ? today.getDate() : lastDay
  const daily = new Array<number>(days).fill(0)
  for (const tx of txs) {
    const d = new Date(tx.occurred_at)
    if (monthKeyOf(d) !== key) continue
    const i = d.getDate() - 1
    if (i < days) daily[i] += tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)
  }
  let run = 0
  return daily.map(v => (run += v))
}

// ── En qué se fue (gastos por categoría, en una sola moneda) ─────────────────

export interface CategoryShare {
  category: string
  amount: number
  /** Parte del total de gastos, de 0 a 1 */
  share: number
  /** Cambio contra el mes anterior en % (redondeado); null si el mes anterior no tuvo gastos ahí */
  change: number | null
}

function expensesByCategory(txs: MoneyTx[], currency: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const tx of txs) {
    if (tx.type !== 'expense' || tx.currency !== currency) continue
    map.set(tx.category, (map.get(tx.category) ?? 0) + Number(tx.amount))
  }
  return map
}

export function categoryBreakdown(month: MoneyTx[], previous: MoneyTx[], currency: string): CategoryShare[] {
  const cur = expensesByCategory(month, currency)
  const prev = expensesByCategory(previous, currency)
  const total = [...cur.values()].reduce((s, v) => s + v, 0)
  if (total <= 0) return []
  return [...cur.entries()]
    .map(([category, amount]) => {
      const before = prev.get(category) ?? 0
      return {
        category, amount, share: amount / total,
        change: before > 0 ? Math.round(((amount - before) / before) * 100) : null,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

// ── Búsqueda ─────────────────────────────────────────────────────────────────

/** Minúsculas, sin acentos ni signos; los números quedan (sirve para buscar). */
export function foldText(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Coincide si cada palabra buscada aparece en la descripción, la categoría (y su nombre traducido) o el monto. */
export function matchesSearch(tx: MoneyTx, query: string, categoryLabel: string): boolean {
  const words = foldText(query).split(' ').filter(Boolean)
  if (!words.length) return true
  const hay = foldText(`${tx.description ?? ''} ${tx.category} ${categoryLabel} ${Number(tx.amount)}`)
  return words.every(w => hay.includes(w))
}

/** Texto seguro para el filtro `or` de la base (sin comas, paréntesis, comodines ni barras). */
export function searchTerm(query: string): string {
  return query.replace(/[,()*%\\:."']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}

// ── Memoria de categorías ────────────────────────────────────────────────────
// Lo que la persona ya ordenó enseña a ordenar lo nuevo: "UBER *TRIP 4821" en Transporte → el próximo "Uber trip" también.

/** Descripción sin números ni signos, para comparar movimientos parecidos. */
export function descriptionKey(s: string | null | undefined): string {
  return foldText(s ?? '').replace(/\p{N}+/gu, ' ').split(' ').filter(w => w.length > 1).join(' ')
}

const firstWords = (key: string) => key.split(' ').slice(0, 2).join(' ')

export interface CategoryMemory {
  exact: Map<string, string>
  start: Map<string, string>
}

/** Aprende de movimientos con descripción y categoría distinta de "Otros"; manda la categoría más usada (y, si empatan, la última). */
export function learnCategories(history: MoneyTx[]): CategoryMemory {
  const tally = (map: Map<string, Map<string, { n: number; last: string }>>, key: string, tx: MoneyTx) => {
    if (!key) return
    const byCat = map.get(key) ?? new Map()
    const row = byCat.get(tx.category) ?? { n: 0, last: '' }
    row.n += 1
    if (tx.occurred_at > row.last) row.last = tx.occurred_at
    byCat.set(tx.category, row)
    map.set(key, byCat)
  }
  const exact = new Map<string, Map<string, { n: number; last: string }>>()
  const start = new Map<string, Map<string, { n: number; last: string }>>()
  for (const tx of history) {
    if (!tx.category || tx.category === 'Otros') continue
    const key = descriptionKey(tx.description)
    if (!key) continue
    tally(exact, `${tx.type}|${key}`, tx)
    tally(start, `${tx.type}|${firstWords(key)}`, tx)
  }
  const pick = (map: Map<string, Map<string, { n: number; last: string }>>, unique: boolean) => {
    const out = new Map<string, string>()
    for (const [key, byCat] of map) {
      // Por las primeras palabras sólo si siempre fue la misma categoría (si no, es ambiguo)
      if (unique && byCat.size > 1) continue
      const best = [...byCat.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last))[0]
      out.set(key, best[0])
    }
    return out
  }
  return { exact: pick(exact, false), start: pick(start, true) }
}

/** Categoría aprendida para un movimiento nuevo, o null si no hay uno parecido. */
export function suggestCategory(memory: CategoryMemory, type: 'income' | 'expense', description: string | null | undefined): string | null {
  const key = descriptionKey(description)
  if (!key) return null
  return memory.exact.get(`${type}|${key}`) ?? memory.start.get(`${type}|${firstWords(key)}`) ?? null
}
