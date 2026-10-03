import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'fs'

// E2E contra la app real (Vite) con Supabase simulado (tests/e2e/support/mockSupabase.ts):
// no hace falta base ni red. En CI se usa el Chromium de Playwright; en el entorno de
// Claude Code hay uno preinstalado.
const PORT = 5180
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
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: 'https://mock.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_PUBLIC_PROFILE_BASE: `http://localhost:${PORT}`,
    },
  },
})
