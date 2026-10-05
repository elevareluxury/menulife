import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Use our custom service worker — VitePWA injects the precache manifest
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      // SW registration is handled manually in notifications.ts (registerServiceWorker)
      injectRegister: false,

      // Assets to include in precache
      includeAssets: ['favicon-96x96.png', 'favicon.ico', 'apple-touch-icon.png', 'logo.png'],

      // Raise the precache size limit above the 2 MiB default (bundle is ~2.1 MiB)
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },

      manifest: {
        name: 'Mycen — Tu mundo digital',
        short_name: 'Mycen',
        description: 'Construye tu identidad digital, organiza tu vida y potencia tu negocio.',
        theme_color: '#0A0B0F',
        background_color: '#0A0B0F',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/life',
        icons: [
          { src: 'web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png',         sizes: '180x180', type: 'image/png' },
        ],
        shortcuts: [
          {
            name: 'Life OS',
            url: '/life',
            icons: [{ src: 'web-app-manifest-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Mi ID',
            url: '/life/hub',
            icons: [{ src: 'web-app-manifest-192x192.png', sizes: '192x192' }],
          },
        ],
        categories: ['productivity', 'lifestyle', 'business'],
      },

      devOptions: {
        // Disabled in dev — test with `npm run build && npm run preview`
        enabled: false,
      },

    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('recharts'))            return 'recharts'
          if (id.includes('@supabase'))           return 'supabase'
          if (id.includes('framer-motion'))       return 'framer'
          if (id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor'
        },
      },
    },
  },
})
