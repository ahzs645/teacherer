import type { Student } from '../types'

/** The roster as the Students and Grid tabs show it: filtered, optionally A-Z. */
export function visibleStudents(students: Student[], query: string, sortAZ: boolean): Student[] {
  const q = query.trim().toLowerCase()
  const list = q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students.slice()
  if (sortAZ) {
    list.sort((a, b) => (a.name || '￿').localeCompare(b.name || '￿', undefined, { sensitivity: 'base' }))
  }
  return list
}

export function stepStudent(list: Student[], currentId: string | null, delta: number): string | null {
  if (!list.length) return null
  const i = list.findIndex((s) => s.id === currentId)
  if (i === -1) return list[0].id
  const next = Math.min(list.length - 1, Math.max(0, i + delta))
  return list[next].id
}
