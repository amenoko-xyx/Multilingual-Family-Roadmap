import { describe, expect, it } from 'vitest'
import type { CanDoItem, Lang, Material, Skill } from '../types'
import {
  allSkillGaps,
  checkedIdsAsOf,
  computeAttainment,
  generatePlan,
  matchMaterials,
  recommendedActions,
} from './logic'

function makeItems(perBand: number[]): CanDoItem[] {
  const items: CanDoItem[] = []
  perBand.forEach((n, band) => {
    for (let i = 0; i < n; i++) {
      items.push({ id: `en-${band}-r-${i + 1}`, lang: 'en', band, skill: 'reading', text: `item ${band}-${i}`, order: i })
    }
  })
  return items
}

/** makeItems の多言語・多技能版(id衝突を避けるため lang/skill を含める) */
function makeItemsFor(lang: Lang, skill: Skill, perBand: number[]): CanDoItem[] {
  const items: CanDoItem[] = []
  perBand.forEach((n, band) => {
    for (let i = 0; i < n; i++) {
      items.push({ id: `${lang}-${skill}-${band}-${i + 1}`, lang, band, skill, text: `item ${band}-${i}`, order: i })
    }
  })
  return items
}

function checkedSet(items: CanDoItem[], pick: (item: CanDoItem) => boolean): Set<string> {
  return new Set(items.filter(pick).map((i) => i.id))
}

describe('computeAttainment(到達年齢相当の算出)', () => {
  it('仕様の例:6-8歳帯まで全チェック、9-11歳帯は4項目中2項目 → 10.5歳相当', () => {
    const items = makeItems([2, 2, 2, 4, 2, 2])
    const checked = checkedSet(items, (i) => i.band <= 2 || (i.band === 3 && i.order < 2))
    const a = computeAttainment(items, checked, 10)
    expect(a.attained).toBeCloseTo(10.5, 5)
    expect(a.warningBands).toEqual([])
  })

  it('チェック0件は未記録(遅れとは区別)', () => {
    const items = makeItems([2, 2, 2])
    const a = computeAttainment(items, new Set(), 7)
    expect(a.attained).toBeNull()
    expect(a.status).toBe('unrecorded')
    expect(a.gapMonths).toBeNull()
  })

  it('最初の帯が進行中:0-2歳帯で半分チェック → 1.5歳相当', () => {
    const items = makeItems([4])
    const checked = checkedSet(items, (i) => i.order < 2)
    const a = computeAttainment(items, checked, 1)
    expect(a.attained).toBeCloseTo(1.5, 5)
  })

  it('帯が飛んでいる場合:上位帯を尊重しつつ下位の未完了帯を警告する', () => {
    const items = makeItems([2, 2, 2, 2])
    // 0-2歳帯は完了、3-5歳帯は未完了(1/2)、9-11歳帯に1つチェック
    const checked = checkedSet(
      items,
      (i) => i.band === 0 || (i.band === 1 && i.order === 0) || (i.band === 3 && i.order === 0),
    )
    const a = computeAttainment(items, checked, 10)
    expect(a.warningBands).toContain(1)
    expect(a.warningBands).toContain(2)
    // 9-11歳帯(9歳始まり・3年幅)の半分 → 9 + 0.5*3 = 10.5
    expect(a.attained).toBeCloseTo(10.5, 5)
  })

  it('全帯完了なら19歳相当で頭打ち', () => {
    const items = makeItems([1, 1, 1, 1, 1, 1])
    const a = computeAttainment(items, checkedSet(items, () => true), 18)
    expect(a.attained).toBe(19)
  })

  it('判定ペース係数:ゆるめ(0.75)は期待値が実年齢×0.75になる', () => {
    const items = makeItems([2, 2, 2, 4, 2, 2])
    const checked = checkedSet(items, (i) => i.band <= 2 || (i.band === 3 && i.order < 2))
    // 到達10.5歳。実年齢13歳なら標準では-30ヶ月(要注意)だが、
    // ゆるめでは期待値 13×0.75=9.75歳 → +9ヶ月で先行になる
    expect(computeAttainment(items, checked, 13).status).toBe('attention')
    const relaxed = computeAttainment(items, checked, 13, 0.75)
    expect(relaxed.status).toBe('ahead')
    expect(relaxed.gapMonths).toBe(9)
    // 到達年齢相当そのものはペースの影響を受けない
    expect(relaxed.attained).toBeCloseTo(10.5, 5)
  })

  it('ステータス4段階+月数換算', () => {
    const items = makeItems([2, 2, 2, 4, 2, 2])
    const checked = checkedSet(items, (i) => i.band <= 2 || (i.band === 3 && i.order < 2))
    // 到達10.5歳
    expect(computeAttainment(items, checked, 10).status).toBe('ahead') // +6ヶ月
    expect(computeAttainment(items, checked, 10.6).status).toBe('onTrack')
    expect(computeAttainment(items, checked, 11.5).status).toBe('slightBehind') // -12ヶ月
    expect(computeAttainment(items, checked, 13).status).toBe('attention') // -30ヶ月
    expect(computeAttainment(items, checked, 11.17).gapMonths).toBe(-8) // 約8ヶ月遅れ
  })
})

