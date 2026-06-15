export type ComparisonPeriod = 'today' | 'week' | 'month' | 'year'
export type TrendDirection   = 'up' | 'down' | 'neutral'

export interface DailySnapshot {
  id:                    string
  restaurant_id:         string
  snapshot_date:         string
  total_sales:           number
  total_revenue:         number
  payments_received:     number
  balance_pending:       number
  refunds:               number
  total_customers:       number
  new_customers:         number
  active_customers_30d:  number
  lost_customers_90d:    number
  recovered_customers:   number
  total_bookings:        number
  completed_bookings:    number
  cancelled_bookings:    number
  no_show_bookings:      number
  memberships_active:    number
  memberships_expired:   number
  memberships_cancelled: number
  mrr_estimated:         number
  packages_sold:         number
  packages_active:       number
  quotes_sent:           number
  quotes_accepted:       number
  quotes_rejected:       number
  vip_customers:         number
  premium_customers:     number
  revenue_growth_pct:    number | null
  bookings_growth_pct:   number | null
  customers_growth_pct:  number | null
  trend_direction:       TrendDirection | null
  metadata:              Record<string, unknown>
  created_at:            string
  updated_at:            string
}

export interface KPIResult {
  value:            number
  prev_value:       number
  growth_pct:       number | null
  trend_direction:  TrendDirection
  formatted:        string
}

export interface BusinessHealth {
  sales_today:     KPIResult  // count + revenue
  revenue_today:   KPIResult  // sum total
  new_customers:   KPIResult  // new in period
  pending_sales:   KPIResult  // count with balance_due > 0
  pending_amount:  KPIResult  // sum balance_due
}

export interface TopItem {
  name:    string
  count:   number
  revenue: number
}

export interface PerformanceData {
  show_rate:            number   // 0-100 %
  quote_conversion:     number   // 0-100 %
  recurring_customers:  number   // count with > 1 booking
  top_services:         TopItem[]
  top_catalog:          TopItem[]
}

export interface PeriodDates {
  start:      Date
  end:        Date
  prevStart:  Date
  prevEnd:    Date
  label:      string
}

export const PERIOD_LABELS: Record<ComparisonPeriod, string> = {
  today: 'Hoy',
  week:  'Semana',
  month: 'Mes',
  year:  'Año',
}

export function getPeriodDates(period: ComparisonPeriod): PeriodDates {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today': {
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
      return { start: today, end: now, prevStart: yesterday, prevEnd: today, label: 'vs ayer' }
    }
    case 'week': {
      const start    = new Date(today); start.setDate(today.getDate() - 6)
      const prevEnd  = new Date(start)
      const prevStart = new Date(start); prevStart.setDate(start.getDate() - 7)
      return { start, end: now, prevStart, prevEnd, label: 'vs semana anterior' }
    }
    case 'month': {
      const start     = new Date(today.getFullYear(), today.getMonth(), 1)
      const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const prevEnd   = new Date(start)
      return { start, end: now, prevStart, prevEnd, label: 'vs mes anterior' }
    }
    case 'year': {
      const start     = new Date(today.getFullYear(), 0, 1)
      const prevStart = new Date(today.getFullYear() - 1, 0, 1)
      const prevEnd   = new Date(start)
      return { start, end: now, prevStart, prevEnd, label: 'vs año anterior' }
    }
  }
}

export function computeTrend(current: number, prev: number): Pick<KPIResult, 'growth_pct' | 'trend_direction'> {
  if (prev === 0) return { growth_pct: null, trend_direction: 'neutral' }
  const pct = ((current - prev) / prev) * 100
  return {
    growth_pct:      Math.round(pct * 10) / 10,
    trend_direction: pct > 1 ? 'up' : pct < -1 ? 'down' : 'neutral',
  }
}

export function formatAnalyticsValue(value: number, unit: 'number' | 'currency' | 'percentage', currency = 'ARS'): string {
  if (unit === 'percentage') return `${Math.round(value)}%`
  if (unit === 'currency') {
    if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000)     return `${currency} ${(value / 1_000).toFixed(1)}K`
    return `${currency} ${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString('es-AR')
}
