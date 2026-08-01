import type { SaleItemInput } from './salesTypes'
export { formatCurrency } from '@/lib/currency'

export function computeItemTotal(item: SaleItemInput): number {
  return Math.max(0, item.quantity * item.unit_price - item.discount)
}

export function computeSaleTotals(
  items: SaleItemInput[],
  taxPercent: number,
  discountExtra = 0,
): { subtotal: number; discount: number; tax: number; total: number } {
  const subtotal  = items.reduce((s, it) => s + computeItemTotal(it), 0)
  const discount  = discountExtra + items.reduce((s, it) => s + it.discount, 0)
  const tax       = Math.round(subtotal * taxPercent) / 100
  return { subtotal, discount, tax, total: subtotal + tax }
}


export function blankSaleItem(): SaleItemInput {
  return {
    key:        crypto.randomUUID(),
    name:       '',
    item_type:  'service',
    quantity:   1,
    unit_price: 0,
    discount:   0,
  }
}
