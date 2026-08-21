import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'dashed'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Leading icon. With no children it becomes a square icon button. */
  icon?: IconName
  /** Trailing icon, for menu/disclosure affordances. */
  iconAfter?: IconName
  block?: boolean
  children?: ReactNode
}

/**
 * The one button in the app. Every visual difference is a variant here rather
 * than a class spelled out at the call site, so a change to, say, the danger
 * treatment lands everywhere at once.
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconAfter,
  block = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconOnly = children === undefined || children === null || children === false
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    size === 'md' ? '' : `ui-btn--${size}`,
    iconOnly ? 'ui-btn--icon' : '',
    block ? 'ui-btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} className="ui-btn__icon" />}
      {!iconOnly && <span>{children}</span>}
      {iconAfter && <Icon name={iconAfter} className="ui-btn__icon" />}
    </button>
  )
}
