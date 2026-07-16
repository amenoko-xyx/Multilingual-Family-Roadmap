import { describe, expect, it } from 'vitest'
import type { CanDoItem, Lang, Material, Member, MemberLanguage, Skill } from '../types'
import {
  allSkillGaps,
  assessProgress,
  checkedIdsAsOf,
  computeLevel,
  expectedChildNativeLevel,
  firstCheckOnFor,
  generatePlan,
  matchMaterials,
  recommendedActions,
} from './logic'

/** stage 1〜6 の項目を生成(perStage[0]=stage1)。id は `${lang}-${stage}-${skill}-${n}` */
function makeItems(perStage: number[]): CanDoItem[] {
  return makeItemsFor('en', 'reading', perStage)
}

function makeItemsFor(lang: Lang, skill: Skill, perStage: number[]): CanDoItem[] {
  const items: CanDoItem[] = []
  perStage.forEach((n, idx) => {
    const stage = idx + 1
    for (let i = 0; i < n; i++) {
      items.push({ id: `${lang}-${stage}-${skill}-${i + 1}`, lang, stage, skill, text: `item ${stage}-${i}`, order: i })
    }
  })
  return items
}

function checkedSet(items: CanDoItem[], pick: (item: CanDoItem) => boolean): Set<string> {
  return new Set(items.filter(pick).map((i) => i.id))
}

/** allSkillGaps/recommendedActions 用の checks 配列({itemId, achievedOn}) */
function checksFor(items: CanDoItem[], pick: (item: CanDoItem) => boolean, date = '2025-01-01') {
  return items.filter(pick).map((i) => ({ itemId: i.id, achievedOn: date }))
}

function ml(lang: Lang, role: MemberLanguage['role'], targetStage: number, extra: Partial<MemberLanguage> = {}): MemberLanguage {
  return { lang, role, targetStage, pace: 1, ...extra }
}

function member(over: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    name: 'テスト',
    kind: 'child',
    birthDate: '2017-01-01',
    languages: [ml('en', 'native', 6)],
    ...over,
  }
}

describe('computeLevel(到達レベルの算出・段階幅1.0)', () => {
  it('S3まで完了+S4を半分 → level 3.5', () => {
    const items = makeItems([2, 2, 2, 4, 2, 2])
    const checked = checkedSet(items, (i) => i.stage <= 3 || (i.stage === 4 && i.order < 2))
    const r = computeLevel(items, checked)
    expect(r.level).toBeCloseTo(3.5, 5)
    expect(r.warningStages).toEqual([])
  })

  it('チェック0件は未記録(level=null)', () => {
    const items = makeItems([2, 2, 2])
    const r = computeLevel(items, new Set())
    expect(r.level).toBeNull()
    expect(r.checkedCount).toBe(0)
  })

  it('最初の段階が進行中:S1を半分 → level 0.5', () => {
    const items = makeItems([4])
    const checked = checkedSet(items, (i) => i.order < 2)
    expect(computeLevel(items, checked).level).toBeCloseTo(0.5, 5)
  })

  it('段階が飛んでいる場合:上位段を尊重しつつ下位の未完了段を警告する', () => {
    const items = makeItems([2, 2, 2, 2])
    // S1完了、S2半分(1/2)、S4に1つチェック
    const checked = checkedSet(
      items,
      (i) => i.stage === 1 || (i.stage === 2 && i.order === 0) || (i.stage === 4 && i.order === 0),
    )
    const r = computeLevel(items, checked)
    expect(r.warningStages).toContain(2)
    expect(r.warningStages).toContain(3)
    // h=S4(0.5)→ level 3 + 0.5 = 3.5
    expect(r.level).toBeCloseTo(3.5, 5)
  })

  it('全段階完了なら level 6 で頭打ち', () => {
    const items = makeItems([1, 1, 1, 1, 1, 1])
    expect(computeLevel(items, checkedSet(items, () => true)).level).toBe(6)
  })
})

describe('expectedChildNativeLevel(実年齢→期待レベルの補間)', () => {
  it('age 0 → 0', () => {
    expect(expectedChildNativeLevel(0)).toBe(0)
  })
  it('age 9 は S3 の始点 → level 2.0', () => {
    expect(expectedChildNativeLevel(9)).toBeCloseTo(2.0, 5)
  })
  it('age 10.5 は S3 の中間 → 2 + 0.5 = 2.5', () => {
    // S3: ageStart9, ageEnd12 → frac=(10.5-9)/3=0.5 → 2.5
    expect(expectedChildNativeLevel(10.5)).toBeCloseTo(2.5, 5)
  })
  it('大人相当(age 25)は上限の 6', () => {
    expect(expectedChildNativeLevel(25)).toBe(6)
  })
})

