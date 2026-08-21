import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ResolvedTheme, ThemeMode } from '../lib/theme'
import {
  applyTheme,
  applyThemeInstantly,
  readStoredMode,
  resolveTheme,
  storeMode,
  watchSystemTheme,
} from '../lib/theme'

export interface ThemeControl {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  /** Flip straight to the opposite of what is on screen. */
  toggle: () => void
}

/**
 * Owns the theme choice for the app. The inline script in index.html has
 * already painted the right palette by the time this runs, so mounting must
 * not change anything on screen — it only re-syncs after a real change.
 */
export function useTheme(): ThemeControl {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode)
  const [system, setSystem] = useState<ResolvedTheme>(() => resolveTheme('system'))

  useEffect(() => watchSystemTheme(setSystem), [])

  /**
   * In `system` mode the palette follows the media query with no help from us,
   * but the browser-chrome colour is a meta tag someone has to rewrite — so
   * re-apply whenever the choice, or what it resolves to, changes.
   */
  useEffect(() => {
    applyTheme(mode)
  }, [mode, system])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    storeMode(next)
    applyThemeInstantly(next)
  }, [])

  const resolved = mode === 'system' ? system : mode

  const toggle = useCallback(() => {
    setMode(resolveTheme(readStoredMode()) === 'dark' ? 'light' : 'dark')
  }, [setMode])

  return useMemo(() => ({ mode, resolved, setMode, toggle }), [mode, resolved, setMode, toggle])
}
