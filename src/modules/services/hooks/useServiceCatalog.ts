import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServiceCatalogItem } from '../types/booking'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useServiceCatalog(restaurantId: string | undefined) {
  const [items, setItems] = useState<ServiceCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  // Active-only — for booking drawer and public selectors
  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_catalog')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      setItems(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  // All items (active + inactive) — for management page
  const fetchForManagement = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_catalog')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      setItems(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])

  // Returns the new item's UUID on success, null on failure
  const create = async (input: Partial<ServiceCatalogItem>): Promise<string | null> => {
    try {
      const { data, error } = await db
        .from('service_catalog')
        .insert({ ...input, restaurant_id: restaurantId, sort_order: items.length })
        .select('id')
        .single()
      if (error) throw error
      await fetchForManagement()
      toast.success('Servicio creado')
      return (data as { id: string }).id
    } catch {
      toast.error('Error al crear el servicio')
      return null
    }
  }

  const update = async (id: string, input: Partial<ServiceCatalogItem>): Promise<boolean> => {
    try {
      const { error } = await db.from('service_catalog').update(input).eq('id', id)
      if (error) throw error
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...input } : i))
      return true
    } catch {
      toast.error('Error al actualizar')
      return false
    }
  }

  const toggleActive = async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error } = await db.from('service_catalog').update({ is_active: isActive }).eq('id', id)
      if (error) throw error
      setItems(prev => prev.map(i => i.id === id ? { ...i, is_active: isActive } : i))
      toast.success(isActive ? 'Servicio activado' : 'Servicio desactivado')
      return true
    } catch {
      toast.error('Error al actualizar')
      return false
    }
  }

  const remove = async (id: string): Promise<void> => {
    try {
      const { error } = await db.from('service_catalog').delete().eq('id', id)
      if (error) throw error
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Servicio eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return { items, loading, fetch, fetchForManagement, create, update, toggleActive, remove }
}
