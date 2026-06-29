import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const supabaseUrl = process.env.VITE_SUPABASE_URL

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG || 'animeverse',
            project: process.env.SENTRY_PROJECT || 'anime-app',
            authToken: process.env.SENTRY_AUTH_TOKEN,
          }),
        ]
      : []),
    ...(mode === 'analyze' ? [visualizer({ open: true, gzipSize: true, brotliSize: true })] : []),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['**/*'],
      manifest: {
        name: 'AnimeVerse',
        short_name: 'AnimeVerse',
        description: 'Anime y manga online — mira y lee gratis',
        theme_color: '#0A0A0F',
        background_color: '#0A0A0F',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          ...(supabaseUrl
            ? [
                {
                  urlPattern: new RegExp('^' + supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/.*', 'i'),
                  handler: 'NetworkFirst',
                  options: { cacheName: 'supabase-api', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } },
                },
              ]
            : []),
          {
            urlPattern: /^https:\/\/graphql\.anilist\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'anilist-api', expiration: { maxEntries: 100, maxAgeSeconds: 3600 } },
          },
          {
            urlPattern: /^https:\/\/api\.anivexa\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'anivexa-api', expiration: { maxEntries: 50, maxAgeSeconds: 600 } },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|gif|webp|avif|svg)$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 604800 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'vendor-react'
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/hls.js')) return 'vendor-hls'
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase'
          if (id.includes('node_modules/@sentry')) return 'vendor-sentry'
        },
      },
    },
  },
}))
