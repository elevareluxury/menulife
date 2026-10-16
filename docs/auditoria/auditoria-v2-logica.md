# Auditoría V2 — lógica y datos

Fecha: 2026-10-16 · Base: `main` en `6fe23b2`. Revisión de código + tests dirigidos. Foco: casos borde de Dinero
(monedas, centavos, fechas, cola sin conexión), tareas y hábitos, Identity (publicar, programación, plantillas, Spaces),
Insights y la política de privacidad contra lo que la app guarda de verdad.

Tests nuevos: `tests/unit/auditLogic.test.ts` (reproducen los errores arreglados). No hizo falta migración.

## Resumen

| # | Severidad | Tema | Estado |
|---|-----------|------|--------|
| 1 | media | Cola sin conexión: lo de una cuenta se subía (y se perdía) con la sesión de otra | arreglado |
| 2 | media | Cola sin conexión: token vencido = la captura se tiraba | arreglado |
| 3 | media | Cola sin conexión: sin lugar en el dispositivo decía "se sube después" y se perdía | arreglado |
| 4 | media | Editar un movimiento lo podía correr un día (fecha UTC) | arreglado |
| 5 | baja | CSV de Dinero con la fecha en UTC y sin neutralizar fórmulas | arreglado |
| 6 | baja | "Tu mes" sumaba movimientos programados que todavía no llegaron | arreglado |
| 7 | baja | Fijos y cuotas no se cargaban si cambiaba la cuenta en la misma pestaña | arreglado |
| 8 | baja | Mes de un movimiento comparando textos ISO | arreglado |
| 9 | media | Privacidad: denuncias guardan la cuenta de quien denuncia y no se decía | arreglado (12 idiomas) |
| 10 | baja | Privacidad: estadísticas "agrupadas", errores "hasta que se resuelven", origen de visitas, cola y PIN en el dispositivo | arreglado (12 idiomas) |
| 11 | baja | Zona horaria de `user_settings` no se usa para las fechas | arreglado (Life OS usa la zona de la cuenta) |
| 12 | baja | Tarea que se repite: doble toque o dos dispositivos pueden crear dos "siguientes" | a decidir |
| 13 | baja | "Cada N semanas" cuenta semanas de lunes a domingo aunque `week_start` sea domingo | a decidir |
| 14 | baja | Recordatorios de hábitos: consulta cada 30 s y marcas en `localStorage` que no se limpian | a decidir |
| 15 | baja | `publish_space` concurrente puede chocar en `version_number` | a decidir |

Lo que se revisó y está bien está al final.

## Arreglado

### 1. Cola sin conexión entre cuentas (media)
**Qué veía la persona:** Ana carga una tarea sin señal y cierra sesión; Beto entra en el mismo celular. Al volver la red,
la app intentaba subir la fila de Ana con la sesión de Beto: la base la rechazaba (RLS), la fila se borraba de la cola
y a Beto le aparecía "No se pudo subir «<título de Ana>»". Ana perdía la captura y Beto veía su texto. Además el aviso
"N por subir" contaba lo de Ana.
**Detalle:** `flushOutbox()` subía todo lo que había en `mycen_life_outbox`; un error que no era de red sacaba la fila.
**Arreglo:** `flushOutbox(userId)` sube sólo las filas con ese `user_id` (las viejas sin `user_id`, como antes) y
`useOutbox()` cuenta sólo las de la cuenta con sesión (`pendingFor`). Lo de Ana queda guardado para cuando vuelva.
`src/modules/life/lib/outbox.ts`, `LifeShell.tsx`.
**Test:** `auditLogic.test.ts` → "con la sesión de otra cuenta no sube ni cuenta…".

### 2. Token vencido descartaba la captura (media)
**Qué veía:** después de horas sin red, al volver, el primer intento podía salir con el token vencido (`JWT expired`,
`PGRST301`, 401). No era "error de red", así que la fila se tiraba con el aviso de error.
**Arreglo:** `isAuthError` corta la subida y deja la fila para el próximo intento (como un error de red). Los errores de
datos (check, FK) se siguen sacando para no reintentar para siempre.
**Test:** "un error de sesión (token vencido) no descarta la fila".

### 3. Sin lugar en el dispositivo (media)
**Qué veía:** con el almacenamiento lleno o bloqueado (modo privado viejo de Safari, cuota), `enqueue` fallaba en
silencio y la app mostraba "Guardado en el dispositivo, se sube al volver la conexión". Se perdía.
**Arreglo:** `enqueue` devuelve si la fila quedó guardada; si no, `CaptureButton` y `useMoney.createTransaction`
relanzan el error y se ve "No se pudo guardar". **Test:** "sin lugar en el dispositivo, enqueue avisa…".