describe('assessProgress(進捗判定)', () => {
  const today = '2026-01-01'

  it('未記録:level=null → unrecorded', () => {
    const r = assessProgress({ level: null, ml: ml('en', 'foreign1', 5), member: member(), firstCheckOn: null, today })
    expect(r.status).toBe('unrecorded')
    expect(r.progressRatio).toBeNull()
  })

  it('目標到達:level >= targetStage → achieved', () => {
    const r = assessProgress({ level: 5, ml: ml('en', 'foreign1', 5), member: member({ kind: 'adult', birthDate: null }), firstCheckOn: null, today })
    expect(r.status).toBe('achieved')
  })

  it('子供の母語トラック:実年齢の期待レベルと比較する', () => {
    // birthDate 2017-01-01, today 2026-01-01 → age≒9 → expected≒2.0
    const child = member({ kind: 'child', birthDate: '2017-01-01' })
    const nativeMl = ml('en', 'native', 6)
    expect(assessProgress({ level: 3, ml: nativeMl, member: child, firstCheckOn: null, today }).status).toBe('ahead')
    expect(assessProgress({ level: 2, ml: nativeMl, member: child, firstCheckOn: null, today }).status).toBe('onTrack')
    expect(assessProgress({ level: 1, ml: nativeMl, member: child, firstCheckOn: null, today }).status).toBe('attention')
  })

  it('目標時期あり:経過時間比と進捗比を突き合わせる', () => {
    const adult = member({ kind: 'adult', birthDate: null })
    const withDate = ml('en', 'foreign1', 6, { targetDate: '2027-01-01' })
    const firstCheckOn = '2025-01-01' // 目標まで2年、today は中間(1年経過→timeRatio 0.5)
    expect(assessProgress({ level: 3, ml: withDate, member: adult, firstCheckOn, today }).status).toBe('onTrack') // progress 0.5
    expect(assessProgress({ level: 5, ml: withDate, member: adult, firstCheckOn, today }).status).toBe('ahead') // progress 0.83
    expect(assessProgress({ level: 1, ml: withDate, member: adult, firstCheckOn, today }).status).toBe('attention') // progress 0.17
  })

  it('目標時期を過ぎて未達 → attention', () => {
    const adult = member({ kind: 'adult', birthDate: null })
    const withDate = ml('en', 'foreign1', 6, { targetDate: '2025-06-01' })
    expect(assessProgress({ level: 3, ml: withDate, member: adult, firstCheckOn: '2025-01-01', today }).status).toBe('attention')
  })

  it('目標時期なし:記録があれば onTrack', () => {
    const adult = member({ kind: 'adult', birthDate: null })
    expect(assessProgress({ level: 2, ml: ml('en', 'foreign1', 6), member: adult, firstCheckOn: '2025-01-01', today }).status).toBe('onTrack')
  })
})

