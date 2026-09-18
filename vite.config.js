import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project site from a subpath, so every built asset URL has to carry
// the repository name. The dev server stays at the root.
const base = process.env.NODE_ENV === 'production' ? '/TwoWire/' : '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Public assets that no manifest entry points at; the plugin already precaches the
      // webmanifest and every icon listed below.
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TwoWire — Thread Wire Calculator',
        short_name: 'TwoWire',
        description:
          'Measure thread pitch diameter or measurement over wires with the three-wire method.',
        // Matches the app shell (bg-slate-100) rather than the icon, so the splash screen
        // and browser chrome hand over to the first paint without a flash.
        theme_color: '#f1f5f9',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The whole app is static and small; precaching it makes the tool work offline,
        // which is the point of installing it in a workshop.
        globPatterns: ['**/*.{js,css,html}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
