# Handoff — app de iOS y Android (Capacitor)

Para seguir en otra sesión de Claude Code. Rama `claude/friendly-brown-t1hnt0`, PR
https://github.com/elevareluxury/menulife/pull/81 (abierto, sin mergear). Leer antes `CLAUDE.md` (sección "App de iOS y
Android") y `docs/app/README.md`.

## Estado
- PR #81 = app con Capacitor 8 (plataforma, descargas/compartir nativos, acceso PKCE + deep links, recordatorios
  locales, "Entrar con Apple" en BETA, fichas de tiendas). Su primer commit pasó el CI completo (347/347 E2E).
- Segundo commit (auditoría para las tiendas), subido con tsc, build, eslint (0 errores), `npm test` (519) y presupuesto
  OK. **Falta correr la E2E completa** (`CI=1`, servidor nuevo en el puerto 5180) o esperar el CI del PR.

## Qué cambió en la auditoría
1. `/api/media-cover` y `/api/youtube-latest`: CORS `*` (la app pide desde `capacitor://localhost`; antes fallaba).
2. Link `webcal://` del calendario y links de Business (QR, mozos, repartidores, solicitudes) con `webOrigin()`.
3. Descargas de Business (QR de mesas, CSV de estadísticas) con `saveFile` (en la app no hay descargas).
4. App Store 4.8: `oauthProviders()` en `googleSignIn.ts` — en iPhone, Google sólo si `appleSignIn` está prendido.
5. App Store 5.1.1(v): "Eliminar mi cuenta" también en Life OS → Ajustes → Cuenta (con palabra de confirmación;
   `LifeConfirmDialog` suma `confirmDisabled`; textos en los 12 idiomas en `src/i18n/app/life/*`).
6. Dictado apagado en Android (el WebView no reconoce voz); huella del diario apagada en la app (sólo PIN).
7. iOS: `NSMicrophoneUsageDescription` y `NSSpeechRecognitionUsageDescription` en `Info.plist` + 12 `InfoPlist.strings`;
   `PrivacyInfo.xcprivacy` (registrado en el pbxproj) igual a `docs/app/STORE.md`.
8. Versión 1.0.0 en iOS (`MARKETING_VERSION`) y Android (`versionName`).
9. Sesión respaldada en las preferencias nativas: `src/lib/nativeAuthStorage.ts` (dependencia nueva
   `@capacitor/preferences`, oficial y sólo en la app). `capacitor.config.ts`: `SystemBars.initialViewportFitValueHint`.

## Qué falta
- Tests nuevos: un unitario de `oauthProviders()` (iOS sin Apple → sin Google) y un E2E de "Eliminar mi cuenta" desde
  Life OS (mock de `delete_my_account` en `tests/e2e/support/mockSupabase.ts` si no está). Correr la E2E completa.
- Esperar el CI verde del PR #81 → el usuario dice "listo" → mergear (merge commit) → reset de la rama a `origin/main`.
- Después: freeze v1.0.0 según `docs/v1/prompts/17-freeze.md` (pedir confirmación de migraciones aplicadas, CHANGELOG,
  `docs/v1/RELEASE.md`, rama `release/v1` y tag `v1.0.0`).
- Del usuario: Team ID de Apple y SHA256 de Android (reemplazan `APPLE_TEAM_ID` / `ANDROID_SHA256_FINGERPRINT` en
  `public/.well-known/`), configurar "Entrar con Apple" y prender `appleSignIn`, cuentas de desarrollador, armar en una
  Mac (Xcode) y en Android Studio.
