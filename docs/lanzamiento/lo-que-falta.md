# Lo que falta del dueño, en orden

Estado al 27/11/2026. Esta es **la lista de lo que te toca a vos** antes y después de abrir Mycen al público. El
código ya está hecho: lo que queda son cuentas, paneles, claves, DNS, pruebas y temas legales. Junta en un solo lugar lo
que estaba repartido en varios documentos; cada paso dice dónde está el detalle.

**Cómo usarla**
- Andá en orden, de arriba hacia abajo. Cada paso supone que hiciste los anteriores.
- Cuando termines uno, cambiá `- [ ]` por `- [x]` (en GitHub: el lápiz de "Edit", o pedíselo a Claude).
- Cada paso tiene: **Qué es**, **Pasos**, **Cómo sé que anduvo** y **Detalle** (el documento largo).
- **⚠️ A confirmar** = los documentos no coinciden o no lo dicen claro. Preguntale a Claude antes de hacerlo.

**Regla de oro:** las claves secretas (Secret Key, API key, contraseñas, llaves) se pegan **directo en el panel que las
pide**. Nunca por chat, por mail ni en el repo. En esta lista no hay ninguna clave real, sólo sus nombres.

Palabras que aparecen mucho:
- **Supabase**: donde vive la base de datos y las cuentas. **Vercel**: donde está publicada la web.
- **Variable de entorno**: un dato (por ejemplo una clave pública) que la web lee al construirse. Se carga en Vercel.
- **Redeploy**: volver a publicar la web para que tome un cambio. Vercel → Deployments → el último → ⋯ → Redeploy.
- **SQL Editor**: la pantalla de Supabase donde se pega y se corre código de la base (Supabase → SQL Editor).
- **Secreto de GitHub**: una clave guardada en el repo de GitHub para que las tareas automáticas la usen sin verla nadie.
- **DNS**: la "guía telefónica" del dominio `mycen.id`; se edita en el panel donde compraste el dominio (o Cloudflare).

---

## 1. Antes de abrir al público

### Base de datos (Supabase)

- [ ] **Todas las migraciones aplicadas**
  - Qué es: cada cambio de la base es un archivo en `supabase/migrations/`; si falta uno, algo de la app no anda.
  - Pasos: Supabase → **SQL Editor** → pegá `docs/lanzamiento/sql/check_migraciones.sql` → **Run**.
    Si alguna dice `FALTA`, pegá ese archivo de `supabase/migrations/` (en orden de fecha) y volvé a correr el chequeo.
  - Cómo sé que anduvo: todas las filas dicen `OK`.
  - El chequeo está al día hasta `20261209000001` (27/11/2026; la última, de los avisos push, es nueva). Las anteriores de noviembre y diciembre ya las aplicaste una por
    una; correrlo una vez confirma que no quedó ninguna vieja.
  - Detalle: [`sql/check_migraciones.sql`](sql/check_migraciones.sql)

- [x] **Plan Pro y copias diarias** — hecho (con límite de gasto)
  - Qué es: el plan gratis no tiene copias de seguridad diarias ni algunas protecciones; con gente real hace falta Pro.
  - Pasos: supabase.com → tu organización → **Billing** → **Upgrade to Pro**. Después Database → **Backups**.
    Opcional (pago aparte): **Point in Time Recovery** (volver a cualquier minuto de los últimos días).
  - Cómo sé que anduvo: Project Settings → General dice "Pro"; Backups dice "Daily backups" con la fecha de ayer.
  - Detalle: [`salida-web.md`](salida-web.md), bloque 1.1 y 1.2

- [x] **Reglas de contraseñas y "contraseñas filtradas"** — hecho
  - Qué es: que la base exija contraseñas decentes y rechace las que ya se filtraron en internet.
  - Pasos: Authentication → **Sign In / Providers** → **Email**: Confirm email, Secure email change y Secure password
    change prendidos; Minimum password length `8`; Password requirements "Letters and digits"; **Prevent use of leaked
    passwords** prendido → **Save**.
  - Cómo sé que anduvo: al registrarte con una contraseña tipo `password123`, la app dice que es débil.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 1.3 · [`../seguridad/auditoria-lanzamiento.md`](../seguridad/auditoria-lanzamiento.md)

- [x] **Direcciones de la web y conexión segura** — hecho (27/11/2026)
  - Qué es: Supabase arma los links de los mails con esto; si está mal, el botón del mail no abre Mycen.
  - Pasos: Authentication → **URL Configuration** → Site URL `https://mycen.id`; Redirect URLs con
    `https://mycen.id/auth/callback` y `https://mycen.id/**` → Save. Después Database → **Settings** →
    **SSL Configuration** → **Enforce SSL on incoming connections** prendido.
  - Cómo sé que anduvo: las dos direcciones aparecen en la lista y el interruptor de SSL queda prendido.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 1.4 y 1.6

- [x] **pg_cron prendido (tareas automáticas de la base)** — hecho
  - Qué es: pg_cron corre cosas solas: borrar datos vencidos (`mycen-purge-expired`, todos los días), limpiar contadores
    (`mycen-rate-hits-purge`, cada hora) y calcular los números del panel (`mycen-admin-snapshots`, cada hora).
  - Pasos: Supabase → Database → **Extensions** → buscá `pg_cron` → prendelo. Si lo prendés recién ahora, pedile a
    Claude qué migraciones volver a correr para que se agenden las tareas.
  - Cómo sé que anduvo: Super-admin → **Estado** muestra las tareas programadas con su última corrida.
  - Detalle: [`panel-escala.md`](panel-escala.md) punto 4 · [`../seguridad/sgsi/05-retencion.md`](../seguridad/sgsi/05-retencion.md)

