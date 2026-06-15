// ─── Tax Engine Architecture ──────────────────────────────────────────────────
// Model and type definitions only.
// Actual calculation is NOT implemented — this is the architecture scaffold.
// Phase 18+ will add: tax computation, invoice line items, AFIP/CFDI/etc.

import type { TaxType, TaxConfig } from '@/modules/globalization/globalizationTypes'

export type { TaxType, TaxConfig }

// Default tax configs per tax_type (informational)
export const TAX_TYPE_DEFAULTS: Record<TaxType, Pick<TaxConfig, 'name' | 'inclusive' | 'applies_to'>> = {
  vat:       { name: 'VAT',        inclusive: false, applies_to: 'all'      },
  gst:       { name: 'GST',        inclusive: true,  applies_to: 'all'      },
  sales_tax: { name: 'Sales Tax',  inclusive: false, applies_to: 'goods'    },
  iva:       { name: 'IVA',        inclusive: false, applies_to: 'all'      },
  none:      { name: '',           inclusive: true,  applies_to: 'all'      },
}

// Common tax display names by country (informational map)
export const COUNTRY_TAX_NAMES: Record<string, string> = {
  AR: 'IVA', MX: 'IVA', CO: 'IVA', CL: 'IVA', PE: 'IGV', UY: 'IVA',
  ES: 'IVA', IT: 'IVA', PT: 'IVA', DE: 'MwSt', FR: 'TVA', GB: 'VAT',
  AU: 'GST', NZ: 'GST', SG: 'GST', IN: 'GST',  CA: 'GST',
  US: 'Sales Tax', JP: '消費税', CN: '增值税', KR: '부가세',
  AE: 'VAT', SA: 'VAT', BR: 'ICMS',
}

/**
 * Architecture placeholder for computing tax on an amount.
 * Implementation deferred to Phase 18.
 *
 * @param _amount  Pre-tax amount
 * @param _config  Tax configuration for the business
 * @returns         Tax amount (always 0 until implemented)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function computeTax(_amount: number, _config: TaxConfig): number {
  // TODO Phase 18: implement tax calculation
  return 0
}

/**
 * Architecture placeholder for extracting included tax from a gross amount.
 * @param _grossAmount  Amount including tax
 * @param _config       Tax configuration
 * @returns              Tax component (always 0 until implemented)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function extractIncludedTax(_grossAmount: number, _config: TaxConfig): number {
  // TODO Phase 18: implement reverse calculation
  return 0
}
