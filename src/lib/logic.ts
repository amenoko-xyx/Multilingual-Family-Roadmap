import { SKILLS, STAGES, type CanDoItem, type Lang, type Material, type Member, type MemberLanguage, type Skill } from '../types'
import { ageAt } from './dates'

export type Status = 'achieved' | 'ahead' | 'onTrack' | 'slightBehind' | 'attention' | 'unrecorded'

export interface LevelResult {
  /** 到達レベル(0〜6、段階幅=1.0)。チェック0件なら null(未記録) */
  level: number | null
  /** 上位段階にチェックがあるのに未完了の下位段階(確認促し対象・stage idx) */
  warningStages: number[]
  /** 段階ごとのチェック率(項目なしは null。position 0〜5 = 段階1〜6) */
  stageRatios: (number | null)[]
  checkedCount: number
  totalCount: number
}

const MAX_LEVEL = STAGES.length // 6

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * チェック状態から到達レベル(0〜6、段階幅=1.0)を算出する。
 * - 下から連続して全項目チェック済みの段数 k を確定域とする(項目のない段は完了扱い)
 * - 到達レベル = 確定域の段数 + 次段階のチェック率
 * - 段飛ばしの場合は最上位のチェック済み段を尊重しつつ warningStages を返す
 */
export function computeLevel(items: CanDoItem[], checkedIds: Set<string>): LevelResult {
  const byStage = STAGES.map((s) => items.filter((i) => i.stage === s.idx))
  const counts = byStage.map((list) => list.filter((i) => checkedIds.has(i.id)).length)
  const ratios = byStage.map((list, i) => (list.length ? counts[i] / list.length : null))
  const totalCount = items.length
  const checkedCount = counts.reduce((a, b) => a + b, 0)

  if (checkedCount === 0) {
    return { level: null, warningStages: [], stageRatios: ratios, checkedCount, totalCount }
  }

  // 確定域 k:下から連続して完了している最上位段(position。項目のない段は完了扱い)
  let k = -1
  for (let i = 0; i < STAGES.length; i++) {
    const r = ratios[i]
    if (r === null || r === 1) k = i
    else break
  }

  // h:チェックが1件以上ある最上位段
  let h = 0
  for (let i = 0; i < STAGES.length; i++) if (counts[i] > 0) h = i

  let level: number
  const warningStages: number[] = []

  if (h <= k) {
    // チェックのある範囲まですべて完了 → 完了段数がそのままレベル
    level = k + 1
  } else if (h === k + 1) {
    // 通常ケース:確定域の次の段が進行中(段 position h は level [h, h+1])
    level = h + (ratios[h] ?? 0)
  } else {
    // 段が飛んでいる:最上位チェック段を尊重しつつ下位の未完了段を警告
    for (let i = k + 1; i < h; i++) {
      if (byStage[i].length > 0 && (ratios[i] ?? 1) < 1) warningStages.push(STAGES[i].idx)
    }
    level = h + (ratios[h] ?? 0)
  }

  level = Math.min(level, MAX_LEVEL)
  return { level, warningStages, stageRatios: ratios, checkedCount, totalCount }
}

/**
 * 子供の母語トラック参考値:実年齢を STAGES の年齢目安で区分線形補間したレベル。
 * 例:age 10 → 段階3内 (10-9)/(12-9)=0.33 → 2.33。0〜6にクランプ。
 */
export function expectedChildNativeLevel(age: number): number {
  if (age <= 0) return 0
  for (const s of STAGES) {
    if (age < s.ageEnd) {
      const frac = (age - s.ageStart) / (s.ageEnd - s.ageStart)
      return clamp(s.idx - 1 + frac, 0, MAX_LEVEL)
    }
  }
  return MAX_LEVEL
}

