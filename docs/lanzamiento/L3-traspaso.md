# L3 — traspaso a una sesión nueva

Estado al 4/10/2026. L0–L2 están en producción (PRs #28, #29, #30). L3 = la entrada en 12 idiomas, dividida en tres PRs.
Decisiones tomadas por el dueño: **12 idiomas desde el día uno** y **Resend** para los mails (tiene un plan pago en otra
web; se agrega el dominio `mycen.id` a esa misma cuenta).

## L3a — landing en 12 idiomas ✅

Todas las secciones salen de `src/i18n/app/landing/` (12 idiomas), con selector, `?lang=xx`, título y descripción por
idioma, RTL en árabe, `hreflang` + canónica (se agregan desde `useLandingLocale`, sólo en la landing: en `index.html`
aparecerían también en los perfiles). Se sacaron la banda de marcas y los testimonios de ejemplo; el teléfono del hero
muestra una identidad de ejemplo. E2E en `tests/e2e/landing.spec.ts` (inglés, árabe, selector, axe).

Pendiente del dueño: mail de contacto (el viejo `contacto@menulife.digital` se sacó del pie) y moneda de los precios
("$70 / $150").

## L3b — registro, login y contraseñas ✅

Namespace `src/i18n/app/auth/` (12 idiomas), selector de idioma y RTL en login, registro y recuperar contraseña; errores de
Supabase traducidos; `user_metadata.locale` al registrarse y al cambiar el idioma en Ajustes. E2E en `tests/e2e/auth.spec.ts`.

## L3c — mails con Resend ✅ (código) · pasos del dueño pendientes

Plantillas (confirmar cuenta, recuperar contraseña, enlace mágico, cambio de email, reautenticación) en los 12 idiomas
en `supabase/templates/`, generadas por `scripts/build-email-templates.mjs` y probadas con el motor de plantillas de Go
(con y sin `locale`). Pasos para Resend y Supabase (dominio, API key, SMTP, plantillas, límites): `supabase/templates/LEEME.md`.