describe('firstCheckOnFor(言語ごとの最初の達成日)', () => {
  const checks = [
    { itemId: 'en-2-reading-1', achievedOn: '2025-03-01' },
    { itemId: 'en-1-reading-1', achievedOn: '2025-01-01' },
    { itemId: 'zh-1-reading-1', achievedOn: '2024-12-01' },
  ]
  it('該当言語の最小 achievedOn を返す', () => {
    expect(firstCheckOnFor(checks, 'en')).toBe('2025-01-01')
    expect(firstCheckOnFor(checks, 'zh')).toBe('2024-12-01')
  })
  it('該当がなければ null', () => {
    expect(firstCheckOnFor(checks, 'ja')).toBeNull()
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

describe('matchMaterials(言語×技能×段階×対象者)', () => {
  const materials: Material[] = [
    { id: 'a', title: 'A', type: 'book', languages: ['en'], skills: ['reading'], stages: [1, 2], audience: 'child', origin: 'local' },
    { id: 'b', title: 'B', type: 'app', languages: ['en'], skills: ['listening'], stages: [1, 2], audience: 'all', origin: 'local' },
    { id: 'c', title: 'C', type: 'book', languages: ['en'], skills: ['reading'], stages: [4, 5], audience: 'child', origin: 'local' },
    { id: 'd', title: 'D', type: 'book', languages: ['en'], skills: ['reading'], stages: [1, 2], audience: 'adult', origin: 'japan' },
  ]
  it('段階が重なる子供向け/共通の教材のみマッチ', () => {
    const hit = matchMaterials(materials, 'en', 'reading', [2], 'child')
    expect(hit.map((m) => m.id)).toEqual(['a'])
  })
  it('大人には大人向け/共通がマッチ(子供向けは除外)', () => {
    const hit = matchMaterials(materials, 'en', 'reading', [2], 'adult')
    expect(hit.map((m) => m.id)).toEqual(['d'])
  })
})

describe('generatePlan(キャッチアッププラン生成)', () => {
  const materials: Material[] = [
    { id: 'm1', title: '入門絵本', type: 'book', languages: ['en'], skills: ['reading'], stages: [1], audience: 'all', origin: 'local' },
    { id: 'm2', title: '多読セット', type: 'book', languages: ['en'], skills: ['reading'], stages: [2, 3], audience: 'all', origin: 'local' },
    { id: 'm3', title: '韓国語アプリ', type: 'app', languages: ['ko'], skills: ['reading'], stages: [1, 2, 3, 4, 5, 6], audience: 'all', origin: 'local' },
  ]

  it('未チェック項目を段階順にタスク化し、教材と期間を割り当てる', () => {
    const items = makeItems([2, 2, 2])
    const checked = checkedSet(items, (i) => i.stage === 1)
    const plan = generatePlan('en', 'reading', items, checked, 3, materials, 'child', 6)
    expect(plan.length).toBe(2) // S2 と S3
    expect(plan[0].items.every((i) => i.stage === 2)).toBe(true)
    expect(plan[0].materials.map((m) => m.id)).toContain('m2')
    // 言語違いの教材は混ざらない
    expect(plan.flatMap((s) => s.materials).some((m) => m.id === 'm3')).toBe(false)
    const total = plan.reduce((a, s) => a + s.months, 0)
    expect(total).toBeGreaterThanOrEqual(4)
    expect(total).toBeLessThanOrEqual(8)
  })

  it('targetStage より上の段階はプランに含めない', () => {
    const items = makeItems([2, 2, 2, 2, 2, 2])
    const plan = generatePlan('en', 'reading', items, new Set(), 3, materials, 'child', 6)
    expect(plan.every((s) => s.items.every((i) => i.stage <= 3))).toBe(true)
  })

  it('ステップは最大4つにまとめられる', () => {
    const items = makeItems([2, 2, 2, 2, 2, 2])
    const plan = generatePlan('en', 'reading', items, new Set(), 6, materials, 'child', 12)
    expect(plan.length).toBeLessThanOrEqual(4)
  })

  it('未チェックがなければ空プラン', () => {
    const items = makeItems([2, 2])
    const plan = generatePlan('en', 'reading', items, checkedSet(items, () => true), 2, materials, 'child', 6)
    expect(plan).toEqual([])
  })
})

describe('allSkillGaps(メンバー言語×技能のギャップ抽出)', () => {
  // en: native(子供母語)。reading は S3.5、listening は完了(達成)。zh: foreign1 未記録。ja は対象外。
  function buildItems(): CanDoItem[] {
    return [
      ...makeItemsFor('en', 'reading', [2, 2, 2, 4, 2, 2]),
      ...makeItemsFor('en', 'listening', [2, 2, 2, 4, 2, 2]),
      ...makeItemsFor('zh', 'reading', [2, 2, 2, 4, 2, 2]),
      ...makeItemsFor('ja', 'reading', [2, 2, 2, 4, 2, 2]),
    ]
  }
  function buildChecks(items: CanDoItem[]) {
    return checksFor(items, (i) => {
      if (i.lang === 'en' && i.skill === 'reading') return i.stage <= 3 || (i.stage === 4 && i.order < 2)
      if (i.lang === 'en' && i.skill === 'listening') return true
      return false
    })
  }
  // 18歳相当の子供(expected≒4.75)。en-reading(3.5) は母語期待を大きく下回り attention
  const testMember = member({
    kind: 'child',
    birthDate: '2008-01-01',
    languages: [ml('en', 'native', 6), ml('zh', 'foreign1', 5)],
  })

  it('メンバーの言語構成にある言語のみが対象になる', () => {
    const items = buildItems()
    const gaps = allSkillGaps(items, buildChecks(items), testMember, '2026-01-01')
    // en-reading, en-listening, zh-reading の3件(ja は対象外)
    expect(gaps.length).toBe(3)
    expect(gaps.every((g) => g.lang === 'en' || g.lang === 'zh')).toBe(true)
  })

  it('悪いステータス(attention)が先頭に来る', () => {
    const items = buildItems()
    const gaps = allSkillGaps(items, buildChecks(items), testMember, '2026-01-01')
    expect(gaps[0].lang).toBe('en')
    expect(gaps[0].skill).toBe('reading')
    expect(gaps[0].status).toBe('attention')
  })
})

describe('recommendedActions(直近の推奨アクション抽出)', () => {
  it('count 件以下を返す', () => {
    const items = [
      ...makeItemsFor('en', 'listening', [2, 2]),
      ...makeItemsFor('en', 'speaking', [2, 2]),
      ...makeItemsFor('en', 'reading', [2, 2]),
      ...makeItemsFor('en', 'writing', [2, 2]),
    ]
    const m = member({ kind: 'adult', birthDate: null, languages: [ml('en', 'foreign1', 5)] })
    const actions = recommendedActions(items, [], m, '2026-01-01', 2)
    expect(actions.length).toBeLessThanOrEqual(2)
  })

  it('返る item はその言語×技能の最初(stage・order最小)の未チェック項目である', () => {
    const items = makeItemsFor('en', 'reading', [2, 2, 2, 4, 2, 2])
    const checks = checksFor(items, (i) => i.stage <= 3 || (i.stage === 4 && i.order < 2))
    const m = member({ kind: 'child', birthDate: '2008-01-01', languages: [ml('en', 'native', 6)] })
    const actions = recommendedActions(items, checks, m, '2026-01-01', 1)
    expect(actions.length).toBe(1)
    expect(actions[0].lang).toBe('en')
    expect(actions[0].skill).toBe('reading')
    expect(actions[0].item.stage).toBe(4)
    expect(actions[0].item.order).toBe(2)
    expect(actions[0].status).toBe('attention')
  })
})
