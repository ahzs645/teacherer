import { useEffect, useRef, useState } from 'react'
import type {
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { Category, Klass, PickCode, Student } from '../types'
import { LEVELS } from '../types'
import { pickText } from '../lib/generate'
import { MOD_LABEL, mod } from '../lib/keys'
import {
  cycleVariant,
  formatCell,
  isLevel,
  parseCell,
  parsePick,
  setLevel,
  sortPicks,
  variantCount,
} from '../lib/ratings'

interface Props {
  klass: Klass
  updateClass: (fn: (prev: Klass) => Klass) => void
  /** students to show, already filtered and sorted by the parent */
  students: Student[]
  /** jump to the Students tab focused on this student */
  onOpenStudent: (id: string) => void
}

/** One cell to write: which student, which column, what to store there. */
interface CellEdit {
  studentId: string
  catId: string
  codes: PickCode[]
}

interface Spot {
  row: number
  col: number
}

/** How far PageUp / PageDown jump. */
const PAGE = 10

function clamp(n: number, max: number): number {
  return Math.min(Math.max(n, 0), Math.max(max, 0))
}

/** Where a movement key lands, or null when it is not a movement key. */
function moveTarget(
  key: string,
  toEnds: boolean,
  at: Spot,
  lastRow: number,
  lastCol: number,
): Spot | null {
  switch (key) {
    case 'ArrowUp':
      return { row: at.row - 1, col: at.col }
    case 'ArrowDown':
      return { row: at.row + 1, col: at.col }
    case 'ArrowLeft':
      return { row: at.row, col: at.col - 1 }
    case 'ArrowRight':
      return { row: at.row, col: at.col + 1 }
    case 'PageUp':
      return { row: at.row - PAGE, col: at.col }
    case 'PageDown':
      return { row: at.row + PAGE, col: at.col }
    case 'Home':
      return toEnds ? { row: 0, col: 0 } : { row: at.row, col: 0 }
    case 'End':
      return toEnds ? { row: lastRow, col: lastCol } : { row: at.row, col: lastCol }
    default:
      return null
  }
}

/** Column head tooltip: the full name, its level labels, how the column behaves. */
function headTitle(cat: Category): string {
  const lines = [cat.group ? `${cat.group} · ${cat.name}` : cat.name]
  for (const lvl of LEVELS) {
    const label = cat.levelLabels?.[lvl]
    if (label) lines.push(`${lvl} = ${label}`)
  }
  if (cat.multi) lines.push('More than one level can be chosen here.')
  if (!cat.include) lines.push('Switched off in the Comment Bank: stays out of the comment.')
  return lines.join('\n')
}

/** Cell tooltip: what this rating will actually say in the comment. */
function cellTitle(cat: Category, picks: PickCode[]): string {
  if (!picks.length) return `${cat.name} · not rated`
  const said = sortPicks(picks).map(
    (code) => `${code} · ${pickText(cat, code) || '(no wording written yet)'}`,
  )
  return [cat.name, ...said].join('\n')
}

export default function GridPanel({ klass, updateClass, students, onOpenStudent }: Props) {
  const [focus, setFocus] = useState<Spot>({ row: 0, col: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)

  const lastRow = students.length - 1
  const lastCol = klass.categories.length - 1
  // the roster is filtered and the bank is edited under us: never point off the grid
  const row = clamp(focus.row, lastRow)
  const col = clamp(focus.col, lastCol)

  // follow the focused cell with real DOM focus, but only once the grid already
  // holds the focus — never steal it on first paint or from another panel
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const active = document.activeElement
    if (!active || !wrap.contains(active)) return
    const cell = wrap.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`)
    if (cell && cell !== active) cell.focus()
  }, [row, col])

  const goTo = (r: number, c: number) => {
    const next = { row: clamp(r, lastRow), col: clamp(c, lastCol) }
    setFocus((prev) => (prev.row === next.row && prev.col === next.col ? prev : next))
  }

  /** Write a batch of cells in one pass, so filling a column is a single update. */
  const applyEdits = (edits: CellEdit[]) => {
    if (!edits.length) return
    const byStudent = new Map<string, CellEdit[]>()
    for (const edit of edits) {
      const list = byStudent.get(edit.studentId)
      if (list) list.push(edit)
      else byStudent.set(edit.studentId, [edit])
    }
    updateClass((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        const mine = byStudent.get(s.id)
        if (!mine) return s
        const ratings = { ...s.ratings }
        for (const edit of mine) {
          if (edit.codes.length) ratings[edit.catId] = edit.codes
          else delete ratings[edit.catId]
        }
        return { ...s, ratings }
      }),
    }))
  }

  const picksAt = (r: number, c: number): PickCode[] => {
    const student = students[r]
    const cat = klass.categories[c]
    if (!student || !cat) return []
    return student.ratings[cat.id] ?? []
  }

  const writeCell = (r: number, c: number, codes: PickCode[]) => {
    const student = students[r]
    const cat = klass.categories[c]
    if (!student || !cat) return
    applyEdits([{ studentId: student.id, catId: cat.id, codes }])
  }

  /** Mod+D: take whatever the student above has in this column. */
  const copyFromAbove = (r: number, c: number) => {
    if (r < 1) return
    writeCell(r, c, [...picksAt(r - 1, c)])
  }

  /** Mod+Shift+D: push this cell into every student below it. */
  const fillDown = (r: number, c: number) => {
    const cat = klass.categories[c]
    if (!cat) return
    const codes = picksAt(r, c)
    applyEdits(
      students.slice(r + 1).map((s) => ({ studentId: s.id, catId: cat.id, codes: [...codes] })),
    )
  }

  /** "a" walks the phrasing pool of the lowest level picked in the cell. */
  const cyclePhrasing = (r: number, c: number, step: number) => {
    const cat = klass.categories[c]
    const codes = picksAt(r, c)
    if (!cat || !codes.length) return
    const first = parsePick(sortPicks(codes)[0])
    if (!first || variantCount(cat, first.level) < 2) return
    writeCell(r, c, cycleVariant(cat, codes, first.level, step))
  }

  const onCellKeyDown = (e: ReactKeyboardEvent<HTMLTableCellElement>, r: number, c: number) => {
    const student = students[r]
    const cat = klass.categories[c]
    if (!student || !cat) return
    const withMod = mod(e)

    const target = moveTarget(e.key, withMod, { row: r, col: c }, lastRow, lastCol)
    if (target) {
      e.preventDefault()
      goTo(target.row, target.col)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      onOpenStudent(student.id)
      return
    }

    if (withMod && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()
      if (e.shiftKey) fillDown(r, c)
      else copyFromAbove(r, c)
      return
    }

    // anything else held with a modifier belongs to the browser
    if (withMod || e.altKey) return

    if (isLevel(e.key)) {
      e.preventDefault()
      writeCell(r, c, setLevel(cat, picksAt(r, c), e.key))
      // one column at a time is the fast way in, so drop to the next student —
      // except where several levels can be stacked in the same cell
      if (!cat.multi) goTo(r + 1, c)
      return
    }

    if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      writeCell(r, c, setLevel(cat, picksAt(r, c), null))
      return
    }

    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault()
      cyclePhrasing(r, c, e.shiftKey ? -1 : 1)
    }
  }

  /** A column (or a block) copied out of a gradebook, dropped in from the focused cell. */
  const onPaste = (e: ReactClipboardEvent<HTMLDivElement>) => {
    if (!students.length || !klass.categories.length) return
    const lines = e.clipboardData
      .getData('text')
      .split(/\r\n|\r|\n/)
      .filter((line) => line.trim() !== '')
    if (!lines.length) return

    const edits: CellEdit[] = []
    lines.forEach((line, down) => {
      const student = students[row + down]
      if (!student) return
      // tabs mean the clipboard holds whole rows, so spread them across columns
      line.split('\t').forEach((field, across) => {
        const cat = klass.categories[col + across]
        if (!cat) return
        edits.push({ studentId: student.id, catId: cat.id, codes: parseCell(field, cat.multi) })
      })
    })
    if (!edits.length) return
    e.preventDefault()
    applyEdits(edits)
  }

  if (!klass.categories.length) {
    return (
      <p className="empty-note">
        The comment bank for this class is empty. Add a category or two on the Comment Bank tab and
        each one becomes a column here.
      </p>
    )
  }

  if (!students.length) {
    return (
      <p className="empty-note">
        No students to show. Add them on the Students tab — or clear the search if you are filtering
        the roster.
      </p>
    )
  }

  return (
    <>
      <p className="hint grid-legend">
        Click a cell, then type <kbd>1</kbd>–<kbd>4</kbd> to set the level; on single-choice columns
        the grid drops to the next student. <kbd>0</kbd> clears a cell, <kbd>a</kbd> swaps to another
        way of saying the same thing (<kbd>⇧A</kbd> goes back), <kbd>{MOD_LABEL}</kbd>+<kbd>D</kbd>{' '}
        copies the cell above, <kbd>{MOD_LABEL}</kbd>+<kbd>⇧</kbd>+<kbd>D</kbd> fills the rest of the
        column, and <kbd>Enter</kbd> opens that student. You can also paste a column of levels
        straight from your gradebook.
      </p>

      <div className="grid-wrap" ref={wrapRef} onPaste={onPaste}>
        <table className="mark-grid" role="grid">
          <thead>
            <tr>
              <th scope="col" className="grid-corner">
                Student
              </th>
              {klass.categories.map((cat) => (
                <th
                  key={cat.id}
                  scope="col"
                  className="grid-cat"
                  data-excluded={cat.include ? undefined : 'true'}
                  title={headTitle(cat)}
                >
                  <span className="grid-cat-group">{cat.group}</span>
                  <span className="grid-cat-name">{cat.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, r) => (
              <tr key={student.id}>
                <th scope="row" className="grid-name">
                  <button
                    type="button"
                    className="grid-name-btn"
                    title={`Open ${student.name || 'this student'} on the Students tab`}
                    onClick={() => onOpenStudent(student.id)}
                  >
                    {student.name || '(unnamed)'}
                  </button>
                </th>
                {klass.categories.map((cat, c) => {
                  const picks = student.ratings[cat.id] ?? []
                  return (
                    <td
                      key={cat.id}
                      role="gridcell"
                      className="grid-cell"
                      data-row={r}
                      data-col={c}
                      data-empty={picks.length ? undefined : 'true'}
                      data-multi={cat.multi ? 'true' : undefined}
                      data-excluded={cat.include ? undefined : 'true'}
                      title={cellTitle(cat, picks)}
                      tabIndex={r === row && c === col ? 0 : -1}
                      onFocus={() => goTo(r, c)}
                      onKeyDown={(e) => onCellKeyDown(e, r, c)}
                    >
                      {formatCell(picks) || '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
