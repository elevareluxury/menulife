-- =============================================================================
-- MYCEN · Profile (tarjetas + etiquetas) y Life OS (agenda: tareas y recordatorios)
-- =============================================================================
-- 1. profile_modules acepta el tipo 'cards' (tarjetas deslizables o apiladas)
-- 2. profiles.tags: etiquetas de categoría (se importan de restaurants.hub_category_tags)
-- 3. get_public_profile devuelve las etiquetas
-- 4. life_tasks: tareas con fecha, hora, recordatorio y vínculo opcional a una meta
-- Aditiva e idempotente: se puede correr más de una vez.
-- =============================================================================

begin;

-- ─── 1. Nuevo tipo de módulo: cards ──────────────────────────────────────────
alter table public.profile_modules drop constraint if exists profile_modules_type_check;
alter table public.profile_modules add constraint profile_modules_type_check check (type in (
  'link','social','contact','location','image','text','featured_action','contact_card',
  'gallery','product','testimonials','hours','cards'
));

-- ─── 2. Etiquetas del perfil ─────────────────────────────────────────────────
alter table public.profiles add column if not exists tags text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_tags_limit;
alter table public.profiles add constraint profiles_tags_limit
  check (cardinality(tags) <= 8 and pg_column_size(tags) < 2048);

-- Importar las etiquetas que ya estaban cargadas en el Hub
update public.profiles p
set tags = coalesce((
  select (array(select t from unnest(r.hub_category_tags) as t where btrim(t) <> '' limit 8))
  from public.restaurants r where r.id = p.restaurant_id
), '{}')
where p.tags = '{}' and p.restaurant_id is not null;

-- ─── 3. Perfil público con etiquetas ─────────────────────────────────────────
create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
  v          public.profiles;
  v_redirect text;
begin
  select * into v from profiles where username = v_username;

  if not found then
    select p.username into v_redirect
    from profile_username_history h join profiles p on p.id = h.profile_id
    where h.old_username = v_username and p.status = 'published';
    if v_redirect is not null then
      return jsonb_build_object('redirect', v_redirect);
    end if;
    return null;
  end if;

  if v.status <> 'published' and auth.uid() is distinct from v.user_id then
    return jsonb_build_object('status', 'unavailable');
  end if;

  return jsonb_build_object(
    'id',             v.id,
    'username',       v.username,
    'display_name',   v.display_name,
    'descriptor',     v.descriptor,
    'bio',            v.bio,
    'avatar_url',     v.avatar_url,
    'cover_url',      v.cover_url,
    'purpose',        v.purpose,
    'status',         v.status,
    'tags',           to_jsonb(v.tags),
    'theme',          v.theme,
    'primary_action', v.primary_action,
    'default_locale', v.default_locale,
    'translations',   v.translations,
    'has_contact_card', coalesce((v.contact_card ->> 'enabled')::boolean, false),
    'is_owner',       auth.uid() is not distinct from v.user_id,
    'business', (
      select jsonb_build_object(
        'slug',                 r.slug,
        'business_type',        to_jsonb(r) ->> 'business_type',
        'plan',                 to_jsonb(r) ->> 'plan',
        'reservations_enabled', coalesce((to_jsonb(r) ->> 'reservations_enabled')::boolean, false),
        'timezone',             to_jsonb(r) ->> 'timezone')
      from restaurants r where r.id = v.restaurant_id
    ),
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'type', m.type, 'title', m.title,
               'content', m.content, 'config', m.config - 'legacy_source' - 'legacy_id' - 'legacy_click_count',
               'translations', m.translations)
             order by m.position, m.created_at)
      from profile_modules m
      where m.profile_id = v.id and m.visibility = 'active' and m.deleted_at is null
    ), '[]'::jsonb)
  );
end $$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- ─── 4. Life OS: tareas y recordatorios ──────────────────────────────────────
create table if not exists public.life_tasks (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  goal_id        uuid        references public.life_goals(id) on delete set null,
  title          text        not null check (char_length(title) between 1 and 200),
  notes          text        check (char_length(coalesce(notes, '')) <= 2000),
  due_date       date,
  due_time       time,
  -- Minutos antes del vencimiento para avisar (null = sin recordatorio)
  remind_minutes integer     check (remind_minutes is null or remind_minutes between 0 and 10080),
  reminded_at    timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.life_tasks enable row level security;
drop policy if exists life_tasks_owner on public.life_tasks;
create policy life_tasks_owner on public.life_tasks
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (goal_id is null or exists (select 1 from public.life_goals g where g.id = goal_id and g.user_id = auth.uid()))
  );
revoke all on public.life_tasks from anon;

create index if not exists life_tasks_user_due_idx on public.life_tasks (user_id, due_date, due_time);
create index if not exists life_tasks_user_open_idx on public.life_tasks (user_id) where completed_at is null;

drop trigger if exists life_tasks_touch_updated_at on public.life_tasks;
create trigger life_tasks_touch_updated_at
  before update on public.life_tasks
  for each row execute function public.mycen_touch_updated_at();

commit;

select
  (select count(*) from public.profiles where cardinality(tags) > 0) as perfiles_con_etiquetas,
  (select count(*) from public.life_tasks)                          as tareas;
