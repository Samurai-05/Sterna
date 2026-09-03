import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { normalizePath } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { defineConfig } from 'vitest/config'

const localApiProxyTarget = 'http://localhost:3000'
const remoteApiProxyTarget = 'https://labo-iot1.iict-heig-vd.ch'

export function getApiProxyConfig(mode: string) {
  if (mode === 'remote') {
    return {
      target: remoteApiProxyTarget,
      changeOrigin: true,
    }
  }

  return { target: localApiProxyTarget }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  envDir: '..',
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(
            fileURLToPath(
              new URL(
                './node_modules/flag-icons/flags/4x3/*.svg',
                import.meta.url,
              ),
            ),
          ),
          dest: 'country-flags',
          rename: { stripBase: true },
        },
      ],
    }),
    ...(mode === 'android'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            workbox: {
              globIgnores: ['**/country-flags/*.svg'],
              runtimeCaching: [
                {
                  urlPattern: /\/country-flags\/[^/]+\.svg$/,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'country-flags',
                    expiration: {
                      maxEntries: 32,
                      maxAgeSeconds: 60 * 60 * 24 * 365,
                    },
                  },
                },
              ],
            },
            manifest: {
              name: 'Sterna',
              short_name: 'Sterna',
              description: 'Sterna mobile application',
              theme_color: '#ffffff',
              background_color: '#ffffff',
              display: 'standalone',
              start_url: '/',
              icons: [
                {
                  src: '/favicon.svg',
                  sizes: 'any',
                  type: 'image/svg+xml',
                },
              ],
            },
          }),
        ]),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': getApiProxyConfig(mode),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
}))
