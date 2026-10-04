import { createNamespace } from '../namespace'
import es, { type LandingDict } from './es'

const landing = createNamespace<LandingDict>(es, {
  en: () => import('./en'), pt: () => import('./pt'), fr: () => import('./fr'), de: () => import('./de'),
  it: () => import('./it'), zh: () => import('./zh'), ja: () => import('./ja'), ko: () => import('./ko'),
  hi: () => import('./hi'), ar: () => import('./ar'), ru: () => import('./ru'),
})

export const useLandingT = landing.useDict
export type { LandingDict }
