import { useCallback, useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { AppState, Student } from './types'
import { loadState, saveState } from './lib/storage'
import StudentsPanel from './components/StudentsPanel'
import BankPanel from './components/BankPanel'
import ReportsPanel from './components/ReportsPanel'

const iconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`

type Tab = 'students' | 'bank' | 'reports'
type SaveStatus = 'saved' | 'saving' | 'error'

const TABS: { id: Tab; label: string }[] = [
  { id: 'students', label: 'Students' },
  { id: 'bank', label: 'Comment Bank' },
  { id: 'reports', label: 'Reports & Export' },
]

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [tab, setTab] = useState<Tab>('students')
  const [selectedId, setSelectedId] = useState<string | null>(state.students[0]?.id ?? null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const firstRender = useRef(true)

  const {
    offlineReady: [offlineReady],
  } = useRegisterSW({ immediate: true })

  // on a returning visit the app is already controlled by a service worker
  const [alreadyControlled] = useState(
    () => 'serviceWorker' in navigator && !!navigator.serviceWorker.controller,
  )
  const offline = offlineReady || alreadyControlled

  // debounce persistence
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaveStatus('saving')
    const t = setTimeout(() => {
      setSaveStatus(saveState(state) ? 'saved' : 'error')
    }, 150)
    return () => clearTimeout(t)
  }, [state])

  // derive a valid selection: fall back to the first student when the
  // selected one was removed or the roster was replaced
  const effectiveSelectedId =
    selectedId && state.students.some((s: Student) => s.id === selectedId)
      ? selectedId
      : (state.students[0]?.id ?? null)

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    setState(fn)
  }, [])

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <img src={iconUrl} alt="" width={28} height={28} />
          <h1>Teacherer</h1>
          <span className="tagline">report comment tool · local-first</span>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab${tab === t.id ? ' active' : ''}`}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="header-status">
          <span id="save-status" title="All changes are saved to this device automatically">
            {saveStatus === 'saved' ? 'Saved locally' : saveStatus === 'saving' ? 'Saving…' : '⚠ Could not save (storage full?)'}
          </span>
          {offline && <span id="offline-badge">Offline ready</span>}
        </div>
      </header>

      <main>
        <section className={`panel${tab === 'students' ? ' active' : ''}`} role="tabpanel">
          <StudentsPanel
            state={state}
            update={update}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedId}
          />
        </section>
        <section className={`panel${tab === 'bank' ? ' active' : ''}`} role="tabpanel">
          <BankPanel state={state} update={update} />
        </section>
        <section className={`panel${tab === 'reports' ? ' active' : ''} panel-reports`} role="tabpanel">
          <ReportsPanel state={state} update={update} />
        </section>
      </main>

      <footer className="app-footer">
        <span>All data stays on your device.</span>
        <span>v{__APP_VERSION__}</span>
      </footer>
    </>
  )
}
