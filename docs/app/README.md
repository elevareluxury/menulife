# App de Mycen para iOS y Android (Capacitor)

La app es la misma web de Mycen adentro de una app nativa (Capacitor 8). Todo el código vive en este repo:

| Qué | Dónde |
|---|---|
| Configuración (id `id.mycen.app`, nombre, pantalla de carga) | `capacitor.config.ts` |
| Proyecto de iPhone/iPad (Xcode) | `ios/` |
| Proyecto de Android (Android Studio) | `android/` |
| ¿Web o app? (`isNativeApp`, `webOrigin`, `apiUrl`, `authCallbackUrl`) | `src/lib/platform.ts` |
| Links que abren la app, botón atrás, barra de estado, tocar un recordatorio | `src/app/native/NativeBridge.tsx`, `src/lib/appLinks.ts` |
| Guardar o compartir archivos (vCard, CSV, QR, tarjeta, .ics, exportar) | `src/lib/nativeFiles.ts` |
| Recordatorios con la app cerrada (notificaciones locales) | `src/modules/life/lib/nativeReminders.ts` |
| Íconos y pantalla de carga (desde el ícono maestro de la marca) | `node scripts/build-app-assets.mjs` |
| Links verificados (Universal Links / App Links) | `public/.well-known/apple-app-site-association`, `public/.well-known/assetlinks.json` |

Qué cambia en la app respecto de la web:
- Abre en el acceso (sin landing ni precios: Apple no deja cobrar por fuera de su sistema) y no ofrece "Agregar a inicio".
- Los links que se comparten (perfil, QR, calendario) y las funciones de Mycen (`/api/…`) usan `https://mycen.id`.
- Google (y Apple) se abren en el navegador del sistema y vuelven a la app con un link de mycen.id (flujo PKCE).
- Las descargas abren el menú nativo de compartir (Guardar en Archivos, AirDrop, WhatsApp…).
- Los recordatorios de tareas y hábitos se programan en el teléfono: llegan aunque la app esté cerrada.
- Sin service worker (la app ya está instalada).
- "Dictar" no aparece en iPhone (el reconocimiento de voz del navegador no existe adentro de una app) y el Diario se
  desbloquea con el PIN (la huella o cara del navegador tampoco). Quedan para una versión nativa (V1.1).

## Lo que tenés que hacer vos (una sola vez)

### 1. Cuentas
- **Apple Developer Program** (USD 99 por año): https://developer.apple.com/programs/ — anotá tu **Team ID**
  (Membership → Team ID, 10 letras y números).
- **Google Play Console** (USD 25, una sola vez): https://play.google.com/console

### 2. Links que abren la app
- En `public/.well-known/apple-app-site-association`, reemplazá `APPLE_TEAM_ID` por tu Team ID (dos veces).
- En `public/.well-known/assetlinks.json`, reemplazá `ANDROID_SHA256_FINGERPRINT` por la huella SHA-256 del
  certificado con el que Google Play firma la app (Play Console → tu app → Configuración → Integridad de la app →
  "Certificado de firma de apps"). Para probar antes, agregá también la de tu llave de subida.
- Publicá (merge a `main`) y comprobá que `https://mycen.id/.well-known/apple-app-site-association` responde.
- **Supabase → Authentication → URL Configuration → Redirect URLs:** que esté `https://mycen.id/auth/callback`
  (ya se usa en la web).

### 3. Entrar con Apple (la App Store lo exige si la app ofrece Google)
1. Apple Developer → Certificates, IDs & Profiles → Identifiers: en el App ID `id.mycen.app` prendé
   **Sign in with Apple** y **Associated Domains**.
2. Creá un **Services ID** (por ejemplo `id.mycen.web`), prendé Sign in with Apple y configurá:
   dominio `<tu-proyecto>.supabase.co` y Return URL `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
3. Creá una **Key** con Sign in with Apple y bajá el archivo `.p8`.
4. Supabase → Authentication → Providers → **Apple**: prendelo y cargá el Services ID, el Team ID, el Key ID y el
   contenido del `.p8` (Supabase genera el secreto). Ojo: el secreto vence cada 6 meses; anotalo en el calendario.
5. Probá en producción con `https://mycen.id/login?beta=1` (aparece "Continuar con Apple" sólo en ese dispositivo).
6. Si funciona, en `src/lib/features.ts` poné `appleSignIn: true` (PR aparte) y aparece para todos.

### 4. Armar la app
Necesitás una Mac con **Xcode 16+** para iPhone y **Android Studio** para Android (o un servicio de compilación en la
nube, por ejemplo Codemagic o Ionic Appflow, si no tenés Mac).

```bash
git checkout release/v1          # la app se construye siempre desde la versión congelada
npm install
# Variables de producción (las mismas de Vercel): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY y VITE_APP_URL=https://mycen.id
npm run app:ios                  # build + copia a ios/ + abre Xcode
npm run app:android              # build + copia a android/ + abre Android Studio
```

- **Xcode:** proyecto `App` → Signing & Capabilities → elegí tu equipo (Team). Ya están cargados el id, los dominios
  asociados (`App.entitlements`), los permisos de cámara y fotos en 12 idiomas y el esquema `id.mycen.app`.
  Product → Archive → Distribute App → App Store Connect.
- **Android Studio:** Build → Generate Signed App Bundle (`.aab`) con una llave nueva (guardala bien: sin ella no
  podés actualizar la app) y subilo a Play Console. Prendé "Firma de apps de Google Play".
- Cada versión nueva: subí `versionCode`/`versionName` en `android/app/build.gradle` y la versión en Xcode
  (`MARKETING_VERSION` y `CURRENT_PROJECT_VERSION`).

### 5. Fichas de las tiendas
Textos en 12 idiomas, categorías y respuestas de privacidad: `docs/app/STORE.md`. Capturas: 6,7" (iPhone) y
teléfono Android; se pueden sacar del simulador o con `visual.spec.ts` como base.

## Pruebas
- `tests/e2e/native-app.spec.ts` simula la app (el puente de iOS) y verifica: abre en el acceso, links con mycen.id,
  sin "Agregar a inicio".
- `tests/unit/appLinks.test.ts` (links que abren la app) y `tests/unit/nativeReminders.test.ts` (ids de los avisos).
- Lo nativo de verdad (Xcode/Android Studio, notificaciones, compartir) se prueba en un teléfono: lista en
  `docs/v1/prompts/16-pruebas-manuales.md` + "Probar la app" abajo.

### Probar la app en el teléfono
1. Registrarte y entrar con email (el mail de confirmación tiene que abrir la app).
2. Entrar con Google (se abre el navegador y vuelve a la app).
3. Crear una tarea con recordatorio para dentro de 2 minutos, cerrar la app y esperar el aviso; tocarlo abre Tareas.
4. Compartir tu perfil, bajar el QR y la tarjeta (se abre el menú de compartir).
5. Subir una foto de perfil con la cámara y desde la galería.
6. Recuperar la contraseña desde el mail.
7. Botón atrás de Android.
