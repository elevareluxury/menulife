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
      // so we don't double-register. VitePWA still injects the manifest link.
      injectRegister: false,

      // Assets to include in precache
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'offline.html'],

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
          { src: 'icon-192.png',    sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png',    sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            url: '/dashboard',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Pedidos',
            url: '/dashboard/orders',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
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
})
