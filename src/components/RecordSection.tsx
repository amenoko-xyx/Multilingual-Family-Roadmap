import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { BANDS, SKILLS, type CheckRecord, type Lang, type Skill } from '../types'
import { ageAt, todayStr } from '../lib/dates'
import { bandOfAge } from '../lib/logic'
import { Card, Icon, LangChip, ProgressBar, Segmented, SkillLabel } from './ui'
import { CheckRow } from './CheckRow'
import { T } from '../i18n'

type LangFilter = 'all' | Lang
type SkillFilter = 'all' | Skill

/**
 * F2: チェックリスト記録(ホームに統合するセクション本体)。
 * - 現在年齢の年齢帯をデフォルトで開く
 * - 言語×技能フィルタ、未達成が上
 * - 帯・技能ごとの進捗バー常時表示
 * - 並び順は表示時点のチェック状態で固定(チェック直後に行が飛ばない)。
 *   チェック済みが下へ移動するのは次回起動時・ページ遷移で戻ってきたとき
 */
export function RecordSection() {
  const { selectedChild, langs } = useApp()
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const checks = useLiveQuery(
    () => (selectedChild ? db.checks.where('childId').equals(selectedChild.id).toArray() : Promise.resolve([] as CheckRecord[])),
    [selectedChild?.id],
    undefined,
  )
  const [langFilter, setLangFilter] = useState<LangFilter>('all')
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all')

  const currentBand = selectedChild ? bandOfAge(ageAt(selectedChild.birthDate, todayStr())) : 0
  const [openBands, setOpenBands] = useState<Set<number> | null>(null)
  const opened = openBands ?? new Set([currentBand])

  const checkByItem = useMemo(() => new Map((checks ?? []).map((c) => [c.itemId, c])), [checks])

  // 並び替え用スナップショット:マウント時(または子供の切替時)のチェック状態を保持する。
  // 以降のチェック操作では並びを変えず、再マウント時に初めて反映される。
  const [sortSnapshot, setSortSnapshot] = useState<{ childId: string; checked: Set<string> } | null>(null)
  const checksLoaded = checks !== undefined
  useEffect(() => {
    if (!checksLoaded || !selectedChild) return
    setSortSnapshot((prev) =>
      prev?.childId === selectedChild.id
        ? prev
        : { childId: selectedChild.id, checked: new Set((checks ?? []).map((c) => c.itemId)) },
    )
    // checks は並び順の基準を固定したいため、意図的に依存に含めない
  }, [checksLoaded, selectedChild?.id])

  if (items === undefined || checks === undefined) return null
  if (!selectedChild) return null

  const snapChecked =
    sortSnapshot?.childId === selectedChild.id ? sortSnapshot.checked : new Set(checkByItem.keys())

  const filtered = items.filter(
    (i) =>
      langs.includes(i.lang) &&
      (langFilter === 'all' || i.lang === langFilter) &&
      (skillFilter === 'all' || i.skill === skillFilter),
  )

  const toggleBand = (idx: number) => {
    const next = new Set(opened)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    setOpenBands(next)
  }

  return (
    <div className="space-y-5">
      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<LangFilter>
          value={langFilter}
          onChange={setLangFilter}
          options={[{ value: 'all', label: 'すべて' }, ...langs.map((l) => ({ value: l as LangFilter, label: T.lang[l] }))]}
        />
        <Segmented<SkillFilter>
          value={skillFilter}
          onChange={setSkillFilter}
          options={[{ value: 'all', label: '4技能' }, ...SKILLS.map((s) => ({ value: s as SkillFilter, label: T.skill[s] }))]}
        />
      </div>

      {/* 年齢帯アコーディオン */}
      <div className="space-y-3">
        {BANDS.map((band) => {
          const bandItems = filtered.filter((i) => i.band === band.idx)
          if (bandItems.length === 0) return null
          const checkedCount = bandItems.filter((i) => checkByItem.has(i.id)).length
          const isOpen = opened.has(band.idx)
          return (
            <Card key={band.idx} className="overflow-hidden">
              <button
                onClick={() => toggleBand(band.idx)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50"
              >
                <span className={`text-sm font-bold ${band.idx === currentBand ? 'text-brand-700' : 'text-neutral-800'}`}>
                  {band.label}
                  {band.idx === currentBand && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">いま</span>}
                </span>
                <ProgressBar ratio={bandItems.length ? checkedCount / bandItems.length : 0} className="flex-1" />
                <Icon name="expand_more" className={`text-xl text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-neutral-100 px-2 pb-3 pt-1">
                  {langs.filter((l) => langFilter === 'all' || l === langFilter).map((lang) =>
                    SKILLS.filter((s) => skillFilter === 'all' || s === skillFilter).map((skill) => {
                      const group = bandItems
                        .filter((i) => i.lang === lang && i.skill === skill)
                        .sort((a, b) => Number(snapChecked.has(a.id)) - Number(snapChecked.has(b.id)) || a.order - b.order)
                      if (group.length === 0) return null
                      const done = group.filter((i) => checkByItem.has(i.id)).length
                      return (
                        <div key={`${lang}-${skill}`} className="mt-1 border-b border-neutral-100 pb-1 last:border-0">
                          {/* 技能はリストの見出し行として左端に統一 */}
                          <div className="flex items-center gap-2.5 px-2 py-2">
                            <SkillLabel skill={skill} />
                            <LangChip lang={lang} />
                            <span className="ml-auto text-xs tabular-nums text-neutral-400">{done}/{group.length}</span>
                          </div>
                          {group.map((item) => (
                            <CheckRow key={item.id} item={item} check={checkByItem.get(item.id)} childId={selectedChild.id} />
                          ))}
                        </div>
                      )
                    }),
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
