# 03 · Controles: estado y evidencia

Funciona como **Declaración de Aplicabilidad** (ISO 27001 cl. 6.1.3) y como matriz de controles para **SOC 2** y la
**ISO 27701**. Estado: ✅ implementado con evidencia · 🟡 parcial / depende de una acción del dueño · ❌ falta · N/A no
aplica (con motivo). La evidencia apunta a archivos del repo o a pantallas de los paneles.

## ISO 27001:2022 — Anexo A

### A.5 Organizacionales

| Control | Estado | Evidencia / acción |
|---|---|---|
| 5.1 Políticas | 🟡 | [01](01-alcance-politica.md); falta la firma de la dirección |
| 5.2 Roles y responsabilidades | ✅ | [01 · Roles](01-alcance-politica.md#roles-27001-a52--soc-2-cc13) |
| 5.3 Segregación de funciones | 🟡 | PR + CI antes de producción; con una sola persona se compensa con registro (bitácora, historial de Git) |
| 5.4–5.6 Dirección, autoridades, grupos | ✅ | AAIP / autoridades en privacidad; contacto en `security.txt` |
| 5.7 Inteligencia de amenazas | ✅ | Dependabot + `npm audit` en CI; avisos de Supabase Advisors |
| 5.8 Seguridad en proyectos | ✅ | Auditoría por etapa (`docs/seguridad/auditoria-*.md`), reglas en `CLAUDE.md` |
| 5.9 Inventario de activos | ✅ | [04](04-activos-proveedores.md) |
| 5.10 Uso aceptable | ✅ | `/terminos#reglas` (12 idiomas) |
| 5.12–5.13 Clasificación y etiquetado | ✅ | [04 · Clasificación](04-activos-proveedores.md#clasificación) |
| 5.14 Transferencia de información | ✅ | Sólo HTTPS; exportes descargados por la propia persona |
| 5.15–5.18 Control de accesos, identidad, autenticación, derechos | 🟡 | RLS + RPC; super-admins en tabla propia; [06 · Accesos](06-operacion.md#control-de-accesos). Pendiente: 2FA dentro del panel (R-02) |
| 5.19–5.22 Proveedores | ✅ | [04 · Proveedores](04-activos-proveedores.md#proveedores-y-subencargados) con certificaciones y DPA |
| 5.23 Servicios en la nube | ✅ | Supabase, Vercel, Resend: configuración en `docs/lanzamiento/salida-web.md` |
| 5.24–5.28 Incidentes y evidencia | ✅ | [Plan ante incidentes](../../lanzamiento/incidentes.md) con registro y plazos de aviso |
| 5.29–5.30 Continuidad / TIC | 🟡 | [06 · Continuidad](06-operacion.md#copias-y-continuidad); falta la primera prueba de restauración |
| 5.31–5.34 Legal, PI, registros, privacidad | 🟡 | Privacidad y términos en 12 idiomas; falta revisión de abogado (R-14) |
| 5.35–5.36 Revisión independiente y cumplimiento | 🟡 | Auditorías internas por etapa; falta una revisión externa (pentest) antes de campañas grandes |
| 5.37 Procedimientos documentados | ✅ | `docs/lanzamiento/`, este SGSI |

### A.6 Personas

| Control | Estado | Evidencia / acción |
|---|---|---|
| 6.1–6.6 Selección, términos, concienciación, confidencialidad | 🟡 | Hoy una persona. Al sumar gente: acuerdo de confidencialidad, alta/baja de accesos con [06](06-operacion.md#altas-y-bajas) |
| 6.7 Trabajo remoto | ✅ | Todo en la nube con 2FA; sin datos de producción en computadoras locales |
| 6.8 Reporte de eventos | ✅ | `team@mycen.id`, `security.txt`, [SECURITY.md](../../../SECURITY.md), denuncias en la app |

### A.7 Físicos

N/A: sin oficina ni servidores propios. Cubierto por los SOC 2 / ISO 27001 de Supabase (AWS) y Vercel (AWS). Los
dispositivos del equipo: bloqueo de pantalla, disco cifrado y sistema actualizado (7.9, 7.10, 7.14 → [06](06-operacion.md#dispositivos-del-equipo)).

### A.8 Tecnológicos

| Control | Estado | Evidencia / acción |
|---|---|---|
| 8.1 Dispositivos de usuario | 🟡 | [06 · Dispositivos](06-operacion.md#dispositivos-del-equipo) |
| 8.2 Accesos privilegiados | 🟡 | `super_admins`, `admin_*` sólo `authenticated` + `mycen_is_admin`; service role sólo en el servidor. Pendiente 2FA en el panel |
| 8.3 Restricción de acceso | ✅ | RLS en todas las tablas; anónimos sólo RPC (`CLAUDE.md` · Modelo de datos); `restaurants` con columnas públicas |
| 8.4 Acceso al código | ✅ | GitHub privado; ramas protegidas (configurar en GitHub: ver [06](06-operacion.md#gestión-de-cambios-y-desarrollo-seguro)) |
| 8.5 Autenticación segura | 🟡 | Supabase Auth, contraseñas filtradas bloqueadas (activar en el panel), Turnstile, Google/Apple. Pendiente 2FA del panel |
| 8.6 Capacidad | ✅ | `/super-admin/estado` (tamaño, conexiones, límites del plan) |
| 8.7 Malware | ✅ | Archivos subidos: imágenes convertidas a WebP en el dispositivo, PDFs con tipo y tamaño cerrados (10 MB) |
| 8.8 Vulnerabilidades técnicas | ✅ | Dependabot; `npm audit --audit-level=high` en CI; `admin_security_selfcheck`; auditorías por etapa |
| 8.9 Configuración | ✅ | Todo como código: `vercel.json`, migraciones, `supabase/templates`, CI |
| 8.10 Borrado de información | ✅ | `mycen_purge_expired` diario ([05](05-retencion.md)); borrar cuenta borra todo en cascada |
| 8.11 Enmascaramiento | ✅ | Hash diario anónimo en estadísticas, denuncias, mensajes y votos; sin IP |
| 8.12 Fuga de datos | ✅ | RPC públicas devuelven sólo lo publicado; `get_public_quote` sin datos internos; CSP estricta |
| 8.13 Copias de seguridad | 🟡 | Copias diarias de Supabase Pro; [06](06-operacion.md#copias-y-continuidad); falta probar una restauración |
| 8.15 Registro (logs) | ✅ | `admin_audit_log` inalterable (`20261121000001`), `app_errors`, logs de Supabase/Vercel |
| 8.16 Monitoreo | ✅ | `/super-admin/estado` cada minuto, `/api/health` + monitor externo, errores agrupados |
| 8.17 Sincronización de relojes | ✅ | Relojes de los proveedores (NTP); la app usa la hora del servidor para todo lo que importa |
| 8.20–8.22 Seguridad de redes y servicios web | ✅ | HTTPS + HSTS 2 años con preload; firewall de Vercel en `/api`; CORS sólo donde hace falta |
| 8.23 Filtrado web | ✅ | CSP sin `unsafe-inline` en scripts, orígenes cerrados; links del contenido por `safeUrl` |
| 8.24 Criptografía | ✅ | TLS 1.2+; cifrado en reposo de los proveedores; PBKDF2 600.000 vueltas para el PIN del diario |
| 8.25–8.29 Desarrollo seguro y pruebas | ✅ | [06 · Cambios](06-operacion.md#gestión-de-cambios-y-desarrollo-seguro); CI con E2E, axe, base de datos y humo del build con CSP |
| 8.30 Desarrollo tercerizado | N/A | No se terceriza desarrollo |
| 8.31 Separación de entornos | ✅ | Vista previa por PR (Vercel), Supabase simulado en E2E, Postgres de prueba en CI |
| 8.32 Gestión de cambios | ✅ | PR + CI + merge manual; migraciones antes del merge |
| 8.33 Datos de prueba | ✅ | Datos inventados (Olivia Parker, Ana Pérez de prueba); nunca datos reales en tests |
| 8.34 Auditorías | ✅ | Sólo lectura sobre producción (`admin_security_selfcheck`) |

## SOC 2 — Trust Services Criteria

| Criterio | Estado | Cómo se cumple |
|---|---|---|
| CC1 Entorno de control | 🟡 | Política y roles ([01](01-alcance-politica.md)); falta firma y revisión anual registrada |
| CC2 Comunicación | ✅ | Términos, privacidad y soporte en 12 idiomas; `security.txt`; avisos de seguridad por mail (Supabase → Security) |
| CC3 Evaluación de riesgos | ✅ | [02](02-riesgos.md) |
| CC4 Monitoreo de controles | ✅ | Calendario en [06](06-operacion.md#calendario-de-controles); estado del sistema en vivo |
| CC5 Actividades de control | ✅ | Controles automáticos en CI y en la base (RLS, triggers, límites) |
| CC6 Accesos lógicos y físicos | 🟡 | Ver A.5.15–18 y A.8.2–8.5; pendiente 2FA del panel |
| CC7 Operación (detección, respuesta) | ✅ | Errores, estado, monitor, plan de incidentes, bitácora inalterable |
| CC8 Gestión de cambios | ✅ | PR + CI + migraciones probadas |
| CC9 Mitigación de riesgos / proveedores | ✅ | [04 · Proveedores](04-activos-proveedores.md#proveedores-y-subencargados) |
| A1 Disponibilidad | 🟡 | Proveedores con SLA, monitor, volver atrás en 1 clic; falta prueba de restauración |
| C1 Confidencialidad | ✅ | RLS, mínimo dato, retención y borrado |
| P1–P8 Privacidad | ✅ | Aviso (P1), consentimiento en registro y suscripciones (P2), recolección mínima (P3), retención y borrado (P4), acceso y portabilidad (P5), proveedores (P6), calidad (P7), reclamos (P8) |

## ISO 27701 — PIMS (responsable y encargado)

| Cláusula | Estado | Evidencia |
|---|---|---|
| 7.2.1–7.2.2 Finalidad y base legal | ✅ | Privacidad · "Para qué" y [04 · Tratamientos](04-activos-proveedores.md#registro-de-tratamientos) |
| 7.2.3–7.2.4 Consentimiento | ✅ | Casilla de términos (también con Google: `/auth/terms`); consentimiento con nombre del dueño en "Suscribirse" |
| 7.2.5 Evaluación de impacto (DPIA) | 🟡 | Riesgos de privacidad en [02](02-riesgos.md); hacer una DPIA formal antes de Business (datos de clientes de terceros) |
| 7.2.8 Registro de tratamientos | ✅ | [04](04-activos-proveedores.md#registro-de-tratamientos) |
| 7.3 Derechos de las personas | ✅ | Exportar/borrar en la app; `/eliminar-cuenta`; plazos legales en privacidad |
| 7.4.1–7.4.5 Minimización | ✅ | Sin IP ni user-agent; hash diario; sin analítica de terceros |
| 7.4.7 Retención | ✅ | [05](05-retencion.md) + `mycen_purge_expired` |
| 7.4.8 Borrado al final | ✅ | Borrar cuenta = cascada; copias de proveedores se sobrescriben en su ciclo |
| 7.5 Transferencias y subencargados | ✅ | [04 · Proveedores](04-activos-proveedores.md#proveedores-y-subencargados) |
| 8.x (Mycen como encargado de los dueños de perfiles: mensajes, suscriptores) | ✅ | El dueño ve, exporta y borra; Mycen no usa esos datos; los términos lo explican |
