import { BANDS, type CanDoItem, type Lang, type Material, type Skill } from '../types'

export type Status = 'ahead' | 'onTrack' | 'slightBehind' | 'attention' | 'unrecorded'

export interface Attainment {
  /** 到達年齢相当(小数年)。チェック0件なら null(未記録) */
  attained: number | null
  status: Status
  /** 実年齢との差(月数、正=先行)。未記録なら null */
  gapMonths: number | null
  /** 上位帯にチェックがあるのに未完了の下位帯(確認促し対象) */
  warningBands: number[]
  /** 帯ごとのチェック率(項目なしは null) */
  bandRatios: (number | null)[]
  checkedCount: number
  totalCount: number
}

const MAX_AGE = 19

/**
 * チェック状態から到達年齢相当を算出する(仕様 F3)。
 * - 下から連続して全項目チェック済みの最上位帯を確定域とする
 * - 到達年齢相当 = 確定域の上端年齢 + 次帯のチェック率 × 帯の年数
 * - 帯が飛んでいる場合は最上位のチェック済み帯を尊重しつつ warningBands を返す
 */
export function computeAttainment(
  items: CanDoItem[],
  checkedIds: Set<string>,
  actualAge: number,
  /** 判定ペース係数(1=標準。0.75なら「実年齢×0.75」を基準に順調/遅れを判定) */
  paceFactor = 1,
): Attainment {
  const byBand = BANDS.map((b) => items.filter((i) => i.band === b.idx))
  const counts = byBand.map((list) => list.filter((i) => checkedIds.has(i.id)).length)
  const ratios = byBand.map((list, i) => (list.length ? counts[i] / list.length : null))
  const totalCount = items.length
  const checkedCount = counts.reduce((a, b) => a + b, 0)

  if (checkedCount === 0) {
    return {
      attained: null,
      status: 'unrecorded',
      gapMonths: null,
      warningBands: [],
      bandRatios: ratios,
      checkedCount,
      totalCount,
    }
  }

  // 確定域 k:下から連続して完了している最上位帯(項目のない帯は完了扱い)
  let k = -1
  for (let i = 0; i < BANDS.length; i++) {
    const r = ratios[i]
    if (r === null || r === 1) k = i
    else break
  }

  // h:チェックが1件以上ある最上位帯
  let h = 0
  for (let i = 0; i < BANDS.length; i++) if (counts[i] > 0) h = i

  let attained: number
  const warningBands: number[] = []

  if (h <= k) {
    // チェックのある範囲まですべて完了
    attained = BANDS[k].end
  } else if (h === k + 1) {
    // 通常ケース:確定域の次の帯が進行中
    const b = BANDS[h]
    attained = b.start + (ratios[h] ?? 0) * (b.end - b.start)
  } else {
    // 帯が飛んでいる:最上位チェック帯を尊重しつつ下位の未完了帯を警告
    for (let i = k + 1; i < h; i++) {
      if (byBand[i].length > 0 && (ratios[i] ?? 1) < 1) warningBands.push(i)
    }
    const b = BANDS[h]
    attained = b.start + (ratios[h] ?? 0) * (b.end - b.start)
  }

  attained = Math.min(attained, MAX_AGE)
  // 傾斜:期待値は「実年齢×ペース係数」。テンプレート自体の傾斜に加えて緩められる
  const expected = Math.min(actualAge * paceFactor, MAX_AGE)
  const gap = attained - expected
  const gapMonths = Math.round(gap * 12)
  const status: Status =
    gap >= 0.5 ? 'ahead' : gap >= -0.5 ? 'onTrack' : gap >= -1.5 ? 'slightBehind' : 'attention'

  return { attained, status, gapMonths, warningBands, bandRatios: ratios, checkedCount, totalCount }
}

/**
 * 過去時点の再構成:達成日が対象日以前のチェックだけを残す(仕様 F5)。
 * YYYY-MM-DD の文字列比較で成立する。
 */
export function checkedIdsAsOf(
  checks: { itemId: string; achievedOn: string }[],
  onDate: string,
): Set<string> {
  return new Set(checks.filter((c) => c.achievedOn <= onDate).map((c) => c.itemId))
}

export function bandOfAge(age: number): number {
  const b = BANDS.find((b) => age >= b.start && age < b.end)
  return b ? b.idx : BANDS[BANDS.length - 1].idx
}

/** 帯ごとの週あたり取り組み時間目安(分) */
export const WEEKLY_MINUTES = [60, 90, 120, 150, 180, 210]

