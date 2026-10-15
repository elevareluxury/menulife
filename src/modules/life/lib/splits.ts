// Gastos compartidos (supabase/migrations/20261029000003_life_shared_expenses.sql): lógica pura, sin red ni DOM.
//
// Modelo: el movimiento registra lo que salió de tu bolsillo. Las deudas van aparte (life_splits).
//   · Pagaste vos → el gasto es el total y cada persona te debe su parte ('owed_to_me').
//   · Pagó otra persona → el gasto es tu parte y se la debés a quien pagó ('i_owe').
// Todo se calcula en centavos para que las partes cierren exacto con el total.

export type SplitDirection = 'owed_to_me' | 'i_owe'

export interface Split {
  id: string
  transaction_id: string | null
  person: string
  direction: SplitDirection
  amount: number
  currency: string
  note: string | null
  settled_at: string | null
  settlement_transaction_id: string | null
  created_at: string
}

/** Clave de quien participa en el reparto: 'me' (vos) o el nombre de la persona. */
export const ME = '__me__'

export const PERSON_MAX = 40
export const MAX_PEOPLE = 12

export const toCents = (n: number) => Math.round(n * 100)
export const fromCents = (c: number) => c / 100

/** Nombre prolijo: sin espacios de más y hasta 40 caracteres (como pide la base). */
export function cleanPerson(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, PERSON_MAX).trim()
}

/** Mismo nombre sin importar mayúsculas ni acentos ("juan" = "Juan", "Martín" = "Martin"). */
export function personKey(name: string): string {
  return cleanPerson(name).toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Reparte `totalCents` en `n` partes iguales que suman exacto. Los centavos que sobran van a las primeras
 * partes (la primera es la tuya: si sobra un centavo, lo ponés vos).
 */
export function splitEqual(totalCents: number, n: number): number[] {
  if (n <= 0 || totalCents <= 0) return []
  const base = Math.floor(totalCents / n)
  const rest = totalCents - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0))
}

/** Importe escrito a mano ("1.234,50", "12.5", "500") → número, o NaN si no se entiende. */
export function parseAmount(raw: string): number {
  let s = raw.replace(/[^\d.,]/g, '')
  if (!s) return NaN
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    // El último separador es el decimal; el otro, de miles
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma >= 0) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export interface SharedDraft {
  /** ME = pagaste vos; si no, el nombre de quien pagó (tiene que estar en `people`) */
  payer: string
  people: string[]
  mode: 'equal' | 'manual'
  /** Montos a mano por participante (ME o el nombre) */
  manual: Record<string, string>
}

export const emptyDraft = (): SharedDraft => ({ payer: ME, people: [], mode: 'equal', manual: {} })

export interface SplitDebt { person: string; direction: SplitDirection; amount: number }

export type SplitPlan =
  | { ok: true; myShare: number; expense: number; debts: SplitDebt[]; shares: Record<string, number> }
  | { ok: false; reason: 'noPeople' | 'noAmount' | 'payerMissing' | 'manualMismatch' | 'manualInvalid' | 'nothingShared'; diff?: number }

/**
 * Qué queda guardado con un gasto compartido de `total`:
 *   · `expense`: el importe del movimiento (el total si pagaste vos; tu parte si pagó otra persona).
 *   · `debts`: quién te debe o a quién le debés (sólo partes > 0).
 */
