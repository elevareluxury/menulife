# 03 — Riesgos de migración (auditoría Fase 0)

Escala: **Alto** = puede romper URLs públicas, QR o datos; **Medio** = rompe una función de Studio o analítica;
**Bajo** = molestia o deuda.

## Estrategia base que reduce casi todos los riesgos

Mantener la tabla `profiles` como **tabla de Spaces**, agregándole columnas en lugar de reemplazarla, y
crear `identities` aparte. Los `id` de los perfiles actuales pasan a ser los `id` de sus Spaces. Así se conservan
sin tocar las FK de `profile_modules`, `profile_events`, `profile_username_history`, el vínculo con Business
y la continuidad de la analítica (ver P3 en `00-decisiones.md`).

## Riesgos

| # | Riesgo | Nivel | Mitigación |
|---|---|---|---|
| R1 | **La página pública deja de resolver un username** (o resuelve otro) al cambiar el modelo | Alto | `get_public_profile(text)` mantiene firma y forma de respuesta; se reimplementa por dentro. Prueba de compatibilidad: guardar la respuesta de la RPC de **todos** los perfiles publicados antes y compararla después. |
| R2 | **QR y URLs viejas** (historial de usernames) dejan de redirigir | Alto | `profile_username_history` sigue apuntando al mismo `id` (Space). Prueba E2E del Flujo E con usernames anteriores reales. |
| R3 | **La primera versión publicada no coincide con lo que se veía** (snapshot inicial mal armado) | Alto | Generar el snapshot inicial con la misma consulta que usa hoy `get_public_profile` y comparar ambos JSON por perfil antes de pasar a leer snapshots. |
| R4 | **Ventana de inconsistencia** mientras se migra (alguien edita en Studio a la mitad) | Medio | Migración en una transacción e idempotente. El cambio de lectura (Switch) va detrás de una bandera en la base: si falla, se vuelve a leer de las tablas vivas. |
| R5 | El **trigger de negocios** (`mycen_profile_for_restaurant`) sigue creando perfiles sin Identity | Medio | Actualizar el trigger en la misma migración para crear o reutilizar la Identity del dueño. |
| R6 | `mycen_import_hub()` y el cutover escriben en `profiles`/`profile_modules` con el modelo viejo | Medio | Re-sincronizar los negocios pendientes antes de migrar y dejar la función sólo para lectura de legado (o retirarla, ya que Studio reemplazó al editor del Hub). |
| R7 | **Exportar y borrar** (Studio, Life OS) no incluyen las tablas nuevas | Medio | Agregar `identities`, versiones y contenido a `exportMyData` y verificar la cascada de `delete_my_account`. |
| R8 | **Traducciones** (`translations` en perfil y módulos) no entran en el snapshot | Medio | El snapshot copia la respuesta completa de la RPC, que ya incluye `translations`. |
| R9 | **RLS** de las tablas nuevas mal definida: un visitante lee borradores o versiones no públicas | Alto | `anon` sin acceso a tablas nuevas (igual que hoy); sólo RPC. Pruebas con dueño, usuario ajeno y anónimo antes de pasar a producción. |
| R10 | **Último que escribe gana**: dos pestañas pisan cambios | Bajo | Bloqueo optimista (decisión 8): el guardado envía la versión que conoce y la base rechaza si cambió. |
| R11 | **Usernames reservados en 3 lugares** (tabla, `reservedUsernames.ts`, `api/og.ts`) se desincronizan al sumar rutas como `/alex/projects/...` | Bajo | Que `api/og.ts` consulte la base (o un único archivo compartido) y agregar un chequeo que compare las listas. |
| R12 | **Sin tests en el repo**: no hay forma de demostrar que nada se rompió | Alto | Montar Vitest + Playwright en el repo **antes** de la primera migración (Fase 0.5 del plan). |
| R13 | **SQL aplicado a mano** en el SQL Editor: un paso salteado o corrido dos veces | Medio | Scripts idempotentes, cada uno con consulta de verificación y script de rollback probado. Respaldo antes de cada paso (Supabase → Database → Backups). |
| R14 | `database.types.ts` desactualizado (sin `profiles` ni tablas de Life OS) | Bajo | Regenerar los tipos al crear las tablas nuevas para dejar de usar casts. |
| R15 | **Googlebot recibe hoy sólo título y descripción** (`api/og.ts`); si cambia la forma de servir, puede caer la indexación existente | Bajo | Mantener la regla de `vercel.json` y enriquecer el HTML de `api/og.ts` a partir de la versión publicada (P9). |

## Rollback

Cada paso de la migración (Expand, Migrate, Switch) tiene su script de vuelta atrás:

- **Expand:** sólo agrega tablas y columnas con valores por defecto. Rollback = `drop` de lo agregado.
- **Migrate:** escribe en tablas nuevas; no modifica las viejas. Rollback = vaciar las tablas nuevas.
- **Switch:** cambia una bandera de lectura. Rollback = volver la bandera.
- **Contract:** borra lo viejo. **Sólo** después de semanas estables, con respaldo verificado y aprobación explícita.
