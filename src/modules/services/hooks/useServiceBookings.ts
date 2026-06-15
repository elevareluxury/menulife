import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServiceBooking, CreateBookingInput, BookingStatus } from '../types/booking'
import { TimelineService } from '../timeline/TimelineService'
import { EVENT_CONFIG } from '../timeline/timelineEvents'
import { recalculateCustomerScore } from '../score/CustomerScoreEngine'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const BOOKING_SELECT = `
  *,
  catalog:service_catalog(id, name, color, duration_minutes, price, currency),
  resources:service_booking_resources(
    id, resource_id,
    resource:service_resources(
      id, name, color,
      resource_type:service_resource_types(id, name, icon)
    )
  )
`

export function useServiceBookings(restaurantId: string | undefined) {
  const [bookings, setBookings] = useState<ServiceBooking[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRange = useCallback(async (from: Date, to: Date) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_bookings')
        .select(BOOKING_SELECT)
        .eq('restaurant_id', restaurantId)
        .gte('starts_at', from.toISOString())
        .lt('starts_at', to.toISOString())
        .order('starts_at')
      if (error) throw error
      setBookings(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: CreateBookingInput): Promise<ServiceBooking | null> => {
    if (!restaurantId) return null
    try {
      const { resource_ids, customer_id: inputCustomerId, ...bookingData } = input

      // Auto-link o crear customer por teléfono
      let resolvedCustomerId: string | null = inputCustomerId ?? null
      if (!resolvedCustomerId && input.client_phone?.trim()) {
        const { data: existing } = await db
          .from('service_customers')
          .select('id, total_bookings')
          .eq('restaurant_id', restaurantId)
          .eq('phone', input.client_phone.trim())
          .maybeSingle()

        if (existing) {
          resolvedCustomerId = existing.id
          // Fire-and-forget: actualizar stats del customer existente
          db.from('service_customers').update({
            total_bookings: existing.total_bookings + 1,
            last_visit_at:  input.starts_at,
            updated_at:     new Date().toISOString(),
          }).eq('id', existing.id)
        } else if (input.client_name?.trim()) {
          const parts = input.client_name.trim().split(/\s+/)
          const { data: newCust } = await db
            .from('service_customers')
            .insert({
              restaurant_id: restaurantId,
              first_name:    parts[0],
              last_name:     parts.slice(1).join(' ') || null,
              phone:         input.client_phone.trim(),
              email:         input.client_email?.trim().toLowerCase() || null,
              source:        'booking',
              status:        'active',
              total_bookings: 1,
              last_visit_at:  input.starts_at,
            })
            .select('id')
            .single()
          resolvedCustomerId = newCust?.id ?? null
        }
      }

      const { data, error } = await db
        .from('service_bookings')
        .insert({ ...bookingData, restaurant_id: restaurantId, client_id: resolvedCustomerId })
        .select(BOOKING_SELECT)
        .single()
      if (error) throw error

      if (resource_ids?.length) {
        await db.from('service_booking_resources').insert(
          resource_ids.map((rid: string) => ({
            booking_id:    data.id,
            resource_id:   rid,
            restaurant_id: restaurantId,
          })),
        )
        const { data: refreshed } = await db
          .from('service_bookings')
          .select(BOOKING_SELECT)
          .eq('id', data.id)
          .single()
        const final = refreshed ?? data
        setBookings(prev => [final, ...prev].sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        ))
        if (resolvedCustomerId) {
          TimelineService.track({
            restaurantId,
            customerId:  resolvedCustomerId,
            eventType:   'booking_created',
            title:       EVENT_CONFIG.booking_created.label,
            description: final.catalog?.name ?? final.title ?? null,
            bookingId:   final.id,
            eventDate:   final.starts_at,
            metadata:    { starts_at: final.starts_at, duration_minutes: final.duration_minutes },
          })
        }
        return final
      }

      setBookings(prev => [data, ...prev].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      ))
      if (resolvedCustomerId) {
        TimelineService.track({
          restaurantId,
          customerId:  resolvedCustomerId,
          eventType:   'booking_created',
          title:       EVENT_CONFIG.booking_created.label,
          description: data.catalog?.name ?? data.title ?? null,
          bookingId:   data.id,
          eventDate:   data.starts_at,
          metadata:    { starts_at: data.starts_at, duration_minutes: data.duration_minutes },
        })
      }
      return data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la reserva'
      toast.error(msg)
      return null
    }
  }

  const updateStatus = async (id: string, status: BookingStatus): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))

      // Timeline: emitir evento para estados relevantes
      const booking = bookings.find(b => b.id === id)
      if (booking?.client_id && restaurantId) {
        const STATUS_EVENT: Partial<Record<BookingStatus, string>> = {
          confirmed:   'booking_confirmed',
          completed:   'booking_completed',
          cancelled:   'booking_cancelled',
          no_show:     'booking_no_show',
          rescheduled: 'booking_rescheduled',
        }
        const eventType = STATUS_EVENT[status]
        if (eventType) {
          TimelineService.track({
            restaurantId,
            customerId:  booking.client_id,
            eventType,
            title:       EVENT_CONFIG[eventType]?.label ?? eventType,
            description: booking.catalog?.name ?? booking.title ?? null,
            bookingId:   booking.id,
            eventDate:   new Date().toISOString(),
            metadata:    { starts_at: booking.starts_at },
          })
        }
        if (status === 'completed' || status === 'cancelled' || status === 'no_show') {
          recalculateCustomerScore(restaurantId, booking.client_id)
        }
      }

      return true
    } catch {
      toast.error('Error al actualizar el estado')
      return false
    }
  }

  const update = async (id: string, input: Partial<ServiceBooking>): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_bookings')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...input } : b))
      return true
    } catch {
      toast.error('Error al actualizar')
      return false
    }
  }

  const reschedule = async (
    booking: ServiceBooking,
    newStartsAt: Date,
    newEndsAt: Date,
  ): Promise<ServiceBooking | null> => {
    try {
      // Mark original as rescheduled
      await db.from('service_bookings').update({ status: 'rescheduled' }).eq('id', booking.id)
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'rescheduled' } : b))

      // Create new booking
      const resourceIds = booking.resources?.map(r => r.resource_id) ?? []
      const newBooking = await create({
        restaurant_id:    booking.restaurant_id,
        catalog_id:       booking.catalog_id,
        starts_at:        newStartsAt.toISOString(),
        ends_at:          newEndsAt.toISOString(),
        duration_minutes: booking.duration_minutes,
        status:           'confirmed',
        booking_type:     booking.booking_type,
        capacity:         booking.capacity,
        client_name:      booking.client_name,
        client_phone:     booking.client_phone,
        client_email:     booking.client_email,
        client_notes:     booking.client_notes,
        notes:            booking.notes,
        modality:         booking.modality,
        price_snapshot:   booking.price_snapshot,
        currency:         booking.currency,
        resource_ids:     resourceIds,
      })
      return newBooking
    } catch {
      toast.error('Error al reagendar')
      return null
    }
  }

  const cancel = async (id: string): Promise<void> => {
    await updateStatus(id, 'cancelled')
  }

  const todayStats = (timezone: string) => {
    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now)

    const todayBookings = bookings.filter(b => {
      const bDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(b.starts_at))
      return bDateStr === todayStr
    })

    return {
      total:     todayBookings.length,
      pending:   todayBookings.filter(b => b.status === 'pending').length,
      confirmed: todayBookings.filter(b => b.status === 'confirmed').length,
      completed: todayBookings.filter(b => b.status === 'completed').length,
      cancelled: todayBookings.filter(b => b.status === 'cancelled' || b.status === 'no_show').length,
    }
  }

  return {
    bookings,
    loading,
    fetchRange,
    create,
    update,
    updateStatus,
    reschedule,
    cancel,
    todayStats,
  }
}
