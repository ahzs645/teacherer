import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { AppState, Klass } from './types'
import { activeClass } from './types'
import { loadState, saveState } from './lib/storage'
import { generateComment } from './lib/generate'
import { isTypingTarget, mod } from './lib/keys'
import { stepStudent, visibleStudents } from './lib/roster'
import { makeStudent } from './lib/pronouns'
import { copyText } from './lib/util'
import { emptyClass } from './seedData'
import StudentsPanel from './components/StudentsPanel'
import type { Pane } from './components/StudentsPanel'
import GridPanel from './components/GridPanel'
import BankPanel from './components/BankPanel'
import ReportsPanel from './components/ReportsPanel'
import ShortcutsDialog from './components/ShortcutsDialog'

const iconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`

type Tab = 'students' | 'grid' | 'bank' | 'reports'
type SaveStatus = 'saved' | 'saving' | 'error'

/** `chord` is the second key of the "g then …" sequence. */
const TABS: { id: Tab; label: string; short: string; chord: string }[] = [
  { id: 'students', label: 'Students', short: 'Students', chord: 's' },
  { id: 'grid', label: 'Grid', short: 'Grid', chord: 'g' },
  { id: 'bank', label: 'Comment Bank', short: 'Bank', chord: 'b' },
  { id: 'reports', label: 'Reports & Export', short: 'Reports', chord: 'r' },
]

const NEW_CLASS = '__new__'

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [tab, setTab] = useState<Tab>('students')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [query, setQuery] = useState('')
  const [sortAZ, setSortAZ] = useState(false)
  const [pane, setPane] = useState<Pane>('roster')
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [focusNameToken, setFocusNameToken] = useState(0)
  const firstRender = useRef(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const chordRef = useRef<number>(0)

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

  const klass = activeClass(state)
  const visible = useMemo(
    () => visibleStudents(klass.students, query, sortAZ),
    [klass.students, query, sortAZ],
  )

  // fall back to the first visible student when the selection goes stale
  const effectiveSelectedId =
    selectedId && klass.students.some((s) => s.id === selectedId)
      ? selectedId
      : (visible[0]?.id ?? null)

  const update = useCallback((fn: (prev: AppState) => AppState) => setState(fn), [])

  const updateClass = useCallback((fn: (prev: Klass) => Klass) => {
    setState((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === prev.activeClassId ? fn(c) : c)),
    }))
  }, [])

  const addStudent = useCallback(() => {
    const st = makeStudent('', 'they')
    updateClass((prev) => ({ ...prev, students: [...prev.students, st] }))
    setSelectedId(st.id)
    setPane('editor')
    setTab('students')
    setFocusNameToken((n) => n + 1)
  }, [updateClass])

  const openStudent = useCallback((id: string) => {
    setSelectedId(id)
    setPane('editor')
    setTab('students')
  }, [])

  const switchClass = (id: string) => {
    if (id === NEW_CLASS) {
      const name = prompt('Name for the new class (e.g. “P3 FM10”)')?.trim()
      if (!name) return
      const created = emptyClass(name)
      setState((prev) => ({ ...prev, classes: [...prev.classes, created], activeClassId: created.id }))
    } else {
      setState((prev) => ({ ...prev, activeClassId: id }))
    }
    setSelectedId(null)
    setQuery('')
    setPane('roster')
  }

  // ---- global keyboard shortcuts -----------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const typing = isTypingTarget(e.target)

      if (mod(e) && !e.altKey && e.key >= '1' && e.key <= '4' && !e.shiftKey) {
        e.preventDefault()
        setTab(TABS[Number(e.key) - 1].id)
        return
      }
      if (mod(e) && e.shiftKey && e.key.toLowerCase() === 'c') {
        const student = klass.students.find((s) => s.id === effectiveSelectedId)
        if (student) {
          e.preventDefault()
          void copyText(generateComment(klass.categories, student))
        }
        return
      }
      if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault()
        const next = stepStudent(visible, effectiveSelectedId, e.key === 'ArrowDown' ? 1 : -1)
        if (next) setSelectedId(next)
        return
      }

      if (typing) {
        if (e.key === 'Escape' && e.target instanceof HTMLElement) e.target.blur()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // "g" then a tab key
      if (chordRef.current && Date.now() - chordRef.current < 1500) {
        const hit = TABS.find((t) => t.chord === e.key.toLowerCase())
        chordRef.current = 0
        if (hit) {
          e.preventDefault()
          setTab(hit.id)
          return
        }
      }

      switch (e.key) {
        case 'g':
          chordRef.current = Date.now()
          break
        case '?':
          e.preventDefault()
          setShortcutsOpen(true)
          break
        case 'Escape':
          setShortcutsOpen(false)
          break
        case '/':
          e.preventDefault()
          setTab('students')
          setPane('roster')
          setTimeout(() => searchRef.current?.focus(), 0)
          break
        case 'n':
          e.preventDefault()
          addStudent()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addStudent, effectiveSelectedId, klass.categories, klass.students, visible])

  const statusText =
    saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : '⚠ Not saved'

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <img src={iconUrl} alt="" width={26} height={26} />
          <h1>Teacherer</h1>
          <span className="tagline">report comment tool · local-first</span>
        </div>

        <label className="class-picker">
          <span className="sr-only">Current class</span>
          <select value={state.activeClassId} onChange={(e) => switchClass(e.target.value)}>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CLASS}>＋ New class…</option>
          </select>
        </label>

        <div className="header-status">
          <span id="save-status" title="All changes are saved to this device automatically">
            {statusText}
          </span>
          {offline && <span id="offline-badge">Offline ready</span>}
          <button
            className="btn small help-btn"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            ?
          </button>
        </div>

        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              className={`tab${tab === t.id ? ' active' : ''}`}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
            >
              <span className="tab-long">{t.label}</span>
              <span className="tab-short">{t.short}</span>
            </button>
          ))}
        </nav>
      </header>

      <main>
        <section
          className={`panel active panel-${tab}`}
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
        >
          {tab === 'students' && (
            <StudentsPanel
              klass={klass}
              updateClass={updateClass}
              students={visible}
              selectedId={effectiveSelectedId}
              onSelect={setSelectedId}
              query={query}
              setQuery={setQuery}
              sortAZ={sortAZ}
              setSortAZ={setSortAZ}
              searchRef={searchRef}
              pane={pane}
              setPane={setPane}
              onAddStudent={addStudent}
              focusNameToken={focusNameToken}
            />
          )}
          {tab === 'grid' && (
            <GridPanel
              klass={klass}
              updateClass={updateClass}
              students={visible}
              onOpenStudent={openStudent}
            />
          )}
          {tab === 'bank' && <BankPanel klass={klass} updateClass={updateClass} />}
          {tab === 'reports' && (
            <ReportsPanel state={state} update={update} klass={klass} updateClass={updateClass} />
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>All data stays on your device.</span>
        <button className="link-btn" onClick={() => setShortcutsOpen(true)}>
          Keyboard shortcuts
        </button>
        <span>v{__APP_VERSION__}</span>
      </footer>

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  )
}
