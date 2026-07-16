import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { SKILLS, type CanDoItem, type CheckRecord, type Lang, type Member, type MemberLanguage, type Skill } from '../types'
import { addMonths, ageAt, ageLabel, dateAtAge, todayStr } from '../lib/dates'
import { assessProgress, checkedIdsAsOf, computeLevel, firstCheckOnFor, type Status } from '../lib/logic'
import { Card, EmptyState, SectionTitle, Segmented, StatusBadge } from '../components/ui'
import { RadarBlock } from '../components/RadarBlock'
import { T } from '../i18n'

const MEMBER_COLORS = ['#3859FF', '#8b5cf6', '#f97316'] // brand blue / violet / orange

type Mode = 'sameAge' | 'now'

/**
 * F5: 家族バランス比較。
 * 同年齢時点比較は達成日(achievedOn)からの再構成で実現(スナップショット不要)。
 * ※ 本格改修は別Issue。ここではレベル段階軸への最小対応のみ。
 */
export default function ComparePage() {
  const { members, langs } = useApp()
  const allChecks = useLiveQuery(() => db.checks.toArray(), [], undefined)
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null)
  const [mode, setMode] = useState<Mode>('sameAge')
  const [ageX2, setAgeX2] = useState<number | null>(null) // 0.5歳刻み(値は年齢×2)

  if (items === undefined || allChecks === undefined) return null

  if (members.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">{T.nav.compare}</h1>
        <EmptyState icon="groups" title="見比べにはメンバーが2人以上必要です">
          設定ページからメンバーを追加してください。
        </EmptyState>
      </div>
    )
  }

  const ids = selectedIds ?? members.slice(0, 3).map((m) => m.id)
  const selected = members.filter((m) => ids.includes(m.id)).slice(0, 3)
  // 同年齢比較は生年月日が必要。未設定(大人など)は年齢軸の基準から除外する
  const dated = members.filter((m) => m.birthDate)
  const youngest = dated[dated.length - 1]
  const defaultAge = youngest ? Math.floor(ageAt(youngest.birthDate!, todayStr()) * 2) : 12
  const targetAge = (ageX2 ?? defaultAge) / 2

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    if (next.length >= 1) setSelectedIds(next)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">{T.nav.compare}</h1>
        <p className="mt-1 text-sm text-neutral-500">{T.compareNote}</p>
      </div>

      {/* メンバー選択 */}
      <div className="flex flex-wrap items-center gap-2">
        {members.slice(0, 3).map((m, i) => (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              ids.includes(m.id) ? 'border-neutral-300 bg-white shadow-sm' : 'border-neutral-200 bg-neutral-100 text-neutral-400'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: MEMBER_COLORS[i] }} />
            {m.name}
          </button>
        ))}
        <div className="ml-auto">
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'sameAge', label: '同年齢時点' },
              { value: 'now', label: '現在' },
            ]}
          />
        </div>
      </div>

      {/* 年齢スライダー */}
      {mode === 'sameAge' && (
        <Card className="p-4">
          <label className="flex items-center gap-4">
            <span className="shrink-0 text-sm font-medium text-neutral-700">
              <span className="text-lg font-bold tabular-nums text-brand-700">{ageLabel(targetAge)}</span> 時点で比較
            </span>
            <input
              type="range"
              min={0}
              max={36}
              value={ageX2 ?? defaultAge}
              onChange={(e) => setAgeX2(Number(e.target.value))}
              className="flex-1 accent-brand-600"
            />
          </label>
          <p className="mt-2 text-xs text-neutral-400">
            各項目の達成日をもとに「その人が{ageLabel(targetAge)}だった日」までのチェック状態を再構成しています。生年月日が未設定のメンバーは現在の状態で表示します。
          </p>
        </Card>
      )}

      {selected.length < 2 ? (
        <EmptyState icon="touch_app" title="2人以上選択してください" />
      ) : (
        <CompareBody
          selected={selected}
          allChecks={allChecks}
          items={items}
          mode={mode}
          targetAge={targetAge}
          memberColors={selected.map((m) => MEMBER_COLORS[members.findIndex((x) => x.id === m.id)])}
          langs={langs}
        />
      )}
    </div>
  )
}