- [ ] **Advisors de Supabase sin rojos**
  - Qué es: Supabase revisa solo la seguridad de la base y marca problemas.
  - Pasos: Supabase → **Advisors** → **Security** → correrlo y mirar lo que marque.
  - Cómo sé que anduvo: no quedan avisos en rojo (o Claude te explicó cada uno). Super-admin → Estado → autochequeo de
    seguridad en verde.
  - Si marca "Extension in public" por `pg_trgm` (la usa la búsqueda de Personas): SQL Editor →
    `alter extension pg_trgm set schema extensions;` → Run. Es seguro: los índices siguen andando y las funciones de
    Mycen ya buscan en `extensions`. Después volvé a correr Advisors. (`pg_trgm` movido el 27/11/2026.)
  - Detalle: [`../seguridad/auditoria-lanzamiento.md`](../seguridad/auditoria-lanzamiento.md)

- [x] **Apagar `pg_graphql`** — hecho (27/11/2026)
  - Qué es: otra puerta para leer la base (GraphQL). Mycen no la usa (todo va por la API REST con sus permisos), así
    que apagarla achica lo que queda expuesto.
  - Pasos: Supabase → Database → **Extensions** → buscá `pg_graphql` → apagala → confirmá.
  - Cómo sé que anduvo: la extensión figura apagada y la app (perfil, Studio, Life OS) sigue andando igual.

- [x] **Borrar las funciones viejas de Business** — hecho (en Edge Functions quedan sólo `life-reminders` y `quarantine-held-files`)
  - Qué es: dos funciones viejas (`import-menu-pdf`, `send-reservation-email`) no controlan quién las llama.
  - Pasos: Supabase → **Edge Functions** → cada una → borrar. Si se borra `import-menu-pdf`, Anthropic deja de ser
    proveedor (pedile a Claude que actualice privacidad).
  - Cómo sé que anduvo: ya no aparecen en Edge Functions.
  - Detalle: [`../seguridad/sgsi/02-riesgos.md`](../seguridad/sgsi/02-riesgos.md) R-09

- [x] **Publicar la función de evidencia privada** — hecho
  - Qué es: la que saca de los links públicos las fotos de una cuenta denunciada por abuso infantil.
  - Pasos: en una terminal con el proyecto: `supabase functions deploy quarantine-held-files` (Claude te puede guiar).
  - Cómo sé que anduvo: Supabase → Edge Functions muestra `quarantine-held-files`.
  - Detalle: [`../seguridad/sgsi/06-operacion.md`](../seguridad/sgsi/06-operacion.md) · [`../seguridad/csam.md`](../seguridad/csam.md)

- [ ] **Limpiar los perfiles de prueba**
  - Qué es: que los perfiles de prueba no salgan en Google ni en el sitemap.
  - Pasos: SQL Editor → `docs/lanzamiento/sql/limpiar-perfiles-prueba.sql`: primero sólo el PASO 1 (sólo lee), revisá
    la lista, después el PASO 2 (termina en ROLLBACK; si está bien, cambiás a COMMIT).
  - Cómo sé que anduvo: `https://mycen.id/sitemap.xml` ya no lista esos perfiles.
  - Detalle: [`sql/limpiar-perfiles-prueba.sql`](sql/limpiar-perfiles-prueba.sql)

### Web (Vercel)

- [ ] **Plan Pro y dominio**
  - Qué es: Pro da el firewall y más margen; el dominio tiene que tener una sola dirección para Google.
  - Pasos: vercel.com → tu equipo → Settings → Billing → **Upgrade to Pro**. Proyecto **menulife** → Settings →
    **Domains**: `mycen.id` principal y `www.mycen.id` → Edit → "Redirect to mycen.id" (308).
  - Cómo sé que anduvo: `mycen.id` con tilde verde ("Valid Configuration"); abrir `www.mycen.id` te lleva a `mycen.id`.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 2

- [x] **Firewall de `/api` (en modo "sólo registrar")** — hecho
  - Qué es: frena a quien pide miles de veces las funciones de Mycen (ahorra plata y evita caídas).
  - Pasos: proyecto → **Firewall** → **Configure** → **New Rule**, tres reglas por IP cada 60 s, al pasarse **Log**:
    `API portadas` (Target Path empieza con `/api/media-cover`, 30), `API vista previa` (`/api/og`, 600) y
    `API general` (`/api/`, sin `/api/og` ni `/api/media-cover`, 300) → **Review Changes** → **Publish**.
  - Cómo sé que anduvo: las tres reglas aparecen activas; en Firewall → **Traffic** se ven pedidos contados.
  - Detalle: [`firewall-api.md`](firewall-api.md) (pasos en el panel y por línea de comandos)

