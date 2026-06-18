// ISOLATED: Replace this function in Fase 2C with the real weighted algorithm.
// No imports — pure computation, easy to unit-test and swap.

export interface ScoreInputs {
  habitsCompletedToday: number
  habitsTotalToday: number
  activeGoalsCount: number
  avgGoalProgress: number  // 0-100
  hasMoneyData: boolean
  hasAchievements: boolean
}

export interface ScoreResult {
  score: number
  variables: Record<string, number | boolean>
}

export function computeLifeScore(inputs: ScoreInputs): ScoreResult {
  const {
    habitsCompletedToday, habitsTotalToday,
    activeGoalsCount, avgGoalProgress,
    hasMoneyData, hasAchievements,
  } = inputs

  let score = 0

  // Habits completion rate: up to 40 pts
  const habitsRate = habitsTotalToday > 0
    ? habitsCompletedToday / habitsTotalToday
    : 0
  score += habitsRate * 40

  // Goals: having active goals (up to 20pts) + progress quality (up to 20pts)
  if (activeGoalsCount > 0) {
    score += Math.min(activeGoalsCount * 7, 20)
    score += (avgGoalProgress / 100) * 20
  }

  // Money being tracked: 10pts
  if (hasMoneyData) score += 10

  // Achievements unlocked: 10pts
  if (hasAchievements) score += 10

  return {
    score: Math.min(Math.round(score), 100),
    variables: {
      habitsRate: Math.round(habitsRate * 100),
      avgGoalProgress: Math.round(avgGoalProgress),
      activeGoalsCount,
      hasMoneyData,
      hasAchievements,
    },
  }
}

export function scoreDescriptor(score: number): string {
  if (score >= 90) return 'En la cima'
  if (score >= 76) return 'Excelente'
  if (score >= 61) return 'Buen momento'
  if (score >= 41) return 'En movimiento'
  if (score >= 21) return 'Construyendo'
  return 'Inicio del viaje'
}
