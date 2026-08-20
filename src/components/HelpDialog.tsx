import { useEffect, useRef } from 'react'
import { MOD_LABEL } from '../lib/keys'

export type HelpTab = 'guide' | 'keys'

interface Props {
  open: boolean
  tab: HelpTab
  setTab: (t: HelpTab) => void
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
      { keys: [MOD_LABEL, '↑ / ↓'], what: 'move a sentence in the Order list' },
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

export default function HelpDialog({ open, tab, setTab, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog ref={ref} className="help-dialog" onClose={onClose} aria-labelledby="help-title">
      <div className="shortcuts-head">
        <h2 id="help-title">Help</h2>
        <button className="btn" onClick={onClose} autoFocus>
          Close
        </button>
      </div>

      <div className="help-tabs" role="tablist" aria-label="Help sections">
        <button
          id="help-tab-guide"
          className={'help-tab' + (tab === 'guide' ? ' active' : '')}
          role="tab"
          aria-selected={tab === 'guide'}
          aria-controls="help-panel-guide"
          onClick={() => setTab('guide')}
        >
          How it works
        </button>
        <button
          id="help-tab-keys"
          className={'help-tab' + (tab === 'keys' ? ' active' : '')}
          role="tab"
          aria-selected={tab === 'keys'}
          aria-controls="help-panel-keys"
          onClick={() => setTab('keys')}
        >
          Keyboard
        </button>
      </div>

      {tab === 'guide' ? (
        <div
          className="help-guide"
          id="help-panel-guide"
          role="tabpanel"
          aria-labelledby="help-tab-guide"
        >
          <section className="help-section">
            <h3>Classes</h3>
            <dl>
              <div className="help-row">
                <dt>Current class</dt>
                <dd>
                  The menu at the top of the window switches classes. Each class keeps its own roster{' '}
                  <em>and</em> its own comment bank, the way each tab did in the spreadsheet.
                </dd>
              </div>
              <div className="help-row">
                <dt>+ New class</dt>
                <dd>Starts a class with the built-in comment bank already in it, and no students.</dd>
              </div>
              <div className="help-row">
                <dt>+ New class (blank bank)</dt>
                <dd>
                  Starts with nothing at all — no categories, no students — ready for a bank you
                  import.
                </dd>
              </div>
              <div className="help-row">
                <dt>Duplicate bank</dt>
                <dd>
                  Copies a class&apos;s comment bank into a new class with an empty roster. This is
                  the quick way to set up a second block of the same course.
                </dd>
              </div>
              <div className="help-row">
                <dt>Class name</dt>
                <dd>
                  Rename a class by typing over its name in the Classes list on Reports &amp; Export.
                </dd>
              </div>
            </dl>
          </section>

          <section className="help-section">
            <h3>Comment Bank</h3>
            <dl>
              <div className="help-row">
                <dt>in comment</dt>
                <dd>
                  Whether this category goes into the final text at all. A category switched off
                  still takes ratings — it shows a ✎ on the Students tab and sits dimmed in the Grid.
                </dd>
              </div>
              <div className="help-row">
                <dt>Competency group</dt>
                <dd>
                  A heading such as “Communicating” that gathers categories together. It is purely
                  organisational and never appears in a comment.
                </dd>
              </div>
              <div className="help-row">
                <dt>multi-pick</dt>
                <dd>
                  Lets a student carry more than one level from this category at once. The built-in{' '}
                  <em>Using Class Time</em> uses it because its four options are independent issues,
                  not a scale.
                </dd>
              </div>
              <div className="help-row">
                <dt>Level 1–4</dt>
                <dd>
                  The four ratings a category offers. The label box beside each one is optional —{' '}
                  <em>Using Class Time</em> labels its levels Practice, Check work, Participation and
                  Absences, so the picker reads “1 · Practice” instead of “Level 1”.
                </dd>
              </div>
              <div className="help-row">
                <dt>+ Add wording</dt>
                <dd>
                  Every level holds a pool of interchangeable phrasings; the first one is the
                  default. Add a wording when you want a second way of saying the same thing.
                </dd>
              </div>
              <div className="help-row">
                <dt>Make default</dt>
                <dd>Promotes an alternate to the top, so new students get that phrasing.</dd>
              </div>
              <div className="help-row">
                <dt>Remove</dt>
                <dd>
                  Deletes a wording. Any student who was using it falls back to the default for that
                  level.
                </dd>
              </div>
              <div className="help-row">
                <dt>↑ ↓ ⧉ ✕</dt>
                <dd>
                  Move a category up or down, duplicate it, or delete it. Top-to-bottom order here is
                  the order the sentences come out in, and deleting a category removes its ratings
                  too.
                </dd>
              </div>
              <div className="help-row">
                <dt>Share this bank…</dt>
                <dd>
                  Exports the bank as .xlsx or .json — hand it to a colleague, or use it to move a
                  bank between your own classes.
                </dd>
              </div>
              <div className="help-row">
                <dt>Import &amp; add</dt>
                <dd>Appends the categories in the file to the bank you already have.</dd>
              </div>
              <div className="help-row">
                <dt>Import &amp; replace</dt>
                <dd>Swaps the bank out for the one in the file and clears this class&apos;s ratings.</dd>
              </div>
              <div className="help-row">
                <dt>Reset to template</dt>
                <dd>Puts the built-in bank back. Your students stay; their ratings are cleared.</dd>
              </div>
            </dl>
          </section>

          <section className="help-section">
            <h3>Students</h3>
            <dl>
              <div className="help-row">
                <dt>Search students · A-Z</dt>
                <dd>
                  The search box filters the roster as you type. <em>A-Z</em> sorts it
                  alphabetically instead of the order you added people in.
                </dd>
              </div>
              <div className="help-row">
                <dt>Ratings</dt>
                <dd>
                  Pick a level for each category you want in this comment. Leaving one on{' '}
                  <code>—</code> skips that category for this student only.
                </dd>
              </div>
              <div className="help-row">
                <dt>wording 1/2</dt>
                <dd>
                  Appears when a level has more than one phrasing. Click it to give this student the
                  next wording of that level.
                </dd>
              </div>
              <div className="help-row">
                <dt>Order</dt>
                <dd>
                  Moves the sentences of this one comment around with ↑ and ↓. The Comment Bank&apos;s
                  order is the class default; this overrides it for the student you are looking at.
                </dd>
              </div>
              <div className="help-row">
                <dt>Reset to bank order</dt>
                <dd>Drops the custom order and follows the Comment Bank again.</dd>
              </div>
              <div className="help-row">
                <dt>Personal note</dt>
                <dd>
                  Added verbatim at the end of the comment. Placeholders work in it, so you can write
                  “[Student] should be proud of…”.
                </dd>
              </div>
              <div className="help-row">
                <dt>Generated comment</dt>
                <dd>
                  The finished text, with a character count beside it — useful when the report card
                  has a limit.
                </dd>
              </div>
            </dl>
          </section>

          <section className="help-section">
            <h3>Placeholders</h3>
            <p className="hint">
              Type these into any wording in the Comment Bank, or into a personal note. They are
              filled in from the student&apos;s name and pronouns.
            </p>
            <table className="help-table">
              <thead>
                <tr>
                  <th scope="col">Token</th>
                  <th scope="col">Becomes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>[Student]</code>
                  </td>
                  <td>The student&apos;s name — “This student” while the name is still blank.</td>
                </tr>
                <tr>
                  <td>
                    <code>[He/She/They]</code> <code>[he/she/they]</code>
                  </td>
                  <td>Subject pronoun: She / she.</td>
                </tr>
                <tr>
                  <td>
                    <code>[His/Her/Their]</code> <code>[his/her/their]</code>
                  </td>
                  <td>Possessive pronoun: her / her.</td>
                </tr>
                <tr>
                  <td>
                    <code>[Him/Her/Them]</code> <code>[him/her/them]</code>
                  </td>
                  <td>Object pronoun: Her / her.</td>
                </tr>
              </tbody>
            </table>
            <p className="hint">
              The capitalised possessive is the odd one out: <code>[His/Her/Their]</code> comes out
              lowercase, matching what the original spreadsheet did. Start a sentence with{' '}
              <code>[Student]</code> or <code>[He/She/They]</code> instead.
            </p>
          </section>

          <section className="help-section">
            <h3>Grid</h3>
            <dl>
              <div className="help-row">
                <dt>The grid</dt>
                <dd>
                  Students down the side, categories across the top. Click a cell and type — it is
                  the fast way to rate a whole class one column at a time.
                </dd>
              </div>
              <div className="help-row">
                <dt>
                  <code>3</code>
                </dt>
                <dd>Level 3, in that level&apos;s default wording.</dd>
              </div>
              <div className="help-row">
                <dt>
                  <code>3b</code>
                </dt>
                <dd>Level 3, second wording. A <code>c</code> would be the third, and so on.</dd>
              </div>
              <div className="help-row">
                <dt>
                  <code>1,4</code>
                </dt>
                <dd>Two levels at once — only on a multi-pick category.</dd>
              </div>
              <div className="help-row">
                <dt>
                  <code>—</code>
                </dt>
                <dd>Nothing chosen, so that category is skipped for that student.</dd>
              </div>
              <div className="help-row">
                <dt>Enter</dt>
                <dd>Opens that student on the Students tab.</dd>
              </div>
            </dl>
          </section>

          <section className="help-section">
            <h3>Import &amp; export</h3>
            <dl>
              <div className="help-row">
                <dt>Roster</dt>
                <dd>
                  Any sheet with a <strong>Name</strong> column, plus an optional{' '}
                  <strong>Pronouns</strong> column (she, he or they). The students are added to the
                  class you are in.
                </dd>
              </div>
              <div className="help-row">
                <dt>Ratings</dt>
                <dd>
                  The Ratings sheet this app exports, or any sheet whose headings match your category
                  names. Students are matched by name, and a name it does not recognise is added.
                </dd>
              </div>
              <div className="help-row">
                <dt>Comment bank</dt>
                <dd>
                  Moves in and out as .xlsx or .json, from <em>Share this bank…</em> on the Comment
                  Bank tab.
                </dd>
              </div>
              <div className="help-row">
                <dt>Backup</dt>
                <dd>
                  A .json file holding the whole app — every class, every roster, every bank.
                  Restoring one replaces everything currently in the app.
                </dd>
              </div>
              <div className="help-row">
                <dt>Download .xlsx</dt>
                <dd>Every class, in one workbook.</dd>
              </div>
              <div className="help-row">
                <dt>Download .csv</dt>
                <dd>Just the class you are looking at.</dd>
              </div>
            </dl>
          </section>

          <section className="help-section">
            <h3>Where your data lives</h3>
            <dl>
              <div className="help-row">
                <dt>On this device</dt>
                <dd>
                  Everything is kept in your browser&apos;s <span className="mono">localStorage</span>.
                  There is no server and no account, so nothing you type here leaves the device.
                </dd>
              </div>
              <div className="help-row">
                <dt>Clearing site data</dt>
                <dd>
                  It erases your classes along with everything else the browser stored. Download a
                  backup first.
                </dd>
              </div>
              <div className="help-row">
                <dt>Another device or browser</dt>
                <dd>
                  A backup file is the only way across: download it on one, restore it on the other.
                </dd>
              </div>
              <div className="help-row">
                <dt>Offline</dt>
                <dd>
                  You can install the app from your browser and it keeps working with no connection.
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : (
        <>
          <div
            className="shortcuts-body"
            id="help-panel-keys"
            role="tabpanel"
            aria-labelledby="help-tab-keys"
          >
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
            Bare letters only work when you are not typing in a field. Everything here also has a
            button somewhere — the shortcuts are the fast path, not the only path.
          </p>
        </>
      )}
    </dialog>
  )
}
