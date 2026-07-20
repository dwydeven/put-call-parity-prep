import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative assets work both at the GitHub Pages project path and at the
  // root path used by the local Nginx container.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['parity-prep-icon.png'],
      manifest: {
        name: 'Parity Prep',
        short_name: 'Parity Prep',
        description: 'Offline put-call parity mental-math speed drills.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f5f2ea',
        theme_color: '#f7f4ed',
        categories: ['education', 'finance', 'games'],
        icons: [
          {
            src: 'parity-prep-icon.png',
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{html,js,css,png,webmanifest}'],
      },
    }),
  ],
});
