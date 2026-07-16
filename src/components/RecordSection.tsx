import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useApp } from '../context/AppContext'
import { SKILLS, STAGES, type CheckRecord, type Lang, type Skill } from '../types'
import { computeLevel } from '../lib/logic'
import { Card, Icon, LangChip, ProgressBar, Segmented, SkillLabel, stageLabelWithAge } from './ui'
import { CheckRow } from './CheckRow'
import { T } from '../i18n'

type LangFilter = 'all' | Lang
type SkillFilter = 'all' | Skill

/**
 * F2: チェックリスト記録(ホームに統合するセクション本体)。
 * - 母語トラックの到達レベルから「取り組み中の段階」をデフォルトで開く
 * - 言語×技能フィルタ、未達成が上
 * - 段階・技能ごとの進捗バー常時表示
 * - 並び順は表示時点のチェック状態で固定(チェック直後に行が飛ばない)。
 *   チェック済みが下へ移動するのは次回起動時・ページ遷移で戻ってきたとき
 */
export function RecordSection() {
  const { selectedMember, memberLanguages, langs } = useApp()
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const checks = useLiveQuery(
    () => (selectedMember ? db.checks.where('memberId').equals(selectedMember.id).toArray() : Promise.resolve([] as CheckRecord[])),
    [selectedMember?.id],
    undefined,
  )
  const [langFilter, setLangFilter] = useState<LangFilter>('all')
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all')

  const checkByItem = useMemo(() => new Map((checks ?? []).map((c) => [c.itemId, c])), [checks])

  // デフォルト展開段:母語(native)トラックの到達レベルから floor(level)+1(未記録ならS1)
  const nativeLang = memberLanguages.find((ml) => ml.role === 'native')?.lang
  const defaultStage = useMemo(() => {
    if (!items || !nativeLang) return 1
    const nativeItems = items.filter((i) => i.lang === nativeLang)
    const checkedIds = new Set((checks ?? []).map((c) => c.itemId))
    const { level } = computeLevel(nativeItems, checkedIds)
    return level === null ? 1 : Math.min(Math.floor(level) + 1, STAGES.length)
  }, [items, checks, nativeLang])

  const [openStages, setOpenStages] = useState<Set<number> | null>(null)
  const opened = openStages ?? new Set([defaultStage])

  // 並び替え用スナップショット:マウント時(またはメンバーの切替時)のチェック状態を保持する。
  // 以降のチェック操作では並びを変えず、再マウント時に初めて反映される。
  const [sortSnapshot, setSortSnapshot] = useState<{ memberId: string; checked: Set<string> } | null>(null)
  const checksLoaded = checks !== undefined
  useEffect(() => {
    if (!checksLoaded || !selectedMember) return
    setSortSnapshot((prev) =>
      prev?.memberId === selectedMember.id
        ? prev
        : { memberId: selectedMember.id, checked: new Set((checks ?? []).map((c) => c.itemId)) },
    )
    // checks は並び順の基準を固定したいため、意図的に依存に含めない
  }, [checksLoaded, selectedMember?.id])

  if (items === undefined || checks === undefined) return null
  if (!selectedMember) return null

  const snapChecked =
    sortSnapshot?.memberId === selectedMember.id ? sortSnapshot.checked : new Set(checkByItem.keys())

  const filtered = items.filter(
    (i) =>
      langs.includes(i.lang) &&
      (langFilter === 'all' || i.lang === langFilter) &&
      (skillFilter === 'all' || i.skill === skillFilter),
  )

  const toggleStage = (idx: number) => {
    const next = new Set(opened)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    setOpenStages(next)
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

      {/* 段階アコーディオン */}
      <div className="space-y-3">
        {STAGES.map((stage) => {
          const stageItems = filtered.filter((i) => i.stage === stage.idx)
          if (stageItems.length === 0) return null
          const checkedCount = stageItems.filter((i) => checkByItem.has(i.id)).length
          const isOpen = opened.has(stage.idx)
          return (
            <Card key={stage.idx} className="overflow-hidden">
              <button
                onClick={() => toggleStage(stage.idx)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50"
              >
                <span className={`text-sm font-bold ${stage.idx === defaultStage ? 'text-brand-700' : 'text-neutral-800'}`}>
                  {stageLabelWithAge(stage.idx)}
                  {stage.idx === defaultStage && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">いま</span>}
                </span>
                <ProgressBar ratio={stageItems.length ? checkedCount / stageItems.length : 0} className="flex-1" />
                <Icon name="expand_more" className={`text-xl text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-neutral-100 px-2 pb-3 pt-1">
                  {langs.filter((l) => langFilter === 'all' || l === langFilter).map((lang) =>
                    SKILLS.filter((s) => skillFilter === 'all' || s === skillFilter).map((skill) => {
                      const group = stageItems
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
                            <CheckRow key={item.id} item={item} check={checkByItem.get(item.id)} memberId={selectedMember.id} />
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
