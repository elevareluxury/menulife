# 05 · Retención y borrado (27701 7.4.7–7.4.8 · 27001 A.8.10 · SOC 2 P4.2)

Cada dato tiene un plazo y una forma de borrarse. La política de privacidad (12 idiomas, sección "Cuánto tiempo") dice lo
mismo: si se cambia un plazo, se cambian los dos en el mismo PR.

| Dato | Plazo | Cómo se borra |
|---|---|---|
| Cuenta, perfil, Life OS, proyectos | Mientras exista la cuenta | La persona borra la cuenta (Studio / Life OS → Ajustes, o `/eliminar-cuenta`): cascada en la base |
| Mensajes, colaboraciones, suscriptores | Hasta que el dueño los borra o borra su cuenta | Studio → Mensajes / Suscriptores; cascada al borrar el perfil |
| Estadísticas de visitas (`profile_events`) | Mientras exista el perfil | Cascada al borrar el perfil |
| Votos de encuestas (`profile_poll_votes`) | Mientras exista el módulo | Cascada al borrar el módulo |
| Uso de la app (`product_events`, `user_activity_days`) | **25 meses** | `mycen_purge_expired()` diario (pg_cron 04:17 UTC). Al borrar la cuenta: actividad en cascada, eventos sin vínculo |
| Personas afectadas por errores (`app_error_hits`) | **90 días** | `mycen_purge_expired()` y al reportar un error |
| Errores (`app_errors`) | Mientras sirvan (uno resuelto queda por si vuelve) | A mano desde `/super-admin/errores` |
| Bitácora del equipo (`admin_audit_log`) | **3 años** | `mycen_purge_expired()`; nadie la puede modificar ni borrar antes (trigger `admin_audit_log_guard`) |
| Copias de seguridad | Ciclo del proveedor (Supabase Pro: 7 días) | Se sobrescriben solas |
| Datos que la ley obligue a guardar (facturación) | El plazo de la ley | Fuera de la app |

**Comprobar que corre:** `/super-admin/estado` muestra las tareas de pg_cron (`mycen-purge-expired`) con su última
corrida. Si pg_cron no está prendido: Supabase → Database → Extensions → `pg_cron`, y volver a correr la migración
`20261121000001_retention_hardening.sql` (es idempotente). A mano: `select public.mycen_purge_expired();` devuelve
cuánto borró de cada tabla.
