-- =============================================================================
-- MYCEN · Limpiar perfiles de prueba antes del lanzamiento
-- =============================================================================
-- Cómo usarlo (Supabase → SQL Editor):
--   1. Correr sólo el PASO 1 (consultas de lectura: no cambian nada). Revisar la lista con calma.
--   2. Decidir, perfil por perfil: despublicar (recomendado, se puede deshacer) o borrar la cuenta entera
--      (no se puede deshacer). Las cuentas con un negocio de Business NO se borran desde acá.
--   3. Copiar el PASO 2 a una pestaña nueva, sacarle los comentarios, completar las listas de confirmados y correrlo.
--      Termina en ROLLBACK: mirar el resultado y, si está bien, cambiar ROLLBACK por COMMIT y correrlo de nuevo.
--
-- Tablas (ver supabase/migrations): profiles (Spaces; username sólo en el principal, los demás tienen space_slug),
-- identities (1 por cuenta), content_objects (proyectos), restaurants (Business, owner_id), auth.users.
-- Qué sale en el sitemap: public_sitemap() = profiles con status 'published', visibility 'public' y sin suspensión.
-- =============================================================================


-- ─── PASO 1 · Listar candidatos (sólo lectura) ──────────────────────────────

-- 1a. Spaces candidatos: los conocidos + los que por el nombre parecen de prueba. Muestra todos los Spaces
--     de cada cuenta candidata. Agregar o sacar usernames de "conocidos" si hace falta.
with conocidos(username) as (
  values ('test-restaurant'), ('cocosss'), ('cocoshow'), ('luca-koko'), ('valenlife'), ('defiestaenelmar'),
         ('claudio-produccion'), ('rocco-cafe'), ('valentinaresiliolife-gmail-com')
),
candidatos as (
  select p.user_id,
         string_agg(distinct m.motivo, ', ') as motivo
  from profiles p
  cross join lateral (values
    (case when p.username in (select username from conocidos) then 'lista conocida' end),
    (case when p.username ~ '(^|[-_])(test|testing|prueba|pruebas|demo|ejemplo|example|sample|dummy|tmp|temp)([-_]|$|[0-9])'
          then 'nombre de prueba' end),
    (case when p.username ~ '-(gmail|hotmail|outlook|yahoo|icloud|live)-(com|com-ar|es)$'
          then 'username con un email' end),
    (case when p.display_name ~* '\m(test|prueba|demo)\M' then 'nombre visible de prueba' end)
  ) m(motivo)
  where m.motivo is not null
  group by p.user_id
)
select
  coalesce(p.username, r.username || '/' || p.space_slug)       as direccion,      -- mycen.id/<direccion>
  p.display_name                                                as nombre,
  u.email                                                       as email_cuenta,
  c.motivo,
  p.is_primary                                                  as principal,
  p.status,                                                     -- draft | published | unpublished | archived
  p.visibility,                                                 -- public | unlisted | private
  (p.status = 'published')                                      as publicado,
  (p.status = 'published' and p.visibility = 'public'
     and not mycen_space_suspended(p.id))                       as en_sitemap,
  p.suspended_at is not null                                    as suspendido,
  p.created_at::date                                            as creado,
  p.published_at::date                                          as publicado_el,
  u.last_sign_in_at::date                                       as ultimo_ingreso,
  p.restaurant_id is not null                                   as restaurante_vinculado,
  rest.name                                                     as restaurante,
  rest.slug                                                     as restaurante_slug,
  rest.is_active                                                as restaurante_activo,
  exists (select 1 from restaurants x where x.owner_id = p.user_id) as cuenta_con_negocio,
  (select count(*) from profile_modules m where m.profile_id = p.id) as modulos,
  case when p.is_primary then
    (select count(*) from content_objects o
      where o.identity_id = p.identity_id and o.type = 'project' and o.status = 'published')
  end                                                           as proyectos_publicados,
  p.id                                                          as profile_id,
  p.user_id
from candidatos c
join profiles p        on p.user_id = c.user_id
left join profiles r   on r.identity_id = p.identity_id and r.is_primary and p.space_slug is not null
left join restaurants rest on rest.id = p.restaurant_id
left join auth.users u on u.id = p.user_id
order by u.email, p.is_primary desc, p.created_at;

-- 1b. Control: todo lo que hoy sale en el sitemap (para ver si quedó otro perfil de prueba que no detectó 1a).
select path, lastmod::date from public_sitemap() order by path;

-- 1c. Cuentas de la lista conocida que tienen negocio en Business (no borrar; a lo sumo despublicar el perfil).
select u.email, x.id as restaurant_id, x.name, x.slug, x.is_active
from restaurants x
join auth.users u on u.id = x.owner_id
where x.owner_id in (
  select p.user_id from profiles p
  where p.username in ('test-restaurant', 'cocosss', 'cocoshow', 'luca-koko', 'valenlife', 'defiestaenelmar',
                       'claudio-produccion', 'rocco-cafe', 'valentinaresiliolife-gmail-com')
)
order by u.email;


