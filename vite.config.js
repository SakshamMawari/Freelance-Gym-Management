import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'Roxy GYM',
        short_name: 'RoxyGYM',
        description: 'Roxy GYM member and membership management',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#38bdf8',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: { navigateFallback: '/offline.html' }
    })
  ]
});
