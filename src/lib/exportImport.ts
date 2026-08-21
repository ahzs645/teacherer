import type * as XLSXTypes from 'xlsx'
import type { AppState, Category, Klass, Level, PickCode, Student } from '../types'
import { LEVELS, activeClass } from '../types'
import { generateComment, orderedCategories } from './generate'
import { makeStudent, presetFromText } from './pronouns'
import { formatCell, parseCell, parsePick, poolFor } from './ratings'
import { downloadBlob, todayStamp, uid } from './util'

/* SheetJS is ~700 kB minified; load it on demand so the app shell stays small.
 * The PWA service worker precaches the chunk, so exports still work offline. */
function loadXlsx(): Promise<typeof XLSXTypes> {
  return import('xlsx')
}

/** Everything we ever put in a cell. Ratings stay strings so "3b" survives. */
type Cell = string | number
type Row = Cell[]

export interface RatingsImportRow {
  name: string
  pronouns: string
  ratings: Record<string, PickCode[]>
  /** category ids, when the sheet carried a custom assembly order */
  order: string[]
  note: string
}

export interface RatingsImport {
  rows: RatingsImportRow[]
  /**
   * ids of the categories that had a column in the file. A row only carries
   * the picks it actually had, so this is how a caller knows which categories
   * the file spoke for at all (a blank cell in a matched column = cleared).
   */
  matchedCategories: string[]
  /** header labels we could not place, so the UI can report them */
  unknownColumns: string[]
}

/* ------------------------------------------------------------------ shared */

function pronounSummary(st: Student): string {
  return `${st.pronouns.subject}/${st.pronouns.object}/${st.pronouns.possessive}`
}

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim()
}

/** Filename-safe version of a class name, never empty. */
function slug(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'class'
}

const SHEET_NAME_MAX = 31
const ILLEGAL_SHEET_CHARS = /[[\]:*?/\\]/g

/**
 * Excel sheet names must be <= 31 characters, cannot contain []:*?/\ and must
 * be unique within a workbook. Returns a namer that builds "<class> · Ratings"
 * style tabs: the class part is trimmed (and numbered on a collision) so the
 * suffix that says what the sheet holds always survives intact.
 */
function makeSheetNamer(): (head: string, suffix?: string) => string {
  const used = new Set<string>()
  return (head, suffix = '') => {
    const tail = suffix ? ` · ${suffix}` : ''
    const clean = head.replace(ILLEGAL_SHEET_CHARS, ' ').replace(/\s+/g, ' ').trim() || 'Sheet'
    for (let n = 1; ; n += 1) {
      const mark = n > 1 ? ` ${n}` : ''
      const room = Math.max(1, SHEET_NAME_MAX - tail.length - mark.length)
      const name = `${clean.slice(0, room).trim()}${mark}${tail}`
      const key = name.toLowerCase()
      if (used.has(key)) continue
      used.add(key)
      return name
    }
  }
}

/* ------------------------------------------------------------------ export */

const COMMENT_COLS = [{ wch: 22 }, { wch: 16 }, { wch: 120 }, { wch: 11 }]
const BANK_COLS = [
  { wch: 18 },
  { wch: 28 },
  { wch: 9 },
  { wch: 7 },
  { wch: 6 },
  { wch: 16 },
  { wch: 11 },
  { wch: 120 },
]

function commentsRows(klass: Klass): Row[] {
  const rows: Row[] = [['Student', 'Pronouns', 'Comment', 'Characters']]
  for (const st of klass.students) {
    const comment = generateComment(klass.categories, st)
    rows.push([st.name, pronounSummary(st), comment, comment.length])
  }
  return rows
}

const ORDER_SEPARATOR = ' | '

/** Blank unless the student overrides the bank order, so a plain sheet stays plain. */
function orderCell(klass: Klass, st: Student): string {
  if (!st.order.length) return ''
  return orderedCategories(klass.categories, st)
    .map((c) => c.name)
    .join(ORDER_SEPARATOR)
}

function ratingsRows(klass: Klass): Row[] {
  const rows: Row[] = [
    ['Student', 'Pronouns', ...klass.categories.map((c) => c.name), 'Personal note', 'Comment order'],
  ]
  for (const st of klass.students) {
    rows.push([
      st.name,
      st.pronouns.subject,
      // formatCell always returns a string, so "3b" and "1,4" round-trip
      // instead of being mangled into numbers by Excel.
      ...klass.categories.map((c) => formatCell(st.ratings[c.id] ?? [])),
      st.note,
      orderCell(klass, st),
    ])
  }
  return rows
}

