import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import type { CheckRecord, Lang, MaterialStatus, MaterialStatusValue, Skill } from '../types'
import { todayStr } from '../lib/dates'
import { allSkillGaps, generatePlan } from '../lib/logic'
import { Card, EmptyState, LangChip, SectionTitle, SkillLabel, StatusBadge } from '../components/ui'
import { CheckRow } from '../components/CheckRow'
import { T } from '../i18n'

/** 教材ステータス(notStarted以外)のチップ配色 */
const STATUS_CHIP_STYLE: Record<MaterialStatusValue, string> = {
  notStarted: '',
  inProgress: 'bg-brand-50 text-brand-700',
  completed: 'bg-emerald-50 text-emerald-700',
  deferred: 'bg-amber-50 text-amber-700',
}

/** 表示順:未挑戦・履修中 → 後回し → 修了(修了は達成済みなので後ろへ) */
const STATUS_ORDER: Record<MaterialStatusValue, number> = {
  notStarted: 0,
  inProgress: 0,
  deferred: 1,
  completed: 2,
}

/**
 * F4: キャッチアッププラン。
 * 未チェックのCan-Do項目をタスク化し、段階順のステップ+教材+週あたり時間を提示。
 * プラン上のチェックは即座に記録・ギャップ分析へ反映される(プラン=記録画面の一形態)。
 */
export default function PlanPage() {
  const { selectedMember, memberLanguages } = useApp()
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const materials = useLiveQuery(() => db.materials.toArray(), [], undefined)
  const checks = useLiveQuery(
    () => (selectedMember ? db.checks.where('memberId').equals(selectedMember.id).toArray() : Promise.resolve([] as CheckRecord[])),
    [selectedMember?.id],
    undefined,
  )
  const materialStatuses = useLiveQuery(
    () =>
      selectedMember
        ? db.materialStatus.where('memberId').equals(selectedMember.id).toArray()
        : Promise.resolve([] as MaterialStatus[]),
    [selectedMember?.id],
    [],
  )
  const [selected, setSelected] = useState<{ lang: Lang; skill: Skill } | null>(null)
  const [months, setMonths] = useState(6)

  const checkByItem = useMemo(() => new Map((checks ?? []).map((c) => [c.itemId, c])), [checks])
  const materialStatusOf = (materialId: string): MaterialStatusValue =>
    (materialStatuses ?? []).find((s) => s.materialId === materialId)?.status ?? 'notStarted'

  if (items === undefined || checks === undefined || materials === undefined) return null
  if (!selectedMember) {
    return (
      <EmptyState icon="route" title="メンバーが未登録です">
        <Link to="/onboarding" className="font-medium text-brand-600">メンバーを登録</Link>するとプランを作成できます。
      </EmptyState>
    )
  }

  const today = todayStr()
  const checkedIds = new Set(checks.map((c) => c.itemId))
  const gaps = allSkillGaps(items, checks, selectedMember, today)
  // 達成済みの技能はプラン対象から除外する
  const lagging = gaps.filter((g) => g.status === 'attention' || g.status === 'slightBehind')
  const candidates = lagging.length > 0 ? lagging : gaps.filter((g) => g.status === 'unrecorded')

  // 表示中のプランはチェックによる再計算で勝手に切り替えない(明示的に選ぶまで固定)
  const active =
    (selected && (candidates.find((g) => g.lang === selected.lang && g.skill === selected.skill) ?? gaps.find((g) => g.lang === selected.lang && g.skill === selected.skill))) ||
    candidates[0] ||
    null

  if (active && !selected) setSelected({ lang: active.lang, skill: active.skill })

  if (!active) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">キャッチアッププラン</h1>
        <EmptyState icon="star" title="いま遅れている技能はありません">
          すべての技能が順調です。この調子で <Link to="/record" className="font-medium text-brand-600">記録</Link> を続けましょう。
        </EmptyState>
      </div>
    )
  }

  const targetStage = memberLanguages.find((ml) => ml.lang === active.lang)?.targetStage ?? 6
  const plan = generatePlan(
    active.lang,
    active.skill,
    items.filter((i) => i.lang === active.lang && i.skill === active.skill),
    checkedIds,
    targetStage,
    materials,
    selectedMember.kind,
    months,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">キャッチアッププラン</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {selectedMember.name}さんの遅れている技能について、未達成のCan-Do項目をステップに分けて提案します。ここでチェックすると記録に即反映されます。
        </p>
      </div>

      {/* 対象技能の選択 */}
      <section>
        <SectionTitle>対象の技能</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {candidates.map((g) => {
            const isActive = g.lang === active.lang && g.skill === active.skill
            return (
              <button
                key={`${g.lang}-${g.skill}`}
                onClick={() => setSelected({ lang: g.lang, skill: g.skill })}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  isActive ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <SkillLabel skill={g.skill} />
                <LangChip lang={g.lang} />
                <StatusBadge status={g.status} />
              </button>
            )
          })}
        </div>
      </section>

      {/* 期間スライダー */}
      <Card className="p-4">
        <label className="flex items-center gap-4">
          <span className="shrink-0 text-sm font-medium text-neutral-700">
            <span className="text-lg font-bold tabular-nums text-brand-700">{months}ヶ月</span> でキャッチアップ
          </span>
          <input
            type="range"
            min={1}
            max={18}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="flex-1 accent-brand-600"
          />
        </label>
      </Card>

      {/* ステップ */}
      {plan.length === 0 ? (
        <EmptyState icon="celebration" title="この技能に未達成の項目はありません" />
      ) : (
        <div className="space-y-4">
          {plan.map((step, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-neutral-100 bg-neutral-50/60 px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <span className="font-semibold text-neutral-800">{step.label}の項目</span>
                <span className="ml-auto flex gap-3 text-xs text-neutral-500">
                  <span>目安 {step.months}ヶ月</span>
                  <span>週 {Math.floor(step.weeklyMinutes / 60) > 0 ? `${Math.floor(step.weeklyMinutes / 60)}時間` : ''}{step.weeklyMinutes % 60 > 0 ? `${step.weeklyMinutes % 60}分` : ''}</span>
                </span>
              </div>
              <div className="p-2">
                {step.items.map((item) => (
                  <CheckRow key={item.id} item={item} check={checkByItem.get(item.id)} memberId={selectedMember.id} />
                ))}
              </div>
              {step.materials.length > 0 && (
                <div className="border-t border-neutral-100 px-4 py-3">
                  <div className="mb-1.5 text-xs font-semibold text-neutral-400">おすすめ教材</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...step.materials]
                      .sort((a, b) => STATUS_ORDER[materialStatusOf(a.id)] - STATUS_ORDER[materialStatusOf(b.id)])
                      .map((m) => {
                        const status = materialStatusOf(m.id)
                        return (
                          <span
                            key={m.id}
                            className={`inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 ${
                              status === 'completed' ? 'opacity-60' : ''
                            }`}
                          >
                            <span className="text-neutral-400">{T.materialType[m.type]}</span>
                            {m.title}
                            {m.origin === 'local' && (
                              <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">現地</span>
                            )}
                            {status !== 'notStarted' && (
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CHIP_STYLE[status]}`}>
                                {T.materialStatus[status]}
                              </span>
                            )}
                          </span>
                        )
                      })}
                  </div>
                </div>
              )}
            </Card>
          ))}
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
            <SkillLabel skill={active.skill} />
            <LangChip lang={active.lang} />
            のプラン・チェックすると即座にギャップ分析へ反映されます
          </p>
        </div>
      )}
    </div>
  )
}
