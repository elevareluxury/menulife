-- Tope de espacio por cuenta para fotos y PDF (20261204000001).
\ir ../../supabase/migrations/20261204000001_storage_quota.sql
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-5000-0000-0000-000000000001', 'ana@x'),
  ('bbbbbbbb-5000-0000-0000-000000000002', 'beto@x');

-- Ana ya ocupa 1 GB menos 1 byte; Beto, casi nada
insert into storage.objects (bucket_id, name, metadata) values
  ('profile-media', 'aaaaaaaa-5000-0000-0000-000000000001/a.webp', '{"size": 1073741823}'),
  ('profile-files', 'bbbbbbbb-5000-0000-0000-000000000002/b.pdf', '{"size": 1000}'),
  -- Otra carpeta que empieza igual no se le suma a nadie
  ('profile-media', 'aaaaaaaa-5000-0000-0000-000000000001x/c.webp', '{"size": 999999999}');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-5000-0000-0000-000000000001', true);
do $$
declare u jsonb;
begin
  u := mycen_storage_usage();
  assert (u ->> 'bytes')::bigint = 1073741823, format('cuenta sólo su carpeta (%s)', u);
  assert (u ->> 'files')::int = 1 and not (u ->> 'full')::boolean, 'todavía no está llena';
  -- Una subida más entra (lo que había no llegaba al tope)
  insert into storage.objects (bucket_id, name, metadata)
  values ('profile-media', 'aaaaaaaa-5000-0000-0000-000000000001/d.webp', '{"size": 300000}');
  assert (mycen_storage_usage() ->> 'full')::boolean, 'ahora sí está llena';
  -- La siguiente, no (en ninguno de los dos buckets)
  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('profile-files', 'aaaaaaaa-5000-0000-0000-000000000001/e.pdf', '{"size": 1}');
    assert false, 'con la cuenta llena no se sube más';
  exception when insufficient_privilege then null; end;
  -- Borrar libera lugar
  delete from storage.objects where name = 'aaaaaaaa-5000-0000-0000-000000000001/a.webp';
  insert into storage.objects (bucket_id, name, metadata)
  values ('profile-media', 'aaaaaaaa-5000-0000-0000-000000000001/f.webp', '{"size": 300000}');
end $$;

-- Tope de archivos: 3000 por cuenta
select set_config('request.jwt.claim.sub', 'bbbbbbbb-5000-0000-0000-000000000002', true);
reset role;
insert into storage.objects (bucket_id, name, metadata)
select 'profile-media', 'bbbbbbbb-5000-0000-0000-000000000002/' || g || '.webp', '{"size": 10}'
from generate_series(1, 2999) g;
set local role authenticated;
do $$ begin
  assert (mycen_storage_usage() ->> 'files')::int = 3000, 'tiene 3000 archivos';
  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('profile-media', 'bbbbbbbb-5000-0000-0000-000000000002/x.webp', '{"size": 10}');
    assert false, 'el archivo 3001 no entra';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Nadie sin sesión pregunta; las funciones internas no son de la API
set local role anon;
do $$ begin
  perform mycen_storage_usage();
  assert false, 'sin sesión no hay uso';
exception when insufficient_privilege then null; end $$;
reset role;
do $$ begin
  assert not has_function_privilege('anon', 'mycen_storage_usage()', 'execute'), 'anon no la ejecuta';
  assert not has_function_privilege('anon', 'mycen_private.folder_usage(text)', 'execute'), 'ni la interna';
end $$;

rollback;
