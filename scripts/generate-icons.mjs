// public/icon.svg から PWA 用の各種 PNG アイコンを生成する。
// 実行: npm run icons(sharp が必要)
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'public', 'icon.svg')
const out = (name) => join(root, 'public', name)

// ブランドカラー(マスカブル背景と揃える)
const BRAND = '#3859ff'

// 通常アイコン(icon.svg をそのままリサイズ)
const plain = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
]

for (const [name, size] of plain) {
  await sharp(src)
    .resize(size, size)
    .png()
    .toFile(out(name))
  console.log('generated', name)
}

// マスカブルアイコン:セーフゾーン確保のため、
// #3859ff の 512x512 キャンバス中央にアイコンを 80% サイズで合成する。
const maskSize = 512
const inner = Math.round(maskSize * 0.8)
const iconPng = await sharp(src).resize(inner, inner).png().toBuffer()
await sharp({
  create: {
    width: maskSize,
    height: maskSize,
    channels: 4,
    background: BRAND,
  },
})
  .composite([{ input: iconPng, gravity: 'center' }])
  .png()
  .toFile(out('pwa-maskable-512x512.png'))
console.log('generated', 'pwa-maskable-512x512.png')
