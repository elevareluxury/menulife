import type {
  BillingCycle, AllowanceResetCycle, Allowance,
  MembershipUsage, AllowanceSummary,
  MembershipStatus, MembershipHealth,
} from './membershipTypes'

const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1, quarterly: 3, semiannual: 6, annual: 12, custom: 1,
}

export function getPeriodStart(
  startsAt:     string,
  billingCycle: BillingCycle,
  resetCycle:   AllowanceResetCycle,
): Date {
  if (resetCycle === 'never') return new Date(0)

  const start = new Date(startsAt)
  const now   = new Date()

  if (resetCycle === 'weekly') {
    const weekMs       = 7 * 86_400_000
    const weeksElapsed = Math.floor((now.getTime() - start.getTime()) / weekMs)
    return new Date(start.getTime() + weeksElapsed * weekMs)
  }

  const months = resetCycle === 'billing' ? CYCLE_MONTHS[billingCycle] : 1

  let periodStart = new Date(start)
  while (true) {
    const next = new Date(periodStart)
    next.setMonth(next.getMonth() + months)
    if (next > now) break
    periodStart = next
  }
  return periodStart
}

export function computeAllowanceSummaries(
  allowances:   Allowance[],
  usages:       MembershipUsage[],
  startsAt:     string,
  billingCycle: BillingCycle,
): AllowanceSummary[] {
  return allowances.map(allowance => {
    const isUnlimited = allowance.allowance_type === 'unlimited' || allowance.allowance_limit === null
    const periodStart = getPeriodStart(startsAt, billingCycle, allowance.reset_cycle)

    const used = usages
      .filter(u => u.benefit_key === allowance.key && new Date(u.used_at) >= periodStart)
      .reduce((sum, u) => sum + u.quantity, 0)

    const remaining  = isUnlimited ? null : Math.max(0, allowance.allowance_limit! - used)
    const percentage = isUnlimited ? 0
      : Math.min(100, Math.round((used / allowance.allowance_limit!) * 100))

    return { allowance, used, remaining, percentage }
  })
}

export function computeRenewalDate(startsAt: Date, cycle: BillingCycle): Date {
  const d = new Date(startsAt)
  switch (cycle) {
    case 'monthly':    d.setMonth(d.getMonth() + 1); break
    case 'quarterly':  d.setMonth(d.getMonth() + 3); break
    case 'semiannual': d.setMonth(d.getMonth() + 6); break
    case 'annual':     d.setFullYear(d.getFullYear() + 1); break
    default:           d.setMonth(d.getMonth() + 1)
  }
  return d
}

export function isDueSoon(renewalDate: string | null, daysAhead = 7): boolean {
  if (!renewalDate) return false
  const diff = new Date(renewalDate).getTime() - Date.now()
  return diff > 0 && diff <= daysAhead * 86_400_000
}

// Internal health signal — not visible to users.
// Base for churn prediction, AI and Analytics in future phases.
export function computeMembershipHealth(opts: {
  status:           MembershipStatus
  renewal_date:     string | null
  daysSinceLastUse: number | null
}): MembershipHealth {
  const { status, renewal_date, daysSinceLastUse } = opts

  if (status === 'expired' || status === 'cancelled') return 'critical'
  if (status === 'paused') return 'warning'

  // Active or pending — evaluate engagement signals
  const dueVerySoon = isDueSoon(renewal_date, 3)
  const dueSoon     = isDueSoon(renewal_date, 7)
  const stale60     = daysSinceLastUse !== null && daysSinceLastUse > 60
  const stale30     = daysSinceLastUse !== null && daysSinceLastUse > 30

  if (stale60 || dueVerySoon) return 'critical'
  if (stale30 || dueSoon)     return 'warning'
  return 'healthy'
}