function bankHeader(withClass: boolean): Row {
  const cols: Row = ['Group', 'Category', 'Included', 'Multi', 'Level', 'Label', 'Phrasing #', 'Text']
  return withClass ? ['Class', ...cols] : cols
}

/** One row per phrasing in each level's pool. */
function bankBody(klass: Klass, withClass: boolean): Row[] {
  const rows: Row[] = []
  for (const cat of klass.categories) {
    for (const lvl of LEVELS) {
      poolFor(cat, lvl).forEach((text, i) => {
        const row: Row = [
          cat.group,
          cat.name,
          cat.include ? 'yes' : 'no',
          cat.multi ? 'yes' : 'no',
          Number(lvl),
          cat.levelLabels?.[lvl] ?? '',
          i + 1,
          text,
        ]
        rows.push(withClass ? [klass.name, ...row] : row)
      })
    }
  }
  return rows
}

/** Every class gets a Comments and a Ratings sheet; one shared bank sheet last. */
export async function exportXlsx(state: AppState): Promise<void> {
  const XLSX = await loadXlsx()
  const wb = XLSX.utils.book_new()
  const nameSheet = makeSheetNamer()

  for (const klass of state.classes) {
    const wsComments = XLSX.utils.aoa_to_sheet(commentsRows(klass))
    wsComments['!cols'] = COMMENT_COLS
    XLSX.utils.book_append_sheet(wb, wsComments, nameSheet(klass.name, 'Comments'))

    const wsRatings = XLSX.utils.aoa_to_sheet(ratingsRows(klass))
    wsRatings['!cols'] = [
      { wch: 22 },
      { wch: 10 },
      ...klass.categories.map(() => ({ wch: 14 })),
      { wch: 40 },
      { wch: 34 },
    ]
    XLSX.utils.book_append_sheet(wb, wsRatings, nameSheet(klass.name, 'Ratings'))
  }

  const bank = [bankHeader(true), ...state.classes.flatMap((klass) => bankBody(klass, true))]
  const wsBank = XLSX.utils.aoa_to_sheet(bank)
  wsBank['!cols'] = [{ wch: 18 }, ...BANK_COLS]
  XLSX.utils.book_append_sheet(wb, wsBank, nameSheet('Comment Bank'))

  XLSX.writeFile(wb, `report-comments-${todayStamp()}.xlsx`)
}

/** Just the finished comments for the class currently on screen. */
export async function exportCsv(state: AppState): Promise<void> {
  const XLSX = await loadXlsx()
  const klass = activeClass(state)
  const rows: Row[] = [['Student', 'Comment', 'Characters']]
  for (const st of klass.students) {
    const comment = generateComment(klass.categories, st)
    rows.push([st.name, comment, comment.length])
  }
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows))
  const blob = new Blob([csv], { type: 'text/csv' })
  downloadBlob(blob, `report-comments-${slug(klass.name)}-${todayStamp()}.csv`)
}

export function exportJson(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `teacherer-backup-${todayStamp()}.json`)
}

export async function exportBankXlsx(klass: Klass): Promise<void> {
  const XLSX = await loadXlsx()
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([bankHeader(false), ...bankBody(klass, false)])
  ws['!cols'] = BANK_COLS
  XLSX.utils.book_append_sheet(wb, ws, 'Comment Bank')
  XLSX.writeFile(wb, `comment-bank-${slug(klass.name)}-${todayStamp()}.xlsx`)
}

export function exportBankJson(klass: Klass): void {
  const payload = {
    kind: 'teacherer-bank',
    version: 2,
    name: klass.name,
    categories: klass.categories,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `comment-bank-${slug(klass.name)}-${todayStamp()}.json`)
}

/* ------------------------------------------------------------------ import */

/**
 * CSV is handed over as text; anything else goes in as bytes. `raw` turns off
 * SheetJS's type guessing for plain text, which otherwise reads the rating
 * cell "1,4" as the number 14 and "1 / 4" as a date. It is ignored when the
 * file really is a workbook, where cells already carry their own types.
 */
async function readWorkbook(XLSX: typeof XLSXTypes, file: File): Promise<XLSXTypes.WorkBook> {
  if (/\.csv$/i.test(file.name)) return XLSX.read(await file.text(), { type: 'string', raw: true })
  return XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true })
}

