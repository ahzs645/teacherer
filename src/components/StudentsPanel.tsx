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
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldRow,
  Icon,
  Toolbar,
  ToolbarSpacer,
} from './ui'

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

/** Up to two letters for the roster avatar; a dash while the name is blank. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '–'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return parts[0][0] + parts[parts.length - 1][0]
}

/** How much of this student's comment exists yet, 0-1. */
function completion(categories: Category[], student: Student): number {
  const counted = categories.filter((c) => c.include)
  if (!counted.length) return 0
  const done = counted.filter((c) => (student.ratings[c.id]?.length ?? 0) > 0).length
  return done / counted.length
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
    updateClass((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === id ? patch(s) : s)),
    }))
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

  /**
   * Clicking a level sets it; clicking the level that is already on clears it.
   * Multi-pick categories toggle each level independently, which setLevel
   * already does — this only adds the same affordance to single-pick ones.
   */
  const toggleLevel = (cat: Category, lvl: Level) => {
    const picks = picksOf(cat)
    if (!cat.multi && pickForLevel(picks, lvl)) writePicks(cat.id, [])
    else writePicks(cat.id, setLevel(cat, picks, lvl))
  }

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
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? students.length - 1
          : Math.min(students.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))
    const target = students[next]
    if (target) onSelect(target.id)
  }

  const openStudent = (id: string) => {
    onSelect(id)
    setPane('editor')
  }

  const comment = student ? generateComment(klass.categories, student) : ''

  const preview = (
    <Card className="preview-card">
      <Toolbar>
        <span className="eyebrow">Generated comment</span>
        <ToolbarSpacer />
        <span className="muted tabular" style={{ fontSize: 'var(--text-xs)' }}>
          {comment.length} characters
        </span>
      </Toolbar>
      <div className="preview">{comment}</div>
      <Toolbar>
        <Button
          variant="primary"
          icon={copied ? 'check' : 'copy'}
          onClick={() => {
            void copyText(comment)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? 'Copied' : 'Copy comment'}
        </Button>
        <span className="muted section--keys" style={{ fontSize: 'var(--text-xs)' }}>
          <kbd>{MOD_LABEL}</kbd> <kbd>⇧</kbd> <kbd>C</kbd>
        </span>
      </Toolbar>
    </Card>
  )

  return (
    <div className="students" data-pane={pane}>
      <aside className="roster">
        <div className="roster__head">
          <div className="roster__title">
            <h2 className="truncate" title={klass.name}>
              Roster
            </h2>
            <Button variant="primary" size="sm" icon="plus" onClick={onAddStudent} title="Add a student (n)">
              Add
            </Button>
          </div>
          <div className="roster__tools">
            <span className="roster__search">
              <Icon name="search" size="0.95rem" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                placeholder="Search   /"
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
            </span>
            <Button
              size="sm"
              aria-pressed={sortAZ}
              title="Sort the roster A-Z"
              onClick={() => setSortAZ(!sortAZ)}
            >
              A-Z
            </Button>
          </div>
        </div>

        <ul
          className="roster__list"
          ref={listRef}
          role="listbox"
          aria-label="Class roster"
          tabIndex={students.length ? 0 : -1}
          onKeyDown={onRosterKeyDown}
        >
          {students.map((s) => {
            const done = completion(klass.categories, s)
            return (
              <li
                key={s.id}
                role="option"
                aria-selected={s.id === selectedId}
                className="roster-row"
                data-complete={done >= 1 ? 'true' : undefined}
                onClick={() => openStudent(s.id)}
              >
                <span className="roster-row__avatar" aria-hidden="true">
                  {initials(s.name)}
                </span>
                <span className="roster-row__body">
                  <span className="roster-row__name" data-unnamed={s.name.trim() ? undefined : 'true'}>
                    {s.name || 'Unnamed student'}
                  </span>
                  <span className="roster-row__meta">{s.pronouns.subject}</span>
                </span>
                <span
                  className="roster-row__progress"
                  title={`${Math.round(done * 100)}% of the comment bank rated`}
                >
                  <i style={{ width: `${Math.round(done * 100)}%` }} />
                </span>
              </li>
            )
          })}
          {!students.length && (
            <li role="presentation" className="hint" style={{ padding: 'var(--space-3)' }}>
              {klass.students.length ? 'No student matches that search.' : 'No students yet.'}
            </li>
          )}
        </ul>

        <div className="roster__foot">
          <span>
            {klass.students.length} student{klass.students.length === 1 ? '' : 's'}
          </span>
          {query.trim() && <span>{students.length} shown</span>}
        </div>
      </aside>

      <div className="editor">
        {!student ? (
          <Card padding="none">
            <EmptyState
              icon="students"
              title="No student selected"
              actions={
                <Button variant="primary" icon="plus" onClick={onAddStudent}>
                  Add a student
                </Button>
              }
            >
              Pick someone from the roster, or add your first student.
              <span className="section--keys">
                {' '}
                Press <kbd>n</kbd> anywhere to start a new one.
              </span>
            </EmptyState>
          </Card>
        ) : (
          <>
            <div className="editor__head">
              <Button
                className="back-to-roster"
                variant="ghost"
                size="sm"
                icon="chevronLeft"
                onClick={() => setPane('roster')}
              >
                All students
              </Button>
              <h2 className="truncate">{student.name || 'Unnamed student'}</h2>
              <Toolbar>
                <Button variant="danger" size="sm" icon="trash" onClick={deleteStudent}>
                  Delete
                </Button>
              </Toolbar>
            </div>

            <div className="editor__cols">
              <div className="stack">
                <Card>
                  <FieldRow>
                    <Field label="Student name" grow>
                      <input
                        ref={nameRef}
                        type="text"
                        value={student.name}
                        placeholder="e.g. Jordan"
                        autoComplete="off"
                        onChange={(e) =>
                          patchStudent(student.id, (s) => ({ ...s, name: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Pronouns">
                      <select
                        value={student.pronouns.preset}
                        onChange={(e) => setPreset(e.target.value)}
                      >
                        <option value="she">she / her / her</option>
                        <option value="he">he / him / his</option>
                        <option value="they">they / them / their</option>
                        <option value="custom">custom…</option>
                      </select>
                    </Field>
                  </FieldRow>

                  {student.pronouns.preset === 'custom' && (
                    <FieldRow>
                      <Field label="subject (she)" grow>
                        <input
                          type="text"
                          value={student.pronouns.subject}
                          onChange={(e) => setPronounPart('subject', e.target.value)}
                        />
                      </Field>
                      <Field label="object (her)" grow>
                        <input
                          type="text"
                          value={student.pronouns.object}
                          onChange={(e) => setPronounPart('object', e.target.value)}
                        />
                      </Field>
                      <Field label="possessive (her)" grow>
                        <input
                          type="text"
                          value={student.pronouns.possessive}
                          onChange={(e) => setPronounPart('possessive', e.target.value)}
                        />
                      </Field>
                    </FieldRow>
                  )}
                </Card>

                <Card>
                  <div className="section__head">
                    <h3>Ratings</h3>
                    <span className="hint section--keys" style={{ fontSize: 'var(--text-xs)' }}>
                      <kbd>1</kbd>–<kbd>4</kbd> set · <kbd>0</kbd> clear · <kbd>a</kbd> next wording
                    </span>
                  </div>

                  {!klass.categories.length ? (
                    <EmptyState icon="bank" title="This class has no categories yet">
                      Add a few on the Comment bank tab, or import a bank someone shared with you.
                    </EmptyState>
                  ) : (
                    grouped(klass.categories).map(({ group, cats }) => (
                      <div key={group || 'ungrouped'} className="rating-group">
                        {group && (
                          <div className="rating-group__head">
                            <span className="eyebrow">{group}</span>
                          </div>
                        )}
                        <div className="rating-grid">
                          {cats.map((cat) => {
                            const picks = picksOf(cat)
                            const chosen = sortPicks(picks)
                            const first = chosen.length ? parsePick(chosen[0]) : null
                            const showVariants = !!first && variantCount(cat, first.level) > 1
                            const say = substitutePlaceholders(
                              categoryText(cat, picks),
                              student,
                            )
                            return (
                              <div
                                key={cat.id}
                                className="rating-cell"
                                data-rated={picks.length ? 'true' : undefined}
                                data-excluded={cat.include ? undefined : 'true'}
                                onKeyDown={(e) => onRatingKeyDown(e, cat)}
                              >
                                <div className="rating-cell__head">
                                  {!cat.include && (
                                    <Badge tone="outline" title="Switched off in the Comment bank">
                                      off
                                    </Badge>
                                  )}
                                  <span className="rating-cell__name" title={cat.name}>
                                    {cat.name}
                                  </span>
                                  {cat.multi && (
                                    <Badge tone="neutral" title="More than one level can be chosen here">
                                      multi
                                    </Badge>
                                  )}
                                </div>

                                <div className="level-toggles" role="group" aria-label={cat.name}>
                                  {LEVELS.map((lvl) => {
                                    const on = !!pickForLevel(picks, lvl)
                                    return (
                                      <button
                                        key={lvl}
                                        type="button"
                                        className="lvl-toggle"
                                        data-level={lvl}
                                        aria-pressed={on}
                                        title={poolFor(cat, lvl)[0] || levelLabel(cat, lvl)}
                                        onClick={() => toggleLevel(cat, lvl)}
                                      >
                                        {cat.levelLabels?.[lvl] ?? lvl}
                                      </button>
                                    )
                                  })}
                                </div>

                                {say && <p className="rating-cell__say">{say}</p>}

                                {(showVariants || picks.length > 0) && (
                                  <div className="rating-cell__foot">
                                    {showVariants && first && (
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        icon="shuffle"
                                        title={pickText(cat, chosen[0])}
                                        onClick={() =>
                                          writePicks(cat.id, cycleVariant(cat, picks, first.level))
                                        }
                                      >
                                        wording {first.variant + 1}/{variantCount(cat, first.level)}
                                      </Button>
                                    )}
                                    {picks.length > 0 && (
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        icon="close"
                                        title={`Clear ${cat.name}`}
                                        aria-label={`Clear ${cat.name}`}
                                        onClick={() => writePicks(cat.id, [])}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </Card>

                <Card>
                  <div className="section__head">
                    <h3>
                      Sentence order <span className="muted">this student only</span>
                    </h3>
                    {student.order.length > 0 && (
                      <Button size="xs" variant="ghost" onClick={resetOrder}>
                        Reset to bank order
                      </Button>
                    )}
                  </div>
                  {ordered.length < 2 ? (
                    <p className="hint">
                      Rate two or more categories and you can reorder their sentences here, just for
                      this student. The Comment bank&apos;s top-to-bottom order is the class default.
                    </p>
                  ) : (
                    <>
                      <p className="hint" style={{ marginBottom: 'var(--space-3)' }}>
                        Move a sentence with the arrows
                        <span className="section--keys">
                          , or <kbd>{MOD_LABEL}</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> while one is
                          focused
                        </span>
                        . The personal note always goes last.
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
                              <b>{cat.name}</b>
                              <span>
                                {substitutePlaceholders(categoryText(cat, picksOf(cat)), student)}
                              </span>
                            </span>
                            <span className="order-move">
                              <Button
                                size="xs"
                                icon="arrowUp"
                                disabled={i === 0}
                                aria-label={`Move ${cat.name} earlier`}
                                onClick={() => moveOrderItem(i, -1)}
                              />
                              <Button
                                size="xs"
                                icon="arrowDown"
                                disabled={i === ordered.length - 1}
                                aria-label={`Move ${cat.name} later`}
                                onClick={() => moveOrderItem(i, 1)}
                              />
                            </span>
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </Card>

                <Card>
                  <div className="section__head">
                    <h3>
                      Personal note <span className="muted">appended verbatim</span>
                    </h3>
                  </div>
                  <textarea
                    rows={3}
                    value={student.note}
                    placeholder="Anything specific to this student. Placeholders like [Student] and [he/she/they] work here too."
                    onChange={(e) =>
                      patchStudent(student.id, (s) => ({ ...s, note: e.target.value }))
                    }
                  />
                </Card>
              </div>

              <div className="editor__aside">{preview}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
