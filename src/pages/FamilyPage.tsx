import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import type { CanDoItem, CheckRecord, Lang, Member } from '../types'
import { ageAt, ageLabel, dateAtAge, todayStr } from '../lib/dates'
import { assessProgress, checkedIdsAsOf, computeLevel, firstCheckOnFor, type Status } from '../lib/logic'
import { Card, EmptyState, Icon, LangChip, SectionTitle, StatusBadge } from '../components/ui'
import { T } from '../i18n'

/** 家族内に登場する全言語(重複除去・初出順) */
function familyLangs(members: Member[]): Lang[] {
  const seen: Lang[] = []
  for (const m of members) {
    for (const ml of m.languages) {
      if (!seen.includes(ml.lang)) seen.push(ml.lang)
    }
  }
  return seen
}

/** メンバー×言語の到達レベル・ステータス(言語構成になければ null) */
function memberLangEval(
  member: Member,
  lang: Lang,
  items: CanDoItem[],
  checks: { itemId: string; achievedOn: string }[],
  today: string,
): { level: number | null; status: Status } | null {
  const ml = member.languages.find((l) => l.lang === lang)
  if (!ml) return null
  const checkedIds = new Set(checks.map((c) => c.itemId))
  const subset = items.filter((i) => i.lang === lang)
  const { level } = computeLevel(subset, checkedIds)
  const firstCheckOn = firstCheckOnFor(checks, lang)
  const { status } = assessProgress({ level, ml, member, firstCheckOn, today })
  return { level, status }
}

const BEHIND_STATUSES: Status[] = ['slightBehind', 'attention', 'unrecorded']

interface HeritageAlert {
  key: string
  lang: Lang
  child: Member
  adultNames: string[]
  kind: 'missing' | 'behind'
  status?: Status
  levelLabel?: string
}

/** 大人の母語ごとに、各子供の言語構成・到達状況をチェックしてリスクを検出する */
function computeHeritageAlerts(
  members: Member[],
  items: CanDoItem[],
  allChecks: CheckRecord[],
  today: string,
): HeritageAlert[] {
  const adults = members.filter((m) => m.kind === 'adult')
  const children = members.filter((m) => m.kind === 'child')
  const map = new Map<string, HeritageAlert>()

  for (const adult of adults) {
    const natives = adult.languages.filter((ml) => ml.role === 'native')
    for (const nativeMl of natives) {
      for (const child of children) {
        const key = `${nativeMl.lang}:${child.id}`
        const childMl = child.languages.find((l) => l.lang === nativeMl.lang)

        if (!childMl) {
          const existing = map.get(key)
          if (existing) existing.adultNames.push(adult.name)
          else map.set(key, { key, lang: nativeMl.lang, child, adultNames: [adult.name], kind: 'missing' })
          continue
        }

        const checks = allChecks.filter((c) => c.memberId === child.id)
        const eval_ = memberLangEval(child, nativeMl.lang, items, checks, today)
        if (eval_ && BEHIND_STATUSES.includes(eval_.status)) {
          const levelLabel = eval_.level !== null ? `S${eval_.level.toFixed(1)}` : '未記録'
          const existing = map.get(key)
          if (existing) existing.adultNames.push(adult.name)
          else
            map.set(key, {
              key,
              lang: nativeMl.lang,
              child,
              adultNames: [adult.name],
              kind: 'behind',
              status: eval_.status,
              levelLabel,
            })
        }
      }
    }
  }

  return Array.from(map.values())
}

/**
 * M5: 家族バランスビュー+継承語アラート。
 * 「見比べ」は優劣づけではなく、家族の言語配分から打ち手を見つけるための道具として構成する。
 */