/** Raw cell grid, header row included, so we can match headers ourselves. */
function sheetGrid(XLSX: typeof XLSXTypes, ws: XLSXTypes.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', blankrows: false })
}

/** Prefer a sheet whose name ends with the given word, else the first sheet. */
function pickSheet(wb: XLSXTypes.WorkBook, ending: RegExp): XLSXTypes.WorkSheet | null {
  const name = wb.SheetNames.find((n) => ending.test(n)) ?? wb.SheetNames[0]
  if (!name) return null
  return wb.Sheets[name] ?? null
}

/**
 * Matching key for header labels and category names: case-insensitive,
 * whitespace-insensitive, and treating "·" and "-" as the same separator so
 * "Communicating · Clarity", "Communicating - Clarity" and "Clarity" all land
 * on the same category.
 */
function matchKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[·•]/g, '-')
    .replace(/\s+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Header labels that are never a category column. */
const RESERVED_COLUMNS = new Set([
  'student',
  'name',
  'studentname',
  'personalnote',
  'note',
  'comment',
  'characters',
  'class',
  'commentorder',
  'order',
])

function isNameHeader(key: string): boolean {
  return key === 'student' || key === 'name' || key === 'studentname'
}

function isNoteHeader(key: string): boolean {
  return key === 'personalnote' || key === 'note'
}

function isOrderHeader(key: string): boolean {
  return key === 'commentorder' || key === 'order'
}

/** "Content Knowledge | US1" -> the ids of those categories, unknown names dropped. */
function parseOrderCell(value: unknown, index: Map<string, Category>): string[] {
  const text = cellText(value)
  if (!text) return []
  const ids: string[] = []
  for (const part of text.split(/[|;>]+/)) {
    const cat = index.get(matchKey(part))
    if (cat && !ids.includes(cat.id)) ids.push(cat.id)
  }
  return ids
}

/** name key -> category, with the "<group> · <name>" form as a fallback. */
function categoryIndex(categories: Category[]): Map<string, Category> {
  const byKey = new Map<string, Category>()
  const qualified = new Map<string, Category>()
  for (const cat of categories) {
    const plain = matchKey(cat.name)
    if (plain && !byKey.has(plain)) byKey.set(plain, cat)
    if (cat.group) {
      const q = matchKey(`${cat.group}-${cat.name}`)
      if (q && !qualified.has(q)) qualified.set(q, cat)
    }
  }
  // A bare category name always wins over a group-qualified collision.
  for (const [key, cat] of qualified) if (!byKey.has(key)) byKey.set(key, cat)
  return byKey
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

/**
 * Read a Ratings sheet back in. Names are returned as written; matching them
 * to the roster is the caller's job, so it can offer to add unknown students.
 */
export async function parseRatingsFile(file: File, categories: Category[]): Promise<RatingsImport> {
  const XLSX = await loadXlsx()
  const wb = await readWorkbook(XLSX, file)
  const ws = pickSheet(wb, /ratings\s*$/i)
  if (!ws) return { rows: [], matchedCategories: [], unknownColumns: [] }

  const grid = sheetGrid(XLSX, ws)
  const header = grid[0] ?? []
  const index = categoryIndex(categories)

  const columns: (Category | null)[] = []
  const unknownColumns: string[] = []
  const matched = new Set<string>()
  let nameCol = -1
  let pronounCol = -1
  let noteCol = -1
  let orderCol = -1

  for (let c = 0; c < header.length; c += 1) {
    const label = cellText(header[c])
    const key = matchKey(label)
    columns[c] = null
    if (!key) continue
    if (nameCol < 0 && isNameHeader(key)) {
      nameCol = c
      continue
    }
    if (pronounCol < 0 && key.startsWith('pronoun')) {
      pronounCol = c
      continue
    }
    if (noteCol < 0 && isNoteHeader(key)) {
      noteCol = c
      continue
    }
    if (orderCol < 0 && isOrderHeader(key)) {
      orderCol = c
      continue
    }
    const cat = index.get(key)
    if (cat) {
      columns[c] = cat
      matched.add(cat.id)
      continue
    }
    if (!RESERVED_COLUMNS.has(key) && !key.startsWith('pronoun')) unknownColumns.push(label)
  }

  // No "Student" header at all? Fall back to the first unclaimed column so a
  // hand-made two-column sheet still imports.
  if (nameCol < 0 && header.length > 0 && !columns[0]) {
    nameCol = 0
    const at = unknownColumns.indexOf(cellText(header[0]))
    if (at >= 0) unknownColumns.splice(at, 1)
  }

  const rows: RatingsImportRow[] = []
  for (let r = 1; r < grid.length; r += 1) {
    const row = grid[r] ?? []
    const name = nameCol >= 0 ? cellText(row[nameCol]) : ''
    if (!name) continue
    const ratings: Record<string, PickCode[]> = {}
    for (let c = 0; c < columns.length; c += 1) {
      const cat = columns[c]
      if (!cat) continue
      const picks = parseCell(row[c], cat.multi)
      if (picks.length) ratings[cat.id] = picks
    }
    rows.push({
      name,
      pronouns: pronounCol >= 0 ? cellText(row[pronounCol]) : '',
      ratings,
      order: orderCol >= 0 ? parseOrderCell(row[orderCol], index) : [],
      note: noteCol >= 0 ? cellText(row[noteCol]) : '',
    })
  }

  return {
    rows,
    // keep the app's own category order rather than the file's
    matchedCategories: categories.filter((c) => matched.has(c.id)).map((c) => c.id),
    unknownColumns,
  }
}

function emptyLevels(): Record<Level, string[]> {
  return { '1': [''], '2': [''], '3': [''], '4': [''] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** "no"/"false"/"0" mean off, blank means "not stated", anything else is on. */
function parseFlag(value: unknown, fallback: boolean): boolean {
  const t = cellText(value).toLowerCase()
  if (!t) return fallback
  return !(t === 'no' || t === 'n' || t === 'false' || t === '0' || t === 'off')
}

/** Accepts "3", "3b" and "Level 3". */
function parseLevelCell(value: unknown): Level | null {
  const t = cellText(value).replace(/^level\s*/i, '')
  return parsePick(t)?.level ?? null
}

function toLevelLabels(value: unknown): Partial<Record<Level, string>> | null {
  if (!isRecord(value)) return null
  const labels: Partial<Record<Level, string>> = {}
  let any = false
  for (const lvl of LEVELS) {
    const text = cellText(value[lvl])
    if (text) {
      labels[lvl] = text
      any = true
    }
  }
  return any ? labels : null
}

function toLevels(value: unknown): Record<Level, string[]> {
  const levels = emptyLevels()
  if (!isRecord(value)) return levels
  for (const lvl of LEVELS) {
    const raw = value[lvl]
    // tolerate a single string per level (the shape banks had before pools)
    const pool = typeof raw === 'string' ? [raw] : asArray(raw).map((t) => cellText(t))
    levels[lvl] = pool.length ? pool : ['']
  }
  return levels
}

function toCategory(value: unknown, usedIds: Set<string>): Category | null {
  if (!isRecord(value)) return null
  const name = cellText(value.name)
  if (!name) return null
  // Keep the file's ids where we can: re-importing a bank into the class it
  // came from then leaves the students' ratings pointing at the right rows.
  const rawId = cellText(value.id)
  const id = rawId && !usedIds.has(rawId) ? rawId : uid()
  usedIds.add(id)
  return {
    id,
    name,
    group: cellText(value.group),
    include: value.include === undefined ? true : Boolean(value.include),
    multi: Boolean(value.multi),
    levelLabels: toLevelLabels(value.levelLabels),
    levels: toLevels(value.levels),
  }
}

function parseBankJson(text: string): Category[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!isRecord(data) || data.kind !== 'teacherer-bank') {
    throw new Error('That JSON file is not a Teacherer comment bank.')
  }
  const usedIds = new Set<string>()
  const categories = asArray(data.categories)
    .map((c) => toCategory(c, usedIds))
    .filter((c): c is Category => c !== null)
  if (!categories.length) throw new Error('That comment bank has no categories.')
  return categories
}

interface Phrasing {
  /** value of the "Phrasing #" column, or the row's position in the pool */
  order: number
  text: string
}

interface Draft {
  name: string
  group: string
  include: boolean
  multi: boolean
  labels: Partial<Record<Level, string>>
  pools: Record<Level, Phrasing[]>
}

function newDraft(name: string): Draft {
  return {
    name,
    group: '',
    include: true,
    multi: false,
    labels: {},
    pools: { '1': [], '2': [], '3': [], '4': [] },
  }
}

function draftToCategory(draft: Draft): Category {
  const levels = emptyLevels()
  for (const lvl of LEVELS) {
    // stable sort: rows without a "Phrasing #" keep the order they appeared in
    const pool = [...draft.pools[lvl]].sort((a, b) => a.order - b.order).map((p) => p.text)
    levels[lvl] = pool.length ? pool : ['']
  }
  const labels = Object.keys(draft.labels).length ? draft.labels : null
  return {
    id: uid(),
    name: draft.name,
    group: draft.group,
    include: draft.include,
    multi: draft.multi,
    levelLabels: labels,
    levels,
  }
}

/** Column positions in a Comment Bank sheet; -1 when the column is absent. */
interface BankColumns {
  group: number
  category: number
  included: number
  multi: number
  level: number
  label: number
  order: number
  text: number
}

function bankColumns(header: unknown[]): BankColumns {
  const cols: BankColumns = {
    group: -1,
    category: -1,
    included: -1,
    multi: -1,
    level: -1,
    label: -1,
    order: -1,
    text: -1,
  }
  for (let c = 0; c < header.length; c += 1) {
    const key = matchKey(cellText(header[c]))
    if (cols.group < 0 && (key === 'group' || key === 'competency')) cols.group = c
    else if (cols.category < 0 && (key === 'category' || key === 'name')) cols.category = c
    else if (cols.included < 0 && (key === 'included' || key === 'include')) cols.included = c
    else if (cols.multi < 0 && (key === 'multi' || key === 'multiselect')) cols.multi = c
    else if (cols.level < 0 && key === 'level') cols.level = c
    else if (cols.label < 0 && key === 'label') cols.label = c
    else if (cols.order < 0 && key.startsWith('phrasing') && key !== 'phrasingtext') cols.order = c
    else if (cols.text < 0 && (key === 'text' || key === 'comment' || key === 'phrasingtext')) {
      cols.text = c
    }
  }
  return cols
}

function parseBankGrid(grid: unknown[][]): Category[] {
  const header = grid[0] ?? []
  const cols = bankColumns(header)
  if (cols.category < 0 || cols.level < 0) {
    throw new Error('That sheet needs at least a "Category" and a "Level" column.')
  }

  // first-seen order, keyed loosely so "Class time" and "class  time" merge
  const drafts = new Map<string, Draft>()
  for (let r = 1; r < grid.length; r += 1) {
    const row = grid[r] ?? []
    const name = cellText(row[cols.category])
    const level = parseLevelCell(row[cols.level])
    if (!name || !level) continue

    const key = matchKey(name)
    let draft = drafts.get(key)
    if (!draft) {
      draft = newDraft(name)
      draft.include = parseFlag(cols.included >= 0 ? row[cols.included] : '', true)
      draft.multi = parseFlag(cols.multi >= 0 ? row[cols.multi] : '', false)
      drafts.set(key, draft)
    }
    if (!draft.group && cols.group >= 0) draft.group = cellText(row[cols.group])
    if (cols.label >= 0) {
      const label = cellText(row[cols.label])
      if (label && !draft.labels[level]) draft.labels[level] = label
    }

    const text = cols.text >= 0 ? cellText(row[cols.text]) : ''
    if (!text) continue
    const pool = draft.pools[level]
    const stated = cols.order >= 0 ? Number(cellText(row[cols.order])) : Number.NaN
    pool.push({ order: Number.isFinite(stated) && stated > 0 ? stated : pool.length + 1, text })
  }

  if (!drafts.size) throw new Error('No comment bank rows found in that file.')
  return [...drafts.values()].map(draftToCategory)
}

/**
 * Import a comment bank from either the JSON we export or a Comment Bank
 * sheet. Categories always come back with fresh ids from a sheet, since a
 * sheet carries no ids to preserve.
 */
export async function parseBankFile(file: File): Promise<Category[]> {
  if (/\.json$/i.test(file.name) || file.type === 'application/json') {
    return parseBankJson(await file.text())
  }
  const XLSX = await loadXlsx()
  const wb = await readWorkbook(XLSX, file)
  const ws = pickSheet(wb, /bank\s*$/i)
  if (!ws) throw new Error('That workbook has no sheets.')
  return parseBankGrid(sheetGrid(XLSX, ws))
}