export interface PlanStep {
  bandIdxs: number[]
  label: string
  items: CanDoItem[]
  materials: Material[]
  weeklyMinutes: number
  months: number
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1]
}

export function matchMaterials(
  materials: Material[],
  lang: Lang,
  skill: Skill,
  ageRange: [number, number],
): Material[] {
  return materials.filter(
    (m) => m.languages.includes(lang) && m.skills.includes(skill) && rangesOverlap(m.ageRange, ageRange),
  )
}

/**
 * キャッチアッププラン生成(仕様 F4)。ルールベース・オフライン動作。
 * 未チェック項目(現在地〜実年齢帯)をタスク化し、年齢帯順に最大4ステップへまとめる。
 */
export function generatePlan(
  lang: Lang,
  skill: Skill,
  items: CanDoItem[],
  checkedIds: Set<string>,
  actualAge: number,
  materials: Material[],
  targetMonths: number,
): PlanStep[] {
  const upTo = bandOfAge(actualAge)
  const groups: { bandIdxs: number[]; items: CanDoItem[] }[] = []
  for (let i = 0; i <= upTo; i++) {
    const unchecked = items
      .filter((it) => it.band === i && !checkedIds.has(it.id))
      .sort((a, b) => a.order - b.order)
    if (unchecked.length > 0) groups.push({ bandIdxs: [i], items: unchecked })
  }
  if (groups.length === 0) return []

  // 4ステップ以下になるまで下から隣接グループを結合
  while (groups.length > 4) {
    const merged = {
      bandIdxs: [...groups[0].bandIdxs, ...groups[1].bandIdxs],
      items: [...groups[0].items, ...groups[1].items],
    }
    groups.splice(0, 2, merged)
  }

  const totalItems = groups.reduce((a, g) => a + g.items.length, 0)
  return groups.map((g) => {
    const lo = BANDS[g.bandIdxs[0]]
    const hi = BANDS[g.bandIdxs[g.bandIdxs.length - 1]]
    const label = lo.idx === hi.idx ? lo.label : `${lo.label.replace('歳', '')}〜${hi.label}`
    return {
      bandIdxs: g.bandIdxs,
      label,
      items: g.items,
      materials: matchMaterials(materials, lang, skill, [lo.start, hi.end - 1]).slice(0, 3),
      weeklyMinutes: WEEKLY_MINUTES[hi.idx],
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
}

export interface SkillGap {
  lang: Lang
  skill: Skill
  attainment: Attainment
}

/** 全 言語×技能 のギャップを悪い順に並べて返す(langs=選択中の第一〜第三言語、paces=位置別の判定ペース) */
export function allSkillGaps(
  items: CanDoItem[],
  checkedIds: Set<string>,
  actualAge: number,
  langs: Lang[],
  paces: number[] = [1, 1, 1],
): SkillGap[] {
  const skills: Skill[] = ['listening', 'speaking', 'reading', 'writing']
  const out: SkillGap[] = []
  for (const lang of langs) {
    const pace = paces[langs.indexOf(lang)] ?? 1
    for (const skill of skills) {
      const subset = items.filter((i) => i.lang === lang && i.skill === skill)
      if (subset.length === 0) continue
      out.push({ lang, skill, attainment: computeAttainment(subset, checkedIds, actualAge, pace) })
    }
  }
  return out.sort((a, b) => {
    const p = STATUS_PRIORITY[a.attainment.status] - STATUS_PRIORITY[b.attainment.status]
    if (p !== 0) return p
    return (a.attainment.gapMonths ?? 0) - (b.attainment.gapMonths ?? 0)
  })
}

export interface RecommendedAction {
  item: CanDoItem
  lang: Lang
  skill: Skill
  status: Status
}

/** ホームの「直近の推奨アクション」:優先度の高い技能から次の未チェック項目を1つずつ */
export function recommendedActions(
  items: CanDoItem[],
  checkedIds: Set<string>,
  actualAge: number,
  langs: Lang[],
  paces: number[] = [1, 1, 1],
  count = 3,
): RecommendedAction[] {
  const gaps = allSkillGaps(items, checkedIds, actualAge, langs, paces)
  const out: RecommendedAction[] = []
  for (const g of gaps) {
    if (out.length >= count) break
    const next = items
      .filter((i) => i.lang === g.lang && i.skill === g.skill && !checkedIds.has(i.id))
      .sort((a, b) => a.band - b.band || a.order - b.order)[0]
    if (next) out.push({ item: next, lang: g.lang, skill: g.skill, status: g.attainment.status })
  }
  return out
}
