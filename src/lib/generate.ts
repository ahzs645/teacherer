import type { Category, PickCode, Student } from '../types'
import { parsePick, poolFor, sortPicks } from './ratings'
import { capitalize } from './util'

export function substitutePlaceholders(text: string, student: Student): string {
  const name = student.name.trim() || 'This student'
  const p = student.pronouns
  return (
    text
      .split('[Student]').join(name)
      .split('[He/She/They]').join(capitalize(p.subject))
      .split('[he/she/they]').join(p.subject)
      // The original spreadsheet substitutes the capitalised possessive token
      // with the lowercase pronoun; keep that behaviour.
      .split('[His/Her/Their]').join(p.possessive)
      .split('[his/her/their]').join(p.possessive)
      .split('[Him/Her/Them]').join(capitalize(p.object))
      .split('[him/her/them]').join(p.object)
  )
}

/** The text one chosen pick contributes, from that level's phrasing pool. */
export function pickText(cat: Category, code: string): string {
  const p = parsePick(code)
  if (!p) return ''
  const pool = poolFor(cat, p.level)
  return (pool[p.variant] ?? pool[0] ?? '').trim()
}

/** Everything a category contributes for one student, in level order. */
export function categoryText(cat: Category, picks: PickCode[]): string {
  return sortPicks(picks)
    .map((code) => pickText(cat, code))
    .filter(Boolean)
    .join(' ')
}

const LAST = Number.MAX_SAFE_INTEGER

/**
 * The categories that contribute to this student's comment, in the order they
 * are stitched: the student's own order when they have set one, otherwise the
 * bank's top-to-bottom order. Categories rated after an order was set fall in
 * at the end, keeping their bank order among themselves.
 */
export function orderedCategories(categories: Category[], student: Student): Category[] {
  const active = categories.filter(
    (cat) => cat.include && categoryText(cat, student.ratings[cat.id] ?? []) !== '',
  )
  if (!student.order.length) return active
  const rank = new Map(student.order.map((id, i) => [id, i]))
  return active
    .map((cat, i) => ({ cat, i, r: rank.get(cat.id) ?? LAST }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r - b.r))
    .map((x) => x.cat)
}

export function generateComment(categories: Category[], student: Student): string {
  const parts = orderedCategories(categories, student).map((cat) =>
    categoryText(cat, student.ratings[cat.id] ?? []),
  )
  const note = student.note.trim()
  if (note) parts.push(note)
  return substitutePlaceholders(parts.join(' '), student)
}
