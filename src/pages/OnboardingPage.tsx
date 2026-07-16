import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addCheck, db, removeCheck, uid } from '../db'
import { useApp } from '../context/AppContext'
import { DEFAULT_MEMBER_LANGS, SKILLS, STAGES, type CanDoItem, type Lang } from '../types'
import { minBirthDateStr, todayStr } from '../lib/dates'
import { Card, GeoBanner, Icon, LangChip, PrimaryButton, ProgressBar, Segmented, SkillLabel, stageLabelWithAge } from '../components/ui'
import { T } from '../i18n'

const STEPS = ['メンバーの情報', 'いまのようす', '完了'] as const

/**
 * オンボーディング:メンバー(大人・子供)の登録 →「いまできること」の初期チェック → 完了。
 * - 現在ステップを常に表示(ニールセン: システム状態の可視化)
 * - 初期チェックはスキップ可能・後から変更可能(ニールセン: ユーザーの主導権と柔軟性)
 * - OOUI: まず「メンバー」というオブジェクトを作り、そのオブジェクトに記録を紐づけていく流れ
 */
export default function OnboardingPage() {
  const { members, selectMember, showToast } = useApp()
  const navigate = useNavigate()
  const isFirst = members.length === 0
  const [step, setStep] = useState(0)
  const [memberId, setMemberId] = useState<string | null>(null)

  // Step 0 フォーム
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'adult' | 'child'>('child')
  const [birthDate, setBirthDate] = useState('')
  const [note, setNote] = useState('')

  const createMember = async () => {
    if (!name.trim()) return
    // 子供は生年月日必須。大人は任意(入力時のみ範囲チェック)
    if (kind === 'child' && !birthDate) return
    if (birthDate && (birthDate < minBirthDateStr() || birthDate > todayStr())) {
      showToast({ message: '生年月日を確認してください(0〜100歳を想定しています)' })
      return
    }
    const id = uid()
    await db.members.put({
      id,
      name: name.trim(),
      kind,
      birthDate: birthDate || null,
      note: note.trim() || undefined,
      languages: DEFAULT_MEMBER_LANGS,
    })
    selectMember(id)
    setMemberId(id)
    setStep(1)
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* ステップインジケーター */}
      <ol className="flex items-center justify-center gap-1 text-xs" aria-label="登録の進行状況">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-1">
            {i > 0 && <span className="mx-1 h-px w-6 bg-neutral-200" aria-hidden />}
            <span
              aria-current={step === i ? 'step' : undefined}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
                step === i ? 'bg-brand-600 text-white' : step > i ? 'text-brand-700' : 'text-neutral-400'
              }`}
            >
              {step > i ? <Icon name="check_circle" className="text-sm" /> : <span className="tabular-nums">{i + 1}</span>}
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="p-6">
          {isFirst && (
            <div className="mb-5 text-center">
              <GeoBanner className="mb-4 h-20" />
              <h2 className="mt-2 text-lg font-bold text-neutral-900">ようこそ {T.appName} へ</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                選んだ言語のレベル段階ロードマップで、家族の「できた」を記録していくアプリです。
                まずメンバーを登録しましょう。
              </p>
            </div>
          )}
          {!isFirst && (
            <h2 className="mb-4 text-lg font-bold text-neutral-900">メンバーを追加</h2>
          )}
          <div className="space-y-3">
            <div className="text-sm text-neutral-600">
              区分
              <div className="mt-1">
                <Segmented<'adult' | 'child'>
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: 'child', label: '子供' },
                    { value: 'adult', label: '大人' },
                  ]}
                />
              </div>
            </div>
            <label className="block text-sm text-neutral-600">
              名前(ニックネーム可)<span className="ml-1 text-rose-500">*</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例:はな"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm text-neutral-600">
              生年月日{kind === 'child' ? <span className="ml-1 text-rose-500">*</span> : <span className="ml-1 text-neutral-400">(任意)</span>}
              <input
                type="date"
                value={birthDate}
                min={minBirthDateStr()}
                max={todayStr()}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm text-neutral-600">
              メモ(任意)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例:プリスクール週2回"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
              />
            </label>
            <PrimaryButton onClick={createMember} disabled={!name.trim() || (kind === 'child' && !birthDate)} className="w-full">
              次へ:いまのようすを記録
            </PrimaryButton>
            {!isFirst && (
              <button onClick={() => navigate('/')} className="w-full rounded-xl px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-50">
                キャンセル
              </button>
            )}
          </div>
        </Card>
      )}

      {step === 1 && memberId && (
        <AssessmentStep memberId={memberId} memberName={name} onDone={() => setStep(2)} />
      )}

      {step === 2 && memberId && <DoneStep memberId={memberId} memberName={name} />}
    </div>
  )
}

/* ---------- Step 2: いまのようすチェック ---------- */

function AssessmentStep({ memberId, memberName, onDone }: { memberId: string; memberName: string; onDone: () => void }) {
  const { langs } = useApp()
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const cells = useLiveQuery(() => db.cells.toArray(), [], undefined)
  const checks = useLiveQuery(() => db.checks.where('memberId').equals(memberId).toArray(), [memberId], undefined)
  // 言語は第一→第二→第三の順に強制的に入力する(タブでの自由移動はしない)
  const [langIdx, setLangIdx] = useState(0)
  // 言語ごとの確認開始段階。未定義=まだ自己申告していない(自己申告画面を表示)
  const [startStages, setStartStages] = useState<Record<string, number>>({})
  const lang: Lang = langs[langIdx]
  const isLast = langIdx === langs.length - 1
  const startStage = startStages[lang] as number | undefined

  const checkedIds = useMemo(() => new Set((checks ?? []).map((c) => c.itemId)), [checks])

  if (items === undefined || cells === undefined || checks === undefined) return null

  const langChecked = (l: Lang) => items.filter((i) => i.lang === l && checkedIds.has(i.id)).length
  const benchmarkOf = (l: Lang, stage: number) => cells.find((c) => c.lang === l && c.stage === stage)?.benchmarks.foreign

  // 自己申告:選んだ段階の1つ下から確認を始め、それより前の項目は達成済みとして記録する
  const chooseLevel = async (stage: number | null) => {
    const start = stage === null ? 1 : Math.max(1, stage - 1)
    if (start > 1) {
      const toCheck = items.filter((i) => i.lang === lang && i.stage < start && !checkedIds.has(i.id))
      for (const it of toCheck) await addCheck(memberId, it.id, todayStr())
    }
    setStartStages((s) => ({ ...s, [lang]: start }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goNext = () => {
    if (isLast) return onDone()
    setLangIdx(langIdx + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goBack = () => {
    if (langIdx === 0) return
    setLangIdx(langIdx - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggle = (item: CanDoItem) => {
    if (checkedIds.has(item.id)) return removeCheck(memberId, item.id)
    return addCheck(memberId, item.id, todayStr())
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-lg font-bold text-neutral-900">{memberName}さんの「いまできること」</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">
          言語ごとに「いまどのくらいか」をざっくり選ぶと、その少し下のレベルから確認を始めます。
          正確でなくて大丈夫です。<strong className="font-semibold text-neutral-600">あとからいつでも変更できます。</strong>
        </p>
      </Card>

      {/* 言語の進行インジケーター(順番に入力。タップでの移動はできない) */}
      <ol className={`grid gap-2 ${langs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} aria-label="言語の入力順">
        {langs.map((l, i) => (
          <li
            key={l}
            aria-current={i === langIdx ? 'step' : undefined}
            className={`rounded-xl border px-2 py-2 text-center ${
              i === langIdx
                ? 'border-brand-500 bg-brand-50'
                : i < langIdx
                  ? 'border-neutral-200 bg-white'
                  : 'border-neutral-200 bg-neutral-50 opacity-60'
            }`}
          >
            <span className="flex items-center justify-center gap-1 text-sm font-semibold text-neutral-800">
              {i < langIdx && <Icon name="check_circle" className="text-sm text-brand-600" />}
              {T.lang[l]}
            </span>
            <span className="mt-0.5 block text-xs tabular-nums text-neutral-400">
              {i === langIdx ? '入力中' : i < langIdx ? `${langChecked(l)}項目` : 'このあと'}
            </span>
          </li>
        ))}
      </ol>

      {/* フェーズ1: 自己申告(レベルをざっくり選ぶ) */}
      {startStage === undefined && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 bg-neutral-50/60 px-4 py-3">
            <LangChip lang={lang} />
            <span className="text-sm font-bold text-neutral-800">いまどのくらいですか?(自己申告)</span>
          </div>
          <div className="space-y-2 p-3">
            <button
              onClick={() => chooseLevel(null)}
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40"
            >
              <Icon name="flag" className="text-lg text-neutral-400" />
              <span className="text-sm font-medium text-neutral-800">まだ始めていない・最初から確認する</span>
            </button>
            {STAGES.map((stage) => (
              <button
                key={stage.idx}
                onClick={() => chooseLevel(stage.idx)}
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40"
              >
                <span className="text-sm font-semibold text-neutral-800">{stageLabelWithAge(stage.idx)}くらい</span>
                {benchmarkOf(lang, stage.idx) && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">{benchmarkOf(lang, stage.idx)}</span>
                )}
              </button>
            ))}
          </div>
          <p className="border-t border-neutral-100 px-4 py-3 text-xs leading-relaxed text-neutral-400">
            選んだ段階の1つ下から確認を始めます。それより前の項目は「できる」として記録します(あとから個別に取り消せます)。
          </p>
        </Card>
      )}

      {/* フェーズ2: チェックリストで確認 */}
      {startStage !== undefined && startStage > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-500">
          <span>{stageLabelWithAge(startStage)}から確認しています(それ以前は達成済みとして記録済み)</span>
          <button
            onClick={() => setStartStages((s) => ({ ...s, [lang]: 1 }))}
            className="font-medium text-brand-600 underline decoration-brand-300 underline-offset-2"
          >
            最初のレベルから確認する
          </button>
        </div>
      )}

      {startStage !== undefined && STAGES.filter((s) => s.idx >= startStage).map((stage) => {
        const stageItems = items.filter((i) => i.lang === lang && i.stage === stage.idx)
        if (stageItems.length === 0) return null
        const done = stageItems.filter((i) => checkedIds.has(i.id)).length
        return (
          <Card key={stage.idx} className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-neutral-100 bg-neutral-50/60 px-4 py-3">
              <span className="text-sm font-bold text-neutral-800">{stageLabelWithAge(stage.idx)}</span>
              <ProgressBar ratio={stageItems.length ? done / stageItems.length : 0} className="flex-1" />
            </div>
            <div className="px-2 py-2">
              {SKILLS.map((skill) => {
                const group = stageItems.filter((i) => i.skill === skill).sort((a, b) => a.order - b.order)
                if (group.length === 0) return null
                return (
                  <div key={skill} className="border-b border-neutral-100 py-1 last:border-0">
                    <SkillLabel skill={skill} className="my-1" />
                    {group.map((item) => {
                      const checked = checkedIds.has(item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item)}
                          aria-pressed={checked}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-neutral-50"
                        >
                          {/* チェックはリストの右端に配置。2行時も行高1.5を確保 */}
                          <span className={`min-w-0 flex-1 text-sm leading-[1.5] ${checked ? 'text-neutral-500' : 'text-neutral-800'}`}>
                            {item.text}
                          </span>
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
                              checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-neutral-300 text-transparent'
                            }`}
                          >
                            <Icon name="check" className="text-xl" />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}

      <div className="sticky bottom-4 space-y-2">
        <div className="flex gap-2">
          {langIdx > 0 && (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-50"
            >
              <Icon name="arrow_back" className="text-base" />
              {T.lang[langs[langIdx - 1]]}
            </button>
          )}
          <PrimaryButton onClick={goNext} className="flex-1 shadow-md">
            {isLast
              ? `チェックを終える(合計${checks.length}項目)`
              : `次へ:${T.lang[langs[langIdx + 1]]}(${T.lang[lang]} ${langChecked(lang)}項目)`}
          </PrimaryButton>
        </div>
        <button
          onClick={onDone}
          className="w-full rounded-xl px-4 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-600"
        >
          すべてスキップして、あとで記録する
        </button>
      </div>
    </div>
  )
}

/* ---------- Step 3: 完了 ---------- */

function DoneStep({ memberId, memberName }: { memberId: string; memberName: string }) {
  const navigate = useNavigate()
  const { langs } = useApp()
  const checks = useLiveQuery(() => db.checks.where('memberId').equals(memberId).toArray(), [memberId], undefined)
  if (checks === undefined) return null

  const perLang = langs.map((l) => ({
    lang: l,
    count: checks.filter((c) => c.itemId.startsWith(`${l}-`)).length,
  }))

  return (
    <Card className="space-y-5 p-6 text-center">
      <GeoBanner className="h-20" weights={perLang.map((p) => p.count)} seed={memberId} caption />
      <div>
        <Icon name="celebration" className="text-4xl text-brand-500" />
        <h2 className="mt-2 text-lg font-bold text-neutral-900">{memberName}さんの登録が完了しました</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {checks.length > 0
            ? `${checks.length}項目を「できること」として記録しました。`
            : 'チェックはいつでも「記録」から始められます。'}
        </p>
      </div>
      {checks.length > 0 && (
        <ul className="mx-auto max-w-60 space-y-1.5">
          {perLang.map((p) => (
            <li key={p.lang} className="flex items-center justify-between gap-3">
              <LangChip lang={p.lang} />
              <span className="text-sm tabular-nums text-neutral-600">{p.count} 項目</span>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <PrimaryButton onClick={() => navigate('/')} className="w-full">
          ホームでダッシュボードを見る
        </PrimaryButton>
        <button
          onClick={() => navigate('/gap')}
          className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          ギャップ分析を見る
        </button>
      </div>
    </Card>
  )
}
