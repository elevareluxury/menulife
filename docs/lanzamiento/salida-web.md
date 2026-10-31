# Salida de la web al mundo: lo que hace el dueño

Todo lo de código ya está hecho. Esto es lo que necesita tu cuenta: planes, claves, DNS y pruebas finales. Está en
orden: cada bloque supone el anterior. Tiempo total: unas 3 horas, más la espera del DNS.

Regla de oro: **las claves secretas (Secret Key, API key, contraseñas) se pegan directo en el panel que las pide**.
No las mandes por chat ni las guardes en el repo.

---

## Bloque 1 · Supabase (30 min)

### 1.1 Plan Pro
1. supabase.com → tu organización → **Billing** → **Upgrade to Pro**.
2. Confirmá que el proyecto de Mycen quedó en Pro (Project Settings → General → "Pro").

### 1.2 Copias de seguridad
1. Database → **Backups**: tiene que decir "Daily backups" con la fecha de la última copia (llega al día siguiente).
2. Opcional (pago aparte): **Point in Time Recovery**, para volver a cualquier minuto de los últimos días.

### 1.3 Cuentas y contraseñas
Authentication → **Sign In / Providers** → **Email**:
- **Confirm email**: prendido.
- **Secure email change**: prendido.
- **Secure password change**: prendido.
- **Minimum password length**: `8`.
- **Password requirements**: "Letters and digits" (es la misma regla que pide la app).
- **Prevent use of leaked passwords**: prendido.
- **Save**.

### 1.4 Direcciones de la web
Authentication → **URL Configuration**:
- **Site URL**: `https://mycen.id`
- **Redirect URLs**: que estén estas dos (botón **Add URL**):
  - `https://mycen.id/auth/callback`
  - `https://mycen.id/**`
- **Save**.

### 1.5 Límites de mails
Authentication → **Rate Limits** → "Rate limit for sending emails": `100` por hora (se cambia recién con el SMTP
propio del bloque 3; si no te deja, volvé después).

### 1.6 Conexión segura a la base
Database → **Settings** → **SSL Configuration** → **Enforce SSL on incoming connections**: prendido.

---

## Bloque 2 · Vercel (20 min)

### 2.1 Plan Pro
vercel.com → tu equipo → **Settings** → **Billing** → **Upgrade to Pro**.

### 2.2 Dominio
Proyecto **menulife** → **Settings** → **Domains**:
- `mycen.id` con el tilde verde ("Valid Configuration") y marcado como principal.
- `www.mycen.id` → **Edit** → "Redirect to mycen.id" (308). Así hay una sola dirección para Google.

### 2.3 Variables
Settings → **Environment Variables** (Production), que estén:
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ya están: la web anda).
- `VITE_TURNSTILE_SITE_KEY`: se suma en el bloque 5.

### 2.4 Firewall (límite de pedidos)
Los pasos completos están en `docs/lanzamiento/firewall-api.md`. En corto:
1. Proyecto → **Firewall** → **Configure** → **New Rule**, tres veces:

| Nombre | Si (Target Path) | Pedidos cada 60 s por IP | Al pasarse |
|---|---|---|---|
| `API portadas` | Starts with `/api/media-cover` | 30 | Log |
| `API vista previa` | Starts with `/api/og` | 600 | Log |
| `API general` | Starts with `/api/` **y** no empieza con `/api/og` **y** no empieza con `/api/media-cover` | 300 | Log |

2. **Review Changes** → **Publish**.
3. A los 2 o 3 días: Firewall → **Traffic**. Si no hay tráfico normal frenado, editá cada regla → "Too Many
   Requests (429)" → **Publish**.

---

## Bloque 3 · Mails (40 min + espera del DNS)

Hacen falta dos cosas distintas: **mandar** mails (Resend: confirmar cuenta, recuperar contraseña) y **recibir**
mails en `team@mycen.id` (soporte, legales).

### 3.1 Mandar: Resend
1. resend.com → **Domains** → **Add Domain** → `mycen.id`.
2. Resend te muestra 3 o 4 registros (MX y TXT en `send.mycen.id` y un TXT `resend._domainkey`). Cargalos en el panel
   de tu dominio (bloque 8, tabla de DNS) **tal cual** los muestra Resend.
3. Esperá a que diga **Verified** (minutos a unas horas) y tocá **Verify**.
4. **API Keys** → **Create API Key** → nombre `supabase`, permiso **Sending access**, dominio `mycen.id` → copiala.
5. En Supabase: Authentication → **Emails** → **SMTP Settings** → **Enable Custom SMTP**:
   - Sender email: `team@mycen.id` · Sender name: `Mycen`
   - Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: la API key del paso 4
   - **Save**.
6. Authentication → **Emails** → **Templates**: para cada una, pegá el **Subject** de `supabase/templates/asuntos.md`
   y el **Body** del archivo:

