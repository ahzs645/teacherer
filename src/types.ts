export type Level = '1' | '2' | '3' | '4'

export const LEVELS: Level[] = ['1', '2', '3', '4']

/**
 * A single choice a teacher made for one category: a level, plus which
 * phrasing from that level's pool. Serialised as "3" (first phrasing), "3b"
 * (second), "3c" (third)… so it survives a round trip through a spreadsheet
 * cell unchanged and never looks like a number to Excel.
 */
export type PickCode = string

export type PronounPreset = 'she' | 'he' | 'they' | 'custom'

export interface Pronouns {
  preset: PronounPreset
  subject: string
  object: string
  possessive: string
}

export interface Category {
  id: string
  name: string
  /** competency this belongs to, e.g. "Communicating"; '' for ungrouped */
  group: string
  /** whether this category is part of the stitched final comment */
  include: boolean
  /** more than one level can be chosen at once (e.g. Using Class Time) */
  multi: boolean
  /** optional per-level labels (e.g. Using Class Time: 1=Practice, 2=Check work…) */
  levelLabels: Partial<Record<Level, string>> | null
  /**
   * The comment pool: one or more interchangeable phrasings per level. The
   * first is the default; the rest are alternates a teacher can pick per
   * student (the template's "Comment2" columns generalised).
   */
  levels: Record<Level, string[]>
}

export interface Student {
  id: string
  name: string
  pronouns: Pronouns
  /** category id -> chosen picks; absent or empty = category skipped */
  ratings: Record<string, PickCode[]>
  /**
   * Category ids in the order this student's sentences are stitched. Empty
   * means "use the bank's own top-to-bottom order", which is the class default;
   * anything listed here overrides it for this student only.
   */
  order: string[]
  /** free text appended verbatim (placeholders allowed) */
  note: string
}

/** One class/block: its own roster and its own comment bank, like a sheet tab. */
export interface Klass {
  id: string
  name: string
  categories: Category[]
  students: Student[]
}

export interface AppState {
  version: 2
  classes: Klass[]
  activeClassId: string
}

export function activeClass(state: AppState): Klass {
  return state.classes.find((c) => c.id === state.activeClassId) ?? state.classes[0]
}
