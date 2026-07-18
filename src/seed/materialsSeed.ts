import type { Material } from '../types'
import materialsData from './content/materials.json'

/**
 * 推奨教材のシード。
 * 実データは src/seed/content/materials.json が正で、CSVで編集できる:
 *   npm run content:export → content/materials.csv(Excel等で編集)
 *   npm run content:import → 編集済みCSVを取り込み JSON を再生成
 *
 * コンテンツの設計方針(docs/level-design.md に準拠):
 * - 各言語に「現地教材(origin: 'local')」最低3点・「大人向け(audience: 'adult')」最低3点
 * - 実在する定番教材のみ(不確かな固有名詞は「段階別リーダー」等の一般名称に)
 */
export const MATERIALS_SEED: Material[] = materialsData as unknown as Material[]
