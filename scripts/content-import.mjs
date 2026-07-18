// 編集済みCSV(content/*.csv)を検証してシードJSON(src/seed/content/*.json)を再生成する
// 実行: npm run content:import
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import {
  LANG_LABEL, SKILL_LABEL, TYPE_LABEL, AUDIENCE_LABEL, ORIGIN_LABEL, parseCsv, toCode,
} from './content-lib.mjs'

const errors = []
const warnings = []

function loadCsv(path, expectedHeaderStart) {
  if (!existsSync(path)) {
    errors.push(`${path} が見つかりません(先に npm run content:export を実行してください)`)
    return null
  }
  const rows = parseCsv(readFileSync(path, 'utf8'))
  if (rows.length < 2) {
    errors.push(`${path}: データ行がありません`)
    return null
  }
  if (rows[0][0] !== expectedHeaderStart) {
    errors.push(`${path}: 1行目のヘッダーが想定と異なります(先頭列は「${expectedHeaderStart}」のはず)`)
    return null
  }
  return rows.slice(1)
}

function parseStage(v, file, rowNo) {
  const n = Number(String(v).trim())
  if (!Number.isInteger(n) || n < 1 || n > 6) {
    errors.push(`${file} 行${rowNo}: 段階「${v}」は1〜6の整数で指定してください`)
    return null
  }
  return n
}

/* ---- cando.csv ---- */
const candoRows = loadCsv('content/cando.csv', '言語')
let cando = null
if (candoRows) {
  cando = []
  candoRows.forEach((r, i) => {
    const rowNo = i + 2
    const [langV, stageV, skillV, text] = r
    if (!String(text ?? '').trim()) {
      warnings.push(`cando.csv 行${rowNo}: 文言が空のためスキップしました`)
      return
    }
    const lang = toCode(langV, LANG_LABEL, '言語', rowNo, errors)
    const stage = parseStage(stageV, 'cando.csv', rowNo)
    const skill = toCode(skillV, SKILL_LABEL, '技能', rowNo, errors)
    if (lang && stage && skill) cando.push({ lang, stage, skill, text: String(text).trim() })
  })
  // 段階×技能ごとの項目数の目安チェック(2〜4項目推奨)
  const counts = {}
  for (const r of cando) counts[`${r.lang}-S${r.stage}-${r.skill}`] = (counts[`${r.lang}-S${r.stage}-${r.skill}`] ?? 0) + 1
  for (const [key, n] of Object.entries(counts)) {
    if (n > 6) warnings.push(`cando: ${key} が${n}項目あります(多すぎるかもしれません)`)
  }
}

/* ---- cells.csv ---- */
const cellRows = loadCsv('content/cells.csv', '言語')
let cells = null
if (cellRows) {
  cells = []
  const seen = new Set()
  cellRows.forEach((r, i) => {
    const rowNo = i + 2
    const [langV, stageV, foreign, native, tip, source, sumL, sumS, sumR, sumW] = r
    const lang = toCode(langV, LANG_LABEL, '言語', rowNo, errors)
    const stage = parseStage(stageV, 'cells.csv', rowNo)
    if (!lang || !stage) return
    const key = `${lang}-${stage}`
    if (seen.has(key)) errors.push(`cells.csv 行${rowNo}: ${key} が重複しています`)
    seen.add(key)
    cells.push({
      lang, stage,
      benchmarks: { foreign: String(foreign ?? '').trim(), native: String(native ?? '').trim() },
      tip: String(tip ?? '').trim(),
      source: String(source ?? '').trim(),
      summaries: {
        ...(String(sumL ?? '').trim() && { listening: String(sumL).trim() }),
        ...(String(sumS ?? '').trim() && { speaking: String(sumS).trim() }),
        ...(String(sumR ?? '').trim() && { reading: String(sumR).trim() }),
        ...(String(sumW ?? '').trim() && { writing: String(sumW).trim() }),
      },
    })
  })
  // 6言語×6段階が揃っているか
  for (const lang of Object.keys(LANG_LABEL)) {
    for (let s = 1; s <= 6; s++) {
      if (!seen.has(`${lang}-${s}`)) warnings.push(`cells: ${LANG_LABEL[lang]} の段階${s}がありません`)
    }
  }
}

/* ---- materials.csv ---- */
const matRows = loadCsv('content/materials.csv', '教材名')
let materials = null
if (matRows) {
  materials = []
  const usedIds = new Set()
  let autoNo = 1
  matRows.forEach((r, i) => {
    const rowNo = i + 2
    const [title, typeV, langsV, skillsV, stagesV, audV, originV, url, note, id] = r
    if (!String(title ?? '').trim()) {
      warnings.push(`materials.csv 行${rowNo}: 教材名が空のためスキップしました`)
      return
    }
    const type = toCode(typeV, TYPE_LABEL, '種類', rowNo, errors)
    const langs = String(langsV ?? '').split(/[;、,]/).map((s) => s.trim()).filter(Boolean)
      .map((v) => toCode(v, LANG_LABEL, '言語', rowNo, errors))
    const skills = String(skillsV ?? '').split(/[;、,]/).map((s) => s.trim()).filter(Boolean)
      .map((v) => toCode(v, SKILL_LABEL, '技能', rowNo, errors))
    const stages = String(stagesV ?? '').split(/[;、,\-〜]/).map((s) => s.trim()).filter(Boolean)
      .map((v) => parseStage(v, 'materials.csv', rowNo))
    const audience = toCode(audV, AUDIENCE_LABEL, '対象者', rowNo, errors)
    const origin = toCode(originV, ORIGIN_LABEL, '入手', rowNo, errors)
    if (errors.length) return
    // 範囲表記(例 2-4)は展開する
    const stageSet = [...new Set(stages)].sort((a, b) => a - b)
    const expanded = stageSet.length === 2 && String(stagesV).match(/[-〜]/)
      ? Array.from({ length: stageSet[1] - stageSet[0] + 1 }, (_, k) => stageSet[0] + k)
      : stageSet
    let mid = String(id ?? '').trim()
    if (!mid) {
      do { mid = `m-new-${String(autoNo++).padStart(2, '0')}` } while (usedIds.has(mid))
      warnings.push(`materials.csv 行${rowNo}: 新規教材にID ${mid} を割り当てました`)
    }
    if (usedIds.has(mid)) errors.push(`materials.csv 行${rowNo}: 内部ID「${mid}」が重複しています`)
    usedIds.add(mid)
    materials.push({
      id: mid, title: String(title).trim(), type,
      languages: [...new Set(langs)], skills: [...new Set(skills)], stages: expanded,
      audience, origin,
      ...(String(url ?? '').trim() && { url: String(url).trim() }),
      ...(String(note ?? '').trim() && { note: String(note).trim() }),
    })
  })
}

/* ---- 結果 ---- */
if (warnings.length) console.log('⚠ 警告:\n  ' + warnings.join('\n  '))
if (errors.length) {
  console.error('✗ エラーがあるため取り込みを中止しました:\n  ' + errors.join('\n  '))
  process.exit(1)
}

const write = (p, data) => writeFileSync(p, JSON.stringify(data, null, 2) + '\n')
write('src/seed/content/cando.json', cando)
write('src/seed/content/cells.json', cells)
write('src/seed/content/materials.json', materials)

console.log(`✓ 取り込みました: Can-Do ${cando.length}項目 / セル ${cells.length} / 教材 ${materials.length}
次の手順: npm test で検証 → アプリの設定「初期テンプレートに戻す」または新しいブラウザで反映を確認`)
