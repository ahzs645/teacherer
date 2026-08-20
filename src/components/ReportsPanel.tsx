import { useRef, useState } from 'react'
import type { AppState } from '../types'
import { generateComment } from '../lib/generate'
import { exportCsv, exportJson, exportXlsx, parseRosterFile } from '../lib/exportImport'
import { clearState, isAppState } from '../lib/storage'
import { freshStateFromSeed } from '../seedData'
import { copyText } from '../lib/util'

interface Props {
  state: AppState
  update: (fn: (prev: AppState) => AppState) => void
}

export default function ReportsPanel({ state, update }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const rosterInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)

  const copyOne = (id: string, text: string) => {
    void copyText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500)
  }

  const copyAll = () => {
    const text = state.students
      .map((st) => `${st.name || '(unnamed)'}\n${generateComment(state.categories, st)}`)
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
      update((prev) => ({ ...prev, students: [...prev.students, ...students] }))
      alert(`Imported ${students.length} student${students.length === 1 ? '' : 's'}.`)
    } catch (err) {
      alert(`Could not read that file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const importBackup = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isAppState(parsed)) throw new Error('not a Teacherer backup')
      if (!confirm('Replace everything currently in the app with this backup?')) return
      update(() => parsed)
    } catch (err) {
      alert(`Could not restore backup: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const wipe = () => {
    if (!confirm('Erase all students and comment bank changes from this device? Consider downloading a backup first.')) {
      return
    }
    clearState()
    update(() => freshStateFromSeed())
  }

  return (
    <div>
      <h2>All comments</h2>
      <div className="btn-row">
        <button className="btn primary" onClick={() => void exportXlsx(state)}>
          Download .xlsx
        </button>
        <button className="btn" onClick={() => void exportCsv(state)}>
          Download .csv
        </button>
        <button className="btn" onClick={copyAll}>
          {copiedAll ? 'Copied ✓' : 'Copy all comments'}
        </button>
        <button className="btn" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className="report-list">
        {state.students.length === 0 ? (
          <p className="hint">No students yet — add some on the Students tab.</p>
        ) : (
          state.students.map((st) => {
            const comment = generateComment(state.categories, st)
            return (
              <div key={st.id} className="report-card">
                <h4>
                  <span>{st.name || '(unnamed)'}</span>
                  <button className="btn" onClick={() => copyOne(st.id, comment)}>
                    {copiedId === st.id ? 'Copied ✓' : 'Copy'}
                  </button>
                </h4>
                {comment ? <p>{comment}</p> : <p className="none">No ratings selected yet.</p>}
              </div>
            )
          })
        )}
      </div>

      <h2>Import</h2>
      <p className="hint">
        Import a class roster from a spreadsheet (.xlsx or .csv). The first sheet should have a
        header row with a <strong>Name</strong> column and, optionally, a <strong>Pronouns</strong>{' '}
        column (she, he, or they).
      </p>
      <div className="btn-row">
        <button className="btn" onClick={() => rosterInput.current?.click()}>
          Import roster (.xlsx / .csv)
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