describe('checkedIdsAsOf(過去時点の再構成)', () => {
  it('達成日が対象日以前のチェックだけを残す', () => {
    const checks = [
      { itemId: 'a', achievedOn: '2024-01-15' },
      { itemId: 'b', achievedOn: '2024-06-01' },
      { itemId: 'c', achievedOn: '2025-03-10' },
    ]
    expect(checkedIdsAsOf(checks, '2024-06-01')).toEqual(new Set(['a', 'b']))
    expect(checkedIdsAsOf(checks, '2024-05-31')).toEqual(new Set(['a']))
    expect(checkedIdsAsOf(checks, '2023-12-31').size).toBe(0)
    expect(checkedIdsAsOf(checks, '2026-01-01').size).toBe(3)
  })
})

describe('generatePlan(キャッチアッププラン生成)', () => {
  const materials: Material[] = [
    { id: 'm1', title: '幼児向け絵本', type: 'book', languages: ['en'], skills: ['reading'], ageRange: [0, 5] },
    { id: 'm2', title: '多読セット', type: 'book', languages: ['en'], skills: ['reading'], ageRange: [6, 9] },
    { id: 'm3', title: '中国語アプリ', type: 'app', languages: ['zh'], skills: ['reading'], ageRange: [0, 18] },
  ]

  it('未チェック項目を年齢帯順にタスク化し、教材と期間を割り当てる', () => {
    const items = makeItems([2, 2, 2])
    const checked = checkedSet(items, (i) => i.band === 0)
    const plan = generatePlan('en', 'reading', items, checked, 7, materials, 6)
    expect(plan.length).toBe(2) // 3-5歳帯と6-8歳帯
    expect(plan[0].items.every((i) => i.band === 1)).toBe(true)
    expect(plan[1].materials.map((m) => m.id)).toContain('m2')
    // 言語違いの教材は混ざらない
    expect(plan.flatMap((s) => s.materials).some((m) => m.id === 'm3')).toBe(false)
    // 期間はステップに配分される(合計≒targetMonths)
    const total = plan.reduce((a, s) => a + s.months, 0)
    expect(total).toBeGreaterThanOrEqual(4)
    expect(total).toBeLessThanOrEqual(8)
  })

  it('実年齢帯より上の項目はプランに含めない', () => {
    const items = makeItems([2, 2, 2, 2, 2, 2])
    const plan = generatePlan('en', 'reading', items, new Set(), 7, materials, 6)
    expect(plan.every((s) => s.items.every((i) => i.band <= 2))).toBe(true)
  })

  it('ステップは最大4つにまとめられる', () => {
    const items = makeItems([2, 2, 2, 2, 2, 2])
    const plan = generatePlan('en', 'reading', items, new Set(), 17, materials, 12)
    expect(plan.length).toBeLessThanOrEqual(4)
  })

  it('未チェックがなければ空プラン', () => {
    const items = makeItems([2, 2])
    const plan = generatePlan('en', 'reading', items, checkedSet(items, () => true), 5, materials, 6)
    expect(plan).toEqual([])
  })
})

describe('matchMaterials', () => {
  it('言語×技能×年齢帯でマッチングする', () => {
    const materials: Material[] = [
      { id: 'a', title: 'A', type: 'book', languages: ['en'], skills: ['reading'], ageRange: [0, 5] },
      { id: 'b', title: 'B', type: 'app', languages: ['en'], skills: ['listening'], ageRange: [0, 5] },
      { id: 'c', title: 'C', type: 'book', languages: ['en'], skills: ['reading'], ageRange: [10, 15] },
    ]
    const hit = matchMaterials(materials, 'en', 'reading', [3, 5])
    expect(hit.map((m) => m.id)).toEqual(['a'])
  })
})

