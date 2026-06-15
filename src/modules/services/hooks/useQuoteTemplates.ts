import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { QuoteTemplate } from '../quotes/quoteTypes'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type TemplateInput = Omit<QuoteTemplate, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>

export function useQuoteTemplates(restaurantId: string | undefined) {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [loading,   setLoading]   = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_quote_templates')
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

  const create = async (input: TemplateInput): Promise<QuoteTemplate | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_quote_templates')
        .insert({ ...input, restaurant_id: restaurantId })
        .select()
        .single()
      if (error) throw error
      setTemplates(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
      return data
    } catch {
      toast.error('Error al crear la plantilla')
      return null
    }
  }

  const update = async (id: string, input: Partial<TemplateInput>): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_quote_templates')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...input } : t))
      return true
    } catch {
      toast.error('Error al actualizar la plantilla')
      return false
    }
  }

  const archive = async (id: string): Promise<boolean> => {
    const ok = await update(id, { status: 'archived' })
    if (ok) setTemplates(prev => prev.filter(t => t.id !== id))
    return ok
  }

  return { templates, loading, fetch, create, update, archive }
}
