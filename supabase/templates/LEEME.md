# Mails de Mycen (Supabase Auth + Resend)

Plantillas en los 12 idiomas, generadas por `node scripts/build-email-templates.mjs` (editar el script, no los `.html`;
`npm test` avisa si quedaron desincronizados). Cada mail elige el idioma con `user_metadata.locale`, que guarda el
registro y se actualiza al cambiar el idioma en Ajustes. Sin `locale` (cuentas viejas), van en español.

## 1. Resend (la cuenta que ya tenés sirve)
1. Resend → **Domains** → **Add domain** → `mycen.id` (región: la más cercana a tus usuarios).
2. Cargá en el DNS de `mycen.id` los registros que muestra Resend (SPF/MX de rebote en `send.mycen.id` y DKIM
   `resend._domainkey`). Sumá también un DMARC si no tenés: `TXT _dmarc` → `v=DMARC1; p=none;`.
3. **Verify** y esperá a que el dominio quede en "Verified".
4. Resend → **API Keys** → **Create** → permiso **Sending access**, dominio **mycen.id**. Copiala y pegala directo
   en Supabase (no la mandes por chat ni la guardes en el repo).

## 2. Supabase → Authentication → Emails → SMTP Settings
- Enable custom SMTP: sí
- Sender email: `team@mycen.id` · Sender name: `Mycen`
- Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: la API key de Resend
- Guardar.

## 3. Supabase → Authentication → Emails → Templates
Para cada plantilla, pegá el **Subject** de `asuntos.md` y el **Body** del archivo:

| Plantilla en Supabase | Archivo |
|---|---|
| Confirm signup | `confirmar_cuenta.html` |
| Reset Password | `recuperar_contrasena.html` |
| Magic Link | `enlace_magico.html` |
| Change Email Address | `cambio_de_email.html` |
| Reauthentication | `reautenticacion.html` |

## 4. Supabase → Authentication → Rate Limits
Con SMTP propio se puede subir "Rate limit for sending emails" (por defecto es muy bajo). Un valor razonable para el
lanzamiento: 100 por hora; subilo según el plan de Resend.

## 5. Probar
Registrate con un mail tuyo eligiendo otro idioma en `/register` (ej. English): el mail de confirmación tiene que llegar
en inglés, desde `team@mycen.id`. Después probá "¿Olvidaste tu contraseña?".

## Diseño (V1 · etapa 13)
Paleta Amanecer (fondo claro: los fondos oscuros fallan en muchos clientes de correo) y la huella de Mycen como imagen
desde `https://mycen.id/email/huella.png` (`public/email/huella.png`, generada con
`scripts/landing-shots/brand.spec.ts`). Antes de abrir al público, mandar un mail de prueba y mirarlo en Gmail (web y
app) y Apple Mail.
