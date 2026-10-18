import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Humo sobre el build de producción (`npm run build` antes): los E2E de siempre corren contra el servidor de
// desarrollo, que no empaqueta, y un error del empaquetador (Analítica rota por recharts + rolldown 1.0) no se veía.
// Acá cada pantalla que se carga aparte se abre desde `vite preview`.
const PORT = Number(process.env.E2E_PORT) || 5190

export default defineConfig({
  ...base,
  testMatch: /prod-smoke\.spec\.ts$/,
  use: { ...base.use, baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
})