- [ ] **HSTS preload** — decidido: se hace (27/11/2026)
  - Qué es: anotar `mycen.id` en la lista que traen adentro Chrome, Firefox, Safari y Edge, para que **nunca** lo abran
    sin candado, ni siquiera la primera vez. La web ya manda la cabecera que pide la lista en todas las respuestas
    (páginas, `/api`, calendario y sitemap): `max-age=63072000; includeSubDomains; preload` (`vercel.json`, lo verifica
    `tests/unit/securityWeb.test.ts`).
  - Qué queda obligado: `mycen.id` y **todos** sus subdominios, sólo con HTTPS. Revisado en el repo y los documentos:
    - `www.mycen.id` (Vercel): anda con HTTPS y redirige a `mycen.id`. ✔
    - `send.mycen.id`, `resend._domainkey`, `_dmarc`, los MX de recibir mails y el TXT de Google: son sólo registros
      de DNS para mails y verificación, no se abren en un navegador. No les pasa nada. ✔
    - Copias en Cloudflare R2 y Supabase: usan dominios de ellos (`cloudflarestorage.com`, `supabase.co`). No les pasa
      nada. ✔
    - Ojo a futuro: una página de estado en `estado.mycen.id` (UptimeRobot) u otro subdominio nuevo **tiene que andar con
      HTTPS** (con candado) desde el primer día, o no va a abrir. Lo mismo si prendés el "seguimiento de clicks" de
      Resend con un subdominio propio: sólo con HTTPS. Si dudás, preguntale a Claude antes de crear el subdominio.
  - Pasos (en este orden):
    1. Hacé antes el paso **Plan Pro y dominio** de arriba: en Vercel → proyecto **menulife** → Settings → **Domains**,
       `mycen.id` y `www.mycen.id` con tilde verde ("Valid Configuration") y `www.mycen.id` en "Redirect to mycen.id".
    2. Probá en el navegador: `http://mycen.id` (sin la s) tiene que cambiar solo a `https://mycen.id`, y
       `http://www.mycen.id` tiene que terminar en `https://mycen.id` con candado.
    3. Entrá a **hstspreload.org**, escribí `mycen.id` en el recuadro y tocá **Check HSTS preload status and
       eligibility**.
    4. Leé el resultado: tiene que decir que el dominio es elegible (todo en verde). Si muestra un error o una
       advertencia, no sigas: copiá el texto tal cual y pasáselo a Claude.
    5. Si está todo bien, aparece el formulario: tildá las dos casillas (que sos el dueño y que entendés que todos los
       subdominios quedan sólo con HTTPS) y tocá **Submit**.
    6. Volvé a hstspreload.org en unos días y chequeá `mycen.id`: va a decir "pending" y después "preloaded".
  - Cuánto tarda: llegar a los navegadores lleva **semanas o meses** (sale con las versiones nuevas de cada uno). Mientras
    tanto todo sigue andando igual: la cabecera ya protege a quien entró una vez.
  - Si algún día hay que sacarlo: en hstspreload.org está **Removal** (hstspreload.org/removal), pero antes hay que sacar
    `preload` de la cabecera en `vercel.json` (pedíselo a Claude) y salir de la lista también tarda semanas o meses, y
    los navegadores viejos lo siguen recordando. Por eso: nunca crear un subdominio sin HTTPS.
  - Cómo sé que anduvo: hstspreload.org muestra `mycen.id` como "preloaded" (o "pending" mientras tanto).

### Mails

- [ ] **Resend: dominio verificado**
  - Qué es: el servicio que manda los mails de confirmar cuenta y recuperar contraseña desde `team@mycen.id`.
  - Pasos: resend.com → **Domains** → **Add Domain** → `mycen.id` → cargá en el DNS los registros que muestra (MX y TXT
    en `send`, TXT `resend._domainkey`) tal cual → **Verify**.
  - Cómo sé que anduvo: el dominio dice **Verified**.
  - Detalle: [`../../supabase/templates/LEEME.md`](../../supabase/templates/LEEME.md) · [`salida-web.md`](salida-web.md) bloque 3.1 y 8

- [ ] **SMTP propio en Supabase y límite de mails**
  - Qué es: sin esto Supabase usa su correo de prueba, que deja de mandar con poco tráfico.
  - Pasos: Resend → **API Keys** → **Create API Key** (nombre `supabase`, **Sending access**, dominio `mycen.id`).
    Supabase → Authentication → **Emails** → **SMTP Settings** → **Enable Custom SMTP**: Sender `team@mycen.id`,
    nombre `Mycen`, Host `smtp.resend.com`, Port `465`, Username `resend`, Password = la API key → Save. Después
    Authentication → **Rate Limits** → "Rate limit for sending emails" = `100` por hora.
  - Cómo sé que anduvo: la prueba de mails de más abajo llega desde `team@mycen.id`.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 3.1 y 1.5

- [ ] **Plantillas de los mails (12 idiomas)**
  - Qué es: los mails con la marca de Mycen y en el idioma de cada persona.
  - Pasos: Authentication → **Emails** → **Templates**. En cada una, el **Subject** de `supabase/templates/asuntos.md`
    y el **Body** del archivo: Confirm signup = `confirmar_cuenta.html`, Reset Password = `recuperar_contrasena.html`,
    Magic Link = `enlace_magico.html`, Change Email Address = `cambio_de_email.html`, Reauthentication =
    `reautenticacion.html`. Antes, revisá que Site URL sea `https://mycen.id`.
  - Cómo sé que anduvo: el mail de prueba llega con la huella y en el idioma elegido.
  - Detalle: [`../../supabase/templates/LEEME.md`](../../supabase/templates/LEEME.md) punto 3

- [ ] **Recibir mails en `team@mycen.id` y anti-spam**
  - Qué es: es el contacto que piden las leyes y las tiendas; tiene que llegarte lo que te escriban.
  - Pasos: con el DNS en Cloudflare: tu dominio → **Email** → **Email Routing** → **Get started** → dirección `team` →
    tu Gmail. Si no: improvmx.com → alias `team` → tu Gmail. Después un TXT `_dmarc` con
    `v=DMARC1; p=none; rua=mailto:team@mycen.id`.
  - Cómo sé que anduvo: mandás un mail desde otra casilla a `team@mycen.id` y te llega.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 3.2, 3.3 y 8

