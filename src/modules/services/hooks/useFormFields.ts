import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { FormField } from '../forms/formTypes'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type FieldInput = Omit<FormField, 'id' | 'created_at' | 'updated_at'>

export function useFormFields(restaurantId: string | undefined) {
  const [fields,  setFields]  = useState<FormField[]>([])
  const [loading, setLoading] = useState(false)

  const fetchByTemplate = useCallback(async (templateId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_form_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order')
      if (error) throw error
      setFields(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: FieldInput): Promise<FormField | null> => {
    try {
      const { data, error } = await db
        .from('service_form_fields')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      setFields(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
      return data
    } catch {
      toast.error('Error al agregar el campo')
      return null
    }
  }

  const update = async (id: string, input: Partial<FieldInput>): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_form_fields')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setFields(prev => prev.map(f => f.id === id ? { ...f, ...input } : f))
      return true
    } catch {
      toast.error('Error al actualizar el campo')
      return false
    }
  }

  const remove = async (id: string): Promise<boolean> => {
    try {
      const { error } = await db.from('service_form_fields').delete().eq('id', id)
      if (error) throw error
      setFields(prev => prev.filter(f => f.id !== id))
      return true
    } catch {
      toast.error('Error al eliminar el campo')
      return false
    }
  }

  const reorder = async (reordered: FormField[]): Promise<void> => {
    const updated = reordered.map((f, i) => ({ ...f, sort_order: i }))
    setFields(updated)
    await Promise.all(
      updated.map(f =>
        db.from('service_form_fields')
          .update({ sort_order: f.sort_order })
          .eq('id', f.id)
      )
    )
  }

  return { fields, loading, fetchByTemplate, create, update, remove, reorder }
}
