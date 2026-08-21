import { SegmentedControl } from './ui'
import type { SegmentOption } from './ui'
import type { ThemeControl } from '../hooks/useTheme'
import type { ThemeMode } from '../lib/theme'

const OPTIONS: SegmentOption<ThemeMode>[] = [
  { value: 'light', label: 'Light', icon: 'sun', iconOnly: true },
  { value: 'system', label: 'Match system', icon: 'monitor', iconOnly: true },
  { value: 'dark', label: 'Dark', icon: 'moon', iconOnly: true },
]

/**
 * Light / system / dark as three visible choices rather than a single toggle,
 * so "follow my OS" stays reachable once someone has pinned a side.
 */
export default function ThemeToggle({ theme, className }: { theme: ThemeControl; className?: string }) {
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
