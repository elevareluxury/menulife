import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServiceCatalogItem } from '../types/booking'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useServiceCatalog(restaurantId: string | undefined) {
  const [items, setItems] = useState<ServiceCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => { fetch() }, [fetch])

  const create = async (input: Partial<ServiceCatalogItem>): Promise<boolean> => {
    try {
      const { error } = await db.from('service_catalog').insert({
        ...input,
        restaurant_id: restaurantId,
        sort_order: items.length,
      })
      if (error) throw error
      await fetch()
      toast.success('Servicio creado')
      return true
    } catch {
      toast.error('Error al crear el servicio')
      return false
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

  const remove = async (id: string): Promise<void> => {
    try {
      await db.from('service_catalog').update({ is_active: false }).eq('id', id)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Servicio eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return { items, loading, fetch, create, update, remove }
}
