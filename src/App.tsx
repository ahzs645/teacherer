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
import { useTheme } from './hooks/useTheme'
import ThemeToggle from './components/ThemeToggle'
import StudentsPanel from './components/StudentsPanel'
import type { Pane } from './components/StudentsPanel'
import GridPanel from './components/GridPanel'
import BankPanel from './components/BankPanel'
import ReportsPanel from './components/ReportsPanel'
import DataPanel from './components/DataPanel'
import HelpDialog from './components/HelpDialog'
import type { HelpTab } from './components/HelpDialog'
import { Badge, Button, Icon } from './components/ui'
import type { IconName } from './components/ui'

const iconUrl = `${import.meta.env.BASE_URL}icons/icon-192.png`

type Tab = 'students' | 'grid' | 'bank' | 'reports' | 'data'
type SaveStatus = 'saved' | 'saving' | 'error'

interface TabDef {
  id: Tab
  label: string
  /** what the bottom bar shows, where there is room for a word at most */
  short: string
  icon: IconName
  /** the second key of the "g then …" sequence */
  chord: string
}

const TABS: TabDef[] = [
  { id: 'students', label: 'Students', short: 'Students', icon: 'students', chord: 's' },
  { id: 'grid', label: 'Mark grid', short: 'Grid', icon: 'grid', chord: 'g' },
  { id: 'bank', label: 'Comment bank', short: 'Bank', icon: 'bank', chord: 'b' },
  { id: 'reports', label: 'Reports', short: 'Reports', icon: 'reports', chord: 'r' },
  { id: 'data', label: 'Classes & data', short: 'Data', icon: 'data', chord: 'd' },
]

const NEW_CLASS = '__new__'

const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  error: 'Not saved',
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [tab, setTab] = useState<Tab>('students')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [query, setQuery] = useState('')
  const [sortAZ, setSortAZ] = useState(false)
  const [pane, setPane] = useState<Pane>('roster')
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpTab, setHelpTab] = useState<HelpTab>('guide')
  const [focusNameToken, setFocusNameToken] = useState(0)
  const firstRender = useRef(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const chordRef = useRef<number>(0)

  const theme = useTheme()

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
      setState((prev) => ({
        ...prev,
        classes: [...prev.classes, created],
        activeClassId: created.id,
      }))
    } else {
      setState((prev) => ({ ...prev, activeClassId: id }))
    }
    setSelectedId(null)
    setQuery('')
    setPane('roster')
  }

  const openHelp = (which: HelpTab) => {
    setHelpTab(which)
    setHelpOpen(true)
  }

  // ---- global keyboard shortcuts -----------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const typing = isTypingTarget(e.target)

      if (mod(e) && !e.altKey && !e.shiftKey && e.key >= '1' && e.key <= '9') {
        const hit = TABS[Number(e.key) - 1]
        if (hit) {
          e.preventDefault()
          setTab(hit.id)
        }
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
          // pressing "?" is a keyboard question, so land on that tab
          openHelp('keys')
          break
        case 'Escape':
          setHelpOpen(false)
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
        case 't':
          e.preventDefault()
          theme.toggle()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addStudent, effectiveSelectedId, klass.categories, klass.students, theme, visible])

  const classPicker = (
    <div className="topbar__class">
      <label className="sr-only" htmlFor="class-picker">
        Current class
      </label>
      <select
        id="class-picker"
        value={state.activeClassId}
        onChange={(e) => switchClass(e.target.value)}
        title="Switch class"
      >
        {state.classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value={NEW_CLASS}>＋ New class…</option>
      </select>
    </div>
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand__mark" src={iconUrl} alt="" width={32} height={32} />
          <span className="brand__text">
            <span className="brand__name">Teacherer</span>
            <span className="brand__tagline">Report comments</span>
          </span>
        </div>

        <nav aria-label="Sections">
          <ul className="sidebar__nav">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  className="nav-item"
                  aria-current={tab === t.id ? 'page' : undefined}
                  onClick={() => setTab(t.id)}
                >
                  <Icon name={t.icon} className="nav-item__icon" size="1.15rem" />
                  <span className="nav-item__label">{t.label}</span>
                  <span className="nav-item__short">{t.short}</span>
                  <span className="nav-item__chord" aria-hidden="true">
                    g {t.chord}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__meta">
            <span className="sidebar__local" title="Nothing you type here leaves this device">
              <Icon name="lock" />
              <span className="sidebar__local-text">On this device</span>
            </span>
            <span>v{__APP_VERSION__}</span>
          </div>
        </div>
      </aside>

      <div className="app__main">
        <header className="topbar">
          <span className="topbar__brand">
            <img src={iconUrl} alt="Teacherer" width={26} height={26} />
          </span>
          {classPicker}
          <div className="topbar__actions">
            <span className="save-chip" data-status={saveStatus} title="Changes save to this device automatically">
              <span className="save-chip__dot" aria-hidden="true" />
              <span>{SAVE_LABEL[saveStatus]}</span>
            </span>
            {offline && (
              <Badge tone="success" className="topbar__offline" title="This app works with no connection">
                Offline ready
              </Badge>
            )}
            <ThemeToggle theme={theme} />
            <Button
              variant="ghost"
              icon="help"
              onClick={() => openHelp('guide')}
              title="Help — what everything does, and the shortcuts (?)"
              aria-label="Help"
            />
          </div>
        </header>

        <main className={`content${tab === 'grid' ? ' content--wide' : ''}`}>
          <div className="content__inner" key={tab}>
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
              <ReportsPanel state={state} klass={klass} onOpenStudent={openStudent} />
            )}
            {tab === 'data' && (
              <DataPanel state={state} update={update} klass={klass} updateClass={updateClass} />
            )}
          </div>
        </main>

        <footer className="app-footer">
          <span>All data stays on your device — there is no server and no account.</span>
          <button className="link-btn" onClick={() => openHelp('guide')}>
            Help &amp; shortcuts
          </button>
        </footer>
      </div>

      <nav className="tabbar" aria-label="Sections">
        <ul className="tabbar__list">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                className="tabbar__item"
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size="1.25rem" />
                <span>{t.short}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <HelpDialog
        open={helpOpen}
        tab={helpTab}
        setTab={setHelpTab}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  )
}
