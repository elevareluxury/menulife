# Auditoría de seguridad de la base de datos — V2

Fecha: octubre de 2026. Alcance: todas las migraciones de `supabase/migrations/` que usa Mycen (Identity, Studio y
Life OS), con foco en lo que se sumó después de la auditoría anterior (`auditoria-v1.md`): fijos, calendario,
categorías propias, cuotas, gastos compartidos, presupuestos, ánimo y revisión semanal, "¿Por qué lo hago?", diario,
módulos de bio (colaboraciones, suscriptores) y analítica por botón. Business queda afuera.

Qué se revisó, tabla por tabla y función por función: RLS activo y políticas de dueño con `with check`; permisos por
columna; funciones `security definer` (que fijen `search_path`, que revisen `auth.uid()`, que validen lo que entra,
que tengan topes y que no usen SQL armado con texto del usuario); permisos (`revoke … from public`, anónimo sólo en las
RPC públicas); triggers que obligan a que una referencia a otra fila sea de la misma cuenta; borrado en cascada al
eliminar la cuenta; listas de exportar y de "Borrar Life OS"; que un perfil suspendido, privado o sin publicar no se
filtre por ninguna RPC; y las políticas del almacenamiento de fotos.

**Arreglo:** migración `supabase/migrations/20261102000001_audit2_db.sql` (idempotente). **Hay que aplicarla en
Supabase → SQL Editor antes de mergear.** Pruebas: `tests/db/audit2.test.sql` (cada bloque marca con "ANTES" lo que
fallaba sin la migración; se verificó corriendo el test sin aplicarla).

## En pocas palabras

No apareció nada que deje a un visitante anónimo leer datos privados, ni a una cuenta leer los datos de otra. Lo que
apareció son **atajos para "meterse" con la cuenta de otra persona sin verla**: apuntar a una fila ajena (una versión
publicada, un perfil, un hábito, un fijo o una compra en cuotas) usando su id. Casi todos esos ids no son públicos, así
que es difícil aprovecharlos, pero se cerraron igual. El más serio dejaba mostrar en tu dirección la página publicada
de otra persona, incluso una versión vieja o la de un perfil suspendido.

## Hallazgos

| # | Gravedad | Hallazgo | Estado |
|---|---|---|---|
| 1 | Media | Un Space podía mostrar la versión publicada de otra persona | Arreglado |
| 2 | Media | El "Space principal" de una identidad podía ser el perfil de otra persona (engaña al verificar cuentas) | Arreglado |
| 3 | Baja | Se podía marcar un día de un hábito ajeno y la dueña ya no podía marcarlo | Arreglado |
| 4 | Baja | Un movimiento ajeno podía "ocupar" el mes de un fijo o una cuota y la carga automática lo salteaba | Arreglado |
| 5 | Baja | La analítica seguía contando visitas y toques de Spaces privados o suspendidos | Arreglado |
| 6 | Baja | Formularios de contacto y de colaboraciones fuera de su horario seguían recibiendo mensajes por la API | Arreglado |
| 7 | Baja | "Borrar Life OS" no apagaba el link privado del calendario | Arreglado (app) |
| 8 | Baja | Check-ins de metas (tabla vieja) fuera de exportar y de "Borrar Life OS" | Arreglado (app) |
| 9 | Baja | Sin topes de cantidad en varias tablas de Life OS | A decidir |
| 10 | Baja | Al borrar la cuenta se borran hasta 1000 fotos | A decidir |
| 11 | Info | Referencias sin chequeo que no hacen daño | A decidir (sin cambios) |

### 1. Un Space podía mostrar la versión publicada de otra persona — media, arreglado

**Qué podía pasar.** Studio puede escribir `profiles.published_version_id` de su propio Space, pero la base no
revisaba que esa versión fuera de ese Space. Con el id de una versión ajena, una cuenta podía hacer que `/su-usuario`
mostrara la página publicada de otra persona, **con su tarjeta de contacto** (vCard: teléfono, email). Servía también
con versiones viejas (contenido que la persona ya había sacado) y con versiones de un perfil **suspendido**, o sea,
saltearse la moderación. Para hacerlo había que conocer el id de la versión, que no es público (difícil de explotar).

**Arreglo.** Trigger `profiles_published_version_owner` (`mycen_check_published_version`): la versión tiene que ser
del mismo Space. Publicar y restaurar siguen igual. Si ya hubiera alguna fila mal apuntada, vuelve a la última versión
propia. Test: bloque 1 de `audit2.test.sql`.

