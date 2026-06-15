import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Quote, QuoteStatus, QuoteItemInput } from '../quotes/quoteTypes'
import { computeItemTotal, computeTotals } from '../quotes/quoteUtils'
import { TimelineService } from '../timeline/TimelineService'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SELECT = '*, template:service_quote_templates(*), items:service_quote_items(* ORDER BY sort_order)'

export function useQuotes(restaurantId: string | undefined) {
  const [quotes,  setQuotes]  = useState<Quote[]>([])
  const [loading, setLoading] = useState(false)

  const fetchByCustomer = useCallback(async (customerId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_quotes')
        .select(SELECT)
        .eq('restaurant_id', restaurantId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setQuotes(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: {
    customer_id:      string
    customer_name?:   string
    title:            string
    description?:     string | null
    template_id?:     string | null
    currency:         string
    tax_percent:      number
    expires_at?:      string | null
    notes?:           string | null
    items:            QuoteItemInput[]
  }): Promise<Quote | null> => {
    if (!restaurantId) return null
    try {
      const { subtotal, tax_amount, total_amount } = computeTotals(input.items, input.tax_percent)

      const { data: quote, error: qErr } = await db
        .from('service_quotes')
        .insert({
          restaurant_id: restaurantId,
          customer_id:   input.customer_id,
          template_id:   input.template_id ?? null,
          quote_number:  '',
          title:         input.title.trim(),
          description:   input.description?.trim() || null,
          status:        'draft',
          metadata:      input.customer_name ? { customer_name: input.customer_name } : {},
          subtotal,
          tax_amount,
          total_amount,
          currency:      input.currency,
          expires_at:    input.expires_at ?? null,
          notes:         input.notes?.trim() || null,
          source:        'manual',
        })
        .select('id, quote_number, customer_id, created_at')
        .single()
      if (qErr) throw qErr

      // Insert items
      if (input.items.length > 0) {
        const itemRows = input.items.map((it, idx) => ({
          quote_id:    quote.id,
          name:        it.name.trim(),
          description: it.description.trim() || null,
          quantity:    it.quantity,
          unit_price:  it.unit_price,
          discount:    it.discount,
          total:       computeItemTotal(it),
          sort_order:  idx,
        }))
        const { error: iErr } = await db.from('service_quote_items').insert(itemRows)
        if (iErr) throw iErr
      }

      // Re-fetch full quote with relations
      const { data: full } = await db
        .from('service_quotes')
        .select(SELECT)
        .eq('id', quote.id)
        .single()

      const result = full as Quote
      setQuotes(prev => [result, ...prev])

      // Timeline
      TimelineService.track({
        restaurantId,
        customerId:  quote.customer_id,
        eventType:   'quote_created',
        title:       'Cotización creada',
        description: `${result.quote_number} — ${input.title}`,
        eventDate:   quote.created_at,
        metadata:    { quote_id: quote.id, quote_number: result.quote_number },
      })

      // Quote event
      await db.from('service_quote_events').insert({
        quote_id:    quote.id,
        event_type:  'quote_created',
        description: `Cotización ${result.quote_number} creada`,
      })

      return result
    } catch {
      toast.error('Error al crear la cotización')
      return null
    }
  }

  const updateStatus = async (
    id: string,
    status: QuoteStatus,
    extra?: { accepted_by?: string | null }
  ): Promise<boolean> => {
    if (!restaurantId) return false
    try {
      const now = new Date().toISOString()
      const patch: Record<string, unknown> = { status, updated_at: now }

      if (status === 'sent')      patch.sent_at      = now
      if (status === 'viewed')    patch.viewed_at    = now
      if (status === 'accepted')  { patch.accepted_at = now; patch.accepted_by = extra?.accepted_by ?? null }
      if (status === 'rejected')  patch.rejected_at  = now
      if (status === 'expired')   patch.expires_at   = now
      if (status === 'converted') patch.converted_at = now

      const { error } = await db.from('service_quotes').update(patch).eq('id', id)
      if (error) throw error
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...patch } as Quote : q))

      // Timeline events
      const q = quotes.find(q => q.id === id)
      if (q) {
        const timelineMap: Partial<Record<QuoteStatus, string>> = {
          sent:      'quote_sent',
          accepted:  'quote_accepted',
          rejected:  'quote_rejected',
          converted: 'quote_converted',
        }
        const evType = timelineMap[status]
        if (evType) {
          TimelineService.track({
            restaurantId,
            customerId:  q.customer_id,
            eventType:   evType,
            title:       evType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: `${q.quote_number} — ${q.title}`,
            metadata:    { quote_id: id },
          })
        }

        // Quote event audit
        await db.from('service_quote_events').insert({
          quote_id:   id,
          event_type: `quote_${status}`,
        })
      }

      return true
    } catch {
      toast.error('Error al actualizar la cotización')
      return false
    }
  }

  return { quotes, loading, fetchByCustomer, create, updateStatus }
}
