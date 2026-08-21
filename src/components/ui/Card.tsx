import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  children?: ReactNode
}

export default function Card({
  padding = 'md',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    'ui-card',
    padding === 'none' ? 'ui-card--flush' : `ui-card--${padding}`,
    interactive ? 'ui-card--interactive' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}

/** Title row for a card: a heading on the left, tools on the right. */
export function CardHead({
  title,
  children,
  className,
}: {
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={['ui-card__head', className ?? ''].filter(Boolean).join(' ')}>
      <div className="ui-card__title truncate">{title}</div>
      {children}
    </div>
  )
}
