import type { EventItem } from '@/modules/profile/lib/events'
import { newOptionId } from './pollOptions'

/** Un evento nuevo, con su id (la ficha del evento se abre con ?evento=<id>) */
export const newEvent = (): EventItem => ({ id: newOptionId() })
