import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEFAULT_LANGS, type Child, type Lang } from '../types'

export interface ToastState {
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface AppContextValue {
  children_: Child[]
  /** 子供リストの読み込みが完了したか(完了前にリダイレクト判定しないため) */
  ready: boolean
  selectedChild: Child | null
  selectChild: (id: string) => void
  /** 第一・第二(・任意で第三)言語。設定で変更可能 */
  langs: Lang[]
  /** 位置別の判定ペース係数(1=しっかり、0.75=ゆるめ)。設定「目標レベルの傾斜」で変更 */
  paces: [number, number, number]
  toast: ToastState | null
  /** 操作結果の通知+取り消し手段の提供(ニールセン: 状態の可視化/ユーザーの主導権) */
  showToast: (t: ToastState) => void
  dismissToast: () => void
}

const Ctx = createContext<AppContextValue>({
  children_: [],
  ready: false,
  selectedChild: null,
  selectChild: () => {},
  langs: DEFAULT_LANGS,
  paces: [1, 1, 1],
  toast: null,
  showToast: () => {},
  dismissToast: () => {},
})

const LS_KEY = 'trilingual-roadmap:selectedChild'

export function AppProvider({ children }: { children: ReactNode }) {
  const kids = useLiveQuery(() => db.children.toArray(), [], undefined)
  const langsSetting = useLiveQuery(() => db.settings.get('langs'), [], undefined)
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(LS_KEY))
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const list = (kids ?? []).slice().sort((a, b) => a.birthDate.localeCompare(b.birthDate))
  const selectedChild = list.find((c) => c.id === selectedId) ?? list[0] ?? null

  // 第三言語は任意:設定値が2言語ならそのまま2言語で運用する
  const raw = ((langsSetting?.value as Lang[] | undefined) ?? DEFAULT_LANGS).filter(Boolean)
  const langs: Lang[] = raw.length >= 2 ? raw.slice(0, 3) : [...DEFAULT_LANGS]

  const paceSetting = useLiveQuery(() => db.settings.get('paceFactors'), [], undefined)
  const rawPace = (paceSetting?.value as number[] | undefined) ?? [1, 1, 1]
  const paces: [number, number, number] = [rawPace[0] ?? 1, rawPace[1] ?? 1, rawPace[2] ?? 1]

  useEffect(() => {
    if (selectedChild && selectedChild.id !== selectedId) setSelectedId(selectedChild.id)
  }, [selectedChild?.id])

  const selectChild = (id: string) => {
    setSelectedId(id)
    localStorage.setItem(LS_KEY, id)
  }

  const showToast = (t: ToastState) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(t)
    timerRef.current = setTimeout(() => setToast(null), 5000)
  }

  const dismissToast = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }

  return (
    <Ctx.Provider
      value={{ children_: list, ready: kids !== undefined, selectedChild, selectChild, langs, paces, toast, showToast, dismissToast }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  return useContext(Ctx)
}
