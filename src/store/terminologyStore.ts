import { create } from 'zustand'
import type { TerminologyTerms } from '@/modules/services/terminology/types'

interface TerminologyState {
  terms: Partial<TerminologyTerms>
  preset: string | null
  loaded: boolean
  setTerminology: (terms: Partial<TerminologyTerms>, preset: string | null) => void
  resetTerminology: () => void
}

export const useTerminologyStore = create<TerminologyState>(set => ({
  terms:  {},
  preset: null,
  loaded: false,
  setTerminology: (terms, preset) => set({ terms, preset, loaded: true }),
  resetTerminology: () => set({ terms: {}, preset: null, loaded: false }),
}))
