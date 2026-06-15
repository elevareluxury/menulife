export const TERM_KEYS = [
  'customers',
  'resources',
  'services',
  'bookings',
  'memberships',
  'packages',
  'documents',
  'quotes',
] as const

export type TermKey = typeof TERM_KEYS[number]

export interface TermPair {
  singular: string
  plural: string
}

export type TerminologyTerms = Record<TermKey, TermPair>

export interface TerminologyRecord {
  preset: string | null
  terms: Partial<TerminologyTerms>
}
