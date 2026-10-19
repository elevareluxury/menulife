import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'fs'

// E2E contra la app real (Vite) con Supabase simulado (tests/e2e/support/mockSupabase.ts):
// no hace falta base ni red. En CI se usa el Chromium de Playwright; en el entorno de
// Claude Code hay uno preinstalado.
// E2E_PORT: para correr varias copias del proyecto a la vez sin que una use el servidor de otra
const PORT = Number(process.env.E2E_PORT) || 5180
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-AR',
    trace: 'retain-on-failure',
    ...devices['Pixel 7'],
    launchOptions: existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {},
  },
  // captcha.spec.ts necesita la app con VITE_TURNSTILE_SITE_KEY (la clave se fija al arrancar Vite): corre en su propio
  // servidor para que el resto de los E2E sigan sin CAPTCHA, como la app hoy
  // Las capturas (visual, modules) se llaman sin el nombre del proyecto, como antes de tener proyectos
  expect: { toHaveScreenshot: { pathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-snapshotSuffix}{ext}' } },
  projects: [
    // prod-smoke.spec.ts es para el build (vite preview, con la CSP): corre con npm run test:e2e:prod
    { name: 'app', testIgnore: [/captcha\.spec\.ts$/, /prod-smoke\.spec\.ts$/] },
    { name: 'captcha', testMatch: /captcha\.spec\.ts$/, use: { baseURL: `http://localhost:${PORT + 1}` } },
  ],
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_SUPABASE_URL: 'https://mock.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_PUBLIC_PROFILE_BASE: `http://localhost:${PORT}`,
        // El registro de errores (L5) sólo manda en producción; en los E2E se prende para probarlo
        VITE_REPORT_ERRORS: '1',
      },
    },
    {
      command: `npx vite --port ${PORT + 1} --strictPort`,
      port: PORT + 1,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_SUPABASE_URL: 'https://mock.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_PUBLIC_PROFILE_BASE: `http://localhost:${PORT + 1}`,
        // Clave de prueba de Cloudflare (siempre pasa); igual el script se simula en captcha.spec.ts
        VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      },
    },
  ],
})
