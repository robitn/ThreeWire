import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project site from a subpath, so every built asset URL has to carry
// the repository name. The dev server stays at the root.
const base = process.env.NODE_ENV === 'production' ? '/TwoWire/' : '/'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// The version alone cannot answer "has my installed copy updated yet", because a deploy
// that fixes something need not bump it. The commit can, and it is what a bug report wants
// quoting anyway.
function buildRef() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)

  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    // No git, or not a checkout: a tarball build still has to produce something.
    return 'unknown'
  }
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_REF__: JSON.stringify(buildRef()),
  },
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      // Prompt rather than autoUpdate: swapping the worker out from under someone reloads
      // the page, and losing a half-entered measurement mid-job is worse than running a
      // version behind for another minute. ReloadPrompt.vue offers the swap instead.
      registerType: 'prompt',
      // Public assets that no manifest entry points at; the plugin already precaches the
      // webmanifest and every icon listed below.
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TwoWire — Thread Wire Calculator',
        short_name: 'TwoWire',
        description:
          'Three-wire thread calculator: pitch diameter, measurement over wires, and ASME B1.1 or ISO 965 class limits.',
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
        // Take control of the page that registered us, on the very first visit. Without
        // this a first-time worker installs but controls nothing until the next navigation,
        // and Chrome will not offer to install an app it does not yet see a worker serving.
        // autoUpdate set this implicitly; 'prompt' does not, which is what broke installing.
        // Safe to pair with 'prompt': skipWaiting stays off, so an updated worker still
        // waits for the user rather than swapping itself in.
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
