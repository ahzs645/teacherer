import type { AppState, Category, Klass, Student } from '../types'
import { freshStateFromSeed } from '../seedData'
import { uid } from './util'

/* Same key as the original vanilla version, so existing users keep their data;
 * v1 payloads found under it are migrated in place on load. */
export const STORAGE_KEY = 'teacherer-state-v1'

type Dict = Record<string, unknown>

function isDict(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null
}

/** One level's phrasing pool: v1 stored a single string, v2 stores a list. */
function normalisePool(value: unknown, legacyAlt: unknown): string[] {
  const pool = Array.isArray(value)
    ? value.filter((v) => typeof v === 'string')
    : typeof value === 'string'
      ? [value]
      : []
  if (typeof legacyAlt === 'string' && legacyAlt.trim() && !pool.includes(legacyAlt)) {
    pool.push(legacyAlt)
  }
  return pool.length ? pool : ['']
}

/** Fill in fields added after v1 without discarding anything the user wrote. */
function normaliseCategory(raw: Dict): Category {
  const levels = isDict(raw.levels) ? raw.levels : {}
  const alt = isDict(raw.altLevels) ? raw.altLevels : {}
  return {
    id: typeof raw.id === 'string' ? raw.id : uid(),
    name: typeof raw.name === 'string' ? raw.name : 'Category',
    group: typeof raw.group === 'string' ? raw.group : '',
    include: raw.include !== false,
    multi: raw.multi === true,
    levelLabels: isDict(raw.levelLabels) ? (raw.levelLabels as Category['levelLabels']) : null,
    levels: {
      '1': normalisePool(levels['1'], alt['1']),
      '2': normalisePool(levels['2'], alt['2']),
      '3': normalisePool(levels['3'], alt['3']),
      '4': normalisePool(levels['4'], alt['4']),
    },
  }
}

/** v1 stored one level per category ("3"); v2 stores a list of picks (["3"]). */
function normaliseStudent(raw: Dict): Student {
  const ratings: Record<string, string[]> = {}
  if (isDict(raw.ratings)) {
    for (const [catId, value] of Object.entries(raw.ratings)) {
      if (Array.isArray(value)) {
        const picks = value.filter((v): v is string => typeof v === 'string')
        if (picks.length) ratings[catId] = picks
      } else if (typeof value === 'string' && value) {
        ratings[catId] = [value]
      }
    }
  }
  const p = isDict(raw.pronouns) ? raw.pronouns : {}
  return {
    id: typeof raw.id === 'string' ? raw.id : uid(),
    name: typeof raw.name === 'string' ? raw.name : '',
    pronouns: {
      preset: (p.preset === 'she' || p.preset === 'he' || p.preset === 'they' ? p.preset : 'custom') as Student['pronouns']['preset'],
      subject: String(p.subject ?? 'they'),
      object: String(p.object ?? 'them'),
      possessive: String(p.possessive ?? 'their'),
    },
    ratings,
    order: Array.isArray(raw.order) ? raw.order.filter((v): v is string => typeof v === 'string') : [],
    note: typeof raw.note === 'string' ? raw.note : '',
  }
}

function normaliseClass(raw: Dict, fallbackName: string): Klass {
  return {
    id: typeof raw.id === 'string' ? raw.id : uid(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : fallbackName,
    categories: Array.isArray(raw.categories) ? raw.categories.filter(isDict).map(normaliseCategory) : [],
    students: Array.isArray(raw.students) ? raw.students.filter(isDict).map(normaliseStudent) : [],
  }
}

/**
 * Accepts both stored shapes and always returns current-version state:
 * v1 ({ categories, students }) becomes a single class.
 */
export function migrate(value: unknown): AppState | null {
  if (!isDict(value)) return null

  if (value.version === 1 && Array.isArray(value.categories) && Array.isArray(value.students)) {
    const klass = normaliseClass(value, 'My class')
    return { version: 2, classes: [klass], activeClassId: klass.id }
  }

  if (value.version === 2 && Array.isArray(value.classes) && value.classes.length) {
    const classes = value.classes
      .filter(isDict)
      .map((c, i) => normaliseClass(c, `Class ${i + 1}`))
    if (!classes.length) return null
    const activeClassId =
      typeof value.activeClassId === 'string' && classes.some((c) => c.id === value.activeClassId)
        ? value.activeClassId
        : classes[0].id
    return { version: 2, classes, activeClassId }
  }

  return null
}

export function isAppState(value: unknown): value is AppState {
  return migrate(value) !== null
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const migrated = migrate(JSON.parse(raw) as unknown)
      if (migrated) return migrated
    }
  } catch {
    /* corrupted or unavailable -> reseed */
  }
  return freshStateFromSeed()
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
