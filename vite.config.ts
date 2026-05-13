import { defineConfig } from 'vite'
import { version } from './package.json'
import path from 'node:path'
import tailwindcss from "@tailwindcss/vite"
import electron from 'vite-plugin-electron/simple'
import { startup } from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test'
        ? undefined
        : {},
      onstart: async () => {
        await startup()
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
})