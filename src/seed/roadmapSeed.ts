import type { CanDoItem, Cell, Lang, Skill } from '../types'
import candoData from './content/cando.json'
import cellData from './content/cells.json'

/**
 * マスターロードマップのシード。
 * 実データは src/seed/content/*.json が正で、CSVで編集できる:
 *   npm run content:export  → content/*.csv に書き出し(Excel等で編集)
 *   npm run content:import  → 編集済みCSVを取り込み JSON を再生成
 * このファイルは JSON からセル・Can-Do項目を組み立てるだけの薄い層。
 *
 * コンテンツの設計方針(docs/level-design.md に準拠):
 * - Can-Do項目は「年齢非依存の行動表現」。子供も大人も同じ項目で判定できる文にする
 * - 役割(母語/外国語)の違いは Cell.benchmarks の foreign / native 表示にだけ反映
 * - 各技能に検定以外の項目を必ず併存させる。S6 は大人の運用を想定
 */

interface CandoRow {
  lang: string
  stage: number
  skill: string
  text: string
}

interface CellRow {
  lang: string
  stage: number
  benchmarks: { foreign: string; native: string }
  tip: string
  source: string
  summaries: Partial<Record<Skill, string>>
}

export const SKILL_CODE: Record<Skill, string> = {
  listening: 'l',
  speaking: 's',
  reading: 'r',
  writing: 'w',
}

export const SEEDABLE_LANGS: Lang[] = ['ja', 'en', 'zh', 'ko', 'pt', 'es']

/**
 * 1言語分のシード(セル+Can-Do項目)を生成。
 * 項目IDは `${lang}-${stage}-${skillCode}-${n}`(nは同一 段階×技能 内の登場順)。
 * JSONの行順がそのまま順序になるため、行を並べ替えるとIDも変わる点に注意
 * (既存ユーザーのチェック記録はIDに紐づく)。
 */
export function buildLangSeed(lang: Lang): { cells: Cell[]; items: CanDoItem[] } {
  const cells: Cell[] = (cellData as CellRow[])
    .filter((c) => c.lang === lang)
    .map((c) => ({
      id: `${lang}-${c.stage}`,
      lang,
      stage: c.stage,
      benchmarks: c.benchmarks,
      tip: c.tip,
      source: c.source || undefined,
      summaries: c.summaries,
    }))

  const counters: Record<string, number> = {}
  const items: CanDoItem[] = (candoData as CandoRow[])
    .filter((r) => r.lang === lang)
    .map((r) => {
      const skill = r.skill as Skill
      const key = `${r.stage}-${skill}`
      const n = (counters[key] = (counters[key] ?? 0) + 1)
      return {
        id: `${lang}-${r.stage}-${SKILL_CODE[skill]}-${n}`,
        lang,
        stage: r.stage,
        skill,
        text: r.text,
        order: n - 1,
      }
    })

  return { cells, items }
}

export function buildRoadmapSeed(): { cells: Cell[]; items: CanDoItem[] } {
  const cells: Cell[] = []
  const items: CanDoItem[] = []
  for (const lang of SEEDABLE_LANGS) {
    const s = buildLangSeed(lang)
    cells.push(...s.cells)
    items.push(...s.items)
  }
  return { cells, items }
}
