-- "¿Por qué lo hago?": frase opcional (≤ 200, no en blanco) en hábitos y metas; cada uno sólo la suya.
begin;

insert into auth.users values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'ana@x'), ('bbbbbbbb-0000-0000-0000-0000000000b2', 'beto@x');
insert into life_goals (id, user_id, why) values
  ('92000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Quiero correr con mis hijos'),
  ('92000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-0000000000b2', null);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000a1', true);

-- Con frase, sin frase y con 200 caracteres justos
insert into life_habits (id, user_id, name, why) values
  ('93000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Leer', 'Para dormir mejor'),
  ('93000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Caminar', null),
  ('93000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Agua', repeat('á', 200));
update life_habits set why = 'Porque me hace bien' where id = '93000000-0000-0000-0000-000000000002';
update life_habits set why = null where id = '93000000-0000-0000-0000-000000000001';

do $$ begin
  assert (select why from life_habits where id = '93000000-0000-0000-0000-000000000002') = 'Porque me hace bien', 'se guarda la frase';
  assert (select why from life_habits where id = '93000000-0000-0000-0000-000000000001') is null, 'se puede borrar';
end $$;

-- Largo de más o en blanco, no
do $$
declare
  bad text[] := array[
    $q$insert into life_habits (user_id, name, why) values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'x', repeat('a', 201))$q$,
    $q$update life_habits set why = '   ' where id = '93000000-0000-0000-0000-000000000002'$q$,
    $q$update life_habits set why = '' where id = '93000000-0000-0000-0000-000000000002'$q$
  ];
  i int;
begin
  for i in 1 .. array_length(bad, 1) loop
    begin
      execute bad[i];
      raise exception 'debería fallar: %', bad[i];
    exception when check_violation then null;
    end;
  end loop;
end $$;

reset role;
do $$ begin
  begin
    update life_goals set why = repeat('a', 201) where id = '92000000-0000-0000-0000-00000000000a';
    raise exception 'debería fallar: meta con 201';
  exception when check_violation then null;
  end;
  begin
    update life_goals set why = ' ' where id = '92000000-0000-0000-0000-00000000000a';
    raise exception 'debería fallar: meta en blanco';
  exception when check_violation then null;
  end;
end $$;

-- Otra cuenta no ve ni cambia la frase de un hábito ajeno (RLS de siempre)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000b2', true);
update life_habits set why = 'Ajeno' where id = '93000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select count(*) from life_habits) = 0, 'no ve hábitos ajenos';
end $$;
reset role;
do $$ begin
  assert (select why from life_habits where id = '93000000-0000-0000-0000-000000000002') = 'Porque me hace bien', 'no la pisa otra cuenta';
end $$;

rollback;
