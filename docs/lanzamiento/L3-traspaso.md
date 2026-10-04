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

## L3c — mails con Resend

1. Resend → Domains → Add `mycen.id` → cargar los registros DNS (SPF, DKIM y el MX de rebote) → Verify.
2. Resend → API Keys → crear una con permiso "Sending access" limitada a `mycen.id`.
3. Supabase → Authentication → Emails → SMTP Settings: host `smtp.resend.com`, puerto `465`, usuario `resend`,
   contraseña = la API key, remitente `hola@mycen.id` (o el que elija el dueño), nombre "Mycen".
4. Plantillas (confirmar cuenta, recuperar contraseña, cambio de mail, magic link) en los 12 idiomas con
   `{{ if eq .Data.locale "en" }}…{{ end }}` sobre el idioma guardado en L3b; dejarlas en `supabase/templates/` para pegar.
5. Subir el límite de mails por hora en Supabase → Authentication → Rate Limits.
