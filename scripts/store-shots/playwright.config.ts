import { defineConfig } from '@playwright/test'
import base from '../../playwright.config'

// Capturas de las fichas de App Store y Google Play (ver README.md):
//   npx playwright test --config scripts/store-shots/playwright.config.ts
// Escribe design/store-shots/. No corre en CI: se vuelve a generar cuando cambia el diseño.
const PORT = 5182
const web = (base.webServer as { env: Record<string, string> }[])[0]
export default defineConfig({
  ...base, testDir: '.', projects: undefined, retries: 0, fullyParallel: true, workers: 3, timeout: 120_000,
  reporter: 'list',
  // La app se sirve como "mycen.id": las direcciones que muestra son las reales, no las de pruebas
  use: {
    ...base.use, baseURL: 'http://mycen.id',
    launchOptions: { ...base.use?.launchOptions, args: [`--host-resolver-rules=MAP mycen.id 127.0.0.1:${PORT}`] },
  },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`, url: `http://127.0.0.1:${PORT}`, reuseExistingServer: false, cwd: process.cwd(),
    env: { ...web.env, VITE_PUBLIC_PROFILE_BASE: 'https://mycen.id', __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: 'mycen.id' },
  },
})
