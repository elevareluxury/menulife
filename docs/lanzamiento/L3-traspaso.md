# L3 — traspaso a una sesión nueva

Estado al 4/10/2026. L0–L2 están en producción (PRs #28, #29, #30). L3 = la entrada en 12 idiomas, dividida en tres PRs.
Decisiones tomadas por el dueño: **12 idiomas desde el día uno** y **Resend** para los mails (tiene un plan pago en otra
web; se agrega el dominio `mycen.id` a esa misma cuenta).

## L3a — landing en 12 idiomas (en curso en esta rama)

Hecho:
- `src/i18n/app/landing/es.ts`: diccionario fuente completo (meta, nav, hero, teléfono de ejemplo, problema, solución,
  Life OS, Business, testimonios, precios, visión, CTA, FAQ, pie). Ya corrige textos viejos ("Hub Digital",
  `mycen.digital`, "Ver demo" que iba al registro, FAQ desactualizada).
- `src/i18n/app/landing/index.ts`: namespace `useLandingT` (todavía sin loaders de otros idiomas).
- `src/components/landing/Navbar.tsx`: usa el diccionario, selector de los 12 idiomas (`setLocalLanguage`) y anclas
  arregladas (`#soluciones`, `#pricing`; antes apuntaban a ids que no existen).

Falta:
1. Pasar al diccionario el resto de las secciones que usa `LandingPage`: CinematicHero (+ HubPhonePreview, que debe
   mostrar el ejemplo de persona del diccionario en vez de un restaurante), Fragmentation, Solution, LifeOS, Business,
   Testimonials, Pricing, Vision, FinalCTA (el secundario va a `/login`), FAQ (agregar `id="faq"`) y Footer (links a
   `/terminos` y `/privacidad`; el mail `contacto@menulife.digital` es de la marca vieja: preguntar cuál usar).
2. **Prueba social inventada** (regla de CLAUDE.md): sacar `TrustBand` (lista fija de negocios) de la landing y quitar los
   3 testimonios de respaldo de `TestimonialsSection` (mostrar sólo los reales de la tabla `testimonials`; si no hay,
   ocultar la sección). El pie viejo de i18next dice "Más de 1.200 negocios": no usarlo.
3. Escribir `en, pt, fr, de, it, zh, ja, ko, hi, ar, ru` (`const xx: LandingDict = …`) y sumar sus loaders en `index.ts`.
4. `?lang=xx` en la landing (fija el idioma) + `<link rel="alternate" hreflang>` en `index.html` (12 + `x-default`),
   título y descripción por idioma (`meta`), `dir="rtl"` para árabe.
5. Precios: dicen "$70 / $150" sin moneda; preguntar si son USD.
6. Tests: E2E de la landing en otro idioma (ej. `/?lang=en`), axe de la landing, presupuesto de peso.

## L3b — registro, login y contraseñas

`src/app/routes/{login,register}.tsx`, `src/modules/auth/components/{LoginForm,RegisterForm}.tsx`,
`src/pages/{ForgotPassword,ResetPassword,AuthCallback}.tsx` tienen el español escrito en el código. Crear namespace
`src/i18n/app/auth/` (12 idiomas) y guardar el idioma en `options.data.locale` al registrarse (lo usan los mails).

## L3c — mails con Resend

1. Resend → Domains → Add `mycen.id` → cargar los registros DNS (SPF, DKIM y el MX de rebote) → Verify.
2. Resend → API Keys → crear una con permiso "Sending access" limitada a `mycen.id`.
3. Supabase → Authentication → Emails → SMTP Settings: host `smtp.resend.com`, puerto `465`, usuario `resend`,
   contraseña = la API key, remitente `hola@mycen.id` (o el que elija el dueño), nombre "Mycen".
4. Plantillas (confirmar cuenta, recuperar contraseña, cambio de mail, magic link) en los 12 idiomas con
   `{{ if eq .Data.locale "en" }}…{{ end }}` sobre el idioma guardado en L3b; dejarlas en `supabase/templates/` para pegar.
5. Subir el límite de mails por hora en Supabase → Authentication → Rate Limits.
