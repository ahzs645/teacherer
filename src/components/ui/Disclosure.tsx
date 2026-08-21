import type { ReactNode } from 'react'

/** Secondary tools folded away until asked for. */
export default function Disclosure({
  summary,
  children,
  className,
  defaultOpen = false,
}: {
  summary: ReactNode
  children: ReactNode
  className?: string
  defaultOpen?: boolean
}) {
  return (
    <details className={['ui-disclosure', className ?? ''].filter(Boolean).join(' ')} open={defaultOpen}>
      <summary>{summary}</summary>
      <div className="ui-disclosure__body">{children}</div>
    </details>
  )
}
