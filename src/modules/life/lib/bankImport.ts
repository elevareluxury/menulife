// Importar movimientos del banco (V1.1). Todo pasa en el dispositivo: se lee el archivo exportado del home banking
// (CSV o Excel), se adivinan las columnas, se convierten fechas e importes y se saltean los que ya estaban.
// Funciones puras (sin DOM) para poder probarlas; el Excel se abre en lib/xlsx.ts.

export type Cell = string
export type Grid = Cell[][]

// ── CSV ──────────────────────────────────────────────────────────────────────

/** Separador más probable entre ; , tab y | (el que más se repite igual en las primeras líneas). */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 15)
  let best = ','
  let bestScore = -1
  for (const d of [';', ',', '\t', '|']) {
    const counts = lines.map(l => splitCsvLine(l, d).length)
    const common = mode(counts)
    if (common < 2) continue
    const score = counts.filter(c => c === common).length * common
    if (score > bestScore) { best = d; bestScore = score }
  }
  return best
}

function mode(xs: number[]): number {
  const m = new Map<number, number>()
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 0
}

function splitCsvLine(line: string, d: string): string[] {
  return parseCsv(line, d)[0] ?? []
}

/** CSV con comillas ("a;b", comillas dobles escapadas y saltos de línea dentro de comillas). */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): Grid {
  const rows: Grid = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += ch
    } else if (ch === '"' && cell.trim() === '') { quoted = true; cell = '' }
    else if (ch === delimiter) { row.push(cell.trim()); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell.trim()); cell = ''
      if (row.some(c => c !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell.trim())
  if (row.some(c => c !== '')) rows.push(row)
  return rows
}

// ── Importes ─────────────────────────────────────────────────────────────────

export type DecimalSep = ',' | '.'

/** Separador decimal de una columna: mira los valores con 1 o 2 cifras al final ("1.234,56" → coma). */
export function detectDecimal(values: string[]): DecimalSep {
  let comma = 0
  let dot = 0
  for (const raw of values) {
    const v = raw.replace(/[^\d.,]/g, '')
    const m = v.match(/([.,])(\d{1,2})$/)
    if (!m) continue
    if (m[1] === ',') comma++; else dot++
  }
  return comma > dot ? ',' : '.'
}

/** "−$ 1.234,56", "(1,234.56)", "1234.5-", "USD 10" → número con signo; null si no es un importe. */
export function parseAmount(raw: string, decimal: DecimalSep): number | null {
  let s = String(raw ?? '').trim()
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  if (/^[-−–]|^[^\d]*[-−–]\s*\d/.test(s)) negative = true
  if (/[-−–]$/.test(s)) negative = true
  const digits = s.replace(/[^\d.,]/g, '')
  if (!/\d/.test(digits)) return null
  const thousands = decimal === ',' ? '.' : ','
  const normal = digits.split(thousands).join('').replace(decimal, '.')
  if ((normal.match(/\./g) ?? []).length > 1) return null
  const n = Number(normal)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

// ── Fechas ───────────────────────────────────────────────────────────────────

export type DateOrder = 'dmy' | 'mdy' | 'ymd'

const pad = (n: number) => String(n).padStart(2, '0')

function validKey(y: number, m: number, d: number): string | null {
  if (y < 100) y += y < 70 ? 2000 : 1900
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1970 || y > 2100) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCMonth() !== m - 1) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

/** Orden de las fechas de una columna: año primero, o día/mes según los valores (si nada lo decide, el del idioma). */
export function detectDateOrder(values: string[], fallback: 'dmy' | 'mdy' = 'dmy'): DateOrder {
  let firstBig = false
  let secondBig = false
  for (const v of values) {
    const p = v.trim().match(/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})/)
    if (!p) continue
    if (p[1].length === 4) return 'ymd'
    if (Number(p[1]) > 12) firstBig = true
    if (Number(p[2]) > 12) secondBig = true
  }
  if (firstBig && !secondBig) return 'dmy'
  if (secondBig && !firstBig) return 'mdy'
  return fallback
}

