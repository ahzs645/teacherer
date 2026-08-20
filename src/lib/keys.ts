import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

function platform(): string {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  return nav.userAgentData?.platform ?? nav.platform ?? nav.userAgent ?? ''
}

export const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(platform())

/** Shown in help text and button hints. */
export const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl'

/** The "command" modifier for this platform. */
export function mod(e: KeyboardEvent | ReactKeyboardEvent): boolean {
  return IS_MAC ? e.metaKey : e.ctrlKey
}

/** True when the user is typing into a field, so bare-letter shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
