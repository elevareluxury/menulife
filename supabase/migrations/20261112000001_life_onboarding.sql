-- =============================================================================
-- Onboarding de Life OS: la primera vez que una cuenta entra a Life sin metas, hábitos ni tareas.
--
--   · user_settings.life_onboarding_at: cuándo terminó o salteó el onboarding (null = nunca lo vio). Se guarda en la
--     cuenta para que no vuelva a aparecer en otro dispositivo. La app también lo recuerda en el dispositivo.
--   · Tres eventos de métricas nuevos: life_onboarding_started, life_onboarding_completed (props.tipo = opción
--     elegida, props.count = cuántas cosas creó) y life_onboarding_skipped (props.step = paso en el que se salteó).
--
-- La lista cerrada de eventos vive en la tabla product_event_types (la crea 20261111000001_life_os_metrics.sql).
-- Esta migración funciona con o sin esa migración aplicada antes:
--   · si ya está (existe mycen_valid_event_shape), sólo suma los tres eventos a la tabla;
--   · si no, crea la misma tabla con los eventos de 20261022000001 más estos tres, cambia el check por la FK y deja
--     track_product_event validando contra la tabla (life_os_metrics la vuelve a definir después, sin conflicto).
--
-- Requiere 20261004000001_user_settings.sql y 20261022000001_v1_product_events.sql. Idempotente.
-- Vuelta atrás: docs/v1/sql/life_onboarding_rollback.sql
-- =============================================================================

begin;

alter table public.user_settings add column if not exists life_onboarding_at timestamptz;

create table if not exists public.product_event_types (
  event text primary key check (event ~ '^[a-z][a-z0-9_]{1,47}$')
);
alter table public.product_event_types enable row level security;
revoke all on public.product_event_types from anon, authenticated;

insert into public.product_event_types (event) values
  ('signup_started'), ('signup_completed'), ('onboarding_step'), ('profile_published'), ('share_tool_used'),
  ('qr_downloaded'), ('appearance_changed'),
  ('life_my_day_opened'), ('life_priorities_set'), ('life_day_closed'), ('habit_logged'), ('task_completed'), ('life_returned'),
  ('life_onboarding_started'), ('life_onboarding_completed'), ('life_onboarding_skipped')
on conflict do nothing;

alter table public.product_events drop constraint if exists product_events_event_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'product_events_event_fkey'
                 and conrelid = 'public.product_events'::regclass) then
    alter table public.product_events add constraint product_events_event_fkey
      foreign key (event) references public.product_event_types (event);
  end if;
end $$;

-- Sin life_os_metrics: track_product_event valida contra la tabla (mismos topes que 20261022000001)
do $$ begin
  if to_regprocedure('public.mycen_valid_event_shape(text, jsonb)') is null then
    execute $f$
      create or replace function public.track_product_event(p_event text, p_props jsonb default '{}'::jsonb)
      returns text language plpgsql volatile security definer set search_path = public as $b$
      declare
        v_user  uuid := auth.uid();
        v_props jsonb := coalesce(p_props, '{}'::jsonb);
      begin
        if p_event is null or not exists (select 1 from product_event_types where event = p_event)
           or not mycen_valid_event_props(v_props) then
          return 'invalid';
        end if;
        if v_user is null then
          -- Sin sesión sólo se puede empezar el registro
          if p_event <> 'signup_started' then return 'invalid'; end if;
          if (select count(*) from product_events where user_id is null and created_at > now() - interval '1 hour') >= 2000 then
            return 'limited';
          end if;
        elsif (select count(*) from product_events where user_id = v_user and created_at > now() - interval '1 hour') >= 300 then
          return 'limited';
        end if;
        insert into product_events (user_id, event, props) values (v_user, p_event, v_props);
        return 'ok';
      end $b$
    $f$;
    revoke all on function public.track_product_event(text, jsonb) from public;
    grant execute on function public.track_product_event(text, jsonb) to anon, authenticated;
  end if;
end $$;

commit;

-- Verificación: tiene que devolver "life_onboarding ok"
select 'life_onboarding ok' as resultado
where exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'user_settings' and column_name = 'life_onboarding_at')
  and exists (select 1 from public.product_event_types where event = 'life_onboarding_skipped');