function CompareBody({
  selected,
  allChecks,
  items,
  mode,
  targetAge,
  memberColors,
  langs,
}: {
  selected: Member[]
  allChecks: CheckRecord[]
  items: CanDoItem[]
  mode: Mode
  targetAge: number
  memberColors: string[]
  langs: Lang[]
}) {
  const today = todayStr()

  const rows = useMemo(
    () =>
      selected.map((member, i) => {
        const checks = allChecks.filter((c) => c.memberId === member.id)
        // 生年月日がなければ同年齢再構成はできないため現在時点で扱う
        const asOfDate = mode === 'sameAge' && member.birthDate ? dateAtAge(member.birthDate, targetAge) : today
        const effectiveDate = asOfDate > today ? today : asOfDate
        const notYet = asOfDate > today // まだその年齢に達していない
        const firstRecordedAt = checks.length
          ? checks.map((c) => c.recordedAt.slice(0, 10)).sort()[0]
          : null
        // 記録開始前:比較時点がこの人の記録開始より前(過去データが存在しない期間)
        const beforeRecords = !notYet && firstRecordedAt !== null && asOfDate < firstRecordedAt
        const checkedIds = checkedIdsAsOf(checks, effectiveDate)
        const momentumFrom = addMonths(effectiveDate, -3)
        const momentum = checks.filter((c) => c.achievedOn > momentumFrom && c.achievedOn <= effectiveDate).length
        return { member, color: memberColors[i], checks, checkedIds, effectiveDate, notYet, beforeRecords, totalChecked: checkedIds.size, momentum }
      }),
    [selected, allChecks, mode, targetAge],
  )

  /** メンバー×言語×技能の到達レベルと状態(履歴再構成した checkedIds に対して算出) */
  const evalOf = (
    member: Member,
    lang: Lang,
    skill: Skill,
    checkedIds: Set<string>,
    checks: CheckRecord[],
    effectiveDate: string,
  ): { level: number | null; status: Status } => {
    const subset = items.filter((i) => i.lang === lang && i.skill === skill)
    const { level } = computeLevel(subset, checkedIds)
    const ml: MemberLanguage =
      member.languages.find((l) => l.lang === lang) ?? { lang, role: 'foreign1', targetStage: 5, pace: 1 }
    const firstCheckOn = firstCheckOnFor(checks, lang)
    const { status } = assessProgress({ level, ml, member, firstCheckOn, today: effectiveDate })
    return { level, status }
  }

  return (
    <>
      {/* サマリー */}
      <section>
        <SectionTitle>サマリー{mode === 'sameAge' ? `(${ageLabel(targetAge)}時点)` : '(現在)'}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.member.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                <span className="font-bold text-neutral-800">{r.member.name}</span>
                {r.notYet && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">まだこの年齢ではありません</span>}
                {r.beforeRecords && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">記録開始前</span>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-neutral-50 py-2">
                  <div className="text-lg font-bold tabular-nums text-neutral-800">{r.totalChecked}</div>
                  <div className="text-xs text-neutral-400">達成項目</div>
                </div>
                <div className="rounded-xl bg-neutral-50 py-2">
                  <div className="text-lg font-bold tabular-nums text-neutral-800">{r.momentum}</div>
                  <div className="text-xs text-neutral-400">直近3ヶ月</div>
                </div>
              </div>
              {r.beforeRecords && (
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                  この時点ではまだ記録を始めていなかったため、実際より少なく見える可能性があります。
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* レーダー重ね表示 */}
      <section>
        <SectionTitle>言語×技能レーダー(重ね表示)</SectionTitle>
        <Card className="grid gap-4 p-4 sm:grid-cols-3">
          {langs.map((lang) => (
            <RadarBlock
              key={lang}
              title={T.lang[lang]}
              series={rows.map((r) => ({
                name: r.member.name,
                color: r.color,
                values: Object.fromEntries(
                  SKILLS.map((s) => [s, evalOf(r.member, lang, s, r.checkedIds, r.checks, r.effectiveDate).level]),
                ) as Record<Skill, number | null>,
              }))}
            />
          ))}
        </Card>
      </section>

      {/* ステータス表 */}
      <section>
        <SectionTitle>技能別ステータス</SectionTitle>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-left">
                <th className="px-3 py-2.5 font-semibold text-neutral-500">言語 / 技能</th>
                {rows.map((r) => (
                  <th key={r.member.id} className="px-3 py-2.5 font-semibold text-neutral-700">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                      {r.member.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {langs.flatMap((lang) =>
                SKILLS.map((skill) => (
                  <tr key={`${lang}-${skill}`} className="border-b border-neutral-100 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-600">
                      {T.lang[lang]}・{T.skill[skill]}
                    </td>
                    {rows.map((r) => {
                      const e = evalOf(r.member, lang, skill, r.checkedIds, r.checks, r.effectiveDate)
                      return (
                        <td key={r.member.id} className="px-3 py-2">
                          <span className="flex items-center gap-1.5">
                            <StatusBadge status={e.status} />
                            {e.level !== null && (
                              <span className="text-xs tabular-nums text-neutral-400">S{e.level.toFixed(1)}</span>
                            )}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-neutral-400">{T.compareNote}</p>
      </section>
    </>
  )
}
