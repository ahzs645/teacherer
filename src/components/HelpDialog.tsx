import type { ReactNode } from 'react'
import { MOD_LABEL } from '../lib/keys'
import { Modal } from './ui'

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
      { keys: ['g', 'then', 's / g / b / r / d'], what: 'Students · Grid · Bank · Reports · Data' },
      { keys: [MOD_LABEL, '1 … 5'], what: 'the same five sections' },
      { keys: ['t'], what: 'flip between light and dark' },
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

/** One term and its explanation, as used all through the guide. */
function Entry({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="help-row">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="help-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export default function HelpDialog({ open, tab, setTab, onClose }: Props) {
  const tabs = (
    <div className="help-tabs" role="tablist" aria-label="Help sections">
      <button
        id="help-tab-guide"
        className="help-tab"
        role="tab"
        aria-selected={tab === 'guide'}
        aria-controls="help-panel-guide"
        onClick={() => setTab('guide')}
      >
        How it works
      </button>
      <button
        id="help-tab-keys"
        className="help-tab"
        role="tab"
        aria-selected={tab === 'keys'}
        aria-controls="help-panel-keys"
        onClick={() => setTab('keys')}
      >
        Keyboard
      </button>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="Help" headExtra={tabs} labelledBy="help-title">
      {tab === 'guide' ? (
        <div
          className="help-guide"
          id="help-panel-guide"
          role="tabpanel"
          aria-labelledby="help-tab-guide"
        >
          <Section title="The five sections">
            <dl>
              <Entry term="Students">
                One student at a time: their name and pronouns, a level for each category, the order
                their sentences come out in, and the finished comment beside it as you work.
              </Entry>
              <Entry term="Mark grid">
                The whole class at once — students down the side, categories across the top. This is
                the fast way in: click a cell and type.
              </Entry>
              <Entry term="Comment bank">
                The sentences themselves. Every category has four levels, and every level holds a
                pool of interchangeable phrasings.
              </Entry>
              <Entry term="Reports">
                Every finished comment, ready to copy, export or print.
              </Entry>
              <Entry term="Classes &amp; data">
                Which classes exist, importing a roster or a set of ratings, and backing the whole
                lot up.
              </Entry>
            </dl>
          </Section>

          <Section title="Appearance">
            <dl>
              <Entry term="Light · System · Dark">
                The switch in the top bar. <strong>System</strong> follows whatever your device is
                set to and changes with it, which is the default; picking light or dark pins it for
                this browser. <kbd>t</kbd> flips between light and dark from anywhere.
              </Entry>
            </dl>
          </Section>

          <Section title="Classes">
            <dl>
              <Entry term="Current class">
                The menu at the top of the window switches classes. Each class keeps its own roster{' '}
                <em>and</em> its own comment bank, the way each tab did in the spreadsheet.
              </Entry>
              <Entry term="New class">
                Starts a class with the built-in comment bank already in it, and no students.
              </Entry>
              <Entry term="New class (blank bank)">
                Starts with nothing at all — no categories, no students — ready for a bank you
                import.
              </Entry>
              <Entry term="Duplicate bank">
                Copies a class&apos;s comment bank into a new class with an empty roster. This is the
                quick way to set up a second block of the same course.
              </Entry>
              <Entry term="Class name">
                Rename a class by typing over its name in the Classes &amp; data list.
              </Entry>
            </dl>
          </Section>

          <Section title="Comment bank">
            <dl>
              <Entry term="in comment">
                Whether this category goes into the final text at all. A category switched off still
                takes ratings — it is marked <em>off</em> on the Students tab and sits dimmed in the
                grid.
              </Entry>
              <Entry term="Competency group">
                A heading such as “Communicating” that gathers categories together. It is purely
                organisational and never appears in a comment.
              </Entry>
              <Entry term="multi-pick">
                Lets a student carry more than one level from this category at once. The built-in{' '}
                <em>Using Class Time</em> uses it because its four options are independent issues,
                not a scale.
              </Entry>
              <Entry term="Level 1–4">
                The four ratings a category offers. The label box beside each one is optional —{' '}
                <em>Using Class Time</em> labels its levels Practice, Check work, Participation and
                Absences, so the buttons read “Practice” instead of “1”.
              </Entry>
              <Entry term="Add wording">
                Every level holds a pool of interchangeable phrasings; the first one is the default.
                Add a wording when you want a second way of saying the same thing.
              </Entry>
              <Entry term="Make default">
                Promotes an alternate to the top, so new students get that phrasing.
              </Entry>
              <Entry term="Remove">
                Deletes a wording. Any student who was using it falls back to the default for that
                level.
              </Entry>
              <Entry term="The row of icons">
                Move a category up or down, duplicate it, or delete it. Top-to-bottom order here is
                the order the sentences come out in, and deleting a category removes its ratings too.
              </Entry>
              <Entry term="Share this bank">
                Exports the bank as .xlsx or .json — hand it to a colleague, or use it to move a bank
                between your own classes. <strong>Add</strong> appends to the bank you already have;{' '}
                <strong>replace</strong> swaps it out and clears this class&apos;s ratings.{' '}
                <strong>Reset to template</strong> puts the built-in bank back.
              </Entry>
            </dl>
          </Section>

          <Section title="Students">
            <dl>
              <Entry term="Search · A-Z">
                The search box filters the roster as you type. <em>A-Z</em> sorts it alphabetically
                instead of the order you added people in.
              </Entry>
              <Entry term="The bar beside a name">
                How much of that student&apos;s comment exists yet — how many of the included
                categories have a level. It turns green once every one of them is rated.
              </Entry>
              <Entry term="Ratings">
                Click a level to set it, and click it again to clear it. Nothing chosen means that
                category is skipped for this student only.
              </Entry>
              <Entry term="wording 1/2">
                Appears when a level has more than one phrasing. Click it to give this student the
                next wording of that level.
              </Entry>
              <Entry term="Sentence order">
                Moves the sentences of this one comment around with ↑ and ↓. The Comment bank&apos;s
                order is the class default; this overrides it for the student you are looking at.
                <em> Reset to bank order</em> drops the override again.
              </Entry>
              <Entry term="Personal note">
                Added verbatim at the end of the comment. Placeholders work in it, so you can write
                “[Student] should be proud of…”.
              </Entry>
              <Entry term="Generated comment">
                The finished text, with a character count beside it — useful when the report card has
                a limit.
              </Entry>
            </dl>
          </Section>

          <Section title="Placeholders">
            <p className="hint" style={{ marginBottom: 'var(--space-3)' }}>
              Type these into any wording in the Comment bank, or into a personal note. They are
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
            <p className="hint" style={{ marginTop: 'var(--space-3)' }}>
              The capitalised possessive is the odd one out: <code>[His/Her/Their]</code> comes out
              lowercase, matching what the original spreadsheet did. Start a sentence with{' '}
              <code>[Student]</code> or <code>[He/She/They]</code> instead.
            </p>
          </Section>

          <Section title="Mark grid">
            <dl>
              <Entry term="The grid">
                Students down the side, categories across the top. Click a cell and type — it is the
                fast way to rate a whole class one column at a time. The colour of a cell tracks the
                level, so a column reads at a glance.
              </Entry>
              <Entry term="3">Level 3, in that level&apos;s default wording.</Entry>
              <Entry term="3b">
                Level 3, second wording. A <code>c</code> would be the third, and so on.
              </Entry>
              <Entry term="1,4">Two levels at once — only on a multi-pick category.</Entry>
              <Entry term="—">Nothing chosen, so that category is skipped for that student.</Entry>
              <Entry term="Enter">Opens that student on the Students tab.</Entry>
            </dl>
          </Section>

          <Section title="Import &amp; export">
            <dl>
              <Entry term="Roster">
                Any sheet with a <strong>Name</strong> column, plus an optional{' '}
                <strong>Pronouns</strong> column (she, he or they). The students are added to the
                class you are in.
              </Entry>
              <Entry term="Ratings">
                The Ratings sheet this app exports, or any sheet whose headings match your category
                names. Students are matched by name, and a name it does not recognise is added.
              </Entry>
              <Entry term="Comment bank">
                Moves in and out as .xlsx or .json, from <em>Share this bank</em> on the Comment bank
                tab.
              </Entry>
              <Entry term="Backup">
                A .json file holding the whole app — every class, every roster, every bank. Restoring
                one replaces everything currently in the app.
              </Entry>
              <Entry term="Download .xlsx">Every class, in one workbook.</Entry>
              <Entry term="Download .csv">Just the class you are looking at.</Entry>
            </dl>
          </Section>

          <Section title="Where your data lives">
            <dl>
              <Entry term="On this device">
                Everything is kept in your browser&apos;s <span className="mono">localStorage</span>.
                There is no server and no account, so nothing you type here leaves the device.
              </Entry>
              <Entry term="Clearing site data">
                It erases your classes along with everything else the browser stored. Download a
                backup first.
              </Entry>
              <Entry term="Another device or browser">
                A backup file is the only way across: download it on one, restore it on the other.
              </Entry>
              <Entry term="Offline">
                You can install the app from your browser and it keeps working with no connection.
              </Entry>
            </dl>
          </Section>
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
          <p className="hint" style={{ marginTop: 'var(--space-5)' }}>
            Bare letters only work when you are not typing in a field. Everything here also has a
            button somewhere — the shortcuts are the fast path, not the only path.
          </p>
        </>
      )}
    </Modal>
  )
}
