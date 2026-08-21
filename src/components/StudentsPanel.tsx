import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import type { Category, Klass, Level, PickCode, PronounPreset, Student } from '../types'
import { LEVELS } from '../types'
import {
  categoryText,
  generateComment,
  orderedCategories,
  pickText,
  substitutePlaceholders,
} from '../lib/generate'
import { PRONOUN_PRESETS, isPresetKey } from '../lib/pronouns'
import {
  cycleVariant,
  isLevel,
  parsePick,
  pickForLevel,
  poolFor,
  setLevel,
  sortPicks,
  variantCount,
} from '../lib/ratings'
import { MOD_LABEL, mod } from '../lib/keys'
import { copyText } from '../lib/util'

export type Pane = 'roster' | 'editor'

interface Props {
  klass: Klass
  updateClass: (fn: (prev: Klass) => Klass) => void
  /** roster as shown: already filtered and sorted by the parent */
  students: Student[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  query: string
  setQuery: (q: string) => void
  sortAZ: boolean
  setSortAZ: (v: boolean) => void
  searchRef: RefObject<HTMLInputElement | null>
  pane: Pane
  setPane: (p: Pane) => void
  onAddStudent: () => void
  /** bumped when a student is added, so the name field takes focus */
  focusNameToken: number
}

/** Categories in bank order, split into their competency groups. */
function grouped(categories: Category[]): { group: string; cats: Category[] }[] {
  const out: { group: string; cats: Category[] }[] = []
  for (const cat of categories) {
    const last = out[out.length - 1]
    if (last && last.group === cat.group) last.cats.push(cat)
    else out.push({ group: cat.group, cats: [cat] })
  }
  return out
}

function levelLabel(cat: Category, lvl: Level): string {
  const label = cat.levelLabels?.[lvl]
  return label ? `${lvl} · ${label}` : `Level ${lvl}`
}

export default function StudentsPanel({
  klass,
  updateClass,
  students,
  selectedId,
  onSelect,
  query,
  setQuery,
  sortAZ,
  setSortAZ,
  searchRef,
  pane,
  setPane,
  onAddStudent,
  focusNameToken,
}: Props) {
  const [copied, setCopied] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const student = klass.students.find((s) => s.id === selectedId) ?? null

  // keep the selected roster row in view as the selection moves by keyboard
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  // a freshly added student lands with an empty name — put the cursor there
  useEffect(() => {
    if (focusNameToken > 0) nameRef.current?.focus()
  }, [focusNameToken])

  const patchStudent = (id: string, patch: (s: Student) => Student) => {
    updateClass((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === id ? patch(s) : s)) }))
  }

  const deleteStudent = () => {
    if (!student) return
    if (!confirm(`Remove ${student.name || 'this student'} and their ratings?`)) return
    updateClass((prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== student.id) }))
    setPane('roster')
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
    patchStudent(student.id, (s) => ({ ...s, pronouns: { ...s.pronouns, [part]: value } }))
  }

  const writePicks = (catId: string, picks: PickCode[]) => {
    if (!student) return
    patchStudent(student.id, (s) => {
      const ratings = { ...s.ratings }
      if (picks.length) ratings[catId] = picks
      else delete ratings[catId]
      return { ...s, ratings }
    })
  }

  const picksOf = (cat: Category): PickCode[] => (student ? (student.ratings[cat.id] ?? []) : [])

  /** The sentences this student's comment is built from, in stitching order. */
  const ordered = student ? orderedCategories(klass.categories, student) : []

  /** Writes the whole visible order, so later ratings just append at the end. */
  const moveOrderItem = (index: number, delta: number) => {
    if (!student) return
    const to = index + delta
    if (to < 0 || to >= ordered.length) return
    const ids = ordered.map((c) => c.id)
    ;[ids[index], ids[to]] = [ids[to], ids[index]]
    patchStudent(student.id, (s) => ({ ...s, order: ids }))
  }

  const resetOrder = () => {
    if (student) patchStudent(student.id, (s) => ({ ...s, order: [] }))
  }

  /** 1-4 sets a level, 0/backspace clears, "a" steps to the next phrasing. */
  const onRatingKeyDown = (e: ReactKeyboardEvent, cat: Category) => {
    const picks = picksOf(cat)
    if (isLevel(e.key)) {
      e.preventDefault()
      writePicks(cat.id, setLevel(cat, picks, e.key))
      return
    }
    if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      writePicks(cat.id, [])
      return
    }
    if (e.key.toLowerCase() === 'a' && picks.length) {
      const first = parsePick(sortPicks(picks)[0])
      if (first && variantCount(cat, first.level) > 1) {
        e.preventDefault()
        writePicks(cat.id, cycleVariant(cat, picks, first.level, e.shiftKey ? -1 : 1))
      }
    }
  }

  const onRosterKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const i = students.findIndex((s) => s.id === selectedId)
    const next =
      e.key === 'Home' ? 0
      : e.key === 'End' ? students.length - 1
      : Math.min(students.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))
    const target = students[next]
    if (target) onSelect(target.id)
  }

  const openStudent = (id: string) => {
    onSelect(id)
    setPane('editor')
  }

  const comment = student ? generateComment(klass.categories, student) : ''

  return (
    <div className="split" data-pane={pane}>
      <aside className="roster">
        <div className="roster-head">
          <h2>{klass.name}</h2>
          <button className="btn primary" onClick={onAddStudent} title="Add a student (n)">
            + Add
          </button>
        </div>
        <div className="roster-tools">
          <input
            ref={searchRef}
            type="search"
            className="roster-search"
            value={query}
            placeholder="Search students   /"
            aria-label="Search students"
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('')
                e.currentTarget.blur()
              }
              if (e.key === 'Enter' && students[0]) openStudent(students[0].id)
            }}
          />
          <button
            className={`btn small${sortAZ ? ' pressed' : ''}`}
            aria-pressed={sortAZ}
            title="Sort the roster A-Z"
            onClick={() => setSortAZ(!sortAZ)}
          >
            A-Z
          </button>
        </div>
        <ul
          className="student-list"
          ref={listRef}
          role="listbox"
          aria-label="Class roster"
          tabIndex={students.length ? 0 : -1}
          onKeyDown={onRosterKeyDown}
        >
          {students.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={s.id === selectedId}
              className={s.id === selectedId ? 'selected' : ''}
              onClick={() => openStudent(s.id)}
            >
              <span className="student-name">{s.name || '(unnamed)'}</span>
              <span className="badge">{s.pronouns.subject}</span>
            </li>
          ))}
          {!students.length && (
            <li className="roster-empty" aria-disabled="true">
              {klass.students.length ? 'No student matches that search.' : 'No students yet.'}
            </li>
          )}
        </ul>
        <p className="hint roster-count">
          {klass.students.length} student{klass.students.length === 1 ? '' : 's'}
          {query.trim() && ` · ${students.length} shown`}
        </p>
      </aside>

      <div className="student-editor">
        {!student ? (
          <p className="empty-note">Add or select a student to begin.</p>
        ) : (
          <div>
            <button className="btn back-to-roster" onClick={() => setPane('roster')}>
              ‹ All students
            </button>

            <div className="field-row">
              <label className="field grow">
                <span>Student name</span>
                <input
                  ref={nameRef}
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
            </div>

            {student.pronouns.preset === 'custom' && (
              <div className="field-row">
                <label className="field grow">
                  <span>subject (she)</span>
                  <input
                    type="text"
                    value={student.pronouns.subject}
                    onChange={(e) => setPronounPart('subject', e.target.value)}
                  />
                </label>
                <label className="field grow">
                  <span>object (her)</span>
                  <input
                    type="text"
                    value={student.pronouns.object}
                    onChange={(e) => setPronounPart('object', e.target.value)}
                  />
                </label>
                <label className="field grow">
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
              Pick a level for each category you want in this comment. Categories marked ✎ are
              switched off in the Comment Bank and stay out of the final text. With a rating focused,
              type <kbd>1</kbd>–<kbd>4</kbd> to set it, <kbd>0</kbd> to clear, <kbd>a</kbd> for the
              next wording.
            </p>

            {grouped(klass.categories).map(({ group, cats }) => (
              <div key={group || 'ungrouped'} className="rating-group">
                {group && <h4 className="group-head">{group}</h4>}
                <div className="rating-grid">
                  {cats.map((cat) => {
                    const picks = picksOf(cat)
                    const chosen = sortPicks(picks)
                    const first = chosen.length ? parsePick(chosen[0]) : null
                    const showVariants = !!first && variantCount(cat, first.level) > 1
                    return (
                      <div
                        key={cat.id}
                        className={`rating-cell${cat.include ? '' : ' excluded'}`}
                        onKeyDown={(e) => onRatingKeyDown(e, cat)}
                      >
                        <span className="cat-name">
                          {cat.include ? '' : '✎ '}
                          {cat.name}
                        </span>

                        {cat.multi ? (
                          <div className="level-toggles" role="group" aria-label={cat.name}>
                            {LEVELS.map((lvl) => {
                              const on = !!pickForLevel(picks, lvl)
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  className={`lvl-toggle${on ? ' on' : ''}`}
                                  aria-pressed={on}
                                  title={poolFor(cat, lvl)[0]}
                                  onClick={() => writePicks(cat.id, setLevel(cat, picks, lvl))}
                                >
                                  {cat.levelLabels?.[lvl] ?? lvl}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <select
                            aria-label={cat.name}
                            value={first ? first.level : ''}
                            onChange={(e) =>
                              writePicks(cat.id, setLevel(cat, picks, isLevel(e.target.value) ? e.target.value : null))
                            }
                          >
                            <option value="">—</option>
                            {LEVELS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {levelLabel(cat, lvl)}
                              </option>
                            ))}
                          </select>
                        )}

                        {showVariants && first && (
                          <button
                            type="button"
                            className="btn small variant-btn"
                            title={pickText(cat, chosen[0])}
                            onClick={() => writePicks(cat.id, cycleVariant(cat, picks, first.level))}
                          >
                            wording {first.variant + 1}/{variantCount(cat, first.level)}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <h3>
              Order <span className="muted">(this student only)</span>
            </h3>
            {ordered.length < 2 ? (
              <p className="hint">
                Rate two or more categories and you can reorder their sentences here, just for this
                student. The Comment Bank&apos;s top-to-bottom order is the class default.
              </p>
            ) : (
              <>
                <p className="hint">
                  Move a sentence with the arrows, or <kbd>{MOD_LABEL}</kbd> + <kbd>↑</kbd>/
                  <kbd>↓</kbd> while one is focused. The personal note always goes last.
                </p>
                <ol className="order-list">
                  {ordered.map((cat, i) => (
                    <li
                      key={cat.id}
                      className="order-row"
                      onKeyDown={(e) => {
                        if (!mod(e)) return
                        if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          moveOrderItem(i, -1)
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          moveOrderItem(i, 1)
                        }
                      }}
                    >
                      <span className="order-index">{i + 1}</span>
                      <span className="order-text">
                        <b>{cat.name}</b>{' '}
                        <span className="muted">
                          {substitutePlaceholders(categoryText(cat, picksOf(cat)), student)}
                        </span>
                      </span>
                      <span className="order-move">
                        <button
                          className="btn small"
                          disabled={i === 0}
                          aria-label={`Move ${cat.name} earlier`}
                          onClick={() => moveOrderItem(i, -1)}
                        >
                          ↑
                        </button>
                        <button
                          className="btn small"
                          disabled={i === ordered.length - 1}
                          aria-label={`Move ${cat.name} later`}
                          onClick={() => moveOrderItem(i, 1)}
                        >
                          ↓
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>
                {student.order.length > 0 && (
                  <div className="btn-row">
                    <button className="btn small subtle" onClick={resetOrder}>
                      Reset to bank order
                    </button>
                  </div>
                )}
              </>
            )}

            <h3>
              Personal note <span className="muted">(optional, appended verbatim)</span>
            </h3>
            <textarea
              rows={3}
              value={student.note}
              placeholder="Anything specific to this student. Placeholders like [Student] and [he/she/they] work here too."
              onChange={(e) => patchStudent(student.id, (s) => ({ ...s, note: e.target.value }))}
            />

            <h3>
              Generated comment <span className="muted">{comment.length} characters</span>
            </h3>
            <div className="preview">{comment}</div>
            <div className="btn-row">
              <button
                className="btn primary"
                onClick={() => {
                  void copyText(comment)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? 'Copied ✓' : 'Copy comment'}
              </button>
              <button className="btn danger" onClick={deleteStudent}>
                Delete student
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
