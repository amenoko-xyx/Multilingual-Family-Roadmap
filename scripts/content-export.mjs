// シードJSON(src/seed/content/*.json)を編集用CSV(content/*.csv)に書き出す
// 実行: npm run content:export
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { LANG_LABEL, SKILL_LABEL, TYPE_LABEL, AUDIENCE_LABEL, ORIGIN_LABEL, toCsv } from './content-lib.mjs'

const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
const cando = read('src/seed/content/cando.json')
const cells = read('src/seed/content/cells.json')
const materials = read('src/seed/content/materials.json')

mkdirSync('content', { recursive: true })

// ---- cando.csv(Can-Do項目)----
{
  const rows = [['言語', '段階', '技能', '文言']]
  for (const r of cando) rows.push([LANG_LABEL[r.lang], r.stage, SKILL_LABEL[r.skill], r.text])
  writeFileSync('content/cando.csv', toCsv(rows))
}

// ---- cells.csv(段階ごとの目安・取り組み)----
{
  const rows = [[
    '言語', '段階', '目安_外国語として', '目安_母語として', '取り組みのヒント', '根拠メモ',
    '概要_聞く', '概要_話す', '概要_読む', '概要_書く',
  ]]
  for (const c of cells) {
    rows.push([
      LANG_LABEL[c.lang], c.stage, c.benchmarks.foreign, c.benchmarks.native, c.tip, c.source,
      c.summaries.listening ?? '', c.summaries.speaking ?? '', c.summaries.reading ?? '', c.summaries.writing ?? '',
    ])
  }
  writeFileSync('content/cells.csv', toCsv(rows))
}

// ---- materials.csv(教材)----
{
  const rows = [[
    '教材名', '種類', '言語', '技能', '段階', '対象者', '入手', 'URL', 'メモ', '内部ID(編集しない)',
  ]]
  for (const m of materials) {
    rows.push([
      m.title,
      TYPE_LABEL[m.type],
      m.languages.map((l) => LANG_LABEL[l]).join(';'),
      m.skills.map((s) => SKILL_LABEL[s]).join(';'),
      m.stages.join(';'),
      AUDIENCE_LABEL[m.audience],
      ORIGIN_LABEL[m.origin],
      m.url ?? '',
      m.note ?? '',
      m.id,
    ])
  }
  writeFileSync('content/materials.csv', toCsv(rows))
}

console.log(`書き出しました:
  content/cando.csv      (${cando.length}項目)
  content/cells.csv      (${cells.length}セル)
  content/materials.csv  (${materials.length}教材)
Excel / Numbers / Googleスプレッドシートで編集 → npm run content:import で反映できます。`)