### 4. Editar un movimiento lo corría un día (media)
**Qué veía:** al saldar una cuenta compartida a las 22 h en Buenos Aires, el ingreso "Juan te devolvió" se guarda con la
hora real (01:00 UTC del día siguiente). Al abrirlo para editar, el formulario mostraba el día siguiente y al guardar
quedaba ahí. Lo mismo con cualquier movimiento en zonas UTC+13/+14 (Nueva Zelanda en verano, Samoa), donde el mediodía
local cae en el día anterior en UTC.
**Detalle:** `TransactionSheet` hacía `initial.occurred_at.split('T')[0]` (la fecha UTC).
**Arreglo:** `localDateOf()` en `lib/moneyFuture.ts`: una fecha sola queda igual (los fijos guardan `YYYY-MM-DD`) y un
instante pasa a la fecha local. **Test:** "editar un movimiento de las 22 h no lo pasa al día siguiente".

### 5. CSV de Dinero (baja)
**Qué veía:** la columna de fecha salía con `slice(0, 10)` del ISO (UTC): el mismo corrimiento del punto 4. Además una
descripción que empieza con `=`, `+`, `-` o `@` (por ejemplo, importada de un banco) se abría como fórmula en Excel.
**Arreglo:** `moneyCsvLines()` (puro, en `lib/lifeData.ts`) usa la fecha local y antepone `'` a textos que parecen
fórmula (como ya hacía `subscribersCsv`). Los montos no se tocan. **Test:** "el CSV de Dinero usa la fecha local…".

### 6. "Tu mes" contaba lo programado (baja)
**Qué veía:** en el mes en curso, "Tu mes" sumaba ingresos y gastos con fecha futura (un pago planeado para el 28),
mientras Dinero, Mi día y los presupuestos no (regla de `lib/moneyFuture.ts`). Los números no coincidían.
**Arreglo:** `LifeReplayPage` lee `occurred_at` y descarta `isUpcoming(t, hoy)`.

### 7. Fijos y cuotas al cambiar de cuenta (baja)
**Qué veía:** `materializeRecurring` / `materializeInstallments` recordaban "ya cargué hoy" por pestaña, sin cuenta. Si
en la misma pestaña se cerraba sesión y entraba otra cuenta, a la segunda no se le cargaban sus fijos ni cuotas
vencidos hasta el día siguiente.
**Arreglo:** la marca es `cuenta|día` (`useRecurring.ts`, `useInstallments.ts`).

### 8. Mes de un movimiento comparando textos (baja)
**Detalle:** `useMoney` separaba el mes con `t.occurred_at >= monthStart`, comparando el texto que devuelve la base
(`…T03:00:00+00:00`) con el de `toISOString()` (`…T03:00:00.000Z`). Justo en la medianoche local del 1 el `+` ordena
antes que el `.` y el movimiento caía en el mes anterior. Ahora se compara el mes local (`localDay(...).slice(0, 7)`).

### 9 y 10. Política de privacidad (media / baja)
Comparada `src/i18n/app/legal/es.ts` contra las tablas y RPC. Cambios (mismos bloques en los 12 idiomas; fecha
2026-10-16; `legal.test.ts` sigue verificando la estructura):
- **Denuncias:** `report_profile` guarda `reporter_user_id = auth.uid()` si quien denuncia tiene sesión. La política
  decía sólo "identificador anónimo diario". Ahora lo dice (y que lo ve sólo el equipo).
- **Estadísticas:** `profile_events` guarda `referrer_host` y `source` (`?src=`): se agregó "de qué sitio o link llegó".
  En plazos decía "se guardan agrupadas", pero son eventos sueltos con el hash diario, sin borrado automático, que se
  borran con el perfil (FK en cascada). Texto corregido.
- **Errores:** decía "hasta que se resuelven", pero `app_errors` no se borra al resolver (queda para reabrirse si vuelve).
  Texto corregido; las visitas afectadas sí se borran a los 90 días (`report_client_error`).
- **Dispositivo:** se agregó que lo cargado sin conexión queda en el dispositivo hasta subirse y que del PIN del diario
  sólo se guarda el hash.

Revisado y coincide: cuenta y `user_metadata` (idioma, referido), Life OS (incluido el diario y nombres de gastos
compartidos), mensajes y colaboraciones (sin IP; el agente se usa para descartar bots y no se guarda), suscriptores (email,
nombre opcional, `consent_at`, idioma, hash), referidos, `product_events` (`user_id on delete set null` = "sin vínculo"),
verificación, voz del navegador, Google, feed de calendario (sólo tareas pendientes con fecha, sin notas), "Último video"
(lo consulta el servidor), Resend. `access_requests` (nombre, email, teléfono) ya no tiene pantalla (`/solicitar-acceso`
redirige a `/register`): si vuelve, sumarlo a la política.