/** Fecha local "YYYY-MM-DD" o null. Acepta 15/03/2026, 2026-03-15, 15-03-26, 15.03.2026 y números de serie de Excel. */
export function parseDate(raw: string, order: DateOrder): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    // Excel: días desde 1899-12-30
    const days = Math.floor(Number(s))
    if (days < 25569 || days > 80000) return null
    const dt = new Date(Date.UTC(1899, 11, 30) + days * 86_400_000)
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
  }
  const p = s.match(/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})/)
  if (!p) return null
  const [a, b, c] = [Number(p[1]), Number(p[2]), Number(p[3])]
  if (p[1].length === 4 || order === 'ymd') return validKey(a, b, c)
  return order === 'mdy' ? validKey(c, a, b) : validKey(c, b, a)
}

// ── Columnas ─────────────────────────────────────────────────────────────────

export interface Mapping {
  /** Fila donde empiezan los datos (después de los títulos) */
  start: number
  date: number
  description: number
  /** Importe con signo (una columna) … */
  amount: number | null
  /** … o débito y crédito por separado */
  debit: number | null
  credit: number | null
  decimal: DecimalSep
  order: DateOrder
}

const DEBIT = /d[eé]bit|debe|egreso|cargo|retiro|withdraw|gasto|ausgabe|soll|uscit|addebit|débito|dépense|расход|支出|出金|출금|निकासी|مدين|سحب/i
const CREDIT = /cr[eé]dit|haber|ingreso|dep[oó]sit|abono|entrada|einnahme|haben|entrat|accredit|recette|приход|收入|入金|입금|जमा|دائن|إيداع/i
const AMOUNT = /importe|monto|amount|valor|betrag|montant|importo|сумма|金额|金額|금액|राशि|المبلغ|quantia/i
const DATE = /fecha|date|data|datum|дата|日期|日付|날짜|तारीख|التاريخ/i
const DESC = /descrip|concepto|detalle|movimiento|referencia|description|details|memo|payee|narrat|beschreib|verwendung|libell|descri|описан|назнач|摘要|说明|内容|摘要|적요|내용|विवरण|الوصف|البيان|histórico/i

/** Adivina dónde están fecha, descripción e importe(s). */
export function detectMapping(grid: Grid, fallbackOrder: 'dmy' | 'mdy' = 'dmy'): Mapping | null {
  if (!grid.length) return null
  const width = Math.max(...grid.map(r => r.length))
  // Fila de títulos: la primera (de las 15 primeras) con un título de fecha y otro de importe
  let header = -1
  for (let i = 0; i < Math.min(15, grid.length); i++) {
    const r = grid[i]
    if (r.some(c => DATE.test(c)) && r.some(c => AMOUNT.test(c) || DEBIT.test(c) || CREDIT.test(c))) { header = i; break }
  }
  const start = header + 1
  const body = grid.slice(start).filter(r => r.length >= 2)
  if (!body.length) return null
  const col = (j: number) => body.map(r => r[j] ?? '')
  const ratio = (j: number, ok: (v: string) => boolean) => {
    const vals = col(j).filter(v => v !== '')
    return vals.length ? vals.filter(ok).length / vals.length : 0
  }
  const titles = header >= 0 ? grid[header] : []
  const byTitle = (re: RegExp, exclude: number[] = []) =>
    titles.findIndex((t, j) => re.test(t) && !exclude.includes(j))

  // Fecha: título o la columna con más fechas
  let date = byTitle(DATE)
  if (date < 0 || ratio(date, v => parseDate(v, 'dmy') != null || parseDate(v, 'mdy') != null) < 0.6) {
    date = -1
    let best = 0
    for (let j = 0; j < width; j++) {
      const r = ratio(j, v => parseDate(v, 'dmy') != null || parseDate(v, 'mdy') != null)
      if (r > best) { best = r; date = j }
    }
    if (best < 0.6) return null
  }

  const isNumber = (v: string) => /\d/.test(v) && !/[a-z]{3,}/i.test(v) && parseAmount(v, detectDecimal([v])) != null && parseDate(v, 'dmy') == null
  let debit = byTitle(DEBIT, [date])
  let credit = byTitle(CREDIT, [date, debit])
  let amount: number | null = byTitle(AMOUNT, [date, debit, credit])
  if (debit >= 0 && credit >= 0) amount = null
  else {
    debit = -1; credit = -1
    if (amount == null || amount < 0 || ratio(amount, isNumber) < 0.6) {
      amount = null
      let best = 0
      for (let j = width - 1; j >= 0; j--) {
        if (j === date) continue
        const r = ratio(j, isNumber)
        if (r > best + 0.05) { best = r; amount = j }
      }
      if (amount == null || best < 0.6) return null
    }
  }

  // Descripción: título o la columna de texto más larga
  let description = byTitle(DESC, [date, amount ?? -1, debit, credit])
  if (description < 0) {
    let best = -1
    for (let j = 0; j < width; j++) {
      if ([date, amount, debit, credit].includes(j)) continue
      const avg = col(j).reduce((s, v) => s + (/[a-z]/i.test(v) ? v.length : 0), 0) / body.length
      if (avg > best) { best = avg; description = j }
    }
  }

  const moneyCols = amount != null ? [amount] : [debit, credit]
  return {
    start, date, description, amount,
    debit: debit >= 0 ? debit : null, credit: credit >= 0 ? credit : null,
    decimal: detectDecimal(moneyCols.flatMap(col)),
    order: detectDateOrder(col(date), fallbackOrder),
  }
}

