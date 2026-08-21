import { useEffect, useState } from 'react'

/**
 * Subscribe to a media query. Layout that only CSS can see is best left to
 * CSS; this is for the cases where the *markup* has to differ — a control that
 * becomes a different control on a phone, or an interaction that only exists
 * where there is no keyboard.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof matchMedia === 'function' && matchMedia(query).matches,
  )

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Phone-width layout: the sidebar is gone and the bottom tab bar is in. */
export const PHONE_QUERY = '(max-width: 720px)'

/**
 * A finger rather than a mouse: no hover, no hardware keyboard to assume.
 * Anything gated on this needs a visible on-screen equivalent.
 */
export const TOUCH_QUERY = '(hover: none) and (pointer: coarse)'
