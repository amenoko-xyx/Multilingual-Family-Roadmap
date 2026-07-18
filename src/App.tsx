import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { T } from './i18n'
import { Icon } from './components/ui'
import HomePage from './pages/HomePage'
import RoadmapPage from './pages/RoadmapPage'
import GapPage from './pages/GapPage'
import PlanPage from './pages/PlanPage'
import FamilyPage from './pages/FamilyPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'

// ホームに記録を統合、きょうだい比較はギャップ分析内から遷移(ナビは4項目)
const NAV = [
  { to: '/', label: T.nav.home, short: T.nav.home, icon: 'home' },
  { to: '/roadmap', label: T.nav.roadmap, short: 'マップ', icon: 'map' },
  { to: '/gap', label: T.nav.gap, short: '分析', icon: 'monitoring' },
  { to: '/plan', label: T.nav.plan, short: T.nav.plan, icon: 'route' },
]

const PAGE_TITLE: Record<string, string> = {
  '/roadmap': T.nav.roadmap,
  '/gap': T.nav.gap,
  '/plan': T.nav.plan,
  '/family': T.nav.compare,
  '/settings': T.nav.settings,
  '/onboarding': 'メンバーの登録',
}

function MemberSwitcher() {
  const { members, selectedMember, selectMember } = useApp()
  const location = useLocation()
  if (members.length === 0 || ['/family', '/onboarding'].includes(location.pathname)) return null
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="メンバーの切り替え">
      {members.slice(0, 3).map((m) => (
        <button
          key={m.id}
          onClick={() => selectMember(m.id)}
          aria-pressed={selectedMember?.id === m.id}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedMember?.id === m.id
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          {m.name}
        </button>
      ))}
    </div>
  )
}

function ToastViewport() {
  const { toast, dismissToast } = useApp()
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6" role="status" aria-live="polite">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-neutral-900/95 py-2.5 pl-4 pr-2 text-sm text-white shadow-lg">
        <span>{toast.message}</span>
        {toast.actionLabel && (
          <button
            onClick={() => {
              toast.onAction?.()
              dismissToast()
            }}
            className="rounded-full px-3 py-1 font-semibold text-brand-300 hover:bg-white/10"
          >
            {toast.actionLabel}
          </button>
        )}
        <button onClick={dismissToast} aria-label="通知を閉じる" className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10">
          <Icon name="close" className="text-base" />
        </button>
      </div>
    </div>
  )
}

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { members } = useApp()
  const isHome = location.pathname === '/'
  const isOnboarding = location.pathname === '/onboarding'
  const pageTitle = PAGE_TITLE[location.pathname]
  // 初回起動(メンバー0人)でオンボーディングに来た場合、戻る先がないので戻るボタンを出さない
  const showBack = !isHome && !(isOnboarding && members.length === 0)

  return (
    <div className="mx-auto min-h-screen max-w-5xl">
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
          {/* 現在地の明示+明確な「戻る」手段(ニールセン: 現在地の可視化/ユーザーの主導権) */}
          {showBack && (
            <button
              onClick={() => navigate('/')}
              aria-label="ホームに戻る"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
            >
              <Icon name="arrow_back" className="text-2xl" />
            </button>
          )}
          {isHome ? (
            <div className="flex min-w-0 items-baseline gap-2">
              {/* スマホでもタイトルが途切れないよう、縮小+折り返しで全文表示する */}
              <span className="min-w-0 text-base font-bold leading-tight tracking-tight text-neutral-900 sm:text-lg">
                {T.appName}
              </span>
              <span className="hidden text-xs text-neutral-400 lg:inline">{T.tagline}</span>
            </div>
          ) : (
            <h1 className="min-w-0 text-base font-bold leading-tight tracking-tight text-neutral-900 sm:text-lg">{pageTitle}</h1>
          )}
          <div className="ml-auto flex items-center gap-2">
            <MemberSwitcher />
            {!isOnboarding && (
              <NavLink
                to="/settings"
                aria-label={T.nav.settings}
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 ${isActive ? 'bg-neutral-200 text-neutral-700' : 'hover:bg-neutral-100'}`
                }
              >
                <Icon name="settings" className="text-2xl" />
              </NavLink>
            )}
          </div>
        </div>
        {/* デスクトップ:常設タブ(オンボーディング中は集中モードで非表示) */}
        {!isOnboarding && (
          <nav className="hidden gap-1 px-4 pb-2 sm:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                  }`
                }
              >
                <Icon name={n.icon} className="text-lg" />
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="px-4 pb-28 pt-5 sm:pb-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          {/* 旧・記録ページはホームに統合(リンク互換のためリダイレクト) */}
          <Route path="/record" element={<Navigate to="/" replace />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/gap" element={<GapPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/compare" element={<Navigate to="/family" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <ToastViewport />

      {/* モバイル:下部ナビ(片手操作前提)。オンボーディング中は非表示 */}
      {!isOnboarding && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-5xl">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                    isActive ? 'text-brand-600' : 'text-neutral-400'
                  }`
                }
              >
                <Icon name={n.icon} className="text-xl" />
                <span className="whitespace-nowrap">{n.short}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  )
}
