import { useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: IconName
  /** Hide the text and keep only the icon, with the label as the tooltip. */
  iconOnly?: boolean
}

export interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  label: string
  className?: string
}

/**
 * A radio group that looks like a switch. Used for the theme picker, where
 * three mutually exclusive choices need to stay visible at once.
 *
 * Follows the radio-group pattern properly: one tab stop for the whole group,
 * arrows move (and select) within it, so Tab does not have to walk past every
 * option to get out.
 */
export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedControlProps<T>) {
  const ref = useRef<HTMLDivElement>(null)

  const step = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length
    onChange(options[next].value)
    ref.current?.querySelectorAll<HTMLButtonElement>('.ui-segmented__item')[next]?.focus()
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        step(i, 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        step(i, -1)
        break
      case 'Home':
        e.preventDefault()
        step(-1, 1)
        break
      case 'End':
        e.preventDefault()
        step(0, -1)
        break
      default:
        break
    }
  }

  const checked = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  return (
    <div
      ref={ref}
      className={['ui-segmented', className ?? ''].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          aria-label={opt.iconOnly ? opt.label : undefined}
          title={opt.iconOnly ? opt.label : undefined}
          className="ui-segmented__item"
          tabIndex={i === checked ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, i)}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <Icon name={opt.icon} />}
          {!opt.iconOnly && <span>{opt.label}</span>}
        </button>
      ))}
    </div>
  )
}
