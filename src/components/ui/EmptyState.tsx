import type { ReactNode } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

export interface EmptyStateProps {
  icon?: IconName
  title: ReactNode
  children?: ReactNode
  actions?: ReactNode
  className?: string
}

/** What a panel shows before there is anything in it — a nudge, not a shrug. */
export default function EmptyState({
  icon = 'inbox',
  title,
  children,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div className={['ui-empty', className ?? ''].filter(Boolean).join(' ')}>
      <span className="ui-empty__icon">
        <Icon name={icon} size="1.4rem" />
      </span>
      <p className="ui-empty__title">{title}</p>
      {children && <p className="ui-empty__body">{children}</p>}
      {actions && <div className="ui-empty__actions">{actions}</div>}
    </div>
  )
}
