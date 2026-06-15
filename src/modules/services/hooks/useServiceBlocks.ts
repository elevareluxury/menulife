import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServiceBlock } from '../types/booking'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useServiceBlocks(restaurantId: string | undefined) {
  const [blocks, setBlocks] = useState<ServiceBlock[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRange = useCallback(async (from: Date, to: Date) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_blocks')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .lt('starts_at', to.toISOString())
        .gt('ends_at', from.toISOString())
        .order('starts_at')
      if (error) throw error
      setBlocks(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (
    input: Omit<ServiceBlock, 'id' | 'created_at'>,
  ): Promise<boolean> => {
    try {
      const { error } = await db.from('service_blocks').insert(input)
      if (error) throw error
      toast.success('Bloqueo creado')
      return true
    } catch {
      toast.error('Error al crear el bloqueo')
      return false
    }
  }

  const remove = async (id: string): Promise<void> => {
    try {
      await db.from('service_blocks').delete().eq('id', id)
      setBlocks(prev => prev.filter(b => b.id !== id))
    } catch {
      toast.error('Error al eliminar el bloqueo')
    }
  }

  return { blocks, loading, fetchRange, create, remove }
}
