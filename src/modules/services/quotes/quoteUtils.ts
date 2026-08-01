import type { QuoteItemInput } from './quoteTypes'
export { formatCurrency } from '@/lib/currency'

export function computeItemTotal(item: QuoteItemInput): number {
  return Math.max(0, item.quantity * item.unit_price - item.discount)
}

export function computeTotals(
  items: QuoteItemInput[],
  taxPercent: number,
): { subtotal: number; tax_amount: number; total_amount: number } {
  const subtotal   = items.reduce((s, it) => s + computeItemTotal(it), 0)
  const tax_amount = Math.round(subtotal * taxPercent) / 100
  return { subtotal, tax_amount, total_amount: subtotal + tax_amount }
}

export function computeExpiresAt(days: number | null): string | null {
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function isQuoteExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function isQuoteDueSoon(expiresAt: string | null, daysAhead = 7): boolean {
  if (!expiresAt) return false
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  return diffMs > 0 && diffMs <= daysAhead * 86_400_000
}


export function blankItem(): QuoteItemInput {
  return {
    key:         crypto.randomUUID(),
    name:        '',
    description: '',
    quantity:    1,
    unit_price:  0,
    discount:    0,
  }
}
