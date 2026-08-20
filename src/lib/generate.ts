import type { Category, Student } from '../types'
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

export function generateComment(categories: Category[], student: Student): string {
  const parts: string[] = []
  for (const cat of categories) {
    if (!cat.include) continue
    const lvl = student.ratings[cat.id]
    if (!lvl) continue
    const text = (cat.levels[lvl] ?? '').trim()
    if (text) parts.push(text)
  }
  const note = student.note.trim()
  if (note) parts.push(note)
  return substitutePlaceholders(parts.join(' '), student)
}
