import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, deleteMemberWithChecks, exportAll, importAll, resetRoadmapToSeed, updateMemberLanguages } from '../db'
import { useApp } from '../context/AppContext'
import { ALL_LANGS, ROLES, STAGES, type ExportData, type Lang, type Member, type MemberLanguage, type Role } from '../types'
import { ageAt, ageLabel, fmtDateJa, minBirthDateStr, todayStr } from '../lib/dates'
import { Card, ConfirmDialog, Icon, PrimaryButton, SectionTitle, stageLabel } from '../components/ui'
import { T } from '../i18n'
import { CONTACT_EMAIL, CONTACT_FORM_URL } from '../config'

/** 役割ごとの目標レベルのデフォルト(新規に役割を足すとき用) */
const DEFAULT_TARGET: Record<Role, number> = { native: 6, foreign1: 5, foreign2: 4 }

export default function SettingsPage() {
  const { members, selectedMember, memberLanguages, showToast } = useApp()
  const [deleting, setDeleting] = useState<Member | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [importData, setImportData] = useState<ExportData | null>(null)
  const [editing, setEditing] = useState<Member | null>(null)
  const [editForm, setEditForm] = useState({ name: '', birthDate: '', note: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const doExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `language-acquisition-roadmap-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast({ message: 'バックアップファイルを書き出しました' })
  }

  const onFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as ExportData
      if (data.app !== 'trilingual-roadmap') throw new Error('形式が違います')
      setImportData(data)
    } catch {
      showToast({ message: '読み込めませんでした。エクスポートした .json ファイルを選択してください' })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const doImport = async () => {
    if (!importData) return
    await importAll(importData)
    showToast({ message: 'インポートが完了しました' })
  }

  const startEdit = (m: Member) => {
    setEditing(m)
    setEditForm({ name: m.name, birthDate: m.birthDate ?? '', note: m.note ?? '' })
  }

  const saveEdit = async () => {
    if (!editing || !editForm.name.trim()) return
    // 子供は生年月日必須。大人は任意。入力があるときのみ範囲チェック
    if (editing.kind === 'child' && !editForm.birthDate) return
    if (editForm.birthDate && (editForm.birthDate < minBirthDateStr() || editForm.birthDate > todayStr())) {
      showToast({ message: '生年月日を確認してください(0〜100歳を想定しています)' })
      return
    }
    await db.members.update(editing.id, {
      name: editForm.name.trim(),
      birthDate: editForm.birthDate || null,
      note: editForm.note.trim() || undefined,
    })
    setEditing(null)
    showToast({ message: '保存しました' })
  }

  /* ---------- 選択中メンバーの言語構成の編集 ---------- */

  const mlOf = (role: Role) => memberLanguages.find((ml) => ml.role === role)

  const saveLangs = async (next: MemberLanguage[]) => {
    if (!selectedMember) return
    await updateMemberLanguages(selectedMember.id, next)
    showToast({ message: '言語構成を保存しました' })
  }

  /** 役割の言語を変更。第二外国語は空('')で「設定しない」。他役割と重複したら入れ替える。 */
  const changeRoleLang = async (role: Role, newLang: Lang | '') => {
    if (!selectedMember) return
    let next = memberLanguages.map((ml) => ({ ...ml }))
    if (role === 'foreign2' && newLang === '') {
      next = next.filter((ml) => ml.role !== 'foreign2')
      return saveLangs(next)
    }
    if (newLang === '') return
    const target = next.find((ml) => ml.role === role)
    const dup = next.find((ml) => ml.lang === newLang && ml.role !== role)
    if (target) {
      if (dup) dup.lang = target.lang // swap で重複を避ける
      target.lang = newLang
    } else {
      // 第二外国語を新たに追加
      if (dup) return void showToast({ message: `${T.lang[newLang]}はすでに設定されています` })
      next.push({ lang: newLang, role, targetStage: DEFAULT_TARGET[role], pace: 1 })
    }
    saveLangs(next)
  }

  const changeRoleField = async (role: Role, patch: Partial<MemberLanguage>) => {
    const next = memberLanguages.map((ml) => (ml.role === role ? { ...ml, ...patch } : { ...ml }))
    saveLangs(next)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* メンバーの管理(OOUI: オブジェクト一覧+各オブジェクトへの操作) */}
      <section>
        <SectionTitle>メンバーの管理(3人まで表示されます)</SectionTitle>
        <div className="space-y-3">
          {members.map((m) =>
            editing?.id === m.id ? (
              <Card key={m.id} className="space-y-3 p-4">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
                  aria-label="名前"
                />
                <input
                  type="date"
                  value={editForm.birthDate}
                  min={minBirthDateStr()}
                  max={todayStr()}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
                  aria-label="生年月日"
                />
                <input
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="メモ(任意)"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
                  aria-label="メモ"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(null)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
                    キャンセル
                  </button>
                  <PrimaryButton onClick={saveEdit} disabled={!editForm.name.trim() || (editing.kind === 'child' && !editForm.birthDate)}>
                    保存
                  </PrimaryButton>
                </div>
              </Card>
            ) : (
              <Card key={m.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon name={m.kind === 'adult' ? 'person' : 'child_care'} className="text-xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-800">{m.name}</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                      {m.kind === 'adult' ? '大人' : '子供'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {m.birthDate
                      ? `${fmtDateJa(m.birthDate)} 生まれ(${ageLabel(ageAt(m.birthDate, todayStr()))})`
                      : '生年月日 未設定'}
                    {m.note ? ` ・ ${m.note}` : ''}
                  </div>
                </div>
                <button onClick={() => startEdit(m)} aria-label={`${m.name}を編集`} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-brand-600">
                  <Icon name="edit" className="text-lg" />
                </button>
                <button onClick={() => setDeleting(m)} aria-label={`${m.name}を削除`} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-rose-500">
                  <Icon name="delete" className="text-lg" />
                </button>
              </Card>
            ),
          )}
          {members.length < 3 && (
            <Link
              to="/onboarding"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-4 text-sm font-medium text-brand-700 hover:border-brand-400 hover:bg-brand-50/40"
            >
              <Icon name="person_add" className="text-lg" />
              メンバーを追加(いまのようすも一緒に記録)
            </Link>
          )}
        </div>
      </section>

      {/* 選択中メンバーの言語構成(役割・言語・目標レベル・判定ペース) */}
      <section>
        <SectionTitle>
          選択中メンバーの言語構成{selectedMember ? `(${selectedMember.name}さん)` : ''}
        </SectionTitle>
        {!selectedMember ? (
          <Card className="p-4 text-sm text-neutral-500">メンバーを登録すると言語構成を設定できます。</Card>
        ) : (
          <Card className="space-y-4 p-4">
            <ul className="divide-y divide-neutral-100">
              {ROLES.map((role) => {
                const ml = mlOf(role)
                const isOptional = role === 'foreign2'
                return (
                  <li key={role} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <span className="w-20 shrink-0 text-sm font-semibold text-neutral-700">{T.role[role]}</span>
                    <select
                      value={ml?.lang ?? ''}
                      onChange={(e) => changeRoleLang(role, e.target.value as Lang | '')}
                      aria-label={`${T.role[role]}の言語`}
                      className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-sm"
                    >
                      {isOptional && <option value="">設定しない</option>}
                      {ALL_LANGS.map((al) => (
                        <option key={al} value={al}>{T.lang[al]}</option>
                      ))}
                    </select>
                    {ml && (
                      <>
                        <label className="text-xs text-neutral-500">
                          目標
                          <select
                            value={ml.targetStage}
                            onChange={(e) => changeRoleField(role, { targetStage: Number(e.target.value) })}
                            aria-label={`${T.role[role]}の目標レベル`}
                            className="ml-1 rounded-xl border border-neutral-200 px-2 py-1.5 text-sm"
                          >
                            {STAGES.map((s) => (
                              <option key={s.idx} value={s.idx}>{stageLabel(s.idx)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-neutral-500">
                          ペース
                          <select
                            value={ml.pace}
                            onChange={(e) => changeRoleField(role, { pace: Number(e.target.value) })}
                            aria-label={`${T.role[role]}の判定ペース`}
                            className="ml-1 rounded-xl border border-neutral-200 px-2 py-1.5 text-sm"
                          >
                            <option value={1}>しっかり(標準)</option>
                            <option value={0.75}>ゆるめ(×0.75)</option>
                          </select>
                        </label>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* 傾斜をつけている理由と基準(役割ベース) */}
            <div className="rounded-xl bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-500">
              <p className="mb-1 font-semibold text-neutral-600">なぜ役割ごとに目標を変えるのか</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <span className="font-medium text-neutral-600">時間の逆算:</span>
                  CEFR B2〜C1(S5〜S6)には1,000時間規模の学習が必要です。
                  すべての言語に同じ水準を求めると生活と両立できないため、役割ごとに目標を傾けます。
                </li>
                <li>
                  <span className="font-medium text-neutral-600">母語が土台:</span>
                  読解力・抽象思考は母語で育ち、外国語に転移します。母語の目標(既定S6)は高めに保ちます。
                </li>
                <li>
                  <span className="font-medium text-neutral-600">第二外国語は継続優先:</span>
                  土台(既定S4)があれば、本人が必要になったとき大人の効率で伸ばせます。
                  嫌いにならないことが最重要のため、「ゆるめ」ペースも選べます。第二外国語は「設定しない」も可能です。
                </li>
              </ul>
              <p className="mt-2 text-neutral-400">
                目標レベルの既定傾斜:{ROLES.map((r) => `${T.role[r]}=${stageLabel(DEFAULT_TARGET[r])}`).join(' / ')}。
                「判定ペース」を「ゆるめ」にすると、順調/遅れの判定基準がペース×0.75になります(ロードマップの中身は変わりません)。
              </p>
              <p className="mt-2 text-neutral-400">
                6言語すべてに初期テンプレートが用意されています。言語を切り替えても各言語の記録は保持されます。
                韓国語・ポルトガル語・スペイン語のテンプレートは翻案下書きで、ロードマップ画面で編集できます。
              </p>
            </div>
          </Card>
        )}
      </section>

      {/* バックアップ */}
      <section>
        <SectionTitle>バックアップ(端末移行・家族間共有)</SectionTitle>
        <Card className="space-y-4 p-4">
          <p className="text-sm leading-relaxed text-neutral-500">
            データはこの端末のブラウザ内(IndexedDB)にのみ保存され、外部には送信されません。
            端末の変更や家族との共有には JSON エクスポート/インポートを使ってください。
          </p>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={doExport} className="inline-flex items-center gap-1.5">
              <Icon name="download" className="text-lg" />
              JSONエクスポート
            </PrimaryButton>
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <Icon name="upload" className="text-lg" />
              JSONインポート
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </div>
        </Card>
      </section>

      {/* アプリとして使う(PWA インストール案内) */}
      <section>
        <SectionTitle>アプリとして使う</SectionTitle>
        <Card className="space-y-4 p-4">
          <p className="text-sm leading-relaxed text-neutral-500">
            ホーム画面に追加すると、アプリのように全画面・オフラインで使えます。
          </p>
          <ul className="space-y-3 text-sm text-neutral-600">
            <li className="flex items-start gap-2.5">
              <Icon name="install_mobile" className="mt-0.5 text-lg text-brand-600" />
              <span>
                <span className="font-semibold text-neutral-700">Android:</span> ブラウザのメニューから「アプリをインストール」を選択。
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="ios_share" className="mt-0.5 text-lg text-brand-600" />
              <span>
                <span className="font-semibold text-neutral-700">iPhone/iPad:</span> Safariの共有ボタン →「ホーム画面に追加」。
              </span>
            </li>
          </ul>
          <p className="text-xs leading-relaxed text-neutral-400">
            インストール後もデータは端末内にのみ保存されます。
          </p>
        </Card>
      </section>

      {/* ロードマップ初期化 */}
      <section>
        <SectionTitle>ロードマップ</SectionTitle>
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-neutral-500">Can-Do項目・教材リストを初期テンプレートに戻します(チェック記録とメンバーは残ります)。</p>
          <button onClick={() => setResetOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
            <Icon name="restart_alt" className="text-lg" />
            初期テンプレートに戻す
          </button>
        </Card>
      </section>

      {/* お問い合わせ:個人情報を預からない方針のため外部チャネル(メール/外部フォーム)へのリンクのみ */}
      <section>
        <SectionTitle>お問い合わせ</SectionTitle>
        <Card className="space-y-3 p-4">
          <p className="text-sm text-neutral-500">不具合のご報告・機能のご要望はこちらから。</p>
          {CONTACT_EMAIL || CONTACT_FORM_URL ? (
            <div className="flex flex-wrap gap-2">
              {CONTACT_EMAIL && (
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Multilingual Family Roadmap お問い合わせ')}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <Icon name="mail" className="text-lg" />
                  メールで問い合わせ
                </a>
              )}
              {CONTACT_FORM_URL && (
                <a
                  href={CONTACT_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Icon name="open_in_new" className="text-lg" />
                  お問い合わせフォーム
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">お問い合わせ先は準備中です。</p>
          )}
          <p className="text-xs text-neutral-400">送信内容はメール/外部フォーム側で取り扱われ、このアプリ内には保存されません。</p>
        </Card>
      </section>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMemberWithChecks(deleting.id)}
        title="メンバーの削除"
        message={
          deleting && (
            <>
              {deleting.name}さんのプロフィールと<strong className="text-rose-600">すべてのチェック記録</strong>を削除します。この操作は元に戻せません。
            </>
          )
        }
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => resetRoadmapToSeed()}
        title="ロードマップの初期化"
        danger={false}
        confirmLabel="初期化する"
        message="Can-Do項目と教材リストを初期テンプレートに戻します。ユーザーが追加・編集した項目は失われます。追加したCan-Do項目に紐づくチェック記録は項目が消えるため表示されなくなります。よろしいですか?"
      />

      <ConfirmDialog
        open={importData !== null}
        onClose={() => setImportData(null)}
        onConfirm={doImport}
        title="インポートの確認"
        confirmLabel="上書きインポート"
        message={
          importData && (
            <>
              {fmtDateJa(importData.exportedAt.slice(0, 10))} にエクスポートされたデータ
              (メンバー {importData.members.length} 人・チェック {importData.checks?.length ?? 0} 件)で、
              <strong className="text-rose-600">現在の全データを置き換えます。</strong>よろしいですか?
            </>
          )
        }
      />
    </div>
  )
}
