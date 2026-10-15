import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react'
import type { Mood } from './mood'

/** Carita de cada ánimo (1 = muy mal … 5 = muy bien). Decorativa: el nombre lo dan los textos de `mood.levels`. */
export const MOOD_ICONS: Record<Mood, LucideIcon> = { 1: Frown, 2: Annoyed, 3: Meh, 4: Smile, 5: Laugh }
