import type * as XLSXTypes from 'xlsx'
import type { AppState, Student } from '../types'
import { LEVELS } from '../types'
import { generateComment } from './generate'
import { makeStudent, presetFromText } from './pronouns'
import { downloadBlob, todayStamp } from './util'

function pronounSummary(st: Student): string {
  return `${st.pronouns.subject}/${st.pronouns.object}/${st.pronouns.possessive}`
}

/* SheetJS is ~700 kB minified; load it on demand so the app shell stays small.
 * The PWA service worker precaches the chunk, so exports still work offline. */
function loadXlsx(): Promise<typeof XLSXTypes> {
  return import('xlsx')
}

function buildWorkbook(XLSX: typeof XLSXTypes, state: AppState): XLSXTypes.WorkBook {
  const wb = XLSX.utils.book_new()

  const commentsRows: (string | number)[][] = [['Student', 'Pronouns', 'Comment']]
  for (const st of state.students) {
    commentsRows.push([st.name, pronounSummary(st), generateComment(state.categories, st)])
  }
  const wsComments = XLSX.utils.aoa_to_sheet(commentsRows)
  wsComments['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 120 }]
  XLSX.utils.book_append_sheet(wb, wsComments, 'Comments')

  const ratingRows: (string | number)[][] = [
    ['Student', 'Pronouns', ...state.categories.map((c) => c.name), 'Personal note'],
  ]
  for (const st of state.students) {
    ratingRows.push([
      st.name,
      st.pronouns.subject,
      ...state.categories.map((c) => (st.ratings[c.id] ? Number(st.ratings[c.id]) : '')),
      st.note,
    ])
  }
  const wsRatings = XLSX.utils.aoa_to_sheet(ratingRows)
  wsRatings['!cols'] = [{ wch: 22 }, { wch: 10 }, ...state.categories.map(() => ({ wch: 14 }))]
  XLSX.utils.book_append_sheet(wb, wsRatings, 'Ratings')

  const bankRows: (string | number)[][] = [['Category', 'Included', 'Level', 'Label', 'Text']]
  for (const c of state.categories) {
    for (const lvl of LEVELS) {
      bankRows.push([c.name, c.include ? 'yes' : 'no', Number(lvl), c.levelLabels?.[lvl] ?? '', c.levels[lvl]])
    }
  }
  const wsBank = XLSX.utils.aoa_to_sheet(bankRows)
  wsBank['!cols'] = [{ wch: 28 }, { wch: 9 }, { wch: 6 }, { wch: 14 }, { wch: 120 }]
  XLSX.utils.book_append_sheet(wb, wsBank, 'Comment Bank')

  return wb
}

export async function exportXlsx(state: AppState): Promise<void> {
  const XLSX = await loadXlsx()
  XLSX.writeFile(buildWorkbook(XLSX, state), `report-comments-${todayStamp()}.xlsx`)
}

export async function exportCsv(state: AppState): Promise<void> {
  const XLSX = await loadXlsx()
  const rows = [
    ['Student', 'Comment'],
    ...state.students.map((st) => [st.name, generateComment(state.categories, st)]),
  ]
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows))
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `report-comments-${todayStamp()}.csv`)
}

export function exportJson(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `teacherer-backup-${todayStamp()}.json`)
}

/** Parse a roster spreadsheet (first sheet, "Name"/"Student" column, optional "Pronouns"). */
export async function parseRosterFile(file: File): Promise<Student[]> {
  const XLSX = await loadXlsx()
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const firstSheet = wb.SheetNames[0]
  if (!firstSheet) return []
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheet], {
    defval: '',
  })
  const students: Student[] = []
  for (const row of rows) {
    let name = ''
    let pron = ''
    for (const key of Object.keys(row)) {
      const k = key.trim().toLowerCase()
      if (!name && (k === 'name' || k === 'student' || k === 'student name')) {
        name = String(row[key]).trim()
      }
      if (!pron && k.startsWith('pronoun')) {
        pron = String(row[key]).trim()
      }
    }
    if (name) students.push(makeStudent(name, presetFromText(pron)))
  }
  return students
}
