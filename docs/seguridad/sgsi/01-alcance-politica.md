# 01 · Alcance y política de seguridad y privacidad

## Alcance (27001 cl. 4.3 · SOC 2 descripción del sistema)

**Dentro:** el servicio Mycen en `mycen.id` y sus apps de iOS y Android: Mycen Identity (perfiles públicos), Mycen Studio,
Life OS, el panel del equipo (`/super-admin`), las funciones de `api/` (Vercel Edge), la base de datos y el almacenamiento
de Supabase, el envío de mails (Resend), el código en GitHub (`elevareluxury/menulife`) y el proceso de desarrollo y
publicación.

**Fuera (por ahora):** Mycen Business (cerrado al público hasta su apertura; ver riesgos R-07 a R-09), los dispositivos
personales de quienes usan Mycen y la infraestructura física de los proveedores (cubierta por sus propios SOC 2 / ISO
27001, ver [04](04-activos-proveedores.md#proveedores-y-subencargados)).

**Responsable del tratamiento:** Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio, Argentina.
Contacto de seguridad y privacidad: `team@mycen.id`.

## Roles (27001 A.5.2 · SOC 2 CC1.3)

| Rol | Quién | Responsabilidades |
|---|---|---|
| Dirección / dueño del SGSI | El dueño de Mycen | Aprueba esta política, acepta riesgos, revisa el SGSI cada año |
| Responsable técnico | Quien tenga acceso de administrador a Supabase, Vercel, GitHub y Resend | Accesos, cambios, copias, incidentes técnicos |
| Responsable de privacidad (27701 6.3.1) | El dueño de Mycen (puede delegarse) | Pedidos de las personas, avisos de fuga, proveedores |
| Moderación | Quien atienda `/super-admin/denuncias` | Denuncias y suspensiones (todo queda en la bitácora) |

Si una sola persona tiene varios roles, igual se separan los momentos: quien cambia no aprueba solo (ver
[cambios](06-operacion.md#gestión-de-cambios-y-desarrollo-seguro)) y lo que se hace en el panel queda registrado.

## Política (27001 cl. 5.2, A.5.1 · SOC 2 CC1, CC2, CC5.3)

1. **Mínimo dato.** Mycen guarda sólo lo que necesita para funcionar: sin IP, sin user-agent, sin analítica de terceros
   ni publicidad. Las estadísticas usan un identificador anónimo que cambia cada día.
2. **Mínimo privilegio.** Quien visita un perfil nunca lee tablas (sólo funciones públicas que devuelven lo publicado);
   cada cuenta sólo ve lo suyo (RLS en todas las tablas); el panel del equipo exige ser super-admin y queda registrado.
3. **Cifrado.** Todo el tráfico va por HTTPS con HSTS de 2 años; los datos se guardan cifrados en reposo por los
   proveedores (Supabase/AWS AES-256). Las contraseñas las guarda Supabase Auth con hash (bcrypt).
4. **Cambios controlados.** Nada llega a producción sin PR, CI verde (lint, tipos, unitarias, E2E, base de datos,
   auditoría de dependencias) y una persona que mergea. Las migraciones se aplican a mano y antes del merge.
5. **Proveedores evaluados.** Sólo proveedores con SOC 2 Tipo II o ISO 27001 vigente y acuerdo de tratamiento de datos
   (DPA). Un proveedor nuevo se suma a [04](04-activos-proveedores.md) y a la política de privacidad en 12 idiomas
   antes de usarlo.
6. **Retención definida.** Cada dato tiene un plazo ([05](05-retencion.md)) y se borra solo cuando vence.
7. **Derechos de las personas.** Exportar y borrar la cuenta desde la app; el resto por `team@mycen.id`, en los plazos
   de la ley (Argentina: 10 días corridos acceso, 5 hábiles rectificación/supresión; GDPR: 1 mes).
8. **Incidentes.** Se actúa con el [plan ante incidentes](../../lanzamiento/incidentes.md); una fuga con datos
   personales se avisa a la autoridad y a las personas en los plazos de la ley (GDPR: 72 h).
9. **Segunda verificación.** Toda cuenta con acceso a producción (GitHub, Supabase, Vercel, Resend, Google, Apple,
   dominio) usa verificación en dos pasos.
10. **Mejora continua.** Revisión anual del SGSI, de riesgos y de proveedores; auditoría técnica antes de cada versión
    mayor (ver [auditorías anteriores](../)).

Aprobada por la dirección: ______________________ Fecha: ____ / ____ / ______ (renovar cada año).
