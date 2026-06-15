import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export type ResourceStatus = 'active' | 'inactive' | 'available' | 'busy' | 'maintenance' | 'blocked'

export interface ServiceResource {
  id: string
  restaurant_id: string
  location_id: string | null
  resource_type_id: string | null
  name: string
  description: string | null
  status: ResourceStatus
  capacity: number
  color: string
  image_url: string | null
  is_active: boolean
  sort_order: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  resource_type?: { id: string; name: string; icon: string; color: string } | null
}

export interface CreateResourceInput {
  restaurant_id: string
  resource_type_id: string | null
  name: string
  description?: string | null
  capacity?: number
  color?: string
  image_url?: string | null
}

export interface UpdateResourceInput {
  name?: string
  description?: string | null
  resource_type_id?: string | null
  capacity?: number
  color?: string
  image_url?: string | null
  status?: ResourceStatus
  is_active?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useServiceResources(restaurantId: string | undefined) {
  const [resources, setResources] = useState<ServiceResource[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_resources')
        .select('*, resource_type:service_resource_types(id, name, icon, color)')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      setResources(data ?? [])
    } catch (err) {
      console.error('useServiceResources fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (input: CreateResourceInput): Promise<boolean> => {
    try {
      const { error } = await db.from('service_resources').insert({
        restaurant_id:    input.restaurant_id,
        resource_type_id: input.resource_type_id,
        name:             input.name.trim(),
        description:      input.description?.trim() || null,
        status:           'available',
        capacity:         input.capacity ?? 1,
        color:            input.color ?? '#6B7280',
        image_url:        input.image_url ?? null,
        is_active:        true,
        sort_order:       resources.length,
        metadata:         {},
      })
      if (error) throw error
      await fetch()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el recurso')
      return false
    }
  }

  const update = async (resourceId: string, input: UpdateResourceInput): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_resources')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', resourceId)
      if (error) throw error
      setResources(prev =>
        prev.map(r => r.id === resourceId ? { ...r, ...input } : r)
      )
      return true
    } catch (err) {
      toast.error('Error al actualizar el recurso')
      return false
    }
  }

  const setStatus = async (resourceId: string, status: ResourceStatus): Promise<void> => {
    await update(resourceId, { status })
  }

  const remove = async (resourceId: string): Promise<void> => {
    try {
      const { error } = await db.from('service_resources').delete().eq('id', resourceId)
      if (error) throw error
      setResources(prev => prev.filter(r => r.id !== resourceId))
      toast.success('Recurso eliminado')
    } catch {
      toast.error('Error al eliminar el recurso')
    }
  }

  const stats = {
    total:       resources.length,
    available:   resources.filter(r => r.is_active && (r.status === 'available' || r.status === 'active')).length,
    busy:        resources.filter(r => r.status === 'busy').length,
    maintenance: resources.filter(r => r.status === 'maintenance').length,
    inactive:    resources.filter(r => !r.is_active || r.status === 'inactive').length,
  }

  return { resources, loading, stats, fetch, create, update, setStatus, remove }
}