## A decidir (no se cambió)

11. **Zona horaria de la cuenta (baja).** `user_settings.timezone` se guarda y se edita, pero todas las fechas de Life OS
    (hoy, fijos, cuotas, recordatorios) usan la zona del dispositivo (`Intl…timeZone`). Si la persona viaja o tiene el
    celular en otra zona, la preferencia no hace nada. Decidir: usarla en `life_materialize_*` y `dayKey`, o sacarla de
    Ajustes para no prometer algo que no pasa.
    **Arreglado:** Life OS usa la zona de la cuenta (`lib/zonedTime.ts`): hoy, meses, horas, recordatorios y `p_tz` de
    fijos y cuotas. Sin zona elegida sigue al celular; Ajustes avisa si el celular está en otra zona.
12. **Tarea que se repite duplicada (baja).** `rollRecurrence` crea la siguiente si `next_occurrence_id` está vacío en el
    objeto que llega. Dos toques muy rápidos con el mismo objeto, o completarla en dos dispositivos, crean dos
    siguientes. Un arreglo sólido es una restricción en la base (única por tarea origen) o crear la siguiente en una RPC.
13. **"Cada N semanas" (baja).** `recurrence.ts` cuenta las semanas de lunes a domingo; con `week_start = domingo` y días
    domingo+lunes, el lunes se toma como semana nueva y salta N-1 semanas. Raro, pero pasa. Decidir si se usa `week_start`.
14. **Recordatorios de hábitos (baja).** `useHabitReminders` consulta la base cada 30 s con Life OS abierto y deja una
    clave `life-habit-reminded:<id>:<día>` por hábito y día que nunca se limpia. Con varias pestañas puede avisar dos
    veces. Sugerencia: leer los hábitos una vez y limpiar claves de días pasados.
15. **Publicar en paralelo (baja).** `publish_space` calcula `max(version_number) + 1` sin bloqueo: dos "Publicar" a la
    vez (dos pestañas) hacen que uno falle con error. No se pierde nada; se podría bloquear la fila del perfil.

## Revisado sin problemas

- **Monedas:** totales del mes, Mi día, presupuestos (`spentByCategory` por categoría|moneda), "En qué se fue" (sólo la
  principal), Próximos (`upcomingTotals` por moneda), saldos compartidos (`balances` por persona|moneda), cuotas
  pendientes (`remainingByCurrency`), Insights (`moodSpend` y `spendChange` sólo en la principal), "Tu mes" (sólo la
  principal; las demás se nombran) y CSV (cada fila con su moneda). Nunca se suman monedas distintas.
- **Centavos:** `installmentAmounts` = SQL (`round(total/n, 2)` y la última ajusta; nunca queda ≤ 0 con total ≥ n),
  `splitEqual`/`planSplit` cierran exacto, presupuestos con `floor` por día. Saldar con deudas en los dos sentidos da
  el balance correcto (ingreso = lo que te debían; tu parte ya estaba como gasto).
- **Fechas de Dinero:** día 31 → último día (fijos y cuotas, cliente = SQL), bisiestos por `new Date(y, m, 0)`,
  fijos que empiezan después del día elegido, pausa/reanudar sin cargar los meses en pausa, idempotencia por índices
  únicos (`recurring_id, recurring_period` / `installment_plan_id, installment_no`) y `last_no`/`last_period`.
- **Tareas y hábitos:** `nextOccurrence` (mensual 31, atrasada salta a la primera desde hoy, fechas locales sin problemas
  de horario de verano), rachas que perdonan (un día perdido no corta, dos sí; hoy nunca cuenta), "X por semana",
  cantidad (`isDone`), `useToday` a medianoche y al volver, recordatorios una vez por día.
- **Identity:** `moduleSchedule.ts` = `mycen_module_live` (Studio guarda ISO con zona), plantillas: los módulos
  pendientes nacen ocultos, el ojo no los muestra y `mycen_space_snapshot` sólo toma `visibility = 'active'`; claves de
  toques estables (hash de la URL guardada); tope de 5 Spaces con bloqueo por cuenta al crear y al restaurar.
- **Insights y ánimo:** cada regla exige mínimo (8 esperados por hábito, 20 días para el mejor día, 3 gastos, 14 días de
  ánimo con 5 de cada lado y ½ punto); "Este mes" en Hábitos nunca compara en contra; textos sin culpa.