function daysBetween(from: string, to: string): number {
  return (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000
}

export interface ProgressResult {
  status: Status
  /** 目標レベルに対する進捗比(level / targetStage)。未記録は null */
  progressRatio: number | null
  /** 子供の母語トラックのときの期待レベル(参考) */
  expected?: number
}

/**
 * 進捗判定。年齢は使わず「目標レベル×目標時期×ペース」に対して評価する。
 * 例外:子供の母語トラックのみ、実年齢由来の期待レベルと比較する。
 */
export function assessProgress(args: {
  level: number | null
  ml: MemberLanguage
  member: Member
  firstCheckOn: string | null
  today: string
}): ProgressResult {
  const { level, ml, member, firstCheckOn, today } = args

  // 1. 未記録
  if (level === null) return { status: 'unrecorded', progressRatio: null }

  const progressRatio = ml.targetStage > 0 ? level / ml.targetStage : null

  // 2. 目標レベル到達済み
  if (level >= ml.targetStage) return { status: 'achieved', progressRatio }

  // 3. 子供の母語トラック:実年齢由来の期待レベルと比較
  if (member.kind === 'child' && ml.role === 'native' && member.birthDate) {
    const age = ageAt(member.birthDate, today)
    const expected = expectedChildNativeLevel(age) * ml.pace
    const diff = level - expected
    const status: Status =
      diff >= 0.25 ? 'ahead' : diff >= -0.25 ? 'onTrack' : diff >= -0.75 ? 'slightBehind' : 'attention'
    return { status, progressRatio, expected }
  }

  // 4. 目標時期あり:経過時間比と進捗比を突き合わせる
  if (ml.targetDate && firstCheckOn) {
    // 目標時期を過ぎているのに未達 → 要注意
    if (today > ml.targetDate) return { status: 'attention', progressRatio }
    const total = daysBetween(firstCheckOn, ml.targetDate)
    const elapsed = daysBetween(firstCheckOn, today)
    const timeRatio = total > 0 ? clamp(elapsed / total, 0, 1) : 1
    const diff = (progressRatio ?? 0) - timeRatio
    const status: Status =
      diff >= 0.1 ? 'ahead' : diff >= -0.1 ? 'onTrack' : diff >= -0.25 ? 'slightBehind' : 'attention'
    return { status, progressRatio }
  }

  // 5. 目標時期なし:遅れの概念なし。記録があれば順調とみなす
  return { status: 'onTrack', progressRatio }
}

/**
 * 過去時点の再構成:達成日が対象日以前のチェックだけを残す。
 * YYYY-MM-DD の文字列比較で成立する。
 */
export function checkedIdsAsOf(
  checks: { itemId: string; achievedOn: string }[],
  onDate: string,
): Set<string> {
  return new Set(checks.filter((c) => c.achievedOn <= onDate).map((c) => c.itemId))
}

/** ある言語の最初のチェック達成日(itemId が `${lang}-` で始まる。なければ null) */
export function firstCheckOnFor(
  checks: { itemId: string; achievedOn: string }[],
  lang: Lang,
): string | null {
  let min: string | null = null
  for (const c of checks) {
    if (c.itemId.startsWith(`${lang}-`) && (min === null || c.achievedOn < min)) min = c.achievedOn
  }
  return min
}

/** 段階ごとの週あたり取り組み時間目安(分)。stage 1〜6 */
export const WEEKLY_MINUTES = [60, 90, 120, 150, 180, 210]

export interface PlanStep {
  stageIdxs: number[]
  label: string
  items: CanDoItem[]
  materials: Material[]
  weeklyMinutes: number
  months: number
}

/** プラン等のステップ見出し(`S3・初中級` / `S1〜S3`) */
function stageStepLabel(lo: number, hi: number): string {
  if (lo === hi) {
    const s = STAGES.find((x) => x.idx === lo)
    return s ? `S${lo}・${s.name}` : `S${lo}`
  }
  return `S${lo}〜S${hi}`
}

export function matchMaterials(
  materials: Material[],
  lang: Lang,
  skill: Skill,
  stages: number[],
  memberKind: 'adult' | 'child',
): Material[] {
  return materials.filter(
    (m) =>
      m.languages.includes(lang) &&
      m.skills.includes(skill) &&
      m.stages.some((s) => stages.includes(s)) &&
      (m.audience === 'all' || (memberKind === 'child' ? m.audience === 'child' : m.audience === 'adult')),
  )
}

/**
 * キャッチアッププラン生成。ルールベース・オフライン動作。
 * 未チェック項目(段階1〜targetStage)をタスク化し、段階順に最大4ステップへまとめる。
 */
export function generatePlan(
  lang: Lang,
  skill: Skill,
  items: CanDoItem[],
  checkedIds: Set<string>,
  targetStage: number,
  materials: Material[],
  memberKind: 'adult' | 'child',
  targetMonths: number,
): PlanStep[] {
  const groups: { stageIdxs: number[]; items: CanDoItem[] }[] = []
  for (let s = 1; s <= targetStage; s++) {
    const unchecked = items
      .filter((it) => it.stage === s && !checkedIds.has(it.id))
      .sort((a, b) => a.order - b.order)
    if (unchecked.length > 0) groups.push({ stageIdxs: [s], items: unchecked })
  }
  if (groups.length === 0) return []

  // 4ステップ以下になるまで下から隣接グループを結合
  while (groups.length > 4) {
    const merged = {
      stageIdxs: [...groups[0].stageIdxs, ...groups[1].stageIdxs],
      items: [...groups[0].items, ...groups[1].items],
    }
    groups.splice(0, 2, merged)
  }

  const totalItems = groups.reduce((a, g) => a + g.items.length, 0)
  return groups.map((g) => {
    const lo = g.stageIdxs[0]
    const hi = g.stageIdxs[g.stageIdxs.length - 1]
    return {
      stageIdxs: g.stageIdxs,
      label: stageStepLabel(lo, hi),
      items: g.items,
      materials: matchMaterials(materials, lang, skill, g.stageIdxs, memberKind).slice(0, 3),
      weeklyMinutes: WEEKLY_MINUTES[hi - 1],
      months: Math.max(1, Math.round((targetMonths * g.items.length) / totalItems)),
    }
  })
}

const STATUS_PRIORITY: Record<Status, number> = {
  attention: 0,
  slightBehind: 1,
  unrecorded: 2,
  onTrack: 3,
  ahead: 4,
  achieved: 5,
}

export interface SkillGap {
  lang: Lang
  skill: Skill
  ml: MemberLanguage
  result: LevelResult
  status: Status
  progressRatio: number | null
  expected?: number
}

/** メンバーの言語構成 × 4技能のギャップを、severity(悪い順)で並べて返す */
export function allSkillGaps(
  items: CanDoItem[],
  checks: { itemId: string; achievedOn: string }[],
  member: Member,
  today: string,
): SkillGap[] {
  const checkedIds = new Set(checks.map((c) => c.itemId))
  const out: SkillGap[] = []
  for (const ml of member.languages) {
    const firstCheckOn = firstCheckOnFor(checks, ml.lang)
    for (const skill of SKILLS) {
      const subset = items.filter((i) => i.lang === ml.lang && i.skill === skill)
      if (subset.length === 0) continue
      const result = computeLevel(subset, checkedIds)
      const { status, progressRatio, expected } = assessProgress({
        level: result.level,
        ml,
        member,
        firstCheckOn,
        today,
      })
      out.push({ lang: ml.lang, skill, ml, result, status, progressRatio, expected })
    }
  }
  return out.sort((a, b) => {
    const p = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
    if (p !== 0) return p
    return (a.result.level ?? 0) - (b.result.level ?? 0)
  })
}

export interface RecommendedAction {
  item: CanDoItem
  lang: Lang
  skill: Skill
  status: Status
}

/** ホームの「直近の推奨アクション」:優先度の高い技能から次の未チェック項目を1つずつ(達成済みはスキップ) */
export function recommendedActions(
  items: CanDoItem[],
  checks: { itemId: string; achievedOn: string }[],
  member: Member,
  today: string,
  count = 3,
): RecommendedAction[] {
  const checkedIds = new Set(checks.map((c) => c.itemId))
  const gaps = allSkillGaps(items, checks, member, today)
  const out: RecommendedAction[] = []
  for (const g of gaps) {
    if (out.length >= count) break
    if (g.status === 'achieved') continue
    const next = items
      .filter((i) => i.lang === g.lang && i.skill === g.skill && !checkedIds.has(i.id))
      .sort((a, b) => a.stage - b.stage || a.order - b.order)[0]
    if (next) out.push({ item: next, lang: g.lang, skill: g.skill, status: g.status })
  }
  return out
}