### 2. El Space principal podía ser el perfil de otra persona — media, arreglado

**Qué podía pasar.** La cuenta puede cambiar su fila de `identities` y nadie revisaba `primary_space_id`. El id de un
perfil **sí es público** (sale en `get_public_profile`). Una cuenta podía poner como principal el perfil de alguien
conocido y pedir la verificación: en `/super-admin/verificaciones` el pedido aparecía con el usuario y el nombre de esa
otra persona, y un admin podía terminar dándole el tilde a quien no corresponde. (La dirección pública y la suspensión
no usan esa columna, así que no cambiaba qué se ve en cada URL.)

**Arreglo.** Trigger `identities_primary_space_owner` (`mycen_check_primary_space`): tiene que ser un Space de la misma
identidad. Las filas que ya estuvieran mal vuelven a su principal real. Test: bloque 2.

### 3. Día de un hábito ajeno — baja, arreglado

**Qué podía pasar.** `life_habit_logs` revisaba que el registro fuera de quien lo crea, pero no que el hábito también
lo fuera. Como hay un índice único (hábito, día), un registro "colado" con el id del hábito de otra persona le impedía a
ella marcar ese día. No se podía leer nada ajeno, y el id del hábito no es público.

**Arreglo.** Trigger `life_habit_logs_habit_owner` (`life_check_habit_owner`). Los registros que ya apuntaran a un
hábito ajeno se borran (no le sirven a nadie). Test: bloque 3.

### 4. Fijos y cuotas "ocupados" por otra cuenta — baja, arreglado

**Qué podía pasar.** Igual que el anterior con `life_transactions.recurring_id` / `installment_plan_id`: un movimiento
de otra cuenta con el id del fijo (o de la compra en cuotas) y el mes (o el número de cuota) ocupaba ese lugar, y
`life_materialize_recurring` / `life_materialize_installments` lo salteaban para siempre (no se cargaba ese mes o esa
cuota). Necesitaba el id, que no es público.

**Arreglo.** Trigger `life_transactions_links_owner` (`life_check_tx_links`). Lo que ya existiera mal se desvincula
(el movimiento queda, sin la marca). Test: bloque 4 (también comprueba que la carga automática sigue andando).

### 5. Analítica de Spaces privados o suspendidos — baja, arreglado

**Qué podía pasar.** `track_profile_event` sólo miraba que el Space estuviera publicado. Uno privado o suspendido (que
nadie puede ver) seguía sumando eventos si alguien llamaba a la API. No filtraba datos, pero ensuciaba la analítica y
era distinto de las demás RPC públicas.

**Arreglo.** Misma función, más `visibility <> 'private'` y `mycen_space_suspended`. Mismo contrato (no cambia el mock
de E2E). Test: bloque 5.

### 6. Formularios fuera de horario — baja, arreglado

**Qué podía pasar.** Un módulo programado (`show_from` / `show_until`) no se muestra fuera de su horario, pero
`submit_profile_message` y `submit_profile_collab` no lo revisaban (`subscribe_profile` sí): un formulario vencido o
que todavía no empezó seguía recibiendo mensajes y propuestas por la API.

**Arreglo.** Las dos funciones exigen `mycen_module_live` del módulo, igual que "Suscribirse". Mismo contrato. Test:
bloque 6.

### 7. "Borrar Life OS" dejaba andando el link del calendario — baja, arreglado en la app

**Qué podía pasar.** `life_calendar_feeds` no se puede tocar desde la app (a propósito: el token es secreto), así que
el borrado por tabla de `deleteLifeData` no lo alcanzaba. Después de "Borrar Life OS" el link seguía vivo: si la persona
volvía a cargar tareas, aparecían otra vez en el calendario donde lo había agregado (o en el de quien tuviera el link).

**Arreglo.** `deleteLifeData` (`src/modules/life/lib/lifeData.ts`) llama al final a `life_calendar_disable()`. Al
borrar la cuenta ya se borraba en cascada. Test: bloque 7 (la tabla no se puede borrar directo; la RPC sí lo apaga).

### 8. Check-ins de metas fuera de exportar y borrar — baja, arreglado en la app

`life_goal_checkins` (tabla vieja, sin migración en el repo; el trigger de metas propias la cubre si existe) no estaba
en las listas de exportar ni de "Borrar Life OS", y `life_snapshots` faltaba en la exportación de la cuenta (Studio →
Ajustes). Se sumaron a `lifeData.ts` y `studioApi.ts`; si la tabla no existe, se omite como las demás tablas legado.

### 9. Sin topes de cantidad en varias tablas de Life OS — baja, a decidir

