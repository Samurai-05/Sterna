import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'
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
    ...(mode === 'android'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
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
