import { useState } from 'react'
import type { CanDoItem, CheckRecord } from '../types'
import { addCheck, removeCheck, updateCheckDate } from '../db'
import { todayStr, fmtDateJa } from '../lib/dates'
import { Icon } from './ui'

/**
 * Can-Do項目のチェック行。
 * - タップ領域44px以上
 * - チェック時は当日日付が自動記録され、その場で過去日に修正できる(通知は出さない)
 * - 取り消しは二段タップで誤操作を防止(ニールセン: エラーの防止)
 */
export function CheckRow({
  item,
  check,
  childId,
  showMeta,
}: {
  item: CanDoItem
  check: CheckRecord | undefined
  childId: string
  showMeta?: React.ReactNode
}) {
  const [confirmUncheck, setConfirmUncheck] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const checked = !!check

  const toggle = async () => {
    if (!checked) {
      await addCheck(childId, item.id, todayStr())
      setEditingDate(false)
    } else if (!confirmUncheck) {
      setConfirmUncheck(true)
      setTimeout(() => setConfirmUncheck(false), 3000)
    } else {
      await removeCheck(childId, item.id)
      setConfirmUncheck(false)
    }
  }

  return (
    <div className={`flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors ${checked ? 'opacity-70' : 'hover:bg-neutral-50'}`}>
      {/* チェックはリストの右端に配置(コンテンツが左、操作が右) */}
      <div className="min-w-0 flex-1 pt-1">
        {/* 2行になっても読みやすいよう行高1.5を確保 */}
        <div className={`text-sm leading-[1.5] ${checked ? 'text-neutral-500 line-through decoration-neutral-300' : 'text-neutral-800'}`}>
          {item.text}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {showMeta}
          {checked && !editingDate && (
            <button
              onClick={() => setEditingDate(true)}
              className="inline-flex items-center gap-1 text-xs text-brand-600 underline decoration-brand-300 underline-offset-2"
            >
              <Icon name="event" className="text-sm" />
              {fmtDateJa(check!.achievedOn)} に達成
            </button>
          )}
          {checked && editingDate && (
            <span className="inline-flex items-center gap-1.5">
              <input
                type="date"
                value={check!.achievedOn}
                max={todayStr()}
                onChange={(e) => e.target.value && updateCheckDate(childId, item.id, e.target.value)}
                className="rounded-lg border border-neutral-200 px-2 py-1 text-xs"
              />
              <button onClick={() => setEditingDate(false)} className="text-xs font-medium text-brand-600">
                完了
              </button>
            </span>
          )}
          {confirmUncheck && <span className="text-xs text-rose-500">もう一度タップで取り消し</span>}
        </div>
      </div>
      <button
        onClick={toggle}
        aria-label={checked ? `${item.text} のチェックを外す` : `${item.text} を達成として記録`}
        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
          checked
            ? confirmUncheck
              ? 'border-rose-300 bg-rose-50 text-rose-500'
              : 'border-brand-500 bg-brand-500 text-white'
            : 'border-neutral-300 bg-white text-transparent hover:border-brand-400'
        }`}
      >
        <Icon name={confirmUncheck ? 'close' : 'check'} className="text-xl" />
      </button>
    </div>
  )
}