export default function FamilyPage() {
  const { members } = useApp()
  const allChecks = useLiveQuery(() => db.checks.toArray(), [], undefined)
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)

  if (items === undefined || allChecks === undefined) return null

  if (members.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">{T.nav.compare}</h1>
        <EmptyState icon="groups" title="メンバーが未登録です">
          <Link to="/onboarding" className="font-medium text-brand-600">メンバーを登録</Link>すると家族バランスを見られます。
        </EmptyState>
      </div>
    )
  }

  const today = todayStr()
  const allLangs = familyLangs(members)
  const alerts = computeHeritageAlerts(members, items, allChecks, today)
  const agedChildren = members.filter((m) => m.kind === 'child' && m.birthDate)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">{T.nav.compare}</h1>
        <p className="mt-1 text-sm text-neutral-500">{T.compareNote}</p>
      </div>

      <FamilyMatrix members={members} items={items} allChecks={allChecks} allLangs={allLangs} today={today} />

      <HeritageAlerts alerts={alerts} />

      {agedChildren.length >= 2 && (
        <SameAgeCompare childMembers={agedChildren} items={items} allChecks={allChecks} allLangs={allLangs} />
      )}
    </div>
  )
}

/* ---------- 家族マトリクス ---------- */

function FamilyMatrix({
  members,
  items,
  allChecks,
  allLangs,
  today,
}: {
  members: Member[]
  items: CanDoItem[]
  allChecks: CheckRecord[]
  allLangs: Lang[]
  today: string
}) {
  return (
    <section>
      <SectionTitle>家族マトリクス</SectionTitle>
      {allLangs.length === 0 ? (
        <EmptyState icon="translate" title="まだ言語構成が設定されていません">
          設定からメンバーの言語を登録してください。
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-left">
                <th className="px-3 py-2.5 font-semibold text-neutral-500">メンバー</th>
                {allLangs.map((lang) => (
                  <th key={lang} className="px-3 py-2.5 font-semibold text-neutral-700">
                    <LangChip lang={lang} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const checks = allChecks.filter((c) => c.memberId === member.id)
                return (
                  <tr key={member.id} className="border-b border-neutral-100 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="font-medium text-neutral-800">{member.name}</span>
                      <span className="ml-1.5 text-xs text-neutral-400">{member.kind === 'adult' ? '大人' : '子供'}</span>
                    </td>
                    {allLangs.map((lang) => {
                      const e = memberLangEval(member, lang, items, checks, today)
                      return (
                        <td key={lang} className="px-3 py-2.5">
                          {e ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold tabular-nums text-neutral-500">
                                {e.level !== null ? `s${e.level.toFixed(1)}` : 's—'}
                              </span>
                              <StatusBadge status={e.status} />
                            </span>
                          ) : (
                            <span className="text-neutral-300">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ---------- 継承語アラート ---------- */

function HeritageAlerts({ alerts }: { alerts: HeritageAlert[] }) {
  const { selectMember } = useApp()
  const navigate = useNavigate()

  const goToPlan = (child: Member) => {
    selectMember(child.id)
    navigate('/plan')
  }

  return (
    <section>
      <SectionTitle>継承語アラート</SectionTitle>
      <p className="mb-3 -mt-1 text-xs text-neutral-400">
        大人メンバーの母語が、子供メンバーの学習言語として十分に育っているかをチェックします。
      </p>
      {alerts.length === 0 ? (
        <Card className="flex items-center gap-2 p-5 text-sm text-neutral-500">
          <Icon name="check_circle" className="text-lg text-emerald-500" />
          いまのところ継承語のリスクは見つかっていません。
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const adultNames = Array.from(new Set(a.adultNames)).join('・')
            const langName = T.lang[a.lang]
            return (
              <div key={a.key} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2.5">
                  <Icon name="warning" className="mt-0.5 shrink-0 text-lg text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-relaxed text-amber-900">
                      {a.kind === 'missing' ? (
                        <>
                          {adultNames}さんの母語({langName})が、{a.child.name}さんの学習言語に設定されていません。
                        </>
                      ) : (
                        <>
                          {adultNames}さんの母語({langName})が、{a.child.name}さんで伸びていません(現在{a.levelLabel}・
                          {T.status[a.status!]})。
                        </>
                      )}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-amber-700">
                      <li>家庭内でその言語で過ごす時間を決める(例:夕食時は{langName}で話す)</li>
                      <li>{langName}の絵本・動画を週2〜3回、生活の中に取り入れる</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => goToPlan(a.child)}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
                    >
                      {a.child.name}さんのプランで対策を見る
                      <Icon name="arrow_forward" className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ---------- 同時期比較(参考) ---------- */

function SameAgeCompare({
  childMembers,
  items,
  allChecks,
  allLangs,
}: {
  childMembers: Member[]
  items: CanDoItem[]
  allChecks: CheckRecord[]
  allLangs: Lang[]
}) {
  const [ageX2, setAgeX2] = useState<number | null>(null) // 0.5歳刻み(値は年齢×2)
  const today = todayStr()

  // 一番幼い子の現在年齢をデフォルトの比較時点にする
  const youngest = childMembers.slice().sort((a, b) => (b.birthDate ?? '').localeCompare(a.birthDate ?? ''))[0]
  const defaultAgeX2 = youngest ? Math.floor(ageAt(youngest.birthDate!, today) * 2) : 12
  const targetAge = (ageX2 ?? defaultAgeX2) / 2

  const langsInUse = allLangs.filter((lang) => childMembers.some((m) => m.languages.some((ml) => ml.lang === lang)))

  const rows = childMembers.map((child) => {
    const checks = allChecks.filter((c) => c.memberId === child.id)
    const asOfDate = dateAtAge(child.birthDate!, targetAge)
    const effectiveDate = asOfDate > today ? today : asOfDate
    const notYet = asOfDate > today
    const checkedIds = checkedIdsAsOf(checks, effectiveDate)
    return { child, checks, effectiveDate, notYet, checkedIds }
  })

  return (
    <section>
      <SectionTitle>同時期比較(参考)</SectionTitle>
      <Card className="p-4">
        <label className="flex items-center gap-4">
          <span className="shrink-0 text-sm font-medium text-neutral-700">
            <span className="text-lg font-bold tabular-nums text-brand-700">{ageLabel(targetAge)}</span> 時点で比較
          </span>
          <input
            type="range"
            min={0}
            max={36}
            value={ageX2 ?? defaultAgeX2}
            onChange={(e) => setAgeX2(Number(e.target.value))}
            className="flex-1 accent-brand-600"
          />
        </label>
        <p className="mt-2 text-xs text-neutral-400">
          達成日をもとに「その子が{ageLabel(targetAge)}だった日」までのチェック状態を再構成した参考値です。優劣ではなく、ペースの違いを知るための目安です。
        </p>
      </Card>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/70 text-left">
              <th className="px-3 py-2.5 font-semibold text-neutral-500">子供</th>
              {langsInUse.map((lang) => (
                <th key={lang} className="px-3 py-2.5 font-semibold text-neutral-700">
                  <LangChip lang={lang} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.child.id} className="border-b border-neutral-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="font-medium text-neutral-800">{r.child.name}</span>
                  {r.notYet && <span className="ml-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">まだこの年齢ではありません</span>}
                </td>
                {langsInUse.map((lang) => {
                  const ml = r.child.languages.find((l) => l.lang === lang)
                  if (!ml) {
                    return (
                      <td key={lang} className="px-3 py-2.5 text-neutral-300">
                        —
                      </td>
                    )
                  }
                  const subset = items.filter((i) => i.lang === lang)
                  const { level } = computeLevel(subset, r.checkedIds)
                  const firstCheckOn = firstCheckOnFor(r.checks, lang)
                  const { status } = assessProgress({ level, ml, member: r.child, firstCheckOn, today: r.effectiveDate })
                  return (
                    <td key={lang} className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold tabular-nums text-neutral-500">
                          {level !== null ? `s${level.toFixed(1)}` : 's—'}
                        </span>
                        <StatusBadge status={status} />
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-neutral-400">{T.compareNote}</p>
    </section>
  )
}
