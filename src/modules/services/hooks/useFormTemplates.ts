import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { FormTemplate, FormStatus } from '../forms/formTypes'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useFormTemplates(restaurantId: string | undefined) {
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [loading,   setLoading]   = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_form_templates')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'archived')
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      setTemplates(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: { name: string; description?: string | null }): Promise<FormTemplate | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_form_templates')
        .insert({
          ...input,
          restaurant_id: restaurantId,
          status:    'draft',
          is_public: false,
          sort_order: 0,
          metadata:  {},
        })
        .select()
        .single()
      if (error) throw error
      setTemplates(prev => [...prev, data])
      return data
    } catch {
      toast.error('Error al crear el formulario')
      return null
    }
  }

  const update = async (id: string, input: Partial<Omit<FormTemplate, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>>): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_form_templates')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...input } : t))
      return true
    } catch {
      toast.error('Error al guardar el formulario')
      return false
    }
  }

  const archive = async (id: string): Promise<boolean> => {
    const ok = await update(id, { status: 'archived' as FormStatus })
    if (ok) setTemplates(prev => prev.filter(t => t.id !== id))
    return ok
  }

  const fetchOne = async (id: string): Promise<FormTemplate | null> => {
    const { data } = await db
      .from('service_form_templates')
      .select('*')
      .eq('id', id)
      .single()
    return data ?? null
  }

  return { templates, loading, fetch, create, update, archive, fetchOne }
}
