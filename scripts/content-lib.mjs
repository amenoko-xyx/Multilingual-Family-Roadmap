// CSV⇔JSON 変換の共通定義(content-export.mjs / content-import.mjs から利用)

export const LANG_LABEL = {
  ja: '日本語', en: '英語', zh: '中国語', ko: '韓国語', pt: 'ポルトガル語', es: 'スペイン語',
}
export const SKILL_LABEL = { listening: '聞く', speaking: '話す', reading: '読む', writing: '書く' }
export const TYPE_LABEL = { book: '本', app: 'アプリ', 'online-lesson': 'オンライン', video: '動画', workbook: 'ワーク' }
export const AUDIENCE_LABEL = { child: '子供', adult: '大人', all: '共通' }
export const ORIGIN_LABEL = { japan: '日本', local: '現地' }

export const invert = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]))

/** ラベル or コードのどちらでも受け付けてコードに正規化する */
export function toCode(value, labelMap, field, rowNo, errors) {
  const v = String(value ?? '').trim()
  if (v in labelMap) return v // すでにコード
  const rev = invert(labelMap)
  if (v in rev) return rev[v]
  errors.push(`行${rowNo}: ${field}「${v}」が不正です(許容: ${Object.values(labelMap).join('/')} またはコード)`)
  return null
}

/** RFC4180準拠の簡易CSVパーサ(引用符・改行・カンマ対応、BOM除去) */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '')
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell); cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) { row.push(cell); if (row.length > 1 || row[0] !== '') rows.push(row) }
  return rows
}

/** CSVセルのエスケープ */
export function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/** 行列→CSV文字列(ExcelでUTF-8を正しく開けるようBOM付き) */
export function toCsv(rows) {
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