- [ ] **Probar los mails de punta a punta**
  - Pasos: ventana privada → `https://mycen.id/register` → idioma **English** → cuenta con un Gmail tuyo. Después
    `https://mycen.id/forgot-password`. Repetí con iCloud u Outlook si podés.
  - Cómo sé que anduvo: llega en inglés, desde `team@mycen.id`, en la bandeja de entrada (no spam), con la huella, y el
    botón abre Mycen con la cuenta confirmada. Se ve bien en Gmail (web y app) y Apple Mail.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 3.4

### Acceso a la cuenta

- [ ] **Entrar con Google en producción**
  - Qué es: que el botón "Continuar con Google" funcione para cualquiera, no sólo para cuentas de prueba.
  - Pasos: console.cloud.google.com → tu proyecto → **Google Auth Platform**. **Branding**: App name `Mycen`, logo
    `public/web-app-manifest-512x512.png`, home `https://mycen.id`, privacidad `https://mycen.id/privacidad`, términos
    `https://mycen.id/terminos`, dominio `mycen.id`, contacto `team@mycen.id` → Save. **Data Access**: sólo `openid`,
    `userinfo.email` y `userinfo.profile`. **Audience** → **Publish app**.
  - Cómo sé que anduvo: Audience dice "In production"; con una cuenta de Google nueva en `https://mycen.id/login` te
    pide "Un paso más" (aceptar términos) y entra.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 4

- [ ] **CAPTCHA contra cuentas falsas (Turnstile)** — en este orden, sin saltear
  - Qué es: un recuadro de Cloudflare que frena a los robots que crean cuentas en masa.
  - Pasos:
    1. dash.cloudflare.com → **Turnstile** → **Add widget**: nombre `Mycen`, dominios `mycen.id` y `www.mycen.id`, modo
       **Managed** → **Create**. Te da una **Site Key** (pública) y una **Secret Key** (secreta).
    2. Vercel → Settings → **Environment Variables** → `VITE_TURNSTILE_SITE_KEY` = la Site Key (Production).
    3. Vercel → **Redeploy** del último deploy de Production (sin esto no la toma).
    4. Abrí `https://mycen.id/register` y `/login`: tiene que aparecer el recuadro y ponerse verde solo.
    5. **Recién ahí**: Supabase → Authentication → **Attack Protection** → **Enable CAPTCHA protection** → **Turnstile**
       → pegá la Secret Key → Save.
  - Cómo sé que anduvo: podés crear una cuenta, entrar, pedir "¿Olvidaste tu contraseña?" y "Reenviar email".
  - Si algo falla: apagá el CAPTCHA en Supabase (paso 5) y todo vuelve a andar al instante.
  - ⚠️ Ojo con la app de las tiendas: en la app el recuadro no aparece. Con el paso 5 hecho, **en la app nadie puede
    entrar ni registrarse con email** (sí con Google o Apple). No hagas el paso 5 mientras haya una versión de la app en
    las tiendas o en revisión que dependa del email (ver la sección "Apps"). Hoy no hay app publicada.
  - Detalle: [`captcha.md`](captcha.md) · [`salida-web.md`](salida-web.md) bloque 5

### Seguridad de tus cuentas

- [ ] **Verificación en dos pasos en todos los paneles**
  - Qué es: aunque te roben la contraseña, nadie entra sin el código del celular.
  - Pasos: prendela (con Google Authenticator o una llave) en **GitHub, Vercel, Supabase, Cloudflare, Resend, Google
    (Google Cloud), UptimeRobot y el panel del dominio** (y Apple y Play Console cuando las tengas). Guardá los códigos
    de recuperación fuera del mail. En Mycen, cada super-admin activa el segundo paso cuando el panel `/super-admin` lo
    pide (es obligatorio).
  - Cómo sé que anduvo: cada panel te pide el código al entrar; el panel del equipo abre después de escribir el código.
  - Opcional: para usar huella o llave en vez de códigos, Supabase → Auth → **MFA** → prender WebAuthn.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 9 · [`../seguridad/sgsi/06-operacion.md`](../seguridad/sgsi/06-operacion.md)

- [ ] **GitHub: escaneo de secretos y protección de `main`**
  - Qué es: GitHub avisa (y frena) si alguien sube una clave por error, y nadie puede romper la rama principal.
  - Pasos: GitHub → el repo → Settings → **Code security** → prender "Secret scanning" y "Push protection". Settings →
    **Branches** → regla para `main`: exigir PR y el check `checks` en verde, bloquear force-push y borrado.
  - Cómo sé que anduvo: las dos opciones de Code security quedan "Enabled"; la regla aparece en Branches.
  - Detalle: [`../seguridad/sgsi/06-operacion.md`](../seguridad/sgsi/06-operacion.md) (Gestión de cambios)

### Avisos, monitoreo y copias

