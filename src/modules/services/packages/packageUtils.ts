import type { PackageItem, PackageItemSummary, PackageUsage } from './packageTypes'

export function computePackageItemSummaries(
  items:  PackageItem[],
  usages: PackageUsage[],
): PackageItemSummary[] {
  return items.map(item => {
    const used        = usages
      .filter(u => u.item_key === item.key)
      .reduce((acc, u) => acc + Number(u.quantity), 0)
    const isUnlimited = item.allowance_type === 'unlimited' || item.quantity === 0
    const remaining   = isUnlimited ? null : Math.max(0, item.quantity - used)
    const percentage  = isUnlimited || item.quantity === 0
      ? 0
      : Math.min(100, (used / item.quantity) * 100)
    return { item, used, remaining, percentage }
  })
}

export function isPackageExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function isPackageDueSoon(expiresAt: string | null, status: string, daysAhead = 7): boolean {
  if (!expiresAt || status !== 'active') return false
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  return diffMs > 0 && diffMs <= daysAhead * 86_400_000
}

export function computeExpiresAt(startsAt: Date, validityDays: number | null): Date | null {
  if (!validityDays) return null
  const d = new Date(startsAt)
  d.setDate(d.getDate() + validityDays)
  return d
}
