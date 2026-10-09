import type { Habit } from './useHabits'
import { useLifeT } from '@/i18n/app/life'

/** Racha en texto: días, o semanas seguidas si es "X veces por semana" (V1 · etapa 10). */
export function useStreakText() {
  const t = useLifeT()
  return (h: Habit) => (h.streakUnit === 'weeks' ? t.habitPlus.streakWeeks(h.streak) : t.habits.streak(h.streak))
}
