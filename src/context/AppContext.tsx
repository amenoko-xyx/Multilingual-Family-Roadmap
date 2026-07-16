import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { DEFAULT_MEMBER_LANGS, ROLES, type Lang, type Member, type MemberLanguage } from '../types'

export interface ToastState {
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface AppContextValue {
  members: Member[]
  /** メンバーリストの読み込みが完了したか(完了前にリダイレクト判定しないため) */
  ready: boolean
  selectedMember: Member | null
  selectMember: (id: string) => void
  /** 選択中メンバーの言語構成(役割順)。未選択時はデフォルト構成 */
  memberLanguages: MemberLanguage[]
  /** 役割順(母語→第一外国語→第二外国語)の言語配列。ページ側の互換用 */
  langs: Lang[]
  /** langs と同順の判定ペース係数(1=しっかり、0.75=ゆるめ) */
  paces: number[]
  toast: ToastState | null
  /** 操作結果の通知+取り消し手段の提供(ニールセン: 状態の可視化/ユーザーの主導権) */
  showToast: (t: ToastState) => void
  dismissToast: () => void
}

/** languages を役割順(native → foreign1 → foreign2)に並べる */
function sortByRole(languages: MemberLanguage[]): MemberLanguage[] {
  return languages.slice().sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
}

const Ctx = createContext<AppContextValue>({
  members: [],
  ready: false,
  selectedMember: null,
  selectMember: () => {},
  memberLanguages: DEFAULT_MEMBER_LANGS,
  langs: DEFAULT_MEMBER_LANGS.map((ml) => ml.lang),
  paces: DEFAULT_MEMBER_LANGS.map((ml) => ml.pace),
  toast: null,
  showToast: () => {},
  dismissToast: () => {},
})

const LS_KEY = 'multilingual-family-roadmap:selectedMember'

export function AppProvider({ children }: { children: ReactNode }) {
  const rows = useLiveQuery(() => db.members.toArray(), [], undefined)
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(LS_KEY))
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 生年月日順(未設定の大人は後ろ)→ 名前順で安定ソート
  const list = (rows ?? []).slice().sort((a, b) => {
    if (a.birthDate && b.birthDate) return a.birthDate.localeCompare(b.birthDate)
    if (a.birthDate !== b.birthDate) return a.birthDate ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  const selectedMember = list.find((m) => m.id === selectedId) ?? list[0] ?? null

  const memberLanguages = sortByRole(selectedMember?.languages ?? DEFAULT_MEMBER_LANGS)
  const langs: Lang[] = memberLanguages.map((ml) => ml.lang)
  const paces: number[] = memberLanguages.map((ml) => ml.pace)

  useEffect(() => {
    if (selectedMember && selectedMember.id !== selectedId) setSelectedId(selectedMember.id)
  }, [selectedMember?.id])

  const selectMember = (id: string) => {
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
      value={{
        members: list,
        ready: rows !== undefined,
        selectedMember,
        selectMember,
        memberLanguages,
        langs,
        paces,
        toast,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  return useContext(Ctx)
}
