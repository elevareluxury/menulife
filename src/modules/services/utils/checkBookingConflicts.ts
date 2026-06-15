import { supabase } from '@/lib/supabase'
import type { ConflictResult } from '../types/booking'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/**
 * Check for booking conflicts before saving.
 * Queries both service_bookings (via resource junction) and service_blocks.
 * Returns { hasConflict, conflicts[], blocks[] }
 */
export async function checkBookingConflicts(
  restaurantId: string,
  startsAt: Date,
  endsAt: Date,
  resourceIds: string[] = [],
  excludeBookingId?: string,
): Promise<ConflictResult> {
  const from = startsAt.toISOString()
  const to   = endsAt.toISOString()

  const [bookingRes, blockRes] = await Promise.all([
    // Booking conflicts: only if resources are selected
    resourceIds.length > 0
      ? db
          .from('service_bookings')
          .select('id, client_name, starts_at, ends_at, service_booking_resources!inner(resource_id)')
          .eq('restaurant_id', restaurantId)
          .not('status', 'in', '("cancelled","rescheduled","no_show")')
          .lt('starts_at', to)
          .gt('ends_at', from)
          .in('service_booking_resources.resource_id', resourceIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),

    // Block conflicts (global + resource-specific)
    db
      .from('service_blocks')
      .select('id, title, starts_at, ends_at')
      .eq('restaurant_id', restaurantId)
      .lt('starts_at', to)
      .gt('ends_at', from),
  ])

  const rawConflicts = (bookingRes.data ?? []) as Array<{ id: string; client_name: string | null; starts_at: string; ends_at: string }>
  const conflicts = excludeBookingId
    ? rawConflicts.filter(c => c.id !== excludeBookingId)
    : rawConflicts

  const blocks = (blockRes.data ?? []) as Array<{ id: string; title: string; starts_at: string; ends_at: string }>

  return {
    hasConflict: conflicts.length > 0 || blocks.length > 0,
    conflicts,
    blocks,
  }
}
