-- Fase 6: conexiones con metas (hábitos y movimientos de dinero)
alter table public.life_habits
  add column if not exists goal_id uuid references public.life_goals(id) on delete set null;

alter table public.life_transactions
  add column if not exists goal_id uuid references public.life_goals(id) on delete set null;

create index if not exists idx_life_habits_goal on public.life_habits(goal_id) where goal_id is not null;
create index if not exists idx_life_tx_goal on public.life_transactions(goal_id) where goal_id is not null;
create index if not exists idx_lbi_goal on public.life_brain_items(goal_id) where goal_id is not null;

notify pgrst, 'reload schema';
