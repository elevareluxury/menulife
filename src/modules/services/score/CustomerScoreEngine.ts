import { supabase } from '@/lib/supabase'
import type { CustomerTier } from './scoreConfig'
import { TimelineService } from '../timeline/TimelineService'
import { EVENT_CONFIG } from '../timeline/timelineEvents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface ScoreData {
  completedBookings:  number
  cancelledBookings:  number
  noShowBookings:     number
  totalRevenue:       number
  daysSinceLastVisit: number | null
  bookingsPerMonth:   number
  hasMembership?:     boolean
}

export function calcScore(data: ScoreData): number {
  let score = 0

  // Completed bookings: 0–20 pts
  const cb = data.completedBookings
  if      (cb >= 10) score += 20
  else if (cb >= 6)  score += 15
  else if (cb >= 3)  score += 10
  else if (cb >= 1)  score += 5

  // Revenue: 0–25 pts
  const rev = data.totalRevenue
  if      (rev >= 50000) score += 25
  else if (rev >= 30000) score += 20
  else if (rev >= 15000) score += 15
  else if (rev >= 5000)  score += 10
  else if (rev > 0)      score += 5

  // Frequency (bookings/month): 0–20 pts
  const freq = data.bookingsPerMonth
  if      (freq >= 3)   score += 20
  else if (freq >= 2)   score += 16
  else if (freq >= 1)   score += 12
  else if (freq >= 0.5) score += 7

  // Recency (days since last visit): 0–20 pts
  const days = data.daysSinceLastVisit
  if (days === null)   score += 0
  else if (days <= 7)  score += 20
  else if (days <= 14) score += 17
  else if (days <= 30) score += 13
  else if (days <= 60) score += 8
  else if (days <= 90) score += 4
  else if (days <= 180) score += 1

  // Loyalty bonus: 0–15 pts (no cancels + no no-shows)
  if (data.cancelledBookings === 0 && data.noShowBookings === 0 && cb >= 1) {
    score += Math.min(15, cb * 1.5)
  }

  // No-show penalty: -5 each, max -15
  score -= Math.min(15, data.noShowBookings * 5)

  // Cancellation penalty: -3 each, max -10
  score -= Math.min(10, data.cancelledBookings * 3)

  // Membership bonus — decays with inactivity; no bonus if customer is disengaged
  if (data.hasMembership) {
    const days = data.daysSinceLastVisit
    if      (days !== null && days <= 30) score += 10
    else if (days !== null && days <= 60) score += 6
    else if (days !== null && days <= 90) score += 3
    // > 90 days or no visit history: membership alone earns no bonus
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function assignTier(score: number, data: ScoreData): CustomerTier {
  const days = data.daysSinceLastVisit

  // Negative/inactive states override score
  if (days !== null && days > 180) return 'lost'
  if (days !== null && days > 90)  return data.completedBookings >= 3 ? 'at_risk' : 'inactive'

  if (data.completedBookings === 0 && data.cancelledBookings === 0 && data.noShowBookings === 0) {
    return 'new'
  }

  if (score >= 85) return 'ambassador'
  if (score >= 70) return 'vip'
  if (score >= 55) return 'premium'
  if (score >= 38) return 'frequent'
  if (score >= 20) return 'active'
  if (days !== null && days > 60) return 'at_risk'
  return 'active'
}

export async function recalculateCustomerScore(
  restaurantId: string,
  customerId:   string,
): Promise<void> {
  try {
    const { data: bookings } = await db
      .from('service_bookings')
      .select('status, price_snapshot, currency, starts_at')
      .eq('restaurant_id', restaurantId)
      .eq('client_id', customerId)

    if (!bookings) return

    const completed  = bookings.filter((b: { status: string }) => b.status === 'completed')
    const cancelled  = bookings.filter((b: { status: string }) => b.status === 'cancelled')
    const noShows    = bookings.filter((b: { status: string }) => b.status === 'no_show')
    const totalRevenue = completed.reduce((sum: number, b: { price_snapshot: number | null }) => sum + (b.price_snapshot ?? 0), 0)

    const lastCompleted = completed.length > 0
      ? completed.reduce((latest: { starts_at: string }, b: { starts_at: string }) =>
          new Date(b.starts_at) > new Date(latest.starts_at) ? b : latest
        )
      : null

    const daysSinceLastVisit = lastCompleted
      ? Math.floor((Date.now() - new Date(lastCompleted.starts_at).getTime()) / 86_400_000)
      : null

    const firstBookingDate = bookings.length > 0
      ? new Date(bookings.reduce((earliest: { starts_at: string }, b: { starts_at: string }) =>
          new Date(b.starts_at) < new Date(earliest.starts_at) ? b : earliest
        ).starts_at)
      : null

    const monthsActive = firstBookingDate
      ? Math.max(1, (Date.now() - firstBookingDate.getTime()) / (30 * 86_400_000))
      : 1

    const { data: activeMembership } = await db
      .from('service_memberships')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    const data: ScoreData = {
      completedBookings:  completed.length,
      cancelledBookings:  cancelled.length,
      noShowBookings:     noShows.length,
      totalRevenue,
      daysSinceLastVisit,
      bookingsPerMonth:   completed.length / monthsActive,
      hasMembership:      !!activeMembership,
    }

    const score = calcScore(data)
    const tier  = assignTier(score, data)

    // Fetch existing tier to detect changes
    const { data: existing } = await db
      .from('service_customer_scores')
      .select('tier')
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customerId)
      .maybeSingle()

    await db.from('service_customer_scores').upsert({
      restaurant_id:      restaurantId,
      customer_id:        customerId,
      score,
      tier,
      completed_bookings: completed.length,
      cancelled_bookings: cancelled.length,
      no_show_bookings:   noShows.length,
      total_revenue:      totalRevenue,
      last_calculated_at: new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'restaurant_id,customer_id' })

    if (existing && existing.tier !== tier) {
      TimelineService.track({
        restaurantId,
        customerId,
        eventType: 'tier_changed',
        title:     EVENT_CONFIG['tier_changed']?.label ?? 'Nivel actualizado',
        eventDate: new Date().toISOString(),
        metadata:  { from: existing.tier, to: tier, score },
      })
    }
  } catch (err) {
    console.warn('[CustomerScoreEngine] recalculate failed silently:', err)
  }
}

export async function recalculateAllCustomerScores(restaurantId: string): Promise<void> {
  try {
    const { data: customers } = await db
      .from('service_customers')
      .select('id')
      .eq('restaurant_id', restaurantId)

    if (!customers) return
    for (const c of customers) {
      await recalculateCustomerScore(restaurantId, c.id)
    }
  } catch (err) {
    console.warn('[CustomerScoreEngine] recalculateAll failed silently:', err)
  }
}
