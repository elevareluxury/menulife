import { createNamespace } from '../namespace'
import es, { type StudioDict } from './es'

const studio = createNamespace<StudioDict>(es, {
  en: () => import('./en'), pt: () => import('./pt'), fr: () => import('./fr'), de: () => import('./de'),
  it: () => import('./it'), zh: () => import('./zh'), ja: () => import('./ja'), ko: () => import('./ko'),
  hi: () => import('./hi'), ar: () => import('./ar'), ru: () => import('./ru'),
})

export const useStudioT = studio.useDict
export const studioT = studio.peek
export type { StudioDict }