- [ ] **Avisos al equipo y revisión de links (GitHub Actions)**
  - Qué es: dos tareas que te mandan un mail si hay errores nuevos, denuncias, un pico de registros o links peligrosos
    en perfiles publicados.
  - Pasos:
    1. Supabase → SQL Editor: `select public.mycen_set_cron_key();` → devuelve una llave **una sola vez**: copiala
       directo al secreto `MYCEN_CRON_KEY` (paso 4).
    2. Resend → API Keys → Create (**Sending access**, dominio `mycen.id`) → para `RESEND_API_KEY`.
    3. Google Cloud → APIs y servicios → **Biblioteca** → "Web Risk API" → **Habilitar** (pide facturación; 100.000
       links por mes gratis) → **Credenciales** → **Clave de API** → restringirla a "Web Risk API" → para
       `WEB_RISK_API_KEY`.
    4. GitHub → el repo → Settings → Secrets and variables → **Actions** → pestaña **Secrets** → **New repository
       secret**: `SUPABASE_URL` (Supabase → Project Settings → API → Project URL), `SUPABASE_ANON_KEY` (anon / public),
       `MYCEN_CRON_KEY`, `RESEND_API_KEY`, `WEB_RISK_API_KEY` y, si querés otro destino que `team@mycen.id`,
       `ALERT_EMAIL`. Tienen que ser *Repository secrets* (no Variables, ni Environment, ni Codespaces).
  - Cómo sé que anduvo: GitHub → **Actions** → "Avisos al equipo" → **Run workflow** → dice "Todo en orden." Si dice
    "sin configurar (faltan …)", ese secreto no está donde corresponde. Lo mismo con "Revisión de links". En los días
    siguientes, las dos tareas aparecen en verde en Actions (pueden correr con horas de atraso: es normal en GitHub).
  - Detalle: [`alertas.md`](alertas.md)

- [x] **Monitor externo de caídas** — hecho
  - Qué es: te avisa al mail o al celular si la web o la base se caen, aunque nadie esté mirando.
  - Pasos: uptimerobot.com → **New monitor** → **Keyword monitoring** → URL `https://mycen.id/api/health` → Keyword
    `"ok":true` (con comillas) → **Start incident when keyword not exists** → avisos por mail (y Push) → **Create
    monitor**. Otro **HTTP(s)** a `https://mycen.id/` cada 5 minutos.
  - Cómo sé que anduvo: los dos monitores en verde ("Up").
  - Opcional: sumá uno a `/sitemap.xml` y otro a un perfil real (los sugiere `incidentes.md`).
  - Detalle: [`salida-web.md`](salida-web.md) bloque 7 · [`incidentes.md`](incidentes.md) "Cómo detectarlo"

- [ ] **Copia diaria de fotos y PDF (Cloudflare R2)**
  - Qué es: las copias de Supabase no incluyen las fotos ni los PDF; esto los copia todos los días a otro lugar.
  - Pasos: Cloudflare → **R2** → **Create bucket** `mycen-backup` (privado) → **Manage R2 API tokens** → token *Object
    Read & Write* sólo para ese bucket. Supabase → Storage → Settings → **S3 Connection** → Endpoint, Region y **New
    access key**. GitHub → Secrets → Actions: `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`,
    `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`,
    `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (= `mycen-backup`).
  - Cómo sé que anduvo: GitHub → Actions → "Copia diaria de archivos" → **Run workflow** termina en verde y en R2
    aparecen `current/profile-media` y `current/profile-files`.
  - Detalle: [`copia-archivos.md`](copia-archivos.md)

- [ ] **Probar que una copia se puede restaurar**
  - Qué es: una copia que nunca se probó puede no servir el día que hace falta.
  - Pasos: restaurar la copia más reciente de la base en un proyecto de Supabase **aparte**, abrir un perfil y una cuenta
    de prueba, anotar cuánto tardó en un issue de GitHub `restauracion-probada` y borrar el proyecto de prueba. Para
    fotos: restaurar una carpeta con rclone (comando en `copia-archivos.md`).
  - Cómo sé que anduvo: el perfil abre en el proyecto restaurado y quedó anotado.
  - Detalle: [`../seguridad/sgsi/06-operacion.md`](../seguridad/sgsi/06-operacion.md) (Copias y continuidad) · [`copia-archivos.md`](copia-archivos.md)

- [ ] **Avisos de Life OS con la app cerrada (Web Push)**
  - Qué es: que los recordatorios de tareas y hábitos lleguen con la web instalada cerrada.
  - Sin terminal. Pasos (detalle click por click en el documento):
    1. SQL Editor → pegá `supabase/migrations/20261209000001_web_push_status.sql` → Run. Database → Extensions:
       **pg_cron** y **pg_net** prendidas.
    2. Super-admin → **Estado** → tarjeta **Avisos push** → **Generar claves** (se crean en tu navegador; no se mandan
       ni se guardan). Dejá la pestaña abierta hasta el paso 5.
    3. Vercel → Environment Variables → `VITE_VAPID_PUBLIC_KEY` = la clave pública → **Redeploy**.
    4. Supabase → Edge Functions → **Secrets**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `REMINDERS_CRON_SECRET`.
    5. SQL Editor → el SQL de la tarea cada minuto del documento, con la clave del cron entre las comillas → Run (sin
       guardar la consulta).
    6. Supabase → Account → **Access Tokens** → nuevo token → GitHub → Settings → Secrets → Actions →
       `SUPABASE_ACCESS_TOKEN`. Después GitHub → **Actions** → **Publicar funciones de Supabase** → **Run workflow**.
  - Cómo sé que anduvo: la tarjeta **Avisos push** dice **Todo conectado** (si no, dice qué falta) y una tarea con aviso
    en 2 minutos te llega con la app cerrada (en iPhone, abriendo Mycen desde el ícono del inicio).
  - Detalle: [`web-push.md`](web-push.md)

- [ ] **Prueba de carga** (contra un proyecto de prueba, nunca contra producción con gente)
  - Qué es: simular cientos de visitas por segundo a un perfil para ver que nada se cae.
  - Pasos: instalar k6 → `k6 run -e BASE=<dirección de prueba> -e HANDLE=<usuario de prueba>
    scripts/load/profile-load.js` → mirar al mismo tiempo Supabase → **Reports** y Vercel → **Observability**.
  - Cómo sé que anduvo: el script termina sin fallar (`http_req_failed` < 1 % y `p(95)` < 800 ms) y la CPU de la base
    casi no sube.
  - ⚠️ A confirmar: `prueba-de-carga.md` usa `BASE=https://mycen.id` (producción). Antes de correrla, decidí con Claude
    contra qué la corrés y a qué hora (es tráfico real y cuenta para tu plan).
  - Detalle: [`prueba-de-carga.md`](prueba-de-carga.md)

