export type Level = '1' | '2' | '3' | '4'

export const LEVELS: Level[] = ['1', '2', '3', '4']

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
  /** whether this category is part of the stitched final comment */
  include: boolean
  /** optional per-level labels (e.g. Using Class Time: 1=Practice, 2=Check work…) */
  levelLabels: Partial<Record<Level, string>> | null
  levels: Record<Level, string>
}

export interface Student {
  id: string
  name: string
  pronouns: Pronouns
  /** category id -> chosen level; absent = category skipped for this student */
  ratings: Record<string, Level>
  /** free text appended verbatim (placeholders allowed) */
  note: string
}

export interface AppState {
  version: 1
  categories: Category[]
  students: Student[]
}
