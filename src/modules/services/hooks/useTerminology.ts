import { useCallback } from 'react'
import { useTerminologyStore } from '@/store/terminologyStore'
import { getTerm } from '../terminology/defaults'
import type { TermKey } from '../terminology/types'

/**
 * Provides the `term()` function to resolve terminology labels.
 * Falls back to defaults when no custom term is configured.
 *
 * Usage:
 *   const { term } = useTerminology()
 *   term('customers')           // → "Clientes" (plural default)
 *   term('customers', 'singular') // → "Cliente"
 */
export function useTerminology() {
  const customTerms = useTerminologyStore(s => s.terms)
  const preset      = useTerminologyStore(s => s.preset)

  const term = useCallback(
    (key: TermKey, form: 'singular' | 'plural' = 'plural'): string =>
      getTerm(customTerms, key, form),
    [customTerms],
  )

  return { term, preset }
}
