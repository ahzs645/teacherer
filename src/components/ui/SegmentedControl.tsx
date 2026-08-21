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
 */
export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={['ui-segmented', className ?? ''].filter(Boolean).join(' ')}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          aria-label={opt.iconOnly ? opt.label : undefined}
          title={opt.iconOnly ? opt.label : undefined}
          className="ui-segmented__item"
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <Icon name={opt.icon} />}
          {!opt.iconOnly && <span>{opt.label}</span>}
        </button>
      ))}
    </div>
  )
}
