import { useRef, useState } from 'react'
import type { AppState, Klass, Student } from '../types'
import { generateComment } from '../lib/generate'
import {
  exportCsv,
  exportJson,
  exportXlsx,
  parseRatingsFile,
  parseRosterFile,
} from '../lib/exportImport'
import { clearState, migrate } from '../lib/storage'
import { blankClass, emptyClass, freshStateFromSeed } from '../seedData'
import { copyText, uid } from '../lib/util'

interface Props {
  state: AppState
  update: (fn: (prev: AppState) => AppState) => void
  klass: Klass
  updateClass: (fn: (prev: Klass) => Klass) => void
}

export default function ReportsPanel({ state, update, klass, updateClass }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const rosterInput = useRef<HTMLInputElement>(null)
  const ratingsInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  const copyOne = (id: string, text: string) => {
    void copyText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500)
  }

  const copyAll = () => {
    const text = klass.students
      .map((st) => `${st.name || '(unnamed)'}\n${generateComment(klass.categories, st)}`)
      .join('\n\n')
    void copyText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  const importRoster = async (file: File) => {
    try {
      const students = await parseRosterFile(file)
      if (!students.length) {
        alert('No students found. The first sheet needs a header row with a “Name” (or “Student”) column.')
        return
      }
      updateClass((prev) => ({ ...prev, students: [...prev.students, ...students] }))
      alert(`Imported ${students.length} student${students.length === 1 ? '' : 's'} into ${klass.name}.`)
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
    if (!confirm('Erase all classes, students and comment bank changes from this device? Consider downloading a backup first.')) {
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
    update((prev) => ({ ...prev, classes: prev.classes.map((c) => (c.id === id ? { ...c, name } : c)) }))
  }

  const deleteClass = (target: Klass) => {
    if (state.classes.length < 2) {
      alert('There has to be at least one class.')
      return
    }
    if (!confirm(`Delete ${target.name}, its ${target.students.length} student(s) and its comment bank?`)) return
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
    <div>
      <h2>All comments · {klass.name}</h2>
      <div className="btn-row">
        <button className="btn primary" onClick={() => void exportXlsx(state)}>
          Download .xlsx (all classes)
        </button>
        <button className="btn" onClick={() => void exportCsv(state)}>
          Download .csv (this class)
        </button>
        <button className="btn" onClick={copyAll}>
          {copiedAll ? 'Copied ✓' : 'Copy all comments'}
        </button>
        <button className="btn" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className="report-list">
        {klass.students.length === 0 ? (
          <p className="hint">No students yet — add some on the Students tab.</p>
        ) : (
          klass.students.map((st) => {
            const comment = generateComment(klass.categories, st)
            return (
              <div key={st.id} className="report-card">
                <h4>
                  <span>{st.name || '(unnamed)'}</span>
                  <span className="report-tools">
                    <span className="muted">{comment.length} chars</span>
                    <button className="btn small" onClick={() => copyOne(st.id, comment)}>
                      {copiedId === st.id ? 'Copied ✓' : 'Copy'}
                    </button>
                  </span>
                </h4>
                {comment ? <p>{comment}</p> : <p className="none">No ratings selected yet.</p>}
              </div>
            )
          })
        )}
      </div>

      <h2>Classes</h2>
      <p className="hint">
        Each class keeps its own roster and its own comment bank, the way each tab did in the
        spreadsheet. {state.classes.length} class{state.classes.length === 1 ? '' : 'es'},{' '}
        {totalStudents} student{totalStudents === 1 ? '' : 's'} in total.
      </p>
      <div className="class-list">
        {state.classes.map((c) => (
          <div key={c.id} className={`class-row${c.id === state.activeClassId ? ' active' : ''}`}>
            <input
              type="text"
              aria-label="Class name"
              value={c.name}
              onChange={(e) => renameClass(c.id, e.target.value)}
            />
            <span className="muted">
              {c.students.length} student{c.students.length === 1 ? '' : 's'} · {c.categories.length} categories
            </span>
            <span className="class-actions">
              {c.id === state.activeClassId ? (
                <span className="chip-current">current</span>
              ) : (
                <button className="btn small" onClick={() => update((prev) => ({ ...prev, activeClassId: c.id }))}>
                  Switch to
                </button>
              )}
              <button className="btn small" onClick={() => duplicateClass(c)}>
                Duplicate bank
              </button>
              <button className="btn small danger" onClick={() => deleteClass(c)}>
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn primary" onClick={() => addClass(true)}>
          + New class
        </button>
        <button className="btn" onClick={() => addClass(false)} title="Start with no categories, ready to import a bank">
          + New class (blank bank)
        </button>
      </div>

      <h2>Import</h2>
      <p className="hint">
        <strong>Roster</strong> — a sheet with a <strong>Name</strong> column and, optionally,{' '}
        <strong>Pronouns</strong> (she, he, or they). <strong>Ratings</strong> — the Ratings sheet
        this app exports, or any sheet whose column headings match your category names; values can be{' '}
        <code>3</code>, <code>3b</code> for an alternate wording, or <code>1,4</code> for a
        multi-pick category. Students are matched by name; unknown names are added.
      </p>
      <div className="btn-row">
        <button className="btn" onClick={() => rosterInput.current?.click()}>
          Import roster (.xlsx / .csv)
        </button>
        <button className="btn" onClick={() => ratingsInput.current?.click()}>
          Import ratings (.xlsx / .csv)
        </button>
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
      </div>

      <h2>Backup</h2>
      <p className="hint">
        Everything lives only in this browser. Download a backup before clearing browser data or to
        move to another device.
      </p>
      <div className="btn-row">
        <button className="btn" onClick={() => jsonInput.current?.click()}>
          Restore backup (.json)
        </button>
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
        <button className="btn" onClick={() => exportJson(state)}>
          Download backup (.json)
        </button>
        <button className="btn danger" onClick={wipe}>
          Erase all local data
        </button>
      </div>
    </div>
  )
}