| Plantilla en Supabase | Archivo en `supabase/templates/` |
|---|---|
| Confirm signup | `confirmar_cuenta.html` |
| Reset Password | `recuperar_contrasena.html` |
| Magic Link | `enlace_magico.html` |
| Change Email Address | `cambio_de_email.html` |
| Reauthentication | `reautenticacion.html` |

7. Volvé al paso 1.5 (límite de 100 por hora).

### 3.2 Recibir: casilla `team@mycen.id`
Si todavía no recibe mails, la forma más simple y gratis es un **reenvío** a tu Gmail:
- **Si el DNS de mycen.id está en Cloudflare**: Cloudflare → tu dominio → **Email** → **Email Routing** → **Get
  started** → dirección `team` → destino tu Gmail → Cloudflare carga solo los registros MX y TXT.
- **Si no**: improvmx.com (gratis) → dominio `mycen.id` → alias `team` → tu Gmail, y cargá los 2 MX y el TXT que te muestra.

Para contestar *como* `team@mycen.id` desde Gmail: Gmail → Configuración → **Cuentas** → "Enviar como" → agregar
`team@mycen.id` con el servidor `smtp.resend.com`, puerto 465, usuario `resend` y una API key de Resend nueva.

### 3.3 Que los mails no caigan en spam
Un registro TXT `_dmarc` con `v=DMARC1; p=none; rua=mailto:team@mycen.id` (bloque 8). A las 2 semanas, si no hay
problemas, cambiá `p=none` por `p=quarantine`.

### 3.4 Probar
1. En una ventana privada: `https://mycen.id/register` → elegí **English** en el selector de idioma → creá una cuenta con
   un Gmail tuyo.
2. El mail tiene que llegar **en inglés**, desde `team@mycen.id`, a la bandeja de entrada (no a spam), con la huella.
3. Tocá el botón: tiene que abrir Mycen con la cuenta confirmada.
4. `https://mycen.id/forgot-password` con el mismo mail: tiene que llegar el de recuperar contraseña y funcionar.
5. Si podés, repetí con una cuenta de iCloud (Apple Mail) o de Outlook.
6. Mandá un mail desde otra cuenta a `team@mycen.id`: tiene que llegarte.

---

## Bloque 4 · Entrar con Google en producción (15 min)

console.cloud.google.com → el proyecto donde creaste el acceso de Google → **Google Auth Platform**:
1. **Branding**:
   - App name: `Mycen` · User support email: el tuyo · Logo: `public/web-app-manifest-512x512.png` del repo.
   - Application home page: `https://mycen.id` · Privacy policy: `https://mycen.id/privacidad` · Terms of service:
     `https://mycen.id/terminos`.
   - Authorized domains: `mycen.id` (y el de Supabase, `<tu-proyecto>.supabase.co`, si te lo pide).
   - Developer contact: `team@mycen.id` → **Save**.
2. **Data Access**: sólo `openid`, `.../auth/userinfo.email` y `.../auth/userinfo.profile` (no sumes otros: con
   estos no hace falta la revisión larga de Google).
3. **Audience** → **Publish app** → confirmar. Tiene que decir "In production".
4. Probá: ventana privada → `https://mycen.id/login` → "Continuar con Google" con una cuenta que nunca usaste en
   Mycen. Tiene que pedir aceptar los términos ("Un paso más") y entrar.

---

## Bloque 5 · CAPTCHA contra cuentas falsas (20 min)

Como todavía no hay app en las tiendas, se prende completo. Pasos detallados en `docs/lanzamiento/captcha.md`.
1. dash.cloudflare.com → **Turnstile** → **Add widget** → nombre `Mycen`, dominios `mycen.id` y `www.mycen.id`,
   modo **Managed** → **Create**. Te da **Site Key** y **Secret Key**.
2. Vercel → Settings → Environment Variables → **Add**: `VITE_TURNSTILE_SITE_KEY` = la **Site Key** (Production).
3. Vercel → **Deployments** → el último de Production → **⋯** → **Redeploy** (sin esto no toma la clave).
4. Abrí `https://mycen.id/register`: tiene que aparecer el recuadro de Cloudflare y ponerse verde solo.
5. Recién ahí: Supabase → Authentication → **Attack Protection** → **Enable CAPTCHA protection** → proveedor
   **Turnstile** → pegá la **Secret Key** → **Save**.
6. Probá crear una cuenta, entrar y "¿Olvidaste tu contraseña?".

Si algo falla: apagá el CAPTCHA en Supabase (paso 5) y todo vuelve a andar al instante.

---

## Bloque 6 · Google Search Console y Bing (15 min + 1 o 2 días)

1. search.google.com/search-console → **Agregar propiedad** → **Dominio** → `mycen.id` → **Continuar**.
2. Copiá el registro TXT (`google-site-verification=…`) y cargalo en el DNS (bloque 8). Volvé y tocá **Verificar**
   (si falla, esperá 30 minutos y reintentá).
