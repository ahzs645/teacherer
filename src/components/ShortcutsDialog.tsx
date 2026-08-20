import { useEffect, useRef } from 'react'
import { MOD_LABEL } from '../lib/keys'

interface Props {
  open: boolean
  onClose: () => void
}

interface Row {
  keys: string[]
  what: string
}

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Getting around',
    rows: [
      { keys: ['g', 'then', 's / g / b / r'], what: 'Students · Grid · Comment Bank · Reports' },
      { keys: [MOD_LABEL, '1 … 4'], what: 'the same four tabs' },
      { keys: ['?'], what: 'this list' },
      { keys: ['Esc'], what: 'close this, or leave the field you are in' },
    ],
  },
  {
    title: 'Roster',
    rows: [
      { keys: ['/'], what: 'search the roster' },
      { keys: ['↑', '↓'], what: 'move through the roster list' },
      { keys: ['Alt', '↑ / ↓'], what: 'previous / next student, from anywhere' },
      { keys: ['n'], what: 'add a student' },
      { keys: [MOD_LABEL, '⇧', 'C'], what: "copy the current student's comment" },
    ],
  },
  {
    title: 'Ratings',
    rows: [
      { keys: ['1 … 4'], what: 'set the level on the focused category' },
      { keys: ['0', 'or', 'Backspace'], what: 'clear it' },
      { keys: ['a'], what: 'next phrasing for that level' },
    ],
  },
  {
    title: 'Grid',
    rows: [
      { keys: ['↑ ↓ ← →'], what: 'move a cell · Home / End jump to the row ends' },
      { keys: ['1 … 4'], what: 'set the level, then drop down a row' },
      { keys: ['a', '/', '⇧A'], what: 'next / previous phrasing' },
      { keys: [MOD_LABEL, 'D'], what: 'copy the cell above' },
      { keys: [MOD_LABEL, '⇧', 'D'], what: 'fill the value down the column' },
      { keys: [MOD_LABEL, 'V'], what: 'paste a column of levels from your gradebook' },
      { keys: ['Enter'], what: 'open that student on the Students tab' },
    ],
  },
]

export default function ShortcutsDialog({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog ref={ref} className="shortcuts" onClose={onClose} aria-labelledby="shortcuts-title">
      <div className="shortcuts-head">
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <button className="btn" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
      <div className="shortcuts-body">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3>{g.title}</h3>
            <dl>
              {g.rows.map((r) => (
                <div key={r.what} className="shortcut-row">
                  <dt>
                    {r.keys.map((k, i) =>
                      k === 'then' || k === 'or' || k === '/' ? (
                        <span key={i} className="joiner">
                          {k}
                        </span>
                      ) : (
                        <kbd key={i}>{k}</kbd>
                      ),
                    )}
                  </dt>
                  <dd>{r.what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="hint">
        Bare letters only work when you are not typing in a field. Everything here also has a button
        somewhere — the shortcuts are the fast path, not the only path.
      </p>
    </dialog>
  )
}
