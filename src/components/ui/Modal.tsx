import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Button from './Button'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Sits between the title and the close button — tabs, filters, counts. */
  headExtra?: ReactNode
  children: ReactNode
  labelledBy?: string
  className?: string
}

/**
 * A native <dialog>, so focus trapping, Esc and the top layer come from the
 * platform rather than from us. Clicking the backdrop closes it too.
 */
export default function Modal({
  open,
  onClose,
  title,
  headExtra,
  children,
  labelledBy = 'ui-dialog-title',
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={['ui-dialog', className ?? ''].filter(Boolean).join(' ')}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        // the dialog element itself is the backdrop; its contents are not
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="ui-dialog__inner">
        <div className="ui-dialog__head">
          <h2 className="ui-dialog__title" id={labelledBy}>
            {title}
          </h2>
          {headExtra}
          <Button variant="ghost" icon="close" onClick={onClose} aria-label="Close" autoFocus />
        </div>
        <div className="ui-dialog__body">{children}</div>
      </div>
    </dialog>
  )
}
