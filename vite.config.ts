/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages はリポジトリ名のサブパス配下で公開されるため、本番ビルド時のみ base を切り替える
  base: process.env.GITHUB_PAGES ? '/Multilingual-Family-Roadmap/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Multilingual Family Roadmap',
        short_name: 'FamRoadmap',
        description: 'マルチリンガル家族のための言語レベルロードマップ&進捗トラッカー',
        lang: 'ja',
        theme_color: '#3859ff',
        background_color: '#fafafa',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  // プレビュー環境から PORT 環境変数でポートを指定できるようにする
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
