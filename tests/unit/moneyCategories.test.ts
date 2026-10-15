import { describe, expect, it } from 'vitest'
import {
  allCategoryKeys, categoryInfo, categoryKeysFor, categoryNameError, cleanCategoryName, customIdOf, customKey, isCustomKey,
  suggestColor, type CustomCategory,
} from '@/modules/life/lib/moneyCategories'
import { CATEGORY_COLORS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, LIFE_COLORS } from '@/modules/life/lib/lifePalette'
import { matchesSearch } from '@/modules/life/lib/moneyInsights'
import es from '@/i18n/app/life/es'
import en from '@/i18n/app/life/en'

const cat = (p: Partial<CustomCategory>): CustomCategory => ({
  id: 'a1', type: 'expense', name: 'Mascotas', color: '#22C55E', archived_at: null, created_at: '2026-10-01T00:00:00Z', ...p,
})

describe('claves de categorías propias', () => {
  it("se guardan como 'c:' + id", () => {
    expect(customKey('a1')).toBe('c:a1')
    expect(isCustomKey('c:a1')).toBe(true)
    expect(isCustomKey('Comida')).toBe(false)
    expect(isCustomKey(null)).toBe(false)
    expect(customIdOf('c:a1')).toBe('a1')
    expect(customIdOf('Comida')).toBeNull()
  })
})

describe('categoryInfo: nombre y color de cualquier categoría', () => {
  const map = new Map([['a1', cat({})], ['a2', cat({ id: 'a2', name: 'Viejita', color: '#3B82F6', archived_at: '2026-10-02T00:00:00Z' })]])

  it('una fija se traduce y toma su color', () => {
    expect(categoryInfo('Comida', map, en.categories)).toMatchObject({ label: 'Food', color: CATEGORY_COLORS.Comida, custom: false })
    expect(categoryInfo('Comida', map, es.categories).label).toBe('Comida')
  })
  it('una propia muestra su nombre y su color, nunca el id', () => {
    expect(categoryInfo('c:a1', map, es.categories)).toEqual({ label: 'Mascotas', color: '#22C55E', custom: true, archived: false })
  })
  it('una archivada sigue mostrando su nombre', () => {
    expect(categoryInfo('c:a2', map, es.categories)).toMatchObject({ label: 'Viejita', archived: true })
  })
  it('una que ya no existe se ve como "Otros"', () => {
    const info = categoryInfo('c:zzz', map, en.categories)
    expect(info.label).toBe(en.categories.Otros)
    expect(info.label).not.toContain('c:')
    expect(info.color).toBe(CATEGORY_COLORS.Otros)
  })
  it('vacía = "Otros"; desconocida (texto viejo) = el texto tal cual', () => {
    expect(categoryInfo(null, map, es.categories).label).toBe('Otros')
    expect(categoryInfo('Mascotas', map, es.categories)).toMatchObject({ label: 'Mascotas', color: CATEGORY_COLORS.Otros })
  })
})

describe('categoryKeysFor: las del formulario', () => {
  const list = [
    cat({ id: 'b', name: 'Segunda', created_at: '2026-10-03T00:00:00Z' }),
    cat({ id: 'a', name: 'Primera', created_at: '2026-10-01T00:00:00Z' }),
    cat({ id: 'x', name: 'Archivada', archived_at: '2026-10-02T00:00:00Z' }),
    cat({ id: 'i', type: 'income', name: 'Alquileres' }),
  ]
  it('fijas primero y después las propias sin archivar del mismo tipo, por fecha de alta', () => {
    expect(categoryKeysFor('expense', list)).toEqual([...EXPENSE_CATEGORIES, 'c:a', 'c:b'])
    expect(categoryKeysFor('income', list)).toEqual([...INCOME_CATEGORIES, 'c:i'])
  })
  it('para buscar, todas (también las archivadas)', () => {
    const all = allCategoryKeys(list)
    expect(all).toContain('c:x')
    expect(all).toContain('Comida')
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('categoryNameError: las mismas reglas que la base', () => {
  const list = [cat({}), cat({ id: 'old', name: 'Gimnasio', archived_at: '2026-10-02T00:00:00Z' })]
  it('vacío, largo y espacios', () => {
    expect(categoryNameError('   ', 'expense', list, es.categories)).toBe('empty')
    expect(categoryNameError('x'.repeat(41), 'expense', list, es.categories)).toBe('long')
    expect(categoryNameError('x'.repeat(40), 'expense', list, es.categories)).toBeNull()
    expect(cleanCategoryName('  Café   con  leche ')).toBe('Café con leche')
  })
  it('repetida sin distinguir mayúsculas, sólo entre las activas del mismo tipo', () => {
    expect(categoryNameError(' mascotas ', 'expense', list, es.categories)).toBe('duplicate')
    expect(categoryNameError('Mascotas', 'income', list, es.categories)).toBeNull()
    expect(categoryNameError('Gimnasio', 'expense', list, es.categories)).toBeNull()
    // Al editar, su propio nombre no cuenta
    expect(categoryNameError('MASCOTAS', 'expense', list, es.categories, 'a1')).toBeNull()
  })
  it('no puede llamarse como una fija (clave o nombre traducido)', () => {
    expect(categoryNameError('comida', 'expense', [], es.categories)).toBe('duplicate')
    expect(categoryNameError('Food', 'expense', [], en.categories)).toBe('duplicate')
    expect(categoryNameError('Sueldo', 'expense', [], es.categories)).toBeNull()
  })
})

describe('suggestColor', () => {
  it('propone el color de la paleta menos usado en ese tipo', () => {
    expect(suggestColor('expense', [])).toBe(LIFE_COLORS[0])
    expect(suggestColor('expense', [cat({ color: LIFE_COLORS[0] })])).toBe(LIFE_COLORS[1])
    expect(suggestColor('income', [cat({ color: LIFE_COLORS[0] })])).toBe(LIFE_COLORS[0])
  })
})

describe('búsqueda con categorías propias', () => {
  const tx = { type: 'expense' as const, amount: 1500, category: 'c:0f9a2b7e-1111-4111-8111-111111111111', description: null, currency: 'ARS', occurred_at: '2026-10-01T12:00:00Z' }
  it('encuentra por el nombre y no por el id', () => {
    expect(matchesSearch(tx, 'mascotas', 'Mascotas')).toBe(true)
    expect(matchesSearch(tx, '0f9a2b7e', 'Mascotas')).toBe(false)
  })
})

describe('textos', () => {
  it('un nombre de color por cada color de la paleta', () => {
    expect(es.categoriesUi.colors).toHaveLength(LIFE_COLORS.length)
    expect(en.categoriesUi.colors).toHaveLength(LIFE_COLORS.length)
  })
})
