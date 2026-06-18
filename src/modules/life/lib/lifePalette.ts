import type { LucideIcon } from 'lucide-react'
import {
  Dumbbell, BookOpen, Droplets, Moon, Sun, Coffee,
  Heart, Music, PenLine, Leaf, Star, Zap,
  Apple, Wind, Smile, Timer,
} from 'lucide-react'

/** Preset color palette for Life OS habits and goals */
export const LIFE_COLORS = [
  '#F4705A', // coral — brand accent
  '#F59E0B', // amber — energy
  '#22C55E', // green — growth
  '#3B82F6', // blue — focus
  '#8B5CF6', // purple — creativity
  '#EC4899', // pink — joy
  '#06B6D4', // cyan — calm
  '#F97316', // orange — motivation
] as const

export type LifeColor = (typeof LIFE_COLORS)[number]

/** Icon options for habits */
export const HABIT_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Dumbbell',  icon: Dumbbell  },
  { name: 'BookOpen',  icon: BookOpen  },
  { name: 'Droplets',  icon: Droplets  },
  { name: 'Moon',      icon: Moon      },
  { name: 'Sun',       icon: Sun       },
  { name: 'Coffee',    icon: Coffee    },
  { name: 'Heart',     icon: Heart     },
  { name: 'Music',     icon: Music     },
  { name: 'PenLine',   icon: PenLine   },
  { name: 'Leaf',      icon: Leaf      },
  { name: 'Star',      icon: Star      },
  { name: 'Zap',       icon: Zap       },
  { name: 'Apple',     icon: Apple     },
  { name: 'Wind',      icon: Wind      },
  { name: 'Smile',     icon: Smile     },
  { name: 'Timer',     icon: Timer     },
]

export function getHabitIcon(name: string): LucideIcon {
  return HABIT_ICONS.find(h => h.name === name)?.icon ?? Star
}

/** Category config for Money */
export const INCOME_CATEGORIES  = ['Sueldo', 'Freelance', 'Comisiones', 'Ventas', 'Inversiones', 'Otros']
export const EXPENSE_CATEGORIES = ['Vivienda', 'Transporte', 'Comida', 'Ocio', 'Salud', 'Suscripciones', 'Ropa', 'Otros']

export const CATEGORY_COLORS: Record<string, string> = {
  Sueldo:        '#22C55E',
  Freelance:     '#3B82F6',
  Comisiones:    '#F59E0B',
  Ventas:        '#8B5CF6',
  Inversiones:   '#06B6D4',
  Vivienda:      '#F4705A',
  Transporte:    '#06B6D4',
  Comida:        '#F97316',
  Ocio:          '#EC4899',
  Salud:         '#22C55E',
  Suscripciones: '#8B5CF6',
  Ropa:          '#F59E0B',
  Otros:         '#6B7280',
}
