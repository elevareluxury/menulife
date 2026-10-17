import { createNamespace } from '../namespace'
import { useAppLang } from '../store'
import es, { type LifeDict } from './es'

const life = createNamespace<LifeDict>(es, {
  en: () => import('./en'), pt: () => import('./pt'), fr: () => import('./fr'), de: () => import('./de'),
  it: () => import('./it'), zh: () => import('./zh'), ja: () => import('./ja'), ko: () => import('./ko'),
  hi: () => import('./hi'), ar: () => import('./ar'), ru: () => import('./ru'),
})

export const useLifeT = life.useDict
export const lifeT = life.peek
/** Espera el diccionario del idioma activo (para textos fuera de React, como los recordatorios: nunca en español por
 *  llegar antes que el diccionario). */
export const lifeTReady = () => life.load(useAppLang.getState().lang)
export type { LifeDict }
