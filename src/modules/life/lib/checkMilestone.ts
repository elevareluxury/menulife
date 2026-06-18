import { supabase } from '@/lib/supabase'
import { useLifeStore } from '@/store/lifeStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/**
 * Idempotent milestone award: inserts into life_achievements only if the
 * (user_id, type) pair doesn't already exist. Returns true if newly awarded.
 * Never throws — swallows errors so callers can fire-and-forget.
 */
export async function checkMilestone(userId: string, type: string, title: string): Promise<boolean> {
  try {
    const { data: existing } = await db
      .from('life_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .maybeSingle()

    if (existing) return false

    await db.from('life_achievements').insert({
      user_id: userId,
      type,
      title,
      achieved_at: new Date().toISOString(),
    })
    return true
  } catch {
    return false
  }
}

/**
 * Award + show toast if newly unlocked. Fire-and-forget safe.
 */
export async function award(userId: string, type: string, title: string): Promise<void> {
  const isNew = await checkMilestone(userId, type, title)
  if (isNew) useLifeStore.getState().showAchievement({ type, title })
}
