// Feature flag registry — source of truth for gradual rollouts.
// DB table `feature_flags` enables server-side overrides per org (future).
// Default values here are the safe fallback when DB is unreachable.

export type FeatureFlag =
  | 'portal_v2_email_magic_link'
  | 'enterprise_team_management'
  | 'enterprise_consolidated_view'
  | 'analytics_advanced'
  | 'customer_identity_merge'
  | 'documents_esignature'
  | 'bookings_waitlist_auto_fill'
  | 'pos_inventory_alerts'

const DEFAULTS: Record<FeatureFlag, boolean> = {
  portal_v2_email_magic_link:   false,
  enterprise_team_management:   false,
  enterprise_consolidated_view: false,
  analytics_advanced:           false,
  customer_identity_merge:      false,
  documents_esignature:         false,
  bookings_waitlist_auto_fill:  false,
  pos_inventory_alerts:         false,
}

// Runtime overrides — populated by loadFeatureFlags() on app boot.
const _overrides: Partial<Record<FeatureFlag, boolean>> = {}

export function isEnabled(flag: FeatureFlag): boolean {
  return _overrides[flag] ?? DEFAULTS[flag]
}

// Call once on app boot with data from the `feature_flags` table.
// Silently ignores unknown keys from DB so forward-compat is free.
export function loadFeatureFlags(rows: Array<{ flag_key: string; is_enabled: boolean }>): void {
  for (const row of rows) {
    if (row.flag_key in DEFAULTS) {
      _overrides[row.flag_key as FeatureFlag] = row.is_enabled
    }
  }
}
