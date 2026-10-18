-- Landing: los testimonios se leen sin el error de recursión (20261107000001). Cualquiera ve sólo los activos;
-- sólo el equipo (super_admins) ve todos y los carga, edita y borra.
begin;

insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@x'),
  ('cccccccc-0000-0000-0000-000000000003', 'admin@mycen.id');
insert into public.super_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');
insert into public.testimonials (id, name, content, sort_order, is_active) values
  ('10000000-0000-4000-8000-000000000001', 'Lucía', 'Mi perfil quedó listo en 3 minutos.', 1, true),
  ('10000000-0000-4000-8000-000000000002', 'Borrador', 'Todavía no se publica.', 2, false);

do $$ begin
  assert (select count(*) from pg_policies where schemaname = 'public' and tablename = 'testimonials') = 2,
    'quedan sólo las dos políticas nuevas';
  assert not exists (select 1 from pg_policies where tablename = 'testimonials' and qual ilike '%superadmins%'),
    'ninguna consulta la tabla vieja superadmins';
end $$;

-- ── Visitante ────────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select array_agg(name) from public.testimonials) = array['Lucía'], 'sólo los activos, sin error de recursión';
  begin insert into public.testimonials (name, content) values ('Spam', 'x'); assert false, 'anon carga';
  exception when insufficient_privilege then null; end;
end $$;

-- ── Cuenta común ─────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from public.testimonials) = 1;
  begin insert into public.testimonials (name, content) values ('Yo', 'x'); assert false, 'una cuenta común carga';
  exception when insufficient_privilege then null; end;
  update public.testimonials set content = 'cambiado' where name = 'Lucía';
  delete from public.testimonials where name = 'Lucía';
end $$;
reset role;
do $$ begin
  assert (select content from public.testimonials where name = 'Lucía') = 'Mi perfil quedó listo en 3 minutos.',
    'una cuenta común no edita ni borra';
end $$;

-- ── El equipo ────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', true);
do $$ begin
  assert (select count(*) from public.testimonials) = 2, 've también los inactivos';
  insert into public.testimonials (name, content, is_active) values ('Martín', 'Lo uso todos los días.', true);
  update public.testimonials set is_active = true where name = 'Borrador';
  delete from public.testimonials where name = 'Lucía';
  assert (select array_agg(name order by name) from public.testimonials) = array['Borrador', 'Martín'];
end $$;

rollback;
