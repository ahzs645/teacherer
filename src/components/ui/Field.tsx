import { useId } from 'react'
import type { ReactNode } from 'react'

export interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  grow?: boolean
  className?: string
  /** Receives the id to wire to the control, for inputs that need it. */
  children: ReactNode | ((id: string) => ReactNode)
}

/**
 * A labelled control. Rendered as a <label> wrapping its child, so the whole
 * thing is one hit target and no id plumbing is needed in the common case;
 * pass a function child when the control needs the generated id itself.
 */
export default function Field({ label, hint, grow = false, className, children }: FieldProps) {
  const id = useId()
  const classes = ['ui-field', grow ? 'ui-field--grow' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <label className={classes} htmlFor={typeof children === 'function' ? id : undefined}>
      <span className="ui-field__label">{label}</span>
      {typeof children === 'function' ? children(id) : children}
      {hint && <span className="ui-field__hint">{hint}</span>}
    </label>
  )
}

export function FieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['ui-field-row', className ?? ''].filter(Boolean).join(' ')}>{children}</div>
}

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  title?: string
  'aria-label'?: string
  className?: string
}

export function Checkbox({ checked, onChange, label, title, className, ...rest }: CheckboxProps) {
  return (
    <label className={['ui-check', className ?? ''].filter(Boolean).join(' ')} title={title}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={rest['aria-label']}
      />
      <span>{label}</span>
    </label>
  )
}
