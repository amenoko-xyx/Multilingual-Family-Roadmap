import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ensureSeed } from './db'
import 'material-symbols/rounded.css'
import './index.css'

ensureSeed().finally(() => {
  // IndexedDB がブラウザに自動削除されないよう永続化を要求(失敗しても無視)
  navigator.storage?.persist?.().catch(() => {})
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </HashRouter>
    </StrictMode>,
  )
})
