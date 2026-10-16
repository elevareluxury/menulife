import { createNamespace } from '../namespace'
import es, { type AdminDict } from './es'

const admin = createNamespace<AdminDict>(es, {
  en: () => import('./en'), pt: () => import('./pt'), fr: () => import('./fr'), de: () => import('./de'),
  it: () => import('./it'), zh: () => import('./zh'), ja: () => import('./ja'), ko: () => import('./ko'),
  hi: () => import('./hi'), ar: () => import('./ar'), ru: () => import('./ru'),
})

export const useAdminT = admin.useDict
export type { AdminDict }
