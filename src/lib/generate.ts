import type { Category, Student } from '../types'
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

export function generateComment(categories: Category[], student: Student): string {
  const parts: string[] = []
  for (const cat of categories) {
    if (!cat.include) continue
    for (const code of sortPicks(student.ratings[cat.id] ?? [])) {
      const text = pickText(cat, code)
      if (text) parts.push(text)
    }
  }
  const note = student.note.trim()
  if (note) parts.push(note)
  return substitutePlaceholders(parts.join(' '), student)
}
