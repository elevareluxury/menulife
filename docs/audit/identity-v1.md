# Auditoría Identity V1

**Fecha:** 2026-10-05  
**Rama:** `feat/og-dynamic`  
**Alcance:** Módulos `src/modules/studio/`, `src/modules/profile/`, `src/pages/AuthCallback.tsx`, `src/modules/onboarding/`, `api/og/`

---

## Tabla de hallazgos

| ID | Sección | Descripción | Archivo y línea | Prioridad | Corrección sugerida |
|----|---------|-------------|-----------------|-----------|---------------------|
| ID-01 | Auth — AuthCallback | Si `handle()` lanza una excepción fuera del `try/catch` interno (ej. fallo de red antes del primer `await`), el spinner queda girando indefinidamente. No hay timeout de UI de respaldo. | `src/pages/AuthCallback.tsx:~40–110` | Importante | Envolver `handle()` en un `try/catch` global con redirect a `/login?error=auth_failed` como fallback final; o añadir un timeout de ~15 s. |
| ID-02 | Onboarding — contaminación Business | `DashboardPage` redirige a `/onboarding` (flujo Business con creación de restaurante) cuando `onboarding_completed === false`. Un usuario de Studio no tiene ese flag, pero si accede manualmente a `/dashboard` sin restaurante podría ver el flujo de negocio en lugar del de identidad. | `src/pages/DashboardPage.tsx:~51`, `src/modules/onboarding/pages/OnboardingFlow.tsx` | Importante | Añadir guardia en `/dashboard` que redirija a `/studio` cuando el usuario no tiene restaurante (`restaurant === null`), antes de evaluar `onboarding_completed`. |
| ID-03 | OG — fallback de errores | `api/og/[slug].tsx` devuelve un error de texto plano cuando Supabase está caído o el slug no existe. WhatsApp y otros previsualizadores muestran nada en esos casos. | `api/og/[slug].tsx` (bloque de manejo de errores) | Importante | Retornar una imagen OG estática por defecto (generada con `@vercel/og`) cuando la consulta falla o el perfil no se encuentra. |
| ID-04 | Tests E2E — cobertura | Faltan tests E2E para: (a) flujo de confirmación de email de extremo a extremo, (b) `OnboardingWizard` (5 pasos), (c) expiración de sesión / cierre automático, (d) Studio en viewport móvil, (e) estado de error con Supabase caído en Studio. | `tests/e2e/` (specs ausentes) | Importante | Agregar specs: `email-confirm.spec.ts`, `onboarding-wizard.spec.ts`, `session-expiry.spec.ts`, `studio-mobile.spec.ts`, `studio-offline.spec.ts`. |
| ID-05 | Studio — touch targets | `.st-layer-row .st-icon-btn` baja a 34×34 px en el editor de escritorio. WCAG 2.2 SC 2.5.8 requiere 24×24 px mínimo; la guía interna apunta a 44 px en móvil. | `src/modules/studio/studio.css:525` | Menor | Subir a `min: 40×40 px` en todas las variantes; 44 px en las que se usan en móvil. |
| ID-06 | Studio — touch targets (asimetría) | `.st-module-actions .st-icon-btn` tiene `width: 36px; height: 40px` (asimétrico). No es error funcional pero es incoherente. | `src/modules/studio/studio.css:253` | Menor | Usar `width: 40px; height: 40px`. |
| ID-07 | Auth — AuthCallback | Delay de 800 ms hardcodeado para el caso de hash implícito. En conexiones lentas puede ser insuficiente. | `src/pages/AuthCallback.tsx:105` | Menor | Reemplazar por polling de `supabase.auth.getSession()` con reintentos (máx. 3×300 ms). |
| ID-08 | RLS / seguridad de datos | Todas las tablas Identity (`profiles`, `profile_modules`, `profile_versions`, `content_objects`, `profile_events`, `profile_reports`) tienen RLS habilitado. Las RPCs públicas usan `SECURITY DEFINER`. No se encontraron filtraciones de datos privados a visitantes anónimos. | `supabase/migrations/` | — | Sin acción necesaria. |
| ID-09 | Auth flows | `AuthCallback.tsx` maneja correctamente los 4 casos (error explícito, recovery PKCE, código PKCE, hash implícito). `redirectByRole()` distingue super_admins / restaurants / profiles. Timeout de 8 s en `useAuth.ts` previene loading infinito. | `src/pages/AuthCallback.tsx`, `src/modules/auth/hooks/useAuth.ts` | — | Sin acción necesaria. |
| ID-10 | Studio — estados de carga | `StudioShell` implementa la máquina `loading → error → empty → ready` correctamente. `empty` muestra `OnboardingWizard`; `error` muestra mensaje con reintento. | `src/modules/studio/StudioShell.tsx:55–100` | — | Sin acción necesaria. |
| ID-11 | Studio — mobile nav | `/studio/more` en `MOBILE_NAV` apunta a `MorePage` (existe, implementada con accesos a Módulos, Proyectos, Apariencia, Analítica, Ajustes, Spaces, Salir). No es dead code. | `StudioShell.tsx:52`, `MiscPages.tsx:24` | — | Sin acción necesaria. |
| ID-12 | Dead code | No se encontró dead code en `src/modules/studio/` ni `src/modules/profile/`. Todas las rutas de `MOBILE_NAV` y `SIDE_NAV` tienen componentes implementados. | — | — | Sin acción necesaria. |
| ID-13 | Textos de debug | No se encontraron `console.log`, `TODO` ni `FIXME` en `src/modules/studio/` ni `src/modules/profile/`. | — | — | Sin acción necesaria. |

---

## Resumen por prioridad

| Prioridad | Cantidad | IDs |
|-----------|----------|-----|
| Crítico | 0 | — |
| Importante | 4 | ID-01, ID-02, ID-03, ID-04 |
| Menor | 3 | ID-05, ID-06, ID-07 |
| Sin acción | 6 | ID-08, ID-09, ID-10, ID-11, ID-12, ID-13 |

> No se encontraron issues Críticos. No hay pérdida ni filtración de datos, ningún flujo principal roto, y ninguna pantalla de Business es visible para un usuario que sólo tiene identidad en Studio.
