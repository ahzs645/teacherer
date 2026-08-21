import type { ReactNode } from 'react'

/** A row of controls that wraps gracefully instead of overflowing. */
export default function Toolbar({
  children,
  between = false,
  className,
}: {
  children: ReactNode
  between?: boolean
  className?: string
}) {
  return (
    <div
      className={['ui-toolbar', between ? 'ui-toolbar--between' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export function ToolbarSpacer() {
  return <span className="ui-toolbar__spacer" />
}

export function ToolbarDivider() {
  return <span className="ui-toolbar__divider" aria-hidden="true" />
}
