import { defineConfig } from 'vitest/config'
import path from 'path'

// Tests unitarios: lógica pura (sin navegador). Los E2E viven en tests/e2e (Playwright).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // El cliente de Supabase exige estas variables al importarse; nunca se conecta en los tests
    env: { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test' },
  },
})
