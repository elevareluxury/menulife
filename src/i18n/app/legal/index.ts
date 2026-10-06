import { createNamespace } from '../namespace'
import es, { type LegalDict } from './es'

const legal = createNamespace<LegalDict>(es, {
  en: () => import('./en'), pt: () => import('./pt'), fr: () => import('./fr'), de: () => import('./de'),
  it: () => import('./it'), zh: () => import('./zh'), ja: () => import('./ja'), ko: () => import('./ko'),
  hi: () => import('./hi'), ar: () => import('./ar'), ru: () => import('./ru'),
})

export const useLegalT = legal.useDict
export type { LegalDict }
export type { LegalBlock, LegalSection } from './es'
