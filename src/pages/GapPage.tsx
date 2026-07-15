import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { db, addCheck } from '../db'
import { useApp } from '../context/AppContext'
import { BANDS, SKILLS, type CheckRecord, type Lang, type Skill } from '../types'
import { ageAt, ageLabel, roundAge, todayStr } from '../lib/dates'
import { computeAttainment, type Attainment } from '../lib/logic'
import { Card, ConfirmDialog, EmptyState, Icon, LangChip, SectionTitle, SkillLabel, StatusBadge, langStroke } from '../components/ui'
import { RadarBlock } from '../components/RadarBlock'
import { T } from '../i18n'

function gapText(a: Attainment): string {
  if (a.attained === null) return 'まだ記録がありません'
  const m = a.gapMonths ?? 0
  if (m >= 3) return `理想より約${m}ヶ月先行`
  if (m <= -3) return `理想より約${-m}ヶ月遅れ`
  return '実年齢とほぼ同水準'
}

/** F3: ギャップ分析(理想=実年齢 vs 到達年齢相当) */
export default function GapPage() {
  const { selectedChild, langs, paces, children_ } = useApp()
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const checks = useLiveQuery(
    () => (selectedChild ? db.checks.where('childId').equals(selectedChild.id).toArray() : Promise.resolve([] as CheckRecord[])),
    [selectedChild?.id],
    undefined,
  )
  const [bulkTarget, setBulkTarget] = useState<{ lang: Lang; skill: Skill; bands: number[] } | null>(null)

  if (items === undefined || checks === undefined) return null
  if (!selectedChild) {
    return (
      <EmptyState icon="monitoring" title="お子さんが未登録です">
        <Link to="/onboarding" className="font-medium text-brand-600">お子さんを登録</Link>すると分析できます。
      </EmptyState>
    )
  }

  const age = ageAt(selectedChild.birthDate, todayStr())
  const checkedIds = new Set(checks.map((c) => c.itemId))

  const paceOf = (lang: Lang) => paces[langs.indexOf(lang)] ?? 1
  const attainmentOf = (lang: Lang, skill: Skill) =>
    computeAttainment(items.filter((i) => i.lang === lang && i.skill === skill), checkedIds, age, paceOf(lang))

  const bulkCheck = async () => {
    if (!bulkTarget) return
    const targets = items.filter(
      (i) =>
        i.lang === bulkTarget.lang &&
        i.skill === bulkTarget.skill &&
        bulkTarget.bands.includes(i.band) &&
        !checkedIds.has(i.id),
    )
    for (const t of targets) await addCheck(selectedChild.id, t.id, todayStr())
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">ギャップ分析</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {selectedChild.name}さん(実年齢 {ageLabel(age)})の到達度を、チェック状態から自動算出しています。
        </p>
        {/* 傾斜の明示:3言語に同じ物差しを当てているわけではないことを伝える */}
        <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-xs leading-relaxed text-neutral-500">
          <Icon name="info" className="text-sm" />
          判定は言語ごとの目標傾斜(第一言語=母語 / 第二言語=CEFR B2〜C1 / 第三言語=CEFR B1)に対するものです。
          {paces.some((p) => p !== 1) && ' さらに「ゆるめ」ペースが適用中です。'}
          <Link to="/settings" className="font-medium text-brand-600 underline decoration-brand-300 underline-offset-2">
            傾斜の理由と設定
          </Link>
        </p>
      </div>

      {/* レーダーチャート */}
      <section>
        <SectionTitle>言語×技能レーダー(点線=目標ペースライン)</SectionTitle>
        <Card className="grid gap-4 p-4 sm:grid-cols-3">
          {langs.map((lang) => {
            const values = Object.fromEntries(
              SKILLS.map((s) => [s, attainmentOf(lang, s).attained]),
            ) as Record<Skill, number | null>
            // 目標ライン=実年齢×判定ペース(「ゆるめ」設定なら点線が下がり、傾斜が見える)
            const target = Math.min(age * paceOf(lang), 19)
            return (
              <RadarBlock
                key={lang}
                title={`${T.lang[lang]}${paceOf(lang) !== 1 ? '(ゆるめ)' : ''}`}
                series={[
                  {
                    name: '目標ペース',
                    color: '#a3a3a3',
                    dashed: true,
                    values: { listening: target, speaking: target, reading: target, writing: target },
                  },
                  { name: '現在', color: langStroke(langs.indexOf(lang)), values },
                ]}
              />
            )
          })}
        </Card>
      </section>

      {/* 技能別詳細 */}
      {langs.map((lang) => (
        <section key={lang}>
          <SectionTitle>
            <span className="flex items-center gap-2"><LangChip lang={lang} />の詳細</span>
          </SectionTitle>
          <Card className="divide-y divide-neutral-100">
            {SKILLS.map((skill) => {
              const a = attainmentOf(lang, skill)
              return (
                <div key={skill} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SkillLabel skill={skill} />
                    <StatusBadge status={a.status} />
                    {a.attained !== null && (
                      <span className="text-sm tabular-nums text-neutral-500">{roundAge(a.attained)}歳相当</span>
                    )}
                    <span className="ml-auto text-xs text-neutral-400">
                      {a.checkedCount}/{a.totalCount} 項目
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{gapText(a)}</p>
                  {a.warningBands.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <span className="inline-flex items-start gap-1">
                        <Icon name="warning" className="mt-0.5 text-sm" />
                        下位の年齢帯({a.warningBands.map((b) => BANDS[b].label).join('・')})に未チェック項目があります。すでにできている場合はまとめてチェックできます。
                      </span>
                      <button
                        onClick={() => setBulkTarget({ lang, skill, bands: a.warningBands })}
                        className="rounded-lg bg-amber-500 px-2.5 py-1 font-semibold text-white hover:bg-amber-600"
                      >
                        一括チェック
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        </section>
      ))}

      <div className="flex justify-center">
        <Link to="/plan" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Icon name="route" className="text-lg" />
          遅れている技能のキャッチアッププランを見る
        </Link>
      </div>

      {/* きょうだい比較への入口 */}
      <section>
        <SectionTitle>きょうだい比較</SectionTitle>
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-neutral-500">{T.compareNote}</p>
          {children_.length >= 2 ? (
            <Link to="/compare" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              <Icon name="groups" className="text-lg" />
              同年齢時点で比較する
            </Link>
          ) : (
            <p className="text-sm text-neutral-400">比較にはお子さんが2人以上必要です。設定から追加できます。</p>
          )}
        </Card>
      </section>

      <ConfirmDialog
        open={bulkTarget !== null}
        onClose={() => setBulkTarget(null)}
        onConfirm={bulkCheck}
        title="下位帯の一括チェック"
        danger={false}
        confirmLabel="一括チェックする"
        message={
          bulkTarget && (
            <>
              {T.lang[bulkTarget.lang]}・{T.skill[bulkTarget.skill]}の
              {bulkTarget.bands.map((b) => BANDS[b].label).join('・')}にある未チェック項目すべてに、
              今日の日付でチェックを付けます。よろしいですか?
            </>
          )
        }
      />
    </div>
  )
}