### Buscadores y prueba final

- [ ] **Google Search Console y Bing**
  - Qué es: avisarle a Google que existe Mycen y darle la lista de perfiles públicos (`/sitemap.xml`).
  - Pasos: search.google.com/search-console → **Agregar propiedad** → **Dominio** → `mycen.id` → cargá el TXT
    `google-site-verification=…` en el DNS → **Verificar**. **Sitemaps** → escribí la dirección **completa**
    `https://mycen.id/sitemap.xml` → **Enviar**. Arriba: `https://mycen.id/` → **Solicitar indexación** (y
    `?lang=en`, `?lang=pt`). bing.com/webmasters → **Importar desde Google Search Console** → Sitemaps → el mismo.
  - Cómo sé que anduvo: en 1 o 2 días el sitemap dice "Correcto".
  - Detalle: [`salida-web.md`](salida-web.md) bloque 6

- [ ] **Decidir la beta**
  - Qué es: el plan deja abierta una decisión: ¿países o comunidades para una beta cerrada antes de abrir a todos?
  - Pasos: decidilo y contáselo a Claude.
  - Detalle: [`00-plan.md`](00-plan.md) sección 4, "Pendientes"

- [ ] **Prueba final en producción (el día de salida)**
  - Pasos: con el celular, en ventana privada: landing en tu idioma, en English y en árabe → "Elegí tu nombre" →
    registro → mail → onboarding → "Publicar perfil" → abrirlo desde otro celular y compartirlo por WhatsApp → en Studio
    un link, una foto y un video → en Life OS una tarea, un hábito y un gasto → salir, entrar con Google, "¿Olvidaste tu
    contraseña?" → abrir `/sitemap.xml` y `/api/health` → panel → **Errores**.
  - Cómo sé que anduvo: todo anda y no hay errores nuevos. Entonces decile a Claude **"congelá la v1.0.0"**.
  - Detalle: [`salida-web.md`](salida-web.md) bloque 11

---

## 2. La primera semana

- [ ] **Mirar el panel todos los días**
  - Qué es: enterarte de los problemas antes que la gente.
  - Pasos: Super-admin → **Estado** (semáforo), **Errores** (al menos 2 veces por día), **Denuncias** y **Producto**;
    y los mails de UptimeRobot y de "Avisos al equipo".
  - Cómo sé que anduvo: Estado en verde, sin errores nuevos sin revisar, denuncias contestadas.
  - Detalle: [`salida-web.md`](salida-web.md) "Después de abrir" · [`incidentes.md`](incidentes.md)

- [ ] **Firewall: pasar de "Log" a "429" (a los 2 o 3 días)**
  - Pasos: Vercel → Firewall → **Traffic**, filtrando por cada regla. Si no hay tráfico normal frenado, editá cada regla
    → al pasarse **Too Many Requests (429)** → **Publish**. Las primeras 24 h mirá Traffic.
  - Cómo sé que anduvo: las tres reglas dicen 429 y nadie se queja de que algo no carga.
  - Para volver atrás: la regla vuelve a **Log** o se desactiva.
  - Detalle: [`firewall-api.md`](firewall-api.md) pasos 6 y 7

- [ ] **Confirmar que las tareas automáticas corren**
  - Pasos: GitHub → **Actions**: "Avisos al equipo", "Revisión de links" y "Copia diaria de archivos" con corridas en
    verde. Super-admin → Estado → tareas programadas de pg_cron con corrida reciente.
  - Cómo sé que anduvo: todo verde; si una está roja, abrila y mandale el error a Claude.
  - Detalle: [`alertas.md`](alertas.md) · [`copia-archivos.md`](copia-archivos.md)

---

## 3. Cuando haya más gente

- [ ] **A las 2 semanas: DMARC más estricto y Search Console**
  - Pasos: en el DNS, el TXT `_dmarc`: cambiar `p=none` por `p=quarantine`. Search Console → **Páginas** (qué se indexó).
  - Detalle: [`salida-web.md`](salida-web.md) bloque 3.3 y "Después de abrir"

- [ ] **Subir límites cuando haga falta**
  - Qué es: con más gente, los topes de mails o el tamaño de la base pueden quedar chicos.
  - Pasos: Supabase → Authentication → Rate Limits (mails, según tu plan de Resend). Si la CPU de la base sube mucho:
    Supabase → Settings → **Compute**. Para no perder más de un día de datos: **Point in Time Recovery**.
  - Cómo sé que anduvo: Super-admin → Estado sin alertas de tamaño, conexiones ni consultas lentas.
  - Detalle: [`prueba-de-carga.md`](prueba-de-carga.md) · [`../seguridad/sgsi/06-operacion.md`](../seguridad/sgsi/06-operacion.md)

