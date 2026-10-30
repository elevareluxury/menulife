-- "Elegí tu nombre": desde dónde se registra la gente. El registro manda signup_started y el onboarding
-- signup_completed con props.channel = hero | cierre | perfil | pie (el campo mycen.id/<nombre> que usó); sin channel
-- o con otro valor = "otro" (botones de registro, links directos, la app). Sólo super-admins (mycen_assert_admin).
-- Idempotente: se puede pegar más de una vez.
begin;

create or replace function public.admin_signup_sources(p_days int default 90)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 90), 730)));
begin
  perform mycen_assert_admin();

  return (
    with places(place, ord) as (
      values ('hero', 1), ('cierre', 2), ('perfil', 3), ('pie', 4), ('otro', 5)
    ),
    events as (
      select event, user_id,
             case when props ->> 'channel' in ('hero', 'cierre', 'perfil', 'pie') then props ->> 'channel' else 'otro' end as place
      from product_events
      where event in ('signup_started', 'signup_completed') and created_at >= v_since
    )
    select jsonb_agg(jsonb_build_object(
      'place', p.place,
      -- Registros abiertos (una vez por sesión del navegador, sin cuenta todavía)
      'started', (select count(*) from events e where e.event = 'signup_started' and e.place = p.place),
      -- Cuentas creadas (una por persona)
      'completed', (select count(distinct e.user_id) from events e
                    where e.event = 'signup_completed' and e.user_id is not null and e.place = p.place)
    ) order by p.ord)
    from places p
  );
end $$;

revoke all on function public.admin_signup_sources(int) from public, anon;
grant execute on function public.admin_signup_sources(int) to authenticated;

commit;

notify pgrst, 'reload schema';
