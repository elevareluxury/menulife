# CAPTCHA del acceso (Cloudflare Turnstile)

Frena cuentas creadas por bots (auditoría de seguridad del 18/10/2026, B11 del plan). Está listo en el código pero
**apagado** hasta que se cargue la clave: sin `VITE_TURNSTILE_SITE_KEY` no aparece nada y Supabase recibe lo mismo que antes.

## Cómo funciona
- Con la clave, el recuadro de Turnstile aparece en registro (`/register`), acceso (`/login`) y "¿Olvidaste tu contraseña?"
  (`/forgot-password`, también para "Reenviar email"). El token va a Supabase como `options.captchaToken`.
- Supabase lo exige recién cuando se prende **Authentication → Attack Protection → Enable CAPTCHA protection** (proveedor
  Turnstile, con la Secret Key). Desde ahí lo pide en signUp, signInWithPassword, resetPasswordForEmail y OTP.
  **Entrar con Google o Apple no pide CAPTCHA.**
- El script (`challenges.cloudflare.com/turnstile/v0/api.js`, modo explícito) se descarga sólo en esas pantallas: no pesa
  en la landing ni en el perfil público. Tema oscuro en las pantallas de acceso (claro si están dentro de Amanecer),
  idioma de la persona, tamaño compacto en pantallas angostas.
- Si falla, vence (5 min; se renueva solo) o no carga (bloqueador, red), se avisa en los 12 idiomas con "Reintentar
  verificación". Si Supabase lo rechaza ("captcha verification process failed") se explica y se pide un token nuevo.
- El "Enviar email de reset" del super-admin no tiene recuadro: con el CAPTCHA prendido avisa que la persona lo pida
  desde "¿Olvidaste tu contraseña?" (antes decía "enviado" aunque fallara).
- La CSP (`vercel.json`) permite el iframe de `https://challenges.cloudflare.com` (`frame-src`); si se agrega `script-src`,
  tiene que incluir ese origen.
- Privacidad: Cloudflare (Turnstile) figura entre los proveedores en los 12 idiomas.
- Código: `src/lib/turnstile.ts`, `src/modules/auth/components/Captcha.tsx`. Tests: `tests/unit/turnstile.test.ts` y
  `tests/e2e/captcha.spec.ts` (proyecto "captcha" de Playwright, con la clave y el widget simulado).

## Orden para prenderlo (no cambiar el orden)
1. Mergear y publicar este cambio (sin la clave no cambia nada).
2. Crear el widget en Cloudflare → Turnstile: modo **Managed**, dominios `mycen.id` y `www.mycen.id` (más los de las
   vistas previas de Vercel si se quiere probar ahí). Cargar la **Site Key** en Vercel → Settings → Environment Variables
   como `VITE_TURNSTILE_SITE_KEY` (Production; Preview si se usa) y **volver a publicar** (Vite la fija al construir).
3. Abrir `mycen.id/register` y `mycen.id/login` y ver que aparece el recuadro y se resuelve.
4. Recién ahí, en Supabase → Authentication → Attack Protection: prender CAPTCHA, proveedor Turnstile, pegar la
   **Secret Key** y guardar.
5. Probar en la web: crear una cuenta, iniciar sesión, pedir "¿Olvidaste tu contraseña?" y "Reenviar email".

Para apagarlo de urgencia: apagar CAPTCHA en Supabase (el acceso vuelve a funcionar al instante, aunque el recuadro siga).

## Limitación: la app de iOS y Android (Capacitor)
La app carga la web desde `capacitor://localhost` (iOS) y `https://localhost` (Android), no desde mycen.id. Turnstile
valida el dominio de la página y no está documentado que acepte esos orígenes (en iOS el esquema ni siquiera es http/https),
así que **en la app el recuadro no se muestra** y no se manda token.

Consecuencia: **con el CAPTCHA prendido en Supabase, en la app no se puede entrar, registrarse ni recuperar la contraseña
con email** (sí con Google o Apple). La app lo explica ("en la app no se puede entrar con email…"). Hoy el iPhone sin
`appleSignIn` entra **sólo** con email, y la cuenta de prueba para la revisión de Apple también es de email.
Por eso, **no hacer el paso 4 mientras haya una versión de la app en las tiendas (o en revisión) que dependa del email**,
salvo que antes se pruebe una de estas salidas:

- **Probar Turnstile en el WebView:** agregar `localhost` a los dominios del widget en Cloudflare, construir la app con
  `VITE_TURNSTILE_SITE_KEY` y `VITE_TURNSTILE_IN_APP=android` (o `android,ios`) y probar registro y acceso en un teléfono
  real. Si anda, dejar esa variable en el build de la app (rama `release/v1`). Con `localhost` en la lista, cualquiera
  podría usar la Site Key desde su propia máquina (la Secret Key sigue protegida; el riesgo es bajo).
- **Prender "Entrar con Apple"** (`appleSignIn`) para que el iPhone tenga un camino sin CAPTCHA, y dar al revisor de Apple
  una cuenta que entre con Apple, o apagar el CAPTCHA durante la revisión.