describe('allSkillGaps(全言語×技能のギャップ抽出)', () => {
  // en-reading: 0-8歳帯完了+9-11歳帯半分 → 到達10.5歳(既存テストと同じ形)
  // en-listening: 全帯完了 → 到達19歳(頭打ち)
  // zh-reading / ja-reading: 未チェック → unrecorded
  function buildItems(): CanDoItem[] {
    return [
      ...makeItemsFor('en', 'reading', [2, 2, 2, 4, 2, 2]),
      ...makeItemsFor('en', 'listening', [2, 2, 2, 4, 2, 2]),
      ...makeItemsFor('zh', 'reading', [2, 2, 2, 4, 2, 2]),
      ...makeItemsFor('ja', 'reading', [2, 2, 2, 4, 2, 2]),
    ]
  }

  function buildChecked(items: CanDoItem[]): Set<string> {
    return checkedSet(items, (i) => {
      if (i.lang === 'en' && i.skill === 'reading') return i.band <= 2 || (i.band === 3 && i.order < 2)
      if (i.lang === 'en' && i.skill === 'listening') return true
      return false // zh-reading, ja-reading は未チェックのまま
    })
  }

  it('指定した langs のみが対象になる', () => {
    const items = buildItems()
    const checked = buildChecked(items)
    const gaps = allSkillGaps(items, checked, 13, ['en', 'zh'])
    // en-reading, en-listening, zh-reading の3件(ja は対象外)
    expect(gaps.length).toBe(3)
    expect(gaps.every((g) => g.lang === 'en' || g.lang === 'zh')).toBe(true)
    expect(gaps.some((g) => g.lang === ('ja' as Lang))).toBe(false)
  })

  it('悪いステータス(attention)が先頭に来る', () => {
    const items = buildItems()
    const checked = buildChecked(items)
    const gaps = allSkillGaps(items, checked, 13, ['en', 'zh'])
    // en-reading: 到達10.5歳、実年齢13歳 → -30ヶ月で attention
    expect(gaps[0].lang).toBe('en')
    expect(gaps[0].skill).toBe('reading')
    expect(gaps[0].attainment.status).toBe('attention')
  })

  it('paces で緩めた言語のステータスが改善する', () => {
    const items = buildItems()
    const checked = buildChecked(items)

    const strict = allSkillGaps(items, checked, 13, ['en', 'zh'])
    const enReadingStrict = strict.find((g) => g.lang === 'en' && g.skill === 'reading')
    expect(enReadingStrict?.attainment.status).toBe('attention')

    // langs=['en','zh'] に対して paces=[0.5,1] → en の期待値が 13×0.5=6.5歳 に緩む
    const relaxed = allSkillGaps(items, checked, 13, ['en', 'zh'], [0.5, 1])
    const enReadingRelaxed = relaxed.find((g) => g.lang === 'en' && g.skill === 'reading')
    expect(enReadingRelaxed?.attainment.status).toBe('ahead')
    // 到達年齢相当そのものは変わらない
    expect(enReadingRelaxed?.attainment.attained).toBeCloseTo(10.5, 5)
  })
})

describe('recommendedActions(直近の推奨アクション抽出)', () => {
  it('count 件以下を返す', () => {
    // 4技能すべて未チェック → 4件のギャップが並ぶが、count=2に制限される
    const items: CanDoItem[] = [
      ...makeItemsFor('en', 'listening', [2, 2]),
      ...makeItemsFor('en', 'speaking', [2, 2]),
      ...makeItemsFor('en', 'reading', [2, 2]),
      ...makeItemsFor('en', 'writing', [2, 2]),
    ]
    const actions = recommendedActions(items, new Set(), 5, ['en'], [1], 2)
    expect(actions.length).toBeLessThanOrEqual(2)
  })

  it('返る item はその言語×技能の最初(band・order最小)の未チェック項目である', () => {
    const items = makeItemsFor('en', 'reading', [2, 2, 2, 4, 2, 2])
    // 0-8歳帯完了、9-11歳帯(band3)は前半2件のみ完了 → 残りは band3 の order2以降から
    const checked = checkedSet(items, (i) => i.band <= 2 || (i.band === 3 && i.order < 2))
    const actions = recommendedActions(items, checked, 13, ['en'], [1], 1)
    expect(actions.length).toBe(1)
    expect(actions[0].lang).toBe('en')
    expect(actions[0].skill).toBe('reading')
    expect(actions[0].item.band).toBe(3)
    expect(actions[0].item.order).toBe(2)
    expect(actions[0].status).toBe('attention')
  })
})
