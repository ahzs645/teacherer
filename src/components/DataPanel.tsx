import { useRef } from 'react'
import type { AppState, Klass, Student } from '../types'
import { exportJson, parseRatingsFile, parseRosterFile } from '../lib/exportImport'
import { clearState, migrate } from '../lib/storage'
import { blankClass, emptyClass, freshStateFromSeed } from '../seedData'
import { uid } from '../lib/util'
import { Badge, Button, Card, Toolbar } from './ui'

interface Props {
  state: AppState
  update: (fn: (prev: AppState) => AppState) => void
  klass: Klass
  updateClass: (fn: (prev: Klass) => Klass) => void
}

/**
 * Everything that is about the data rather than about a comment: which classes
 * exist, getting a roster or a set of ratings in, and getting the whole lot out
 * to a backup file.
 */
export default function DataPanel({ state, update, klass, updateClass }: Props) {
  const rosterInput = useRef<HTMLInputElement>(null)
  const ratingsInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  const importRoster = async (file: File) => {
    try {
      const students = await parseRosterFile(file)
      if (!students.length) {
        alert(
          'No students found. The first sheet needs a header row with a “Name” (or “Student”) column.',
        )
        return
      }
      updateClass((prev) => ({ ...prev, students: [...prev.students, ...students] }))
      alert(
        `Imported ${students.length} student${students.length === 1 ? '' : 's'} into ${klass.name}.`,
      )
    } catch (err) {
      alert(`Could not read that file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** Read back the Ratings sheet this app exports: match by name, add the rest. */
  const importRatings = async (file: File) => {
    try {
      const result = await parseRatingsFile(file, klass.categories)
      if (!result.rows.length) {
        alert('No rows found. Expected a sheet with a “Student” column and one column per category.')
        return
      }
      if (!result.matchedCategories.length) {
        alert(
          `None of the columns in that file match a category in ${klass.name}. Column names have to match the category names in the Comment Bank.`,
        )
        return
      }
      // Merge from the class we can see right now rather than inside the state
      // updater: React may run an updater twice, and the counts are needed for
      // the message before the new state has been applied.
      const students = klass.students.map((s) => ({ ...s }))
      const indexByName = new Map(students.map((s, i) => [s.name.trim().toLowerCase(), i]))
      let updated = 0
      let added = 0
      for (const row of result.rows) {
        const key = row.name.trim().toLowerCase()
        const i = indexByName.get(key)
        if (i === undefined) {
          const fresh: Student = {
            id: uid(),
            name: row.name,
            pronouns: { preset: 'they', subject: 'they', object: 'them', possessive: 'their' },
            ratings: row.ratings,
            order: row.order,
            note: row.note,
          }
          students.push(fresh)
          indexByName.set(key, students.length - 1)
          added += 1
        } else {
          students[i] = {
            ...students[i],
            ratings: { ...students[i].ratings, ...row.ratings },
            order: row.order.length ? row.order : students[i].order,
            note: row.note.trim() ? row.note : students[i].note,
          }
          updated += 1
        }
      }
      updateClass((prev) => ({ ...prev, students }))
      const skipped = result.unknownColumns.length
        ? ` ${result.unknownColumns.length} column${result.unknownColumns.length === 1 ? '' : 's'} ignored: ${result.unknownColumns.join(', ')}.`
        : ''
      alert(`Updated ${updated} student${updated === 1 ? '' : 's'}, added ${added}.${skipped}`)
    } catch (err) {
      alert(`Could not read that file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const importBackup = async (file: File) => {
    try {
      const migrated = migrate(JSON.parse(await file.text()) as unknown)
      if (!migrated) throw new Error('not a Teacherer backup')
      if (!confirm('Replace everything currently in the app with this backup?')) return
      update(() => migrated)
    } catch (err) {
      alert(`Could not restore backup: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const wipe = () => {
    if (
      !confirm(
        'Erase all classes, students and comment bank changes from this device? Consider downloading a backup first.',
      )
    ) {
      return
    }
    clearState()
    update(() => freshStateFromSeed())
  }

  const addClass = (withBank: boolean) => {
    const name = prompt('Name for the new class (e.g. “P3 FM10”)')?.trim()
    if (!name) return
    const created = withBank ? emptyClass(name) : blankClass(name)
    update((prev) => ({ ...prev, classes: [...prev.classes, created], activeClassId: created.id }))
  }

  const duplicateClass = (source: Klass) => {
    const name = prompt('Name for the copy', `${source.name} (copy)`)?.trim()
    if (!name) return
    const copy: Klass = {
      id: uid(),
      name,
      categories: source.categories.map((c) => ({ ...c, levels: { ...c.levels } })),
      students: [],
    }
    update((prev) => ({ ...prev, classes: [...prev.classes, copy], activeClassId: copy.id }))
    alert(`Created ${name} with a copy of ${source.name}'s comment bank and an empty roster.`)
  }

  const renameClass = (id: string, name: string) => {
    update((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === id ? { ...c, name } : c)),
    }))
  }

  const deleteClass = (target: Klass) => {
    if (state.classes.length < 2) {
      alert('There has to be at least one class.')
      return
    }
    if (
      !confirm(`Delete ${target.name}, its ${target.students.length} student(s) and its comment bank?`)
    ) {
      return
    }
    update((prev) => {
      const classes = prev.classes.filter((c) => c.id !== target.id)
      return {
        ...prev,
        classes,
        activeClassId: prev.activeClassId === target.id ? classes[0].id : prev.activeClassId,
      }
    })
  }

  const totalStudents = state.classes.reduce((n, c) => n + c.students.length, 0)

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h2>Classes &amp; data</h2>
          <p className="hint">
            {state.classes.length} class{state.classes.length === 1 ? '' : 'es'}, {totalStudents}{' '}
            student{totalStudents === 1 ? '' : 's'} in total. Each class keeps its own roster and its
            own comment bank, the way each tab did in the spreadsheet.
          </p>
        </div>
        <Toolbar>
          <Button variant="primary" icon="plus" onClick={() => addClass(true)}>
            New class
          </Button>
          <Button
            icon="plus"
            onClick={() => addClass(false)}
            title="Start with no categories, ready to import a bank"
          >
            New class (blank bank)
          </Button>
        </Toolbar>
      </div>

      <div className="class-list">
        {state.classes.map((c) => (
          <div key={c.id} className="class-row" data-active={c.id === state.activeClassId}>
            <input
              type="text"
              aria-label="Class name"
              value={c.name}
              onChange={(e) => renameClass(c.id, e.target.value)}
            />
            <span className="class-row__meta">
              {c.students.length} student{c.students.length === 1 ? '' : 's'} · {c.categories.length}{' '}
              categories
            </span>
            <span className="class-row__actions">
              {c.id === state.activeClassId ? (
                <Badge tone="brand" dot>
                  current
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => update((prev) => ({ ...prev, activeClassId: c.id }))}
                >
                  Switch to
                </Button>
              )}
              <Button size="sm" icon="duplicate" onClick={() => duplicateClass(c)}>
                Duplicate bank
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon="trash"
                aria-label={`Delete ${c.name}`}
                onClick={() => deleteClass(c)}
              />
            </span>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section__head">
          <h3>Import into {klass.name}</h3>
        </div>
        <div className="data-grid">
          <Card>
            <h4 className="ui-card__title">Roster</h4>
            <p className="hint" style={{ margin: 'var(--space-1) 0 var(--space-3)' }}>
              Any sheet with a <strong>Name</strong> column and, optionally, a{' '}
              <strong>Pronouns</strong> column (she, he or they). The students are added to the class
              you are in.
            </p>
            <Button icon="upload" onClick={() => rosterInput.current?.click()}>
              Import roster (.xlsx / .csv)
            </Button>
            <input
              ref={rosterInput}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void importRoster(file)
              }}
            />
          </Card>

          <Card>
            <h4 className="ui-card__title">Ratings</h4>
            <p className="hint" style={{ margin: 'var(--space-1) 0 var(--space-3)' }}>
              The Ratings sheet this app exports, or any sheet whose headings match your category
              names. Values can be <code>3</code>, <code>3b</code> for an alternate wording, or{' '}
              <code>1,4</code> on a multi-pick category. Students are matched by name; unknown names
              are added.
            </p>
            <Button icon="upload" onClick={() => ratingsInput.current?.click()}>
              Import ratings (.xlsx / .csv)
            </Button>
            <input
              ref={ratingsInput}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void importRatings(file)
              }}
            />
          </Card>
        </div>
      </div>

      <div className="section">
        <div className="section__head">
          <h3>Backup</h3>
        </div>
        <div className="data-grid">
          <Card>
            <h4 className="ui-card__title">Move between devices</h4>
            <p className="hint" style={{ margin: 'var(--space-1) 0 var(--space-3)' }}>
              Everything lives only in this browser. A backup file is the only way across — download
              it on one device, restore it on the other. Restoring replaces everything currently in
              the app.
            </p>
            <Toolbar>
              <Button variant="primary" icon="download" onClick={() => exportJson(state)}>
                Download backup (.json)
              </Button>
              <Button icon="upload" onClick={() => jsonInput.current?.click()}>
                Restore backup…
              </Button>
            </Toolbar>
            <input
              ref={jsonInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void importBackup(file)
              }}
            />
          </Card>

          <Card className="danger-zone">
            <h4 className="ui-card__title">Erase local data</h4>
            <p className="hint" style={{ margin: 'var(--space-1) 0 var(--space-3)' }}>
              Removes every class, student and comment bank change from this device and starts again
              from the built-in template. There is no undo — download a backup first.
            </p>
            <Button variant="danger" icon="trash" onClick={wipe}>
              Erase all local data
            </Button>
          </Card>
        </div>
      </div>
    </>
  )
}
