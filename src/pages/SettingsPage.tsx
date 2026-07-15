import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, deleteChildWithChecks, exportAll, importAll, resetRoadmapToSeed, setPaceFactors, setSelectedLangs } from '../db'
import { useApp } from '../context/AppContext'
import { ALL_LANGS, type Child, type ExportData, type Lang } from '../types'
import { ageAt, ageLabel, fmtDateJa, minBirthDateStr, todayStr } from '../lib/dates'
import { Card, ConfirmDialog, Icon, PrimaryButton, SectionTitle } from '../components/ui'
import { T } from '../i18n'
import { CONTACT_EMAIL, CONTACT_FORM_URL } from '../config'

export default function SettingsPage() {
  const { children_, langs, paces, showToast } = useApp()
  const [deleting, setDeleting] = useState<Child | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [importData, setImportData] = useState<ExportData | null>(null)
  const [editing, setEditing] = useState<Child | null>(null)
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

  const startEdit = (c: Child) => {
    setEditing(c)
    setEditForm({ name: c.name, birthDate: c.birthDate, note: c.note ?? '' })
  }

  const saveEdit = async () => {
    if (!editing || !editForm.name.trim() || !editForm.birthDate) return
    if (editForm.birthDate < minBirthDateStr() || editForm.birthDate > todayStr()) {
      showToast({ message: '生年月日を確認してください(0〜100歳を想定しています)' })
      return
    }
    await db.children.update(editing.id, {
      name: editForm.name.trim(),
      birthDate: editForm.birthDate,
      note: editForm.note.trim() || undefined,
    })
    setEditing(null)
    showToast({ message: '保存しました' })
  }

  /**
   * 言語の変更。選んだ言語が他のポジションと重複する場合は位置を入れ替える(swap)。
   * 第三言語は任意:空文字を渡すと2言語運用になる。
   */
  const changeLang = async (pos: number, newLang: Lang | '') => {
    if (newLang === '') {
      // 第三言語を外す
      await setSelectedLangs(langs.slice(0, 2))
      showToast({ message: '第三言語を外しました(2言語で運用します)' })
      return
    }
    const next = [...langs]
    if (pos >= next.length) {
      // 第三言語を新たに追加
      if (next.includes(newLang)) {
        showToast({ message: `${T.lang[newLang]}はすでに選択されています` })
        return
      }
      next.push(newLang)
    } else {
      const dupIdx = next.findIndex((l, i) => i !== pos && l === newLang)
      if (dupIdx >= 0) next[dupIdx] = next[pos]
      next[pos] = newLang
    }
    await setSelectedLangs(next)
    showToast({ message: '言語設定を保存しました' })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* 子供の管理(OOUI: オブジェクト一覧+各オブジェクトへの操作) */}
      <section>
        <SectionTitle>お子さんの管理(3人まで表示されます)</SectionTitle>
        <div className="space-y-3">
          {children_.map((c) =>
            editing?.id === c.id ? (
              <Card key={c.id} className="space-y-3 p-4">
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
                  <PrimaryButton onClick={saveEdit} disabled={!editForm.name.trim() || !editForm.birthDate}>
                    保存
                  </PrimaryButton>
                </div>
              </Card>
            ) : (
              <Card key={c.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon name="child_care" className="text-xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-neutral-800">{c.name}</div>
                  <div className="text-xs text-neutral-400">
                    {fmtDateJa(c.birthDate)} 生まれ({ageLabel(ageAt(c.birthDate, todayStr()))})
                    {c.note ? ` ・ ${c.note}` : ''}
                  </div>
                </div>
                <button onClick={() => startEdit(c)} aria-label={`${c.name}を編集`} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-brand-600">
                  <Icon name="edit" className="text-lg" />
                </button>
                <button onClick={() => setDeleting(c)} aria-label={`${c.name}を削除`} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-rose-500">
                  <Icon name="delete" className="text-lg" />
                </button>
              </Card>
            ),
          )}
          {children_.length < 3 && (
            <Link
              to="/onboarding"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-4 text-sm font-medium text-brand-700 hover:border-brand-400 hover:bg-brand-50/40"
            >
              <Icon name="person_add" className="text-lg" />
              お子さんを追加(いまのようすも一緒に記録)
            </Link>
          )}
        </div>
      </section>

      {/* 言語設定 */}
      <section>
        <SectionTitle>言語設定(第一〜第三言語)</SectionTitle>
        <Card className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <label key={i} className="block text-sm text-neutral-600">
                {T.langOrder[i]}
                {i === 2 && <span className="ml-1 text-xs text-neutral-400">(任意)</span>}
                <select
                  value={langs[i] ?? ''}
                  onChange={(e) => changeLang(i, e.target.value as Lang | '')}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
                >
                  {i === 2 && <option value="">設定しない(2言語で運用)</option>}
                  {ALL_LANGS.map((al) => (
                    <option key={al} value={al}>{T.lang[al]}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-neutral-400">
            6言語すべてに初期テンプレートが用意されています。言語を切り替えても各言語の記録は保持されます。
            タグの色は第一言語がもっとも薄く、あとの言語ほど鮮やかになります。第三言語は任意です。
          </p>
          <p className="text-xs leading-relaxed text-neutral-400">
            広東語・ポルトガル語・スペイン語のテンプレートは翻案下書きです。ロードマップ画面で編集できます。
          </p>
        </Card>
      </section>

      {/* 目標レベルの傾斜 */}
      <section>
        <SectionTitle>目標レベルの傾斜(18歳時点の到達目標)</SectionTitle>
        <Card className="space-y-4 p-4">
          {/* 傾斜の中身:位置ごとの目標と判定ペースの選択 */}
          <ul className="divide-y divide-neutral-100">
            {langs.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-400">{T.langOrder[i]}</span>
                    <span className="text-sm font-semibold text-neutral-800">{T.lang[l]}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                    {i === 0 && '母語(学齢相当の国語力)。思考と学習の土台であり、他言語の伸びを支えます。'}
                    {i === 1 && 'CEFR B2〜C1相当(英語なら英検準1級)。留学・仕事で自立して使えるレベル。'}
                    {i === 2 && 'CEFR B1相当(中国語ならHSK4〜5級)。日常が回り、将来伸ばせる土台。'}
                  </p>
                </div>
                {i === 0 ? (
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">基準(固定)</span>
                ) : (
                  <label className="text-xs text-neutral-500">
                    判定ペース
                    <select
                      value={paces[i]}
                      onChange={async (e) => {
                        const next = [...paces] as [number, number, number]
                        next[i] = Number(e.target.value)
                        await setPaceFactors(next)
                        showToast({ message: '傾斜の設定を保存しました' })
                      }}
                      className="ml-2 rounded-xl border border-neutral-200 px-2 py-1.5 text-sm"
                    >
                      <option value={1}>しっかり(標準)</option>
                      <option value={0.75}>ゆるめ(×0.75)</option>
                    </select>
                  </label>
                )}
              </li>
            ))}
          </ul>

          {/* 傾斜をつけている理由と基準 */}
          <div className="rounded-xl bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-500">
            <p className="mb-1 font-semibold text-neutral-600">なぜ傾斜をつけるのか</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <span className="font-medium text-neutral-600">時間の逆算:</span>
                CEFR B2〜C1には1,000時間規模の学習が必要(日本語話者の英語はさらに長め)。
                3言語すべてに同じ水準を求めると週12時間超になり、生活と両立できません。
              </li>
              <li>
                <span className="font-medium text-neutral-600">母語が土台:</span>
                読解力・抽象思考は第一言語で育ち、他言語に転移します。第一言語は削らず基準に固定しています。
              </li>
              <li>
                <span className="font-medium text-neutral-600">第三言語は継続優先:</span>
                B1の土台があれば、本人が必要になったとき大人の効率で伸ばせます。
                嫌いにならないことが最重要のため、「ゆるめ」ペースも選べます。
              </li>
            </ul>
            <p className="mt-2 text-neutral-400">
              基準:CEFR(ヨーロッパ言語共通参照枠)・英検・HSKの対応表をもとに、各言語のロードマップの年齢帯ごとの到達目安に織り込み済みです。
              「判定ペース」を「ゆるめ」にすると、順調/遅れの判定基準が実年齢×0.75になります(ロードマップの中身は変わりません)。
            </p>
          </div>
        </Card>
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
          <p className="text-sm text-neutral-500">Can-Do項目・教材リストを初期テンプレートに戻します(チェック記録と子供は残ります)。</p>
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
        onConfirm={() => deleting && deleteChildWithChecks(deleting.id)}
        title="お子さんの削除"
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
              (お子さん {importData.children.length} 人・チェック {importData.checks?.length ?? 0} 件)で、
              <strong className="text-rose-600">現在の全データを置き換えます。</strong>よろしいですか?
            </>
          )
        }
      />
    </div>
  )
}
