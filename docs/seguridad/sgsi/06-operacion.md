# 06 · Operación de la seguridad

## Control de accesos

(27001 A.5.15–5.18, A.8.2–8.5 · SOC 2 CC6.1–CC6.3)

**Dentro de Mycen**
- **Visitante:** sólo las RPC públicas listadas en `CLAUDE.md` (Modelo de datos); nunca lee tablas.
- **Cuenta:** sólo lo suyo (RLS con `(select auth.uid())`).
- **Super-admin:** tabla `super_admins`, que nadie edita desde la app. Todo lo que hace queda en `admin_audit_log`, que no
  se puede modificar.

**Paneles** (GitHub, Supabase, Vercel, Resend, registrador, Google Cloud, Apple, Play Console):
- Cada persona con su propia cuenta; nada de cuentas compartidas.
- 2FA obligatoria, mejor con app o llave física que con SMS.
- Rol mínimo que alcance: por ejemplo, "Developer" en Supabase en vez de "Owner".

**Revisión trimestral** (la evidencia queda en un issue de GitHub con la etiqueta `acceso-revisado`):
1. Exportar o capturar la lista de miembros de cada panel y de `super_admins`
   (`select user_id, created_at from super_admins`).
2. Confirmar que cada persona sigue necesitando el acceso y con ese rol, y que tiene 2FA.
3. Quitar lo que sobra en el momento y anotarlo.

### Altas y bajas

- **Alta:** acuerdo de confidencialidad firmado → cuenta personal → 2FA → rol mínimo → anotar en el issue de accesos.
- **Baja:** el mismo día se quitan todos los accesos. Si la persona conocía claves, se rotan: service role, Resend y
  push (ver el plan ante incidentes).

### Dispositivos del equipo

- Disco cifrado (FileVault, BitLocker o el cifrado de Android/iOS).
- Bloqueo de pantalla a los 5 minutos o menos.
- Sistema y navegador al día.
- Gestor de contraseñas.
- Nada de copias de la base de producción en la computadora.

## Gestión de cambios y desarrollo seguro

(27001 A.8.25–8.29, A.8.32 · SOC 2 CC8.1)

- **Ramas:** todo cambio va por una rama y un PR. Nunca se pushea a `main`.
- **CI** (`.github/workflows/ci.yml`), en cada PR:
  - lint
  - tipos y unitarias
  - `npm audit --omit=dev --audit-level=high`
  - build con chequeo de CSP
  - presupuesto de peso
  - humo del build de producción
  - E2E (con axe)
  - base de datos en Postgres real
- **Migraciones:**
  - Idempotentes, con RLS y con tests en `tests/db/`.
  - Se aplican en Supabase (SQL Editor) **antes** de mergear.
- **Revisión:**
  - Quien mergea revisa el resumen del PR.
  - Un cambio de permisos, de datos personales o de proveedores lleva una nota de seguridad en la descripción y
    actualiza este SGSI.
- **Protección de `main`** (GitHub → Settings → Branches), a configurar por el dueño:
  - Exigir PR y el check `checks` en verde.
  - Bloquear force-push y borrado.
- **Versiones:**
  - `release/v1` y la etiqueta `v1.0.0` marcan lo publicado.
  - Un arreglo urgente sale de `release/v1` y vuelve a `main`.
- **Secretos:** sólo en los paneles. El build falla si aparece un `<script src>` de otro origen.
  - **Pendiente:** prender "Secret scanning" y "Push protection" en GitHub (Settings → Code security).

## Vulnerabilidades

(27001 A.8.8 · SOC 2 CC7.1)

| Fuente | Frecuencia | Plazo para arreglar |
|---|---|---|
| Dependabot (npm y GitHub Actions) | Semanal | Crítica 7 días · alta 30 días · moderada 90 días o riesgo aceptado en [02](02-riesgos.md) |
| `npm audit` en CI | Cada PR | No pasa una falla alta o crítica |
| Supabase → Advisors y `admin_security_selfcheck` (`/super-admin/estado`) | Mensual | Lo que marque en rojo, en el mes |
| Auditoría técnica (como `docs/seguridad/auditoria-*.md`) | Antes de cada versión mayor | Según gravedad |
| Reportes externos (`security.txt`, [SECURITY.md](../../../SECURITY.md)) | Al llegar | Acuse en 72 h |

## Copias y continuidad

(27001 A.8.13, A.5.29–5.30 · SOC 2 A1.2–A1.3)

**Objetivos:**
- RPO (cuántos datos se pueden perder como máximo): 24 h.
- RTO (cuánto puede tardar en volver): 4 h.

**Copias:**
- Copias diarias de Supabase (plan Pro, 7 días). Para un RPO de minutos: Point-in-Time Recovery (complemento pago).
- El código está en GitHub, y cada deploy en Vercel se puede volver a publicar en 1 clic.

**Prueba de restauración trimestral:**
1. Restaurar la copia más reciente en un proyecto de Supabase aparte.
2. Abrir un perfil y una cuenta de prueba.
3. Anotar cuánto tardó en el issue `restauracion-probada`.
4. Borrar el proyecto de prueba.

**Si cae un proveedor:**
- Página de estado del proveedor.
- Aviso en redes con `/api/health`.
- El [plan ante incidentes](../../lanzamiento/incidentes.md#caída-de-la-web-o-la-app).

## Registro y monitoreo

(27001 A.8.15–8.16 · SOC 2 CC7.2–CC7.3)

- `/super-admin/estado` se revisa solo cada minuto con la pestaña abierta. Muestra la base, las RPC públicas, las
  previsualizaciones, el sitemap, pg_cron, las consultas lentas y el chequeo de seguridad.
- Monitor externo sobre `/api/health`, que avisa por mail o al celular.
- Errores de la app agrupados en `/super-admin/errores`. Un error resuelto que vuelve se reabre solo.
- `admin_audit_log` guarda cada acción del equipo y no se puede modificar. Se conserva 3 años.
- Logs de los proveedores (Supabase y Vercel), con el plazo de cada plan.

## Calendario de controles

(SOC 2 CC4.1 · 27001 cl. 9)

La evidencia de cada revisión se guarda como un issue de GitHub con su etiqueta y una captura de pantalla.

| Cada | Qué | Evidencia |
|---|---|---|
| Semana | Revisar y mergear los PR de Dependabot | PRs mergeados |
| Mes | `/super-admin/estado?deep=1` todo verde; Supabase → Advisors sin rojos; errores nuevos revisados | Issue `control-mensual` |
| Mes | `select public.mycen_purge_expired();` o ver la última corrida en el estado | Captura en el mismo issue |
| Trimestre | Revisión de accesos ([arriba](#control-de-accesos)) | Issue `acceso-revisado` |
| Trimestre | Prueba de restauración | Issue `restauracion-probada` |
| Trimestre | Repasar [riesgos](02-riesgos.md) y vencer o renovar los aceptados | Commit en `02-riesgos.md` |
| Año | Revisión del SGSI por la dirección: política, alcance, proveedores (certificaciones y DPA), retención | Firma en [01](01-alcance-politica.md) + commit |
| Año | Renovar `public/.well-known/security.txt` (vence 2027-10-31) | Commit |
| Año / versión mayor | Auditoría técnica + simulacro del plan ante incidentes | `docs/seguridad/auditoria-*.md` |
