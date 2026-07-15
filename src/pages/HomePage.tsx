import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { SKILLS, type CanDoItem, type CheckRecord } from '../types'
import { ageAt, ageLabel, fmtDateJa, roundAge, todayStr } from '../lib/dates'
import { computeAttainment, recommendedActions } from '../lib/logic'
import { Card, GeoBanner, Icon, LangChip, Modal, SectionTitle, SkillLabel, StatusBadge } from '../components/ui'
import { CheckRow } from '../components/CheckRow'
import { RecordSection } from '../components/RecordSection'

export default function HomePage() {
  const { selectedChild, children_, ready, langs, paces } = useApp()
  const recordSectionRef = useRef<HTMLElement>(null)
  const scrollToRecord = () => recordSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  const [historyOpen, setHistoryOpen] = useState(false)
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const checks = useLiveQuery(
    () => (selectedChild ? db.checks.where('childId').equals(selectedChild.id).toArray() : Promise.resolve([] as CheckRecord[])),
    [selectedChild?.id],
    undefined,
  )

  if (items === undefined || checks === undefined || !ready) return null

  // OOUI: 主オブジェクト「子供」が存在しない場合はオンボーディングへ
  if (!selectedChild && children_.length === 0) return <Navigate to="/onboarding" replace />
  if (!selectedChild) return null

  const child = selectedChild
  const age = ageAt(child.birthDate, todayStr())
  const checkedIds = new Set(checks.map((c) => c.itemId))
  const actions = recommendedActions(items, checkedIds, age, langs, paces, 3)
  const recent = checks
    .slice()
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, 6)
  const itemById = new Map(items.map((i) => [i.id, i]))
  const checkByItem = new Map(checks.map((c) => [c.itemId, c]))
  // グラフィックの色面積は言語ごとの達成数に連動(できている言語の色が広くなる)
  const geoWeights = langs.map((l) => checks.filter((c) => itemById.get(c.itemId)?.lang === l).length)

  return (
    <div className="space-y-8">
      {/* 子供ごとに絵柄が変わるグラフィック(言語別の達成バランス+割合メモ付き) */}
      <GeoBanner className="h-20 sm:h-24" weights={geoWeights} seed={child.id} caption />

      {/* 子供ヘッダー */}
      <div className="flex flex-wrap items-end justify-between gap-3 !mt-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{child.name}</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {ageLabel(age)}(生年月日 {fmtDateJa(child.birthDate)})・これまでの達成 {checks.length} 項目
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={scrollToRecord}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <Icon name="task_alt" className="text-lg" />
            今日の記録
          </button>
          <Link to="/gap" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <Icon name="monitoring" className="text-lg" />
            詳しく見る
          </Link>
        </div>
      </div>

      {/* ステータスサマリー */}
      <section>
        <SectionTitle>ステータスサマリー</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {langs.map((lang, pos) => (
            <Card key={lang} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <LangChip lang={lang} />
              </div>
              <ul className="divide-y divide-neutral-100">
                {SKILLS.map((skill) => {
                  const subset = items.filter((i) => i.lang === lang && i.skill === skill)
                  const a = computeAttainment(subset, checkedIds, age, paces[pos])
                  return (
                    <li key={skill} className="flex items-center justify-between gap-2 py-2">
                      <SkillLabel skill={skill} />
                      <span className="flex items-center gap-2">
                        {a.attained !== null && (
                          <span className="whitespace-nowrap text-xs tabular-nums text-neutral-400">{roundAge(a.attained)}歳相当</span>
                        )}
                        <StatusBadge status={a.status} />
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* 直近の推奨アクション */}
      <section>
        <SectionTitle
          action={
            <Link to="/plan" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
              キャッチアッププランへ
              <Icon name="arrow_forward" className="text-sm" />
            </Link>
          }
        >
          直近の推奨アクション
        </SectionTitle>
        {actions.length === 0 ? (
          <Card className="p-5 text-sm text-neutral-500">推奨できる項目がありません。ロードマップに項目を追加してみましょう。</Card>
        ) : (
          <Card className="divide-y divide-neutral-100 p-2">
            {actions.map((a) => (
              <div key={a.item.id} className="py-1">
                <CheckRow
                  item={a.item}
                  check={checkByItem.get(a.item.id)}
                  childId={child.id}
                  showMeta={
                    <>
                      <SkillLabel skill={a.skill} />
                      <LangChip lang={a.lang} />
                      <StatusBadge status={a.status} />
                    </>
                  }
                />
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* できたことを記録 */}
      <section ref={recordSectionRef}>
        <SectionTitle>できたことを記録</SectionTitle>
        <p className="mb-3 mt-1 text-sm text-neutral-500">
          できるようになったことにチェックを入れましょう。日付は後から直せます。
        </p>
        <RecordSection />
      </section>

      {/* 最近の達成 */}
      <section>
        <SectionTitle
          action={
            checks.length > 0 ? (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600"
              >
                すべて見る
                <Icon name="history" className="text-sm" />
              </button>
            ) : undefined
          }
        >
          最近の達成
        </SectionTitle>
        {recent.length === 0 ? (
          <Card className="p-5 text-sm text-neutral-500">
            まだ記録がありません。
            <button type="button" onClick={scrollToRecord} className="font-medium text-brand-600">上の記録セクション</button>
            から最初のチェックをつけてみましょう。
          </Card>
        ) : (
          <Card className="divide-y divide-neutral-100">
            {recent.map((c) => {
              const item = itemById.get(c.itemId)
              if (!item) return null
              return (
                <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icon name="check" className="text-sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-[1.5] text-neutral-800">{item.text}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-neutral-400">
                      <SkillLabel skill={item.skill} />
                      <LangChip lang={item.lang} />
                      <span>{fmtDateJa(c.achievedOn)} 達成</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </section>

      {historyOpen && (
        <HistoryModal checks={checks} itemById={itemById} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  )
}

/* ---------- 達成履歴の全件表示(月別グルーピング) ---------- */

function HistoryModal({
  checks,
  itemById,
  onClose,
}: {
  checks: CheckRecord[]
  itemById: Map<string, CanDoItem>
  onClose: () => void
}) {
  // achievedOn 降順(同日なら recordedAt 降順)で並べ、削除済み項目は除外
  const sorted = checks
    .filter((c) => itemById.has(c.itemId))
    .slice()
    .sort((a, b) => b.achievedOn.localeCompare(a.achievedOn) || b.recordedAt.localeCompare(a.recordedAt))

  // 月(YYYY-MM)ごとにグルーピング
  const groups: { month: string; items: CheckRecord[] }[] = []
  for (const c of sorted) {
    const month = c.achievedOn.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.items.push(c)
    else groups.push({ month, items: [c] })
  }

  const monthLabel = (month: string) => {
    const [y, m] = month.split('-')
    return `${y}年${Number(m)}月`
  }

  return (
    <Modal open onClose={onClose} title={`達成の履歴(${sorted.length}件)`} wide>
      {sorted.length === 0 ? (
        <p className="p-2 text-sm text-neutral-500">まだ記録がありません。</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {groups.map((g) => (
            <div key={g.month}>
              <div className="sticky top-0 bg-white px-1 py-1.5 text-xs font-semibold text-neutral-400">
                {monthLabel(g.month)}
              </div>
              {g.items.map((c) => {
                const item = itemById.get(c.itemId)!
                return (
                  <div key={c.id} className="flex items-start gap-3 px-1 py-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Icon name="check" className="text-sm" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-[1.5] text-neutral-800">{item.text}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-neutral-400">
                        <SkillLabel skill={item.skill} />
                        <LangChip lang={item.lang} />
                        <span>{fmtDateJa(c.achievedOn)} 達成</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
