export type Lang = 'ja' | 'en' | 'zh' | 'ko' | 'pt' | 'es'
export type Skill = 'listening' | 'speaking' | 'reading' | 'writing'
export type MaterialType = 'book' | 'app' | 'online-lesson' | 'video' | 'workbook'
export type MaterialStatusValue = 'notStarted' | 'inProgress' | 'completed' | 'deferred'

/** 選択可能な言語(習得対象) */
export const ALL_LANGS: Lang[] = ['ja', 'en', 'zh', 'ko', 'pt', 'es']

/** メンバーの言語における役割 */
export type Role = 'native' | 'foreign1' | 'foreign2'
export const ROLES: Role[] = ['native', 'foreign1', 'foreign2']

/**
 * レベル段階(全言語共通)。段階幅=1.0 のレベル軸で扱う。
 * ageHint/ageStart/ageEnd は「母語話者の◯歳相当」という参考表示・
 * 子供の母語トラックでの実年齢比較にのみ用いる(判定には使わない)。
 */
export interface Stage {
  idx: number // 1〜6
  name: string
  cefr: string
  ageHint: string
  ageStart: number
  ageEnd: number
}

export const STAGES: Stage[] = [
  { idx: 1, name: '入門', cefr: 'Pre-A1', ageHint: '0〜5歳', ageStart: 0, ageEnd: 6 },
  { idx: 2, name: '初級', cefr: 'A1', ageHint: '6〜8歳', ageStart: 6, ageEnd: 9 },
  { idx: 3, name: '初中級', cefr: 'A2', ageHint: '9〜11歳', ageStart: 9, ageEnd: 12 },
  { idx: 4, name: '中級', cefr: 'B1', ageHint: '12〜14歳', ageStart: 12, ageEnd: 15 },
  { idx: 5, name: '中上級', cefr: 'B2', ageHint: '15〜18歳', ageStart: 15, ageEnd: 19 },
  { idx: 6, name: '上級', cefr: 'C1〜', ageHint: '大学以降', ageStart: 19, ageEnd: 23 },
]

export const SKILLS: Skill[] = ['listening', 'speaking', 'reading', 'writing']

/** メンバーごとの言語構成(役割・目標レベル・目標時期・判定ペース) */
export interface MemberLanguage {
  lang: Lang
  role: Role
  targetStage: number // 1〜6
  targetDate?: string | null // YYYY-MM-DD 目標時期(任意)
  pace: number // 1=しっかり、0.75=ゆるめ
}

/** デフォルトの言語構成(母語=S6 / 第一外国語=S5 / 第二外国語=S4) */
export const DEFAULT_MEMBER_LANGS: MemberLanguage[] = [
  { lang: 'ja', role: 'native', targetStage: 6, targetDate: null, pace: 1 },
  { lang: 'en', role: 'foreign1', targetStage: 5, targetDate: null, pace: 1 },
  { lang: 'zh', role: 'foreign2', targetStage: 4, targetDate: null, pace: 1 },
]

/** Can-Do項目(ロードマップの最小単位) */
export interface CanDoItem {
  id: string // `${lang}-${stage}-${skillCode}-${n}`
  lang: Lang
  stage: number // STAGES.idx (1〜6)
  skill: Skill
  text: string
  order: number
}

/** 言語×段階のセル(目安・取り組み方) */
export interface Cell {
  id: string // `${lang}-${stage}`
  lang: Lang
  stage: number
  /** 役割別ベンチマーク(外国語トラック / 母語トラック) */
  benchmarks: { foreign: string; native: string }
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
  stages: number[] // 対象段階(STAGES.idx)
  audience: 'child' | 'adult' | 'all'
  origin: 'japan' | 'local'
  url?: string
  note?: string
}

/** 教材の取り組み状況(メンバーごと) */
export interface MaterialStatus {
  id: string // `${memberId}:${materialId}`
  memberId: string
  materialId: string
  status: MaterialStatusValue
}

/** 家族メンバー(大人・子供) */
export interface Member {
  id: string
  name: string
  kind: 'adult' | 'child'
  birthDate: string | null // YYYY-MM-DD(大人は任意で null 可)
  note?: string
  languages: MemberLanguage[]
}

export interface CheckRecord {
  id: string // `${memberId}:${itemId}`
  memberId: string
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
  members: Member[]
  checks: CheckRecord[]
  materialStatuses?: MaterialStatus[]
  settings?: AppSetting[]
  roadmap: {
    cells: Cell[]
    items: CanDoItem[]
    materials: Material[]
  }
}
