import { createNamespace } from '../namespace'
import es, { type LifeDict } from './es'

const life = createNamespace<LifeDict>(es, {
  en: () => import('./en'), pt: () => import('./pt'), fr: () => import('./fr'), de: () => import('./de'),
  it: () => import('./it'), zh: () => import('./zh'), ja: () => import('./ja'), ko: () => import('./ko'),
  hi: () => import('./hi'), ar: () => import('./ar'), ru: () => import('./ru'),
})

export const useLifeT = life.useDict
export const lifeT = life.peek
export type { LifeDict }
