import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { FormSubmission } from '../forms/formTypes'
import { TimelineService } from '../timeline/TimelineService'
import { EVENT_CONFIG } from '../timeline/timelineEvents'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SELECT = '*, template:service_form_templates(id, name)'

export function useFormSubmissions(restaurantId: string | undefined) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading,     setLoading]     = useState(false)

  const fetchByCustomer = useCallback(async (customerId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_form_submissions')
        .select(SELECT)
        .eq('restaurant_id', restaurantId)
        .eq('customer_id', customerId)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      setSubmissions(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const fetchByTemplate = useCallback(async (templateId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_form_submissions')
        .select(SELECT)
        .eq('restaurant_id', restaurantId)
        .eq('template_id', templateId)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      setSubmissions(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const submit = async (input: {
    template_id:   string
    customer_id?:  string | null
    submitted_by?: string | null
    data_json:     Record<string, unknown>
    template_name?: string | null
  }): Promise<FormSubmission | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_form_submissions')
        .insert({
          restaurant_id: restaurantId,
          template_id:   input.template_id,
          customer_id:   input.customer_id ?? null,
          submitted_by:  input.submitted_by ?? null,
          data_json:     input.data_json,
          metadata:      {},
        })
        .select(SELECT)
        .single()
      if (error) throw error
      setSubmissions(prev => [data, ...prev])
      if (input.customer_id) {
        TimelineService.track({
          restaurantId,
          customerId:  input.customer_id,
          eventType:   'form_submitted',
          title:       EVENT_CONFIG['form_submitted']?.label ?? 'Formulario completado',
          description: input.template_name ?? null,
          eventDate:   data.submitted_at,
          metadata:    { template_id: input.template_id },
        })
      }
      return data
    } catch {
      toast.error('Error al enviar el formulario')
      return null
    }
  }

  return { submissions, loading, fetchByCustomer, fetchByTemplate, submit }
}
