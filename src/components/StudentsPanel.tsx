import { useState } from 'react'
import type { AppState, Level, PronounPreset, Student } from '../types'
import { LEVELS } from '../types'
import { generateComment } from '../lib/generate'
import { PRONOUN_PRESETS, isPresetKey, makeStudent } from '../lib/pronouns'
import { copyText } from '../lib/util'

interface Props {
  state: AppState
  update: (fn: (prev: AppState) => AppState) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function StudentsPanel({ state, update, selectedId, onSelect }: Props) {
  const [copied, setCopied] = useState(false)
  const student = state.students.find((s) => s.id === selectedId) ?? null

  const patchStudent = (id: string, patch: (s: Student) => Student) => {
    update((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === id ? patch(s) : s)),
    }))
  }

  const addStudent = () => {
    const st = makeStudent('', 'they')
    update((prev) => ({ ...prev, students: [...prev.students, st] }))
    onSelect(st.id)
  }

  const deleteStudent = () => {
    if (!student) return
    if (!confirm(`Remove ${student.name || 'this student'} and their ratings?`)) return
    update((prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== student.id) }))
  }

  const setPreset = (preset: string) => {
    if (!student) return
    patchStudent(student.id, (s) => ({
      ...s,
      pronouns: isPresetKey(preset)
        ? { preset, ...PRONOUN_PRESETS[preset] }
        : { ...s.pronouns, preset: 'custom' as PronounPreset },
    }))
  }

  const setPronounPart = (part: 'subject' | 'object' | 'possessive', value: string) => {
    if (!student) return
    patchStudent(student.id, (s) => ({
      ...s,
      pronouns: { ...s.pronouns, [part]: value },
    }))
  }

  const setRating = (catId: string, lvl: string) => {
    if (!student) return
    patchStudent(student.id, (s) => {
      const ratings = { ...s.ratings }
      if (lvl) ratings[catId] = lvl as Level
      else delete ratings[catId]
      return { ...s, ratings }
    })
  }

  const comment = student ? generateComment(state.categories, student) : ''

  return (
    <div className="split">
      <aside className="roster">
        <div className="roster-head">
          <h2>Class roster</h2>
          <button className="btn primary" onClick={addStudent} title="Add a student">
            + Add
          </button>
        </div>
        <ul className="student-list">
          {state.students.map((s) => (
            <li
              key={s.id}
              className={s.id === selectedId ? 'selected' : ''}
              onClick={() => onSelect(s.id)}
            >
              <span>{s.name || '(unnamed)'}</span>
              <span className="badge">{s.pronouns.subject}</span>
            </li>
          ))}
        </ul>
        <p className="hint">
          Tip: import a roster from a spreadsheet in <em>Reports &amp; Export</em>.
        </p>
      </aside>

      <div className="student-editor">
        {!student ? (
          <p className="empty-note">Add or select a student to begin.</p>
        ) : (
          <div>
            <div className="field-row">
              <label className="field grow">
                <span>Student name</span>
                <input
                  type="text"
                  value={student.name}
                  placeholder="e.g. Jordan"
                  autoComplete="off"
                  onChange={(e) => patchStudent(student.id, (s) => ({ ...s, name: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Pronouns</span>
                <select value={student.pronouns.preset} onChange={(e) => setPreset(e.target.value)}>
                  <option value="she">she / her / her</option>
                  <option value="he">he / him / his</option>
                  <option value="they">they / them / their</option>
                  <option value="custom">custom…</option>
                </select>
              </label>
              <button className="btn danger" onClick={deleteStudent} title="Remove this student">
                Delete
              </button>
            </div>

            {student.pronouns.preset === 'custom' && (
              <div className="field-row">
                <label className="field">
                  <span>subject (she)</span>
                  <input
                    type="text"
                    value={student.pronouns.subject}
                    onChange={(e) => setPronounPart('subject', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>object (her)</span>
                  <input
                    type="text"
                    value={student.pronouns.object}
                    onChange={(e) => setPronounPart('object', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>possessive (her)</span>
                  <input
                    type="text"
                    value={student.pronouns.possessive}
                    onChange={(e) => setPronounPart('possessive', e.target.value)}
                  />
                </label>
              </div>
            )}

            <h3>Ratings</h3>
            <p className="hint">
              Pick a level for each category you want in this student's comment. Leave a category on
              “—” to skip it. Categories marked ✎ are unchecked in the Comment Bank and won't appear
              in the final comment unless enabled there.
            </p>
            <div className="rating-grid">
              {state.categories.map((cat) => (
                <div key={cat.id} className={`rating-cell${cat.include ? '' : ' excluded'}`}>
                  <span className="cat-name">
                    {cat.include ? '' : '✎ '}
                    {cat.name}
                  </span>
                  <select
                    value={student.ratings[cat.id] ?? ''}
                    onChange={(e) => setRating(cat.id, e.target.value)}
                  >
                    <option value="">—</option>
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {cat.levelLabels?.[lvl] ? `${lvl} · ${cat.levelLabels[lvl]}` : `Level ${lvl}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <h3>
              Personal note <span className="muted">(optional, appended verbatim)</span>
            </h3>
            <textarea
              rows={2}
              value={student.note}
              placeholder="Anything specific to this student. Placeholders like [Student] and [he/she/they] work here too."
              onChange={(e) => patchStudent(student.id, (s) => ({ ...s, note: e.target.value }))}
            />

            <h3>Generated comment</h3>
            <div className="preview">{comment}</div>
            <div className="btn-row">
              <button
                className="btn"
                onClick={() => {
                  void copyText(comment)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                Copy comment
              </button>
              {copied && <span className="copy-confirm">Copied ✓</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
