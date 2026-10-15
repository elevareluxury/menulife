import { useCallback, useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLifeT, type LifeDict } from '@/i18n/app/life'
import { LIFE_DATA_UPDATED } from './useBrain'
import {
  allCategoryKeys, categoryInfo, categoryKeysFor, cleanCategoryName, customKey,
  type CustomCategory, type MoneyType,
} from '../lib/moneyCategories'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// Una sola lista por cuenta, compartida por Dinero, el formulario, Insights y Ajustes: lo que se crea en un lado se ve
// en todos sin volver a pedirlo.
interface CategoryState {
  userId: string | null
  items: CustomCategory[]
  loaded: boolean
}
const useCategoryStore = create<CategoryState>(() => ({ userId: null, items: [], loaded: false }))

const EMPTY: CustomCategory[] = []

let inflight: { userId: string; promise: Promise<void> } | null = null

async function fetchCategories(userId: string, force = false): Promise<void> {
  const st = useCategoryStore.getState()
  if (!force && st.userId === userId && st.loaded) return
  if (!force && inflight?.userId === userId) return inflight.promise
  const promise = (async () => {
    const { data, error } = await db.from('life_categories').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    // Sin la tabla (migración sin aplicar) o sin red: sólo las fijas
    useCategoryStore.setState({ userId, items: error ? [] : ((data ?? []) as CustomCategory[]), loaded: true })
  })().finally(() => { if (inflight?.promise === promise) inflight = null })
  inflight = { userId, promise }
  return promise
}

let listening = false
function listenForReset() {
  if (listening || typeof window === 'undefined') return
  listening = true
  // "Borrar datos de Life OS" también borra las categorías propias
  window.addEventListener(LIFE_DATA_UPDATED, e => {
    const uid = useCategoryStore.getState().userId
    if ((e as CustomEvent<{ module: string }>).detail?.module === 'money' && uid) void fetchCategories(uid, true)
  })
}

const patchLocal = (id: string, patch: Partial<CustomCategory>) =>
  useCategoryStore.setState(s => ({ items: s.items.map(c => (c.id === id ? { ...c, ...patch } : c)) }))

/** Categorías propias de la cuenta y cómo cambiarlas. */
export function useCategories() {
  const userId = useAuthStore(s => s.user?.id ?? null)
  const items = useCategoryStore(s => (s.userId === userId ? s.items : EMPTY))
  const loaded = useCategoryStore(s => s.userId === userId && s.loaded)

  useEffect(() => {
    listenForReset()
    if (userId) void fetchCategories(userId)
  }, [userId])

  const reload = useCallback(async () => { if (userId) await fetchCategories(userId, true) }, [userId])

  /** Crea una categoría y devuelve su clave ('c:' + id) para guardarla en el movimiento. */
  const createCategory = useCallback(async (type: MoneyType, rawName: string, color: string): Promise<string> => {
    if (!userId) throw new Error('not_signed_in')
    const row: CustomCategory = {
      id: crypto.randomUUID(), type, name: cleanCategoryName(rawName), color, icon: null, archived_at: null,
      created_at: new Date().toISOString(),
    }
    const { error } = await db.from('life_categories').insert({ id: row.id, user_id: userId, type, name: row.name, color })
    if (error) throw error
    useCategoryStore.setState(s => ({ items: [...s.items, row] }))
    return customKey(row.id)
  }, [userId])

  const update = useCallback(async (id: string, patch: Partial<Pick<CustomCategory, 'name' | 'color' | 'archived_at'>>) => {
    if (!userId) return
    const before = useCategoryStore.getState().items.find(c => c.id === id)
    const clean = patch.name !== undefined ? { ...patch, name: cleanCategoryName(patch.name) } : patch
    patchLocal(id, clean)
    const { error } = await db.from('life_categories').update(clean).eq('id', id).eq('user_id', userId)
    if (error) {
      if (before) patchLocal(id, before)
      throw error
    }
  }, [userId])

  const rename = useCallback((id: string, name: string) => update(id, { name }), [update])
  const setColor = useCallback((id: string, color: string) => update(id, { color }), [update])
  const archive = useCallback((id: string) => update(id, { archived_at: new Date().toISOString() }), [update])
  const restore = useCallback((id: string) => update(id, { archived_at: null }), [update])
  /** Sólo en pantalla (para archivar con "Deshacer"): la marca archivada sin ir a la base. */
  const hide = useCallback((id: string, archived: boolean) => patchLocal(id, { archived_at: archived ? new Date().toISOString() : null }), [])

  return { items, loaded, reload, createCategory, rename, setColor, archive, restore, hide }
}


/** Nombre y color de cualquier categoría (fija o propia) en el idioma de la persona. */
export function useCategoryLabels() {
  const t = useLifeT()
  const { items } = useCategories()
  const byId = useMemo(() => new Map(items.map(c => [c.id, c])), [items])
  const fixed = t.categories
  const infoOf = useCallback((key: string | null | undefined) => categoryInfo(key, byId, fixed), [byId, fixed])
  const labelOf = useCallback((key: string | null | undefined) => infoOf(key).label, [infoOf])
  const colorOf = useCallback((key: string | null | undefined) => infoOf(key).color, [infoOf])
  const keysFor = useCallback((type: MoneyType) => categoryKeysFor(type, items), [items])
  const allKeys = useMemo(() => allCategoryKeys(items), [items])
  return { items, infoOf, labelOf, colorOf, keysFor, allKeys }
}

/** Error de la base → texto (tope de 50 o nombre repetido en otra pestaña). */
export function categorySaveError(err: unknown, t: LifeDict): string {
  const e = err as { code?: string; message?: string } | null
  if (e?.message?.includes('category_limit')) return t.categoriesUi.errors.limit
  if (e?.code === '23505') return t.categoriesUi.errors.duplicate
  return t.common.saveError
}