export function planSplit(total: number, draft: SharedDraft): SplitPlan {
  const people = uniquePeople(draft.people)
  if (!people.length) return { ok: false, reason: 'noPeople' }
  const totalCents = toCents(total)
  if (!(totalCents > 0)) return { ok: false, reason: 'noAmount' }
  const payerIsMe = draft.payer === ME
  if (!payerIsMe && !people.some(p => personKey(p) === personKey(draft.payer))) return { ok: false, reason: 'payerMissing' }

  const participants = [ME, ...people]
  let cents: number[]
  if (draft.mode === 'equal') {
    cents = splitEqual(totalCents, participants.length)
  } else {
    cents = participants.map(p => {
      const raw = draft.manual[p] ?? ''
      return raw.trim() ? toCents(parseAmount(raw)) : 0
    })
    if (cents.some(c => !Number.isFinite(c) || c < 0)) return { ok: false, reason: 'manualInvalid' }
    const sum = cents.reduce((a, b) => a + b, 0)
    if (sum !== totalCents) return { ok: false, reason: 'manualMismatch', diff: fromCents(totalCents - sum) }
  }
  const shares: Record<string, number> = {}
  participants.forEach((p, i) => { shares[p] = fromCents(cents[i]) })
  const myCents = cents[0]

  if (payerIsMe) {
    const debts = people.map((p, i) => ({ person: p, direction: 'owed_to_me' as const, amount: fromCents(cents[i + 1]) }))
      .filter(d => d.amount > 0)
    if (!debts.length) return { ok: false, reason: 'nothingShared' }
    return { ok: true, myShare: fromCents(myCents), expense: fromCents(totalCents), debts, shares }
  }
  // Pagó otra persona: registrás tu parte y se la debés a quien pagó (lo que deben los demás no es asunto tuyo)
  const payer = people.find(p => personKey(p) === personKey(draft.payer))!
  if (myCents <= 0) return { ok: false, reason: 'nothingShared' }
  return { ok: true, myShare: fromCents(myCents), expense: fromCents(myCents), debts: [{ person: payer, direction: 'i_owe', amount: fromCents(myCents) }], shares }
}

function uniquePeople(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const n of names) {
    const clean = cleanPerson(n)
    const key = personKey(clean)
    if (!clean || seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

export interface PersonBalance {
  /** Clave estable: persona (sin mayúsculas ni acentos) + moneda */
  key: string
  person: string
  currency: string
  /** > 0: esa persona te debe; < 0: le debés vos */
  net: number
  owedToMe: number
  iOwe: number
  items: Split[]
}

/** Saldos pendientes por persona y moneda (nunca se suman monedas distintas). Los que dan 0 también salen: se pueden saldar. */
export function balances(splits: Split[]): PersonBalance[] {
  const map = new Map<string, { person: string; currency: string; owed: number; owe: number; items: Split[]; last: string }>()
  for (const s of splits) {
    if (s.settled_at) continue
    const key = `${personKey(s.person)}|${s.currency}`
    const row = map.get(key) ?? { person: s.person, currency: s.currency, owed: 0, owe: 0, items: [], last: '' }
    const c = toCents(Number(s.amount))
    if (s.direction === 'owed_to_me') row.owed += c; else row.owe += c
    row.items.push(s)
    // El nombre que se muestra es el más reciente
    if (s.created_at >= row.last) { row.last = s.created_at; row.person = s.person }
    map.set(key, row)
  }
  return [...map.entries()]
    .map(([key, r]) => ({
      key, person: r.person, currency: r.currency, net: fromCents(r.owed - r.owe),
      owedToMe: fromCents(r.owed), iOwe: fromCents(r.owe), items: r.items,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.person.localeCompare(b.person))
}

/**
 * Al saldar: el ingreso que conviene registrar para que el balance del mes quede bien.
 * Es lo que esa persona te debía (el gasto ya estaba registrado completo). Lo que le debías vos ya está en tus
 * gastos como tu parte, así que no se registra otro gasto (sería contarlo dos veces).
 */
export function settlementIncome(b: Pick<PersonBalance, 'owedToMe'>): number {
  return b.owedToMe > 0 ? b.owedToMe : 0
}

/** Nombres ya usados (el más reciente primero), sin repetir, que empiezan o contienen lo escrito. */
export function personSuggestions(splits: Pick<Split, 'person' | 'created_at'>[], typed: string, exclude: string[] = [], max = 6): string[] {
  const skip = new Set(exclude.map(personKey))
  const q = personKey(typed)
  const seen = new Set<string>()
  const ordered = [...splits].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const starts: string[] = []
  const contains: string[] = []
  for (const s of ordered) {
    const key = personKey(s.person)
    if (seen.has(key) || skip.has(key)) continue
    seen.add(key)
    if (!q || key.startsWith(q)) starts.push(s.person)
    else if (key.includes(q)) contains.push(s.person)
  }
  return [...starts, ...contains].slice(0, max)
}