- [ ] **Una segunda persona con acceso de emergencia (en 30 días)**
  - Qué es: si te pasa algo o perdés el celular, alguien de confianza tiene que poder entrar.
  - Pasos: guardar en un gestor de contraseñas una cuenta de recuperación o el acceso de emergencia de una segunda
    persona.
  - Detalle: [`../seguridad/sgsi/02-riesgos.md`](../seguridad/sgsi/02-riesgos.md) R-13

- [ ] **Salida de red de Vercel Edge (N5)**
  - ⚠️ A confirmar: `06-operacion.md` dice "Queda del dueño: salida de red de Vercel Edge (N5)" pero ningún documento
    explica qué hay que hacer. Pedile a Claude los pasos.

- [ ] **Calendario de controles** (anotalo en tu calendario)
  - Cada semana: revisar y mergear los PR de Dependabot.
  - Cada mes: `/super-admin/estado?deep=1` todo en verde, Supabase → Advisors sin rojos, errores revisados; issue
    `control-mensual`.
  - Cada 3 meses: revisión de accesos (issue `acceso-revisado`), prueba de restauración (`restauracion-probada`) y
    repasar los riesgos de `02-riesgos.md`.
  - Cada 6 meses: si "Entrar con Apple" está prendido, renovar su secreto (vence).
  - Cada año: renovar `public/.well-known/security.txt` (hoy vence el **31/10/2027**; pedile a Claude que cambie la
    fecha de `Expires`), revisar el SGSI y el procedimiento de abuso infantil (`../seguridad/csam.md`).
  - Detalle: [`../seguridad/sgsi/06-operacion.md`](../seguridad/sgsi/06-operacion.md) "Calendario de controles"

---

## 4. Legal y empresa

- [ ] **Representante en la Unión Europea y en el Reino Unido**
  - Qué es: la ley (GDPR, UK GDPR y DSA) lo pide porque Mycen no tiene oficina allá y la gente de allá lo puede usar.
  - Pasos: contratar un servicio de representante (cobran una cuota anual) y pasarle a Claude nombre y dirección para
    sumarlos en Privacidad → responsable y Términos → quien (12 idiomas).
  - Cómo sé que anduvo: los datos del representante aparecen en `/privacidad` y `/terminos`.
  - Detalle: [`legal-mundial.md`](legal-mundial.md) punto 1

- [ ] **Agente DMCA (Estados Unidos)**
  - Qué es: te protege si alguien sube algo con derechos de autor ajenos ("safe harbor").
  - Pasos: registrarlo en dmca.copyright.gov (US$ 6, se renueva cada 3 años) y pasarle a Claude el contacto para
    Términos → derechos-de-autor. Anotá la renovación en el calendario.
  - Cómo sé que anduvo: tenés el comprobante del Copyright Office y el contacto está en `/terminos`.
  - Detalle: [`legal-mundial.md`](legal-mundial.md) punto 2

- [x] **Permiso aparte para Corea del Sur y China** — hecho el 22/11/2026 (casilla en el registro y en `/auth/terms`).
  Si cambian los proveedores o los países, pedile a Claude que suba `XBORDER_VERSION`.
  Detalle: [`legal-mundial.md`](legal-mundial.md) punto 3

- [ ] **Revisión de un abogado**
  - Qué es: los textos legales están hechos sin abogado; conviene que uno con experiencia en datos personales lea la
    versión en español (es la de referencia), sobre todo antes de campañas grandes o de cobrar.
  - Pasos: mandarle `/terminos` y `/privacidad` (y las preguntas que te pasó Claude); los cambios se los pasás a Claude
    y los aplica en los 12 idiomas.
  - Detalle: [`legal-mundial.md`](legal-mundial.md) punto 5 · [`salida-web.md`](salida-web.md) bloque 10

- [ ] **Firmar los riesgos aceptados**
  - Pasos: leer `02-riesgos.md` y completar "Firma de la dirección" y la fecha (riesgos aceptados R-05, R-06, R-15,
    R-18). Cada año, el calendario pide además firmar la revisión del SGSI en `01-alcance-politica.md`.
  - Detalle: [`../seguridad/sgsi/02-riesgos.md`](../seguridad/sgsi/02-riesgos.md)

- [ ] **Si armás una sociedad** (no es urgente)
  - Qué es: hoy el responsable es Luca Cazzoli (monotributo) con el nombre de fantasía Resilio.
  - Pasos: avisale a Claude para cambiar el responsable en los 12 idiomas (comentario `RESPONSABLE` en
    `src/i18n/app/legal/es.ts`).
  - Detalle: [`legal-mundial.md`](legal-mundial.md) punto 4

- [ ] **Si algún día abrís Mycen Business con pagos** (no ahora)
  - Pasos: revisar Términos → pagos (impuestos, reembolsos, arrepentimiento) y las reglas de cobro de cada tienda.
  - Detalle: [`legal-mundial.md`](legal-mundial.md) punto 6

---

## 5. Apps de iPhone y Android

Va después de la prueba final de la web: la app se construye desde la versión congelada (`release/v1`).

- [ ] **Cuentas de desarrollador**
  - Pasos: **Apple Developer Program** (USD 99 por año, developer.apple.com/programs) → anotá el **Team ID**
    (Membership → Team ID). **Google Play Console** (USD 25 una vez, play.google.com/console).
  - Cómo sé que anduvo: podés entrar a App Store Connect y a Play Console.
  - Detalle: [`../app/README.md`](../app/README.md) paso 1

