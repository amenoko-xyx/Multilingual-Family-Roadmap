import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteItemWithChecks, setMaterialStatus, uid } from '../db'
import { useApp } from '../context/AppContext'
import {
  ALL_LANGS,
  BANDS,
  SKILLS,
  type CanDoItem,
  type Lang,
  type Material,
  type MaterialStatus,
  type MaterialStatusValue,
  type MaterialType,
  type Skill,
} from '../types'
import { matchMaterials } from '../lib/logic'
import { Card, ConfirmDialog, LangChip, langStroke, Modal, PrimaryButton, SectionTitle, Segmented, SkillLabel } from '../components/ui'
import { T } from '../i18n'

type View = 'table' | 'timeline'

/** F1: マスターロードマップ(閲覧+編集) */
export default function RoadmapPage() {
  const { langs } = useApp()
  const items = useLiveQuery(() => db.items.toArray(), [], undefined)
  const cells = useLiveQuery(() => db.cells.toArray(), [], undefined)
  const materials = useLiveQuery(() => db.materials.toArray(), [], undefined)
  const [view, setView] = useState<View>('table')
  const [detail, setDetail] = useState<{ lang: Lang; band: number } | null>(null)

  if (items === undefined || cells === undefined || materials === undefined) return null

  const cellOf = (lang: Lang, band: number) => cells.find((c) => c.lang === lang && c.band === band)
  const itemsOf = (lang: Lang, band: number) => items.filter((i) => i.lang === lang && i.band === band)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">マスターロードマップ</h1>
          <p className="mt-1 text-sm text-neutral-500">0〜18歳の到達目安。セルをタップすると詳細と編集ができます。</p>
        </div>
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: '表' },
            { value: 'timeline', label: 'タイムライン' },
          ]}
        />
      </div>

      {view === 'table' ? (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-left">
                <th className="px-3 py-2.5 font-semibold text-neutral-500">年齢帯</th>
                {langs.map((l) => (
                  <th key={l} className="px-3 py-2.5"><LangChip lang={l} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BANDS.map((band) => (
                <tr key={band.idx} className="border-b border-neutral-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-3 align-top font-semibold text-neutral-700">{band.label}</td>
                  {langs.map((lang) => {
                    const cell = cellOf(lang, band.idx)
                    const cellItems = itemsOf(lang, band.idx)
                    return (
                      <td key={lang} className="px-1.5 py-1.5 align-top">
                        <button
                          onClick={() => setDetail({ lang, band: band.idx })}
                          className="w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-50"
                        >
                          <div className="text-xs font-semibold text-neutral-800">{cell?.benchmark ?? '—'}</div>
                          <div className="mt-1 text-xs text-neutral-400">Can-Do {cellItems.length}項目</div>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {BANDS.map((band) => (
              <div key={band.idx} className="w-64 shrink-0 space-y-2">
                <div className="rounded-xl bg-neutral-100 px-3 py-1.5 text-center text-sm font-bold text-neutral-600">
                  {band.label}
                </div>
                {langs.map((lang) => {
                  const cell = cellOf(lang, band.idx)
                  return (
                    <button
                      key={lang}
                      onClick={() => setDetail({ lang, band: band.idx })}
                      className="block w-full rounded-2xl border border-neutral-200 bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-neutral-300"
                      style={{ borderTopColor: langStroke(langs.indexOf(lang)), borderTopWidth: 3 }}
                    >
                      <LangChip lang={lang} />
                      <div className="mt-1.5 text-xs font-semibold text-neutral-800">{cell?.benchmark}</div>
                      <ul className="mt-1.5 space-y-1">
                        {SKILLS.map((s) =>
                          cell?.summaries[s] ? (
                            <li key={s} className="flex gap-1.5 text-xs text-neutral-500">
                              <span className="shrink-0 font-medium text-neutral-400">{T.skill[s]}</span>
                              <span className="truncate">{cell.summaries[s]}</span>
                            </li>
                          ) : null,
                        )}
                      </ul>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <MaterialsSection materials={materials} />

      {detail && (
        <CellDetailModal
          lang={detail.lang}
          band={detail.band}
          items={itemsOf(detail.lang, detail.band)}
          materials={materials}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

/* ---------- セル詳細+Can-Do編集 ---------- */

function CellDetailModal({
  lang,
  band,
  items,
  materials,
  onClose,
}: {
  lang: Lang
  band: number
  items: CanDoItem[]
  materials: Material[]
  onClose: () => void
}) {
  const cell = useLiveQuery(() => db.cells.get(`${lang}-${band}`), [lang, band])
  const [deleting, setDeleting] = useState<CanDoItem | null>(null)
  const [deleteCheckCount, setDeleteCheckCount] = useState(0)
  const [editing, setEditing] = useState<CanDoItem | null>(null)
  const [editText, setEditText] = useState('')
  const [newSkill, setNewSkill] = useState<Skill>('listening')
  const [newText, setNewText] = useState('')

  const bandMeta = BANDS[band]
  const cellMaterials = useMemo(
    () =>
      SKILLS.flatMap((s) => matchMaterials(materials, lang, s, [bandMeta.start, bandMeta.end - 1])).filter(
        (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
      ),
    [materials, lang, band],
  )

  const askDelete = async (item: CanDoItem) => {
    const count = await db.checks.where('itemId').equals(item.id).count()
    setDeleteCheckCount(count)
    setDeleting(item)
  }

  const addItem = async () => {
    if (!newText.trim()) return
    const order = items.filter((i) => i.skill === newSkill).length
    await db.items.put({ id: uid(), lang, band, skill: newSkill, text: newText.trim(), order })
    setNewText('')
  }

  return (
    <Modal open onClose={onClose} title={`${T.lang[lang]} / ${bandMeta.label}`} wide>
      {cell && (
        <div className="mb-4 space-y-1.5 rounded-xl bg-neutral-50 p-3.5 text-sm">
          <div><span className="font-semibold text-neutral-700">目安:</span> {cell.benchmark}</div>
          <div><span className="font-semibold text-neutral-700">家庭での取り組み:</span> {cell.tip}</div>
          {cell.source && <div className="text-xs text-neutral-400">根拠: {cell.source}</div>}
        </div>
      )}

      {SKILLS.map((skill) => {
        const group = items.filter((i) => i.skill === skill).sort((a, b) => a.order - b.order)
        if (group.length === 0) return null
        return (
          <div key={skill} className="mb-4">
            <div className="mb-1.5 border-b border-neutral-100 pb-1.5">
              <SkillLabel skill={skill} />
            </div>
            <ul className="space-y-1">
              {group.map((item) => (
                <li key={item.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-neutral-50">
                  {editing?.id === item.id ? (
                    <>
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 rounded-lg border border-brand-300 px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          if (editText.trim()) await db.items.update(item.id, { text: editText.trim() })
                          setEditing(null)
                        }}
                        className="text-xs font-semibold text-brand-600"
                      >
                        保存
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-neutral-700">{item.text}</span>
                      <button
                        onClick={() => { setEditing(item); setEditText(item.text) }}
                        aria-label="編集"
                        className="text-xs text-neutral-400 hover:text-brand-600"
                      >
                        編集
                      </button>
                      <button onClick={() => askDelete(item)} aria-label="削除" className="text-xs text-neutral-400 hover:text-rose-500">
                        削除
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {/* 項目追加 */}
      <div className="mt-2 rounded-xl border border-dashed border-neutral-300 p-3">
        <div className="mb-2 text-xs font-semibold text-neutral-500">Can-Do項目を追加</div>
        <div className="flex flex-wrap gap-2">
          <select
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value as Skill)}
            className="rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
          >
            {SKILLS.map((s) => (
              <option key={s} value={s}>{T.skill[s]}</option>
            ))}
          </select>
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="例:英語で今日の出来事を3文で話す"
            className="min-w-40 flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm"
          />
          <PrimaryButton onClick={addItem} disabled={!newText.trim()}>追加</PrimaryButton>
        </div>
      </div>

      {cellMaterials.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold text-neutral-400">この年齢帯の推奨教材</div>
          <div className="flex flex-wrap gap-1.5">
            {cellMaterials.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600">
                <span className="text-neutral-400">{T.materialType[m.type]}</span>
                {m.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteItemWithChecks(deleting.id)}
        title="Can-Do項目の削除"
        message={
          deleting && (
            <>
              「{deleting.text}」を削除します。
              <strong className="text-rose-600">
                この項目に紐づく子供のチェック記録{deleteCheckCount > 0 ? `(${deleteCheckCount}件)` : ''}も一緒に削除されます。
              </strong>
              この操作は元に戻せません。
            </>
          )
        }
      />
    </Modal>
  )
}

/* ---------- 教材リスト(編集可能) ---------- */

const TYPE_OPTIONS: MaterialType[] = ['book', 'app', 'online-lesson', 'video', 'workbook']

/** 教材ステータス(notStarted以外)のチップ配色 */
const STATUS_CHIP_STYLE: Record<MaterialStatusValue, string> = {
  notStarted: '',
  inProgress: 'bg-brand-50 text-brand-700',
  completed: 'bg-emerald-50 text-emerald-700',
  deferred: 'bg-amber-50 text-amber-700',
}

function MaterialsSection({ materials }: { materials: Material[] }) {
  const { langs, selectedChild } = useApp()
  const statuses = useLiveQuery(
    () => (selectedChild ? db.materialStatus.where('childId').equals(selectedChild.id).toArray() : Promise.resolve([] as MaterialStatus[])),
    [selectedChild?.id],
    [],
  )
  const [langFilter, setLangFilter] = useState<'all' | Lang>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | MaterialStatusValue>('all')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Material | null>(null)
  const [form, setForm] = useState({ title: '', type: 'book' as MaterialType, lang: 'en' as Lang, skill: 'reading' as Skill, from: 6, to: 8, note: '' })

  const statusOf = (materialId: string): MaterialStatusValue =>
    (statuses ?? []).find((s) => s.materialId === materialId)?.status ?? 'notStarted'
  const filtered = materials
    .filter((m) => langFilter === 'all' || m.languages.includes(langFilter))
    .filter((m) => !selectedChild || statusFilter === 'all' || statusOf(m.id) === statusFilter)

  const add = async () => {
    if (!form.title.trim()) return
    await db.materials.put({
      id: uid(),
      title: form.title.trim(),
      type: form.type,
      languages: [form.lang],
      skills: [form.skill],
      ageRange: [Math.min(form.from, form.to), Math.max(form.from, form.to)],
      note: form.note.trim() || undefined,
    })
    setAdding(false)
    setForm({ ...form, title: '', note: '' })
  }

  return (
    <section className="pt-2">
      <SectionTitle
        action={
          <button onClick={() => setAdding(true)} className="text-xs font-medium text-brand-600">+ 教材を追加</button>
        }
      >
        推奨教材リスト({filtered.length})
      </SectionTitle>
      {selectedChild && (
        <p className="mb-2 text-xs text-neutral-400">ステータスは{selectedChild.name}さんのものです</p>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <Segmented<'all' | Lang>
          value={langFilter}
          onChange={setLangFilter}
          options={[{ value: 'all', label: 'すべて' }, ...langs.map((l) => ({ value: l as 'all' | Lang, label: T.lang[l] }))]}
        />
        {selectedChild && (
          <Segmented<'all' | MaterialStatusValue>
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'すべて' },
              ...(Object.keys(T.materialStatus) as MaterialStatusValue[]).map((s) => ({ value: s, label: T.materialStatus[s] })),
            ]}
          />
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((m) => {
          const status = statusOf(m.id)
          return (
            <Card key={m.id} className="group flex items-start gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="text-sm font-semibold text-neutral-800">{m.title}</div>
                  {status !== 'notStarted' && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CHIP_STYLE[status]}`}>
                      {T.materialStatus[status]}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5">{T.materialType[m.type]}</span>
                  {m.languages.map((l) => <LangChip key={l} lang={l} />)}
                  {m.skills.map((s) => <SkillLabel key={s} skill={s} className="text-xs text-neutral-500" />)}
                  <span>{m.ageRange[0]}〜{m.ageRange[1]}歳</span>
                </div>
                {m.note && <p className="mt-1 text-xs text-neutral-500">{m.note}</p>}
                {selectedChild && (
                  <select
                    value={status}
                    onChange={(e) => setMaterialStatus(selectedChild.id, m.id, e.target.value as MaterialStatusValue)}
                    aria-label={`${m.title}の取り組み状況`}
                    className="mt-2 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
                  >
                    {(Object.keys(T.materialStatus) as MaterialStatusValue[]).map((s) => (
                      <option key={s} value={s}>{T.materialStatus[s]}</option>
                    ))}
                  </select>
                )}
              </div>
              <button
                onClick={() => setDeleting(m)}
                aria-label={`${m.title} を削除`}
                className="text-xs text-neutral-300 hover:text-rose-500"
              >
                削除
              </button>
            </Card>
          )
        })}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="教材を追加">
        <div className="space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="教材名"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaterialType })} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{T.materialType[t]}</option>)}
            </select>
            <select value={form.lang} onChange={(e) => setForm({ ...form, lang: e.target.value as Lang })} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
              {ALL_LANGS.map((l) => <option key={l} value={l}>{T.lang[l]}</option>)}
            </select>
            <select value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value as Skill })} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
              {SKILLS.map((s) => <option key={s} value={s}>{T.skill[s]}</option>)}
            </select>
            <div className="flex items-center gap-1.5 text-sm">
              <input type="number" min={0} max={18} value={form.from} onChange={(e) => setForm({ ...form, from: Number(e.target.value) })} className="w-full rounded-xl border border-neutral-200 px-2 py-2" />
              〜
              <input type="number" min={0} max={18} value={form.to} onChange={(e) => setForm({ ...form, to: Number(e.target.value) })} className="w-full rounded-xl border border-neutral-200 px-2 py-2" />
              歳
            </div>
          </div>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="メモ(任意)"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <PrimaryButton onClick={add} disabled={!form.title.trim()}>追加する</PrimaryButton>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && db.materials.delete(deleting.id)}
        title="教材の削除"
        message={deleting && <>「{deleting.title}」を教材リストから削除します。よろしいですか?</>}
      />
    </section>
  )
}
