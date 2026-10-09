import { join } from 'node:path'
import { defineConfig } from '@playwright/test'
import base from '../../playwright.config'

// Genera las imágenes estáticas de la landing (V1 · etapa 13): estructuras del perfil y "Mi día" en los dos temas.
//   npx playwright test --config scripts/landing-shots/playwright.config.ts
// Escribe public/landing/*.webp. No corre en CI: se vuelve a generar cuando cambia el diseño del perfil o de Mi día.
const PORT = 5181
const web = base.webServer as { env: Record<string, string> }
export default defineConfig({
  ...base, testDir: '.', retries: 0, fullyParallel: false, workers: 1,
  // La app se sirve como "mycen.id": la credencial y su QR muestran la dirección pública real, no la de pruebas
  use: {
    ...base.use, baseURL: 'http://mycen.id',
    launchOptions: { ...base.use?.launchOptions, args: [`--host-resolver-rules=MAP mycen.id 127.0.0.1:${PORT}`] },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`, port: PORT, reuseExistingServer: false, cwd: join(process.cwd()),
    env: { ...web.env, VITE_PUBLIC_PROFILE_BASE: 'https://mycen.id', __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: 'mycen.id' },
  },
})
