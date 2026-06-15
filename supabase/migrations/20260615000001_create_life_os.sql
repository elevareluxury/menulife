-- ═══════════════════════════════════════════════════════════════════════════════
-- LIFE OS — Foundation Schema (Fase 1)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Todas las tablas: user_id REFERENCES auth.users(id) ON DELETE CASCADE.
-- RLS habilitado en todas. Política USING/WITH CHECK contra auth.uid().
-- Idempotente: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. LIFE SCORE ────────────────────────────────────────────────────────────
-- Una fila por usuario. variables JSONB almacena factores contribuyentes.
-- En Fase 1 se crea vacía; en Fase 2 el motor la llena con valores reales.
CREATE TABLE IF NOT EXISTS life_score (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score       INT         NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  variables   JSONB       NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);
ALTER TABLE life_score ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ls_owner" ON life_score;
CREATE POLICY "ls_owner" ON life_score
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── 2. MONEY — TRANSACCIONES ─────────────────────────────────────────────────
-- category: texto libre sugerido desde el frontend (sin enum para flexibilidad).
CREATE TABLE IF NOT EXISTS life_transactions (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT          NOT NULL CHECK (type IN ('income','expense')),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category    TEXT,
  description TEXT,
  currency    TEXT          NOT NULL DEFAULT 'ARS',
  occurred_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
ALTER TABLE life_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lt_owner" ON life_transactions;
CREATE POLICY "lt_owner" ON life_transactions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_lt_user_occurred ON life_transactions(user_id, occurred_at DESC);

-- ─── 3. GOALS — METAS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS life_goals (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  target_date DATE,
  progress    INT         NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status      TEXT        NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress','completed','paused')),
  color       TEXT        NOT NULL DEFAULT '#F4705A',
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE life_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lg_owner" ON life_goals;
CREATE POLICY "lg_owner" ON life_goals
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_lg_user ON life_goals(user_id, status, sort_order);

-- ─── 4. GOAL MILESTONES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS life_goal_milestones (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id      UUID        NOT NULL REFERENCES life_goals(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  is_completed BOOLEAN     NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE life_goal_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lgm_owner" ON life_goal_milestones;
CREATE POLICY "lgm_owner" ON life_goal_milestones
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_lgm_goal ON life_goal_milestones(goal_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lgm_user ON life_goal_milestones(user_id);

-- ─── 5. HABITS — HÁBITOS ─────────────────────────────────────────────────────
-- frequency JSONB estructura: {"type":"daily","days":[0,1,2,3,4,5,6]}
-- days es array de números 0-6 (0=Dom, estándar JS). type: "daily" | "weekly"
CREATE TABLE IF NOT EXISTS life_habits (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  icon       TEXT        NOT NULL DEFAULT 'CheckCircle',
  color      TEXT        NOT NULL DEFAULT '#F4705A',
  frequency  JSONB       NOT NULL DEFAULT '{"type":"daily","days":[0,1,2,3,4,5,6]}',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  sort_order INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE life_habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lh_owner" ON life_habits;
CREATE POLICY "lh_owner" ON life_habits
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_lh_user ON life_habits(user_id, is_active, sort_order);

-- ─── 6. HABIT LOGS ────────────────────────────────────────────────────────────
-- UNIQUE(habit_id, completed_date) evita doble check del mismo día.
CREATE TABLE IF NOT EXISTS life_habit_logs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id       UUID        NOT NULL REFERENCES life_habits(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date DATE        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, completed_date)
);
ALTER TABLE life_habit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lhl_owner" ON life_habit_logs;
CREATE POLICY "lhl_owner" ON life_habit_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_lhl_user_date ON life_habit_logs(user_id, completed_date DESC);
CREATE INDEX IF NOT EXISTS idx_lhl_habit_date ON life_habit_logs(habit_id, completed_date DESC);

-- ─── 7. BRAIN ITEMS ───────────────────────────────────────────────────────────
-- is_completed solo aplica a type='task'. is_archived oculta sin borrar.
CREATE TABLE IF NOT EXISTS life_brain_items (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL CHECK (type IN ('idea','note','task')),
  title        TEXT        NOT NULL,
  content      TEXT,
  is_completed BOOLEAN     NOT NULL DEFAULT false,
  is_archived  BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE life_brain_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lbi_owner" ON life_brain_items;
CREATE POLICY "lbi_owner" ON life_brain_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_lbi_user_type ON life_brain_items(user_id, type, is_archived);
CREATE INDEX IF NOT EXISTS idx_lbi_user_created ON life_brain_items(user_id, created_at DESC);

-- ─── 8. ACHIEVEMENTS — LOGROS ─────────────────────────────────────────────────
-- type: 'first_goal_completed' | 'habit_streak_7' | etc. (extensible desde app).
CREATE TABLE IF NOT EXISTS life_achievements (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE life_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "la_owner" ON life_achievements;
CREATE POLICY "la_owner" ON life_achievements
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_la_user ON life_achievements(user_id, achieved_at DESC);

-- ─── 9. SNAPSHOTS — RESÚMENES PERIÓDICOS ─────────────────────────────────────
-- UNIQUE(user_id, period_type, period_date) evita duplicados.
-- summary JSONB estructura sugerida: {goals, tasks, savings, habits_completed, ...}
CREATE TABLE IF NOT EXISTS life_snapshots (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT        NOT NULL CHECK (period_type IN ('month','year')),
  period_date DATE        NOT NULL,
  summary     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_type, period_date)
);
ALTER TABLE life_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lsn_owner" ON life_snapshots;
CREATE POLICY "lsn_owner" ON life_snapshots
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_lsn_user ON life_snapshots(user_id, period_date DESC);

-- ─── TRIGGERS updated_at ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION life_os_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_life_score_uat ON life_score;
CREATE TRIGGER trg_life_score_uat
  BEFORE UPDATE ON life_score
  FOR EACH ROW EXECUTE FUNCTION life_os_update_updated_at();

DROP TRIGGER IF EXISTS trg_life_goals_uat ON life_goals;
CREATE TRIGGER trg_life_goals_uat
  BEFORE UPDATE ON life_goals
  FOR EACH ROW EXECUTE FUNCTION life_os_update_updated_at();

DROP TRIGGER IF EXISTS trg_life_brain_items_uat ON life_brain_items;
CREATE TRIGGER trg_life_brain_items_uat
  BEFORE UPDATE ON life_brain_items
  FOR EACH ROW EXECUTE FUNCTION life_os_update_updated_at();
