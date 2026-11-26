-- Escala de los recordatorios con la app cerrada (20261203000001): de a tandas, con tope por cuenta y por llamada, sin
-- perder nada (lo que no entra sale en la llamada siguiente), y hasta 10 dispositivos por cuenta.
-- Hora fija: 2026-10-20 15:00 UTC.
\ir ../../supabase/migrations/20261203000001_scale_reminders.sql
begin;

insert into auth.users (id, email)
select ('aaaaaaaa-5000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@x' from generate_series(1, 20) g;

-- Hasta 10 dispositivos por cuenta: el 11.º se queda y se va el más viejo
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-5000-0000-0000-000000000001', true);
do $$
declare i integer;
begin
  for i in 1..12 loop
    perform life_push_subscribe('https://push.example/u1-' || i, 'k', 'a');
  end loop;
end $$;
reset role;
do $$ begin
  assert (select count(*) from life_push_subscriptions where user_id = 'aaaaaaaa-5000-0000-0000-000000000001') = 10,
    'hasta 10 dispositivos por cuenta';
  assert exists (select 1 from life_push_subscriptions where endpoint = 'https://push.example/u1-12'), 'queda el último';
end $$;

-- Las otras 19 cuentas, con un dispositivo cada una
insert into life_push_subscriptions (user_id, endpoint, p256dh, auth)
select ('aaaaaaaa-5000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'https://push.example/u' || g, 'k', 'a'
from generate_series(2, 20) g;

-- La cuenta 1 tiene 500 tareas vencidas; cada una de las otras 19, 20 (total 880)
insert into life_brain_items (user_id, type, title, due_date, due_time, remind_minutes)
select 'aaaaaaaa-5000-0000-0000-000000000001', 'task', 'Mucho ' || g, '2026-10-20', '14:30', 0 from generate_series(1, 500) g;
insert into life_brain_items (user_id, type, title, due_date, due_time, remind_minutes)
select ('aaaaaaaa-5000-0000-0000-' || lpad(u::text, 12, '0'))::uuid, 'task', 'Tarea ' || t, '2026-10-20', '14:30', 0
from generate_series(2, 20) u, generate_series(1, 20) t;

do $$
declare n integer; got_others integer; got_first integer; total integer := 0; i integer;
begin
  create temp table batch1 as select * from life_claim_due_reminders('2026-10-20 15:00:00+00');
  select count(*) into n from batch1;
  assert n <= 300, format('una tanda no pasa de 300 tareas (%s)', n);
  select count(*) into got_first from batch1 where user_id = 'aaaaaaaa-5000-0000-0000-000000000001';
  assert got_first <= 20, format('una cuenta no tapa a las demás (%s)', got_first);
  select count(distinct user_id) into got_others from batch1;
  assert got_others >= 15, format('en la primera tanda entran muchas cuentas (%s)', got_others);
  total := n;
  -- Las tandas siguientes van vaciando sin repetir
  for i in 1..60 loop
    select count(*) into n from life_claim_due_reminders('2026-10-20 15:00:00+00');
    exit when n = 0;
    total := total + n;
  end loop;
  assert total = 880, format('salen todas, una sola vez (%s)', total);
  assert not exists (select 1 from life_brain_items where reminded_at is null and remind_minutes is not null), 'ninguna quedó';
end $$;

rollback;
