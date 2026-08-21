import { Button, SegmentedControl } from './ui'
import type { SegmentOption } from './ui'
import type { ThemeControl } from '../hooks/useTheme'
import type { ThemeMode } from '../lib/theme'
import { THEME_MODES } from '../lib/theme'

const OPTIONS: SegmentOption<ThemeMode>[] = [
  { value: 'light', label: 'Light', icon: 'sun', iconOnly: true },
  { value: 'system', label: 'Match system', icon: 'monitor', iconOnly: true },
  { value: 'dark', label: 'Dark', icon: 'moon', iconOnly: true },
]

const NEXT_LABEL: Record<ThemeMode, string> = {
  light: 'Light theme — tap for system',
  system: 'Matching your device — tap for dark',
  dark: 'Dark theme — tap for light',
}

/**
 * Light / system / dark as three visible choices rather than a single toggle,
 * so "follow my OS" stays reachable once someone has pinned a side.
 *
 * On a phone three 30px targets in the top bar are both hard to hit and an
 * expensive way to spend the width the class name needs, so `compact` collapses
 * them into one full-size button that cycles the same three modes.
 */
export default function ThemeToggle({
  theme,
  compact = false,
  className,
}: {
  theme: ThemeControl
  compact?: boolean
  className?: string
}) {
  if (compact) {
    const icon = theme.mode === 'light' ? 'sun' : theme.mode === 'dark' ? 'moon' : 'monitor'
    return (
      <Button
        className={className}
        variant="ghost"
        icon={icon}
        title={NEXT_LABEL[theme.mode]}
        aria-label={NEXT_LABEL[theme.mode]}
        onClick={() =>
          theme.setMode(THEME_MODES[(THEME_MODES.indexOf(theme.mode) + 1) % THEME_MODES.length])
        }
      />
    )
  }

  return (
    <SegmentedControl
      className={className}
      label="Colour theme"
      value={theme.mode}
      onChange={theme.setMode}
      options={OPTIONS}
    />
  )
}