-- ─── PASO 2 · Despublicar o borrar lo CONFIRMADO (todo comentado) ───────────
-- No correr sin haber revisado el PASO 1. Completar las dos listas con los usernames de los principales
-- (la columna "direccion" de un principal). Lo que no esté en ninguna lista no se toca.
--
-- Opción A, DESPUBLICAR (recomendada): la página deja de verse ("no disponible"), sale del sitemap y los proyectos
--   pasan a borrador. Se aplica a todos los Spaces de la cuenta. Se deshace publicando de nuevo desde Studio.
-- Opción B, BORRAR LA CUENTA: borra el usuario y, en cascada, Spaces, módulos, proyectos, versiones, analítica,
--   mensajes, suscriptores y Life OS (igual que "Eliminar mi cuenta"). NO se puede deshacer. Se frena sola si la
--   cuenta tiene un negocio de Business. Las imágenes quedan en Storage: borrarlas después a mano
--   (Storage → profile-media → carpeta = carpeta_storage de la consulta de control).

/*
begin;

create temporary table _despublicar (username text primary key) on commit drop;
insert into _despublicar (username) values
  -- ('cocoshow'),
  -- ('rocco-cafe'),
  ('__ninguno__');

create temporary table _borrar (username text primary key) on commit drop;
insert into _borrar (username) values
  -- ('valentinaresiliolife-gmail-com'),
  ('__ninguno__');

-- Cuentas afectadas (por el username de su principal)
create temporary table _cuentas on commit drop as
select p.user_id, p.identity_id, p.username,
       case when b.username is not null then 'borrar' else 'despublicar' end as accion
from profiles p
left join _borrar b on b.username = p.username
where p.is_primary
  and p.username in (select username from _despublicar union select username from _borrar);

-- Frenos: un username no puede estar en las dos listas, todos tienen que existir como principal,
-- y no se borran cuentas con un negocio de Business
do $$
declare v_doble text; v_falta text; v_neg text;
begin
  select string_agg(d.username, ', ') into v_doble
  from _despublicar d join _borrar b using (username) where d.username <> '__ninguno__';
  if v_doble is not null then raise exception 'En las dos listas: %', v_doble; end if;

  select string_agg(l.username, ', ') into v_falta
  from (select username from _despublicar union select username from _borrar) l
  where l.username <> '__ninguno__' and l.username not in (select username from _cuentas);
  if v_falta is not null then raise exception 'No existen como principal: %', v_falta; end if;

  select string_agg(c.username, ', ') into v_neg
  from _cuentas c where c.accion = 'borrar' and exists (select 1 from restaurants x where x.owner_id = c.user_id);
  if v_neg is not null then
    raise exception 'Tienen un negocio en Business, no se borran (pasarlas a _despublicar): %', v_neg;
  end if;
end $$;

-- Opción A: despublicar todos los Spaces de la cuenta (mismo estado que "Pausar perfil" en Studio)
update profiles p
set status = case when p.published_version_id is not null then 'unpublished' else 'draft' end
from _cuentas c
where c.accion = 'despublicar' and p.user_id = c.user_id and p.status = 'published';

update content_objects o
set status = 'draft'
from _cuentas c
where c.accion = 'despublicar' and o.identity_id = c.identity_id and o.status = 'published';

-- Opción B: borrar la cuenta entera (como delete_my_account)
delete from auth.users u
using _cuentas c
where c.accion = 'borrar' and u.id = c.user_id;

-- Control: cómo quedaron esas cuentas (las borradas aparecen con status vacío) y la carpeta de Storage
select c.username, c.accion, c.user_id as carpeta_storage, p.status, p.visibility,
       (p.status = 'published' and p.visibility = 'public') as sigue_en_sitemap
from _cuentas c
left join profiles p on p.user_id = c.user_id
order by c.accion, c.username;

-- Nada de esas cuentas tiene que seguir en el sitemap (tiene que dar 0 filas)
select s.path from public_sitemap() s
join _cuentas c on s.path = '/' || c.username or s.path like '/' || c.username || '/%';

-- Revisar los resultados. Si está todo bien, cambiar ROLLBACK por COMMIT y correr de nuevo.
rollback;
*/

-- Después del COMMIT:
--   · Storage → profile-media → borrar las carpetas de las cuentas borradas (columna carpeta_storage).
--   · Google tarda en sacar del índice las páginas que ya tenía; Search Console → Removals acelera las urgentes
--     (por ejemplo, la del username que es un email).
