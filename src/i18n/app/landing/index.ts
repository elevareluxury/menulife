import { createNamespace } from '../namespace'
import es, { type LandingDict } from './es'

// L3a en curso: faltan los 11 idiomas (en, pt, fr, de, it, zh, ja, ko, hi, ar, ru). Al agregarlos, sumar sus loaders acá
// como en studio/index.ts. Mientras tanto, la landing usa el español en todos los idiomas.
const landing = createNamespace<LandingDict>(es, {})

export const useLandingT = landing.useDict
export type { LandingDict }
