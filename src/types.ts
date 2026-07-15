export type Lang = 'ja' | 'en' | 'zh' | 'yue' | 'pt' | 'es'
export type Skill = 'listening' | 'speaking' | 'reading' | 'writing'
export type MaterialType = 'book' | 'app' | 'online-lesson' | 'video' | 'workbook'
export type MaterialStatusValue = 'notStarted' | 'inProgress' | 'completed' | 'deferred'

/** 選択可能な言語(習得対象) */
export const ALL_LANGS: Lang[] = ['ja', 'en', 'zh', 'yue', 'pt', 'es']

/** デフォルトの第一・第二・第三言語(第三言語は任意で、2言語運用も可) */
export const DEFAULT_LANGS: Lang[] = ['ja', 'en', 'zh']

export interface AgeBand {
  idx: number
  label: string
  start: number // 歳(含む)
  end: number // 歳(含まない)
}

export const BANDS: AgeBand[] = [
  { idx: 0, label: '0-2歳', start: 0, end: 3 },
  { idx: 1, label: '3-5歳', start: 3, end: 6 },
  { idx: 2, label: '6-8歳', start: 6, end: 9 },
  { idx: 3, label: '9-11歳', start: 9, end: 12 },
  { idx: 4, label: '12-14歳', start: 12, end: 15 },
  { idx: 5, label: '15-18歳', start: 15, end: 19 },
]

export const SKILLS: Skill[] = ['listening', 'speaking', 'reading', 'writing']

/** Can-Do項目(ロードマップの最小単位) */
export interface CanDoItem {
  id: string
  lang: Lang
  band: number // BANDS.idx
  skill: Skill
  text: string
  order: number
}

/** 言語×年齢帯のセル(目安・取り組み方) */
export interface Cell {
  id: string // `${lang}-${band}`
  lang: Lang
  band: number
  benchmark: string // 外部指標との対応
  tip: string // 家庭での取り組み例
  source?: string // 出典・根拠メモ
  summaries: Partial<Record<Skill, string>>
}

export interface Material {
  id: string
  title: string
  type: MaterialType
  languages: Lang[]
  skills: Skill[]
  ageRange: [number, number]
  url?: string
  note?: string
}

/** 教材の取り組み状況(子供ごと) */
export interface MaterialStatus {
  id: string // `${childId}:${materialId}`
  childId: string
  materialId: string
  status: MaterialStatusValue
}

export interface Child {
  id: string
  name: string
  birthDate: string // YYYY-MM-DD
  note?: string
}

export interface CheckRecord {
  id: string // `${childId}:${itemId}`
  childId: string
  itemId: string
  achievedOn: string // YYYY-MM-DD 達成日(後追い修正可)
  recordedAt: string // ISO8601 記録日時
  note?: string
}

export interface AppSetting {
  key: string
  value: unknown
}

export interface ExportData {
  app: 'trilingual-roadmap'
  version: number
  exportedAt: string
  children: Child[]
  checks: CheckRecord[]
  materialStatuses?: MaterialStatus[]
  settings?: AppSetting[]
  roadmap: {
    cells: Cell[]
    items: CanDoItem[]
    materials: Material[]
  }
}
