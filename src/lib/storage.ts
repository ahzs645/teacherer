import type { AppState } from '../types'
import { freshStateFromSeed } from '../seedData'

/* Same key and shape as the original vanilla version, so existing
 * users keep their data across the rewrite. */
export const STORAGE_KEY = 'teacherer-state-v1'

export function isAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 1 && Array.isArray(v.categories) && Array.isArray(v.students)
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isAppState(parsed)) return parsed
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