- [ ] **Links de mycen.id que abren la app**
  - Pasos: Vercel → Environment Variables (Production): `APPLE_TEAM_ID` = tu Team ID y `ANDROID_CERT_SHA256` = la huella
    SHA-256 del certificado de Play (Play Console → tu app → Configuración → **Integridad de la app** → "Certificado de
    firma de apps", con los dos puntos) → **Redeploy**.
  - Cómo sé que anduvo: `https://mycen.id/.well-known/apple-app-site-association` muestra tu Team ID y
    `https://mycen.id/.well-known/assetlinks.json` tu huella.
  - Detalle: [`../app/README.md`](../app/README.md) paso 2

- [ ] **Entrar con Apple**
  - Qué es: Apple lo exige si la app ofrece Google; sin Apple, el iPhone sólo muestra email.
  - Pasos: Apple Developer → Certificates, IDs & Profiles → Identifiers → `id.mycen.app`: prender **Sign in with Apple**
    y **Associated Domains**. Crear un **Services ID** (ej. `id.mycen.web`) con dominio `<tu-proyecto>.supabase.co` y
    Return URL `https://<tu-proyecto>.supabase.co/auth/v1/callback`. Crear una **Key** con Sign in with Apple y bajar el
    `.p8`. Supabase → Authentication → Providers → **Apple**: Services ID, Team ID, Key ID y el `.p8`.
  - Cómo sé que anduvo: "Continuar con Apple" aparece solo en `/login` (para probar antes: `/login?beta=1`).
  - Anotá en el calendario: el secreto vence cada 6 meses.
  - Detalle: [`../app/README.md`](../app/README.md) paso 3

- [ ] **Decidir el CAPTCHA en la app antes de mandarla a revisión**
  - Qué es: con el CAPTCHA prendido en Supabase, en la app no se puede entrar con email (y la cuenta de prueba de Apple
    es de email).
  - Pasos: elegí una salida con Claude: (a) probar Turnstile en la app (agregar `localhost` a los dominios del widget y
    construir con `VITE_TURNSTILE_SITE_KEY` y `VITE_TURNSTILE_IN_APP=android` o `android,ios`, probando en un teléfono
    real), o (b) prender Entrar con Apple y darle al revisor una cuenta que entre con Apple, o apagar el CAPTCHA durante
    la revisión.
  - Cómo sé que anduvo: en un teléfono real, con la build de la tienda, se puede registrar y entrar.
  - Detalle: [`captcha.md`](captcha.md) "Limitación: la app de iOS y Android"

- [ ] **Armar la app y subirla**
  - Pasos: Mac con **Xcode 16+** y **Android Studio** (o un servicio en la nube como Codemagic). `git checkout
    release/v1`, `npm install`, variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_APP_URL=https://mycen.id`,
    después `npm run app:ios` y `npm run app:android`. Xcode → Signing & Capabilities → tu Team → Product → **Archive**
    → App Store Connect. Android Studio → Build → **Generate Signed App Bundle** (`.aab`) con una llave nueva
    (**guardala bien**: sin ella no se puede actualizar) → Play Console, con "Firma de apps de Google Play".
  - Cómo sé que anduvo: la build aparece en TestFlight y en Play Console.
  - Detalle: [`../app/README.md`](../app/README.md) paso 4

- [ ] **Fichas de las tiendas y revisión**
  - Pasos: textos en 12 idiomas, categoría, privacidad y notas para el revisor en `docs/app/STORE.md`. Antes de mandar:
    cuenta de prueba con email y contenido (con un mensaje recibido), un segundo perfil publicado para probar
    "Denunciar", TestFlight probado en un iPhone real, links universales andando, `team@mycen.id` recibe mails,
    capturas (iPhone 6,9"), "App Review Information" completa y versión `1.0.0`. En Google Play → Seguridad de los
    datos: `https://mycen.id/eliminar-cuenta`.
  - Cómo sé que anduvo: las tiendas aprueban la app.
  - Detalle: [`../app/STORE.md`](../app/STORE.md) "Antes de mandar a revisión" · [`../app/README.md`](../app/README.md) "Probar la app"

---

## Qué hace Claude y qué hacés vos

**Claude** escribe y prueba todo el código, las migraciones de la base y los textos en los 12 idiomas; prepara los
pasos de cada panel, actualiza estos documentos y te dice qué migración pegar en Supabase antes de cada merge. No tiene
tus contraseñas ni tus claves, no entra a tus paneles, no paga planes ni firma nada en tu nombre.

**Vos** hacés lo que necesita tu cuenta o tu firma: pagar los planes, crear las claves y pegarlas en cada panel, cargar
el DNS, pegar las migraciones en el SQL Editor, probar en tu celular, decidir (beta, abogado, sociedad) y mergear los PR
después de mirar la vista previa. Si un paso no sale como dice acá, sacale una captura y mandásela a Claude (sin claves
a la vista).

## Si algo se rompe

1. Abrí **Super-admin → Estado** (`/super-admin/estado`): el semáforo dice qué parte falla (base, perfil público,
   mails, sitemap, recordatorios…). Si hay spam o un ataque, ahí mismo están los **Interruptores de emergencia**
   (registros, mensajes, suscripciones, votaciones).
2. Seguí el **plan ante incidentes**: [`incidentes.md`](incidentes.md). Arranca con una tabla de "¿Qué pasa? → primer
   paso" (web caída → volver al deploy anterior en Vercel; spam → pausar registros; clave filtrada → rotarla).
3. Regla de oro: primero frenar el daño, después entender, después arreglar, y anotar todo con la hora.
4. Si hay datos personales de por medio, hay plazos legales para avisar: están en `incidentes.md` ("Fuga de datos").