3. Menú izquierdo → **Sitemaps** → escribí `sitemap.xml` → **Enviar**. En 1 o 2 días: estado "Correcto".
   (El mapa ya lista la landing en los 12 idiomas, las páginas legales y cada perfil público.)
4. Arriba, en la barra de búsqueda: `https://mycen.id/` → **Solicitar indexación**. Repetí con
   `https://mycen.id/?lang=en` y `https://mycen.id/?lang=pt`.
5. bing.com/webmasters → **Importar desde Google Search Console** → elegí `mycen.id`. Con eso también aparece en Bing,
   DuckDuckGo y Yahoo.

---

## Bloque 7 · Monitor de caídas (10 min)

Para enterarte vos antes que tus usuarios si algo se cae. uptimerobot.com (gratis):
1. **New monitor** → tipo **Keyword** → URL `https://mycen.id/api/health` → keyword `"ok":true` → "alert when keyword
   **not exists**" → cada 5 minutos → avisos a tu mail (y a la app de UptimeRobot en el celular).
   `/api/health` responde OK sólo si la web **y** la base andan.
2. **New monitor** → tipo **HTTP(s)** → `https://mycen.id/` → cada 5 minutos.
3. Opcional: **Status page** pública (ej. `estado.mycen.id`) para que la gente vea si hay un problema.

---

## Bloque 8 · DNS de mycen.id (todo junto)

En el panel donde está el dominio (donde lo compraste, o Cloudflare si lo pasaste ahí). Los valores exactos los dan
los servicios; esta es la lista de lo que tiene que quedar:

| Para qué | Tipo | Nombre | Valor (de dónde sale) |
|---|---|---|---|
| Web (ya está) | A / CNAME | `@` y `www` | los de Vercel (no tocar) |
| Resend: rebotes | MX | `send` | el que muestra Resend |
| Resend: SPF | TXT | `send` | `v=spf1 include:amazonses.com ~all` (el que muestra Resend) |
| Resend: firma | TXT | `resend._domainkey` | el que muestra Resend |
| Anti-spam | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:team@mycen.id` |
| Recibir mails | MX (2) y TXT | `@` | los de Cloudflare Email Routing o ImprovMX |
| Google | TXT | `@` | `google-site-verification=…` (Search Console) |

Ojo: no borres ni cambies los registros de Vercel.

---

## Bloque 9 · Verificación en dos pasos (15 min)

Prendela en cada cuenta (con una app como Google Authenticator, o una llave): **GitHub, Vercel, Supabase,
Cloudflare, Resend, Google (la cuenta de Google Cloud), UptimeRobot y el panel del dominio**. Guardá los códigos de
recuperación en un lugar seguro (no en el mail).

Si alguien más tiene acceso a alguna de estas cuentas, revisá que siga necesitándolo.

---

## Bloque 10 · Legal (en paralelo)

- Lo ideal es la revisión de un abogado antes de abrir (los textos son buenos, pero no tienen esa revisión). Qué
  mandarle y qué preguntarle está en el mensaje que te pasó Claude (7 preguntas). Cuando devuelva cambios, pasáselos a
  Claude y los aplica en los 12 idiomas.
- Si abrís antes: decidí al menos quién figura como responsable (hoy dice "Resilio", Argentina) y que
  `team@mycen.id` reciba mails (bloque 3.2): es el contacto que piden las leyes de datos personales.

---

## Bloque 11 · Prueba final en producción (20 min, el día de salida)

Con el celular, en `https://mycen.id`, en ventana privada:
1. La landing carga en tu idioma; cambiá a English y a العربية (se da vuelta, de derecha a izquierda).
2. "Elegí tu nombre" → un nombre libre → registro con mail → llega el mail → confirmás → onboarding completo →
   "Publicar perfil".
3. Abrí tu perfil desde otro celular sin sesión. Compartilo por WhatsApp: tiene que verse la tarjeta con la huella.
4. En Studio: agregá un link, una foto y un video, publicá y miralo en el perfil.
5. Life OS: creá una tarea, un hábito y un gasto.
6. Salí, entrá con Google, salí, "¿Olvidaste tu contraseña?".
7. `https://mycen.id/sitemap.xml` y `https://mycen.id/api/health` abren bien.
8. Panel del equipo → **Errores**: sin errores nuevos.

Si todo anda, decile a Claude **"congelá la v1.0.0"** (etiqueta la versión en GitHub y crea `release/v1`).

---

## Después de abrir

- **Primera semana**: mirar todos los días el panel → Errores, Denuncias y Producto, y el mail de UptimeRobot.
- **A los 2 o 3 días**: pasar las reglas del Firewall a 429 (bloque 2.4).
- **A las 2 semanas**: DMARC a `p=quarantine` (bloque 3.3) y revisar Search Console → Páginas (qué se indexó).
- **Cada 6 meses**: si prendés "Entrar con Apple", su secreto vence (anotalo en el calendario).
