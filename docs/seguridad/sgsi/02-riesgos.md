# 02 · Registro de riesgos (27001 cl. 6.1, 8.2, 8.3 · SOC 2 CC3.1–CC3.4, CC9.1)

**Método.** Probabilidad (P) e impacto (I) de 1 a 3; nivel = P × I. 1–2 bajo, 3–4 medio, 6–9 alto. Un riesgo alto se
trata antes de salir; uno medio tiene plan con fecha; uno bajo se acepta y se revisa cada año. Aceptar un riesgo lo
firma la dirección (columna "Decisión"). Se revisa cada trimestre y después de cada incidente o cambio grande.

| ID | Riesgo | P | I | Nivel | Tratamiento / controles | Residual | Decisión |
|---|---|---|---|---|---|---|---|
| R-01 | Acceso indebido a datos de otra cuenta por una regla de base de datos mal hecha | 2 | 3 | 6 | RLS en todas las tablas; anónimos sólo por RPC; `admin_security_selfcheck` (reglas a–j) en `/super-admin/estado`; tests de base de datos en cada PR (50 archivos) | Bajo | Mitigado |
| R-02 | Cuenta del equipo comprometida (panel, Supabase, Vercel, GitHub) | 2 | 3 | 6 | 2FA obligatoria en todos los paneles (política 9); bitácora inalterable del panel (`admin_audit_log`, 3 años); revisión trimestral de accesos. **Pendiente:** exigir segundo factor (AAL2) para el panel `/super-admin` dentro de Mycen | Medio | Plan: 2FA en el panel, versión 1.1 |
| R-03 | Clave secreta expuesta (service role, Resend, Anthropic) | 1 | 3 | 3 | Claves sólo en paneles, nunca en el repo (sólo la clave pública `anon` en `.env.example`); rotación en el plan de incidentes. **Pendiente:** prender el escaneo de secretos de GitHub (Settings → Code security) | Bajo | Mitigado |
| R-04 | Dependencia con una falla conocida | 2 | 2 | 4 | Dependabot semanal; CI falla con fallas altas o críticas (`npm audit --omit=dev --audit-level=high`); `overrides.sharp ^0.35.5` | Bajo | Mitigado |
| R-05 | satori (imagen al compartir) con escapado incorrecto en SVG (GHSA-wx4j-mvgx-mqwp, moderada) | 1 | 1 | 1 | Corre en Vercel Edge sobre datos publicados (nombre, usuario) y la salida es un PNG; la versión que lo arregla (`@vercel/og` 1.0.3) rompe la imagen y trae otra falla (fflate). Revisar cuando salga una versión estable | Bajo | Aceptado — revisar en 90 días |
| R-06 | Caída de Supabase o Vercel | 1 | 2 | 2 | Proveedores con SLA y SOC 2; `/api/health` + monitor externo; volver al deploy anterior en 1 clic; copias diarias | Bajo | Aceptado |
| R-07 | App de mozo (Business) escribe pedidos con la clave anónima | 2 | 2 | 4 | Business cerrado al público. **Antes de abrirlo:** JWT de mozo firmado y políticas por negocio | Medio | Plan: antes de abrir Business |
| R-08 | Portal de clientes (Business) | 1 | 2 | 2 | Ingreso cerrado (`20261117000001`) hasta mandar el código por mail | Bajo | Mitigado |
| R-09 | Funciones viejas de Business (`import-menu-pdf`, `send-reservation-email`) sin control de quién llama | 2 | 2 | 4 | Borrarlas del panel de Supabase (pendiente del dueño) | Medio | Plan: ahora |
| R-10 | Pérdida de datos por error humano (migración, borrado) | 1 | 3 | 3 | Migraciones idempotentes y probadas en Postgres real; copias diarias del plan Pro de Supabase (7 días; PITR opcional); prueba de restauración trimestral | Bajo | Mitigado |
| R-11 | Spam / cuentas falsas / abuso de formularios | 2 | 1 | 2 | Turnstile; límites por visitante (hash diario) y por perfil; bots reciben "ok" sin guardar; firewall de `/api` | Bajo | Mitigado |
| R-12 | Contenido ilegal o suplantación en perfiles | 2 | 2 | 4 | Denuncias, suspensión con motivo, verificación de cuentas, reglas en `/terminos#reglas` | Bajo | Mitigado |
| R-13 | Una sola persona clave (conocimiento y accesos concentrados) | 3 | 2 | 6 | Documentación en el repo (`CLAUDE.md`, `docs/`); plan de incidentes; **pendiente:** cuenta de recuperación / segunda persona con acceso de emergencia guardado en un gestor de contraseñas | Medio | Plan: 30 días |
| R-14 | Textos legales sin revisión de abogado | 2 | 2 | 4 | Revisión antes de campañas grandes | Medio | Plan: antes de campañas |
| R-15 | Transferencia internacional de datos (Supabase/Vercel fuera de Argentina) | 2 | 1 | 2 | DPA con cláusulas contractuales tipo de cada proveedor; informado en privacidad | Bajo | Aceptado |

**Riesgos aceptados vigentes:** R-05, R-06, R-15. Firma de la dirección: ______________________ Fecha: ____ / ____ / ______
