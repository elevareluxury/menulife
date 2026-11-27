# 05 · Retención y borrado (27701 7.4.7–7.4.8 · 27001 A.8.10 · SOC 2 P4.2)

Cada dato tiene un plazo y una forma de borrarse. La política de privacidad (12 idiomas, sección "Cuánto tiempo") dice lo
mismo: si se cambia un plazo, se cambian los dos en el mismo PR.

| Dato | Plazo | Cómo se borra |
|---|---|---|
| Cuenta, perfil, Life OS, proyectos | Mientras exista la cuenta | La persona borra la cuenta (Studio / Life OS → Ajustes, o `/eliminar-cuenta`): cascada en la base |
| Mensajes, colaboraciones, suscriptores | Hasta que el dueño los borra o borra su cuenta | Studio → Mensajes / Suscriptores; cascada al borrar el perfil |
| Estadísticas de visitas (`profile_events`) | 13 meses (Studio muestra hasta 90 días) | `mycen_purge_expired()` diario (hasta 200.000 por día) y cascada al borrar el perfil |
| Links marcados como peligrosos (`mycen_link_flags`) | 13 meses | `mycen_purge_expired()` diario; la denuncia queda en `profile_reports` |
| Votos de encuestas (`profile_poll_votes`) | Mientras exista el módulo | Cascada al borrar el módulo |
| Uso de la app (`product_events`, `user_activity_days`) | **25 meses** | `mycen_purge_expired()` diario (pg_cron 04:17 UTC). Al borrar la cuenta: actividad en cascada, eventos sin vínculo |
| Personas afectadas por errores (`app_error_hits`) | **90 días** | `mycen_purge_expired()` y al reportar un error |
| Errores (`app_errors`) | Mientras sirvan (uno resuelto queda por si vuelve) | A mano desde `/super-admin/errores` |
| Bitácora del equipo (`admin_audit_log`) | **3 años** | `mycen_purge_expired()`; nadie la puede modificar ni borrar antes (trigger `admin_audit_log_guard`) |
| Copias de seguridad de la base | Ciclo del proveedor (Supabase Pro con PITR) | Se sobrescriben solas |
| Copia de fotos y PDF (Cloudflare R2) | Espejo diario; lo borrado o cambiado, **30 días** | `storage-backup.yml` borra `old/` de más de 30 días |
| Fotos del panel del equipo (`mycen_admin_snapshots`: sólo totales y conteos, y los usernames públicos de "perfiles más visitados") | **Se reemplazan cada hora** (una fila por pantalla y período) | pg_cron `mycen-admin-snapshots` |
| Contadores de pedidos por IP y por cuenta (`mycen_rate_hits`, hash de la IP o de la cuenta con sal) | **2 días** | pg_cron `mycen-rate-hits-purge` cada hora |
| Archivos de una cuenta borrada | Se borran al borrar la cuenta (fotos y PDF) | `removeAccountFiles` antes de `delete_my_account`; el equipo puede borrarlos desde Personas |
| Denuncias (`profile_reports`, `profile_message_reports`) | Mientras exista el perfil denunciado | Cascada al borrar el perfil |
| Pedidos de verificación e invitaciones (`verification_requests`, `referrals`) | Mientras exista la cuenta | Cascada al borrar la cuenta |
| Nombres reservados (`talent_reservations`) | Mientras dure la reserva | El equipo la borra en `/super-admin/reservas` |
| Retención legal (`mycen_legal_holds`, abuso sexual infantil) | Lo que pida la autoridad | El equipo levanta la retención desde Personas; mientras tanto nadie borra la cuenta ni sus archivos. Los archivos pasan del link público al bucket privado `mycen-evidence` (sólo super-admins con aal2; se borra a mano al cerrar) |
| Datos que la ley obligue a guardar (facturación) | El plazo de la ley | Fuera de la app |

**Comprobar que corre:** `/super-admin/estado` muestra las tareas de pg_cron (`mycen-purge-expired`) con su última
corrida. Si pg_cron no está prendido: Supabase → Database → Extensions → `pg_cron`, y volver a correr la migración
`20261121000001_retention_hardening.sql` (es idempotente). A mano: `select public.mycen_purge_expired();` devuelve
cuánto borró de cada tabla.
