import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { db, addCheck } from '../db'
import { useApp } from '../context/AppContext'
import { SKILLS, type CheckRecord, type Lang, type Skill } from '../types'
import { todayStr } from '../lib/dates'
import { allSkillGaps, type SkillGap, type Status } from '../lib/logic'
import { Card, ConfirmDialog, EmptyState, Icon, LangChip, SectionTitle, SkillLabel, StatusBadge, langStroke, stageLabel } from '../components/ui'
import { RadarBlock } from '../components/RadarBlock'
import { T } from '../i18n'

/** 状態ごとの一言(役割別の目標に対する進捗) */
function gapText(status: Status): string {
  switch (status) {
    case 'unrecorded':
      return 'まだ記録がありません'
    case 'achieved':
      return '目標レベルに到達しています'
    case 'ahead':
      return '目標ペースより先行しています'
    case 'onTrack':
      return '順調に進んでいます'
    case 'slightBehind':
      return '目標ペースよりやや遅れ気味です'
    case 'attention':
      return '遅れが目立ちます。プランで巻き返しましょう'
  }
}

/** F3: ギャップ分析(役割別の目標レベル × 到達レベル) */
export default function GapPage() {
  const { selectedMember, langs, memberLanguages } = useApp()
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const checks = useLiveQuery(
    () => (selectedMember ? db.checks.where('memberId').equals(selectedMember.id).toArray() : Promise.resolve([] as CheckRecord[])),
    [selectedMember?.id],
    undefined,
  )
  const [bulkTarget, setBulkTarget] = useState<{ lang: Lang; skill: Skill; stages: number[] } | null>(null)

  if (items === undefined || checks === undefined) return null
  if (!selectedMember) {
    return (
      <EmptyState icon="monitoring" title="メンバーが未登録です">
        <Link to="/onboarding" className="font-medium text-brand-600">メンバーを登録</Link>すると分析できます。
      </EmptyState>
    )
  }

  const today = todayStr()
  const checkedIds = new Set(checks.map((c) => c.itemId))
  const gaps = allSkillGaps(items, checks, selectedMember, today)
  const gapByKey = new Map<string, SkillGap>(gaps.map((g) => [`${g.lang}:${g.skill}`, g]))
  const mlOf = (lang: Lang) => memberLanguages.find((ml) => ml.lang === lang)
  const targetOf = (lang: Lang) => mlOf(lang)?.targetStage ?? 6
  const paceOf = (lang: Lang) => mlOf(lang)?.pace ?? 1

  const bulkCheck = async () => {
    if (!bulkTarget) return
    const targets = items.filter(
      (i) =>
        i.lang === bulkTarget.lang &&
        i.skill === bulkTarget.skill &&
        bulkTarget.stages.includes(i.stage) &&
        !checkedIds.has(i.id),
    )
    for (const t of targets) await addCheck(selectedMember.id, t.id, today)
  }

  // 役割別の目標傾斜を文言化(母語=S6・第一外国語=S5 など)
  const targetSummary = memberLanguages
    .map((ml) => `${T.role[ml.role]}=${stageLabel(ml.targetStage)}`)
    .join(' / ')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">ギャップ分析</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {selectedMember.name}さんの到達レベルを、チェック状態から自動算出しています。
        </p>
        {/* 傾斜の明示:役割ごとに異なる目標レベルを当てていることを伝える */}
        <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-xs leading-relaxed text-neutral-500">
          <Icon name="info" className="text-sm" />
          判定は役割ごとの目標レベル({targetSummary})に対するものです。
          {memberLanguages.some((ml) => ml.pace !== 1) && ' さらに「ゆるめ」ペースが適用中です。'}
          <Link to="/settings" className="font-medium text-brand-600 underline decoration-brand-300 underline-offset-2">
            傾斜の理由と設定
          </Link>
        </p>
      </div>

      {/* レーダーチャート */}
      <section>
        <SectionTitle>言語×技能レーダー(点線=目標レベル)</SectionTitle>
        <Card className="grid gap-4 p-4 sm:grid-cols-3">
          {langs.map((lang) => {
            const values = Object.fromEntries(
              SKILLS.map((s) => [s, gapByKey.get(`${lang}:${s}`)?.result.level ?? null]),
            ) as Record<Skill, number | null>
            // 目標ライン=役割の目標レベル(全技能で一定)
            const target = targetOf(lang)
            return (
              <RadarBlock
                key={lang}
                title={`${T.lang[lang]}${paceOf(lang) !== 1 ? '(ゆるめ)' : ''}`}
                series={[
                  {
                    name: '目標レベル',
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
              const g = gapByKey.get(`${lang}:${skill}`)
              const level = g?.result.level ?? null
              const status = g?.status ?? 'unrecorded'
              const warningStages = g?.result.warningStages ?? []
              return (
                <div key={skill} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SkillLabel skill={skill} />
                    <StatusBadge status={status} />
                    {level !== null && (
                      <span className="text-sm tabular-nums text-neutral-500">S{level.toFixed(1)}</span>
                    )}
                    <span className="ml-auto text-xs text-neutral-400">
                      {g?.result.checkedCount ?? 0}/{g?.result.totalCount ?? 0} 項目
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{gapText(status)}</p>
                  {warningStages.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <span className="inline-flex items-start gap-1">
                        <Icon name="warning" className="mt-0.5 text-sm" />
                        下位の段階({warningStages.map((s) => stageLabel(s)).join('・')})に未チェック項目があります。すでにできている場合はまとめてチェックできます。
                      </span>
                      <button
                        onClick={() => setBulkTarget({ lang, skill, stages: warningStages })}
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

      {/* 家族バランスへの入口 */}
      <section>
        <SectionTitle>{T.nav.compare}</SectionTitle>
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-neutral-500">{T.compareNote}</p>
          <Link to="/family" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
            <Icon name="groups" className="text-lg" />
            家族バランスを見る
          </Link>
        </Card>
      </section>

      <ConfirmDialog
        open={bulkTarget !== null}
        onClose={() => setBulkTarget(null)}
        onConfirm={bulkCheck}
        title="下位段階の一括チェック"
        danger={false}
        confirmLabel="一括チェックする"
        message={
          bulkTarget && (
            <>
              {T.lang[bulkTarget.lang]}・{T.skill[bulkTarget.skill]}の
              {bulkTarget.stages.map((s) => stageLabel(s)).join('・')}にある未チェック項目すべてに、
              今日の日付でチェックを付けます。よろしいですか?
            </>
          )
        }
      />
    </div>
  )
}
