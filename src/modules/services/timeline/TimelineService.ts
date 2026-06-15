import { supabase } from '@/lib/supabase'
import type { TimelineEventType } from './timelineEvents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface TrackInput {
  restaurantId: string
  customerId:   string
  eventType:    TimelineEventType | string
  title:        string
  description?: string | null
  bookingId?:   string | null
  metadata?:    Record<string, unknown>
  eventDate?:   string
  actorType?:   'system' | 'owner' | 'client'
  actorId?:     string | null
}

// track() es fire-and-forget: nunca lanza excepciones para no bloquear la operación principal.
// Un fallo de timeline jamás debe romper una reserva o creación de cliente.
async function track(input: TrackInput): Promise<void> {
  try {
    await db.from('service_customer_timeline').insert({
      restaurant_id: input.restaurantId,
      customer_id:   input.customerId,
      event_type:    input.eventType,
      title:         input.title,
      description:   input.description ?? null,
      booking_id:    input.bookingId   ?? null,
      metadata:      input.metadata    ?? {},
      event_date:    input.eventDate   ?? new Date().toISOString(),
      actor_type:    input.actorType   ?? 'system',
      actor_id:      input.actorId     ?? null,
    })
  } catch (err) {
    console.warn('[TimelineService] track failed silently:', err)
  }
}

export const TimelineService = { track }
