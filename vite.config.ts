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
        name: 'MenuLife',
        short_name: 'MenuLife',
        description: 'Sistema operativo para negocios gastronómicos',
        theme_color: '#0F1115',
        background_color: '#0F1115',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png',         sizes: '180x180', type: 'image/png' },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            url: '/dashboard',
            icons: [{ src: 'web-app-manifest-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Pedidos',
            url: '/dashboard/orders',
            icons: [{ src: 'web-app-manifest-192x192.png', sizes: '192x192' }],
          },
        ],
        categories: ['food', 'business', 'productivity'],
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