Las tablas nuevas tienen topes (fijos 100, cuotas 200, categorías 50/200, gastos compartidos 5000, presupuestos 60,
diario 20/día y 20.000), pero `life_weekly_reviews` (una por semana, con cualquier fecha), `life_daily_reviews`,
`life_transactions`, `life_brain_items` y `life_habit_logs` no tienen tope por cuenta. Una cuenta podría llenar la base
con millones de filas propias (no afecta a otras cuentas salvo por espacio). Decisión de producto: qué topes son
razonables sin molestar a quien usa la app de verdad.

### 10. Fotos al borrar la cuenta — baja, a decidir

`deleteMyAccount` borra las fotos de `profile-media/<cuenta>/` antes de borrar la cuenta, pero lista hasta 1000. Con
más de 1000 fotos, las que sobran quedan accesibles por su URL (el bucket es público por URL). Opciones: repetir el
listado de a 1000 o borrar desde una función del servidor. Es muy improbable hoy.

### 11. Referencias sin chequeo que no hacen daño — info, sin cambios

- `life_brain_items.next_occurrence_id`, `profile_modules.content_object_id` y los `task_id` dentro de las prioridades
  de "Mi día" o de la revisión semanal pueden apuntar a filas ajenas, pero sólo afectan la fila propia: la app lee
  esas filas con RLS (no ve nada ajeno) y no hay índices únicos que bloqueen a la otra persona.
  `profile_modules.content_object_id` además no se usa.
- Un FK a una fila ajena responde distinto si el id existe o no (se puede "probar" un id). Con ids aleatorios no da
  información útil.

## Revisado y bien

- **RLS**: todas las tablas de Identity y Life OS tienen RLS. Las de Life OS nuevas usan `for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid())` y `revoke all … from anon`. Las que nadie lee
  (`life_calendar_feeds`, `product_events`, `profile_reports`, `app_errors`, `app_error_hits`) tienen RLS sin
  políticas y sin permisos. El test barre las tablas y falla si aparece una sin RLS.
- **Permisos por columna**: `profile_messages` (el dueño sólo cambia `read_at`), `profile_subscribers` (el dueño lee
  sin `sender_hash` y borra; nadie inserta directo).
- **`security definer`**: todas fijan `search_path` (el test lo verifica). Las RPC con sesión revisan `auth.uid()`
  (`profile_click_stats`, `life_calendar_token`, `life_calendar_disable`, admins con `mycen_assert_admin`). Las de fijos
  y cuotas son `security invoker` (corren con la RLS de quien llama). Ninguna arma SQL con texto del usuario.
- **Anónimo**: sólo ejecuta las RPC públicas de la lista de `CLAUDE.md` (el test falla si aparece otra) y no lee filas
  de ninguna tabla privada.
- **Triggers de dueño** que ya estaban bien: meta propia (`life_check_goal_owner`, también en fijos y cuotas),
  categoría propia `'c:' || id` (movimientos, fijos, cuotas y presupuestos), movimientos de una deuda compartida
  (`life_split_check_tx`), dueña fija en diario, presupuestos y categorías.
- **Suspendidos / privados / sin publicar**: `get_public_profile`, `get_public_project`, `get_profile_contact_card`,
  `public_sitemap`, `subscribe_profile`, `submit_profile_message` y `submit_profile_collab` los ocultan; ahora también
  `track_profile_event`. El calendario sólo devuelve tareas pendientes con fecha (sin notas) con un token de 64.
- **Validación y topes** en las RPC públicas: largos, formato de email, lista cerrada de formatos de colaboración, web
  https, fecha límite real, ≤ 3 links, 5 por visitante por día, 200 / 500 por perfil por día, 50.000 suscriptores,
  bots con "ok" sin guardar, claves de botón con formato fijo, 300 eventos por visitante por día. Sin IP ni navegador.
- **Borrar la cuenta**: todas las tablas nuevas cuelgan de `auth.users` o de `profiles` con `on delete cascade`
  (`product_events` y denuncias quedan anónimas con `set null`). Exportar la cuenta y exportar Life OS incluyen las
  tablas nuevas (y ahora los check-ins de metas).
- **Fotos**: subir, cambiar y borrar sólo en la carpeta propia; listar sólo la propia (auditoría V1).

## Para el dueño

1. Aplicar `20261102000001_audit2_db.sql` en Supabase → SQL Editor (es idempotente; corrige filas viejas si las hay,
   lo normal es que no haya ninguna).
2. Decidir los puntos 9 y 10.
