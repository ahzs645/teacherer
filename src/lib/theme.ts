/**
 * Theme control.
 *
 * Three modes, not two: "system" is a real choice, and it is the default —
 * a teacher who has already told their OS they want dark at 4pm should not
 * have to tell this app as well. "light" and "dark" pin the palette and win
 * over the system preference.
 *
 * The palette itself lives entirely in src/styles/tokens.css; all this module
 * does is set `data-theme` on <html> and keep the browser chrome in step.
 */

export type ThemeMode = 'light' | 'dark' | 'system'
/** What `system` actually resolved to right now. */
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'teacherer-theme'

export const THEME_MODES: ThemeMode[] = ['light', 'system', 'dark']

/** Kept in sync with --shell in tokens.css, for the mobile browser chrome. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#161d26',
}

function isMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (isMode(raw)) return raw
  } catch {
    /* storage blocked (private mode, embedded webview) — fall through */
  }
  return 'system'
}

export function storeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* nothing to do: the choice just will not survive a reload */
  }
}

export function systemTheme(): ResolvedTheme {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode
}

/**
 * Point the document at a palette. `system` clears the attribute so the
 * prefers-color-scheme block in tokens.css takes over on its own — that keeps
 * one source of truth for what "system" means.
 */
export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const root = document.documentElement
  if (mode === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)

  const resolved = resolveTheme(mode)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved])
  return resolved
}

/**
 * Repaint without the cross-fade. Worth it when the whole palette flips at
 * once: the staggered transition of dozens of elements reads as a glitch,
 * where an instant swap reads as a switch being thrown.
 */
export function applyThemeInstantly(mode: ThemeMode): ResolvedTheme {
  const root = document.documentElement
  root.classList.add('theme-instant')
  const resolved = applyTheme(mode)
  // two frames: one for the class to land, one for the repaint to finish
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('theme-instant'))
  })
  return resolved
}

/** Calls back whenever the OS preference flips. Returns an unsubscribe. */
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  if (typeof matchMedia !== 'function') return () => {}
  const query = matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light')
  query.addEventListener('change', handler)
  return () => query.removeEventListener('change', handler)
}

export const THEME_LABEL: Record<ThemeMode, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark',
}
