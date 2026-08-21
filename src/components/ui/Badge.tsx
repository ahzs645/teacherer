import type { ReactNode } from 'react'
import type { Level } from '../../types'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'outline'

export interface BadgeProps {
  tone?: BadgeTone
  dot?: boolean
  title?: string
  className?: string
  children: ReactNode
}

export default function Badge({
  tone = 'neutral',
  dot = false,
  title,
  className,
  children,
}: BadgeProps) {
  const classes = ['ui-badge', `ui-badge--${tone}`, dot ? 'ui-badge--dot' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <span className={classes} title={title}>
      {children}
    </span>
  )
}

/**
 * A rubric level, coloured on a 1→4 scale. The number carries the meaning on
 * its own, so the colour is reinforcement rather than the only signal.
 */
export function LevelChip({
  level,
  children,
  title,
  className,
}: {
  level: Level
  children?: ReactNode
  title?: string
  className?: string
}) {
  return (
    <span
      className={['ui-level', className ?? ''].filter(Boolean).join(' ')}
      data-level={level}
      title={title}
    >
      {children ?? level}
    </span>
  )
}
