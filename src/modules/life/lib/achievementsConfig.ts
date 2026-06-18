export interface MilestoneDef {
  type: string
  title: string
}

export const MILESTONES: readonly MilestoneDef[] = [
  { type: 'first_brain_item',      title: 'Primera captura'         },
  { type: 'ideas_10',              title: '10 ideas guardadas'       },
  { type: 'ideas_50',              title: '50 ideas guardadas'       },
  { type: 'tasks_10',              title: '10 tareas completadas'    },
  { type: 'tasks_50',              title: '50 tareas completadas'    },
  { type: 'first_habit_completed', title: 'Primer hábito completado' },
  { type: 'habit_streak_7',        title: 'Racha de 7 días'          },
  { type: 'habit_streak_30',       title: 'Racha de 30 días'         },
  { type: 'first_goal',            title: 'Primera meta definida'    },
  { type: 'first_goal_completed',  title: 'Meta alcanzada'           },
  { type: 'goals_5',               title: 'Cinco metas'              },
  { type: 'first_transaction',     title: 'Primer movimiento'        },
  { type: 'first_positive_month',  title: 'Mes con superávit'        },
] as const

export function getMilestoneTitle(type: string): string {
  return MILESTONES.find(m => m.type === type)?.title ?? type
}
