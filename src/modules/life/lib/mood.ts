// Ánimo del día (cierre de "Mi día"): 1 = muy mal … 5 = muy bien; null = no contestó. Funciones puras (las prueban
// tests/unit/mood.test.ts): resúmenes y comparaciones con mínimos de datos. Nada de diagnósticos ni de causas: si los
// datos no alcanzan o la diferencia no es clara, no se dice nada.

export type Mood = 1 | 2 | 3 | 4 | 5
export const MOODS: readonly Mood[] = [1, 2, 3, 4, 5]

export const isMood = (v: unknown): v is Mood => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5

/** Días con ánimo que hacen falta para comparar (con menos, cualquier diferencia puede ser casualidad). */
export const MOOD_MIN_DAYS = 14
/** Días mínimos de cada lado de la comparación. */
export const MOOD_MIN_GROUP = 5
/** Diferencia mínima entre promedios (en la escala de 1 a 5) para decir que es "clara". */
export const MOOD_MIN_DIFF = 0.5

export interface MoodDay { date: string; mood: number }

export interface MoodSummary { days: number; avg: number; counts: [number, number, number, number, number] }

/** Cuántos días con ánimo, el promedio y cuántas veces cada carita. null si no hay ningún día. */
export function moodSummary(days: readonly MoodDay[]): MoodSummary | null {
  const valid = days.filter(d => isMood(d.mood))
  if (!valid.length) return null
  const counts: MoodSummary['counts'] = [0, 0, 0, 0, 0]
  for (const d of valid) counts[d.mood - 1]++
  return { days: valid.length, avg: valid.reduce((s, d) => s + d.mood, 0) / valid.length, counts }
}

/** La carita más cercana a un promedio (para nombrarlo: "Bien", "Más o menos"…). */
export const nearestMood = (avg: number): Mood => Math.min(5, Math.max(1, Math.round(avg))) as Mood

export interface MoodSplit { withAvg: number; withoutAvg: number; withDays: number; withoutDays: number }

/**
 * Promedio de ánimo de los días que cumplen `inGroup` contra el resto. null si hay menos de 14 días con ánimo, si algún
 * lado tiene menos de 5 días o si la diferencia es menor a medio punto.
 */
export function moodSplit(days: readonly MoodDay[], inGroup: (date: string) => boolean): MoodSplit | null {
  const valid = days.filter(d => isMood(d.mood))
  if (valid.length < MOOD_MIN_DAYS) return null
  const a = valid.filter(d => inGroup(d.date))
  const b = valid.filter(d => !inGroup(d.date))
  if (a.length < MOOD_MIN_GROUP || b.length < MOOD_MIN_GROUP) return null
  const avg = (l: MoodDay[]) => l.reduce((s, d) => s + d.mood, 0) / l.length
  const withAvg = avg(a), withoutAvg = avg(b)
  if (Math.abs(withAvg - withoutAvg) < MOOD_MIN_DIFF) return null
  return { withAvg, withoutAvg, withDays: a.length, withoutDays: b.length }
}

/** Mediana (para separar "días con más gastos" del resto sin un umbral inventado). */
export function median(values: readonly number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((x, y) => x - y)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