// ── Movimientos ──────────────────────────────────────────────────────────────

export interface ImportedTx {
  date: string
  type: 'income' | 'expense'
  amount: number
  description: string
}

/** Filas → movimientos (las que no tienen fecha o importe válido se saltean). */
export function toTransactions(grid: Grid, m: Mapping): { items: ImportedTx[]; skipped: number } {
  const items: ImportedTx[] = []
  let skipped = 0
  for (const r of grid.slice(m.start)) {
    const date = parseDate(r[m.date] ?? '', m.order)
    let value: number | null = null
    if (m.amount != null) value = parseAmount(r[m.amount] ?? '', m.decimal)
    else {
      const out = parseAmount(r[m.debit ?? -1] ?? '', m.decimal)
      const inn = parseAmount(r[m.credit ?? -1] ?? '', m.decimal)
      if (inn) value = Math.abs(inn)
      else if (out) value = -Math.abs(out)
    }
    if (!date || value == null || value === 0) { if (r.some(c => c)) skipped++; continue }
    const description = (r[m.description] ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
    items.push({ date, type: value > 0 ? 'income' : 'expense', amount: Math.round(Math.abs(value) * 100) / 100, description })
  }
  return { items, skipped }
}

const norm = (s: string) => s.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
export const txKey = (t: { date: string; type: string; amount: number; description?: string | null }) =>
  `${t.date}|${t.type}|${Math.round(Number(t.amount) * 100)}|${norm(t.description ?? '')}`

/**
 * Separa lo nuevo de lo que ya estaba (misma fecha, tipo, importe y descripción). Cuenta repeticiones: si en el banco
 * hubo dos cafés iguales el mismo día y en Mycen hay uno, se importa el otro.
 */
export function splitDuplicates(items: ImportedTx[], existing: { date: string; type: string; amount: number; description?: string | null }[]) {
  const have = new Map<string, number>()
  for (const e of existing) have.set(txKey(e), (have.get(txKey(e)) ?? 0) + 1)
  const fresh: ImportedTx[] = []
  let duplicates = 0
  for (const it of items) {
    const k = txKey(it)
    const n = have.get(k) ?? 0
    if (n > 0) { have.set(k, n - 1); duplicates++ } else fresh.push(it)
  }
  return { fresh, duplicates }
}
