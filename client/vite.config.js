import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const API = 'http://localhost:4000';

export default defineConfig({
  // « @/ » pointe vers src/, comme dans les projets shadcn.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'PayTonLoyer',
        short_name: 'PayTonLoyer',
        description: 'Gestion locative et paiement du loyer par Mobile Money',
        lang: 'fr',
        // L'application installée ouvre directement la connexion, ou l'espace de l'utilisateur connecté.
        start_url: '/connexion',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#064e3b',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Seules les polices latines sont préchargées : elles couvrent le français.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-wght-normal-*.woff2'],
        // Logos haute définition : chargés à la demande, pas installés avec l'application.
        globIgnores: ['logo/logo-*.png'],
        navigateFallback: '/index.html',
        // Les données et les quittances ne sont jamais mises en cache.
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: { cacheName: 'photos', expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': API, '/uploads': API },
  },
});
