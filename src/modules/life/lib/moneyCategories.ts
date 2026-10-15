// Dinero: categorías fijas (claves en español, traducidas con t.categories) y propias (tabla life_categories).
// Un movimiento guarda una propia como 'c:' + id en `category`. Todo lo que muestra una categoría pasa por acá, así
// nunca se ve un 'c:uuid' crudo. Puro (sin red ni DOM).
import { CATEGORY_COLORS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, LIFE_COLORS } from './lifePalette'

export type MoneyType = 'income' | 'expense'

export interface CustomCategory {
  id: string
  type: MoneyType
  name: string
  color: string
  icon?: string | null
  archived_at: string | null
  created_at?: string
}

export const CUSTOM_PREFIX = 'c:'
export const CATEGORY_NAME_MAX = 40
/** Igual que el trigger life_categories_rules */
export const CATEGORY_ACTIVE_LIMIT = 50

export const customKey = (id: string) => `${CUSTOM_PREFIX}${id}`
export const isCustomKey = (key: string | null | undefined): key is string => !!key && key.startsWith(CUSTOM_PREFIX)
export const customIdOf = (key: string) => (isCustomKey(key) ? key.slice(CUSTOM_PREFIX.length) : null)

export const FIXED_CATEGORIES: Record<MoneyType, readonly string[]> = { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES }
export const ALL_FIXED_CATEGORIES: readonly string[] = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])]

/** Nombre y color de cualquier categoría. Una propia archivada sigue mostrando su nombre; una que ya no existe, "Otros". */
export function categoryInfo(
  key: string | null | undefined,
  custom: ReadonlyMap<string, CustomCategory>,
  fixedLabels: Record<string, string>,
): { label: string; color: string; custom: boolean; archived: boolean } {
  const k = key || 'Otros'
  if (isCustomKey(k)) {
    const c = custom.get(k.slice(CUSTOM_PREFIX.length))
    if (c) return { label: c.name, color: c.color, custom: true, archived: !!c.archived_at }
    return { label: fixedLabels.Otros ?? 'Otros', color: CATEGORY_COLORS.Otros, custom: true, archived: true }
  }
  return { label: fixedLabels[k] ?? k, color: CATEGORY_COLORS[k] ?? CATEGORY_COLORS.Otros, custom: false, archived: false }
}

/** Categorías para elegir en un movimiento de ese tipo: las fijas y después las propias sin archivar (por orden de alta). */
export function categoryKeysFor(type: MoneyType, custom: readonly CustomCategory[]): string[] {
  const own = custom.filter(c => c.type === type && !c.archived_at)
    .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
  return [...FIXED_CATEGORIES[type], ...own.map(c => customKey(c.id))]
}

/** Todas las claves conocidas (fijas y propias, también archivadas): sirve para buscar por nombre. */
export function allCategoryKeys(custom: readonly CustomCategory[]): string[] {
  return [...ALL_FIXED_CATEGORIES, ...custom.map(c => customKey(c.id))]
}

export type CategoryNameError = 'empty' | 'long' | 'duplicate'

/** Mismas reglas que la base: 1–40 caracteres sin espacios al borde y sin repetir (sin distinguir mayúsculas) entre las
 *  no archivadas del mismo tipo. Tampoco puede llamarse como una fija del mismo tipo (en el idioma de la persona). */
export function categoryNameError(
  raw: string, type: MoneyType, custom: readonly CustomCategory[], fixedLabels: Record<string, string>, exceptId?: string,
): CategoryNameError | null {
  const name = cleanCategoryName(raw)
  if (!name) return 'empty'
  if (name.length > CATEGORY_NAME_MAX) return 'long'
  const lower = name.toLocaleLowerCase()
  if (custom.some(c => c.type === type && !c.archived_at && c.id !== exceptId && c.name.toLocaleLowerCase() === lower)) return 'duplicate'
  if (FIXED_CATEGORIES[type].some(k => k.toLocaleLowerCase() === lower || (fixedLabels[k] ?? '').toLocaleLowerCase() === lower)) return 'duplicate'
  return null
}

/** Sin espacios al borde ni repetidos adentro. */
export const cleanCategoryName = (raw: string) => raw.replace(/\s+/g, ' ').trim()

/** Color de la paleta que menos se usó en ese tipo (para proponer uno distinto). */
export function suggestColor(type: MoneyType, custom: readonly CustomCategory[]): string {
  const used = new Map<string, number>(LIFE_COLORS.map(c => [c, 0]))
  for (const c of custom) if (c.type === type && !c.archived_at && used.has(c.color)) used.set(c.color, (used.get(c.color) ?? 0) + 1)
  return [...used.entries()].sort((a, b) => a[1] - b[1])[0][0]
}

export const isPaletteColor = (color: string) => (LIFE_COLORS as readonly string[]).includes(color)
