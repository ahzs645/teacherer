import type { Category, Level, PickCode } from '../types'
import { LEVELS } from '../types'

/**
 * "3" -> level 3, first phrasing in the pool.
 * "3b" -> level 3, second phrasing. "3c" -> third, and so on.
 */
export interface Pick {
  level: Level
  variant: number
}

const LETTER_A = 97

export function formatPick(level: Level, variant = 0): PickCode {
  return variant <= 0 ? level : `${level}${String.fromCharCode(LETTER_A + variant)}`
}

export function parsePick(code: string): Pick | null {
  const m = /^\s*([1-4])\s*([a-z]?)\s*$/i.exec(code)
  if (!m) return null
  const letter = m[2].toLowerCase()
  return { level: m[1] as Level, variant: letter ? letter.charCodeAt(0) - LETTER_A : 0 }
}

export function isLevel(value: string): value is Level {
  return LEVELS.includes(value as Level)
}

/** The phrasings written for one level, always at least one (possibly empty). */
export function poolFor(cat: Category, level: Level): string[] {
  const pool = cat.levels[level]
  return pool && pool.length ? pool : ['']
}

export function variantCount(cat: Category, level: Level): number {
  return poolFor(cat, level).length
}

function order(a: PickCode, b: PickCode): number {
  const pa = parsePick(a)
  const pb = parsePick(b)
  if (!pa || !pb) return 0
  return pa.level === pb.level ? pa.variant - pb.variant : pa.level.localeCompare(pb.level)
}

export function sortPicks(codes: PickCode[]): PickCode[] {
  return [...codes].sort(order)
}

export function levelsFor(codes: PickCode[]): Level[] {
  return codes.map(parsePick).filter((p): p is Pick => p !== null).map((p) => p.level)
}

export function pickForLevel(codes: PickCode[], level: Level): Pick | null {
  for (const code of codes) {
    const p = parsePick(code)
    if (p && p.level === level) return p
  }
  return null
}

/**
 * Add, remove or replace a level in a category's picks. Single-select
 * categories keep at most one; multi-select ones toggle the level in place,
 * remembering whichever phrasing was already chosen for it.
 */
export function setLevel(cat: Category, codes: PickCode[], level: Level | null): PickCode[] {
  if (level === null) return []
  const existing = codes.find((c) => parsePick(c)?.level === level)
  if (!cat.multi) return [existing ?? formatPick(level)]
  if (existing) return codes.filter((c) => c !== existing)
  return sortPicks([...codes, formatPick(level)])
}

/** Step a chosen level to the next phrasing in its pool, wrapping around. */
export function cycleVariant(cat: Category, codes: PickCode[], level: Level, step = 1): PickCode[] {
  const count = variantCount(cat, level)
  if (count < 2) return codes
  return codes.map((code) => {
    const p = parsePick(code)
    if (!p || p.level !== level) return code
    return formatPick(p.level, (p.variant + step + count) % count)
  })
}

export function setVariant(codes: PickCode[], level: Level, variant: number): PickCode[] {
  return codes.map((code) => {
    const p = parsePick(code)
    return p && p.level === level ? formatPick(p.level, variant) : code
  })
}

/** Cell text used in the Ratings sheet: "3", "3b", "1,4". */
export function formatCell(codes: PickCode[]): string {
  return sortPicks(codes).join(',')
}

/** Read a Ratings-sheet cell back in. Accepts 3, "3", "3b", "1,4", "1 / 4". */
export function parseCell(value: unknown, multi: boolean): PickCode[] {
  if (value === null || value === undefined) return []
  const parts = String(value)
    .split(/[,;/|\s]+/)
    .map((p) => parsePick(p))
    .filter((p): p is Pick => p !== null)
    .map((p) => formatPick(p.level, p.variant))
  const unique = sortPicks([...new Set(parts)])
  return multi ? unique : unique.slice(0, 1)
}

/** Drop picks whose phrasing no longer exists (a pool entry was deleted). */
export function clampPicks(cat: Category, codes: PickCode[]): PickCode[] {
  return codes.map((code) => {
    const p = parsePick(code)
    if (!p) return code
    const max = variantCount(cat, p.level) - 1
    return p.variant > max ? formatPick(p.level, max) : code
  })
}
